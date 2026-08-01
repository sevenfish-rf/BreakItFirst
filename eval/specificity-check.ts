/**
 * N1b — name-blind specificity check (closes the first half of K2).
 *
 * K2's complaint is not that the engine is generic. It is that the test for
 * genericness was written three times in prose and zero times in code:
 * `rubric.md` calls it *"Tes spesifisitas (**wajib mental check**)"*, G1 says
 * "ganti nama produk → SPOF/assumptions tidak tetap valid", and `2test.md` step 4
 * names the failure exactly — *"removing the product name and category still
 * leaves recognizable actors and causal sequence from another SaaS analysis"*.
 * A mental check cannot be regressed, so E11 ("hunt false specificity", shipped
 * as a prompt rule) has never been distinguishable from "E11 changed vocabulary".
 *
 * This makes that mental check mechanical, on analyses ALREADY on disk. No
 * provider calls, no credits.
 *
 * How: mask the product name, the category label and every proper noun out of
 * BOTH the analysis and the five golden ideas, then ask which idea the masked
 * analysis best describes. What is left to identify an idea by is precisely what
 * `2test.md` asks about — actors and causal sequence.
 *
 *   own       — share of this idea's DISTINCTIVE masked anchors present in the
 *               analysis (distinctive = appears in this idea and in no other).
 *   rival     — the best score any OTHER idea gets on the same analysis.
 *   verdict   — `generic` when a rival idea explains the analysis at least as
 *               well as its own (this is the gated signal, and it needs no
 *               threshold constant at all); `weak` when its own idea wins but
 *               only barely; `specific` otherwise.
 *
 * This is the axis `collision-check.ts` cannot see and vice versa: collision
 * compares two ANALYSES to each other, this compares one analysis to the five
 * IDEAS. A pair of analyses can be perfectly distinct from each other and still
 * both be un-anchored boilerplate about their own inputs.
 *
 * HONEST LIMITS. Every number here is lexical. An analysis that engages the
 * idea's mechanism in words the idea never used scores as `weak` unfairly, and
 * one that name-drops the idea's nouns without arguing anything scores as
 * `specific` unfairly. So `generic` means *go read this report against its
 * input*, and `specific` means *not detected as a template* — never "verified
 * idea-specific". The instrument's own discrimination is asserted by the probes
 * below rather than assumed; a probe failure exits non-zero even without a gate.
 *
 * Env: BIF_SPEC_SOURCE=all|baselines|stability|locale-flip   (default: all)
 *      BIF_SPEC_RUN=<run_id>   score one run only (piggyback on a Gate 2 run)
 *      BIF_SPEC_ONLY=<fixture-id>
 *      BIF_SPEC_GATE=1         exit non-zero if any analysis scores `generic`
 *
 * Usage: npm run eval:specificity-check
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = path.join(__dirname, "golden");
const OUT_ROOT = path.join(__dirname, "specificity");

/** Run roots that hold `raw/*.json` dumps of a completed analysis. */
const SOURCE_ROOTS = {
  baselines: path.join(__dirname, "baselines"),
  stability: path.join(__dirname, "stability"),
  "locale-flip": path.join(__dirname, "locale-flip"),
} as const;

export type SourceName = keyof typeof SOURCE_ROOTS;

/** Own-idea coverage below this reads as `weak` even when it wins. */
export const OWN_MIN = 0.15;
/** Margin over the best rival below this reads as `weak`. */
export const MARGIN_MIN = 0.15;
/** A fixture with fewer distinctive anchors than this cannot be attributed. */
export const MIN_ANCHORS = 8;

/**
 * Words that carry no idea identity. Deliberately larger than the stopword list
 * in `hinge-labels.ts`: that one guards a Jaccard used as context, this one
 * decides what counts as an *anchor*, and analysis prose is full of long generic
 * nouns ("failure", "platform", "users", "revenue") that would otherwise let two
 * unrelated ideas look mutually attributable.
 */
const STOPWORDS = new Set([
  "that", "this", "with", "from", "have", "will", "when", "then", "than", "into",
  "over", "your", "they", "them", "their", "there", "which", "while", "because",
  "about", "would", "could", "should", "being", "been", "does", "each", "more",
  "most", "other", "some", "such", "only", "same", "also", "very", "much",
  "many", "before", "after", "cannot", "without", "under", "above", "still",
  "even", "once", "both", "either", "neither", "every", "here", "where", "what",
  "whether", "cannot", "must", "make", "makes", "made", "take", "takes", "give",
  "gives", "gets", "goes", "come", "comes", "want", "wants", "need", "needs",
  // generic startup/analysis vocabulary — true of any report, so not identity
  "user", "users", "customer", "customers", "product", "products", "company",
  "startup", "startups", "business", "market", "markets", "platform",
  "platforms", "service", "services", "feature", "features", "team", "teams",
  "founder", "founders", "revenue", "growth", "scale", "value", "cost", "costs",
  "price", "prices", "pricing", "failure", "failures", "risk", "risks",
  "assumption", "assumptions", "cascade", "signal", "signals", "report",
  "reports", "analysis", "step", "steps", "point", "points", "single", "first",
  "second", "third", "next", "last", "early", "later", "month", "months",
  "week", "weeks", "year", "years", "time", "times", "rate", "rates", "data",
  "system", "systems", "process", "processes", "model", "models", "case",
  "cases", "problem", "problems", "issue", "issues", "level", "levels", "high",
  "medium", "slow", "fast", "yes", "maybe",
]);

