import {
  buildPass1UserMessage,
  buildPass15UserMessage,
  buildPass2UserMessage,
  pass1SystemForCategory,
  pass15SystemForCategory,
  pass2SystemForLocale,
} from "@/lib/prompts";
import {
  ProviderError,
  callProvider,
  type ProviderCallOptions,
} from "@/lib/provider-client";
import { humanizeCaughtError } from "@/lib/provider-errors";
import {
  extractJsonObject,
  isAnalysisError,
  pass2NovelClaimWarnings,
  runSoftChecks,
  validateFailureAnalysis,
} from "@/lib/schema";
import type { Category } from "@/lib/categories";
import type { Locale } from "@/lib/i18n/types";
import type {
  PipelineLiveStage,
  PipelineStageEvent,
} from "@/lib/pipeline-stages";
import type { AnalysisError, FailureAnalysis } from "@/types/analysis";

export type {
  PipelineLiveStage,
  PipelineStageEvent,
} from "@/lib/pipeline-stages";
export { liveStageToUiIndex } from "@/lib/pipeline-stages";

/** Max Pass 2 re-attempts after a failed parse/validation (masterplan F3 = 1). */
const PASS2_MAX_RETRIES = 1;

export type PipelineProvider = {
  baseUrl: string;
  apiKey: string;
  pass1Model: string;
  pass2Model: string;
};

export type PipelineStageTiming = {
  stage: "pass1" | "pass1_b" | "pass1_5" | "pass2";
  ms: number;
  ok: boolean;
};

export type PipelineMeta = {
  deepAnalysis: boolean;
  stages: PipelineStageTiming[];
  totalMs: number;
};

export type PipelineSuccess = {
  ok: true;
  analysis: FailureAnalysis;
  warnings: string[];
  meta: PipelineMeta;
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
  stage?: "pass1" | "pass1_5" | "pass2";
  meta?: PipelineMeta;
};

export type PipelineResult = PipelineSuccess | PipelineFailure;

async function timed<T>(
  stage: PipelineStageTiming["stage"],
  stages: PipelineStageTiming[],
  fn: () => Promise<T>,
): Promise<T> {
  const t0 = Date.now();
  try {
    const value = await fn();
    stages.push({ stage, ms: Date.now() - t0, ok: true });
    return value;
  } catch (err) {
    stages.push({ stage, ms: Date.now() - t0, ok: false });
    throw err;
  }
}

async function callPass2Once(params: {
  shared: Pick<ProviderCallOptions, "baseUrl" | "apiKey" | "signal">;
  pass2Model: string;
  idea: string;
  category: Category;
  reasoning: string;
  generatedAt: string;
  locale: Locale;
  deepAnalysis: boolean;
  priorIssues?: string[];
}): Promise<string> {
  const {
    shared,
    pass2Model,
    idea,
    category,
    reasoning,
    generatedAt,
    locale,
    deepAnalysis,
    priorIssues,
  } = params;

  let userContent = buildPass2UserMessage({
    idea,
    category,
    reasoning,
    generatedAt,
    locale,
    deepAnalysis,
  });

  if (priorIssues && priorIssues.length > 0) {
    userContent += `

---
Your previous JSON output failed validation. Fix ONLY the schema/format issues
listed below. Still do not invent new claims beyond the analysis prose.

Validation issues:
${priorIssues.map((i) => `- ${i}`).join("\n")}
`;
  }

  return callProvider({
    ...shared,
    model: pass2Model,
    temperature: 0.1,
    maxTokens: 4096,
    jsonMode: true,
    stage: "pass2",
    messages: [
      { role: "system", content: pass2SystemForLocale(locale) },
      { role: "user", content: userContent },
    ],
  });
}

