/**
 * Q10 — SPOF label stability harness.
 *
 * The 34-point rubric is saturated (all three 2026-07-16 baselines score
 * 33–34/34 with zero hard/soft failures, and that baseline's own summary says
 * "ceiling already high at 33.8"), so re-scoring cannot detect the instability
 * the dogfood runs describe. What can: run the *same mechanism* several times —
 * once as written in eval/golden, then once per rewrite in eval/golden-variants —
 * and put the SPOF labels side by side. A hinge that changes when only the
 * wording changes was never load-bearing.
 *
 * Three rewrite kinds, each aimed at a different way the hinge can be an
 * artifact of the text rather than of the idea:
 *
 *   para   full paraphrase, no distinctive wording carried over
 *          → is the hinge tied to vocabulary?
 *   strip  proper nouns, comparators and place names removed, every structural
 *          quantity and relationship kept
 *          → is the hinge tied to recognisable brands/geography?
 *   flip   same facts, presentation order reversed and register changed to a
 *          founder pitch
 *          → is the hinge tied to what happened to be mentioned first?
 *
 * Each variant gets an automatic verdict from eval/hinge-labels.ts, which
 * compares themes rather than strings so that two phrasings of one hinge count
 * as `same`. A theme is coarser than a hinge, so the verdict is a screen, not a
 * finding — it is written into the report as an overridable default, and pairs
 * that carry a decision still deserve a read of the prose in raw/.
 *
 * Env (required):
 *   BIF_BASE_URL, BIF_PASS1_MODEL, BIF_PASS2_MODEL   (BIF_API_KEY if provider needs it)
 *
 * Optional:
 *   BIF_LOCALE, BIF_DEEP=1, BIF_CALL_TIMEOUT_MS
 *   BIF_ONLY       — comma-separated base fixture ids
 *   BIF_KINDS      — comma-separated variant kinds to run (default: all present)
 *   BIF_REF        — baselines/<run_id> to diff labels against (e.g. 2026-07-16_230859)
 *   BIF_STABILITY_GATE=1 — exit non-zero when any variant scores `shift`
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
import type { HingeComparison, HingeSide, ThemeKeywords } from "./hinge-labels";
import { compareHinge, describeSide, loadThemeKeywords } from "./hinge-labels";
import { hostOf } from "./provider-host";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = path.join(__dirname, "golden");
const VARIANTS_DIR = path.join(__dirname, "golden-variants");
const OUT_ROOT = path.join(__dirname, "stability");
const BASELINES_DIR = path.join(__dirname, "baselines");

/** Report order; anything else a fixture declares is appended after these. */
const KIND_ORDER = ["para", "strip", "flip"] as const;

type Fixture = {
  id: string;
  variant_of?: string;
  variant_kind?: string;
  title: string;
  category: string;
  locale?: string;
  idea: string;
  focus_notes?: string[];
  expected_spof_themes?: string[];
};

/** One run, reduced to the fields worth comparing. */
type Labels = {
  spof: string;
  /** Kept because the theme screen and any human re-judgement both read it. */
  spof_explanation: string;
  spof_confidence: string;
  likelihood: string;
  velocity: string;
  cascade_steps: number;
  ponr_step: string | null;
  assumptions: number;
  critical_assumption_indices: number[] | null;
  spof_agreement: string | null;
  /** E19 — advisory input-adequacy band + score, to correlate thin input with swap/shift. */
  adequacy: string;
  empty_domains: string[];
  hard_fail: number;
  soft_fail: number;
  warnings: string[];
  elapsed_ms: number;
};

type VariantResult = {
  variant_id: string;
  kind: string;
  labels: Labels | { error: string };
  /** null when either side failed to produce a report at all. */
  comparison: HingeComparison | null;
  themes_original: string[];
  themes_variant: string[];
  /**
   * Machine verdict, pre-filled so an unattended run still yields a number.
   * Overwrite in the report when a read of the prose disagrees.
   */
  same_hinge: string;
};

type GroupResult = {
  base_id: string;
  category: string;
  expected_spof_themes: string[];
  original: Labels | { error: string };
  original_primary_theme: string | null;
  /** Themes tied at the top score, when `original_primary_theme` is null (Q20). */
  original_primary_group?: string[];
  variants: VariantResult[];
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
    spof_explanation: analysis.single_point_of_failure.explanation,
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
    spof_agreement: analysis.self_consistency?.spof_agreement ?? null,
    adequacy: analysis.meta.input_adequacy
      ? `${analysis.meta.input_adequacy.band} (${analysis.meta.input_adequacy.score})`
      : "—",
    empty_domains: emptyDomains,
    hard_fail: assertionSummary.hard_fail,
    soft_fail: assertionSummary.soft_fail,
    warnings,
    elapsed_ms: elapsedMs,
  };
}