/**
 * Plural normalisation only. Applied identically to both sides, so "sitters" in
 * an idea matches "sitter" in an analysis. Deliberately NOT a stemmer: dropping
 * `-ing`/`-ion` would collapse "billing" into "bill" and "retention" into
 * "retent", which merges distinct anchors and inflates every score.
 */
function normalize(word: string): string {
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("sses")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 4) return word.slice(0, -1);
  return word;
}

/**
 * Content words of `text`, minus everything in `mask`. Numbers disappear here by
 * construction (the split keeps letters only), which is intended: "80%" and
 * "Jakarta" are the name-tags the specificity test says to remove.
 */
export function contentTokens(text: string, mask: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z]+/)) {
    if (raw.length < 4 || STOPWORDS.has(raw)) continue;
    const token = normalize(raw);
    if (token.length < 4 || STOPWORDS.has(token) || mask.has(token)) continue;
    out.add(token);
  }
  return out;
}

export type Fixture = {
  id: string;
  title: string;
  category: string;
  locale?: string;
  idea: string;
};

/**
 * The mask — "the product name and the category", made literal.
 *
 * Built as the UNION over all five fixtures and applied to every text, analysis
 * and idea alike. Per-fixture masking would leave fixture 01 keeping the word
 * `billing` while fixture 02 had it removed, so 01 could win an attribution on
 * 02's own vocabulary.
 *
 * Three sources, each named by the test this instrument implements:
 *   - title tokens      — the product name ("Neighborhood pet-sitting marketplace")
 *   - category tokens   — the category label ("Marketplace", "AI Product")
 *   - proper nouns      — capitalised mid-sentence words in an idea ("Jakarta"),
 *                         the brand/place tags a template could recognise
 */
export function buildMask(fixtures: Fixture[]): Set<string> {
  const mask = new Set<string>();
  const add = (text: string) => {
    for (const raw of text.toLowerCase().split(/[^a-z]+/)) {
      if (raw.length < 3) continue;
      mask.add(normalize(raw));
      mask.add(raw);
    }
  };
  for (const f of fixtures) {
    add(f.title);
    add(f.category);
    // Capitalised words that are not sentence-initial: place and brand names.
    for (const sentence of f.idea.split(/(?<=[.!?])\s+/)) {
      const words = sentence.trim().split(/\s+/).slice(1);
      for (const w of words) {
        const bare = w.replace(/[^A-Za-z-]/g, "");
        if (/^[A-Z][a-z]{2,}$/.test(bare)) add(bare);
      }
    }
  }
  return mask;
}

/**
 * Per fixture: masked content words that appear in this idea and in NO other.
 * Shared vocabulary is dropped on purpose — a token both idea 01 and idea 03 use
 * cannot tell their analyses apart, so counting it would only dilute the margin
 * that the verdict rests on.
 */
export function buildAnchors(
  fixtures: Fixture[],
  mask: Set<string>,
): Map<string, Set<string>> {
  const per = new Map<string, Set<string>>();
  for (const f of fixtures) per.set(f.id, contentTokens(f.idea, mask));
  const anchors = new Map<string, Set<string>>();
  for (const f of fixtures) {
    const mine = per.get(f.id)!;
    const distinctive = new Set<string>();
    for (const token of mine) {
      const elsewhere = fixtures.some((o) => o.id !== f.id && per.get(o.id)!.has(token));
      if (!elsewhere) distinctive.add(token);
    }
    anchors.set(f.id, distinctive);
  }
  return anchors;
}

export type SpecVerdict = "specific" | "weak" | "generic";

export type Attribution = {
  verdict: SpecVerdict;
  /** Share of its own idea's distinctive anchors the analysis engages. */
  own: number;
  /** Best score any other idea gets on the same masked analysis. */
  rival: number;
  rival_id: string | null;
  margin: number;
  /** Anchors it did hit, for the report — this is the "what did it engage" list. */
  hits: string[];
  reason: string;
};

