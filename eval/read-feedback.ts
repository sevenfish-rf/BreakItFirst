/**
 * S6/N6 reader — turn the append-only feedback log into numbers.
 *
 * The loop only closes if the signal is READ, and a write-only endpoint is a
 * feedback loop only in the brochure sense. This prints the three counts dogfood
 * N6 asked for, per locale and per mode (the two knobs Q16 showed can move a
 * report), plus every correction someone typed.
 *
 * It also joins `idea_hash` back to `eval/golden/*.json` by hashing each fixture
 * the same way the browser does — so a vote cast while dogfooding a golden idea
 * says WHICH fixture it was about. For any other idea the text is gone by
 * design, and the hash stays a bare grouping key.
 *
 * Offline. No provider calls, no credits.
 *
 * ```bash
 * npm run eval:feedback
 * BIF_FEEDBACK_DIR=/tmp/fb npm run eval:feedback
 * ```
 *
 * HOW TO READ THE NUMBERS — all four limits matter more than the percentages:
 *
 *  1. The endpoint is UNAUTHENTICATED (`src/app/api/feedback/route.ts`). Any
 *     count here is unauthenticated signal, not a ballot. One motivated person
 *     can move it.
 *  2. Counts are a FLOOR, never a total. The sink is per-process and local, so
 *     a redeploy, a second instance, or a read-only filesystem loses votes
 *     silently and by design (that is the price of the no-DB decision, K6).
 *  3. `already_knew` is the interesting number, not `confirmed`. A premortem
 *     engine can be perfectly correct and still useless; that verdict is the
 *     only place the E2 failure ("true but I knew it") becomes visible.
 *  4. Zero votes is not a pass. It is no measurement at all.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  FEEDBACK_VERDICTS,
  hashFeedbackText,
  type FeedbackEvent,
  type FeedbackVerdict,
} from "../src/lib/feedback-event";
import { readFeedbackEvents } from "../src/lib/feedback-store";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = path.join(__dirname, "golden");

/** One vote per (idea, hinge, verdict) — a correction re-POSTs the same vote. */
export function dedupeEvents(events: FeedbackEvent[]): FeedbackEvent[] {
  const byKey = new Map<string, FeedbackEvent>();
  for (const e of events) {
    const key = `${e.idea_hash}|${e.spof_hash}|${e.verdict}`;
    const existing = byKey.get(key);
    // Keep the richer record: a later event carrying a correction supersedes the
    // bare click that preceded it.
    if (!existing || (e.alt_hinge && !existing.alt_hinge)) byKey.set(key, e);
  }
  return [...byKey.values()].sort((a, b) => a.ts.localeCompare(b.ts));
}

function countBy<K extends string>(
  events: FeedbackEvent[],
  pick: (e: FeedbackEvent) => K,
): Map<K, number> {
  const out = new Map<K, number>();
  for (const e of events) {
    const key = pick(e);
    out.set(key, (out.get(key) ?? 0) + 1);
  }
  return out;
}

function pct(n: number, total: number): string {
  if (total === 0) return "—";
  return `${((n / total) * 100).toFixed(0)}%`;
}

