/**
 * Hinge label comparison for the Q10 stability harness.
 *
 * The question the harness exists to answer is "did the hinge move when only the
 * wording moved?", and until now a human answered it by reading two SPOF
 * explanations. That does not survive an unattended run, so this module produces
 * a *machine screen*: it maps each SPOF onto the theme vocabulary in
 * `eval/theme-keywords.json` and compares themes, not strings.
 *
 * What that buys: "OEM-owned firmware" and "vendor firmware dependency" both map
 * to `supply chain`, so two phrasings of one hinge come out `same`, where a
 * string diff would call them different.
 *
 * What it does NOT buy: a theme is coarser than a hinge. Two genuinely different
 * mechanisms inside one theme (returns cost vs component cost — both `margins`)
 * also come out `same`. So read `same` as "no drift detected", never as
 * "confirmed identical", and read the prose for pairs that carry a decision. The
 * verdict lands in the report as an overridable default, not as a finding.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEYWORDS_FILE = path.join(__dirname, "theme-keywords.json");

export type ThemeKeywords = Record<string, string[]>;

export async function loadThemeKeywords(): Promise<ThemeKeywords> {
  const parsed = JSON.parse(await readFile(KEYWORDS_FILE, "utf8")) as Record<
    string,
    unknown
  >;
  const out: ThemeKeywords = {};
  for (const [theme, value] of Object.entries(parsed)) {
    if (theme.startsWith("_")) continue; // `_readme`
    if (Array.isArray(value)) out[theme] = value.map((v) => String(v).toLowerCase());
  }
  return out;
}

export type ThemeMatch = { theme: string; hits: number };

/**
 * Themes whose stems appear in `text`, strongest first. Matched against every
 * theme in the vocabulary — not only the ones a fixture expects — because a
 * hinge that drifts somewhere off-list is exactly the drift worth catching.
 */
export function matchThemes(text: string, keywords: ThemeKeywords): ThemeMatch[] {
  const haystack = text.toLowerCase();
  const matches: ThemeMatch[] = [];
  for (const [theme, stems] of Object.entries(keywords)) {
    let hits = 0;
    for (const stem of stems) if (haystack.includes(stem)) hits += 1;
    if (hits > 0) matches.push({ theme, hits });
  }
  return matches.sort((a, b) => b.hits - a.hits || a.theme.localeCompare(b.theme));
}

const STOPWORDS = new Set([
  "that", "this", "with", "from", "have", "will", "when", "then", "than",
  "into", "over", "your", "they", "them", "their", "there", "which", "while",
  "because", "about", "would", "could", "should", "being", "been", "does",
  "each", "more", "most", "other", "some", "such", "only", "same", "also",
  "very", "much", "many", "before", "after", "cannot", "without",
]);

function contentTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((t) => t.length >= 4 && !STOPWORDS.has(t)),
  );
}

/** Jaccard over content words. Reported as context, never as the verdict. */
export function tokenOverlap(a: string, b: string): number {
  const sa = contentTokens(a);
  const sb = contentTokens(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let shared = 0;
  for (const t of sa) if (sb.has(t)) shared += 1;
  return shared / (sa.size + sb.size - shared);
}

export type HingeVerdict = "same" | "partial" | "shift" | "unmatched";

export type HingeSide = {
  /** SPOF component plus its explanation — the explanation carries the mechanism. */
  text: string;
  matches: ThemeMatch[];
  primary: string | null;
  /** Whether `primary` is one of the fixture's expected_spof_themes. */
  primary_expected: boolean;
};

export function describeSide(
  text: string,
  expectedThemes: string[],
  keywords: ThemeKeywords,
): HingeSide {
  const matches = matchThemes(text, keywords);
  const primary = matches[0]?.theme ?? null;
  return {
    text,
    matches,
    primary,
    primary_expected: primary !== null && expectedThemes.includes(primary),
  };
}

export type HingeComparison = {
  verdict: HingeVerdict;
  /** Why the verdict came out that way, in one clause, for the report. */
  reason: string;
  shared_themes: string[];
  base_only: string[];
  variant_only: string[];
  token_overlap: number;
};

/**
 * `same`      — both sides land on the same strongest theme.
 * `partial`   — strongest themes differ but the theme sets still intersect.
 * `shift`     — theme sets are disjoint. This is the drift signal.
 * `unmatched` — one side matched no theme at all; the screen abstains.
 */
export function compareHinge(base: HingeSide, variant: HingeSide): HingeComparison {
  const baseThemes = base.matches.map((m) => m.theme);
  const variantThemes = variant.matches.map((m) => m.theme);
  const shared = baseThemes.filter((t) => variantThemes.includes(t));
  const comparison = {
    shared_themes: shared,
    base_only: baseThemes.filter((t) => !variantThemes.includes(t)),
    variant_only: variantThemes.filter((t) => !baseThemes.includes(t)),
    token_overlap: Number(tokenOverlap(base.text, variant.text).toFixed(3)),
  };

  if (!base.primary || !variant.primary) {
    const which = !base.primary && !variant.primary ? "neither side" : !base.primary ? "the original" : "the variant";
    return {
      ...comparison,
      verdict: "unmatched",
      reason: `${which} matched any theme stem — judge this pair by hand`,
    };
  }
  if (base.primary === variant.primary) {
    return {
      ...comparison,
      verdict: "same",
      reason: `both land on \`${base.primary}\``,
    };
  }
  if (shared.length > 0) {
    return {
      ...comparison,
      verdict: "partial",
      reason: `strongest theme moved \`${base.primary}\` → \`${variant.primary}\`, sets still share ${shared.map((t) => `\`${t}\``).join(", ")}`,
    };
  }
  return {
    ...comparison,
    verdict: "shift",
    reason: `disjoint themes: \`${base.primary}\` → \`${variant.primary}\``,
  };
}
