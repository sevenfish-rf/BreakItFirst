/**
 * Automated regression assertions (project-overview §5 + structural schema).
 * These do NOT score reasoning quality — only structural / product-invariant fails.
 */

import type { FailureAnalysis } from "../src/types/analysis";
import {
  cascadeDepthPreferred,
  cascadeLooksConnected,
  cascadeSignalsLookObservational,
  resilienceProfileLooksSane,
  spofAppearsInFailureModes,
  spofLabelLooksShort,
  stressTestLooksUseful,
  stressTestNotAllYes,
  validateFailureAnalysis,
} from "../src/lib/schema";

export type AssertionResult = {
  id: string;
  pass: boolean;
  message: string;
};

const MODE_KEYS = [
  "technical",
  "business",
  "security",
  "legal",
  "operations",
] as const;

const RESILIENCE_KEYS = [
  "technical",
  "business",
  "legal",
  "operations",
  "trust",
] as const;

/** Structural + product-invariant checks on a validated analysis object. */
export function runRegressionAssertions(
  analysis: FailureAnalysis,
): AssertionResult[] {
  const results: AssertionResult[] = [];

  const push = (id: string, pass: boolean, message: string) => {
    results.push({ id, pass, message });
  };

  const schema = validateFailureAnalysis(analysis);
  push(
    "schema_valid",
    schema.ok,
    schema.ok ? "Schema valid" : `Schema invalid: ${schema.issues?.join("; ")}`,
  );

  push(
    "summary_nonempty",
    typeof analysis.summary === "string" && analysis.summary.trim().length > 20,
    "Summary present and non-trivial",
  );

  push(
    "assumptions_range",
    analysis.assumptions.length >= 5 && analysis.assumptions.length <= 10,
    `Assumptions count ${analysis.assumptions.length} in 5–10`,
  );

  push(
    "cascade_range",
    analysis.cascade.nodes.length >= 7 && analysis.cascade.nodes.length <= 12,
    `Cascade nodes ${analysis.cascade.nodes.length} in 7–12`,
  );

  push(
    "cascade_nodes_shaped",
    analysis.cascade.nodes.every(
      (n) =>
        typeof n.step === "string" &&
        n.step.trim().length > 0 &&
        typeof n.observable_signal === "string" &&
        n.observable_signal.trim().length > 0,
    ),
    "Each cascade node has step + observable_signal",
  );

  push(
    "spof_fields",
    Boolean(
      analysis.single_point_of_failure.component?.trim() &&
        analysis.single_point_of_failure.explanation?.trim() &&
        analysis.single_point_of_failure.confidence_reason?.trim(),
    ),
    "SPOF has component, explanation, confidence_reason",
  );

  push(
    "likelihood_has_reason",
    Boolean(analysis.likelihood.reason?.trim()),
    "Likelihood has reason (not band-only)",
  );

  push(
    "velocity_present",
    Boolean(
      analysis.failure_velocity?.band &&
        analysis.failure_velocity?.reason?.trim(),
    ),
    "Failure velocity band + reason present",
  );

  push(
    "velocity_band_enum",
    ["Fast", "Medium", "Slow"].includes(analysis.failure_velocity?.band),
    "Velocity band is Fast|Medium|Slow",
  );

  push(
    "stress_test_nonempty",
    Array.isArray(analysis.stress_test?.items) &&
      analysis.stress_test.items.length >= 1,
    "Stress test has at least one item",
  );

  push(
    "stress_test_shaped",
    (analysis.stress_test?.items ?? []).every(
      (i) =>
        i.archetype_id?.trim() &&
        ["Yes", "Maybe", "No"].includes(i.verdict) &&
        i.reason?.trim(),
    ),
    "Stress items have id, verdict, reason",
  );

  const hasOverall =
    "overall" in (analysis.resilience_score as object) ||
    "overall_score" in (analysis as object) ||
    "danger_score" in (analysis as object) ||
    "overall" in ((analysis.stress_test as object) ?? {});
  push(
    "no_overall_score",
    !hasOverall,
    "No overall/danger score field (false precision guard)",
  );

  for (const key of RESILIENCE_KEYS) {
    const v = analysis.resilience_score[key];
    push(
      `resilience_${key}_range`,
      Number.isInteger(v) && v >= 0 && v <= 100,
      `resilience_score.${key} in 0–100 int`,
    );
  }

  for (const key of MODE_KEYS) {
    push(
      `failure_modes_${key}_array`,
      Array.isArray(analysis.failure_modes[key]),
      `failure_modes.${key} is array`,
    );
  }

  push(
    "soft_cascade_connected",
    cascadeLooksConnected(analysis),
    "Cascade connected to SPOF/assumptions (soft)",
  );
  push(
    "soft_spof_in_modes",
    spofAppearsInFailureModes(analysis),
    "SPOF theme appears in failure_modes (soft)",
  );
  push(
    "soft_resilience_sane",
    resilienceProfileLooksSane(analysis),
    "Resilience profile not flat/all-high (soft)",
  );
  push(
    "soft_stress_useful",
    stressTestLooksUseful(analysis),
    "Stress test useful (soft)",
  );
  push(
    "soft_signals_observational",
    cascadeSignalsLookObservational(analysis),
    "Cascade signals observational (soft)",
  );
  push(
    "soft_spof_label_short",
    spofLabelLooksShort(analysis),
    "SPOF label short (soft)",
  );
  push(
    "soft_cascade_depth_preferred",
    cascadeDepthPreferred(analysis),
    "Cascade depth 8–10 preferred (soft)",
  );
  push(
    "soft_stress_not_all_yes",
    stressTestNotAllYes(analysis),
    "Stress test not all-Yes (soft)",
  );

  push(
    "likelihood_not_percent",
    !/%|percent/i.test(analysis.likelihood.reason) &&
      !/^\d+(\.\d+)?$/.test(analysis.likelihood.band),
    "Likelihood not presented as raw percent",
  );

  return results;
}

export function summarizeAssertions(results: AssertionResult[]): {
  hard_pass: number;
  hard_fail: number;
  soft_pass: number;
  soft_fail: number;
  hard_failed_ids: string[];
  soft_failed_ids: string[];
} {
  const hard = results.filter((r) => !r.id.startsWith("soft_"));
  const soft = results.filter((r) => r.id.startsWith("soft_"));
  return {
    hard_pass: hard.filter((r) => r.pass).length,
    hard_fail: hard.filter((r) => !r.pass).length,
    soft_pass: soft.filter((r) => r.pass).length,
    soft_fail: soft.filter((r) => !r.pass).length,
    hard_failed_ids: hard.filter((r) => !r.pass).map((r) => r.id),
    soft_failed_ids: soft.filter((r) => !r.pass).map((r) => r.id),
  };
}
