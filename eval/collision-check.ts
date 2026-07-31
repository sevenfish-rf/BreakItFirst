/**
 * N2 — cross-idea collision check (closes the second half of K2).
 *
 * The stability harness asks "does the hinge stay put when only the wording
 * changes?". This asks the OPPOSITE question, and it catches a different
 * failure: do five genuinely different ideas produce five different hinges, or
 * does the engine keep reaching for the same familiar failure?
 *
 * Why it matters: an engine that answers "flat pricing without a cost guard"
 * for an API product AND for a SaaS wiki is not analysing the idea, it is
 * pattern-matching a template — and every stability number we have would score
 * that as perfectly stable. Stability and discrimination are independent axes;
 * only this harness measures discrimination.
 *
 * Reads an EXISTING baseline run. No provider calls, no credits.
 *
 * Two independent signals, because each covers the other's blind spot:
 *   - same primary THEME → the same class of failure even when worded
 *     differently (catches "flat pricing" vs "fixed fee below marginal cost")
 *   - high TOKEN overlap → the same prose even when the themes differ
 *     (catches one template sorted into two theme buckets)
 *
 * Verdict per fixture pair:
 *   collision — same primary theme AND token overlap >= COLLISION_MIN_OVERLAP.
 *               Same class plus similar wording = one hinge on two ideas. This
 *               is the gated signal; N2's pass criterion is 0 collisions.
 *   echo      — exactly one signal fired (same theme but unlike prose, or
 *               unlike themes but similar prose). Read it; it does not gate.
 *   distinct  — neither signal fired.
 *
 * HONEST LIMITS. Token overlap is lexical, not semantic, and a theme is coarser
 * than a hinge (`hinge-labels.ts` says so at length). Fixtures 01 and 03 also
 * SHARE `trust`/`liability` in their declared expected sets by design, so a
 * theme match between those two is far less surprising than one between 02 and
 * 04. Read `collision` as "go read these two SPOFs side by side", and read 0
 * collisions as "no template detected", never as "five confirmed independent
 * analyses".
 *
 * Env: BIF_BASELINE=<run_id>     (default: newest run under eval/baselines/)
 *      BIF_COLLISION_GATE=1      exit non-zero if any pair collides
 *
 * Usage: npm run eval:collision-check
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadThemeKeywords, matchThemes, tokenOverlap } from "./hinge-labels";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASELINE_ROOT = path.join(__dirname, "baselines");

/** Same primary theme needs at least this much prose overlap to be a collision. */
export const COLLISION_MIN_OVERLAP = 0.15;
/** Prose this similar is worth a human read even when the themes differ. */
export const ECHO_MIN_OVERLAP = 0.25;

export type PairVerdict = "distinct" | "echo" | "collision";

/** The minimum shape a pair comparison needs — small so tests can build one. */
export type PairSide = {
  id: string;
  primary: string | null;
  text: string;
  cascade: string[];
  candidates: string[];
};

export type PairResult = {
  a: string;
  b: string;
  verdict: PairVerdict;
  primary_a: string | null;
  primary_b: string | null;
  token_overlap: number;
  /** Strongest single step-to-step overlap between the two cascades. Context only. */
  cascade_overlap: number;
  /** Rejected-candidate labels similar enough to look templated. Context only. */
  candidate_echoes: string[];
  reason: string;
};

/** Strongest overlap between any step of one cascade and any step of the other. */
function cascadeOverlap(a: string[], b: string[]): number {
  let best = 0;
  for (const x of a) for (const y of b) best = Math.max(best, tokenOverlap(x, y));
  return Number(best.toFixed(3));
}

/** Candidate labels that read like the same rejected template on both ideas. */
function candidateEchoes(a: string[], b: string[]): string[] {
  const out: string[] = [];
  for (const x of a) {
    for (const y of b) {
      const o = tokenOverlap(x, y);
      if (o >= ECHO_MIN_OVERLAP) out.push(`${x} ≈ ${y} (${o.toFixed(2)})`);
    }
  }
  return out;
}

