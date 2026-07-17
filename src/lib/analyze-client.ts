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

export type StartAnalyzeResult =
  | { ok: true; jobId: string }
  | AnalyzeFailure;

/**
 * Start a server-side job (survives browser refresh). Rate limit charged once.
 */
export async function startAnalysisJob(params: {
  idea: string;
  category: Category;
  provider: ProviderSettings;
  locale?: Locale;
  deepAnalysis?: boolean;
  signal?: AbortSignal;
}): Promise<StartAnalyzeResult> {
  let res: Response;
  try {
    res = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-Id": getOrCreateSessionId(),
        Accept: "application/json",
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
      cache: "no-store",
    });
  } catch (err) {
    return networkOrCancelFailure(err, params.locale);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return {
      ok: false,
      message: `Backend returned non-JSON (HTTP ${res.status}).`,
      code: "bad_response",
    };
  }

  if (!data || typeof data !== "object") {
    return { ok: false, message: "Analysis failed. Retry." };
  }

  const payload = data as Record<string, unknown>;
  if (payload.ok === true && typeof payload.jobId === "string") {
    return { ok: true, jobId: payload.jobId };
  }

  const fail = mapPayload(payload, res.status);
  if (fail.ok) {
    return {
      ok: false,
      message: "Unexpected response from /api/analyze (missing jobId).",
      code: "bad_response",
    };
  }
  return fail;
}

/**
 * Watch / resume a job via NDJSON status stream.
 * Refresh disconnects this stream only — job keeps running on the server.
 */
export async function watchAnalysisJob(params: {
  jobId: string;
  locale?: Locale;
  signal?: AbortSignal;
  onStage?: (progress: AnalyzeStageProgress) => void;
  onJobHello?: (info: { jobId: string; status: string }) => void;
}): Promise<AnalyzeResult> {
  let res: Response;
  try {
    res = await fetch(
      `/api/analyze/status?jobId=${encodeURIComponent(params.jobId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/x-ndjson, application/json",
          "X-Session-Id": getOrCreateSessionId(),
        },
        signal: params.signal,
        cache: "no-store",
      },
    );
  } catch (err) {
    return networkOrCancelFailure(err, params.locale);
  }

  const contentType = res.headers.get("content-type") ?? "";

  if (
    contentType.includes("application/json") &&
    !contentType.includes("ndjson")
  ) {
    return parseJsonResult(res);
  }

  if (!res.ok && !res.body) {
    return parseJsonResult(res);
  }

  if (res.body) {
    return readNdjsonStream(res, params);
  }

  return parseJsonResult(res);
}

/**
 * Explicit cancel — aborts provider calls. Refresh must NOT call this.
 */
export async function cancelAnalysisJob(jobId: string): Promise<void> {
  try {
    await fetch("/api/analyze/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-Id": getOrCreateSessionId(),
      },
      body: JSON.stringify({ jobId }),
      cache: "no-store",
    });
  } catch {
    /* best effort */
  }
}

/**
 * Full flow: start job + watch. Prefer start+watch separately when resuming.
 * `signal` only aborts the status watch (e.g. page unload) — NOT the job itself.
 * Job start is never aborted by refresh; use cancelAnalysisJob for that.
 */
export async function requestAnalysis(params: {
  idea: string;
  category: Category;
  provider: ProviderSettings;
  locale?: Locale;
  deepAnalysis?: boolean;
  signal?: AbortSignal;
  onStage?: (progress: AnalyzeStageProgress) => void;
  /** Called as soon as the server assigns a job id (persist for refresh resume). */
  onJobId?: (jobId: string) => void;
}): Promise<AnalyzeResult> {
  // Do not pass signal to start — refresh must not kill job creation mid-flight
  const started = await startAnalysisJob({
    idea: params.idea,
    category: params.category,
    provider: params.provider,
    locale: params.locale,
    deepAnalysis: params.deepAnalysis,
  });

  if (!started.ok) return started;

  params.onJobId?.(started.jobId);

  return watchAnalysisJob({
    jobId: started.jobId,
    locale: params.locale,
    signal: params.signal,
    onStage: params.onStage,
  });
}

function networkOrCancelFailure(
  err: unknown,
  locale?: Locale,
): AnalyzeFailure {
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
        locale === "id" ? "Analisis dibatalkan." : "Analysis cancelled.",
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
  params: {
    locale?: Locale;
    onStage?: (progress: AnalyzeStageProgress) => void;
    onJobHello?: (info: { jobId: string; status: string }) => void;
  },
): Promise<AnalyzeResult> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: AnalyzeResult | null = null;

  const handleMessage = async (msg: Record<string, unknown>) => {
    if (msg.type === "ping") return;

    if (msg.type === "hello") {
      params.onJobHello?.({
        jobId: typeof msg.jobId === "string" ? msg.jobId : "",
        status: typeof msg.status === "string" ? msg.status : "running",
      });
      return;
    }

    if (msg.type === "stage" && typeof msg.stage === "string") {
      if (process.env.NODE_ENV === "development") {
        console.info("[analyze-client] stage", msg.stage, msg.detail ?? "");
      }
      params.onStage?.({
        stage: msg.stage as PipelineLiveStage,
        detail: typeof msg.detail === "string" ? msg.detail : undefined,
        at: typeof msg.at === "number" ? msg.at : undefined,
      });
      await yieldToUi();
      return;
    }

    if (msg.type === "result") {
      finalResult = mapPayload(msg, res.status);
      return;
    }

    if ("ok" in msg && msg.type === undefined) {
      finalResult = mapPayload(msg, res.status);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue;
        try {
          await handleMessage(JSON.parse(trimmed) as Record<string, unknown>);
        } catch {
          /* skip bad lines */
        }
      }
    }

    const tail = buffer.trim();
    if (tail && !tail.startsWith(":")) {
      try {
        await handleMessage(JSON.parse(tail) as Record<string, unknown>);
      } catch {
        /* ignore */
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/aborted|cancelled/i.test(msg)) {
      // Status stream aborted (refresh) — NOT the same as job cancelled.
      // Caller should reconnect; return a special code.
      return {
        ok: false,
        message:
          params.locale === "id"
            ? "Koneksi status terputus (refresh?). Menyambung ulang…"
            : "Status connection lost (refresh?). Reconnecting…",
        code: "stream_disconnected",
      };
    }
    return {
      ok: false,
      message:
        params.locale === "id"
          ? "Koneksi terputus saat menunggu model. Coba lagi."
          : "Connection lost while waiting for the model. Retry.",
      code: "network",
    };
  }

  if (finalResult) return finalResult;

  return {
    ok: false,
    message:
      params.locale === "id"
        ? "Stream berakhir tanpa hasil. Job mungkin masih jalan — refresh untuk sambung ulang."
        : "Stream ended without a result. Job may still be running — refresh to reconnect.",
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
