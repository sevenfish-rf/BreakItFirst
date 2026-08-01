/**
 * K8 mitigation — pre-submit input review (ADVISORY, never gating).
 *
 * K8 delivered a report whose *idea text was already damaged*: spaces missing at
 * joins, words cut mid-token ("proposalsebelum", "kongevaluasi"), clustered in a
 * region that also carried hard line-wraps present nowhere else in the paste.
 * Two harnesses then ruled out both mechanisms the defect blamed —
 * `eval:input-integrity` proved the server stamp byte-exact (26/26) and
 * `eval:input-repro` measured the browser path clean at 6000 chars across three
 * delivery modes — which leaves the parsimonious explanation that the text was
 * damaged before it ever reached the form. No engine change fixes that. What can
 * help is showing the reader the damage *before* they pay for an analysis.
 *
 * WHAT THIS CANNOT DO — read this first. It reaches only a narrow slice of the
 * exact K8 signature. "proposalsebelum" is a space dropped between two ordinary
 * lowercase words; `glued_known_words` below catches that one because both halves
 * are in a small curated list, but "kongevaluasi" stays invisible — telling a
 * glued fragment from a legitimately long Indonesian word
 * ("mempertanggungjawabkan", 22 chars) needs a real dictionary this module does
 * not have. **A clean review is therefore not evidence that the text is intact.**
 * What it does catch are the shapes a damaged copy/paste usually *also* leaves
 * behind: a capital-letter join, a punctuation join, a hyphen split across a line
 * break, invisible or replacement characters, the 8000-char draft cap, and
 * mid-sentence hard wraps.
 *
 * Advisory by design, exactly like `scoreInputAdequacy` (E19): it returns
 * findings and never rejects. `validateAnalyzeInput` keeps all reject power, and
 * the UI note must never block submit — a heuristic that stops a paid analysis on
 * a false positive is worse than the defect it screens for.
 *
 * Pure and client-safe: no I/O, no logging. Excerpts quote the user's own idea,
 * so they exist to be rendered in that user's own browser — never log them and
 * never send them anywhere.
 */
import { MAX_IDEA_LENGTH } from "@/lib/input-validation";

export type InputDamageKind =
  | "glued_words"
  | "glued_known_words"
  | "long_token"
  | "hyphen_break"
  | "invisible_chars"
  | "replacement_chars"
  | "truncated_tail"
  | "hard_wrap";

/**
 * `likely_damage` — the shape has no ordinary reason to be in prose.
 * `worth_checking` — the shape is legitimate on its own (wrapped text is still
 * complete text) but is the context K8's damage arrived in.
 */
export type InputDamageSeverity = "likely_damage" | "worth_checking";

/** `line` is 1-based; `excerpt` is a whitespace-collapsed window of the idea. */
export type InputDamageSample = {
  line: number;
  excerpt: string;
  /**
   * Language-neutral detail a detector can prove, shown next to the excerpt.
   * Only `glued_known_words` sets it: the split it found (`proposal + sebelum`).
   */
  note?: string;
};

export type InputDamageFinding = {
  kind: InputDamageKind;
  severity: InputDamageSeverity;
  count: number;
  /** At most 3 — enough to point at, not a full listing. */
  samples: InputDamageSample[];
};

export type InputDamageReport = {
  /** `likely_damage` first, then `worth_checking`; each by descending count. */
  findings: InputDamageFinding[];
  suspect: boolean;
};

const EXCERPT_PAD = 22;
const MAX_SAMPLES = 3;

/** 1-based line number of `offset`. */
function lineOf(text: string, offset: number): number {
  let line = 1;
  const stop = Math.min(offset, text.length);
  for (let i = 0; i < stop; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  return line;
}

/** A short window around [start, end) with whitespace collapsed to one space. */
function excerptAt(text: string, start: number, end: number): string {
  const from = Math.max(0, start - EXCERPT_PAD);
  const to = Math.min(text.length, end + EXCERPT_PAD);
  const body = text.slice(from, to).replace(/\s+/g, " ").trim();
  return `${from > 0 ? "…" : ""}${body}${to < text.length ? "…" : ""}`;
}

type Hits = { count: number; samples: InputDamageSample[] };

const EMPTY: Hits = { count: 0, samples: [] };

/**
 * Run one global regex and keep at most MAX_SAMPLES located excerpts.
 * `accept` filters a raw match (used for the false-positive guards below).
 */
function collect(
  text: string,
  re: RegExp,
  accept?: (m: RegExpExecArray) => boolean,
): Hits {
  const samples: InputDamageSample[] = [];
  let count = 0;
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) {
    if (m[0].length === 0) {
      re.lastIndex++;
      continue;
    }
    if (accept && !accept(m)) continue;
    count++;
    if (samples.length < MAX_SAMPLES) {
      samples.push({
        line: lineOf(text, m.index),
        excerpt: excerptAt(text, m.index, m.index + m[0].length),
      });
    }
  }
  return { count, samples };
}

