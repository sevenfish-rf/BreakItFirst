/**
 * K7 — locale calibration drift ("Bahasa menggeser hasil").
 *
 * The dogfood runs recorded that the SAME idea can come out with different bands
 * depending on the output locale (one idea: Very High / Fast / trust-10 under
 * `id` versus High / Medium / trust-15 under `en`). If `id` reports are
 * systematically more alarmist than `en` on the same idea, that is a calibration
 * defect that touches the product claim — and nothing measured it. This harness
 * is the N1 "locale-flip variant" the analysis proposed.
 *
 * What it does: for each golden fixture it runs the IDENTICAL idea text twice —
 * once with the `en` output directive, once with `id` — holding mode constant
 * (standard unless BIF_DEEP=1). Only the language directive changes, so the run
 * pair isolates the locale effect from any idea-language or mode effect.
 *
 * What it compares: the three band ENUMS the model must emit in English in BOTH
 * locales (languageDirective keeps confidence/likelihood/velocity enums English,
 * only prose is translated), so they are directly comparable across locales:
 *   - single_point_of_failure.confidence
 *   - likelihood.band
 *   - failure_velocity.band
 * The SPOF component/explanation is prose and differs by language, so it is shown
 * side by side for a human read but is NOT the verdict (English theme stems don't
 * match Indonesian prose — cross-language theme-diff is deliberately out of scope).
 *
 * HONEST CAVEAT: a single en/id pair cannot separate locale drift from ordinary
 * run-to-run model noise — the same confound the SPOF stability harness carries.
 * Read `band-drift` as a screen to investigate (alongside the same-locale noise
 * already measured), not as proof of a locale effect. Repeat pairs to be sure.
 *
 * Env (required): BIF_BASE_URL, BIF_PASS1_MODEL, BIF_PASS2_MODEL (BIF_API_KEY if needed)
 * Optional:
 *   BIF_ONLY        — comma-separated golden ids (default: all)
 *   BIF_DEEP=1      — run deep mode on both sides (default: standard)
 *   BIF_CALL_TIMEOUT_MS
 *   BIF_LOCALE_GATE=1 — exit non-zero if any fixture shows band-drift
 *
 * Usage: npm run eval:locale-flip
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { Category } from "../src/lib/categories";
import { CATEGORIES } from "../src/lib/categories";
import { runFailureAnalysisPipeline } from "../src/lib/pipeline";
import type { FailureAnalysis } from "../src/types/analysis";
import { describeSide, loadThemeKeywords } from "./hinge-labels";
import { hostOf } from "./provider-host";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = path.join(__dirname, "golden");
const OUT_ROOT = path.join(__dirname, "locale-flip");

type FlipLocale = "en" | "id";

type Fixture = {
  id: string;
  title: string;
  category: string;
  locale?: string;
  idea: string;
  expected_spof_themes?: string[];
};

/** The three English band enums that must be locale-invariant. */
export type Bands = {
  confidence: string;
  likelihood: string;
  velocity: string;
};

export type BandComparison = {
  verdict: "stable" | "band-drift";
  /** One entry per band that moved, e.g. "likelihood: High → Very High". */
  moves: string[];
};

/** Pure diff of two band sets — exported so the offline check can exercise it. */
export function compareBands(en: Bands, id: Bands): BandComparison {
  const moves: string[] = [];
  const check = (name: string, a: string, b: string) => {
    if (a !== b) moves.push(`${name}: ${a} → ${b}`);
  };
  check("confidence", en.confidence, id.confidence);
  check("likelihood", en.likelihood, id.likelihood);
  check("velocity", en.velocity, id.velocity);
  return { verdict: moves.length === 0 ? "stable" : "band-drift", moves };
}

function bandsOf(a: FailureAnalysis): Bands {
  return {
    confidence: a.single_point_of_failure.confidence,
    likelihood: a.likelihood.band,
    velocity: a.failure_velocity.band,
  };
}

// PLACEHOLDER_HELPERS

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

function stamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function loadGoldens(): Promise<Fixture[]> {
  const files = (await readdir(GOLDEN_DIR)).filter((f) => f.endsWith(".json")).sort();
  const out: Fixture[] = [];
  for (const file of files) {
    out.push(JSON.parse(await readFile(path.join(GOLDEN_DIR, file), "utf8")) as Fixture);
  }
  return out;
}

function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v).replace(/\|/g, "\\|");
}

type RunCfg = {
  baseUrl: string;
  apiKey: string;
  pass1Model: string;
  pass2Model: string;
  deepAnalysis: boolean;
  callTimeoutMs: number;
  rawDir: string;
};

/** One SPOF component + bands for one locale, or an error marker. */
type SideResult =
  | { ok: true; bands: Bands; spof: string; primary_theme: string | null; elapsed_ms: number }
  | { ok: false; error: string };

