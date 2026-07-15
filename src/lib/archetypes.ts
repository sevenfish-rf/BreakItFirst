/**
 * C.1 Failure Archetype Library — static knowledge layer (masterplan).
 *
 * Injected into Pass 1 as a lens checklist, NOT a substitute for idea-specific
 * reasoning. C.4 (stress test) will reuse these ids later.
 */

export type FailureArchetype = {
  /** Stable id for future stress-test scoring */
  id: string;
  /** Short English label (schema/knowledge; prose locale separate) */
  name: string;
  /** One-line mechanism */
  mechanism: string;
  /** What tends to break first when this pattern applies */
  breaks_first: string;
  /** Typical domains where this shows up */
  common_in: string[];
};

/**
 * Curated 8 archetypes (within masterplan 5–10).
 * Taxonomy is manual seed — not model-generated.
 */
export const FAILURE_ARCHETYPES: readonly FailureArchetype[] = [
  {
    id: "cold_start_chicken_egg",
    name: "Cold-start / chicken-egg",
    mechanism:
      "Neither side of a two-sided (or multi-sided) market has value until the other side is dense enough; bootstrapping fails before network effects kick in.",
    breaks_first: "Liquidity / density in a local segment or cohort",
    common_in: ["Marketplace", "Social", "Platform"],
  },
  {
    id: "unit_economics_death_spiral",
    name: "Unit economics death spiral",
    mechanism:
      "Contribution margin per unit is negative or collapses under realistic CAC, refunds, support, or infrastructure cost; growth amplifies losses.",
    breaks_first: "Gross margin after variable costs",
    common_in: ["Startup", "SaaS", "API", "Hardware", "Marketplace"],
  },
  {
    id: "trust_erosion",
    name: "Trust erosion cascade",
    mechanism:
      "One visible safety, quality, or integrity failure destroys willingness to transact; recovery cost exceeds growth capacity.",
    breaks_first: "User or partner willingness to risk the next transaction",
    common_in: ["Marketplace", "Fintech", "AI Product", "Healthcare-adjacent"],
  },
  {
    id: "regulatory_kill",
    name: "Regulatory / policy kill",
    mechanism:
      "Legal, licensing, or platform-policy constraints make the core loop illegal, uninsurable, or unshippable in target markets.",
    breaks_first: "Permission to operate or distribute the core activity",
    common_in: ["Fintech", "Health", "AI Product", "Mobile App", "Hardware"],
  },
  {
    id: "model_quality_ceiling",
    name: "Model / quality ceiling",
    mechanism:
      "Core value depends on automated quality (model, ranking, matching) that plateaus below user tolerance; more usage exposes more failure modes.",
    breaks_first: "Perceived output reliability under real distribution",
    common_in: ["AI Product", "SaaS", "Search/ranking products"],
  },
  {
    id: "vendor_lock_in",
    name: "Vendor / provider lock-in",
    mechanism:
      "Critical capability is rented from a single upstream provider; price, ToS, outage, or deprecation of that provider kneecaps the product.",
    breaks_first: "Dependency that cannot be swapped without rewrite or margin shock",
    common_in: ["AI Product", "API", "SaaS", "Mobile App"],
  },
  {
    id: "distribution_moat_erosion",
    name: "Distribution moat erosion",
    mechanism:
      "Acquisition depends on a channel (SEO, app store, marketplace listing, viral loop) that competitors can copy or platforms can throttle.",
    breaks_first: "Cheap, repeatable access to new users",
    common_in: ["Mobile App", "SaaS", "Content", "Marketplace"],
  },
  {
    id: "abuse_fraud_spiral",
    name: "Abuse / fraud spiral",
    mechanism:
      "Attackers or bad actors extract more value than legitimate users; defenses raise friction and kill conversion while losses keep rising.",
    breaks_first: "Integrity of keys, listings, payments, or free tiers",
    common_in: ["API", "Marketplace", "Fintech", "Games"],
  },
] as const;

export type ArchetypeId = (typeof FAILURE_ARCHETYPES)[number]["id"];

/** Compact block for Pass 1 system/user injection. */
export function formatArchetypeKnowledgeBlock(): string {
  const lines = FAILURE_ARCHETYPES.map((a, i) => {
    return `${i + 1}. [${a.id}] ${a.name}
   Mechanism: ${a.mechanism}
   Often breaks first: ${a.breaks_first}
   Common in: ${a.common_in.join(", ")}`;
  });

  return `FAILURE ARCHETYPE LIBRARY (knowledge layer — not a template):
Use these ONLY as candidate lenses. For THIS idea:
- Consider which archetypes (if any) actually fit the business model, tech, and constraints described.
- Do NOT force-fit an archetype. If none fit cleanly, reason from first principles.
- Do NOT list archetypes as the report. Name the concrete mechanism in THIS idea's terms.
- Prefer one primary failure spine (SPOF + cascade) over sprinkling every archetype.
- If an archetype fits, ground it in details from the user's idea (pricing, sides of market, deps, regs).

${lines.join("\n\n")}`;
}
