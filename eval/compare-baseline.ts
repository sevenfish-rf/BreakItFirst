/**
 * Compare two baseline runs (raw assertion stats + optional filled scores).
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json eval/compare-baseline.ts \
 *     2026-07-16_043835 <new_run_id>
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASELINES = path.join(__dirname, "baselines");

type ScoreFile = {
  fixture_id: string;
  total_points: number | null;
  max_points?: number;
  criteria?: Record<string, number | null>;
};

type Summary = {
  run_id: string;
  models?: { pass1: string; pass2: string; baseUrl: string };
  results: Array<{
    id: string;
    ok: boolean;
    elapsedMs?: number;
    assertion_summary?: {
      hard_fail: number;
      soft_fail: number;
    };
    spof?: string;
    warnings?: string[];
  }>;
};

async function loadSummary(runId: string): Promise<Summary> {
  const raw = await readFile(path.join(BASELINES, runId, "summary.json"), "utf8");
  return JSON.parse(raw) as Summary;
}

async function loadScores(runId: string): Promise<Map<string, ScoreFile>> {
  const dir = path.join(BASELINES, runId, "scores");
  const map = new Map<string, ScoreFile>();
  try {
    const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
    for (const f of files) {
      const s = JSON.parse(await readFile(path.join(dir, f), "utf8")) as ScoreFile;
      if (s.fixture_id) map.set(s.fixture_id, s);
    }
  } catch {
    // no scores yet
  }
  return map;
}

function mean(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

async function main() {
  const oldId = process.argv[2];
  const newId = process.argv[3];
  if (!oldId || !newId) {
    console.error(
      "Usage: npx tsx --tsconfig tsconfig.json eval/compare-baseline.ts <old_run_id> <new_run_id>",
    );
    process.exit(1);
  }

  const oldSum = await loadSummary(oldId);
  const newSum = await loadSummary(newId);
  const oldScores = await loadScores(oldId);
  const newScores = await loadScores(newId);

  console.log(`\nCompare baselines`);
  console.log(`  OLD: ${oldId}`);
  console.log(`  NEW: ${newId}`);
  if (oldSum.models) {
    console.log(`  old models: ${oldSum.models.pass1} / ${oldSum.models.pass2}`);
  }
  if (newSum.models) {
    console.log(`  new models: ${newSum.models.pass1} / ${newSum.models.pass2}`);
  }
  console.log("");

  const ids = [
    ...new Set([
      ...oldSum.results.map((r) => r.id),
      ...newSum.results.map((r) => r.id),
    ]),
  ].sort();

  const oldPts: number[] = [];
  const newPts: number[] = [];

  console.log(
    "fixture".padEnd(32) +
      "old".padStart(6) +
      "new".padStart(6) +
      "Δ".padStart(6) +
      "  hardΔ".padStart(8) +
      "  softΔ".padStart(8) +
      "  timeΔs".padStart(10),
  );
  console.log("-".repeat(80));

  for (const id of ids) {
    const o = oldSum.results.find((r) => r.id === id);
    const n = newSum.results.find((r) => r.id === id);
    const os = oldScores.get(id);
    const ns = newScores.get(id);

    const op =
      typeof os?.total_points === "number" ? os.total_points : null;
    const np =
      typeof ns?.total_points === "number" ? ns.total_points : null;
    if (op != null) oldPts.push(op);
    if (np != null) newPts.push(np);

    const dScore =
      op != null && np != null ? (np - op).toFixed(0) : "—";
    const dHard =
      o?.assertion_summary && n?.assertion_summary
        ? String(
            n.assertion_summary.hard_fail - o.assertion_summary.hard_fail,
          )
        : "—";
    const dSoft =
      o?.assertion_summary && n?.assertion_summary
        ? String(
            n.assertion_summary.soft_fail - o.assertion_summary.soft_fail,
          )
        : "—";
    const dTime =
      o?.elapsedMs != null && n?.elapsedMs != null
        ? ((n.elapsedMs - o.elapsedMs) / 1000).toFixed(0)
        : "—";

    console.log(
      id.padEnd(32) +
        String(op ?? "—").padStart(6) +
        String(np ?? "—").padStart(6) +
        String(dScore).padStart(6) +
        dHard.padStart(8) +
        dSoft.padStart(8) +
        dTime.padStart(10),
    );
  }

  const om = mean(oldPts);
  const nm = mean(newPts);
  console.log("-".repeat(80));
  console.log(
    "MEAN score".padEnd(32) +
      (om != null ? om.toFixed(1) : "—").padStart(6) +
      (nm != null ? nm.toFixed(1) : "—").padStart(6) +
      (om != null && nm != null ? (nm - om).toFixed(1) : "—").padStart(6),
  );

  const oldOk = oldSum.results.filter((r) => r.ok).length;
  const newOk = newSum.results.filter((r) => r.ok).length;
  console.log(`\nSuccess: old ${oldOk}/${oldSum.results.length} · new ${newOk}/${newSum.results.length}`);

  const newSoft = newSum.results.reduce(
    (a, r) => a + (r.assertion_summary?.soft_fail ?? 0),
    0,
  );
  const oldSoft = oldSum.results.reduce(
    (a, r) => a + (r.assertion_summary?.soft_fail ?? 0),
    0,
  );
  console.log(`Soft-fail total (sum): old ${oldSoft} · new ${newSoft} · Δ ${newSoft - oldSoft}`);
  console.log(
    `\nNote: score columns need filled scores/*.json. Assertions compare even without scores.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
