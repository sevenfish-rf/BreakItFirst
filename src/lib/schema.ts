import { z } from "zod";
import { FAILURE_ARCHETYPES } from "@/lib/archetypes";
import type { AnalysisError, FailureAnalysis } from "@/types/analysis";

const confidenceBandSchema = z.enum(["Low", "Medium", "High", "Very High"]);
const likelihoodBandSchema = z.enum([
  "Very Low",
  "Low",
  "Medium",
  "High",
  "Very High",
]);
const stressVerdictSchema = z.enum(["Yes", "Maybe", "No"]);
const velocityBandSchema = z.enum(["Fast", "Medium", "Slow"]);

/** Models often return 42.0 — coerce so Pass 2 doesn't hard-fail after long wait. */
const int0to100 = z.preprocess((v) => {
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Math.round(Number(v));
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return Math.round(v);
  }
  return v;
}, z.number().int().min(0).max(100));

const nonEmptyString = z.string().trim().min(1);

const optionalTrimmedString = z.preprocess((v) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") {
    const t = v.trim();
    return t.length ? t : undefined;
  }
  return undefined;
}, z.string().optional());

const cascadeNodeSchema = z.object({
  step: nonEmptyString,
  observable_signal: nonEmptyString,
});

const stressItemSchema = z.object({
  archetype_id: nonEmptyString,
  verdict: stressVerdictSchema,
  reason: nonEmptyString,
});

/** Zod schema for Pass 2 structured output. */
export const failureAnalysisSchema = z.object({
  meta: z.object({
    idea_input: z.string(),
    category: z.string(),
    generated_at: z.string(),
  }),
  summary: nonEmptyString,
  assumptions: z
    .array(z.string())
    .min(5, "assumptions must contain 5–10 items")
    .max(10, "assumptions must contain 5–10 items"),
  single_point_of_failure: z.object({
    component: nonEmptyString,
    confidence: confidenceBandSchema,
    confidence_reason: z.string(),
    explanation: z.string(),
    /** F1 — optional; empty/null stripped in normalize */
    critical_assumption_indices: z
      .array(z.number().int().min(0))
      .min(1)
      .max(3)
      .optional(),
  }),
  cascade: z.object({
    nodes: z
      .array(cascadeNodeSchema)
      .min(7, "cascade.nodes must contain 7–12 items")
      .max(12, "cascade.nodes must contain 7–12 items"),
    /** F2 — optional; invalid values stripped in normalize */
    point_of_no_return_index: z.number().int().min(0).optional(),
  }),
  failure_modes: z.object({
    technical: z.array(z.string()),
    business: z.array(z.string()),
    security: z.array(z.string()),
    legal: z.array(z.string()),
    operations: z.array(z.string()),
    /** F3 — optional; null/empty stripped */
    compounding_note: optionalTrimmedString,
  }),
  likelihood: z.object({
    band: likelihoodBandSchema,
    reason: z.string(),
  }),
  resilience_score: z.object({
    technical: int0to100,
    business: int0to100,
    legal: int0to100,
    operations: int0to100,
    trust: int0to100,
  }),
  stress_test: z.object({
    items: z
      .array(stressItemSchema)
      .min(1, "stress_test.items must not be empty")
      .max(16, "stress_test.items too many"),
  }),
  failure_velocity: z.object({
    band: velocityBandSchema,
    reason: nonEmptyString,
  }),
  self_consistency: z
    .object({
      runs: z.number().int().min(1).max(5),
      spof_agreement: z.enum(["High", "Medium", "Low"]),
      reason: nonEmptyString,
      candidate_spofs: z.array(z.string()).max(6),
    })
    .optional(),
});

export type SchemaValidationResult =
  | { ok: true; data: FailureAnalysis }
  | { ok: false; issues: string[] };

function formatZodIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "root";
    return `${path}: ${issue.message}`;
  });
}

export function isAnalysisError(value: unknown): value is AnalysisError {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.error === "not_analyzable" && typeof record.message === "string"
  );
}

const MODE_KEYS = [
  "technical",
  "business",
  "security",
  "legal",
  "operations",
] as const;