function merge(...hits: Hits[]): Hits {
  const count = hits.reduce((n, h) => n + h.count, 0);
  const samples = hits.flatMap((h) => h.samples).slice(0, MAX_SAMPLES);
  return { count, samples };
}

/**
 * A capital in the middle of a word ("proposalSebelum"). Brand spellings do this
 * legitimately (iPhone, TikTok, YouTube, WhatsApp), so the containing token must
 * be long enough that a brand is an unlikely explanation — 12 chars clears every
 * one of those while still catching two glued words.
 */
const CAMEL_JOIN = /\p{Ll}\p{Lu}\p{Ll}/gu;
const MIN_CAMEL_TOKEN = 12;

/** "proposal.Sebelum" — sentence punctuation with the space eaten. */
const SENTENCE_JOIN = /\p{L}{2,}[.!?]\p{Lu}\p{L}{2,}/gu;
/** "sitters,owners" — clause punctuation with the space eaten. */
const CLAUSE_JOIN = /\p{L}{3,}[,;:]\p{L}{3,}/gu;

/**
 * 24+ letters with no break. The longest words either language plausibly
 * produces are ~22 ("mempertanggungjawabkan"), so this is a token no writer
 * typed on purpose.
 */
const LONG_TOKEN = /\p{L}{24,}/gu;

/** "produk-\ntivitas" — a PDF or column copy split a word at the line break. */
const HYPHEN_BREAK = /\p{Ll}-[ \t]*\n[ \t]*\p{Ll}/gu;

/** Soft hyphen, zero-width joiners, word joiner, BOM. */
const INVISIBLE = /[\u00AD\u200B-\u200D\u2060\uFEFF]/g;

/** U+FFFD plus the two commonest UTF-8-read-as-Latin-1 mojibake prefixes. */
const MOJIBAKE = /\uFFFD|\u00E2\u20AC|\u00C2[\u00A0-\u00BF]/g;

/** A line ending mid-sentence and continuing lowercase on the next line. */
const HARD_WRAP = /\p{L},?[ \t]*\n[ \t]*\p{Ll}/gu;
/** One stray break is normal writing; a wrapped *source* leaves many. */
const HARD_WRAP_MIN = 3;

/** Extent of the letters-only token containing offset `i`. */
function tokenAround(text: string, i: number): { start: number; end: number } {
  const letter = /\p{L}/u;
  let start = i;
  while (start > 0 && letter.test(text[start - 1])) start--;
  let end = i;
  while (end < text.length && letter.test(text[end])) end++;
  return { start, end };
}

/** URLs and emails carry dots and colons legitimately — never a glue finding. */
function looksLikeUrl(text: string, index: number): boolean {
  const window = text.slice(Math.max(0, index - 12), index + 24);
  return window.includes("://") || window.includes("www.") || window.includes("@");
}

/**
 * K8's own signature, as far as a dictionary-free module can reach it.
 *
 * The header above says this file cannot see "proposalsebelum" — a space dropped
 * between two ordinary lowercase words. That was true while every check was a
 * pure shape regex. This detector buys back a *narrow slice* of it with the
 * smallest dictionary that can carry a proof: a long all-lowercase token is
 * reported only when it splits into exactly one pair of words that are BOTH in
 * the curated list below. "proposalsebelum" → `proposal` + `sebelum`.
 *
 * WHAT IT STILL MISSES — the slice is genuinely narrow:
 *   - Either half outside the list. K8's second example, "kongevaluasi", is NOT
 *     caught: `kong` is a fragment of a word, not a word.
 *   - Anything under MIN_GLUED_TOKEN chars ("dataproduk", 10) — the threshold
 *     that keeps ordinary long Indonesian words out.
 *   - Three or more words glued together, which usually leaves no half that is
 *     itself a whole word.
 *   - Two glued words where a second reading also splits cleanly; an ambiguous
 *     token is dropped rather than guessed at.
 * So a clean review is still not evidence the text is intact. The point of this
 * detector is that when it DOES fire it can name the two words, which is a claim
 * the user can check in one glance instead of re-reading 6000 characters.
 */