export async function runFailureAnalysisPipeline(params: {
  idea: string;
  category: Category;
  provider: PipelineProvider;
  locale?: Locale;
  /** C.6 — second Pass 1 + calibration critique (opt-in, more cost/latency) */
  deepAnalysis?: boolean;
  signal?: AbortSignal;
  /** Real-time stage updates for UI streaming (not timer heuristics). */
  onStage?: (event: PipelineStageEvent) => void;
}): Promise<PipelineResult> {
  const { idea, category, provider, signal, onStage } = params;
  const locale: Locale = params.locale === "id" ? "id" : "en";
  const deepAnalysis = Boolean(params.deepAnalysis);
  const warnings: string[] = [];
  const generatedAt = new Date().toISOString();
  const stages: PipelineStageTiming[] = [];
  const pipelineStarted = Date.now();

  const shared: Pick<
    ProviderCallOptions,
    "baseUrl" | "apiKey" | "signal"
  > = {
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey,
    signal,
  };

  const buildMeta = (): PipelineMeta => ({
    deepAnalysis,
    stages: [...stages],
    totalMs: Date.now() - pipelineStarted,
  });

  const emit = (stage: PipelineLiveStage, detail?: string) => {
    try {
      onStage?.({ stage, detail });
    } catch {
      /* never break pipeline on UI callback errors */
    }
  };

  const logStage = (msg: string) => {
    // Visible in eval CLI and server logs
    console.info(`[pipeline] ${msg}`);
  };

  emit("ingest", "Input accepted");

  // ── Pass 1: freeform reasoning (×2 if deep) ─────────────────────────
  let reasoningA: string;
  let reasoningB: string | undefined;

  try {
    if (deepAnalysis) {
      logStage("Pass 1 ×2 (deep) starting…");
      emit("pass1", "Deep: two parallel Pass 1 drafts");
      const [a, b] = await Promise.all([
        timed("pass1", stages, () =>
          callProvider({
            ...shared,
            model: provider.pass1Model,
            temperature: 0.45,
            maxTokens: 4096,
            stage: "pass1",
            messages: [
              {
                role: "system",
                content: pass1SystemForCategory(category, locale),
              },
              {
                role: "user",
                content: buildPass1UserMessage(idea, category, locale),
              },
            ],
          }),
        ),
        timed("pass1_b", stages, () =>
          callProvider({
            ...shared,
            model: provider.pass1Model,
            temperature: 0.7,
            maxTokens: 4096,
            stage: "pass1",
            messages: [
              {
                role: "system",
                content: pass1SystemForCategory(category, locale),
              },
              {
                role: "user",
                content: buildPass1UserMessage(idea, category, locale),
              },
            ],
          }),
        ),
      ]);
      reasoningA = a;
      reasoningB = b;
      logStage(`Pass 1 ×2 done (${stages.filter((s) => s.stage.startsWith("pass1")).map((s) => `${s.stage}=${s.ms}ms`).join(", ")})`);
    } else {
      logStage("Pass 1 starting…");
      emit("pass1", "Waiting for model reasoning");
      reasoningA = await timed("pass1", stages, () =>
        callProvider({
          ...shared,
          model: provider.pass1Model,
          temperature: 0.5,
          maxTokens: 4096,
          stage: "pass1",
          messages: [
            {
              role: "system",
              content: pass1SystemForCategory(category, locale),
            },
            {
              role: "user",
              content: buildPass1UserMessage(idea, category, locale),
            },
          ],
        }),
      );
      logStage(`Pass 1 done (${stages.find((s) => s.stage === "pass1")?.ms ?? "?"}ms)`);
    }
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
      meta: buildMeta(),
    };
  }

  if (!reasoningA.trim()) {
    return {
      ok: false,
      code: "pipeline_error",
      stage: "pass1",
      message:
        "Pass 1 returned empty text. Check model id and that the provider supports chat completions.",
      details: ["Pass 1 returned empty reasoning"],
      meta: buildMeta(),
    };
  }

  if (deepAnalysis && reasoningB && !reasoningB.trim()) {
    warnings.push("Deep analysis draft B was empty; continuing with draft A only");
    reasoningB = undefined;
  }

  // ── Pass 1.5: adversarial critique / calibration ────────────────────
  let reasoning = reasoningA;
  try {
    logStage("Pass 1.5 critique starting…");
    emit("pass1_5", "Adversarial critique");
    const revised = await timed("pass1_5", stages, () =>
      callProvider({
        ...shared,
        model: provider.pass1Model,
        temperature: deepAnalysis ? 0.35 : 0.4,
        maxTokens: 4096,
        stage: "pass1_5",
        messages: [
          {
            role: "system",
            content: pass15SystemForCategory(category, locale),
          },
          {
            role: "user",
            content: buildPass15UserMessage({
              idea,
              category,
              draftReasoning: reasoningA,
              draftReasoningB: reasoningB,
              locale,
            }),
          },
        ],
      }),
    );

    if (revised.trim()) {
      reasoning = revised;
      logStage(
        `Pass 1.5 done (${stages.find((s) => s.stage === "pass1_5")?.ms ?? "?"}ms)`,
      );
    } else {
      warnings.push(
        "Pass 1.5 critique returned empty text; using Pass 1 draft",
      );
      logStage("Pass 1.5 empty — keeping Pass 1 draft");
    }
  } catch (err) {
    return {
      ok: false,
      code: "provider_error",
      stage: "pass1_5",
      message: humanizeCaughtError(err, "pass1_5"),
      details: [
        err instanceof ProviderError
          ? `status=${err.status}`
          : err instanceof Error
            ? err.message
            : "Pass 1.5 failed",
      ],
      meta: buildMeta(),
    };
  }

  // ── Pass 2: schema-constrained extraction (+ max 1 retry) ───────────
  let priorIssues: string[] | undefined;
  let lastFailure: PipelineFailure | null = null;

  for (let attempt = 0; attempt <= PASS2_MAX_RETRIES; attempt++) {
    let structuredRaw: string;
    try {
      logStage(
        attempt === 0
          ? "Pass 2 structuring starting…"
          : "Pass 2 retry starting…",
      );
      emit(
        attempt === 0 ? "pass2" : "pass2_retry",
        attempt === 0
          ? "Structuring JSON"
          : "Retry structuring after validation feedback",
      );
      structuredRaw = await timed("pass2", stages, () =>
        callPass2Once({
          shared,
          pass2Model: provider.pass2Model,
          idea,
          category,
          reasoning,
          generatedAt,
          locale,
          deepAnalysis,
          priorIssues,
        }),
      );
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
          attempt > 0 ? `pass2_retry_attempt=${attempt}` : "pass2_attempt=0",
        ],
        meta: buildMeta(),
      };
    }

    emit("validate", "Parsing & schema checks");

    let parsed: unknown;
    try {
      parsed = extractJsonObject(structuredRaw);
    } catch (err) {
      const issue =
        err instanceof Error ? err.message : "Invalid JSON from Pass 2";
      priorIssues = [issue];
      lastFailure = {
        ok: false,
        code: "schema_invalid",
        stage: "pass2",
        message:
          "Pass 2 did not return valid JSON. Try a stronger structuring model, or one that supports JSON mode.",
        details: [
          issue,
          attempt < PASS2_MAX_RETRIES
            ? "Will retry Pass 2 once with error feedback"
            : "Pass 2 retry exhausted",
        ],
        meta: buildMeta(),
      };
      continue;
    }

    if (isAnalysisError(parsed)) {
      const analysisError = parsed as AnalysisError;
      return {
        ok: false,
        code: "not_analyzable",
        message: "Please describe your idea in more detail.",
        details: [analysisError.message],
        meta: buildMeta(),
      };
    }

    const validation = validateFailureAnalysis(parsed);
    if (!validation.ok) {
      priorIssues = validation.issues;
      lastFailure = {
        ok: false,
        code: "schema_invalid",
        stage: "pass2",
        message: `Pass 2 JSON failed schema validation: ${validation.issues.slice(0, 3).join("; ")}`,
        details: [
          ...validation.issues,
          attempt < PASS2_MAX_RETRIES
            ? "Will retry Pass 2 once with validation feedback"
            : "Pass 2 retry exhausted",
        ],
        meta: buildMeta(),
      };
      continue;
    }

    const analysis: FailureAnalysis = {
      ...validation.data,
      meta: {
        idea_input: idea,
        category,
        generated_at: generatedAt,
      },
    };

    // Deep mode: ensure self_consistency is present even if Pass 2 omitted it
    if (deepAnalysis && !analysis.self_consistency) {
      analysis.self_consistency = {
        runs: reasoningB ? 2 : 1,
        spof_agreement: "Medium",
        reason:
          "Deep analysis ran multiple Pass 1 drafts; Pass 2 omitted structured self_consistency — agreement not fully extracted.",
        candidate_spofs: [analysis.single_point_of_failure.component],
      };
      warnings.push(
        "self_consistency was filled by pipeline fallback (Pass 2 omitted it)",
      );
    }

    if (!deepAnalysis && analysis.self_consistency) {
      // Standard path should not surface multi-run calibration
      delete analysis.self_consistency;
    }

    if (attempt > 0) {
      warnings.push("Pass 2 succeeded after 1 validation retry");
    }

    for (const check of runSoftChecks(analysis)) {
      if (!check.ok) {
        warnings.push(check.message);
        console.warn("[pipeline] soft-check failed", {
          id: check.id,
          component: analysis.single_point_of_failure.component,
        });
      }
    }

    for (const w of pass2NovelClaimWarnings(reasoning, analysis)) {
      warnings.push(w);
      console.warn("[pipeline] claim guard", w);
    }

    const meta = buildMeta();
    emit("done", `Complete in ${meta.totalMs}ms`);
    console.info("[pipeline] complete", {
      deepAnalysis,
      totalMs: meta.totalMs,
      stages: meta.stages,
      warningCount: warnings.length,
      spof: analysis.single_point_of_failure.component,
    });

    return { ok: true, analysis, warnings, meta };
  }

  return (
    lastFailure ?? {
      ok: false,
      code: "schema_invalid",
      stage: "pass2",
      message: "Pass 2 failed schema validation after retry.",
      details: ["Pass 2 retry exhausted"],
      meta: buildMeta(),
    }
  );
}