/**
 * Normalize legacy shapes + graceful drop of invalid F1/F2/F3 add-ons
 * (do not fail the whole analysis over optional fields).
 */
export function normalizeAnalysisPayload(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  const root = { ...(value as Record<string, unknown>) };

  const assumptions = Array.isArray(root.assumptions)
    ? (root.assumptions as unknown[])
    : [];
  const assumptionCount = assumptions.length;

  if (isRecord(root.single_point_of_failure)) {
    const spof = { ...root.single_point_of_failure };
    // Drop nullish optional F1 so Zod optional() doesn't see null
    if (
      spof.critical_assumption_indices === null ||
      spof.critical_assumption_indices === undefined
    ) {
      delete spof.critical_assumption_indices;
    } else if (Array.isArray(spof.critical_assumption_indices)) {
      const cleaned = [
        ...new Set(
          spof.critical_assumption_indices
            .map((n) => {
              if (typeof n === "number" && Number.isFinite(n)) {
                return Math.floor(n);
              }
              if (typeof n === "string" && n.trim() !== "" && Number.isFinite(Number(n))) {
                return Math.floor(Number(n));
              }
              return NaN;
            })
            .filter(
              (n) => Number.isFinite(n) && n >= 0 && n < assumptionCount,
            ),
        ),
      ].slice(0, 3);
      if (cleaned.length >= 1) {
        spof.critical_assumption_indices = cleaned;
      } else {
        delete spof.critical_assumption_indices;
      }
    } else {
      delete spof.critical_assumption_indices;
    }
    root.single_point_of_failure = spof;
  }

  if (isRecord(root.cascade)) {
    const cascade = { ...root.cascade };
    if (Array.isArray(cascade.nodes)) {
      cascade.nodes = cascade.nodes.map((node) => {
        if (typeof node === "string") {
          return {
            step: node,
            observable_signal: "Signal not specified in source analysis",
          };
        }
        if (isRecord(node)) {
          const step =
            typeof node.step === "string"
              ? node.step
              : typeof node.label === "string"
                ? node.label
                : typeof node.text === "string"
                  ? node.text
                  : "";
          const signal =
            typeof node.observable_signal === "string"
              ? node.observable_signal
              : typeof node.signal === "string"
                ? node.signal
                : "Signal not specified in source analysis";
          return { step, observable_signal: signal };
        }
        return node;
      });
    }
    const nodeCount = Array.isArray(cascade.nodes) ? cascade.nodes.length : 0;
    let ponrRaw: unknown = cascade.point_of_no_return_index;
    if (typeof ponrRaw === "string" && ponrRaw.trim() !== "") {
      ponrRaw = Number(ponrRaw);
    }
    if (typeof ponrRaw === "number" && Number.isFinite(ponrRaw)) {
      const idx = Math.floor(ponrRaw);
      if (idx >= 0 && idx < nodeCount) {
        cascade.point_of_no_return_index = idx;
      } else {
        delete cascade.point_of_no_return_index;
      }
    } else {
      delete cascade.point_of_no_return_index;
    }
    root.cascade = cascade;
  }

  if (isRecord(root.failure_modes)) {
    const modes = { ...root.failure_modes };
    // Ensure each domain is always an array (models sometimes omit keys)
    for (const key of MODE_KEYS) {
      if (!Array.isArray(modes[key])) {
        modes[key] = [];
      }
    }
    if (
      modes.compounding_note === null ||
      modes.compounding_note === undefined
    ) {
      delete modes.compounding_note;
    } else if (typeof modes.compounding_note === "string") {
      const note = modes.compounding_note.trim();
      if (!note) {
        delete modes.compounding_note;
      } else {
        const lower = note.toLowerCase();
        let mentionsEmpty = false;
        for (const key of MODE_KEYS) {
          const arr = modes[key];
          const empty = !Array.isArray(arr) || arr.length === 0;
          if (empty && lower.includes(key)) {
            mentionsEmpty = true;
            break;
          }
        }
        if (mentionsEmpty) {
          delete modes.compounding_note;
        } else {
          modes.compounding_note = note;
        }
      }
    } else {
      delete modes.compounding_note;
    }
    root.failure_modes = modes;
  }

  // Coerce resilience floats / string numbers
  if (isRecord(root.resilience_score)) {
    const rs = { ...root.resilience_score };
    for (const key of [
      "technical",
      "business",
      "legal",
      "operations",
      "trust",
    ] as const) {
      const v = rs[key];
      if (typeof v === "number" && Number.isFinite(v)) {
        rs[key] = Math.round(Math.min(100, Math.max(0, v)));
      } else if (typeof v === "string" && Number.isFinite(Number(v))) {
        rs[key] = Math.round(Math.min(100, Math.max(0, Number(v))));
      }
    }
    root.resilience_score = rs;
  }

  return root;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Runtime schema validation (Zod) — single source of truth for Pass 2. */
export function validateFailureAnalysis(
  value: unknown,
): SchemaValidationResult {
  const normalized = normalizeAnalysisPayload(value);
  const result = failureAnalysisSchema.safeParse(normalized);
  if (!result.success) {
    return { ok: false, issues: formatZodIssues(result.error) };
  }
  return { ok: true, data: result.data as FailureAnalysis };
}

function tokenizeSignificant(text: string, maxTokens = 6): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4)
    .slice(0, maxTokens);
}