/**
 * Common standalone words, ID and EN, that a product idea plausibly contains.
 * Deliberately excludes affixes and bound fragments: every entry must be a word
 * a writer would type alone. Indonesian derivation is what makes long single
 * tokens legitimate ("mengembangkan", "pemeliharaan"), and its affixes are 2–3
 * chars ("me-", "peng-", "-kan", "-an", "-nya") — all shorter than MIN_HALF, so
 * an affixed word cannot split into two list entries.
 */
const KNOWN_WORDS = new Set(
  (
    // Indonesian
    "untuk dengan yang tidak akan sudah belum sebelum setelah karena tetapi " +
    "atau juga agar saja harus bisa dapat masih lebih kurang sangat hanya " +
    "semua setiap antara dalam pada dari oleh kepada tanpa sampai hingga " +
    "ketika kalau jika maka orang waktu hari bulan tahun biaya harga uang " +
    "pasar produk layanan jasa aplikasi sistem pengguna pelanggan mitra " +
    "kerja usaha bisnis modal laba rugi risiko masalah solusi tujuan hasil " +
    "proses tahap rencana proposal laporan evaluasi catatan dokumen halaman " +
    "fitur versi tampilan pesan kirim terima bayar langganan daftar akun " +
    "keamanan kualitas jumlah tingkat ukuran pilihan kondisi mereka " +
    "bagian contoh cukup pernah sering jarang mungkin memang bukan " +
    "sendiri tempat pihak tenaga awal akhir baru lama cepat lambat " +
    // English
    "with that this from they will have been when then than into over more " +
    "less most each some only also must need want user users team teams " +
    "data page site time week month year cost costs price plan plans market " +
    "service feature report system before after because without between " +
    "within during about above under first next last sign login signup " +
    "email phone order orders payment billing invoice account access admin " +
    "owner buyer seller vendor client support request response review " +
    "rating search filter upload export import delete update create build " +
    "make send save share track check start stop close open free paid trial " +
    "churn growth revenue profit budget risk issue problem solution goal " +
    "result step stage phase note notes list form field label error message " +
    "alert board card chat call meeting wiki docs file files folder image " +
    "video audio model prompt token cache queue batch event events logs " +
    "trace test tests idea ideas signal number names date week"
  ).split(" "),
);

/**
 * Legitimate words that DO split into two list entries. Every one of these was
 * found by testing, not by guessing — "marketplaces" (`market` + `places`) and
 * "accountability" (`account` + `ability`) are the kind of false positive that
 * would make the whole review untrustworthy on this project's own fixtures.
 */
const SOLID_WORDS = new Set(
  (
    "breakthrough breakthroughs troubleshoot troubleshooting marketplace " +
    "marketplaces stakeholder stakeholders spreadsheet spreadsheets " +
    "placeholder placeholders whiteboard whiteboarding infrastructure " +
    "understanding understandable accountability accountable " +
    "tanggungjawab pertanggungjawaban keberlangsungan sepakbola " +
    "nevertheless notwithstanding timeframes screenshots"
  ).split(" "),
);

/**
 * 12 is the floor that keeps ordinary long words out: "pembayaran" (10),
 * "menggunakan" (11), "terimakasih" (11), "marketplace" (11). 23 is the ceiling
 * because `long_token` already reports 24+ as damage on its own — without the
 * cap the same token would appear twice in the review.
 */
const MIN_GLUED_TOKEN = 12;
const MAX_GLUED_TOKEN = 23;
/** Both halves must be this long; shorter than any real word, and shorter than
 * every Indonesian affix, is where fragments and false splits live. */
const MIN_HALF = 4;

const GLUED_TOKEN = /\p{Ll}+/gu;

/**
 * The non-whitespace run containing offset `i` — a "chunk" is what a reader sees
 * as one thing: a word, but also a URL, a path, an email, a `key=value`.
 */
function chunkAround(text: string, i: number): string {
  let start = i;
  while (start > 0 && !/\s/u.test(text[start - 1])) start--;
  let end = i;
  while (end < text.length && !/\s/u.test(text[end])) end++;
  return text.slice(start, end);
}

/** A URL, path, email or query fragment — its "glued" words are just structure. */
function insideAddress(text: string, i: number): boolean {
  const chunk = chunkAround(text, i);
  return /:\/\/|www\.|@|\/|=|\?|&|\\/u.test(chunk);
}

