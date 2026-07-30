/**
 * Q10 — SPOF label stability harness.
 *
 * The 34-point rubric is saturated (all three 2026-07-16 baselines score
 * 33–34/34 with zero hard/soft failures, and that baseline's own summary says
 * "ceiling already high at 33.8"), so re-scoring cannot detect the instability
 * the dogfood runs describe. What can: run the *same mechanism* twice — once as
 * written in eval/golden, once as a full paraphrase in eval/golden-variants —
 * and put the two SPOF labels side by side. A hinge that changes when only the
 * wording changes was never load-bearing.
 *
 * This deliberately does NOT decide same/different itself. "OEM-owned firmware"
 * and "vendor firmware dependency" are one hinge in two phrasings; no string
 * comparison gets that right. The report leaves a blank verdict column for a
 * human, and records everything needed to fill it.
 *
 * Env (required):
 *   BIF_BASE_URL, BIF_PASS1_MODEL, BIF_PASS2_MODEL   (BIF_API_KEY if provider needs it)
 *
 * Optional:
 *   BIF_LOCALE, BIF_DEEP=1, BIF_CALL_TIMEOUT_MS
 *   BIF_ONLY       — comma-separated base fixture ids
 *   BIF_REF        — baselines/<run_id> to diff labels against (e.g. 2026-07-16_230859)
 *
 * Usage:
 *   npm run eval:stability
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Category } from "../src/lib/categories";
import { CATEGORIES } from "../src/lib/categories";
import { runFailureAnalysisPipeline } from "../src/lib/pipeline";
import type { FailureAnalysis } from "../src/types/analysis";
import { runRegressionAssertions, summarizeAssertions } from "./assertions";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = path.join(__dirname, "golden");
const VARIANTS_DIR = path.join(__dirname, "golden-variants");
const OUT_ROOT = path.join(__dirname, "stability");
const BASELINES_DIR = path.join(__dirname, "baselines");

type Fixture = {
  id: string;
  variant_of?: string;
  title: string;
  category: string;
  locale?: string;
  idea: string;
  focus_notes?: string[];
  expected_spof_themes?: string[];
};

/** One side of a pair, reduced to the fields worth comparing. */
type Labels = {
  spof: string;
  spof_confidence: string;
  likelihood: string;
  velocity: string;
  cascade_steps: number;
  ponr_step: string | null;
  assumptions: number;
  critical_assumption_indices: number[] | null;
  empty_domains: string[];
  hard_fail: number;
  soft_fail: number;
  warnings: string[];
  elapsed_ms: number;
};

