/**
 * N7/E21 — is `meta.idea_input` byte-identical to the text that was submitted?
 *
 * K8 in `docs/dogfood/00-analysis.md` reports a corrupted idea in a delivered
 * report: spaces missing at joins and words cut mid-token
 * (`"masihenyambungkan"`, `"kongevaluasi"`, `"keounder"`). A corrupted idea
 * analysed at High confidence is a worse defect than a thin idea analysed at
 * High confidence, and today nothing checks for it.
 *
 * K8's own instruction is "reproduce first, don't guess", so this harness turns
 * every baseline run we already have on disk into evidence: for each fixture it
 * compares `analysis.meta.idea_input` against the golden fixture's `idea`
 * character by character, and on a mismatch prints the first divergence with a
 * window either side — the shape of what was dropped, not just that something
 * was.
 *
 * Offline. No provider calls, no credits.
 *
 * SCOPE — read this before trusting a green run. This proves the *server* path
 * (POST body -> validateAnalyzeInput -> pipeline -> meta.idea_input) is lossless
 * on fixture text. It cannot see the browser input path, which is where K8's
 * corruption most likely entered: the harness posts a fixture string directly
 * and never touches the textarea. Baseline runs only — stability and
 * locale-flip runs feed deliberately rewritten variants, so a diff there would
 * be the rewrite, not corruption.
 *
 * Env: BIF_BASELINE=<run_id>   (default: every run under eval/baselines/)
 *
 * Usage: npm run eval:input-integrity
 * Exit code: non-zero on any mismatch — this is an invariant, not a screen.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = path.join(__dirname, "golden");
const BASELINE_ROOT = path.join(__dirname, "baselines");

export type Divergence = {
  /** Index of the first differing character. */
  index: number;
  submitted: string;
  recorded: string;
};

/** First differing character plus a window each side, for a human read. */
export function firstDivergence(
  submitted: string,
  recorded: string,
  pad = 44,
): Divergence | null {
  if (submitted === recorded) return null;
  const max = Math.min(submitted.length, recorded.length);
  let i = 0;
  while (i < max && submitted[i] === recorded[i]) i += 1;
  const from = Math.max(0, i - pad);
  return {
    index: i,
    submitted: submitted.slice(from, i + pad),
    recorded: recorded.slice(from, i + pad),
  };
}

type Verdict = "identical" | "mismatch" | "empty" | "no-fixture";

export type CheckRow = {
  run: string;
  fixture: string;
  verdict: Verdict;
  submittedChars: number;
  recordedChars: number;
  divergence: Divergence | null;
};

/** Pure comparison — exported so the offline check can exercise it. */
export function checkOne(
  run: string,
  fixture: string,
  submitted: string | undefined,
  recorded: string,
): CheckRow {
  const base = {
    run,
    fixture,
    submittedChars: submitted?.length ?? 0,
    recordedChars: recorded.length,
  };
  if (submitted === undefined) {
    return { ...base, verdict: "no-fixture", divergence: null };
  }
  if (recorded.length === 0) {
    return { ...base, verdict: "empty", divergence: null };
  }
  const divergence = firstDivergence(submitted, recorded);
  return {
    ...base,
    verdict: divergence ? "mismatch" : "identical",
    divergence,
  };
}

async function loadGoldenIdeas(): Promise<Map<string, string>> {
  const files = (await readdir(GOLDEN_DIR)).filter((f) => f.endsWith(".json"));
  const out = new Map<string, string>();
  for (const file of files) {
    const parsed = JSON.parse(await readFile(path.join(GOLDEN_DIR, file), "utf8")) as {
      id?: string;
      idea?: string;
    };
    if (parsed.id && typeof parsed.idea === "string") out.set(parsed.id, parsed.idea);
  }
  return out;
}

async function listRuns(): Promise<string[]> {
  const only = process.env.BIF_BASELINE?.trim();
  if (only) return [only];
  return (await readdir(BASELINE_ROOT, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

async function scanRun(run: string, golden: Map<string, string>): Promise<CheckRow[]> {
  const rawDir = path.join(BASELINE_ROOT, run, "raw");
  let files: string[];
  try {
    files = (await readdir(rawDir)).filter(
      (f) => f.endsWith(".json") && !f.endsWith(".error.json"),
    );
  } catch {
    return [];
  }
  const rows: CheckRow[] = [];
  for (const file of files.sort()) {
    const raw = JSON.parse(await readFile(path.join(rawDir, file), "utf8")) as {
      fixture_id?: string;
      analysis?: { meta?: { idea_input?: string } };
    };
    const recorded = raw.analysis?.meta?.idea_input;
    if (typeof recorded !== "string") continue; // failed run, nothing to compare
    const fixture = raw.fixture_id ?? file.replace(/\.json$/, "");
    rows.push(checkOne(run, fixture, golden.get(fixture), recorded));
  }
  return rows;
}

const MARK: Record<Verdict, string> = {
  identical: "✓",
  mismatch: "✗",
  empty: "✗",
  "no-fixture": "?",
};

async function main() {
  const golden = await loadGoldenIdeas();
  const runs = await listRuns();
  const rows: CheckRow[] = [];
  for (const run of runs) rows.push(...(await scanRun(run, golden)));

  console.log("\nBreakItFirst input integrity (N7/E21) — offline, no provider calls");
  console.log(
    `Golden fixtures: ${golden.size} · baseline runs scanned: ${runs.length} · comparisons: ${rows.length}\n`,
  );

  let lastRun = "";
  for (const r of rows) {
    if (r.run !== lastRun) {
      console.log(`  ${r.run}`);
      lastRun = r.run;
    }
    const chars =
      r.submittedChars === r.recordedChars
        ? `${r.recordedChars} chars`
        : `${r.submittedChars} submitted vs ${r.recordedChars} recorded`;
    console.log(`    ${MARK[r.verdict]} ${r.fixture} — ${r.verdict} (${chars})`);
    if (r.divergence) {
      console.log(`        first divergence at char ${r.divergence.index}`);
      console.log(`        submitted: …${r.divergence.submitted}…`);
      console.log(`        recorded : …${r.divergence.recorded}…`);
    }
  }

  const bad = rows.filter((r) => r.verdict === "mismatch" || r.verdict === "empty");
  const unknown = rows.filter((r) => r.verdict === "no-fixture");
  console.log(
    `\nDone. ${rows.length - bad.length - unknown.length} identical · ${bad.length} broken · ` +
      `${unknown.length} fixture no longer on disk (not judged).`,
  );
  const longest = Math.max(0, ...[...golden.values()].map((v) => v.length));
  console.log(
    `Longest fixture idea: ${longest} chars. K8's corruption appeared on a ~6000-char paste, ` +
      `so a green run here does not clear the long-input regime.`,
  );
  if (bad.length > 0) {
    console.error(
      `\nInvariant violated: ${bad.length} recorded idea(s) differ from the submitted text — ` +
        `${bad.map((r) => `${r.run}/${r.fixture}`).join(", ")}`,
    );
    process.exit(1);
  }
}

// Run only when invoked directly, so importing the pure helpers stays side-effect free.
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