/** SPOF component + explanation — the explanation is where the mechanism lives. */
function hingeText(l: Labels): string {
  return `${l.spof}. ${l.spof_explanation}`;
}

function sideOf(
  l: Labels,
  expectedThemes: string[],
  keywords: ThemeKeywords,
): HingeSide {
  return describeSide(hingeText(l), expectedThemes, keywords);
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
    return `| ${side} | **failed** | ${cell(l.error)} | — | — | — | — | — | — | — |`;
  return [
    `| ${side}`,
    cell(l.spof),
    cell(l.spof_confidence),
    cell(l.likelihood),
    cell(l.velocity),
    cell(l.cascade_steps),
    cell(l.ponr_step),
    cell(l.empty_domains.length ? l.empty_domains.join(", ") : "none"),
    cell(l.adequacy),
    `${l.hard_fail}/${l.soft_fail} |`,
  ].join(" | ");
}

const VERDICT_MARK: Record<string, string> = {
  same: "✓ same",
  partial: "~ partial",
  swap: "⇄ swap",
  shift: "✗ shift",
  unmatched: "? unmatched",
  failed: "! failed",
};

function verdictOf(v: VariantResult): string {
  return v.comparison?.verdict ?? "failed";
}

function buildReport(
  runId: string,
  cfg: RunEnv,
  groups: GroupResult[],
  reference: Map<string, { spof: string; likelihood: string }> | null,
  referenceId: string | undefined,
): string {
  const lines: string[] = [];
  lines.push(`# SPOF stability run — ${runId}`);
  lines.push("");
  lines.push(
    `Pass 1 \`${cfg.pass1Model}\` · Pass 2 \`${cfg.pass2Model}\` · ${cfg.deepAnalysis ? "deep" : "standard"} · host \`${hostOf(cfg.baseUrl)}\``,
  );
  lines.push("");
  lines.push(
    "Every row below is the **same mechanism**: `original` as written in " +
      "`eval/golden`, then one row per rewrite in `eval/golden-variants` — " +
      "`para` (no distinctive wording kept), `strip` (proper nouns, comparators " +
      "and places removed, structure kept), `flip` (same facts, order reversed " +
      "and reframed as a pitch). The question is not whether the score moved — " +
      "the rubric is saturated — but whether the hinge survived the rewrite.",
  );
  lines.push("");
  lines.push(
    "`Verdict` is produced automatically by comparing **themes**, not strings " +
      "(`eval/hinge-labels.ts` + `eval/theme-keywords.json`), so two phrasings " +
      "of one hinge score `same`. A theme is coarser than a hinge, so treat " +
      "`same` as *no drift detected* rather than *identical*, and overwrite the " +
      "verdict inline when a read of `raw/*.json` disagrees. `swap` means the " +
      "hinge moved to a *different* mechanism the fixture itself declared " +
      "load-bearing (co-valid oscillation on a multi-fragile idea) — tracked, but " +
      "not frame escape; only `shift` (a hinge that left the fixture's expected " +
      "set) is drift. `unmatched` means the screen abstained and the pair needs a " +
      "human.",
  );
  lines.push("");

  for (const g of groups) {
    lines.push(`## ${g.base_id} (${g.category})`);
    lines.push("");
    lines.push(`Expected themes: ${g.expected_spof_themes.join(", ") || "—"}`);
    lines.push("");
    lines.push(
      "| Side | SPOF | Conf | Likelihood | Velocity | Steps | PONR step | Empty domains | Adequacy | hard/soft |",
    );
    lines.push("|---|---|---|---|---|---|---|---|---|---|");
    lines.push(labelRow("original", g.original));
    for (const v of g.variants) lines.push(labelRow(v.kind, v.labels));
    if (reference) {
      const ref = reference.get(g.base_id);
      lines.push(
        `| ref ${referenceId ?? ""} | ${cell(ref?.spof)} | — | ${cell(ref?.likelihood)} | — | — | — | — | — | — |`,
      );
    }
    lines.push("");
    lines.push(
      `Original strongest theme: ${
        g.original_primary_theme
          ? `\`${g.original_primary_theme}\``
          : g.original_primary_group?.length
            ? `${g.original_primary_group.map((t) => `\`${t}\``).join(" / ")} (tied — compared as a group)`
            : "— (no stem matched)"
      }`,
    );
    lines.push("");
    lines.push("| Variant | Verdict | Why | Variant themes | Token overlap |");
    lines.push("|---|---|---|---|---|");
    for (const v of g.variants) {
      const verdict = verdictOf(v);
      lines.push(
        [
          `| ${v.kind}`,
          `**${VERDICT_MARK[verdict] ?? verdict}**`,
          cell(v.comparison?.reason ?? "a side failed — nothing to compare"),
          cell(v.themes_variant.slice(0, 4).join(", ")),
          cell(v.comparison ? v.comparison.token_overlap : null),
        ].join(" | ") + " |",
      );
    }
    lines.push("");
    lines.push("**Note:** ");
    lines.push("");
  }

  const flat = groups.flatMap((g) => g.variants);
  const count = (v: string) => flat.filter((x) => verdictOf(x) === v).length;
  const shift = count("shift");

  lines.push("## Rollup");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|---|---|");
  lines.push(`| Base fixtures | ${groups.length} |`);
  lines.push(`| Variant runs | ${flat.length} |`);
  lines.push(`| ✓ same | ${count("same")} |`);
  lines.push(`| ~ partial | ${count("partial")} |`);
  lines.push(`| ⇄ swap | ${count("swap")} |`);
  lines.push(`| ✗ shift | ${shift} |`);
  lines.push(`| ? unmatched | ${count("unmatched")} |`);
  lines.push(`| ! failed side | ${count("failed")} |`);
  lines.push("");
  lines.push("Per rewrite kind — this is the column that says *why* a hinge moved:");
  lines.push("");
  lines.push("| Kind | same | partial | swap | shift | unmatched | failed |");
  lines.push("|---|---|---|---|---|---|---|");
  const kinds = [...new Set(flat.map((v) => v.kind))];
  for (const kind of kinds) {
    const inKind = flat.filter((v) => v.kind === kind);
    const c = (verdict: string) =>
      inKind.filter((v) => verdictOf(v) === verdict).length;
    lines.push(
      `| ${kind} | ${c("same")} | ${c("partial")} | ${c("swap")} | ${c("shift")} | ${c("unmatched")} | ${c("failed")} |`,
    );
  }
  lines.push("");
  lines.push(
    "A `shift` is evidence for the dogfood complaint that SPOF selection is " +
      "unstable; a `same` is evidence against it. A `swap` is neither — the idea " +
      "genuinely has more than one load-bearing hinge, so which one wins is " +
      "ambiguous by construction; read the prose before calling it drift. Which " +
      "kind carries the shifts narrows the cause: `para` implicates vocabulary, " +
      "`strip` implicates brand and place recognition, `flip` implicates position " +
      "in the prompt. Record the counts in backlog Q10 together with the model " +
      "ids above — a stability number without a model id is not comparable to the " +
      "next run.",
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
  const kindsRaw = process.env.BIF_KINDS?.trim();
  const kindFilter = kindsRaw
    ? new Set(kindsRaw.split(",").map((s) => s.trim()).filter(Boolean))
    : undefined;
  const referenceId = process.env.BIF_REF?.trim() || undefined;
  const gate =
    process.env.BIF_STABILITY_GATE === "1" ||
    process.env.BIF_STABILITY_GATE === "true";

  const keywords = await loadThemeKeywords();
  const originals = await loadDir(GOLDEN_DIR);
  const variants = await loadDir(VARIANTS_DIR);

  const variantsByBase = new Map<string, Fixture[]>();
  for (const v of variants) {
    if (!v.variant_of) {
      console.error(`[skip] ${v.id}: variant has no "variant_of"`);
      continue;
    }
    if (!v.variant_kind) {
      console.error(`[skip] ${v.id}: variant has no "variant_kind"`);
      continue;
    }
    if (kindFilter && !kindFilter.has(v.variant_kind)) continue;
    const list = variantsByBase.get(v.variant_of) ?? [];
    list.push(v);
    variantsByBase.set(v.variant_of, list);
  }
  const kindRank = (k: string) => {
    const i = (KIND_ORDER as readonly string[]).indexOf(k);
    return i === -1 ? KIND_ORDER.length : i;
  };
  for (const list of variantsByBase.values()) {
    list.sort(
      (a, b) =>
        kindRank(a.variant_kind ?? "") - kindRank(b.variant_kind ?? "") ||
        a.id.localeCompare(b.id),
    );
  }

  const jobs = originals
    .filter((o) => !only || only.has(o.id))
    .map((o) => ({ original: o, variants: variantsByBase.get(o.id) ?? [] }))
    .filter((j) => {
      if (j.variants.length === 0) {
        console.error(`[skip] ${j.original.id}: no variants found`);
        return false;
      }
      return true;
    });

  if (jobs.length === 0) {
    console.error("No original/variant groups to run.");
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

  const analysisCount = jobs.reduce((n, j) => n + 1 + j.variants.length, 0);
  console.log(`\nBreakItFirst SPOF stability — run ${runId}`);
  console.log(
    `Groups: ${jobs.length} · analyses: ${analysisCount} (1 original + ${jobs
      .map((j) => j.variants.length)
      .join("/")} variants)`,
  );
  console.log(`Pass1: ${pass1Model} · Pass2: ${pass2Model}`);
  console.log(`Deep: ${cfg.deepAnalysis ? "yes" : "no"}`);
  if (kindFilter) console.log(`Kinds: ${[...kindFilter].join(", ")}`);
  if (referenceId) console.log(`Reference labels: baselines/${referenceId}`);
  if (gate) console.log(`Gate: on — exits non-zero if any variant shows a shift`);
  console.log(`Out: ${runDir}`);
  console.log(
    `\nEach analysis is 3+ provider calls, so a full run is ${analysisCount * 3}+ calls.`,
  );
  console.log(`Heartbeat prints every 20s while a call is in flight.\n`);

  const groups: GroupResult[] = [];
  for (const job of jobs) {
    console.log(`▸ ${job.original.id}`);
    const expected = job.original.expected_spof_themes ?? [];
    const original = await runOne(job.original, cfg);
    const originalSide =
      "error" in original ? null : sideOf(original, expected, keywords);

    const variantResults: VariantResult[] = [];
    for (const variantFixture of job.variants) {
      const labels = await runOne(variantFixture, cfg);
      const variantSide =
        "error" in labels ? null : sideOf(labels, expected, keywords);
      const comparison =
        originalSide && variantSide
          ? compareHinge(originalSide, variantSide)
          : null;
      if (comparison) {
        console.log(`    verdict: ${comparison.verdict} — ${comparison.reason}`);
      }
      variantResults.push({
        variant_id: variantFixture.id,
        kind: variantFixture.variant_kind ?? "unknown",
        labels,
        comparison,
        themes_original: originalSide?.matches.map((m) => m.theme) ?? [],
        themes_variant: variantSide?.matches.map((m) => m.theme) ?? [],
        same_hinge: comparison?.verdict ?? "failed",
      });
    }

    groups.push({
      base_id: job.original.id,
      category: job.original.category,
      expected_spof_themes: expected,
      original,
      original_primary_theme: originalSide?.primary ?? null,
      original_primary_group: originalSide?.primary_group ?? [],
      variants: variantResults,
    });

    // Written after every group, not at the end — a run that dies on group 4
    // must not throw away groups 1-3.
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          run_id: runId,
          // Host only, never the full base URL — see eval/provider-host.ts.
          models: { pass1: pass1Model, pass2: pass2Model, host: hostOf(baseUrl) },
          deep: cfg.deepAnalysis,
          reference_run_id: referenceId ?? null,
          groups,
        },
        null,
        2,
      ),
      "utf8",
    );
    await writeFile(
      path.join(runDir, "REPORT.md"),
      buildReport(runId, cfg, groups, reference, referenceId),
      "utf8",
    );
  }

  const allVariants = groups.flatMap((g) => g.variants);
  const shifted = allVariants.filter((v) => verdictOf(v) === "shift");
  const unmatched = allVariants.filter((v) => verdictOf(v) === "unmatched");

  console.log(`\nDone. ${groups.length} groups, ${allVariants.length} variants.`);
  console.log(
    `Verdicts: ${allVariants.filter((v) => verdictOf(v) === "same").length} same · ` +
      `${allVariants.filter((v) => verdictOf(v) === "partial").length} partial · ` +
      `${allVariants.filter((v) => verdictOf(v) === "swap").length} swap · ` +
      `${shifted.length} shift · ${unmatched.length} unmatched · ` +
      `${allVariants.filter((v) => verdictOf(v) === "failed").length} failed`,
  );
  console.log(`Report: ${path.join(runDir, "REPORT.md")}`);
  if (unmatched.length > 0) {
    console.log(
      `${unmatched.length} variant(s) matched no theme — the screen abstained; read raw/*.json for those.`,
    );
  }
  console.log(
    `Next: record the counts in Q10 (docs/04-refine-backlog.md) with the model ids above.`,
  );

  if (gate && shifted.length > 0) {
    console.error(
      `\nGate failed: ${shifted.length} variant(s) shifted hinge — ${shifted
        .map((v) => v.variant_id)
        .join(", ")}`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
