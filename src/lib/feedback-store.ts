/**
 * S6/N6 — append-only local sink for anonymous SPOF feedback.
 *
 * Deliberately the dumbest thing that closes the loop: newline-delimited JSON
 * under a gitignored directory, one file per month, append only. No database,
 * because `01-product.md` §6 says no permanent store and K6 records that
 * decision as a real trade-off rather than an oversight — this file is the
 * narrow exception that buys K1 ground truth without an account, a schema
 * migration, or anything that survives `rm -rf`.
 *
 * Rules this module keeps:
 *   - It NEVER throws at the caller. A read-only filesystem (most serverless
 *     hosts) must degrade to "not recorded", never to a 500 on a UI click.
 *   - It NEVER creates the directory until there is something to write.
 *   - It caps total file size, so an unauthenticated endpoint cannot be used to
 *     fill a disk (the route rate-limits too; this is the second wall).
 *
 * Scope, honestly: single-process, single-instance, local dev. On a multi
 * instance deploy each instance keeps its own slice and none of them survive a
 * redeploy. That is the price of the no-DB decision, and the reason the reader
 * (`eval/read-feedback.ts`) treats counts as a floor, never a total.
 */

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

import { FEEDBACK_EVENT_VERSION, type FeedbackEvent } from "@/lib/feedback-event";

/** One event is ~200 bytes; 4 MB per month file is ~20k votes. */
export const MAX_FEEDBACK_FILE_BYTES = 4 * 1024 * 1024;

export type AppendResult =
  | { ok: true; file: string }
  | { ok: false; reason: "full" | "unwritable"; message: string };

export function feedbackDir(): string {
  const override = process.env.BIF_FEEDBACK_DIR?.trim();
  if (override) return override;
  return join(process.cwd(), ".breakitfirst-feedback");
}

/** `events-2026-08.ndjson` — month buckets keep any single file readable. */
function fileNameFor(ts: string): string {
  const month = /^(\d{4}-\d{2})/.exec(ts)?.[1] ?? "unknown";
  return `events-${month}.ndjson`;
}

export function appendFeedbackEvent(event: FeedbackEvent): AppendResult {
  const dir = feedbackDir();
  const file = join(dir, fileNameFor(event.ts));

  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    if (existsSync(file) && statSync(file).size >= MAX_FEEDBACK_FILE_BYTES) {
      return {
        ok: false,
        reason: "full",
        message: `Feedback log ${file} reached ${MAX_FEEDBACK_FILE_BYTES} bytes; rotate or delete it.`,
      };
    }

    appendFileSync(file, `${JSON.stringify(event)}\n`, "utf8");
    return { ok: true, file };
  } catch (err) {
    return {
      ok: false,
      reason: "unwritable",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export type ReadFeedbackResult = {
  dir: string;
  files: string[];
  events: FeedbackEvent[];
  /** Lines that did not parse or did not look like an event of a known version. */
  skipped: { file: string; line: number; reason: string }[];
};

function looksLikeEvent(value: unknown): value is FeedbackEvent {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.verdict === "string" &&
    typeof e.spof_hash === "string" &&
    typeof e.idea_hash === "string" &&
    typeof e.ts === "string"
  );
}

/**
 * Read every month file back. Used only by the offline reader; tolerant on
 * purpose — a half-written last line (process killed mid-append) must not make
 * the whole log unreadable.
 */
export function readFeedbackEvents(dir = feedbackDir()): ReadFeedbackResult {
  const out: ReadFeedbackResult = { dir, files: [], events: [], skipped: [] };
  if (!existsSync(dir)) return out;

  let files: string[];
  try {
    files = readdirSync(dir)
      .filter((f) => f.startsWith("events-") && f.endsWith(".ndjson"))
      .sort();
  } catch (err) {
    // The path exists but is not a readable directory (a stale file at that
    // name, a permission wall). Same rule as the writer: report, never throw.
    out.skipped.push({
      file: dir,
      line: 0,
      reason: err instanceof Error ? err.message : String(err),
    });
    return out;
  }
  out.files = files;

  for (const f of files) {
    let text: string;
    try {
      text = readFileSync(join(dir, f), "utf8");
    } catch (err) {
      out.skipped.push({
        file: f,
        line: 0,
        reason: err instanceof Error ? err.message : String(err),
      });
      continue;
    }
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        out.skipped.push({ file: f, line: i + 1, reason: "not JSON" });
        return;
      }
      if (!looksLikeEvent(parsed)) {
        out.skipped.push({ file: f, line: i + 1, reason: "missing required fields" });
        return;
      }
      const v = (parsed as { v?: unknown }).v;
      if (typeof v === "number" && v > FEEDBACK_EVENT_VERSION) {
        out.skipped.push({ file: f, line: i + 1, reason: `future version v${v}` });
        return;
      }
      out.events.push(parsed);
    });
  }

  out.events.sort((a, b) => a.ts.localeCompare(b.ts));
  return out;
}
