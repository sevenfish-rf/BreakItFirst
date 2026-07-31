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
import { deriveSpofAgreement } from "@/lib/agreement";
import {
  ceilingDisclosure,
  decideConfidenceCeiling,
} from "@/lib/confidence-ceiling";
import { scoreInputAdequacy } from "@/lib/input-validation";
import type { Locale } from "@/lib/i18n/types";
import type {
  PipelineLiveStage,
  PipelineStageEvent,
  PipelineStageTiming,
} from "@/lib/pipeline-stages";
import {
  buildAnalysisTrace,
  writeAnalysisTrace,
} from "@/lib/analysis-trace";
import type {
  AnalysisError,
  FailureAnalysis,
  RunProvenance,
} from "@/types/analysis";

export type {
  PipelineLiveStage,
  PipelineStageEvent,
  PipelineStageTiming,
} from "@/lib/pipeline-stages";
export { liveStageToUiIndex } from "@/lib/pipeline-stages";

/** Max Pass 2 re-attempts after a failed parse/validation (masterplan F3 = 1). */
const PASS2_MAX_RETRIES = 1;

/**
 * Output ceilings. A ceiling costs nothing unless it is used, while truncated
 * prose silently degrades every downstream section — so keep them generous.
 * Reasoning models spend part of this budget on thinking tokens, which is what
 * used to cut Pass 2 JSON off mid-array.
 */
const PASS1_MAX_TOKENS = 8192;
const PASS2_MAX_TOKENS = 8192;
const PASS2_MAX_TOKENS_DEEP = 12288;
/** Hard ceiling when escalating after a truncated Pass 2. */
const PASS2_MAX_TOKENS_CEILING = 24576;

export type PipelineProvider = {
  baseUrl: string;
  apiKey: string;
  pass1Model: string;
  pass2Model: string;
};

