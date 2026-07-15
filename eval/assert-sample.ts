/**
 * Smoke-test regression assertions without calling a provider.
 * npm run eval:assert-sample
 */

import {
  runRegressionAssertions,
  summarizeAssertions,
} from "./assertions";
import type { FailureAnalysis } from "../src/types/analysis";

const sample: FailureAnalysis = {
  meta: {
    idea_input: "Sample marketplace for testing assertions only",
    category: "Marketplace",
    generated_at: new Date().toISOString(),
  },
  summary:
    "A neighborhood pet-sitting marketplace that matches owners with nearby sitters for a 20% take rate without insurance.",
  assumptions: [
    "Owners trust neighbors with pets after ID check only",
    "Enough sitters exist per building to fulfill last-minute demand",
    "Users will not go off-app after the first introduction",
    "Liability waiver is enforceable and sufficient",
    "Jakarta high-rise density produces liquid local markets",
  ],
  single_point_of_failure: {
    component: "Trust cold-start without insurance",
    confidence: "High",
    confidence_reason: "Liability gap blocks both sides of the market",
    explanation:
      "Without insurance, a single pet injury story collapses supply and demand density in the same buildings the product depends on.",
  },
  cascade: {
    nodes: [
      {
        step: "Insurance gap scares early sitters",
        observable_signal: "Sitter applications stall after safety FAQ",
      },
      {
        step: "Supply thin in each building",
        observable_signal: "Median wait time for a match exceeds 2 hours",
      },
      {
        step: "Owners wait too long for match",
        observable_signal: "Booking abandon rate rises in-app",
      },
      {
        step: "Demand churns after failed booking",
        observable_signal: "D7 owner retention drops in cohort charts",
      },
      {
        step: "Sitters leave for low volume",
        observable_signal: "Active sitters per tower fall week over week",
      },
      {
        step: "Density death spiral per tower",
        observable_signal: "More towers show zero completed bookings",
      },
      {
        step: "Take-rate rejected for off-app deals",
        observable_signal: "Support tickets about private WhatsApp handoffs",
      },
      {
        step: "Unit economics fail and shutdown",
        observable_signal: "Gross margin negative after refunds and support",
      },
    ],
  },
  failure_modes: {
    technical: ["ID verification false positives block supply"],
    business: [
      "Chicken-egg density never crosses threshold",
      "Trust cold-start stalls without insurance",
    ],
    security: ["Sitter identity fraud"],
    legal: ["Liability after pet injury without insurance coverage"],
    operations: ["Support cannot mediate disputes at scale"],
  },
  likelihood: {
    band: "High",
    reason: "Trust and density must both work before network effects help",
  },
  resilience_score: {
    technical: 55,
    business: 35,
    legal: 25,
    operations: 40,
    trust: 20,
  },
  stress_test: {
    items: [
      {
        archetype_id: "cold_start_chicken_egg",
        verdict: "Yes",
        reason: "Two-sided density per building is required before value",
      },
      {
        archetype_id: "trust_erosion",
        verdict: "Yes",
        reason: "No insurance means one incident can kill local liquidity",
      },
      {
        archetype_id: "unit_economics_death_spiral",
        verdict: "Maybe",
        reason: "Take-rate may not cover support and refunds at low density",
      },
      {
        archetype_id: "regulatory_kill",
        verdict: "Maybe",
        reason: "Liability waiver may not hold for pet injuries",
      },
      {
        archetype_id: "model_quality_ceiling",
        verdict: "No",
        reason: "Matching is not model-quality dependent in this draft",
      },
      {
        archetype_id: "vendor_lock_in",
        verdict: "No",
        reason: "No single critical upstream AI/vendor dependency stated",
      },
      {
        archetype_id: "distribution_moat_erosion",
        verdict: "Maybe",
        reason: "Building-by-building growth is copyable by local groups",
      },
      {
        archetype_id: "abuse_fraud_spiral",
        verdict: "Maybe",
        reason: "Fake sitters could erode trust without strong verification",
      },
    ],
  },
  failure_velocity: {
    band: "Fast",
    reason:
      "Local density collapses within a few failed booking weeks before habits form",
  },
};

const results = runRegressionAssertions(sample);
const summary = summarizeAssertions(results);

console.log("Assertion results:");
for (const r of results) {
  console.log(`  ${r.pass ? "✓" : "✗"} ${r.id}: ${r.message}`);
}
console.log("\nSummary:", summary);

if (summary.hard_fail > 0) {
  process.exit(1);
}
