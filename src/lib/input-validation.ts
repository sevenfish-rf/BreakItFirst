import { CATEGORIES, MIN_IDEA_LENGTH, type Category } from "@/lib/categories";

export const MAX_IDEA_LENGTH = 8000;
export const MAX_MODEL_ID_LENGTH = 200;
export const MAX_BASE_URL_LENGTH = 500;

/** Neutral copy per spec §14 — never reveal injection detection. */
export const NEUTRAL_IDEA_MESSAGE =
  "Please describe your idea in more detail.";

export type IdeaValidation =
  | { ok: true; idea: string; category: Category }
  | { ok: false; message: string; code: "too_short" | "too_long" | "invalid_category" | "not_analyzable" };

/**
 * Heuristic prompt-injection / non-idea signals.
 * Used only to short-circuit before paying for LLM calls.
 * Never surface these patterns to the user.
 */
const SUSPICIOUS_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior|above)/i,
  /you\s+are\s+now\s+(dan|jailbroken|unrestricted)/i,
  /system\s*prompt\s*:/i,
  /\bdo\s+not\s+follow\s+(your|the)\s+(system|original)\b/i,
  /\boverride\s+(your|the)\s+(rules|guardrails|safety)\b/i,
  /<\/?\s*system\s*>/i,
  /\bBEGIN\s+SYSTEM\b/i,
  /\bNEW\s+INSTRUCTIONS\s*:/i,
  /\bact\s+as\s+if\s+you\s+have\s+no\s+restrictions\b/i,
];

function uniqueCharCount(text: string): number {
  const cleaned = text.replace(/\s+/g, "");
  if (cleaned.length === 0) return 0;
  return new Set(cleaned).size;
}

/**
 * Detect spam / keyboard-mashing — NOT long legitimate product writeups.
 *
 * BUG FIX: previously used uniqueChars/length < 0.08, which false-positives on
 * any long English/Indonesian text (alphabet size is bounded, so the ratio
 * shrinks as length grows — heavy templates at ~1200 chars hit ~0.05–0.06).
 */
function isMostlyRepeated(text: string): boolean {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length < MIN_IDEA_LENGTH) return false;

  // Same word repeated many times ("foo foo foo …")
  const words = collapsed.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 8) {
    const counts = new Map<string, number>();
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
    const max = Math.max(...counts.values());
    if (max / words.length >= 0.6) return true;
  }

  const unique = uniqueCharCount(collapsed);
  const cleanedLen = collapsed.replace(/\s+/g, "").length;

  // Short blob of near-identical glyphs: "aaaaaaaaaaaa…" / "asdfasdf"
  if (cleanedLen >= 40 && cleanedLen <= 160 && unique <= 6) {
    return true;
  }

  // Long text with almost no character variety (still spam, not a real idea)
  if (cleanedLen > 160 && unique < 12) {
    return true;
  }

  return false;
}