export type PipelineMeta = {
  deepAnalysis: boolean;
  stages: PipelineStageTiming[];
  totalMs: number;
  /**
   * K1 — same provenance stamped onto analysis.meta.run, repeated here for
   * callers that keep only the pipeline meta (eval harness, job snapshots).
   */
  run: RunProvenance;
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
  maxTokens: number;
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
    maxTokens,
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
Your previous JSON output was rejected. Fix ONLY the format/completeness issues
listed below. Still do not invent new claims beyond the analysis prose. Output
the JSON object and nothing else — no prose, no code fences.

Issues:
${priorIssues.map((i) => `- ${i}`).join("\n")}
`;
  }

  return callProvider({
    ...shared,
    model: pass2Model,
    temperature: 0.1,
    maxTokens,
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
  /** Updated once Pass 1 is known to have produced two usable drafts. */
  let pass1Runs = 1;

  const shared: Pick<
    ProviderCallOptions,
    "baseUrl" | "apiKey" | "signal"
  > = {
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey,
    signal,
  };

  /** Host only — the key never leaves this module, and the path can carry ids. */
  const providerHost = (() => {
    try {
      return new URL(provider.baseUrl).host;
    } catch {
      return "unknown";
    }
  })();

  const buildRun = (): RunProvenance => ({
    mode: deepAnalysis ? "deep" : "standard",
    locale,
    pass1_model: provider.pass1Model,
    pass2_model: provider.pass2Model,
    provider_host: providerHost,
    pass1_runs: pass1Runs,
  });

  const buildMeta = (): PipelineMeta => ({
    deepAnalysis,
    stages: [...stages],
    totalMs: Date.now() - pipelineStarted,
    run: buildRun(),
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

  /** Prose passes survive truncation — record it instead of failing. */
  const noteTruncation =
    (label: string) =>
    (info: { maxTokens: number; finishReason: string }) => {
      warnings.push(
        `${label} hit the ${info.maxTokens}-token output ceiling and may be cut short (finish_reason=${info.finishReason})`,
      );
      console.warn(`[pipeline] ${label} truncated at ${info.maxTokens} tokens`);
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
            maxTokens: PASS1_MAX_TOKENS,
            stage: "pass1",
            onTruncated: noteTruncation("Pass 1 (draft A)"),
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
            maxTokens: PASS1_MAX_TOKENS,
            stage: "pass1",
            onTruncated: noteTruncation("Pass 1 (draft B)"),
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
          maxTokens: PASS1_MAX_TOKENS,
          stage: "pass1",
          onTruncated: noteTruncation("Pass 1"),
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

  if (reasoningB?.trim()) {
    pass1Runs = 2;
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
        maxTokens: PASS1_MAX_TOKENS,
        stage: "pass1_5",
        onTruncated: noteTruncation("Pass 1.5 (critique)"),
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
  let pass2MaxTokens = deepAnalysis ? PASS2_MAX_TOKENS_DEEP : PASS2_MAX_TOKENS;

  for (let attempt = 0; attempt <= PASS2_MAX_RETRIES; attempt++) {
    let structuredRaw: string;
    try {
      logStage(
        attempt === 0
          ? `Pass 2 structuring starting… (budget ${pass2MaxTokens} tokens)`
          : `Pass 2 retry starting… (budget ${pass2MaxTokens} tokens)`,
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
          maxTokens: pass2MaxTokens,
          priorIssues,
        }),
      );
    } catch (err) {
      const truncated =
        err instanceof ProviderError && err.code === "truncated_output";

      // Truncation is a budget problem, not a model-quality problem: retry with
      // a bigger ceiling rather than re-sending the same doomed request.
      if (truncated && attempt < PASS2_MAX_RETRIES) {
        const nextBudget = Math.min(
          Math.round(pass2MaxTokens * 1.75),
          PASS2_MAX_TOKENS_CEILING,
        );
        logStage(
          `Pass 2 truncated at ${pass2MaxTokens} tokens — retrying with ${nextBudget}`,
        );
        priorIssues = [
          `Your previous output was cut off at the ${pass2MaxTokens}-token limit before the JSON closed. Emit the complete object; keep every field but write tighter strings.`,
        ];
        pass2MaxTokens = nextBudget;
        lastFailure = {
          ok: false,
          code: "schema_invalid",
          stage: "pass2",
          message: err.message,
          details: [
            "Pass 2 output truncated at the token limit",
            `Retrying with a ${nextBudget}-token budget`,
          ],
          meta: buildMeta(),
        };
        continue;
      }

      return {
        ok: false,
        code: "provider_error",
        stage: "pass2",
        message: humanizeCaughtError(err, "pass2"),
        details: [
          err instanceof ProviderError
            ? `status=${err.status}${err.code ? ` code=${err.code}` : ""}`
            : err instanceof Error
              ? err.message
              : "Pass 2 failed",
          truncated
            ? `Pass 2 truncated even at ${pass2MaxTokens} tokens — use a non-reasoning model for structuring`
            : attempt > 0
              ? `pass2_retry_attempt=${attempt}`
              : "pass2_attempt=0",
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

      // Some providers omit finish_reason; extractJsonObject catches those.
      // Same remedy: more room, not more scolding.
      if (/truncated/i.test(issue)) {
        pass2MaxTokens = Math.min(
          Math.round(pass2MaxTokens * 1.75),
          PASS2_MAX_TOKENS_CEILING,
        );
      }

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

    const inputAdequacy = scoreInputAdequacy(idea, locale);

    const analysis: FailureAnalysis = {
      ...validation.data,
      meta: {
        idea_input: idea,
        category,
        generated_at: generatedAt,
        // K1 — pipeline-authored, never taken from model output
        run: buildRun(),
        // E19 — advisory input adequacy, pipeline-authored (never from model)
        input_adequacy: inputAdequacy,
      },
    };

    // E19 — disclose thin input. Advisory only (no reject); plain-language so it
    // survives filterUserFacingWarnings (must not match any TECH_PATTERNS).
    if (inputAdequacy.band === "thin") {
      warnings.push(
        locale === "id"
          ? "Ide ini memberi mesin sedikit detail pembeda (harga, angka, aktor, batasan); titik kegagalan tunggal di bawah bisa kurang stabil — tambahkan spesifik untuk analisis yang lebih tajam."
          : "This idea gave the engine limited distinguishing detail (pricing, numbers, named actors, constraints); the single point of failure below may be less stable — add specifics for a sharper read.",
      );
    }

    // E20/N5 — measured input adequacy caps the confidence the report may claim.
    // Post-processing, not a prompt rule: the model still argues its own
    // confidence and we lower it, so the cap appends its reasoning rather than
    // overwriting the model's. Closes the dogfood anomaly where a Standard run
    // claimed Very High on an idea that never named a revenue mechanism.
    {
      const spof = analysis.single_point_of_failure;
      const decision = decideConfidenceCeiling({
        confidence: spof.confidence,
        spofText: `${spof.component}. ${spof.explanation}`,
        adequacy: inputAdequacy,
      });
      if (decision.applied) {
        const disclosure = ceilingDisclosure(decision, locale);
        analysis.single_point_of_failure = {
          ...spof,
          confidence: decision.to,
          confidence_reason: `${spof.confidence_reason} ${disclosure}`.trim(),
        };
        warnings.push(disclosure);
        console.info("[pipeline] confidence ceiling applied", {
          from: decision.from,
          to: decision.to,
          rule: decision.rule,
          adequacy: inputAdequacy.band,
        });
      }
    }

    // K3 — spof_candidates surfaces in BOTH modes (passed through from Pass 2
    // via ...validation.data). Guarantee a coherent winner so the UI always has
    // the selection margin; never fabricate losing candidates the model omitted.
    {
      const cands = analysis.spof_candidates ?? [];
      const hasWinner = cands.some((c) => c.verdict === "winner");
      if (cands.length === 0) {
        analysis.spof_candidates = [
          {
            label: analysis.single_point_of_failure.component,
            mechanism: analysis.single_point_of_failure.explanation,
            verdict: "winner",
          },
        ];
        warnings.push(
          "spof_candidates omitted by Pass 2 — winner-only fallback from single_point_of_failure (selection margin unavailable)",
        );
      } else if (!hasWinner) {
        // Model listed candidates but marked none the winner: promote the first.
        cands[0] = { ...cands[0], verdict: "winner" };
        warnings.push(
          "spof_candidates had no winner — promoted first candidate to winner",
        );
      }
    }

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

    // E22/N8 — derive spof_agreement from the candidate evidence instead of
    // trusting Pass 2's self-rating. The gate that matters: High now requires at
    // least two DISTINCT candidate hinges, so "High agreement" over one claim
    // worded twice — the dogfood tautology — is no longer reachable. `runs` and
    // `candidate_spofs` stay as Pass 2 reported them; only the judgement and its
    // reason become pipeline-authored. See agreement.ts for what it can't see.
    if (analysis.self_consistency) {
      const sc = analysis.self_consistency;
      const derived = deriveSpofAgreement({
        candidateSpofs: sc.candidate_spofs ?? [],
        spofCandidateLabels: (analysis.spof_candidates ?? []).map((c) => c.label),
        winnerComponent: analysis.single_point_of_failure.component,
        runs: sc.runs,
        modelClaim: sc.spof_agreement,
      });
      analysis.self_consistency = {
        ...sc,
        spof_agreement: derived.level,
        reason: `${derived.reason} Limits: ${derived.limits.join("; ")}.`,
      };
      if (derived.level !== sc.spof_agreement) {
        warnings.push(
          `spof_agreement derived as ${derived.level} from ${derived.distinctCandidates} distinct candidate(s); Pass 2 had claimed ${sc.spof_agreement}`,
        );
      }
      console.info("[pipeline] spof_agreement derived", {
        modelClaim: sc.spof_agreement,
        derived: derived.level,
        distinctCandidates: derived.distinctCandidates,
        rawCandidates: derived.rawCandidates,
        paraphraseGroups: derived.paraphraseGroups.length,
        winnerTraceable: derived.winnerTraceable,
      });
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

    // N7/E21 — permanent byte-identity invariant, checked after every mutation
    // above. `meta.idea_input` must be the exact validated input and never the
    // model's copy: Pass 2 cannot reproduce a long idea losslessly, and a
    // silently truncated idea shown beside a High confidence badge is the K8
    // failure. Restamp rather than fail — a metadata slip must never cost a
    // paid analysis — but record it so a regression is visible, not silent.
    if (analysis.meta.idea_input !== idea) {
      const seen = analysis.meta.idea_input;
      analysis.meta = { ...analysis.meta, idea_input: idea };
      warnings.push(
        `meta.idea_input was not byte-identical to the submitted input (${seen.length} vs ${idea.length} chars) — restamped from the validated input`,
      );
      console.warn("[pipeline] idea_input mismatch restamped", {
        submittedChars: idea.length,
        seenChars: seen.length,
      });
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

    // K3 — opt-in raw dump so the discarded SPOF candidates stay recoverable.
    // No-op unless BIF_TRACE=1; never allowed to affect the returned result.
    writeAnalysisTrace(
      buildAnalysisTrace({
        analysis,
        run: meta.run,
        reasoningA,
        reasoningB,
        reasoning,
        structuredRaw,
        warnings,
        stages: meta.stages,
      }),
    );

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
