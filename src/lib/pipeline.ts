import {
  buildPass1UserMessage,
  buildPass2UserMessage,
  pass1SystemForCategory,
  pass2SystemForLocale,
} from "@/lib/prompts";
import {
  ProviderError,
  callProvider,
  type ProviderCallOptions,
} from "@/lib/provider-client";
import { humanizeCaughtError } from "@/lib/provider-errors";
import {
  cascadeLooksConnected,
  extractJsonObject,
  isAnalysisError,
  validateFailureAnalysis,
} from "@/lib/schema";
import type { Category } from "@/lib/categories";
import type { Locale } from "@/lib/i18n/types";
import type { AnalysisError, FailureAnalysis } from "@/types/analysis";

export type PipelineProvider = {
  baseUrl: string;
  apiKey: string;
  pass1Model: string;
  pass2Model: string;
};

export type PipelineSuccess = {
  ok: true;
  analysis: FailureAnalysis;
  warnings: string[];
};

export type PipelineFailure = {
  ok: false;
  code:
    | "not_analyzable"
    | "schema_invalid"
    | "provider_error"
    | "pipeline_error";
  message: string;
  details?: string[];
  stage?: "pass1" | "pass2";
};

export type PipelineResult = PipelineSuccess | PipelineFailure;

export async function runFailureAnalysisPipeline(params: {
  idea: string;
  category: Category;
  provider: PipelineProvider;
  locale?: Locale;
  signal?: AbortSignal;
}): Promise<PipelineResult> {
  const { idea, category, provider, signal } = params;
  const locale: Locale = params.locale === "id" ? "id" : "en";
  const warnings: string[] = [];
  const generatedAt = new Date().toISOString();

  const shared: Pick<
    ProviderCallOptions,
    "baseUrl" | "apiKey" | "signal"
  > = {
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey,
    signal,
  };

  // ── Pass 1: freeform reasoning ──────────────────────────────────────
  let reasoning: string;
  try {
    reasoning = await callProvider({
      ...shared,
      model: provider.pass1Model,
      temperature: 0.5,
      maxTokens: 4096,
      stage: "pass1",
      messages: [
        { role: "system", content: pass1SystemForCategory(category, locale) },
        {
          role: "user",
          content: buildPass1UserMessage(idea, category, locale),
        },
      ],
    });
  } catch (err) {
    return {
      ok: false,
      code: "provider_error",
      stage: "pass1",
      message: humanizeCaughtError(err, "pass1"),
      details: [
        err instanceof ProviderError
          ? `status=${err.status}`
          : err instanceof Error
            ? err.message
            : "Pass 1 failed",
      ],
    };
  }

  if (!reasoning.trim()) {
    return {
      ok: false,
      code: "pipeline_error",
      stage: "pass1",
      message:
        "Pass 1 returned empty text. Check model id and that the provider supports chat completions.",
      details: ["Pass 1 returned empty reasoning"],
    };
  }

  // ── Pass 2: schema-constrained extraction ───────────────────────────
  let structuredRaw: string;
  try {
    structuredRaw = await callProvider({
      ...shared,
      model: provider.pass2Model,
      temperature: 0.1,
      maxTokens: 3072,
      jsonMode: true,
      stage: "pass2",
      messages: [
        { role: "system", content: pass2SystemForLocale(locale) },
        {
          role: "user",
          content: buildPass2UserMessage({
            idea,
            category,
            reasoning,
            generatedAt,
            locale,
          }),
        },
      ],
    });
  } catch (err) {
    return {
      ok: false,
      code: "provider_error",
      stage: "pass2",
      message: humanizeCaughtError(err, "pass2"),
      details: [
        err instanceof ProviderError
          ? `status=${err.status}`
          : err instanceof Error
            ? err.message
            : "Pass 2 failed",
      ],
    };
  }

  let parsed: unknown;
  try {
    parsed = extractJsonObject(structuredRaw);
  } catch (err) {
    return {
      ok: false,
      code: "schema_invalid",
      stage: "pass2",
      message:
        "Pass 2 did not return valid JSON. Try a stronger structuring model, or one that supports JSON mode.",
      details: [err instanceof Error ? err.message : "Invalid JSON from Pass 2"],
    };
  }

  if (isAnalysisError(parsed)) {
    const analysisError = parsed as AnalysisError;
    return {
      ok: false,
      code: "not_analyzable",
      message: "Please describe your idea in more detail.",
      details: [analysisError.message],
    };
  }

  const validation = validateFailureAnalysis(parsed);
  if (!validation.ok) {
    return {
      ok: false,
      code: "schema_invalid",
      stage: "pass2",
      message: `Pass 2 JSON failed schema validation: ${validation.issues.slice(0, 3).join("; ")}`,
      details: validation.issues,
    };
  }

  const analysis: FailureAnalysis = {
    ...validation.data,
    meta: {
      idea_input: idea,
      category,
      generated_at: generatedAt,
    },
  };

  if (!cascadeLooksConnected(analysis)) {
    warnings.push(
      "Cascade may be disconnected from SPOF/assumptions (soft check)",
    );
    console.warn("[pipeline] cascade connectivity soft-check failed", {
      component: analysis.single_point_of_failure.component,
      nodeCount: analysis.cascade.nodes.length,
    });
  }

  return { ok: true, analysis, warnings };
}
