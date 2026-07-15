import type { Category } from "@/lib/categories";
import type { Locale } from "@/lib/i18n/types";
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

export async function requestAnalysis(params: {
  idea: string;
  category: Category;
  provider: ProviderSettings;
  locale?: Locale;
  /** C.6 multi Pass 1 calibration — slower / costs more rate-limit slots */
  deepAnalysis?: boolean;
  signal?: AbortSignal;
}): Promise<AnalyzeResult> {
  let res: Response;
  try {
    res = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-Id": getOrCreateSessionId(),
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
    });
  } catch {
    return {
      ok: false,
      message:
        "Cannot reach BreakItFirst backend (/api/analyze). Is `npm run dev` running?",
      code: "network",
    };
  }

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

  if (!data || typeof data !== "object") {
    return { ok: false, message: "Analysis failed. Retry." };
  }

  const payload = data as Record<string, unknown>;

  if (!res.ok || payload.ok !== true) {
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

  return {
    ok: true,
    analysis: payload.analysis as FailureAnalysis,
    warnings: Array.isArray(payload.warnings)
      ? (payload.warnings as string[])
      : [],
  };
}