function textMentionsAny(haystack: string, needles: string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some((n) => n.length >= 4 && h.includes(n));
}

function cascadeStepsText(analysis: FailureAnalysis): string {
  return analysis.cascade.nodes.map((n) => n.step).join(" ");
}

/** Soft check: cascade should reference SPOF or assumptions (log-only). */
export function cascadeLooksConnected(analysis: FailureAnalysis): boolean {
  const haystack = cascadeStepsText(analysis).toLowerCase();
  const component = analysis.single_point_of_failure.component.toLowerCase();

  if (component && haystack.includes(component)) {
    return true;
  }

  const componentTokens = tokenizeSignificant(component);
  if (textMentionsAny(haystack, componentTokens)) {
    return true;
  }

  return analysis.assumptions.some((assumption) => {
    const tokens = tokenizeSignificant(assumption, 4);
    return tokens.some((token) => haystack.includes(token));
  });
}

export function spofAppearsInFailureModes(analysis: FailureAnalysis): boolean {
  const spofText = [
    analysis.single_point_of_failure.component,
    analysis.single_point_of_failure.explanation,
  ].join(" ");
  const tokens = tokenizeSignificant(spofText, 8);
  if (tokens.length === 0) return false;

  const modesHaystack = Object.values(analysis.failure_modes)
    .flat()
    .join(" ")
    .toLowerCase();

  return tokens.some((t) => modesHaystack.includes(t));
}