function looksLikeInjection(text: string): boolean {
  if (SUSPICIOUS_PATTERNS.some((re) => re.test(text))) return true;

  // Nested fake instruction tags around empty product description
  const tagHits =
    (text.match(/<\/?(?:idea|system|assistant|user|instructions?)>/gi) ?? [])
      .length;
  if (tagHits >= 4) return true;

  return false;
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

/**
 * Validate idea + category before any provider call.
 * @param options.verbose — client-side: clearer messages (never leak injection heuristics)
 */
export function validateAnalyzeInput(
  params: {
    idea: unknown;
    category: unknown;
  },
  options?: { verbose?: boolean },
): IdeaValidation {
  const verbose = Boolean(options?.verbose);
  const idea = typeof params.idea === "string" ? params.idea.trim() : "";
  const category =
    typeof params.category === "string" ? params.category.trim() : "";

  if (!idea) {
    return {
      ok: false,
      message: verbose
        ? "Idea is empty — pick a template or paste your idea first."
        : NEUTRAL_IDEA_MESSAGE,
      code: "too_short",
    };
  }

  if (idea.length < MIN_IDEA_LENGTH) {
    return {
      ok: false,
      message: verbose
        ? `Idea is too short (${idea.length}/${MIN_IDEA_LENGTH} chars). Add more detail or pick a template.`
        : NEUTRAL_IDEA_MESSAGE,
      code: "too_short",
    };
  }

  if (idea.length > MAX_IDEA_LENGTH) {
    return {
      ok: false,
      message: `Idea is too long. Please shorten it under ${MAX_IDEA_LENGTH} characters.`,
      code: "too_long",
    };
  }

  // Control characters except common whitespace
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(idea)) {
    return { ok: false, message: NEUTRAL_IDEA_MESSAGE, code: "not_analyzable" };
  }

  if (!isCategory(category)) {
    return {
      ok: false,
      message: "Please select a valid category.",
      code: "invalid_category",
    };
  }

  if (isMostlyRepeated(idea) || looksLikeInjection(idea)) {
    return { ok: false, message: NEUTRAL_IDEA_MESSAGE, code: "not_analyzable" };
  }

  // Require at least a few distinct words so "aaaa aaa aaa…" style fails earlier
  // Split on any unicode whitespace; strip light punctuation so "rules." still counts
  const words = idea
    .split(/\s+/u)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter((w) => w.length >= 2);
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
  if (uniqueWords.size < 5) {
    return {
      ok: false,
      message: verbose
        ? `Need at least 5 different words (found ${uniqueWords.size}). Pick a template or write a fuller description.`
        : NEUTRAL_IDEA_MESSAGE,
      code: "too_short",
    };
  }

  return { ok: true, idea, category };
}

/**
 * K4 / E19 — input adequacy (ADVISORY, never gating).
 *
 * Assumption #1 in every golden analysis is "the idea carries enough
 * discriminating context to support a load-bearing hinge", yet nothing measured
 * it. A thin, generic idea still yields a confident single-point-of-failure, and
 * the wobble that produces is exactly the fixture-01-class bistability the
 * stability harness now labels `swap`. This scorer measures that context and
 * lets the pipeline *disclose* thinness — it does NOT reject (the length /
 * repetition / injection gates in `validateAnalyzeInput` keep their reject power).
 *
 * The score is deliberately coarse: a heuristic keyword/regex signal can mislabel
 * an oddly-phrased rich idea as thin, or a number-dropping vague idea as rich.
 * Coarse bands + logged `dimensions` keep it honest and debuggable rather than
 * pretending to a precision it does not have. Each dimension counts once; the
 * stems are kept small on purpose — a stem that fires on everything makes the
 * score meaningless.
 */
export type InputAdequacyBand = "thin" | "adequate" | "rich";

export type InputAdequacy = {
  /** 0–5 — count of distinct discriminating dimensions present. */
  score: number;
  /** Which of the 5 dimensions fired, for debugging / eval correlation. */
  dimensions: string[];
  /** <2 thin · 2–3 adequate · >=4 rich. */
  band: InputAdequacyBand;
};

