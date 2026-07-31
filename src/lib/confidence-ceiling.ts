/**
 * E20 / N5 — input adequacy caps the confidence the report may claim.
 *
 * The dogfood corpus found Confidence "Very High" on a STANDARD run (one Pass 1
 * draft) over an idea that never stated a revenue mechanism, while the hinge the
 * engine picked was an economic one. Nothing in the engine connected "how much
 * discriminating context did we actually get" to "how sure are we allowed to
 * sound" — `E19` measures the first (`scoreInputAdequacy`) but only warns.
 *
 * This module closes that: given the measured adequacy and the hinge text, it
 * returns the highest confidence the report is entitled to. Three rules, and the
 * lowest ceiling wins:
 *
 *   1. thin input (<2 of 5 dimensions)          → at most Medium
 *   2. no pricing/revenue signal in the input,
 *      but the hinge is an economic one         → at most Medium
 *   3. not rich (<4 of 5 dimensions)            → at most High (blocks Very High)
 *
 * Rule 2 is the one the dogfood evidence actually demands: a hinge about price,
 * margin, or take rate resting on an idea that never mentioned money is a hinge
 * about an assumption the engine supplied itself.
 *
 * DELIBERATE LIMITS. This is pipeline post-processing, not a prompt change: the
 * model still argues for whatever confidence it wants and we lower it, which
 * means the model's stated `confidence_reason` can read more sure than the badge
 * — so the cap appends its own sentence rather than replacing the reason. The
 * economic-hinge test is keyword-based and coarse in both directions, exactly
 * like the adequacy scorer it partners with. Analysis MODE is deliberately not
 * an input here: E20 is scoped to input adequacy, and a "Very High needs Deep"
 * rule would be a separate, arguable policy.
 */

import type { InputAdequacy } from "@/lib/input-validation";

export type ConfidenceLevel = "Low" | "Medium" | "High" | "Very High";

const ORDER: ConfidenceLevel[] = ["Low", "Medium", "High", "Very High"];

function rank(level: ConfidenceLevel): number {
  const i = ORDER.indexOf(level);
  return i === -1 ? ORDER.length - 1 : i; // unknown string: assume the worst
}

/** Money-mechanism stems only. Bare "cost" is excluded on purpose — it fires on
 * almost every failure analysis and would make the rule meaningless. */
const ECONOMIC_HINGE = new RegExp(
  [
    "pricing|priced?|margins?|unit economics|take[- ]?rate|commission|fees?",
    "revenue|monetis|monetiz|billing|arpu|cac|ltv|willingness to pay|wtp",
    "subscription|paywall|cost floor|marginal cost|gross margin|discount",
    "harga|margin|pendapatan|monetisasi|tarif|komisi|langganan|potongan|berbayar",
  ].join("|"),
  "i",
);

/** Does this hinge turn on money? Coarse by design; see module header. */
export function isEconomicHinge(spofText: string): boolean {
  return ECONOMIC_HINGE.test(spofText);
}

export type CeilingRule =
  | "none"
  | "thin-input"
  | "economic-hinge-without-pricing"
  | "not-rich-input";

export type CeilingDecision = {
  /** Highest confidence this report is entitled to claim. */
  ceiling: ConfidenceLevel;
  /** True when the model asked for more than the ceiling allows. */
  applied: boolean;
  from: ConfidenceLevel;
  to: ConfidenceLevel;
  rule: CeilingRule;
};

/** Pure decision — no mutation, no I/O. The pipeline applies the result. */
export function decideConfidenceCeiling(params: {
  confidence: ConfidenceLevel;
  /** SPOF component + explanation, so the economic test sees the mechanism. */
  spofText: string;
  adequacy: InputAdequacy;
}): CeilingDecision {
  const { confidence, spofText, adequacy } = params;
  const hasPricing = adequacy.dimensions.includes("pricing");

  const candidates: { ceiling: ConfidenceLevel; rule: CeilingRule }[] = [];
  if (adequacy.band === "thin") {
    candidates.push({ ceiling: "Medium", rule: "thin-input" });
  }
  if (!hasPricing && isEconomicHinge(spofText)) {
    candidates.push({ ceiling: "Medium", rule: "economic-hinge-without-pricing" });
  }
  if (adequacy.band !== "rich") {
    candidates.push({ ceiling: "High", rule: "not-rich-input" });
  }

  // Lowest ceiling wins; on a tie the earlier (more specific) rule is reported.
  let best: { ceiling: ConfidenceLevel; rule: CeilingRule } = {
    ceiling: "Very High",
    rule: "none",
  };
  for (const c of candidates) {
    if (rank(c.ceiling) < rank(best.ceiling)) best = c;
  }

  const applied = rank(confidence) > rank(best.ceiling);
  return {
    ceiling: best.ceiling,
    applied,
    from: confidence,
    to: applied ? best.ceiling : confidence,
    rule: applied ? best.rule : "none",
  };
}

/** One plain-language sentence for `confidence_reason` and the warning list. */
export function ceilingDisclosure(
  decision: CeilingDecision,
  locale: "en" | "id",
): string {
  const { from, to, rule } = decision;
  if (locale === "id") {
    const why =
      rule === "thin-input"
        ? "ide ini memberi sedikit detail pembeda"
        : rule === "economic-hinge-without-pricing"
          ? "hinge ini bertumpu pada mekanisme harga/pendapatan yang tidak disebut di ide"
          : "ide ini belum cukup kaya detail untuk keyakinan tertinggi";
    return `Keyakinan diturunkan dari ${from} ke ${to} karena ${why}.`;
  }
  const why =
    rule === "thin-input"
      ? "this idea gave the engine little distinguishing detail"
      : rule === "economic-hinge-without-pricing"
        ? "this hinge rests on a pricing or revenue mechanism the idea never states"
        : "this idea is not detailed enough to support the highest confidence";
  return `Confidence lowered from ${from} to ${to} because ${why}.`;
}