async function runSide(
  fixture: Fixture,
  locale: FlipLocale,
  cfg: RunCfg,
  keywords: Awaited<ReturnType<typeof loadThemeKeywords>>,
): Promise<SideResult> {
  console.log(`  → ${fixture.id} [${locale}]`);
  const started = Date.now();
  const heartbeat = setInterval(() => {
    const s = Math.round((Date.now() - started) / 1000);
    console.log(`    … ${fixture.id} [${locale}] (${s}s — waiting on provider)`);
  }, 20_000);

  const controller = new AbortController();
  const budget = cfg.callTimeoutMs * (cfg.deepAnalysis ? 5 : 3.5);
  const budgetTimer = setTimeout(
    () => controller.abort(),
    Math.max(cfg.callTimeoutMs, budget),
  );

  let result;
  try {
    result = await runFailureAnalysisPipeline({
      idea: fixture.idea,
      category: fixture.category as Category,
      locale,
      deepAnalysis: cfg.deepAnalysis,
      signal: controller.signal,
      provider: {
        baseUrl: cfg.baseUrl,
        apiKey: cfg.apiKey,
        pass1Model: cfg.pass1Model,
        pass2Model: cfg.pass2Model,
      },
    });
  } finally {
    clearInterval(heartbeat);
    clearTimeout(budgetTimer);
  }

  const elapsedMs = Date.now() - started;
  if (!result.ok) {
    console.log(`    FAIL ${result.code}: ${result.message}`);
    return { ok: false, error: `${result.code}: ${result.message}` };
  }

  // Raw dump per locale — idea text + full output, local dev only (gitignored).
  await writeFile(
    path.join(cfg.rawDir, `${fixture.id}.${locale}.json`),
    JSON.stringify({ fixture, locale, warnings: result.warnings, elapsedMs, analysis: result.analysis }, null, 2),
    "utf8",
  );

  const spof = result.analysis.single_point_of_failure;
  // Opportunistic theme read — meaningful for the en side; id prose will usually
  // abstain against English stems, which is expected and not the verdict.
  const expected = fixture.expected_spof_themes ?? [];
  const side = describeSide(`${spof.component}. ${spof.explanation}`, expected, keywords);
  const bands = bandsOf(result.analysis);
  console.log(
    `    OK (${elapsedMs}ms) ${bands.confidence}/${bands.likelihood}/${bands.velocity} — ${spof.component}`,
  );
  return { ok: true, bands, spof: spof.component, primary_theme: side.primary, elapsed_ms: elapsedMs };
}

// PLACEHOLDER_REPORT

type FixtureResult = {
  id: string;
  category: string;
  en: SideResult;
  id_side: SideResult;
  comparison: BandComparison | null;
};

function bandCell(s: SideResult): string {
  if (!s.ok) return "**failed**";
  return `${s.bands.confidence} / ${s.bands.likelihood} / ${s.bands.velocity}`;
}

function verdictOf(r: FixtureResult): string {
  if (!r.comparison) return "failed";
  return r.comparison.verdict;
}

const VERDICT_MARK: Record<string, string> = {
  stable: "✓ stable",
  "band-drift": "✗ band-drift",
  failed: "! failed",
};

function buildReport(runId: string, cfg: RunCfg, results: FixtureResult[]): string {
  const lines: string[] = [];
  lines.push(`# Locale-flip run — ${runId}`);
  lines.push("");
  lines.push(
    `Pass 1 \`${cfg.pass1Model}\` · Pass 2 \`${cfg.pass2Model}\` · ${cfg.deepAnalysis ? "deep" : "standard"} · host \`${hostOf(cfg.baseUrl)}\` · same idea, \`en\` vs \`id\``,
  );
  lines.push("");
  lines.push(
    "**What this measures:** whether the three English band enums " +
      "(confidence / likelihood / velocity) stay put when only the output " +
      "language directive changes. **What it can't:** one en/id pair cannot tell " +
      "a locale effect from ordinary run-to-run model noise — read `band-drift` " +
      "as a screen to investigate against the same-locale noise already measured, " +
      "not as proof. Bands are `confidence / likelihood / velocity`.",
  );
  lines.push("");
  lines.push("| Fixture | en bands | id bands | Verdict | Band moves | SPOF (en) | SPOF (id) |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const r of results) {
    const moves = r.comparison?.moves.length ? r.comparison.moves.join("; ") : "—";
    lines.push(
      [
        `| ${r.id}`,
        bandCell(r.en),
        bandCell(r.id_side),
        `**${VERDICT_MARK[verdictOf(r)] ?? verdictOf(r)}**`,
        cell(moves),
        cell(r.en.ok ? r.en.spof : r.en.error),
        cell(r.id_side.ok ? r.id_side.spof : r.id_side.error),
      ].join(" | ") + " |",
    );
  }
  lines.push("");

  const drift = results.filter((r) => verdictOf(r) === "band-drift");
  const stable = results.filter((r) => verdictOf(r) === "stable");
  const failed = results.filter((r) => verdictOf(r) === "failed");
  const perBand = (name: string) =>
    results.filter((r) => r.comparison?.moves.some((m) => m.startsWith(`${name}:`))).length;

  lines.push("## Rollup");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|---|---|");
  lines.push(`| Fixtures | ${results.length} |`);
  lines.push(`| ✓ stable | ${stable.length} |`);
  lines.push(`| ✗ band-drift | ${drift.length} |`);
  lines.push(`| ! failed side | ${failed.length} |`);
  lines.push(`| confidence moved | ${perBand("confidence")} |`);
  lines.push(`| likelihood moved | ${perBand("likelihood")} |`);
  lines.push(`| velocity moved | ${perBand("velocity")} |`);
  lines.push("");
  lines.push(
    "A `band-drift` is evidence for the K7 complaint that locale shifts the " +
      "result; `stable` is evidence against it. Because a single pair cannot " +
      "separate locale from noise, do not treat this as a calibration finding " +
      "until it repeats — and do NOT edit `prompts.ts` off one run. Record the " +
      "counts + model ids in backlog Q16 (a number without a model id is not " +
      "comparable to the next run). SPOF prose differs by language by design; the " +
      "component columns are for a human read, not a verdict.",
  );
  lines.push("");
  return lines.join("\n");
}

