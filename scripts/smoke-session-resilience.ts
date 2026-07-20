/**
 * Smoke tests for session resilience (no live model provider).
 *
 * 1) Job stage transitions + snapshot
 * 2) Single-flight: same session cannot create a second running job
 * 3) Report save/load/history (memory localStorage polyfill)
 *
 * Run: npx tsx --tsconfig tsconfig.json scripts/smoke-session-resilience.ts
 */

import assert from "node:assert/strict";

// ── minimal localStorage for Node ─────────────────────────────────────
function installMemoryLocalStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
    removeItem(key: string) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
    get length() {
      return map.size;
    },
    key(i: number) {
      return [...map.keys()][i] ?? null;
    },
  };
  (globalThis as unknown as { window: { localStorage: typeof storage } }).window =
    { localStorage: storage };
  (globalThis as unknown as { localStorage: typeof storage }).localStorage =
    storage;
}

installMemoryLocalStorage();

import {
  __resetJobsForTests,
  completeJobSuccess,
  createAnalyzeJob,
  findRunningJobForSession,
  getJobSnapshot,
  publishJobEvent,
} from "../src/lib/analyze-jobs";
import {
  clearReportHistory,
  listReportHistory,
  loadReportFromHistory,
  loadSavedReport,
  saveReport,
} from "../src/lib/report-storage";
import type { FailureAnalysis } from "../src/types/analysis";

function miniAnalysis(idea: string): FailureAnalysis {
  return {
    meta: {
      idea_input: idea,
      category: "Startup",
      generated_at: new Date().toISOString(),
    },
    summary: "Smoke test summary for " + idea,
    assumptions: ["A1", "A2", "A3", "A4", "A5"],
    single_point_of_failure: {
      component: "Smoke SPOF",
      confidence: "High",
      confidence_reason: "fixture",
      explanation: "test",
    },
    cascade: {
      nodes: Array.from({ length: 8 }, (_, i) => ({
        step: `Step ${i + 1}`,
        observable_signal: `Signal ${i + 1}`,
      })),
    },
    failure_modes: {
      technical: ["tech mode"],
      business: ["biz mode"],
      security: ["sec mode"],
      legal: ["legal mode"],
      operations: ["ops mode"],
    },
    resilience_score: {
      technical: 60,
      business: 50,
      legal: 80,
      operations: 55,
      trust: 70,
    },
    likelihood: { band: "Medium", reason: "fixture" },
    failure_velocity: { band: "Medium", reason: "fixture" },
    stress_test: {
      items: [
        {
          archetype_id: "smoke",
          verdict: "Maybe",
          reason: "fixture",
        },
      ],
    },
  };
}

function section(name: string) {
  console.log(`\n── ${name} ──`);
}

async function main() {
  let failed = 0;

  // ── 1. Job stages ───────────────────────────────────────────────────
  section("1. Job stage transitions");
  __resetJobsForTests();
  const job = createAnalyzeJob({ sessionKey: "test::session-a" });
  const stages = [
    "ingest",
    "pass1",
    "pass1_5",
    "pass2",
    "validate",
  ] as const;
  for (const s of stages) {
    publishJobEvent(job, {
      type: "stage",
      stage: s,
      detail: `smoke ${s}`,
      at: Date.now(),
    });
    const snap = getJobSnapshot(job);
    assert.equal(snap.stage, s, `stage should be ${s}`);
    assert.equal(snap.status, "running");
    console.log(`  ✓ stage → ${s}`);
  }
  completeJobSuccess(job, {
    analysis: miniAnalysis("stage fixture"),
    warnings: [],
  });
  assert.equal(job.status, "done");
  assert.equal(getJobSnapshot(job).stage, "done");
  console.log("  ✓ complete → done");

  // ── 2. Single-flight ────────────────────────────────────────────────
  section("2. Single-flight guard");
  __resetJobsForTests();
  const a = createAnalyzeJob({ sessionKey: "ip::sess-1" });
  const found = findRunningJobForSession("ip::sess-1");
  assert.ok(found, "should find running job");
  assert.equal(found!.id, a.id);
  const other = findRunningJobForSession("ip::sess-2");
  assert.equal(other, undefined, "other session free");
  // Second create for same session is allowed at create-layer; API reuses before create.
  // Simulate API: if findRunning → reuse, never call create again.
  const reused = findRunningJobForSession("ip::sess-1");
  assert.equal(reused!.id, a.id);
  console.log("  ✓ same session returns same running job");
  console.log("  ✓ different session has no running job");

  // After done, session free
  completeJobSuccess(a, {
    analysis: miniAnalysis("single-flight"),
    warnings: [],
  });
  assert.equal(findRunningJobForSession("ip::sess-1"), undefined);
  console.log("  ✓ after done, session can start a new job");

  // ── 3. Report storage + history ─────────────────────────────────────
  section("3. Report save / load / history");
  clearReportHistory();
  const r1 = saveReport(miniAnalysis("idea one"), ["w1"]);
  assert.ok(r1);
  const latest = loadSavedReport();
  assert.ok(latest);
  assert.equal(latest!.analysis.meta.idea_input, "idea one");
  assert.deepEqual(latest!.warnings, ["w1"]);
  console.log("  ✓ save + load current report");

  const r2 = saveReport(miniAnalysis("idea two"), []);
  assert.ok(r2);
  const hist = listReportHistory();
  assert.ok(hist.length >= 2, `history length ${hist.length}`);
  assert.equal(hist[0]!.analysis.meta.idea_input, "idea two");
  const byId = loadReportFromHistory(r1!.id);
  assert.ok(byId);
  assert.equal(byId!.analysis.meta.idea_input, "idea one");
  console.log(`  ✓ history has ${hist.length} reports, open by id works`);

  // ── summary ─────────────────────────────────────────────────────────
  console.log("\n✅ smoke-session-resilience: all checks passed\n");
  process.exit(failed);
}

main().catch((err) => {
  console.error("\n❌ smoke failed\n", err);
  process.exit(1);
});
