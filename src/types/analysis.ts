/** MVP schema from spec §9.5 — used from Phase 2 onward. */

export type ConfidenceBand = "Low" | "Medium" | "High" | "Very High";
export type LikelihoodBand =
  | "Very Low"
  | "Low"
  | "Medium"
  | "High"
  | "Very High";

export interface FailureAnalysis {
  meta: {
    idea_input: string;
    category: string;
    generated_at: string;
  };
  summary: string;
  assumptions: string[];
  single_point_of_failure: {
    component: string;
    confidence: ConfidenceBand;
    confidence_reason: string;
    explanation: string;
  };
  cascade: {
    nodes: string[];
  };
  failure_modes: {
    technical: string[];
    business: string[];
    security: string[];
    legal: string[];
    operations: string[];
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
}

export interface AnalysisError {
  error: "not_analyzable";
  message: string;
}
