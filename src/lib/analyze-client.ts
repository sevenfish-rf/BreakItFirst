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

const POLL_MS = 1200;

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
 * Watch job via JSON snapshot polling (reliable stage progress).
 * Does NOT cancel the job when the signal aborts (refresh only).
 */
export async function watchAnalysisJob(params: {
  jobId: string;
  locale?: Locale;
  signal?: AbortSignal;
  onStage?: (progress: AnalyzeStageProgress) => void;
}): Promise<AnalyzeResult> {
  const { jobId, locale, signal, onStage } = params;
  let lastStage = "";
  let lastDetail = "";

  while (true) {
    if (signal?.aborted) {
      return {
        ok: false,
        message:
          locale === "id"
            ? "Koneksi status terputus (refresh?). Menyambung ulang…"
            : "Status connection lost (refresh?). Reconnecting…",
        code: "stream_disconnected",
      };
    }

    let res: Response;
    try {
      res = await fetch(
        `/api/analyze/status?jobId=${encodeURIComponent(jobId)}&mode=poll`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "X-Session-Id": getOrCreateSessionId(),
          },
          signal,
          cache: "no-store",
        },
      );
    } catch (err) {
      if (signal?.aborted || isAbortError(err)) {
        return {
          ok: false,
          message:
            locale === "id"
              ? "Koneksi status terputus (refresh?). Menyambung ulang…"
              : "Status connection lost (refresh?). Reconnecting…",
          code: "stream_disconnected",
        };
      }
      // Transient network blip — retry
      await sleep(POLL_MS, signal);
      continue;
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      await sleep(POLL_MS, signal);
      continue;
    }

    if (!data || typeof data !== "object") {
      await sleep(POLL_MS, signal);
      continue;
    }

    const payload = data as Record<string, unknown>;

    if (!res.ok || payload.ok === false) {
      if (payload.code === "job_not_found" || res.status === 404) {
        return {
          ok: false,
          code: "job_not_found",
          message:
            typeof payload.message === "string"
              ? payload.message
              : "Analysis job not found or expired.",
        };
      }
      // keep polling on other errors briefly
      await sleep(POLL_MS, signal);
      continue;
    }

    // Stage update
    const stage =
      typeof payload.stage === "string"
        ? (payload.stage as PipelineLiveStage)
        : null;
    const detail =
      typeof payload.detail === "string" ? payload.detail : undefined;

    if (stage && (stage !== lastStage || detail !== lastDetail)) {
      lastStage = stage;
      lastDetail = detail ?? "";
      if (process.env.NODE_ENV === "development") {
        console.info("[analyze-client] poll stage", stage, detail ?? "");
      }
      onStage?.({
        stage,
        detail,
        at: typeof payload.updatedAt === "number" ? payload.updatedAt : Date.now(),
      });
    }

    const status = typeof payload.status === "string" ? payload.status : "";
    const result = payload.result;

    if (status === "running" || !result) {
      await sleep(POLL_MS, signal);
      continue;
    }

    // Terminal (done / error / cancelled / orphaned after server restart)
    if (result && typeof result === "object") {
      const mapped = mapPayload(result, 200);
      // Surface orphaned code for client cleanup
      if (
        !mapped.ok &&
        result &&
        typeof result === "object" &&
        "code" in result &&
        (result as { code?: string }).code === "job_orphaned"
      ) {
        return {
          ...mapped,
          code: "job_orphaned",
        };
      }
      return mapped;
    }

    if (status === "cancelled") {
      return {
        ok: false,
        code: "cancelled",
        message:
          locale === "id" ? "Analisis dibatalkan." : "Analysis cancelled.",
      };
    }
    if (status === "error" || status === "done") {
      // Terminal without result payload — treat as lost session
      return {
        ok: false,
        code: "job_orphaned",
        message:
          locale === "id"
            ? "Sesi analisis berakhir tanpa hasil. Ide masih di form — klik Analyze lagi."
            : "Analysis ended without a result. Your idea is still in the form — click Analyze again.",
      };
    }

    await sleep(POLL_MS, signal);
  }
}

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

export async function requestAnalysis(params: {
  idea: string;
  category: Category;
  provider: ProviderSettings;
  locale?: Locale;
  deepAnalysis?: boolean;
  signal?: AbortSignal;
  onStage?: (progress: AnalyzeStageProgress) => void;
  onJobId?: (jobId: string) => void;
}): Promise<AnalyzeResult> {
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

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        resolve();
      },
      { once: true },
    );
  });
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = "name" in err ? String((err as { name?: string }).name) : "";
  const msg =
    "message" in err ? String((err as { message?: string }).message) : "";
  return name === "AbortError" || /aborted|cancelled/i.test(msg);
}

function networkOrCancelFailure(
  err: unknown,
  locale?: Locale,
): AnalyzeFailure {
  if (isAbortError(err)) {
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