// PLACEHOLDER_MAIN

async function main() {
  const baseUrl = env("BIF_BASE_URL");
  const apiKey = env("BIF_API_KEY", false);
  const pass1Model = env("BIF_PASS1_MODEL");
  const pass2Model = env("BIF_PASS2_MODEL");
  const onlyRaw = process.env.BIF_ONLY?.trim();
  const only = onlyRaw
    ? new Set(onlyRaw.split(",").map((s) => s.trim()).filter(Boolean))
    : undefined;
  const gate =
    process.env.BIF_LOCALE_GATE === "1" || process.env.BIF_LOCALE_GATE === "true";

  const keywords = await loadThemeKeywords();
  const goldens = (await loadGoldens()).filter((g) => !only || only.has(g.id));

  const jobs = goldens.filter((g) => {
    if (!isCategory(g.category)) {
      console.error(`[skip] ${g.id}: invalid category ${g.category}`);
      return false;
    }
    return true;
  });
  if (jobs.length === 0) {
    console.error("No goldens to run (check BIF_ONLY).");
    process.exit(1);
  }

  const runId = stamp();
  const runDir = path.join(OUT_ROOT, runId);
  const rawDir = path.join(runDir, "raw");
  await mkdir(rawDir, { recursive: true });

  const cfg: RunCfg = {
    baseUrl,
    apiKey,
    pass1Model,
    pass2Model,
    deepAnalysis: process.env.BIF_DEEP === "1" || process.env.BIF_DEEP === "true",
    callTimeoutMs: Number(process.env.BIF_CALL_TIMEOUT_MS ?? 360_000),
    rawDir,
  };

  console.log(`\nBreakItFirst locale-flip — run ${runId}`);
  console.log(`Fixtures: ${jobs.length} · analyses: ${jobs.length * 2} (each idea × en + id)`);
  console.log(`Pass1: ${pass1Model} · Pass2: ${pass2Model} · Deep: ${cfg.deepAnalysis ? "yes" : "no"}`);
  if (gate) console.log(`Gate: on — exits non-zero if any fixture shows band-drift`);
  console.log(`Out: ${runDir}`);
  console.log(`\nEach analysis is 3+ provider calls, so this run is ${jobs.length * 2 * 3}+ calls.\n`);

  const results: FixtureResult[] = [];
  for (const fixture of jobs) {
    console.log(`▸ ${fixture.id}`);
    const en = await runSide(fixture, "en", cfg, keywords);
    const idSide = await runSide(fixture, "id", cfg, keywords);
    const comparison =
      en.ok && idSide.ok ? compareBands(en.bands, idSide.bands) : null;
    if (comparison) {
      console.log(
        `    verdict: ${comparison.verdict}${comparison.moves.length ? ` — ${comparison.moves.join("; ")}` : ""}`,
      );
    }
    results.push({ id: fixture.id, category: fixture.category, en, id_side: idSide, comparison });

    // Written after every fixture — a run that dies late keeps earlier results.
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        // Host only, never the full base URL — see eval/provider-host.ts.
        { run_id: runId, models: { pass1: pass1Model, pass2: pass2Model, host: hostOf(baseUrl) }, deep: cfg.deepAnalysis, results },
        null,
        2,
      ),
      "utf8",
    );
    await writeFile(path.join(runDir, "REPORT.md"), buildReport(runId, cfg, results), "utf8");
  }

  const drift = results.filter((r) => verdictOf(r) === "band-drift");
  const failed = results.filter((r) => verdictOf(r) === "failed");
  console.log(`\nDone. ${results.length} fixtures.`);
  console.log(
    `Verdicts: ${results.filter((r) => verdictOf(r) === "stable").length} stable · ` +
      `${drift.length} band-drift · ${failed.length} failed`,
  );
  console.log(`Report: ${path.join(runDir, "REPORT.md")}`);
  console.log(`Next: record counts + model ids in Q16 (docs/04-refine-backlog.md).`);

  if (gate && drift.length > 0) {
    console.error(
      `\nGate failed: ${drift.length} fixture(s) drifted — ${drift.map((r) => r.id).join(", ")}`,
    );
    process.exit(1);
  }
}

// Run only when invoked directly (npm run eval:locale-flip), not when a test or
// the offline check imports `compareBands`/`Bands` — importing must be side-effect free.
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