type PairResult = {
  base_id: string;
  variant_id: string;
  category: string;
  expected_spof_themes: string[];
  original: Labels | { error: string };
  variant: Labels | { error: string };
  /** Filled by a human after reading both explanations. */
  same_hinge: null;
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

function stamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function loadDir(dir: string): Promise<Fixture[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  const out: Fixture[] = [];
  for (const file of files) {
    out.push(JSON.parse(await readFile(path.join(dir, file), "utf8")) as Fixture);
  }
  return out;
}

function toLabels(
  analysis: FailureAnalysis,
  elapsedMs: number,
  warnings: string[],
): Labels {
  const assertionSummary = summarizeAssertions(runRegressionAssertions(analysis));
  const ponrIndex = analysis.cascade.point_of_no_return_index;
  const modes = analysis.failure_modes;
  const emptyDomains = (
    ["technical", "business", "security", "legal", "operations"] as const
  ).filter((k) => modes[k].length === 0);
  return {
    spof: analysis.single_point_of_failure.component,
    spof_confidence: analysis.single_point_of_failure.confidence,
    likelihood: analysis.likelihood.band,
    velocity: analysis.failure_velocity.band,
    cascade_steps: analysis.cascade.nodes.length,
    ponr_step:
      typeof ponrIndex === "number" && analysis.cascade.nodes[ponrIndex]
        ? analysis.cascade.nodes[ponrIndex].step
        : null,
    assumptions: analysis.assumptions.length,
    critical_assumption_indices:
      analysis.single_point_of_failure.critical_assumption_indices ?? null,
    empty_domains: emptyDomains,
    hard_fail: assertionSummary.hard_fail,
    soft_fail: assertionSummary.soft_fail,
    warnings,
    elapsed_ms: elapsedMs,
  };
}

type RunEnv = {
  baseUrl: string;
  apiKey: string;
  pass1Model: string;
  pass2Model: string;
  deepAnalysis: boolean;
  callTimeoutMs: number;
  localeOverride?: "en" | "id";
  rawDir: string;
};

/** Runs one fixture and returns its labels, or an error marker. */
async function runOne(
  fixture: Fixture,
  cfg: RunEnv,
): Promise<Labels | { error: string }> {
  if (!isCategory(fixture.category)) {
    return { error: `invalid category: ${fixture.category}` };
  }
  const locale =
    cfg.localeOverride ?? (fixture.locale === "id" ? "id" : "en");

  console.log(`  → ${fixture.id}`);
  const started = Date.now();
  const heartbeat = setInterval(() => {
    const s = Math.round((Date.now() - started) / 1000);
    console.log(`    … ${fixture.id} (${s}s — waiting on provider)`);
  }, 20_000);

  const controller = new AbortController();
  const fixtureBudget = cfg.callTimeoutMs * (cfg.deepAnalysis ? 5 : 3.5);
  const budgetTimer = setTimeout(
    () => controller.abort(),
    Math.max(cfg.callTimeoutMs, fixtureBudget),
  );

  let result;
  try {
    result = await runFailureAnalysisPipeline({
      idea: fixture.idea,
      category: fixture.category,
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
    return { error: `${result.code}: ${result.message}` };
  }

  // Full analysis is kept on disk — the report only carries the labels, but a
  // human deciding "same hinge?" needs the SPOF explanation prose.
  await writeFile(
    path.join(cfg.rawDir, `${fixture.id}.json`),
    JSON.stringify({ fixture, warnings: result.warnings, elapsedMs, analysis: result.analysis }, null, 2),
    "utf8",
  );

  const labels = toLabels(result.analysis, elapsedMs, result.warnings);
  console.log(`    OK (${elapsedMs}ms) SPOF: ${labels.spof}`);
  return labels;
}

/** Labels from a previous baselines/<run_id>/summary.json, if asked for. */
async function loadReference(
  runId: string,
): Promise<Map<string, { spof: string; likelihood: string }>> {
  const map = new Map<string, { spof: string; likelihood: string }>();
  const file = path.join(BASELINES_DIR, runId, "summary.json");
  const parsed = JSON.parse(await readFile(file, "utf8")) as {
    results?: Array<{ id?: string; spof?: string; likelihood?: string }>;
  };
  for (const r of parsed.results ?? []) {
    if (r.id && r.spof) {
      map.set(r.id, { spof: r.spof, likelihood: r.likelihood ?? "?" });
    }
  }
  return map;
}

function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v).replace(/\|/g, "\\|");
}

function labelRow(side: string, l: Labels | { error: string }): string {
  if ("error" in l)
    return `| ${side} | **failed** | ${cell(l.error)} | — | — | — | — | — | — |`;
  return [
    `| ${side}`,
    cell(l.spof),
    cell(l.spof_confidence),
    cell(l.likelihood),
    cell(l.velocity),
    cell(l.cascade_steps),
    cell(l.ponr_step),
    cell(l.empty_domains.length ? l.empty_domains.join(", ") : "none"),
    `${l.hard_fail}/${l.soft_fail} |`,
  ].join(" | ");
}

function buildReport(
  runId: string,
  cfg: RunEnv,
  pairs: PairResult[],
  reference: Map<string, { spof: string; likelihood: string }> | null,
  referenceId: string | undefined,
): string {
  const lines: string[] = [];
  lines.push(`# SPOF stability run — ${runId}`);
  lines.push("");
  lines.push(
    `Pass 1 \`${cfg.pass1Model}\` · Pass 2 \`${cfg.pass2Model}\` · ${cfg.deepAnalysis ? "deep" : "standard"} · host \`${(() => {
      try {
        return new URL(cfg.baseUrl).host;
      } catch {
        return "unknown";
      }
    })()}\``,
  );
  lines.push("");
  lines.push(
    "Each pair is the **same mechanism** twice: `original` as written in " +
      "`eval/golden`, `paraphrase` as rewritten in `eval/golden-variants` with " +
      "no distinctive wording carried over. The question is not whether the " +
      "score moved — the rubric is saturated — but whether the hinge survived " +
      "the rewrite.",
  );
  lines.push("");
  lines.push(
    "**Fill `Same hinge?` by hand** (`yes` / `no` / `partial`) after reading " +
      "both SPOF explanations in `raw/`. String comparison is not a substitute: " +
      "two phrasings of one hinge must count as `yes`.",
  );
  lines.push("");

  for (const p of pairs) {
    lines.push(`## ${p.base_id} (${p.category})`);
    lines.push("");
    lines.push(`Expected themes: ${p.expected_spof_themes.join(", ") || "—"}`);
    lines.push("");
    lines.push(
      "| Side | SPOF | Conf | Likelihood | Velocity | Steps | PONR step | Empty domains | hard/soft |",
    );
    lines.push("|---|---|---|---|---|---|---|---|---|");
    lines.push(labelRow("original", p.original));
    lines.push(labelRow("paraphrase", p.variant));
    if (reference) {
      const ref = reference.get(p.base_id);
      lines.push(
        `| ref ${referenceId ?? ""} | ${cell(ref?.spof)} | — | ${cell(ref?.likelihood)} | — | — | — | — | — |`,
      );
    }
    lines.push("");
    lines.push("**Same hinge?** `TODO`");
    lines.push("");
    lines.push("**Note:** ");
    lines.push("");
  }

  lines.push("## Rollup");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|---|---|");
  lines.push(`| Pairs run | ${pairs.length} |`);
  const failed = pairs.filter(
    (p) => "error" in p.original || "error" in p.variant,
  ).length;
  lines.push(`| Pairs with a failed side | ${failed} |`);
  lines.push(`| Same-hinge count | fill after judging |`);
  lines.push("");
  lines.push(
    "A pair whose hinge changed under paraphrase is evidence for the dogfood " +
      "complaint that SPOF selection is unstable; a pair that held is evidence " +
      "against it. Record the count here, then update backlog Q10.",
  );
  lines.push("");
  return lines.join("\n");
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
  const referenceId = process.env.BIF_REF?.trim() || undefined;

  const originals = await loadDir(GOLDEN_DIR);
  const variants = await loadDir(VARIANTS_DIR);
  const variantByBase = new Map<string, Fixture>();
  for (const v of variants) {
    if (!v.variant_of) {
      console.error(`[skip] ${v.id}: variant has no "variant_of"`);
      continue;
    }
    variantByBase.set(v.variant_of, v);
  }

  const jobs = originals
    .filter((o) => !only || only.has(o.id))
    .map((o) => ({ original: o, variant: variantByBase.get(o.id) }))
    .filter((j): j is { original: Fixture; variant: Fixture } => {
      if (!j.variant) {
        console.error(`[skip] ${j.original.id}: no paraphrase variant found`);
        return false;
      }
      return true;
    });

  if (jobs.length === 0) {
    console.error("No original/variant pairs to run.");
    process.exit(1);
  }

  const runId = stamp();
  const runDir = path.join(OUT_ROOT, runId);
  const rawDir = path.join(runDir, "raw");
  await mkdir(rawDir, { recursive: true });

  const cfg: RunEnv = {
    baseUrl,
    apiKey,
    pass1Model,
    pass2Model,
    deepAnalysis:
      process.env.BIF_DEEP === "1" || process.env.BIF_DEEP === "true",
    callTimeoutMs: Number(process.env.BIF_CALL_TIMEOUT_MS ?? 360_000),
    localeOverride: process.env.BIF_LOCALE as "en" | "id" | undefined,
    rawDir,
  };

  let reference: Map<string, { spof: string; likelihood: string }> | null = null;
  if (referenceId) {
    try {
      reference = await loadReference(referenceId);
    } catch (err) {
      console.error(
        `[warn] could not read baselines/${referenceId}/summary.json — continuing without reference (${String(err)})`,
      );
    }
  }

  console.log(`\nBreakItFirst SPOF stability — run ${runId}`);
  console.log(`Pairs: ${jobs.length} (${jobs.length * 2} analyses)`);
  console.log(`Pass1: ${pass1Model} · Pass2: ${pass2Model}`);
  console.log(`Deep: ${cfg.deepAnalysis ? "yes" : "no"}`);
  if (referenceId) console.log(`Reference labels: baselines/${referenceId}`);
  console.log(`Out: ${runDir}`);
  console.log(
    `\nEach analysis is 3+ provider calls, so a full run is ${jobs.length * 2 * 3}+ calls.`,
  );
  console.log(`Heartbeat prints every 20s while a call is in flight.\n`);

  const pairs: PairResult[] = [];
  for (const job of jobs) {
    console.log(`▸ ${job.original.id}`);
    const original = await runOne(job.original, cfg);
    const variant = await runOne(job.variant, cfg);
    pairs.push({
      base_id: job.original.id,
      variant_id: job.variant.id,
      category: job.original.category,
      expected_spof_themes: job.original.expected_spof_themes ?? [],
      original,
      variant,
      same_hinge: null,
    });
    // Written after every pair, not at the end — a run that dies on pair 4
    // must not throw away pairs 1-3.
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          run_id: runId,
          models: { pass1: pass1Model, pass2: pass2Model, baseUrl },
          deep: cfg.deepAnalysis,
          reference_run_id: referenceId ?? null,
          pairs,
        },
        null,
        2,
      ),
      "utf8",
    );
    await writeFile(
      path.join(runDir, "REPORT.md"),
      buildReport(runId, cfg, pairs, reference, referenceId),
      "utf8",
    );
  }

  console.log(`\nDone. ${pairs.length} pairs.`);
  console.log(`Report: ${path.join(runDir, "REPORT.md")}`);
  console.log(
    `Next: read raw/*.json, fill "Same hinge?" per pair, then update Q10 in docs/04-refine-backlog.md.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