export function resilienceProfileLooksSane(analysis: FailureAnalysis): boolean {
  const scores = Object.values(analysis.resilience_score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const allEqual = scores.every((s) => s === scores[0]);

  if (allEqual) return false;
  if (max - min < 8 && min >= 55) return false;

  const conf = analysis.single_point_of_failure.confidence;
  if ((conf === "High" || conf === "Very High") && min >= 75) {
    return false;
  }

  return true;
}

/** Soft: at least one stress Yes/Maybe should align with SPOF theme when Yes present */
export function stressTestLooksUseful(analysis: FailureAnalysis): boolean {
  const items = analysis.stress_test.items;
  if (items.length < 3) return false;
  const knownIds = new Set<string>(FAILURE_ARCHETYPES.map((a) => a.id));
  const knownHits = items.filter((i) => knownIds.has(i.archetype_id));
  if (knownHits.length === 0) return false;
  // Not all No — that usually means rubber-stamping
  const anyYesOrMaybe = items.some(
    (i) => i.verdict === "Yes" || i.verdict === "Maybe",
  );
  return anyYesOrMaybe;
}

/** Soft: signals should not sound like advice */
export function cascadeSignalsLookObservational(analysis: FailureAnalysis): boolean {
  const advice =
    /\b(you should|sebaiknya|harus|need to|recommend|try to)\b/i;
  return analysis.cascade.nodes.every(
    (n) => !advice.test(n.observable_signal),
  );
}

/** Soft: SPOF component should be a short label, not a paragraph */
export function spofLabelLooksShort(analysis: FailureAnalysis): boolean {
  const c = analysis.single_point_of_failure.component.trim();
  if (!c) return false;
  const words = c.split(/\s+/).filter(Boolean);
  // Prefer ≤12 words; allow up to 16 before soft-fail
  if (words.length > 16) return false;
  // Multi-sentence labels are almost never UI-friendly
  if ((c.match(/[.!?]/g) ?? []).length >= 1 && words.length > 10) return false;
  if (c.length > 120) return false;
  return true;
}

/** Soft: prefer 8–10 cascade nodes (hard schema still 7–12) */
export function cascadeDepthPreferred(analysis: FailureAnalysis): boolean {
  const n = analysis.cascade.nodes.length;
  return n >= 8 && n <= 10;
}

/** Soft: stress test not all-Yes (rubber stamp exposure) */
export function stressTestNotAllYes(analysis: FailureAnalysis): boolean {
  const items = analysis.stress_test.items;
  if (items.length < 4) return true;
  const yesCount = items.filter((i) => i.verdict === "Yes").length;
  return yesCount < items.length;
}

/**
 * Soft: stress test not mostly-Maybe (uninformative hedging).
 * Threshold 0.75 — ship as soft/log only (DIRECTIVES D2).
 */
export function stressTestNotAllMaybe(analysis: FailureAnalysis): boolean {
  const items = analysis.stress_test.items;
  if (items.length < 4) return true;
  const maybeCount = items.filter((i) => i.verdict === "Maybe").length;
  return maybeCount / items.length < 0.75;
}

/**
 * Soft: at least 3 of 5 failure_modes domains non-empty (DIRECTIVES D3).
 * Soft only — never hard-fail legitimately narrow ideas.
 */
export function failureModesCoverageLooksSane(
  analysis: FailureAnalysis,
): boolean {
  const filled = Object.values(analysis.failure_modes).filter(
    (arr) => Array.isArray(arr) && arr.length >= 1,
  ).length;
  return filled >= 3;
}

/**
 * Soft: SPOF-relevant resilience dimension should not be among the highest
 * scores (DIRECTIVES D5). Ambiguous SPOF → skip (return true).
 */
export function spofDimensionLooksLow(analysis: FailureAnalysis): boolean {
  const text = [
    analysis.single_point_of_failure.component,
    analysis.single_point_of_failure.explanation,
  ]
    .join(" ")
    .toLowerCase();

  type Dim = keyof FailureAnalysis["resilience_score"];
  const rules: { re: RegExp; dim: Dim }[] = [
    { re: /\b(trust|safety|fraud|scam|reputation)\b/, dim: "trust" },
    {
      re: /\b(regulat|legal|liabilit|waiver|licen[sc]|compliance|lawsuit)\b/,
      dim: "legal",
    },
    {
      re: /\b(cost|margin|price|pricing|unit economics|cac|churn|revenue|take-?rate)\b/,
      dim: "business",
    },
    {
      re: /\b(oem|supply chain|defect|manufactur|logistics|returns?|support|ops|operations|scale)\b/,
      dim: "operations",
    },
    {
      re: /\b(api|firmware|ppg|hrv|model|hallucin|technical|infra|latency|uptime|scrape)\b/,
      dim: "technical",
    },
  ];

  const hits = new Map<Dim, number>();
  for (const rule of rules) {
    if (rule.re.test(text)) {
      hits.set(rule.dim, (hits.get(rule.dim) ?? 0) + 1);
    }
  }
  if (hits.size === 0) return true;

  // Prefer single confident dimension; if multiple, pick the one with most hits
  let best: Dim | null = null;
  let bestN = 0;
  for (const [dim, n] of hits) {
    if (n > bestN) {
      best = dim;
      bestN = n;
    }
  }
  if (!best || hits.size > 2) return true; // too ambiguous

  const scores = analysis.resilience_score;
  const values = Object.values(scores);
  const target = scores[best];
  const sorted = [...values].sort((a, b) => b - a);
  // Soft-fail if SPOF dimension is highest or tied for top-2 highest
  const isTop = target === sorted[0] || target === sorted[1];
  // Only flag if it's clearly not fragile (mid-high)
  if (isTop && target >= 50) return false;
  return true;
}

/**
 * Soft: SPOF label should name a mechanism, not a vibey/generic theme.
 * (Length is checked separately by spofLabelLooksShort.)
 */
export function spofLabelLooksMechanistic(analysis: FailureAnalysis): boolean {
  const c = analysis.single_point_of_failure.component.toLowerCase().trim();
  if (!c) return false;

  // Pure abstract themes (often name-swappable)
  const abstractOnly =
    /^(trust(\s+collapse|\s+erosion|\s+issues?)?|competition|poor execution|lack of (marketing|funding|users)|product[- ]market fit|cash(\s+runway)?|retention|brand|quality|ai quality|unit economics|regulatory risk)$/i;
  if (abstractOnly.test(c)) return false;

  // Labels that are only vibe words without a mechanism cue
  const vibeHeavy =
    /\b(collapse|erosion|issues?|problems?|challenges?|concerns?)\b/i;
  const mechanismCue =
    /\b(without|with|after|before|only|single|fixed|batch|overwrite|waiver|filter|keyword|oem|scrape|margin|price|pricing|api|key|sla|lock-?in|cold[- ]start|chicken|disintermediation|ppg|hrv|provider|tos|app store|seat|take[- ]?rate)\b/i;
  if (vibeHeavy.test(c) && !mechanismCue.test(c) && c.split(/\s+/).length <= 5) {
    return false;
  }

  return true;
}

export type SoftCheckResult = {
  id: string;
  ok: boolean;
  message: string;
};

export function runSoftChecks(analysis: FailureAnalysis): SoftCheckResult[] {
  return [
    {
      id: "cascade_connected",
      ok: cascadeLooksConnected(analysis),
      message:
        "Cascade may be disconnected from SPOF/assumptions (soft check)",
    },
    {
      id: "spof_in_failure_modes",
      ok: spofAppearsInFailureModes(analysis),
      message:
        "SPOF theme may be missing from failure_modes buckets (soft check)",
    },
    {
      id: "resilience_sane",
      ok: resilienceProfileLooksSane(analysis),
      message:
        "Resilience profile looks flat or inconsistent with SPOF confidence (soft check)",
    },
    {
      id: "stress_test_useful",
      ok: stressTestLooksUseful(analysis),
      message:
        "Stress test may be incomplete or all-No (soft check)",
    },
    {
      id: "stress_test_not_all_yes",
      ok: stressTestNotAllYes(analysis),
      message:
        "Stress test marks every archetype Yes — may be over-eager (soft check)",
    },
    {
      id: "stress_test_not_all_maybe",
      ok: stressTestNotAllMaybe(analysis),
      message:
        "Stress test is mostly Maybe — may be uninformative hedging (soft check)",
    },
    {
      id: "failure_modes_coverage",
      ok: failureModesCoverageLooksSane(analysis),
      message:
        "Fewer than 3 failure_modes domains populated (soft check)",
    },
    {
      id: "signals_observational",
      ok: cascadeSignalsLookObservational(analysis),
      message:
        "Some cascade signals may read as advice rather than observation (soft check)",
    },
    {
      id: "spof_label_short",
      ok: spofLabelLooksShort(analysis),
      message:
        "SPOF component label may be too long (prefer 3–8 words) (soft check)",
    },
    {
      id: "cascade_depth_preferred",
      ok: cascadeDepthPreferred(analysis),
      message:
        "Cascade length outside preferred 8–10 nodes (soft check; hard still 7–12)",
    },
    {
      id: "spof_label_mechanistic",
      ok: spofLabelLooksMechanistic(analysis),
      message:
        "SPOF label may be too abstract (prefer a concrete mechanism) (soft check)",
    },
    {
      id: "resilience_matches_spof",
      ok: spofDimensionLooksLow(analysis),
      message:
        "Resilience dimension tied to SPOF may be too high (soft check)",
    },
    {
      id: "critical_assumptions_overlap",
      ok: criticalAssumptionsLookLinked(analysis),
      message:
        "SPOF critical_assumption_indices may not match assumption themes (soft check)",
    },
    {
      id: "critical_assumptions_present",
      ok: criticalAssumptionsPresent(analysis),
      message:
        "SPOF has no critical_assumption_indices (soft check — prefer 1–3 links)",
    },
    {
      id: "failure_modes_track_cascade",
      ok: failureModesTrackCascade(analysis),
      message:
        "Many failure_modes bullets may not track SPOF/cascade themes (soft check)",
    },
    {
      id: "ponr_in_range_ok",
      ok: pointOfNoReturnLooksSane(analysis),
      message:
        "Cascade point_of_no_return_index missing or edge-only (soft check)",
    },
    {
      id: "security_legal_when_data_path",
      ok: securityOrLegalFilledWhenDataPath(analysis),
      message:
        "Idea mentions data/keys/free-tier/consent but security and legal modes are empty (soft check)",
    },
  ];
}

/**
 * Soft: when idea text suggests data, free-tier abuse, or consent, prefer at
 * least one non-empty security or legal mode (E8 / E16 signal).
 */
export function securityOrLegalFilledWhenDataPath(
  analysis: FailureAnalysis,
): boolean {
  const idea = (analysis.meta?.idea_input ?? "").toLowerCase();
  if (!idea.trim()) return true;
  const needsDataPath =
    /api key|free tier|transcript|consent|cdn|cache|pii|privacy|recording|encryption|oauth|bearer|session cookie|clipboard/i.test(
      idea,
    );
  if (!needsDataPath) return true;
  const sec = analysis.failure_modes.security?.filter((s) => s.trim()) ?? [];
  const legal = analysis.failure_modes.legal?.filter((s) => s.trim()) ?? [];
  return sec.length > 0 || legal.length > 0;
}

/** Soft: prefer explicit assumption→SPOF linkage when model can provide it */
export function criticalAssumptionsPresent(analysis: FailureAnalysis): boolean {
  const idxs = analysis.single_point_of_failure.critical_assumption_indices;
  return Array.isArray(idxs) && idxs.length >= 1;
}

/**
 * Soft: non-empty failure_mode bullets should mostly share theme tokens with
 * SPOF + cascade (orphan domain laundry list detection).
 * Threshold ~40% of bullets hit; empty analysis of modes → pass (coverage soft elsewhere).
 */
export function failureModesTrackCascade(analysis: FailureAnalysis): boolean {
  const bullets = Object.values(analysis.failure_modes)
    .flat()
    .filter((b): b is string => typeof b === "string" && b.trim().length > 0);
  if (bullets.length === 0) return true;

  const spine = [
    analysis.single_point_of_failure.component,
    analysis.single_point_of_failure.explanation,
    cascadeStepsText(analysis),
  ].join(" ");
  const spineLower = spine.toLowerCase();
  // Need some spine substance; otherwise skip (avoid false soft-fail)
  if (tokenizeSignificant(spine, 8).length === 0) return true;

  let hits = 0;
  for (const bullet of bullets) {
    const tokens = tokenizeSignificant(bullet, 8);
    if (tokens.some((t) => spineLower.includes(t))) {
      hits += 1;
    }
  }

  return hits / bullets.length >= 0.4;
}

/** F1 soft: flagged assumptions share theme tokens with SPOF */
export function criticalAssumptionsLookLinked(
  analysis: FailureAnalysis,
): boolean {
  const idxs = analysis.single_point_of_failure.critical_assumption_indices;
  if (!idxs || idxs.length === 0) return true; // optional field
  const spofText = [
    analysis.single_point_of_failure.component,
    analysis.single_point_of_failure.explanation,
  ].join(" ");
  const spofTokens = tokenizeSignificant(spofText, 10);
  if (spofTokens.length === 0) return true;

  return idxs.some((i) => {
    const assumption = analysis.assumptions[i];
    if (!assumption) return false;
    const tokens = tokenizeSignificant(assumption, 8);
    return tokens.some((t) => spofText.toLowerCase().includes(t));
  });
}

/**
 * F2 soft: if present, index shouldn't always be first/last only
 * (weak signal) — still pass if middle; pass if absent.
 */
export function pointOfNoReturnLooksSane(analysis: FailureAnalysis): boolean {
  const idx = analysis.cascade.point_of_no_return_index;
  if (idx === undefined) return true;
  const n = analysis.cascade.nodes.length;
  if (idx < 0 || idx >= n) return false;
  // Prefer not the very first step (usually still recoverable framing)
  if (n >= 4 && idx === 0) return false;
  return true;
}

const STOPWORDS = new Set([
  "because",
  "through",
  "without",
  "within",
  "between",
  "however",
  "therefore",
  "although",
  "already",
  "another",
  "something",
  "everything",
  "product",
  "failure",
  "cannot",
  "should",
  "would",
  "could",
]);

function contentWords(text: string, minLen = 5): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= minLen && !STOPWORDS.has(w));
}

