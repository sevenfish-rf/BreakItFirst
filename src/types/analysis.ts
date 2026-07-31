/** Failure analysis report schema — Pass 2 structured output. */

export type ConfidenceBand = "Low" | "Medium" | "High" | "Very High";
export type LikelihoodBand =
  | "Very Low"
  | "Low"
  | "Medium"
  | "High"
  | "Very High";

/** C.4 stress-test verdict per failure archetype */
export type StressVerdict = "Yes" | "Maybe" | "No";

/** C.5 qualitative failure velocity (no false numeric precision) */
export type VelocityBand = "Fast" | "Medium" | "Slow";

export type FailureModeKey =
  | "technical"
  | "business"
  | "security"
  | "legal"
  | "operations";

export type CascadeNode = {
  /** Short causal step (~max 8 words) for the graph */
  step: string;
  /**
   * C.3 Early warning — what would be observable in the real world if this
   * step is happening. Observation only — never advice ("you should…").
   */
  observable_signal: string;
};

export type StressTestItem = {
  /** Must match an id from the archetype library when possible */
  archetype_id: string;
  verdict: StressVerdict;
  reason: string;
};

/**
 * K1 — run provenance. A report that does not say which models produced it
 * cannot be compared against another report, so every stored/exported analysis
 * carries this. Filled by the pipeline after Pass 2 validation, never by the
 * model. Deliberately excludes the API key and the full BYOK base URL.
 */
export type RunProvenance = {
  mode: "standard" | "deep";
  locale: "en" | "id";
  pass1_model: string;
  pass2_model: string;
  /** Host only (e.g. api.example.com) — enough to identify the provider */
  provider_host: string;
  /** Pass 1 drafts that actually produced text (2 = deep with both drafts) */
  pass1_runs: number;
};

export interface FailureAnalysis {
  meta: {
    idea_input: string;
    category: string;
    generated_at: string;
    /** Optional: reports saved before K1 shipped have no provenance. */
    run?: RunProvenance;
    /** E19 — advisory input-adequacy band. Optional: absent on pre-E19 reports. */
    input_adequacy?: {
      score: number;
      dimensions: string[];
      band: "thin" | "adequate" | "rich";
    };
  };
  summary: string;
  assumptions: string[];
  single_point_of_failure: {
    component: string;
    confidence: ConfidenceBand;
    confidence_reason: string;
    explanation: string;
    /**
     * F1 — 0-based indices into assumptions[] that this SPOF most depends on.
     * Optional; omit if model cannot link cleanly.
     */
    critical_assumption_indices?: number[];
  };
  /**
   * K3 — ranked SPOF candidates + why the winner beat the runners-up.
   * Surfaced in BOTH modes to show the selection margin. Exactly one entry is
   * the "winner" (matching single_point_of_failure); losers carry a
   * reject_reason. Optional so older/under-producing output degrades gracefully.
   */
  spof_candidates?: {
    label: string;
    mechanism: string;
    verdict: "winner" | "rejected";
    reject_reason?: string;
  }[];
  cascade: {
    nodes: CascadeNode[];
    /**
     * F2 — 0-based index into nodes[] where the chain becomes hard to reverse.
     * Descriptive only — not advice. Optional if unclear.
     */
    point_of_no_return_index?: number;
  };
  failure_modes: {
    technical: string[];
    business: string[];
    security: string[];
    legal: string[];
    operations: string[];
    /**
     * F3 — optional note that two domains share one root trigger.
     * Observation only; omit if none.
     */
    compounding_note?: string;
  };
  likelihood: {
    band: LikelihoodBand;
    reason: string;
  };
  resilience_score: {
    technical: number;
    business: number;
    legal: number;
    operations: number;
    trust: number;
  };
  /** C.4 — pattern checklist; do NOT collapse into one overall score */
  stress_test: {
    items: StressTestItem[];
  };
  /** C.5 — how quickly the failure path tends to materialize */
  failure_velocity: {
    band: VelocityBand;
    reason: string;
  };
  /**
   * C.6 — present only for Deep analysis (multi Pass 1).
   * Measures SPOF convergence across independent reasoning runs.
   */
  self_consistency?: {
    runs: number;
    spof_agreement: "High" | "Medium" | "Low";
    reason: string;
    /** SPOF labels seen across drafts (1–3) */
    candidate_spofs: string[];
  };
}

export interface AnalysisError {
  error: "not_analyzable";
  message: string;
}