/** idea_hash → golden fixture id, by hashing each fixture's own idea text. */
async function goldenHashes(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let files: string[];
  try {
    files = (await readdir(GOLDEN_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return map;
  }
  for (const f of files) {
    try {
      const raw = JSON.parse(await readFile(path.join(GOLDEN_DIR, f), "utf8")) as {
        id?: string;
        idea?: string;
      };
      if (typeof raw.idea !== "string") continue;
      map.set(await hashFeedbackText(raw.idea), raw.id ?? f.replace(/\.json$/, ""));
    } catch {
      /* a malformed fixture is hinge-check's problem, not this reader's */
    }
  }
  return map;
}

async function main() {
  const result = readFeedbackEvents();
  const events = dedupeEvents(result.events);
  const golden = await goldenHashes();

  console.log(`\nBreakItFirst hinge feedback (S6/N6) — ${result.dir}`);
  console.log(
    `Files: ${result.files.length} · raw records: ${result.events.length} · ` +
      `deduped votes: ${events.length} · offline (no provider calls)\n`,
  );

  if (result.skipped.length > 0) {
    console.log(`Skipped ${result.skipped.length} unreadable line(s):`);
    for (const s of result.skipped.slice(0, 5)) {
      console.log(`  ${s.file}:${s.line} — ${s.reason}`);
    }
    console.log("");
  }

  if (events.length === 0) {
    console.log('Nothing recorded yet. Open a report and answer "Is this the hinge?".');
    console.log(
      "Zero votes is not a negative result — it is no measurement at all, so do not\n" +
        'read it as "the hinge always lands".\n',
    );
    return;
  }

  const total = events.length;
  const byVerdict = countBy<FeedbackVerdict>(events, (e) => e.verdict);

  console.log("Verdicts");
  for (const v of FEEDBACK_VERDICTS) {
    const n = byVerdict.get(v) ?? 0;
    console.log(`  ${v.padEnd(13)} ${String(n).padStart(4)}  ${pct(n, total)}`);
  }
  const landed = byVerdict.get("confirmed") ?? 0;
  const wrong = byVerdict.get("wrong_hinge") ?? 0;
  const known = byVerdict.get("already_knew") ?? 0;
  console.log(
    `\n  landed and new: ${pct(landed, total)} · wrong hinge (K1): ${pct(wrong, total)}` +
      ` · true but not new (E2): ${pct(known, total)}   [n=${total}]`,
  );

  console.log("\nBy locale");
  for (const [loc, n] of [...countBy(events, (e) => e.locale)].sort()) {
    const c = events.filter((e) => e.locale === loc && e.verdict === "confirmed").length;
    console.log(`  ${loc}  n=${String(n).padStart(4)}  confirmed ${pct(c, n)}`);
  }

  console.log("\nBy mode");
  for (const [mode, n] of [...countBy(events, (e) => e.mode)].sort()) {
    const c = events.filter((e) => e.mode === mode && e.verdict === "confirmed").length;
    console.log(`  ${mode.padEnd(8)} n=${String(n).padStart(4)}  confirmed ${pct(c, n)}`);
  }

  const hinges = new Map<string, FeedbackEvent[]>();
  for (const e of events) {
    const list = hinges.get(e.spof_hash) ?? [];
    list.push(e);
    hinges.set(e.spof_hash, list);
  }
  console.log(`\nDistinct hinges voted on: ${hinges.size}`);
  for (const [hash, list] of [...hinges.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const mix = FEEDBACK_VERDICTS.filter((v) => list.some((e) => e.verdict === v))
      .map((v) => `${v}=${list.filter((e) => e.verdict === v).length}`)
      .join(" ");
    const fixture = golden.get(list[0].idea_hash);
    console.log(`  ${hash}  ${mix}${fixture ? `  [golden ${fixture}]` : ""}`);
  }

  const corrections = events.filter((e) => e.alt_hinge);
  console.log(`\nCorrections typed: ${corrections.length}`);
  for (const c of corrections) {
    console.log(`  [${c.ts}] ${c.spof_hash} (${c.verdict}) → ${c.alt_hinge}`);
  }

  const matched = events.filter((e) => golden.has(e.idea_hash)).length;
  console.log(
    `\nGolden-fixture votes: ${matched}/${total} (the rest are ideas whose text we ` +
      "never received)",
  );
  console.log(
    "Read as: unauthenticated signal, counts are a floor (per-process local sink),\n" +
      "and `already_knew` is the number that matters — a correct hinge the user had\n" +
      "already reached is still a product failure (E2). Record the counts in S6\n" +
      "(docs/04-refine-backlog.md) together with n, or the ratio means nothing.\n",
  );
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
