/**
 * E22 / N8 — derive Deep-mode `spof_agreement` instead of asking the model to
 * rate itself.
 *
 * The dogfood corpus produced "High" agreement over **two candidates that were
 * paraphrases of each other** ("forced specificity from thin inputs" vs
 * "single-SPOF compression of ambiguous ideas"). High agreement over one idea
 * expressed twice is a tautology, not calibration, and the High/Medium/Low enum
 * cannot tell it apart from "two drafts examined different alternatives and
 * still converged". Today Pass 2 assigns that enum to itself.
 *
 * This module derives it from the candidate evidence instead, with one rule that
 * carries the whole fix: **High requires at least two DISTINCT candidate hinges.**
 * A single surviving candidate can never produce High again, however sure the
 * model sounded.
 *
 * WHAT THIS CANNOT DO — read before trusting the enum:
 *   1. Paraphrase collapse here is LEXICAL (shared content tokens). The dogfood
 *      pair that motivated E22 shares almost no vocabulary, so this would NOT
 *      have collapsed it. Catching that needs semantic judgement — an embedding
 *      or a judge call — which is a separate, paid change.
 *   2. The spec's third component, max resilience deviation between drafts, is
 *      not derivable: Pass 2 emits one merged structured report, so there are no
 *      per-draft resilience scores to diff. Getting them means running Pass 2
 *      per draft, i.e. doubling the most expensive call.
 *   3. Component match between drafts is approximated by "is the winning hinge
 *      traceable to the candidate pool", for the same reason.
 * Every one of these is reported in `limits` and surfaced in the reason string,
 * so the number is never presented as more than it is.
 */

export type AgreementLevel = "High" | "Medium" | "Low";

/** Local copy of the eval harness's token overlap — kept local on purpose so
 * `src/` never imports from `eval/`. Jaccard over content tokens of 4+ chars. */
function contentTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((t) => t.length >= 4),
  );
}

export function labelOverlap(a: string, b: string): number {
  const ta = contentTokens(a);
  const tb = contentTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  return shared / (ta.size + tb.size - shared);
}

/** Two candidate labels this similar are treated as one claim worded twice.
 * Stricter than the eval harness's 0.25 "echo" bar: collapsing a genuinely
 * different candidate would understate diversity, which is the safer error to
 * avoid here. */
export const PARAPHRASE_MIN_OVERLAP = 0.5;

/** Group labels into paraphrase clusters (first-match clustering, order-stable). */
export function collapseParaphrases(labels: string[]): string[][] {
  const groups: string[][] = [];
  for (const label of labels) {
    const trimmed = label.trim();
    if (!trimmed) continue;
    const hit = groups.find((g) =>
      g.some((existing) => labelOverlap(existing, trimmed) >= PARAPHRASE_MIN_OVERLAP),
    );
    if (hit) hit.push(trimmed);
    else groups.push([trimmed]);
  }
  return groups;
}

export type AgreementDerivation = {
  level: AgreementLevel;
  /** Distinct candidate hinges after paraphrase collapse — the gating number. */
  distinctCandidates: number;
  /** Candidate labels seen before collapse. */
  rawCandidates: number;
  /** Clusters with more than one member: the same claim worded twice. */
  paraphraseGroups: string[][];
  /** Is the winning hinge traceable to the candidate pool? (proxy for draft match) */
  winnerTraceable: boolean;
  /** Pipeline-authored prose for `self_consistency.reason`. */
  reason: string;
  /** What this derivation could not measure. Always non-empty. */
  limits: string[];
};

export function deriveSpofAgreement(params: {
  /** Candidates Pass 2 reported across drafts (`self_consistency.candidate_spofs`). */
  candidateSpofs: string[];
  /** Top-level `spof_candidates` labels (E23), any verdict. */
  spofCandidateLabels: string[];
  winnerComponent: string;
  /** Number of Pass 1 drafts that actually completed. */
  runs: number;
  /** What Pass 2 claimed, reported when it disagrees with the derivation. */
  modelClaim?: AgreementLevel;
}): AgreementDerivation {
  const { candidateSpofs, spofCandidateLabels, winnerComponent, runs, modelClaim } = params;

  const pool = [...candidateSpofs, ...spofCandidateLabels].map((s) => s.trim()).filter(Boolean);
  const groups = collapseParaphrases(pool);
  const distinctCandidates = groups.length;
  const paraphraseGroups = groups.filter((g) => g.length > 1);
  const winnerTraceable = pool.some(
    (label) =>
      label === winnerComponent.trim() ||
      labelOverlap(label, winnerComponent) >= PARAPHRASE_MIN_OVERLAP,
  );

  const limits = [
    "paraphrase detection is lexical, so two candidates that mean the same thing in different words still count as two",
    "no per-draft resilience scores exist to diff (Pass 2 emits one merged report)",
  ];

  let level: AgreementLevel;
  let why: string;
  if (runs < 2) {
    level = "Low";
    why =
      "only one reasoning draft completed, so agreement was not measured — read this as unmeasured, not as disagreement";
  } else if (distinctCandidates <= 1) {
    level = "Medium";
    why = `${runs} drafts produced ${distinctCandidates} distinct candidate hinge after collapsing paraphrases, so convergence is not independent evidence`;
  } else if (!winnerTraceable) {
    level = "Medium";
    why = `${distinctCandidates} distinct candidates across ${runs} drafts, but the selected hinge does not match any of them closely enough to trace`;
  } else {
    level = "High";
    why = `${distinctCandidates} distinct candidates across ${runs} drafts and the selected hinge is one of them`;
  }

  const claimNote =
    modelClaim && modelClaim !== level
      ? ` Pass 2 rated its own agreement ${modelClaim}; this figure is derived from the candidates instead.`
      : "";

  return {
    level,
    distinctCandidates,
    rawCandidates: pool.length,
    paraphraseGroups,
    winnerTraceable,
    reason: `Agreement ${level}: ${why}.${claimNote}`,
    limits,
  };
}
