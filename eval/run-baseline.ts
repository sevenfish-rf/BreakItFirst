/**
 * Local BYOK baseline runner for golden fixtures.
 *
 * Env (required):
 *   BIF_BASE_URL   — OpenAI-compatible root (e.g. https://api.openai.com/v1)
 *   BIF_API_KEY    — provider key (optional for local Ollama)
 *   BIF_PASS1_MODEL
 *   BIF_PASS2_MODEL
 *
 * Optional:
 *   BIF_LOCALE     — en | id (default: fixture locale or en)
 *   BIF_ONLY       — comma-separated fixture ids to run
 *   BIF_DEEP=1     — enable C.6 deep analysis (2× Pass 1)
 *
 * Usage:
 *   npm run eval:baseline
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Category } from "../src/lib/categories";
import { CATEGORIES } from "../src/lib/categories";
import { runFailureAnalysisPipeline } from "../src/lib/pipeline";
import {
  runRegressionAssertions,
  summarizeAssertions,
} from "./assertions";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = path.join(__dirname, "golden");
const BASELINES_DIR = path.join(__dirname, "baselines");

type GoldenFixture = {
  id: string;
  title: string;
  category: string;
  locale?: string;
  idea: string;
  focus_notes?: string[];
  expected_spof_themes?: string[];
};

function env(name: string, required = true): string {
  const v = process.env[name]?.trim() ?? "";
  if (required && !v) {
    throw new Error(
      `Missing env ${name}. Set BIF_BASE_URL, BIF_PASS1_MODEL, BIF_PASS2_MODEL (and BIF_API_KEY if needed).`,
    );
  }
  return v;
}

function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

async function loadFixtures(only?: Set<string>): Promise<GoldenFixture[]> {
  const files = (await readdir(GOLDEN_DIR))
    .filter((f) => f.endsWith(".json"))
    .sort();
  const fixtures: GoldenFixture[] = [];
  for (const file of files) {
    const raw = await readFile(path.join(GOLDEN_DIR, file), "utf8");
    const parsed = JSON.parse(raw) as GoldenFixture;
    if (only && !only.has(parsed.id)) continue;
    fixtures.push(parsed);
  }
  return fixtures;
}

function stamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function main() {
  const baseUrl = env("BIF_BASE_URL");
  const apiKey = env("BIF_API_KEY", false);
  const pass1Model = env("BIF_PASS1_MODEL");
  const pass2Model = env("BIF_PASS2_MODEL");
  const onlyRaw = process.env.BIF_ONLY?.trim();
  const only = onlyRaw
    ? new Set(onlyRaw.split(",").map((s) => s.trim()).filter(Boolean))
    : undefined;

  const fixtures = await loadFixtures(only);
  if (fixtures.length === 0) {
    console.error("No golden fixtures found.");
    process.exit(1);
  }

  const runId = stamp();
  const runDir = path.join(BASELINES_DIR, runId);
  const rawDir = path.join(runDir, "raw");
  const scoresDir = path.join(runDir, "scores");
  await mkdir(rawDir, { recursive: true });
  await mkdir(scoresDir, { recursive: true });

  const deepAnalysis =
    process.env.BIF_DEEP === "1" || process.env.BIF_DEEP === "true";
  /** Per provider call timeout (ms). Default 6 min — slow “pro” models. */
  const callTimeoutMs = Number(process.env.BIF_CALL_TIMEOUT_MS ?? 360_000);

  console.log(`\nBreakItFirst eval baseline — run ${runId}`);
  console.log(`Fixtures: ${fixtures.length}`);
  console.log(`Pass1: ${pass1Model} · Pass2: ${pass2Model}`);
  console.log(`Deep: ${deepAnalysis ? "yes" : "no"}`);
  console.log(`Per-call timeout: ${Math.round(callTimeoutMs / 1000)}s`);
  console.log(`Out: ${runDir}`);
  console.log(
    `\nNote: each fixture = Pass1 + Pass1.5 + Pass2 (3+ API calls).`,
  );
  console.log(
    `Slow models can sit silent for several minutes — heartbeat prints every 20s.\n`,
  );

  const summary: {
    run_id: string;
    models: { pass1: string; pass2: string; baseUrl: string };
    results: Array<Record<string, unknown>>;
  } = {
    run_id: runId,
    models: { pass1: pass1Model, pass2: pass2Model, baseUrl },
    results: [],
  };

  for (const fixture of fixtures) {
    if (!isCategory(fixture.category)) {
      console.error(`[skip] ${fixture.id}: invalid category ${fixture.category}`);
      summary.results.push({
        id: fixture.id,
        ok: false,
        error: `invalid category: ${fixture.category}`,
      });
      continue;
    }

    const locale =
      (process.env.BIF_LOCALE as "en" | "id" | undefined) ??
      (fixture.locale === "id" ? "id" : "en");

    console.log(`→ ${fixture.id} (${fixture.category})`);
    const started = Date.now();

    const heartbeat = setInterval(() => {
      const s = Math.round((Date.now() - started) / 1000);
      console.log(
        `  … still working on ${fixture.id} (${s}s elapsed — waiting on provider)`,
      );
    }, 20_000);

    const controller = new AbortController();
    // Overall fixture budget: ~3.5 calls with headroom
    const fixtureBudget = callTimeoutMs * (deepAnalysis ? 5 : 3.5);
    const budgetTimer = setTimeout(
      () => controller.abort(),
      Math.max(callTimeoutMs, fixtureBudget),
    );

    let result;
    try {
      result = await runFailureAnalysisPipeline({
        idea: fixture.idea,
        category: fixture.category,
        locale,
        deepAnalysis,
        signal: controller.signal,
        provider: {
          baseUrl,
          apiKey,
          pass1Model,
          pass2Model,
        },
      });
    } finally {
      clearInterval(heartbeat);
      clearTimeout(budgetTimer);
    }

    const elapsedMs = Date.now() - started;

    if (!result.ok) {
      console.log(`FAIL (${elapsedMs}ms) ${result.code}: ${result.message}`);
      const failPath = path.join(rawDir, `${fixture.id}.error.json`);
      await writeFile(
        failPath,
        JSON.stringify({ fixture, result, elapsedMs }, null, 2),
        "utf8",
      );
      summary.results.push({
        id: fixture.id,
        ok: false,
        code: result.code,
        message: result.message,
        elapsedMs,
      });
      continue;
    }

    const assertions = runRegressionAssertions(result.analysis);
    const assertionSummary = summarizeAssertions(assertions);

    const out = {
      fixture_id: fixture.id,
      title: fixture.title,
      focus_notes: fixture.focus_notes ?? [],
      expected_spof_themes: fixture.expected_spof_themes ?? [],
      elapsedMs,
      warnings: result.warnings,
      assertions,
      assertion_summary: assertionSummary,
      analysis: result.analysis,
      // Slot for manual scoring — copy score-template.json here and fill.
      manual_score: null as null,
    };

    await writeFile(
      path.join(rawDir, `${fixture.id}.json`),
      JSON.stringify(out, null, 2),
      "utf8",
    );

    // Empty score stub pointing scorer at rubric
    const scoreStub = {
      fixture_id: fixture.id,
      baseline_run_id: runId,
      scored_at: "",
      scorer: "",
      model_pass1: pass1Model,
      model_pass2: pass2Model,
      status: "pending_manual_score",
      note: "Copy criteria from eval/score-template.json and fill 0|1|2 per rubric.md",
      criteria: null,
      total_points: null,
      max_points: 34,
    };
    await writeFile(
      path.join(scoresDir, `${fixture.id}.json`),
      JSON.stringify(scoreStub, null, 2),
      "utf8",
    );

    const hard = assertionSummary.hard_fail === 0 ? "hard✓" : `hard✗${assertionSummary.hard_fail}`;
    const soft = assertionSummary.soft_fail === 0 ? "soft✓" : `soft✗${assertionSummary.soft_fail}`;
    console.log(`OK (${elapsedMs}ms) ${hard} ${soft}`);

    summary.results.push({
      id: fixture.id,
      ok: true,
      elapsedMs,
      warnings: result.warnings,
      assertion_summary: assertionSummary,
      spof: result.analysis.single_point_of_failure.component,
      likelihood: result.analysis.likelihood.band,
    });
  }

  await writeFile(
    path.join(runDir, "summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );

  const okCount = summary.results.filter((r) => r.ok).length;
  console.log(`\nDone. ${okCount}/${fixtures.length} analyses succeeded.`);
  console.log(`Summary: ${path.join(runDir, "summary.json")}`);
  console.log(
    `Next: score manually using eval/rubric.md → fill scores/*.json (max 34 pts).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