/** Pure pair comparison — exported so the offline check can exercise it. */
export function classifyPair(a: PairSide, b: PairSide): PairResult {
  const overlap = Number(tokenOverlap(a.text, b.text).toFixed(3));
  const sameTheme = a.primary !== null && a.primary === b.primary;
  const base = {
    a: a.id,
    b: b.id,
    primary_a: a.primary,
    primary_b: b.primary,
    token_overlap: overlap,
    cascade_overlap: cascadeOverlap(a.cascade, b.cascade),
    candidate_echoes: candidateEchoes(a.candidates, b.candidates),
  };

  if (sameTheme && overlap >= COLLISION_MIN_OVERLAP) {
    return {
      ...base,
      verdict: "collision",
      reason: `both hinge on \`${a.primary}\` and the prose overlaps ${overlap.toFixed(2)} — same failure on two different ideas`,
    };
  }
  if (sameTheme) {
    return {
      ...base,
      verdict: "echo",
      reason: `both land on \`${a.primary}\` but the prose differs (${overlap.toFixed(2)}) — same class, plausibly different mechanism; read both`,
    };
  }
  if (overlap >= ECHO_MIN_OVERLAP) {
    return {
      ...base,
      verdict: "echo",
      reason: `themes differ (\`${a.primary}\` vs \`${b.primary}\`) but the prose overlaps ${overlap.toFixed(2)} — one template in two buckets?`,
    };
  }
  return {
    ...base,
    verdict: "distinct",
    reason: `\`${a.primary}\` vs \`${b.primary}\`, prose overlap ${overlap.toFixed(2)}`,
  };
}

type Entry = PairSide & { category: string; spof: string; themes: string[] };

type RawFile = {
  fixture_id?: string;
  analysis?: {
    single_point_of_failure?: { component: string; explanation: string };
    spof_candidates?: { label: string }[];
    cascade?: { nodes?: { step: string }[] };
    meta?: { category?: string };
  };
};

async function newestBaseline(): Promise<string> {
  const dirs = (await readdir(BASELINE_ROOT, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const last = dirs.at(-1);
  if (!last) {
    throw new Error(`No baseline runs under ${BASELINE_ROOT} — run npm run eval:baseline first.`);
  }
  return last;
}

async function loadEntries(
  runDir: string,
  keywords: Awaited<ReturnType<typeof loadThemeKeywords>>,
): Promise<Entry[]> {
  const rawDir = path.join(runDir, "raw");
  const files = (await readdir(rawDir)).filter((f) => f.endsWith(".json")).sort();
  const out: Entry[] = [];
  for (const file of files) {
    const raw = JSON.parse(await readFile(path.join(rawDir, file), "utf8")) as RawFile;
    const spof = raw.analysis?.single_point_of_failure;
    if (!spof) {
      console.error(`[skip] ${file}: no single_point_of_failure (failed run?)`);
      continue;
    }
    const text = `${spof.component}. ${spof.explanation}`;
    const matches = matchThemes(text, keywords);
    out.push({
      id: raw.fixture_id ?? file.replace(/\.json$/, ""),
      category: raw.analysis?.meta?.category ?? "—",
      spof: spof.component,
      text,
      themes: matches.map((m) => m.theme),
      primary: matches[0]?.theme ?? null,
      cascade: (raw.analysis?.cascade?.nodes ?? []).map((n) => n.step),
      candidates: (raw.analysis?.spof_candidates ?? []).map((c) => c.label),
    });
  }
  return out;
}

const VERDICT_MARK: Record<PairVerdict, string> = {
  distinct: "✓ distinct",
  echo: "~ echo",
  collision: "✗ collision",
};

function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v).replace(/\|/g, "\\|");
}

