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

function uniqueCharRatio(text: string): number {
  const cleaned = text.replace(/\s+/g, "");
  if (cleaned.length === 0) return 0;
  return new Set(cleaned).size / cleaned.length;
}

function isMostlyRepeated(text: string): boolean {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length < MIN_IDEA_LENGTH) return false;

  // Same word repeated many times
  const words = collapsed.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 8) {
    const counts = new Map<string, number>();
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
    const max = Math.max(...counts.values());
    if (max / words.length >= 0.6) return true;
  }

  // Low character diversity (aaaa… / asdf spam)
  if (collapsed.length >= 40 && uniqueCharRatio(collapsed) < 0.08) {
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
 */
export function validateAnalyzeInput(params: {
  idea: unknown;
  category: unknown;
}): IdeaValidation {
  const idea = typeof params.idea === "string" ? params.idea.trim() : "";
  const category =
    typeof params.category === "string" ? params.category.trim() : "";

  if (!idea || idea.length < MIN_IDEA_LENGTH) {
    return { ok: false, message: NEUTRAL_IDEA_MESSAGE, code: "too_short" };
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
  const words = idea.split(/\s+/).filter((w) => w.length >= 2);
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
  if (uniqueWords.size < 5) {
    return { ok: false, message: NEUTRAL_IDEA_MESSAGE, code: "too_short" };
  }

  return { ok: true, idea, category };
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
