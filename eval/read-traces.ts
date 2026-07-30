/**
 * K3/Q9 — trace reader.
 *
 * `BIF_TRACE=1` dumps the raw prose of every pass to `.breakitfirst-traces/`.
 * This reads those dumps back and surfaces what the report throws away:
 *
 *   - the hinge each Pass 1 draft picked, before Pass 1.5 merged them
 *   - whether the label changed between Pass 1 → Pass 1.5 → final JSON
 *   - the same idea analysed more than once, grouped so the labels line up
 *
 * Honest limit: Pass 1 is told to generate 3 candidates but to keep only the
 * winner in the written analysis, so the two runners-up usually are not in the
 * prose at all. This tool cannot recover what was never written. What it can
 * recover is real drift — draft A vs draft B vs what survived — and every
 * excerpt below is a heuristic match on the prose, not a parsed field.
 *
 * Usage:
 *   npm run eval:traces
 *   npm run eval:traces -- path/to/.breakitfirst-traces
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { AnalysisTrace } from "../src/lib/analysis-trace";
import { TRACE_DIR_NAME } from "../src/lib/analysis-trace";

/** Sentences that look like they are naming the hinge. */
const SPOF_HINT =
  /(single point of failure|SPOF|titik kegagalan tunggal|primary hinge|the hinge)/i;

/** Rough sentence split — good enough for excerpting prose. */
function sentences(text: string): string[] {
  return text
    .split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z“"])/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function excerptHinge(text: string | undefined, max = 2): string[] {
  if (!text) return [];
  return sentences(text)
    .filter((s) => SPOF_HINT.test(s))
    .slice(0, max)
    .map((s) => (s.length > 220 ? `${s.slice(0, 217)}…` : s));
}

type LoadedTrace = { file: string; trace: AnalysisTrace };

async function loadTraces(dir: string): Promise<LoadedTrace[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  const out: LoadedTrace[] = [];
  for (const file of files) {
    try {
      const trace = JSON.parse(
        await readFile(path.join(dir, file), "utf8"),
      ) as AnalysisTrace;
      out.push({ file, trace });
    } catch (err) {
      console.error(`[skip] ${file}: unreadable (${String(err)})`);
    }
  }
  return out;
}

/** First ~60 chars of the idea, used to group repeat runs of one input. */
function ideaKey(idea: string): string {
  return idea.replace(/\s+/g, " ").trim().slice(0, 60).toLowerCase();
}

function shortIdea(idea: string): string {
  const flat = idea.replace(/\s+/g, " ").trim();
  return flat.length > 72 ? `${flat.slice(0, 69)}…` : flat;
}

function printOne({ file, trace }: LoadedTrace) {
  const { run } = trace;
  console.log(`\n── ${file}`);
  console.log(
    `   ${trace.generated_at} · ${trace.category} · ${run.mode}/${run.locale} · ` +
      `P1 ${run.pass1_model} · P2 ${run.pass2_model} · ${run.provider_host} · ` +
      `${run.pass1_runs} draft(s)`,
  );
  console.log(`   idea: ${shortIdea(trace.idea_input)}`);
  console.log(`   FINAL SPOF: ${trace.spof}`);

  if (trace.candidate_spofs?.length) {
    console.log(`   candidate_spofs (deep self_consistency):`);
    for (const c of trace.candidate_spofs) console.log(`     · ${c}`);
  } else {
    console.log(
      `   candidate_spofs: none recorded (standard mode strips self_consistency)`,
    );
  }

  const stages: Array<[string, string | undefined]> = [
    ["pass1_a", trace.raw.pass1_a],
    ["pass1_b", trace.raw.pass1_b],
    ["pass1_5", trace.raw.pass1_5],
  ];
  for (const [name, text] of stages) {
    if (!text) continue;
    const hits = excerptHinge(text);
    if (hits.length === 0) {
      console.log(`   ${name}: no hinge sentence matched (${text.length} chars)`);
      continue;
    }
    console.log(`   ${name}:`);
    for (const h of hits) console.log(`     ~ ${h}`);
  }

  if (trace.warnings.length) {
    console.log(`   warnings: ${trace.warnings.join(" | ")}`);
  }
  const timing = trace.stages
    .map((s) => `${s.stage}${s.ok ? "" : "✗"} ${s.ms}ms`)
    .join(" · ");
  if (timing) console.log(`   stages: ${timing}`);
}

/** Repeat runs of one idea are the only in-tool evidence of label drift. */
function printRepeatGroups(loaded: LoadedTrace[]) {
  const groups = new Map<string, LoadedTrace[]>();
  for (const item of loaded) {
    const key = ideaKey(item.trace.idea_input);
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  const repeats = [...groups.values()].filter((g) => g.length > 1);
  if (repeats.length === 0) {
    console.log(
      `\nNo idea was traced more than once — nothing to compare across runs yet.`,
    );
    return;
  }
  console.log(`\n===== Same idea, multiple runs =====`);
  for (const group of repeats) {
    console.log(`\n▸ ${shortIdea(group[0].trace.idea_input)}`);
    const labels = new Set<string>();
    for (const { trace } of group) {
      labels.add(trace.spof.trim().toLowerCase());
      console.log(
        `   ${trace.generated_at} · ${trace.run.mode} · ${trace.run.pass1_model} → ${trace.spof}`,
      );
    }
    // Distinct strings are a hint, not a verdict: two phrasings of one hinge
    // read as "different" here and only a human can collapse them.
    console.log(
      `   ${group.length} runs · ${labels.size} distinct label string(s)` +
        (labels.size > 1 ? " — judge by hand whether the hinge actually moved" : ""),
    );
  }
}

async function main() {
  const argDir = process.argv[2]?.trim();
  const dir = path.resolve(
    argDir || process.env.BIF_TRACE_DIR?.trim() || TRACE_DIR_NAME,
  );

  let loaded: LoadedTrace[];
  try {
    loaded = await loadTraces(dir);
  } catch {
    console.error(
      `No trace directory at ${dir}.\n` +
        `Traces are opt-in: set BIF_TRACE=1 before running an analysis or ` +
        `npm run eval:baseline, then re-run this.`,
    );
    process.exit(1);
  }

  if (loaded.length === 0) {
    console.log(`${dir} has no trace files yet.`);
    return;
  }

  console.log(`BreakItFirst trace reader — ${loaded.length} trace(s) in ${dir}`);
  console.log(
    `Excerpts marked "~" are heuristic prose matches, not schema fields.`,
  );
  for (const item of loaded) printOne(item);
  printRepeatGroups(loaded);
  console.log(
    `\nReminder: traces contain full idea text and model output. Local only.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