function coverage(anchors: Set<string>, tokens: Set<string>): { score: number; hits: string[] } {
  if (anchors.size === 0) return { score: 0, hits: [] };
  const hits: string[] = [];
  for (const a of anchors) if (tokens.has(a)) hits.push(a);
  return { score: hits.length / anchors.size, hits: hits.sort() };
}

/**
 * Which idea does this masked analysis describe? Pure, so the probes can feed it
 * synthetic prose.
 *
 * `generic` is deliberately threshold-free: it fires when a rival idea explains
 * the analysis at least as well as the idea it was written for. That is the one
 * verdict this harness gates on, so the gate cannot be argued with by moving a
 * constant. `OWN_MIN`/`MARGIN_MIN` only split the passing side into `specific`
 * and `weak`, and neither of those gates anything.
 */
export function attribute(
  tokens: Set<string>,
  fixtureId: string,
  anchors: Map<string, Set<string>>,
): Attribution {
  const own = coverage(anchors.get(fixtureId) ?? new Set(), tokens);
  let rival = 0;
  let rivalId: string | null = null;
  for (const [id, set] of anchors) {
    if (id === fixtureId) continue;
    const c = coverage(set, tokens);
    if (c.score > rival) {
      rival = c.score;
      rivalId = id;
    }
  }
  const margin = own.score - rival;
  const base = {
    own: Number(own.score.toFixed(3)),
    rival: Number(rival.toFixed(3)),
    rival_id: rivalId,
    margin: Number(margin.toFixed(3)),
    hits: own.hits,
  };
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  if (margin <= 0) {
    return {
      ...base,
      verdict: "generic",
      reason: `\`${rivalId ?? "another idea"}\` explains it as well as its own input (${pct(rival)} vs ${pct(own.score)}) — name-blind, this could be either report`,
    };
  }
  if (own.score < OWN_MIN || margin < MARGIN_MIN) {
    return {
      ...base,
      verdict: "weak",
      reason: `own input wins but thinly (${pct(own.score)} vs ${pct(rival)} for \`${rivalId}\`) — few of the idea's distinctive anchors survive in the prose`,
    };
  }
  return {
    ...base,
    verdict: "specific",
    reason: `${pct(own.score)} of its own anchors vs ${pct(rival)} for the nearest other idea (\`${rivalId}\`)`,
  };
}

/**
 * The other half of false specificity, and the half anchor coverage is blind to:
 * a TEMPLATE whose slots were filled with the idea's own nouns scores high on
 * `own` precisely because it name-drops. So strip every idea's anchors out of two
 * reports and compare what is left — the skeleton. If reports about a pet-sitting
 * marketplace and a fitness ring become near-identical once their nouns are gone,
 * the engine is filling in a form.
 *
 * Reported, never gated: reports share a schema and therefore share vocabulary by
 * construction, so the absolute number is not interpretable on its own. What is
 * interpretable is the CONTRAST — different-idea skeletons vs same-idea skeletons.
 * Same idea should be more similar than different ideas; if the two figures meet,
 * the prose skeleton does not depend on the idea.
 */
export function skeletonSimilarity(a: Set<string>, b: Set<string>, anchors: Set<string>): number {
  const sa = [...a].filter((t) => !anchors.has(t));
  const sb = new Set([...b].filter((t) => !anchors.has(t)));
  if (sa.length === 0 || sb.size === 0) return 0;
  let shared = 0;
  for (const t of sa) if (sb.has(t)) shared += 1;
  return shared / (sa.length + sb.size - shared);
}

type RawFile = {
  fixture_id?: string;
  fixture?: { id?: string; variant_of?: string; variant_kind?: string };
  locale?: string;
  analysis?: {
    meta?: {
      idea_input?: string;
      run?: { mode?: string; locale?: string; pass1_model?: string };
      input_adequacy?: { band?: string };
    };
    single_point_of_failure?: { component?: string; explanation?: string };
    assumptions?: string[];
    cascade?: { nodes?: { step?: string; observable_signal?: string }[] };
  };
};

export type Entry = {
  source: SourceName;
  run: string;
  file: string;
  fixture: string;
  /** `para` / `strip` / `flip` for a stability rewrite, else `—`. */
  variant: string;
  locale: string;
  mode: string;
  spof: string;
  /** Whole report body, minus `meta` — see `collectStrings`. */
  tokens: Set<string>;
  /** Per-block own-anchor coverage: which part of the report carries the specifics. */
  blocks: { spof: number; assumptions: number; cascade: number };
};

/**
 * Every string in the analysis EXCEPT the `meta` subtree. Excluding `meta` is
 * load-bearing, not tidiness: `meta.idea_input` is the idea itself, so leaving it
 * in would score every analysis as perfectly specific by copying the answer.
 */