/**
 * Soft claim guard: Pass 2 prose fields should be grounded in Pass 1/1.5 text.
 * Stricter on likelihood + velocity (baseline nit #3).
 */
export function pass2NovelClaimWarnings(
  reasoning: string,
  analysis: FailureAnalysis,
): string[] {
  const corpus = reasoning.toLowerCase();
  const warnings: string[] = [];

  const samples: { label: string; text: string; threshold: number }[] = [
    { label: "summary", text: analysis.summary, threshold: 0.22 },
    {
      label: "spof.explanation",
      text: analysis.single_point_of_failure.explanation,
      threshold: 0.22,
    },
    {
      label: "likelihood.reason",
      text: analysis.likelihood.reason,
      threshold: 0.35,
    },
    {
      label: "failure_velocity.reason",
      text: analysis.failure_velocity.reason,
      threshold: 0.4,
    },
    {
      label: "cascade.signals",
      text: analysis.cascade.nodes.map((n) => n.observable_signal).join(" "),
      threshold: 0.3,
    },
    {
      label: "failure_modes",
      text: MODE_KEYS.flatMap((k) => analysis.failure_modes[k]).join(" "),
      threshold: 0.25,
    },
  ];

  if (analysis.failure_modes.compounding_note?.trim()) {
    samples.push({
      label: "failure_modes.compounding_note",
      text: analysis.failure_modes.compounding_note,
      threshold: 0.28,
    });
  }

  for (const sample of samples) {
    const words = contentWords(sample.text);
    if (words.length < 5) continue;

    let hits = 0;
    for (const w of words) {
      if (corpus.includes(w)) hits += 1;
    }
    const ratio = hits / words.length;

    if (ratio < sample.threshold) {
      warnings.push(
        `Pass 2 ${sample.label} may introduce claims not grounded in Pass 1 (soft claim guard; match=${ratio.toFixed(2)})`,
      );
    }

    // Multi-digit numbers / money / ranges not present in reasoning
    const nums = sample.text.match(/\$?\d+(?:\.\d+)?%?|\d+\s*[-–]\s*\d+/g) ?? [];
    for (const n of nums) {
      const normalized = n.toLowerCase().replace(/\s+/g, "");
      const corpusNorm = corpus.replace(/\s+/g, "");
      if (n.replace(/\D/g, "").length < 1) continue;
      // Single digit alone is often noise; require 2+ digits or $/% 
      if (!/\$|%|\d{2,}|[-–]/.test(n) && n.replace(/\D/g, "").length < 2) {
        continue;
      }
      if (
        !corpus.includes(n.toLowerCase()) &&
        !corpus.includes(n.replace("$", "")) &&
        !corpusNorm.includes(normalized.replace("$", ""))
      ) {
        warnings.push(
          `Pass 2 ${sample.label} may invent numeric detail "${n}" absent from Pass 1 (soft claim guard)`,
        );
        break;
      }
    }
  }

  return warnings;
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("Model did not return valid JSON");
  }
}