function buildReport(runId: string, entries: Entry[], pairs: PairResult[]): string {
  const lines: string[] = [];
  lines.push(`# Cross-idea collision check (N2) — baseline ${runId}`);
  lines.push("");
  lines.push(
    "**What this measures:** whether five different ideas produced five " +
      "different hinges, or the engine reached for one familiar failure. This is " +
      "the axis stability cannot see — a template scores as perfectly stable. " +
      "**What it can't:** token overlap is lexical, not semantic, and a theme is " +
      "coarser than a hinge, so read `collision` as *go read these two side by " +
      "side* and 0 collisions as *no template detected*, not as proof.",
  );
  lines.push("");
  lines.push("## Hinge per fixture");
  lines.push("");
  lines.push("| Fixture | Category | Primary theme | SPOF |");
  lines.push("|---|---|---|---|");
  for (const e of entries) {
    lines.push(`| ${e.id} | ${cell(e.category)} | ${cell(e.primary)} | ${cell(e.spof)} |`);
  }
  lines.push("");
  lines.push("## Pairs");
  lines.push("");
  lines.push("| Pair | Verdict | Themes | Prose | Cascade | Why |");
  lines.push("|---|---|---|---|---|---|");
  for (const p of pairs) {
    lines.push(
      `| ${p.a} × ${p.b} | **${VERDICT_MARK[p.verdict]}** | ${cell(p.primary_a)} vs ${cell(p.primary_b)} | ${p.token_overlap.toFixed(2)} | ${p.cascade_overlap.toFixed(2)} | ${cell(p.reason)} |`,
    );
  }
  lines.push("");

  const echoes = pairs.filter((p) => p.candidate_echoes.length > 0);
  if (echoes.length > 0) {
    lines.push("## Rejected-candidate echoes (context, not gated)");
    lines.push("");
    lines.push(
      "Losing candidates that read like the same template on two different " +
        "ideas. These never reach the user, but they show what the engine reaches " +
        "for before it commits — a template here is a weaker version of the same " +
        "K2 worry.",
    );
    lines.push("");
    for (const p of echoes) {
      for (const e of p.candidate_echoes) lines.push(`- \`${p.a}\` × \`${p.b}\`: ${cell(e)}`);
    }
    lines.push("");
  }

  const collisions = pairs.filter((p) => p.verdict === "collision");
  const echoPairs = pairs.filter((p) => p.verdict === "echo");
  lines.push("## Rollup");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|---|---|");
  lines.push(`| Fixtures | ${entries.length} |`);
  lines.push(`| Pairs compared | ${pairs.length} |`);
  lines.push(`| ✗ collision | ${collisions.length} |`);
  lines.push(`| ~ echo | ${echoPairs.length} |`);
  lines.push(`| ✓ distinct | ${pairs.filter((p) => p.verdict === "distinct").length} |`);
  lines.push(`| Distinct primary themes | ${new Set(entries.map((e) => e.primary)).size} / ${entries.length} |`);
  lines.push("");
  lines.push(
    `**N2 pass criterion: 0 collisions.** This run: **${collisions.length}**. ` +
      "One collision is one prompt bug — but confirm it by reading both SPOFs " +
      "before treating it as one, because the screen is coarse in both " +
      "directions. Fixtures 01 and 03 share `trust`/`liability` in their declared " +
      "expected sets by design, so a theme match there is much less surprising " +
      "than one between fixtures with disjoint expected sets.",
  );
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const gate =
    process.env.BIF_COLLISION_GATE === "1" || process.env.BIF_COLLISION_GATE === "true";
  const runId = process.env.BIF_BASELINE?.trim() || (await newestBaseline());
  const runDir = path.join(BASELINE_ROOT, runId);

  const keywords = await loadThemeKeywords();
  const entries = await loadEntries(runDir, keywords);
  if (entries.length < 2) {
    console.error(`Need at least 2 usable fixtures in ${runDir}; found ${entries.length}.`);
    process.exit(1);
  }

  console.log(`\nBreakItFirst collision check (N2) — baseline ${runId}`);
  console.log(`Fixtures: ${entries.length} · offline (no provider calls)\n`);
  for (const e of entries) {
    console.log(`  ${e.id} [${e.primary ?? "no theme"}] ${e.spof}`);
  }

  const pairs: PairResult[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      pairs.push(classifyPair(entries[i], entries[j]));
    }
  }

  console.log("");
  for (const p of pairs) {
    const mark = p.verdict === "collision" ? "✗" : p.verdict === "echo" ? "~" : "✓";
    console.log(`  ${mark} ${p.a} × ${p.b} — ${p.reason}`);
  }

  const reportPath = path.join(runDir, "COLLISION.md");
  await writeFile(reportPath, buildReport(runId, entries, pairs), "utf8");

  const collisions = pairs.filter((p) => p.verdict === "collision");
  const echoes = pairs.filter((p) => p.verdict === "echo");
  console.log(
    `\nDone. ${pairs.length} pairs · ${collisions.length} collision · ${echoes.length} echo · ` +
      `${pairs.length - collisions.length - echoes.length} distinct`,
  );
  console.log(`Report: ${reportPath}`);
  console.log(`Next: record the collision count + baseline id in Q17 (docs/04-refine-backlog.md).`);

  if (gate && collisions.length > 0) {
    console.error(
      `\nGate failed: ${collisions.length} colliding pair(s) — ${collisions.map((p) => `${p.a}×${p.b}`).join(", ")}`,
    );
    process.exit(1);
  }
}

// Run only when invoked directly, so importing `classifyPair` stays side-effect free.
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
