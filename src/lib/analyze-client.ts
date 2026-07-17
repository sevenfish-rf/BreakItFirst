import type { Category } from "@/lib/categories";
import type { Locale } from "@/lib/i18n/types";
import type { PipelineLiveStage } from "@/lib/pipeline-stages";
import type { ProviderSettings } from "@/lib/provider-settings";
import { getOrCreateSessionId } from "@/lib/session";
import type { FailureAnalysis } from "@/types/analysis";

export type AnalyzeSuccess = {
  ok: true;
  analysis: FailureAnalysis;
  warnings: string[];
};

export type AnalyzeFailure = {
  ok: false;
  message: string;
  code?: string;
  stage?: string;
  retryAfterSec?: number;
};

export type AnalyzeResult = AnalyzeSuccess | AnalyzeFailure;

export type AnalyzeStageProgress = {
  stage: PipelineLiveStage;
  detail?: string;
  at?: number;
};

/**
 * Call /api/analyze.
 * No client-side overall timeout — slow models must be allowed to finish.
 * Prefer NDJSON stage stream; fall back to single JSON for early errors (4xx).
 */
export async function requestAnalysis(params: {
  idea: string;
  category: Category;
  provider: ProviderSettings;
  locale?: Locale;
  /** C.6 multi Pass 1 calibration — slower / costs more rate-limit slots */
  deepAnalysis?: boolean;
  signal?: AbortSignal;
  /** Real pipeline stage updates (from server NDJSON). */
  onStage?: (progress: AnalyzeStageProgress) => void;
}): Promise<AnalyzeResult> {
  let res: Response;
  try {
    res = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-Id": getOrCreateSessionId(),
        Accept: "application/x-ndjson, application/json",
      },
      body: JSON.stringify({
        idea: params.idea,
        category: params.category,
        locale: params.locale === "id" ? "id" : "en",
        deepAnalysis: Boolean(params.deepAnalysis),
        provider: {
          baseUrl: params.provider.baseUrl,
          apiKey: params.provider.apiKey,
          pass1Model: params.provider.pass1Model,
          pass2Model: params.provider.pass2Model,
        },
      }),
      signal: params.signal,
      // Hint: do not buffer the whole body before resolving (browser default is fine)
      cache: "no-store",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      /aborted|cancelled/i.test(msg) ||
      (err &&
        typeof err === "object" &&
        "name" in err &&
        String((err as { name: string }).name).includes("Abort"))
    ) {
      return {
        ok: false,
        message:
          params.locale === "id"
            ? "Analisis dibatalkan."
            : "Analysis cancelled.",
        code: "cancelled",
      };
    }
    return {
      ok: false,
      message:
        "Cannot reach BreakItFirst backend (/api/analyze). Is `npm run dev` running?",
      code: "network",
    };
  }

  const contentType = res.headers.get("content-type") ?? "";

  // Early validation / rate-limit errors still return plain JSON
  if (
    contentType.includes("application/json") &&
    !contentType.includes("ndjson")
  ) {
    return parseJsonResult(res);
  }

  // Streamed NDJSON (or body without clear type — try stream first)
  if (res.body && (contentType.includes("ndjson") || res.ok)) {
    return readNdjsonStream(res, params.onStage, params.locale);
  }

  // Fallback
  return parseJsonResult(res);
}

async function parseJsonResult(res: Response): Promise<AnalyzeResult> {
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return {
      ok: false,
      message: `Backend returned non-JSON (HTTP ${res.status}). Check the Next.js server logs.`,
      code: "bad_response",
    };
  }

  return mapPayload(data, res.status);
}

/** Yield to the event loop so React can paint between stage updates. */
function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

async function readNdjsonStream(
  res: Response,
  onStage?: (progress: AnalyzeStageProgress) => void,
  locale?: Locale,
): Promise<AnalyzeResult> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: AnalyzeResult | null = null;

  const handleMessage = async (msg: Record<string, unknown>) => {
    if (msg.type === "ping") {
      // keepalive — ignore
      return;
    }

    if (msg.type === "stage" && typeof msg.stage === "string") {
      if (process.env.NODE_ENV === "development") {
        console.info("[analyze-client] stage", msg.stage, msg.detail ?? "");
      }
      onStage?.({
        stage: msg.stage as PipelineLiveStage,
        detail: typeof msg.detail === "string" ? msg.detail : undefined,
        at: typeof msg.at === "number" ? msg.at : undefined,
      });
      // Let React commit the stage before the next long wait / next line
      await yieldToUi();
      return;
    }

    if (msg.type === "result") {
      finalResult = mapPayload(msg, res.status);
      return;
    }

    // Bare success/error object without type (legacy)
    if ("ok" in msg && msg.type === undefined) {
      finalResult = mapPayload(msg, res.status);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Support both \n-delimited JSON and optional ":" padding comment lines
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // Flush padding / SSE-style comments
        if (trimmed.startsWith(":")) continue;

        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(trimmed) as Record<string, unknown>;
        } catch {
          continue;
        }

        await handleMessage(msg);
      }
    }

    // Flush trailing line without newline
    const tail = buffer.trim();
    if (tail && !tail.startsWith(":")) {
      try {
        const msg = JSON.parse(tail) as Record<string, unknown>;
        await handleMessage(msg);
      } catch {
        /* ignore */
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/aborted|cancelled/i.test(msg)) {
      return {
        ok: false,
        message:
          locale === "id" ? "Analisis dibatalkan." : "Analysis cancelled.",
        code: "cancelled",
      };
    }
    return {
      ok: false,
      message:
        locale === "id"
          ? "Koneksi terputus saat menunggu model. Coba lagi."
          : "Connection lost while waiting for the model. Retry.",
      code: "network",
    };
  }

  if (finalResult) return finalResult;

  return {
    ok: false,
    message:
      locale === "id"
        ? "Stream berakhir tanpa hasil. Cek log server / status provider."
        : "Stream ended without a result. Check server logs / provider status.",
    code: "bad_response",
  };
}

function mapPayload(data: unknown, httpStatus: number): AnalyzeResult {
  if (!data || typeof data !== "object") {
    return { ok: false, message: "Analysis failed. Retry." };
  }

  const payload = data as Record<string, unknown>;

  if (payload.ok !== true) {
    const base =
      typeof payload.message === "string"
        ? payload.message
        : "Analysis failed. Retry.";
    const stage =
      typeof payload.stage === "string" ? ` [${payload.stage}]` : "";
    const retryAfterSec =
      typeof payload.retryAfterSec === "number"
        ? payload.retryAfterSec
        : undefined;
    return {
      ok: false,
      message: `${base}${stage}`,
      code: typeof payload.code === "string" ? payload.code : undefined,
      stage: typeof payload.stage === "string" ? payload.stage : undefined,
      retryAfterSec,
    };
  }

  void httpStatus;

  return {
    ok: true,
    analysis: payload.analysis as FailureAnalysis,
    warnings: Array.isArray(payload.warnings)
      ? (payload.warnings as string[])
      : [],
  };
}