function collectStrings(value: unknown, out: string[] = [], key = ""): string[] {
  if (key === "meta") return out;
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) collectStrings(v, out, k);
  }
  return out;
}

async function listRuns(root: string): Promise<string[]> {
  try {
    return (await readdir(root, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }
}

async function loadRun(
  source: SourceName,
  run: string,
  mask: Set<string>,
  anchors: Map<string, Set<string>>,
  known: Set<string>,
): Promise<Entry[]> {
  const rawDir = path.join(SOURCE_ROOTS[source], run, "raw");
  let files: string[];
  try {
    files = (await readdir(rawDir)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
  const out: Entry[] = [];
  for (const file of files) {
    const raw = JSON.parse(await readFile(path.join(rawDir, file), "utf8")) as RawFile;
    const analysis = raw.analysis;
    const spof = analysis?.single_point_of_failure;
    if (!analysis || !spof?.component) continue; // failed run — nothing to score
    const fixture = raw.fixture?.variant_of ?? raw.fixture?.id ?? raw.fixture_id;
    if (!fixture || !known.has(fixture)) {
      console.error(`[skip] ${source}/${run}/${file}: fixture "${fixture}" is not in eval/golden`);
      continue;
    }
    const spofText = `${spof.component}. ${spof.explanation ?? ""}`;
    const cascadeText = (analysis.cascade?.nodes ?? [])
      .map((n) => `${n.step ?? ""} ${n.observable_signal ?? ""}`)
      .join(" ");
    const assumptionsText = (analysis.assumptions ?? []).join(" ");
    const mine = anchors.get(fixture) ?? new Set<string>();
    out.push({
      source,
      run,
      file,
      fixture,
      variant: raw.fixture?.variant_kind ?? "—",
      locale: analysis.meta?.run?.locale ?? raw.locale ?? "en",
      mode: analysis.meta?.run?.mode ?? "—",
      spof: spof.component,
      tokens: contentTokens(collectStrings(analysis).join(" "), mask),
      blocks: {
        spof: coverage(mine, contentTokens(spofText, mask)).score,
        assumptions: coverage(mine, contentTokens(assumptionsText, mask)).score,
        cascade: coverage(mine, contentTokens(cascadeText, mask)).score,
      },
    });
  }
  return out;
}

/**
 * Idea-agnostic prose: every clause here is true of any consumer startup, and
 * none of it names an actor from any golden idea. If the instrument cannot tell
 * this from a real report, its `specific` verdicts mean nothing — so this is
 * asserted on every run, not written once and trusted.
 */
const BOILERPLATE = [
  "The core assumption is that early adopters return without being given a reason to.",
  "Acquisition is priced as if attention were free, and the loop that would make a",
  "second visit inevitable does not exist anywhere in the offer. The hinge is the",
  "retention loop: paid spend must fund every cohort forever, so the moment spend",
  "pauses the curve flattens inside a quarter and what remains is the segment least",
  "willing to pay. The people running it absorb the gap by hand until the manual",
  "work outgrows them, then quality slips in the part nobody is watching, and the",
  "reputation cost arrives after the money has already been committed.",
].join(" ");

type Problem = string;

/** Probes that must hold or the numbers below are not measurements. */
function runProbes(
  fixtures: Fixture[],
  mask: Set<string>,
  anchors: Map<string, Set<string>>,
  entries: Entry[],
): { problems: Problem[]; notes: string[]; swapTotal: number; swapGeneric: number } {
  const problems: Problem[] = [];
  const notes: string[] = [];

  // 1. Attribution needs something to attribute WITH. Over-masking (or a fixture
  //    whose idea is all shared vocabulary) would silently zero the signal.
  for (const f of fixtures) {
    const n = (anchors.get(f.id) ?? new Set()).size;
    if (n < MIN_ANCHORS) {
      problems.push(
        `${f.id}: only ${n} distinctive anchors survive masking (need ${MIN_ANCHORS}) — the mask is too wide or the idea shares all its vocabulary`,
      );
    }
  }

  // 2. Template prose must not read as grounded in ANY idea.
  const boilerplate = contentTokens(BOILERPLATE, mask);
  for (const f of fixtures) {
    const a = attribute(boilerplate, f.id, anchors);
    if (a.verdict === "specific" || a.own >= OWN_MIN) {
      problems.push(
        `boilerplate probe: idea-agnostic prose scored ${a.verdict} (own ${a.own}) against ${f.id} — the anchor set is not discriminating`,
      );
    }
  }

  // 3. Swap control on REAL prose. Re-label every English analysis as each of the
  //    other four ideas: a mislabel must come out `generic`. This is the direct
  //    negative control for the diagonal — it uses the same code path, the same
  //    corpus and the same thresholds, so a high `specific` rate on the diagonal
  //    only means something next to a high `generic` rate here.
  const en = entries.filter((e) => e.locale === "en");
  let swapTotal = 0;
  let swapGeneric = 0;
  const swapEscapes: string[] = [];
  for (const e of en) {
    for (const id of anchors.keys()) {
      if (id === e.fixture) continue;
      swapTotal += 1;
      const a = attribute(e.tokens, id, anchors);
      if (a.verdict === "generic") swapGeneric += 1;
      else swapEscapes.push(`${e.source}/${e.run}/${e.file} as \`${id}\` → ${a.verdict}`);
    }
  }
  // Two fixtures with disjoint declared themes are the hard case, so they are
  // pinned rather than averaged away.
  const pinned: [string, string][] = [
    ["02-api-usage-billing", "03-ai-therapy-chat"],
    ["03-ai-therapy-chat", "02-api-usage-billing"],
  ];
  for (const [from, as] of pinned) {
    const sample = en.find((e) => e.fixture === from && e.variant === "—");
    if (!sample) {
      notes.push(`swap probe skipped: no English base analysis on disk for ${from}`);
      continue;
    }
    const a = attribute(sample.tokens, as, anchors);
    if (a.verdict !== "generic") {
      problems.push(
        `swap probe: ${from}'s real analysis scored ${a.verdict} when labelled ${as} (own ${a.own} vs rival ${a.rival}) — two unrelated ideas are mutually attributable`,
      );
    }
  }
  if (swapEscapes.length > 0) {
    notes.push(
      `${swapEscapes.length}/${swapTotal} mislabels did not read \`generic\` — e.g. ${swapEscapes.slice(0, 3).join("; ")}`,
    );
  }
  return { problems, notes, swapTotal, swapGeneric };
}

type Row = Entry & { attribution: Attribution };

export type SkeletonStats = {
  /** Pairs of analyses about DIFFERENT ideas. */
  cross: { n: number; mean: number; p95: number; max: number };
  /** Pairs about the SAME idea — the contrast that makes `cross` readable. */
  same: { n: number; mean: number; p95: number; max: number };
  /** The most template-looking cross-idea pairs, for a human read. */
  top: string[];
};

function pctl(xs: number[], q: number): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

function describe(xs: number[]) {
  return {
    n: xs.length,
    mean: Number(mean(xs).toFixed(3)),
    p95: Number(pctl(xs, 0.95).toFixed(3)),
    max: Number((xs.length ? Math.max(...xs) : 0).toFixed(3)),
  };
}

function skeletonStats(entries: Entry[], anchors: Map<string, Set<string>>): SkeletonStats {
  const all = new Set<string>();
  for (const set of anchors.values()) for (const t of set) all.add(t);
  const cross: number[] = [];
  const same: number[] = [];
  const labelled: { score: number; label: string }[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const a = entries[i];
      const b = entries[j];
      const score = skeletonSimilarity(a.tokens, b.tokens, all);
      if (a.fixture === b.fixture) {
        same.push(score);
        continue;
      }
      cross.push(score);
      labelled.push({
        score,
        label: `${a.fixture}[${a.run}] × ${b.fixture}[${b.run}] — ${score.toFixed(2)}`,
      });
    }
  }
  labelled.sort((x, y) => y.score - x.score);
  return {
    cross: describe(cross),
    same: describe(same),
    top: labelled.slice(0, 3).map((x) => x.label),
  };
}


const MARK: Record<SpecVerdict, string> = {
  specific: "✓ specific",
  weak: "~ weak",
  generic: "✗ generic",
};

function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v).replace(/\|/g, "\\|");
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function buildReport(
  runId: string,
  fixtures: Fixture[],
  anchors: Map<string, Set<string>>,
  rows: Row[],
  crossLang: Entry[],
  probes: ReturnType<typeof runProbes>,
  skeleton: SkeletonStats,
): string {
  const L: string[] = [];
  L.push(`# Name-blind specificity check (N1b / K2) — ${runId}`);
  L.push("");
  L.push(
    "**What this measures:** the *"
      + "Tes spesifisitas* that `rubric.md` has only ever asked a human to do in their "
      + "head. The product name, the category label and every proper noun are masked "
      + "out of both the report and the five golden ideas; what is left to identify an "
      + "idea by is its actors and causal sequence. An analysis that its own input no "
      + "longer explains better than somebody else's input is a template. "
      + "**What it can't:** every number here is lexical — engaging a mechanism in "
      + "words the idea never used scores low unfairly, and name-dropping the idea's "
      + "nouns without arguing anything scores high unfairly. Read `generic` as *go "
      + "read this report against its input*, and `specific` as *no template "
      + "detected*.",
  );
  L.push("");
  L.push("Offline: reads analyses already on disk, no provider calls, no credits.");
  L.push("");
  L.push("## Anchors per idea (after masking)");
  L.push("");
  L.push("| Fixture | Distinctive anchors | Sample |");
  L.push("|---|---|---|");
  for (const f of fixtures) {
    const a = [...(anchors.get(f.id) ?? new Set<string>())].sort();
    L.push(`| ${f.id} | ${a.length} | ${cell(a.slice(0, 12).join(", "))} |`);
  }
  L.push("");

  L.push("## Per idea");
  L.push("");
  L.push("| Fixture | n | ✓ | ~ | ✗ | mean own | min own | mean margin |");
  L.push("|---|---|---|---|---|---|---|---|");
  for (const f of fixtures) {
    const mine = rows.filter((r) => r.fixture === f.id);
    if (mine.length === 0) continue;
    const owns = mine.map((r) => r.attribution.own);
    L.push(
      `| ${f.id} | ${mine.length} `
        + `| ${mine.filter((r) => r.attribution.verdict === "specific").length} `
        + `| ${mine.filter((r) => r.attribution.verdict === "weak").length} `
        + `| ${mine.filter((r) => r.attribution.verdict === "generic").length} `
        + `| ${pct(mean(owns))} | ${pct(Math.min(...owns))} `
        + `| ${pct(mean(mine.map((r) => r.attribution.margin)))} |`,
    );
  }
  L.push("");

  L.push("## Per analysis (English prose — the scored set)");
  L.push("");
  L.push(
    "`own` = share of this idea's distinctive anchors present in the report; "
      + "`rival` = the best any other idea scores on the same text. Block columns "
      + "show which part of the report carries the specifics — a generic SPOF under a "
      + "specific cascade is a real finding, and the rollup would hide it.",
  );
  L.push("");
  L.push("| Source | Fixture | Var | Mode | Verdict | own | rival | margin | SPOF blk | Assum blk | Casc blk | SPOF |");
  L.push("|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of rows) {
    const a = r.attribution;
    L.push(
      `| ${r.source}/${r.run} | ${r.fixture} | ${cell(r.variant)} | ${cell(r.mode)} `
        + `| **${MARK[a.verdict]}** | ${pct(a.own)} | ${pct(a.rival)} (${cell(a.rival_id)}) `
        + `| ${a.margin >= 0 ? "+" : ""}${pct(a.margin)} | ${pct(r.blocks.spof)} `
        + `| ${pct(r.blocks.assumptions)} | ${pct(r.blocks.cascade)} | ${cell(r.spof)} |`,
    );
  }
  L.push("");

  if (crossLang.length > 0) {
    L.push("## Not scored — prose in another language");
    L.push("");
    L.push(
      `${crossLang.length} analysis/analyses ran with a non-English output locale. `
        + "The anchors come from English idea text, so a low score there would measure "
        + "translation, not specificity. Listed for completeness, excluded from every "
        + "number above and from the gate.",
    );
    L.push("");
    for (const e of crossLang) {
      L.push(`- \`${e.source}/${e.run}/${e.file}\` (${e.locale}) — ${cell(e.spof)}`);
    }
    L.push("");
  }

  L.push("## Skeleton similarity — the failure anchor coverage cannot see");
  L.push("");
  L.push(
    "A template whose slots were filled with the idea's own nouns scores *high* on "
      + "`own`, because name-dropping is exactly what `own` counts. So this strips "
      + "every idea's anchors out of both reports and compares what is left. Reported, "
      + "never gated — reports share a schema and therefore share vocabulary by "
      + "construction. The readable figure is the **contrast**: pairs about the same "
      + "idea should be more alike than pairs about different ideas. If the two rows "
      + "meet, the prose skeleton does not depend on the idea.",
  );
  L.push("");
  L.push("| Pairs | n | mean | p95 | max |");
  L.push("|---|---|---|---|---|");
  L.push(
    `| Different ideas | ${skeleton.cross.n} | ${skeleton.cross.mean.toFixed(2)} | ${skeleton.cross.p95.toFixed(2)} | ${skeleton.cross.max.toFixed(2)} |`,
  );
  L.push(
    `| Same idea | ${skeleton.same.n} | ${skeleton.same.mean.toFixed(2)} | ${skeleton.same.p95.toFixed(2)} | ${skeleton.same.max.toFixed(2)} |`,
  );
  L.push("");
  if (skeleton.top.length) {
    L.push("Most template-looking cross-idea pairs (read these two side by side):");
    L.push("");
    for (const t of skeleton.top) L.push(`- ${cell(t)}`);
    L.push("");
  }

  L.push("## Discrimination controls");
  L.push("");
  L.push("| Control | Result | What it rules out |");
  L.push("|---|---|---|");
  L.push(
    `| Boilerplate probe | idea-agnostic prose stays under the ${pct(OWN_MIN)} grounding floor on all ${fixtures.length} ideas | an anchor set so loose that any prose looks grounded |`,
  );
  L.push(
    `| Swap control (real prose, mislabelled) | ${probes.swapGeneric}/${probes.swapTotal} read \`generic\` (${pct(probes.swapTotal ? probes.swapGeneric / probes.swapTotal : 0)}) | a diagonal that only looks strong because every idea matches everything |`,
  );
  L.push("");
  for (const n of probes.notes) L.push(`- note: ${cell(n)}`);
  if (probes.notes.length) L.push("");

  const generic = rows.filter((r) => r.attribution.verdict === "generic");
  const weak = rows.filter((r) => r.attribution.verdict === "weak");
  const thin = rows.filter((r) => r.attribution.own < OWN_MIN);
  L.push("## Rollup");
  L.push("");
  L.push("| Metric | Value |");
  L.push("|---|---|");
  L.push(`| Analyses scored | ${rows.length} |`);
  L.push(`| ✓ specific | ${rows.length - weak.length - generic.length} |`);
  L.push(`| ~ weak | ${weak.length} |`);
  L.push(`| ✗ generic | ${generic.length} |`);
  L.push(`| of which thin grounding (own < ${pct(OWN_MIN)}) | ${thin.length} |`);
  L.push(`| mean own / mean rival | ${pct(mean(rows.map((r) => r.attribution.own)))} / ${pct(mean(rows.map((r) => r.attribution.rival)))} |`);
  L.push(`| Runs read | ${new Set(rows.map((r) => `${r.source}/${r.run}`)).size} |`);
  L.push("");
  L.push(
    `**N1b pass criterion: 0 \`generic\`.** This corpus: **${generic.length}**. `
      + "The gated verdict carries no threshold constant — it fires only when a rival "
      + "idea explains the report at least as well as its own — so it cannot be "
      + "argued away by moving a number. `OWN_MIN`/`MARGIN_MIN` only split the passing "
      + "side into `specific` and `weak`, and a `weak` row with near-zero `own` "
      + "deserves the same read as a `generic` one.",
  );
  L.push("");
  L.push(
    "**Read before quoting this as a K2 result.** (1) One corpus is one measurement "
      + "of one prompt version; the number that matters is the delta after a "
      + "`prompts.ts` edit, against the same fixtures. (2) `strip` variants have the "
      + "brand and city removed from the *input*, so a lower score there is partly the "
      + "rewrite, not the engine. (3) Anchors are the idea's own words, which rewards "
      + "an analysis that quotes the input; the collision harness "
      + "(`npm run eval:collision-check`) is what catches the opposite failure, one "
      + "template worn by five ideas. Both halves are needed, and neither is ground "
      + "truth — that is still K1.",
  );
  L.push("");
  return L.join("\n");
}

async function loadFixtures(): Promise<Fixture[]> {
  const files = (await readdir(GOLDEN_DIR)).filter((f) => f.endsWith(".json")).sort();
  return Promise.all(
    files.map(async (f) => JSON.parse(await readFile(path.join(GOLDEN_DIR, f), "utf8")) as Fixture),
  );
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function main() {
  const gate = process.env.BIF_SPEC_GATE === "1" || process.env.BIF_SPEC_GATE === "true";
  const only = process.env.BIF_SPEC_ONLY?.trim();
  const runFilter = process.env.BIF_SPEC_RUN?.trim();
  const sourceEnv = (process.env.BIF_SPEC_SOURCE?.trim() || "all") as SourceName | "all";
  const sources = (
    sourceEnv === "all" ? (Object.keys(SOURCE_ROOTS) as SourceName[]) : [sourceEnv]
  ).filter((s) => s in SOURCE_ROOTS);
  if (sources.length === 0) {
    console.error(`BIF_SPEC_SOURCE="${sourceEnv}" is not one of: all, ${Object.keys(SOURCE_ROOTS).join(", ")}`);
    process.exit(1);
  }

  const fixtures = await loadFixtures();
  const known = new Set(fixtures.map((f) => f.id));
  const mask = buildMask(fixtures);
  const anchors = buildAnchors(fixtures, mask);

  const all: Entry[] = [];
  for (const source of sources) {
    for (const run of await listRuns(SOURCE_ROOTS[source])) {
      if (runFilter && run !== runFilter) continue;
      all.push(...(await loadRun(source, run, mask, anchors, known)));
    }
  }
  const selected = only ? all.filter((e) => e.fixture === only) : all;
  if (selected.length === 0) {
    console.error(
      `No stored analyses matched (source=${sourceEnv}${runFilter ? `, run=${runFilter}` : ""}${only ? `, fixture=${only}` : ""}). ` +
        "This harness only reads runs already on disk — it never calls a provider.",
    );
    process.exit(1);
  }

  const scored = selected.filter((e) => e.locale === "en");
  const crossLang = selected.filter((e) => e.locale !== "en");
  const probes = runProbes(fixtures, mask, anchors, scored);
  const skeleton = skeletonStats(scored, anchors);
  const rows: Row[] = scored.map((e) => ({ ...e, attribution: attribute(e.tokens, e.fixture, anchors) }));

  const runId = stamp();
  const outDir = path.join(OUT_ROOT, runId);
  await mkdir(outDir, { recursive: true });

  console.log(`\nBreakItFirst name-blind specificity check (N1b / K2) — ${runId}`);
  console.log(
    `Corpus: ${rows.length} English analyses from ${new Set(rows.map((r) => `${r.source}/${r.run}`)).size} run(s)` +
      `${crossLang.length ? ` · ${crossLang.length} non-English skipped` : ""} · offline (no provider calls)\n`,
  );
  for (const f of fixtures) {
    console.log(`  ${f.id}: ${(anchors.get(f.id) ?? new Set()).size} distinctive anchors`);
  }
  console.log("");
  for (const r of rows) {
    const mark = r.attribution.verdict === "generic" ? "✗" : r.attribution.verdict === "weak" ? "~" : "✓";
    console.log(
      `  ${mark} ${r.fixture}${r.variant === "—" ? "" : `-${r.variant}`} [${r.source}/${r.run}] ${r.attribution.reason}`,
    );
  }

  const generic = rows.filter((r) => r.attribution.verdict === "generic");
  const weak = rows.filter((r) => r.attribution.verdict === "weak");
  const specific = rows.length - generic.length - weak.length;
  if (specific === 0) {
    probes.notes.push(
      "no analysis reached `specific` — either the engine is templating or the floors are too tight; read prose before concluding either",
    );
  }

  await writeFile(
    path.join(outDir, "REPORT.md"),
    buildReport(runId, fixtures, anchors, rows, crossLang, probes, skeleton),
    "utf8",
  );
  await writeFile(
    path.join(outDir, "summary.json"),
    `${JSON.stringify(
      {
        run_id: runId,
        generated_at: new Date().toISOString(),
        offline: true,
        thresholds: { OWN_MIN, MARGIN_MIN, MIN_ANCHORS },
        selection: { source: sourceEnv, run: runFilter ?? null, fixture: only ?? null },
        anchors: Object.fromEntries([...anchors].map(([id, set]) => [id, [...set].sort()])),
        controls: {
          swap_total: probes.swapTotal,
          swap_generic: probes.swapGeneric,
          skeleton,
          notes: probes.notes,
        },
        rollup: { scored: rows.length, specific, weak: weak.length, generic: generic.length },
        analyses: rows.map((r) => ({
          source: r.source,
          run: r.run,
          file: r.file,
          fixture: r.fixture,
          variant: r.variant,
          mode: r.mode,
          locale: r.locale,
          spof: r.spof,
          blocks: r.blocks,
          ...r.attribution,
        })),
        skipped_cross_language: crossLang.map((e) => ({
          source: e.source,
          run: e.run,
          file: e.file,
          locale: e.locale,
        })),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(
    `\nDone. ${rows.length} scored · ${specific} specific · ${weak.length} weak · ${generic.length} generic`,
  );
  console.log(
    `Controls: swap ${probes.swapGeneric}/${probes.swapTotal} generic · boilerplate under the grounding floor on all ${fixtures.length} ideas`,
  );
  console.log(
    `Skeleton similarity (anchors removed): different ideas mean ${skeleton.cross.mean.toFixed(2)} (max ${skeleton.cross.max.toFixed(2)}) vs same idea mean ${skeleton.same.mean.toFixed(2)}`,
  );
  for (const n of probes.notes) console.log(`  note: ${n}`);
  console.log(`Report: ${path.join(outDir, "REPORT.md")}`);
  console.log("Next: record the counts + corpus size in K2/Q21 (docs/04-refine-backlog.md).");

  if (probes.problems.length > 0) {
    console.error(`\n${probes.problems.length} instrument problem(s) — the numbers above are not measurements:`);
    for (const p of probes.problems) console.error(`  ✗ ${p}`);
    process.exit(1);
  }
  if (gate && generic.length > 0) {
    console.error(
      `\nGate failed: ${generic.length} analysis/analyses read \`generic\` — ${generic
        .map((r) => `${r.fixture}[${r.run}]`)
        .join(", ")}`,
    );
    process.exit(1);
  }
}

// Run only when invoked directly, so importing `attribute` stays side-effect free.
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
