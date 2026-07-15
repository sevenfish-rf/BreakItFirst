export const CATEGORIES = [
  "Startup",
  "Business",
  "Software App",
  "API",
  "SaaS",
  "Mobile App",
  "AI Product",
  "Game",
  "Marketplace",
  "Hardware",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Injected into Pass 1 prompts — used from Phase 2 onward. */
export const CATEGORY_LENSES: Record<Category, string> = {
  Startup:
    "Unit economics, market timing, trust, distribution/CAC, supply-demand balance, regulatory exposure.",
  Business:
    "Unit economics, market timing, trust, distribution/CAC, supply-demand balance, regulatory exposure.",
  "Software App":
    "Onboarding friction, retention, platform dependency, technical debt, monetization fit, competitive moat.",
  API: "Rate limits, breaking changes/versioning, auth & abuse, latency/uptime SLAs, docs & developer experience, usage-based pricing sustainability.",
  SaaS: "Churn, onboarding friction, feature bloat, pricing-tier mismatch, integration/vendor lock-in, expansion revenue dependency.",
  "Mobile App":
    "Platform policy risk (App Store/Play Store), retention curve (D1/D7/D30), notification fatigue, OS update breakage, monetization model fit (ads vs IAP vs subscription).",
  "AI Product":
    "Quality ceiling/hallucination exposure, inference cost at scale, model-provider dependency, data/privacy handling, trust erosion after visible failures.",
  Game: "Retention loops, matchmaking/balance, monetization backlash, cheating/toxicity moderation, live-ops burnout.",
  Marketplace:
    "Chicken-and-egg supply/demand bootstrapping, trust & safety, take-rate resistance, disintermediation risk.",
  Hardware:
    "Supply chain fragility, unit economics/margins, defect/return rates, certification & regulatory lead time, manufacturing scale-up.",
  Other:
    "No fixed lens — infer the 3–4 most relevant failure dimensions for this idea before analyzing.",
};

export const EXAMPLE_CHIPS = [
  { label: "Airbnb for pets", category: "Marketplace" as Category },
  { label: "Discord clone", category: "Software App" as Category },
  { label: "AI therapist", category: "AI Product" as Category },
  { label: "Crypto wallet", category: "Software App" as Category },
  { label: "Restaurant booking app", category: "Mobile App" as Category },
  { label: "Fitness tracker", category: "Hardware" as Category },
] as const;

export const MIN_IDEA_LENGTH = 40;