/** The one split into two known words, or null when there is none or many. */
function splitIntoKnownPair(token: string): [string, string] | null {
  if (KNOWN_WORDS.has(token) || SOLID_WORDS.has(token)) return null;
  let found: [string, string] | null = null;
  for (let k = MIN_HALF; k <= token.length - MIN_HALF; k++) {
    const left = token.slice(0, k);
    const right = token.slice(k);
    if (!KNOWN_WORDS.has(left) || !KNOWN_WORDS.has(right)) continue;
    // A second clean reading means the split is a guess, not a finding.
    if (found) return null;
    found = [left, right];
  }
  return found;
}

function gluedKnownWords(text: string): Hits {
  const letter = /\p{L}/u;
  const samples: InputDamageSample[] = [];
  let count = 0;
  let m: RegExpExecArray | null;
  GLUED_TOKEN.lastIndex = 0;
  while ((m = GLUED_TOKEN.exec(text)) !== null) {
    const token = m[0];
    if (token.length < MIN_GLUED_TOKEN || token.length > MAX_GLUED_TOKEN) continue;
    // A letter on either side means this run is part of a longer token — a camel
    // join, which `glued_words` already owns.
    const before = m.index > 0 ? text[m.index - 1] : "";
    const after = text[m.index + token.length] ?? "";
    if ((before && letter.test(before)) || (after && letter.test(after))) continue;
    if (looksLikeUrl(text, m.index) || insideAddress(text, m.index)) continue;
    const pair = splitIntoKnownPair(token);
    if (!pair) continue;
    count++;
    if (samples.length < MAX_SAMPLES) {
      samples.push({
        line: lineOf(text, m.index),
        excerpt: excerptAt(text, m.index, m.index + token.length),
        note: `${pair[0]} + ${pair[1]}`,
      });
    }
  }
  return { count, samples };
}

/**
 * `draft.ts` caps a stored idea with `idea.slice(0, MAX_IDEA_LENGTH)` — on the
 * RAW string, so compare raw length here: a cut that lands on a space would trim
 * back to 7999 and the cap would go unreported.
 */
function truncatedTail(text: string): Hits {
  if (text.length < MAX_IDEA_LENGTH) return EMPTY;
  const end = text.length;
  return {
    count: 1,
    samples: [
      {
        line: lineOf(text, Math.max(0, end - 1)),
        excerpt: excerptAt(text, Math.max(0, end - 24), end),
      },
    ],
  };
}

/**
 * Screen an idea for copy/paste damage. Pure. Returns findings to *show*, never
 * a reason to block — see the module header for what it cannot see.
 */
export function detectInputDamage(idea: string): InputDamageReport {
  const text = idea ?? "";
  if (!text.trim()) return { findings: [], suspect: false };

  const findings: InputDamageFinding[] = [];
  const add = (
    kind: InputDamageKind,
    severity: InputDamageSeverity,
    hits: Hits,
    minCount = 1,
  ) => {
    if (hits.count >= minCount) {
      findings.push({ kind, severity, count: hits.count, samples: hits.samples });
    }
  };

  add("invisible_chars", "likely_damage", collect(text, INVISIBLE));
  add("replacement_chars", "likely_damage", collect(text, MOJIBAKE));
  add("hyphen_break", "likely_damage", collect(text, HYPHEN_BREAK));
  add(
    "glued_words",
    "likely_damage",
    merge(
      collect(text, CAMEL_JOIN, (m) => {
        const t = tokenAround(text, m.index);
        return t.end - t.start >= MIN_CAMEL_TOKEN;
      }),
      collect(text, SENTENCE_JOIN, (m) => !looksLikeUrl(text, m.index)),
      collect(text, CLAUSE_JOIN, (m) => !looksLikeUrl(text, m.index)),
    ),
  );
  add("glued_known_words", "likely_damage", gluedKnownWords(text));
  add("long_token", "likely_damage", collect(text, LONG_TOKEN));
  add("truncated_tail", "likely_damage", truncatedTail(text));
  add("hard_wrap", "worth_checking", collect(text, HARD_WRAP), HARD_WRAP_MIN);

  const rank = (f: InputDamageFinding) =>
    f.severity === "likely_damage" ? 0 : 1;
  findings.sort((a, b) => rank(a) - rank(b) || b.count - a.count);

  return { findings, suspect: findings.length > 0 };
}