/** Each dimension: fires once if ANY of its signals is present in the idea. */
const ADEQUACY_DIMENSIONS: { name: string; test: (raw: string, lower: string) => boolean }[] = [
  {
    // quantities: digits, %, currency, time spans, thresholds
    name: "quantities",
    test: (raw) =>
      /\d/.test(raw) ||
      /[%$]|\bRp\b|\brp\b/.test(raw) ||
      /\b(net-?\d+|\d+\s*-?\s*(day|week|month|year|hari|minggu|bulan|tahun))\b/i.test(raw),
  },
  {
    // pricing / revenue mechanism
    name: "pricing",
    test: (_raw, lower) =>
      /\b(fee|commission|take[- ]?rate|subscription|subscribe|revenue|pricing|charge|markup|per\s+\w+)\b/.test(
        lower,
      ) ||
      /\b(biaya|komisi|langganan|pendapatan|tarif|harga|potongan)\b/.test(lower),
  },
  {
    // named actors / roles (EN + ID role nouns, or ≥2 mid-sentence proper nouns)
    name: "actors",
    test: (raw, lower) =>
      /\b(owners?|sitters?|neighbou?rs?|providers?|admins?|hosts?|guests?|drivers?|riders?|sellers?|buyers?|merchants?|tenants?|landlords?|patients?|doctors?|students?|teachers?|vendors?|couriers?|customers?|users?|clients?)\b/.test(
        lower,
      ) ||
      /\b(pemilik|penjual|pembeli|penyewa|pengguna|pelanggan|mitra|penyedia|pengemudi|pengelola|tetangga)\b/.test(
        lower,
      ) ||
      ((raw.match(/(?<=\w[ ,])[A-Z][a-z]{2,}/g) ?? []).length >= 2),
  },
  {
    // operational constraints / scope
    name: "constraints",
    test: (_raw, lower) =>
      /\b(only|no\s+\w+|without|launch|requires?|must|waive[ds]?|limit(?:ed|s)?|cap(?:ped|s)?|excludes?|geograph|region|city|market|beta|mvp)\b/.test(
        lower,
      ) ||
      /\b(hanya|belum|tanpa|wajib|harus|batas|kecuali|khusus|wilayah|kota|pasar)\b/.test(lower),
  },
  {
    // positioning / competitor
    name: "positioning",
    test: (_raw, lower) =>
      /\b(vs\.?|versus|unlike|instead\s+of|compared?\s+to|competitors?|incumbents?|rival|alternative\s+to)\b/.test(
        lower,
      ) ||
      /\b(dibanding(?:kan)?|alih-?alih|pesaing|kompetitor|ketimbang|saingan)\b/.test(lower),
  },
];

/**
 * Score discriminating context in an idea. Pure, no I/O — exported for reuse by
 * the eval harness. `locale` is accepted for symmetry with the rest of the
 * pipeline but the signal sets are already bilingual, so it is not currently
 * needed to compute the score.
 */
export function scoreInputAdequacy(
  idea: string,
  _locale?: "en" | "id",
): InputAdequacy {
  void _locale; // accepted for pipeline symmetry; signals are already bilingual
  const raw = idea ?? "";
  const lower = raw.toLowerCase();
  const dimensions = ADEQUACY_DIMENSIONS.filter((d) => d.test(raw, lower)).map(
    (d) => d.name,
  );
  const score = dimensions.length;
  const band: InputAdequacyBand = score < 2 ? "thin" : score < 4 ? "adequate" : "rich";
  return { score, dimensions, band };
}

export function validateProviderFields(params: {
  baseUrl: unknown;
  pass1Model: unknown;
  pass2Model: unknown;
  apiKey?: unknown;
}):
  | {
      ok: true;
      baseUrl: string;
      pass1Model: string;
      pass2Model: string;
      apiKey: string;
    }
  | { ok: false; message: string } {
  const baseUrl =
    typeof params.baseUrl === "string" ? params.baseUrl.trim() : "";
  const pass1Model =
    typeof params.pass1Model === "string" ? params.pass1Model.trim() : "";
  const pass2Model =
    typeof params.pass2Model === "string" ? params.pass2Model.trim() : "";
  const apiKey =
    typeof params.apiKey === "string" ? params.apiKey.trim() : "";

  if (!baseUrl || baseUrl.length > MAX_BASE_URL_LENGTH) {
    return {
      ok: false,
      message: "Configure a valid provider base URL before analyzing.",
    };
  }

  if (
    !pass1Model ||
    !pass2Model ||
    pass1Model.length > MAX_MODEL_ID_LENGTH ||
    pass2Model.length > MAX_MODEL_ID_LENGTH
  ) {
    return {
      ok: false,
      message: "Configure both Pass 1 and Pass 2 model ids before analyzing.",
    };
  }

  if (apiKey.length > 4096) {
    return { ok: false, message: "API key is too long." };
  }

  return { ok: true, baseUrl, pass1Model, pass2Model, apiKey };
}
