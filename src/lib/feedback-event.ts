/**
 * S6/N6 — the anonymous SPOF feedback event, shared by browser and server.
 *
 * Dogfood N6 asks one question under the hinge ("is this the hinge?") and needs
 * the answer to be recordable WITHOUT reversing the product's storage decision
 * (`01-product.md` §6: no permanent DB, no account). So the event carries no
 * idea text, no identity, and no session id — only two one-way hashes computed
 * IN THE BROWSER, the two run knobs that change calibration (locale, mode), the
 * coarse category, and an optional short correction the user typed on purpose.
 *
 * WHAT THE HASHES DO AND DO NOT BUY. `idea_hash`/`spof_hash` are SHA-256 over
 * normalized text, truncated to 16 hex chars. They let a verdict be JOINED
 * against a report you already hold (our own golden fixtures hash to known
 * values, so eval runs can be scored), and they let repeat votes on the same
 * hinge be grouped. They do NOT anonymize the text against someone who already
 * has a candidate string — a hash is a fingerprint, and a guessed idea can be
 * confirmed by hashing it. That is acceptable here precisely because we never
 * transmit or store the text itself; it is not acceptable as a privacy claim,
 * so nothing in the UI may call this "encrypted".
 *
 * Everything here is pure. No fs, no Next, no provider — importable from a
 * client component and from the route handler.
 */

/** Bumped only when the on-disk record shape changes incompatibly. */
export const FEEDBACK_EVENT_VERSION = 1;

/**
 * The three answers from dogfood N6, in the order the UI shows them:
 *   confirmed    — "Ya" → the hinge landed (rubric P1: "belum kepikiran")
 *   wrong_hinge  — "Bukan yang ini" → K1 evidence, cascade step 5
 *   already_knew — "Sudah saya tahu" → E2 failure: true but not new
 */
export const FEEDBACK_VERDICTS = ["confirmed", "wrong_hinge", "already_knew"] as const;
export type FeedbackVerdict = (typeof FEEDBACK_VERDICTS)[number];

/** The one free-text field. Short on purpose: a label, not an essay. */
export const ALT_HINGE_MAX_CHARS = 240;
/** Truncated SHA-256 length. 64 bits — enough to group, not a database key. */
export const FEEDBACK_HASH_CHARS = 16;
/** Category is a coarse bucket; cap it so a hand-crafted body cannot grow it. */
export const CATEGORY_MAX_CHARS = 40;

const HASH_RE = /^[0-9a-f]+$/;
/**
 * Control (Cc), format (Cf — soft hyphen, zero-width, bidi marks, BOM) and the
 * line/paragraph separators. Unicode property escapes, not a literal range: a
 * raw control character inside a regex literal is exactly the kind of invisible
 * damage this project has a whole detector for (`src/lib/input-damage.ts`).
 */
const INVISIBLE_RE = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;

export type FeedbackEvent = {
  v: number;
  verdict: FeedbackVerdict;
  spof_hash: string;
  idea_hash: string;
  locale: "en" | "id";
  mode: "standard" | "deep";
  /** `meta.category` of the report, or null when the report predates it. */
  category: string | null;
  /** Only present when the user actually typed a correction. */
  alt_hinge: string | null;
  /** Server clock, ISO 8601. Never the client's — clocks lie and drift. */
  ts: string;
};

/** What the browser POSTs. Same fields minus the server-owned ones. */
export type FeedbackSubmission = Omit<FeedbackEvent, "v" | "ts">;

/**
 * Normalization before hashing: collapse whitespace, trim, lowercase. This is
 * what makes a hash survive a copy-paste that changed only wrapping — the same
 * reason `eval/input-integrity.ts` exists is the reason we cannot assume the
 * text arrives byte-identical twice.
 */
export function normalizeForHash(text: string): string {
  return text.replace(/\s+/gu, " ").trim().toLowerCase();
}

/**
 * SHA-256 → truncated hex, via Web Crypto so the same function runs in the
 * browser and in Node 18+. Async because `crypto.subtle` is.
 */
export async function hashFeedbackText(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalizeForHash(text));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, FEEDBACK_HASH_CHARS);
}

/** Strip control/invisible characters, collapse runs, trim, hard-cap. */
export function sanitizeAltHinge(raw: string): string {
  return raw
    .replace(INVISIBLE_RE, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, ALT_HINGE_MAX_CHARS);
}

function asHash(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v.length !== FEEDBACK_HASH_CHARS || !HASH_RE.test(v)) return null;
  return v;
}

export type ParseResult =
  | { ok: true; event: FeedbackEvent }
  | { ok: false; message: string };

/**
 * Strict server-side validation. Unknown fields are ignored rather than
 * rejected (a newer client must not 400 against an older server), but every
 * field we DO keep is re-derived here — nothing reaches disk unchecked.
 */
export function parseFeedbackEvent(input: unknown, now = new Date()): ParseResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, message: "Expected a JSON object." };
  }
  const body = input as Record<string, unknown>;

  const verdict = FEEDBACK_VERDICTS.find((v) => v === body.verdict);
  if (!verdict) {
    return {
      ok: false,
      message: `verdict must be one of ${FEEDBACK_VERDICTS.join(", ")}.`,
    };
  }

  const spofHash = asHash(body.spof_hash);
  const ideaHash = asHash(body.idea_hash);
  if (!spofHash || !ideaHash) {
    return {
      ok: false,
      message: `spof_hash and idea_hash must each be ${FEEDBACK_HASH_CHARS} hex characters.`,
    };
  }

  const locale = body.locale === "id" ? "id" : body.locale === "en" ? "en" : null;
  if (!locale) return { ok: false, message: "locale must be 'en' or 'id'." };

  const mode =
    body.mode === "deep" ? "deep" : body.mode === "standard" ? "standard" : null;
  if (!mode) return { ok: false, message: "mode must be 'standard' or 'deep'." };

  let category: string | null = null;
  if (typeof body.category === "string") {
    const cleaned = body.category
      .replace(INVISIBLE_RE, "")
      .trim()
      .slice(0, CATEGORY_MAX_CHARS);
    category = cleaned.length > 0 ? cleaned : null;
  }

  let altHinge: string | null = null;
  if (typeof body.alt_hinge === "string") {
    const cleaned = sanitizeAltHinge(body.alt_hinge);
    altHinge = cleaned.length > 0 ? cleaned : null;
  } else if (body.alt_hinge !== undefined && body.alt_hinge !== null) {
    return { ok: false, message: "alt_hinge must be a string when present." };
  }

  return {
    ok: true,
    event: {
      v: FEEDBACK_EVENT_VERSION,
      verdict,
      spof_hash: spofHash,
      idea_hash: ideaHash,
      locale,
      mode,
      category,
      alt_hinge: altHinge,
      ts: now.toISOString(),
    },
  };
}
