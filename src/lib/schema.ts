import type {
  AnalysisError,
  ConfidenceBand,
  FailureAnalysis,
  LikelihoodBand,
} from "@/types/analysis";

const CONFIDENCE_BANDS: ConfidenceBand[] = [
  "Low",
  "Medium",
  "High",
  "Very High",
];

const LIKELIHOOD_BANDS: LikelihoodBand[] = [
  "Very Low",
  "Low",
  "Medium",
  "High",
  "Very High",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isInt0to100(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

export function isAnalysisError(value: unknown): value is AnalysisError {
  return (
    isRecord(value) &&
    value.error === "not_analyzable" &&
    typeof value.message === "string"
  );
}

export type SchemaValidationResult =
  | { ok: true; data: FailureAnalysis }
  | { ok: false; issues: string[] };

export function validateFailureAnalysis(
  value: unknown,
): SchemaValidationResult {
  const issues: string[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: ["Root value must be an object"] };
  }

  if (!isRecord(value.meta)) {
    issues.push("meta is required");
  } else {
    if (typeof value.meta.idea_input !== "string") {
      issues.push("meta.idea_input must be a string");
    }
    if (typeof value.meta.category !== "string") {
      issues.push("meta.category must be a string");
    }
    if (typeof value.meta.generated_at !== "string") {
      issues.push("meta.generated_at must be a string");
    }
  }

  if (typeof value.summary !== "string" || !value.summary.trim()) {
    issues.push("summary must be a non-empty string");
  }

  if (!isStringArray(value.assumptions)) {
    issues.push("assumptions must be a string array");
  } else if (value.assumptions.length < 5 || value.assumptions.length > 10) {
    issues.push("assumptions must contain 5–10 items");
  }

  if (!isRecord(value.single_point_of_failure)) {
    issues.push("single_point_of_failure is required");
  } else {
    const spof = value.single_point_of_failure;
    if (typeof spof.component !== "string" || !spof.component.trim()) {
      issues.push("single_point_of_failure.component is required");
    }
    if (
      typeof spof.confidence !== "string" ||
      !CONFIDENCE_BANDS.includes(spof.confidence as ConfidenceBand)
    ) {
      issues.push(
        'single_point_of_failure.confidence must be Low|Medium|High|Very High',
      );
    }
    if (typeof spof.confidence_reason !== "string") {
      issues.push("single_point_of_failure.confidence_reason is required");
    }
    if (typeof spof.explanation !== "string") {
      issues.push("single_point_of_failure.explanation is required");
    }
  }

  if (!isRecord(value.cascade) || !isStringArray(value.cascade.nodes)) {
    issues.push("cascade.nodes must be a string array");
  } else if (
    value.cascade.nodes.length < 7 ||
    value.cascade.nodes.length > 12
  ) {
    issues.push("cascade.nodes must contain 7–12 items");
  }

  if (!isRecord(value.failure_modes)) {
    issues.push("failure_modes is required");
  } else {
    for (const key of [
      "technical",
      "business",
      "security",
      "legal",
      "operations",
    ] as const) {
      if (!isStringArray(value.failure_modes[key])) {
        issues.push(`failure_modes.${key} must be a string array`);
      }
    }
  }

  if (!isRecord(value.likelihood)) {
    issues.push("likelihood is required");
  } else {
    if (
      typeof value.likelihood.band !== "string" ||
      !LIKELIHOOD_BANDS.includes(value.likelihood.band as LikelihoodBand)
    ) {
      issues.push(
        'likelihood.band must be Very Low|Low|Medium|High|Very High',
      );
    }
    if (typeof value.likelihood.reason !== "string") {
      issues.push("likelihood.reason is required");
    }
  }

  if (!isRecord(value.resilience_score)) {
    issues.push("resilience_score is required");
  } else {
    for (const key of [
      "technical",
      "business",
      "legal",
      "operations",
      "trust",
    ] as const) {
      if (!isInt0to100(value.resilience_score[key])) {
        issues.push(`resilience_score.${key} must be a number 0–100`);
      }
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, data: value as unknown as FailureAnalysis };
}

/** Soft check: cascade should reference SPOF or assumptions (log-only in MVP). */
export function cascadeLooksConnected(analysis: FailureAnalysis): boolean {
  const haystack = analysis.cascade.nodes.join(" ").toLowerCase();
  const component = analysis.single_point_of_failure.component.toLowerCase();

  if (component && haystack.includes(component)) {
    return true;
  }

  return analysis.assumptions.some((assumption) => {
    const tokens = assumption
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 5)
      .slice(0, 4);
    return tokens.some((token) => haystack.includes(token));
  });
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();

  // Strip common markdown fences
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
