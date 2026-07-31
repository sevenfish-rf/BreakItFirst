/**
 * K8 — browser input-integrity repro (offline, zero provider credits).
 *
 * `eval/input-integrity.ts` proved the SERVER path lossless (POST body →
 * `validateAnalyzeInput` → pipeline → `meta.idea_input`, 26/26 byte-identical).
 * It could never see the half K8 actually complained about: the browser. K8
 * reported an idea corrupted *inside a delivered report* — variable-length
 * chunks gone mid-word ("masihenyambungkan", "kongevaluasi", "keounder") in a
 * region that also carried hard line-wraps absent from the rest of the text.
 *
 * This drives a real Chromium against the real `/app` route and byte-compares
 * three things against one generated source string:
 *   1. what the controlled `<textarea>` holds after input,
 *   2. what `handleSubmit` actually put in the POST body,
 *   3. where the first divergence is, with a window either side — the SHAPE of
 *      what went missing, not just the fact that something did.
 *
 * `POST /api/analyze` is intercepted and aborted, so no provider is ever
 * reached: this run costs $0 and cannot spend Modal GPU time.
 *
 * K8's own instruction was "reproduce first, don't guess". A green run here is
 * a real negative result — it moves the browser path from "unproven suspect" to
 * "measured clean at this length, in this scenario set" — and it is NOT proof
 * that K8 never happened. See the caveat block in the generated REPORT.md.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type Page } from "@playwright/test";

const APP_URL = process.env.BIF_APP_URL || "http://127.0.0.1:3000/app";
const TARGET_CHARS = Number(process.env.BIF_REPRO_CHARS || 6000);
const WRAP_COLS = Number(process.env.BIF_REPRO_WRAP || 72);
const GATE = process.env.BIF_REPRO_GATE === "1";
/**
 * Ceiling for one `pressSequentially` call. Playwright's 30s default is not a
 * budget for thousands of real keystrokes, least of all with the main thread
 * hogged — a timeout there is a harness limit, not a product finding.
 */
const TYPE_TIMEOUT_MS = Number(
  process.env.BIF_REPRO_TYPE_TIMEOUT_MS || Math.max(120_000, TARGET_CHARS * 60),
);
const OUT_ROOT = join(process.cwd(), "eval", "input-repro");

/** Provider must LOOK configured or the submit button never calls the API. */
const PROVIDER_SEED = {
  baseUrl: "http://127.0.0.1:9/v1",
  apiKey: "",
  pass1Model: "repro-model",
  pass2Model: "repro-model",
};

export type ScenarioName = "paste" | "type" | "type-loaded";

const ALL_SCENARIOS: ScenarioName[] = ["paste", "type", "type-loaded"];

function selectedScenarios(): ScenarioName[] {
  const raw = process.env.BIF_REPRO_SCENARIOS?.trim();
  if (!raw) return ALL_SCENARIOS;
  const want = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const bad = want.filter((w) => !ALL_SCENARIOS.includes(w as ScenarioName));
  if (bad.length) {
    throw new Error(
      `Unknown scenario(s): ${bad.join(", ")}. Known: ${ALL_SCENARIOS.join(", ")}`,
    );
  }
  return want as ScenarioName[];
}

/* ── Source text ──────────────────────────────────────────────────────────── */

/** Deterministic LCG so a failing run is re-runnable with the same input. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const SUBJECTS = [
  "the sitter roster", "the payout ledger", "the onboarding queue",
  "our courier pool", "the merchant dashboard", "the pricing engine",
  "the review pipeline", "the dispute desk", "the referral loop",
  "the inventory sync", "the trust score", "the refund workflow",
];
const VERBS = [
  "depends on", "is throttled by", "silently degrades under", "is priced against",
  "gets reconciled by", "is audited against", "drifts away from", "is capped by",
];
const OBJECTS = [
  "a single upstream vendor", "weekly manual reconciliation",
  "one unversioned spreadsheet", "a 14-day settlement window",
  "an unmonitored webhook", "a flat 9% commission",
  "two overlapping city launches", "a waiver nobody reads",
  "the founder's personal phone", "a 40-hour support rota",
];
const TAILS = [
  "and nothing measures the gap yet.",
  "which is why margins move without warning.",
  "so the failure surfaces only after payout.",
  "unlike the incumbent, who batches this nightly.",
  "and the constraint is geographic, not technical.",
  "so every 1% of churn costs about Rp 4.2 million.",
];

/**
 * Build a diagnostic idea of ~`chars` characters. Every sentence is stamped
 * `[mNNNN]`, so a dropped chunk names its own position instead of forcing a
 * blind diff. Vocabulary is varied on purpose: `isMostlyRepeated` rejects text
 * whose top word exceeds 60% of all words, and a rejected idea would never
 * reach the POST body this harness is trying to inspect.
 */
export function buildSourceIdea(chars: number, wrapCols: number): string {
  const rand = lcg(20260731);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const parts: string[] = [];
  let n = 0;
  let len = 0;
  while (len < chars) {
    const marker = `[m${String(n).padStart(4, "0")}]`;
    const sentence = `${marker} ${pick(SUBJECTS)} ${pick(VERBS)} ${pick(OBJECTS)} ${pick(TAILS)}`;
    parts.push(sentence);
    len += sentence.length + 1;
    n += 1;
  }
  return hardWrap(parts.join(" "), wrapCols).slice(0, chars);
}

/** Hard wraps mirror K8's reported shape: newlines mid-paragraph, not reflow. */
function hardWrap(text: string, cols: number): string {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && line.length + 1 + word.length > cols) {
      out.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) out.push(line);
  return out.join("\n");
}

/* ── Comparison ───────────────────────────────────────────────────────────── */

export type Divergence = {
  /** 0-based index of the first differing character. */
  index: number;
  expected: string;
  actual: string;
  expectedWindow: string;
  actualWindow: string;
  /** Marker the divergence falls inside/after — names the region for a human. */
  nearMarker: string | null;
};

export type Comparison = {
  identical: boolean;
  expectedLength: number;
  actualLength: number;
  /** Negative = characters lost. */
  lengthDelta: number;
  divergence: Divergence | null;
};

const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Make a window printable so a lost newline is visible instead of silent. */
function show(s: string): string {
  return s.replace(/\n/g, "\\n").replace(/\t/g, "\\t").replace(CTRL, "?");
}

/** Last `[mNNNN]` stamp at or before `index` — names the region for a human. */
function markerBefore(text: string, index: number): string | null {
  const at = text.lastIndexOf("[m", index);
  if (at < 0) return null;
  const stamp = text.slice(at, at + 7);
  return /^\[m\d{4}\]$/.test(stamp) ? stamp : null;
}

/**
 * Byte-compare and, on mismatch, report the FIRST divergence with context on
 * both sides. Same discipline as `input-integrity.ts`: the shape of what went
 * missing is the diagnostic, a boolean is not.
 */
export function compareText(
  expected: string,
  actual: string,
  window = 60,
): Comparison {
  const base: Omit<Comparison, "divergence" | "identical"> = {
    expectedLength: expected.length,
    actualLength: actual.length,
    lengthDelta: actual.length - expected.length,
  };
  if (expected === actual) {
    return { ...base, identical: true, divergence: null };
  }
  const max = Math.min(expected.length, actual.length);
  let i = 0;
  while (i < max && expected[i] === actual[i]) i += 1;
  const from = Math.max(0, i - window);
  return {
    ...base,
    identical: false,
    divergence: {
      index: i,
      expected: show(expected[i] ?? "<end>"),
      actual: show(actual[i] ?? "<end>"),
      expectedWindow: show(expected.slice(from, i + window)),
      actualWindow: show(actual.slice(from, i + window)),
      nearMarker: markerBefore(expected, i),
    },
  };
}

/* ── Browser driver ───────────────────────────────────────────────────────── */

export type ScenarioResult = {
  scenario: ScenarioName;
  /** How the text was delivered, for the record. */
  method: string;
  textarea: Comparison;
  /**
   * `idea.trim().length` as React itself renders it. The DOM value can be right
   * while React state is empty, so this is the state-side cross-check.
   */
  reactCharCount: number | null;
  expectedCharCount: number;
  /** null when submit never fired (validation refused, or no POST observed). */
  submitted: Comparison | null;
  submitError: string | null;
  /**
   * Set when the harness itself failed (Playwright timeout, launch error). Not a
   * product finding — a scenario that never ran cannot be clean OR lossy.
   */
  harnessError: string | null;
  elapsedMs: number;
  consoleErrors: string[];
};

/** Fresh page with a configured provider and no leftover draft. */
async function openApp(browser: Browser): Promise<{ page: Page; errors: string[] }> {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    permissions: ["clipboard-read", "clipboard-write"],
  });

  const errors: string[] = [];
  await ctx.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
        window.localStorage.setItem(key as string, value as string);
      } catch {
        /* ignore */
      }
    },
    ["breakitfirst.provider", JSON.stringify(PROVIDER_SEED)] as const,
  );
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 300));
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 300)}`));
  await page.goto(APP_URL, { waitUntil: "networkidle" });
  await page.waitForSelector("#idea", { state: "visible" });
  await assertHydrated(page);
  return { page, errors };
}

/**
 * A server-rendered but un-hydrated page happily accepts typing into the DOM
 * and reports the full text back from `inputValue()` while React state stays
 * empty — so every comparison would read "identical" against a page that can
 * submit nothing. Flip the deep-analysis switch and require React to answer.
 */
async function assertHydrated(page: Page): Promise<void> {
  const sw = page.locator("button.switch").first();
  const before = await sw.getAttribute("aria-checked");
  for (let i = 0; i < 25; i += 1) {
    await sw.click();
    await page.waitForTimeout(200);
    const after = await sw.getAttribute("aria-checked");
    if (after !== before) {
      await sw.click(); // restore standard mode
      await page.waitForTimeout(100);
      return;
    }
  }
  throw new Error(
    [
      `Page at ${APP_URL} rendered but never hydrated — React is not handling events.`,
      "Every text comparison would falsely read 'identical' against a dead page,",
      "so this run is aborted instead of reported.",
      "Most likely another (stale) server is holding this port. Check for a running",
      "dev server, or point BIF_APP_URL at a server you control.",
    ].join("\n"),
  );
}

/** Busy the main thread every frame — the contention the K8 hypothesis needs. */
const HOG = `(() => {
  window.__bifHog = true;
  const spin = () => {
    if (!window.__bifHog) return;
    const until = performance.now() + 10;
    while (performance.now() < until) { /* burn a frame */ }
    requestAnimationFrame(spin);
  };
  requestAnimationFrame(spin);
})()`;

async function deliver(
  page: Page,
  scenario: ScenarioName,
  text: string,
): Promise<string> {
  const box = page.locator("#idea");
  await box.click();
  if (scenario === "paste") {
    try {
      await page.evaluate((t) => navigator.clipboard.writeText(t), text);
      await page.keyboard.press("ControlOrMeta+V");
      return "real clipboard paste (Ctrl+V)";
    } catch {
      await page.keyboard.insertText(text);
      return "keyboard.insertText (clipboard unavailable; single input event)";
    }
  }
  if (scenario === "type-loaded") {
    await page.evaluate(HOG);
  }
  // 6000 real keystrokes take ~17s unloaded and far longer with the main thread
  // hogged, so the default 30s action timeout is not a budget for this.
  await box.pressSequentially(text, { delay: 0, timeout: TYPE_TIMEOUT_MS });
  if (scenario === "type-loaded") {
    await page.evaluate("window.__bifHog = false");
    return "pressSequentially, one key event per char, main thread hogged ~10ms/frame";
  }
  return "pressSequentially, one key event per char";
}

async function runScenario(
  browser: Browser,
  scenario: ScenarioName,
  source: string,
): Promise<ScenarioResult> {
  const started = Date.now();
  const { page, errors } = await openApp(browser);
  // Held in an object so TS keeps the type across the route closure.
  const captured: { body: string | null } = { body: null };
  let submitError: string | null = null;

  // No provider is ever reached: the POST is captured and aborted. $0.
  await page.route("**/api/analyze", async (route) => {
    if (route.request().method() === "POST") {
      captured.body = route.request().postData() ?? "";
      await route.abort("failed");
      return;
    }
    await route.continue();
  });

  // One finally for the whole scenario: a Playwright timeout mid-typing must not
  // leak a live context (and its main-thread hog) into the next scenario.
  try {
    const method = await deliver(page, scenario, source);
    const inTextarea = await page.locator("#idea").inputValue();
    const textarea = compareText(source, inTextarea);
    const counterText = await page
      .locator(".console-note .count")
      .first()
      .textContent()
      .catch(() => null);
    const reactCharCount = counterText
      ? Number(counterText.trim().split(/\s+/)[0])
      : null;

    await page.locator("button.analyze-btn").click();
    const deadline = Date.now() + 15000;
    while (captured.body === null && Date.now() < deadline) {
      await page.waitForTimeout(200);
    }
    if (captured.body === null) {
      const shown = await page
        .locator(".console-note .msg.err")
        .first()
        .textContent()
        .catch(() => null);
      submitError = shown?.trim()
        ? `no POST observed; form said: ${shown.trim().slice(0, 200)}`
        : "no POST observed within 15s and no error shown";
    }

    let submitted: Comparison | null = null;
    if (captured.body !== null) {
      try {
        const parsed = JSON.parse(captured.body) as { idea?: unknown };
        submitted = compareText(
          source.trim(),
          typeof parsed.idea === "string" ? parsed.idea : "",
        );
      } catch (err) {
        submitError = `POST body was not JSON: ${String(err).slice(0, 160)}`;
      }
    }

    return {
      scenario,
      method,
      textarea,
      reactCharCount: Number.isFinite(reactCharCount) ? reactCharCount : null,
      expectedCharCount: source.trim().length,
      submitted,
      submitError,
      harnessError: null,
      elapsedMs: Date.now() - started,
      consoleErrors: errors,
    };
  } finally {
    await page.context().close().catch(() => {});
  }
}

/* ── Reporting ────────────────────────────────────────────────────────────── */

function verdictOf(r: ScenarioResult): "clean" | "lossy" | "inconclusive" {
  if (r.harnessError) return "inconclusive";
  if (!r.textarea.identical) return "lossy";
  if (r.reactCharCount !== null && r.reactCharCount !== r.expectedCharCount) {
    return "lossy";
  }
  if (r.submitted && !r.submitted.identical) return "lossy";
  if (!r.submitted || r.reactCharCount === null) return "inconclusive";
  return "clean";
}

function divergenceLines(label: string, c: Comparison): string[] {
  if (c.identical) {
    return [`- **${label}:** identical (${c.expectedLength} chars)`];
  }
  const d = c.divergence!;
  return [
    `- **${label}: MISMATCH** — expected ${c.expectedLength} chars, got ${c.actualLength} (${c.lengthDelta >= 0 ? "+" : ""}${c.lengthDelta})`,
    `  - first divergence at index ${d.index}${d.nearMarker ? ` (after \`${d.nearMarker}\`)` : ""}: expected \`${d.expected}\`, got \`${d.actual}\``,
    "",
    "```",
    `expected: …${d.expectedWindow}…`,
    `actual  : …${d.actualWindow}…`,
    "```",
  ];
}

function buildReport(
  runId: string,
  source: string,
  results: ScenarioResult[],
): string {
  const clean = results.filter((r) => verdictOf(r) === "clean").length;
  const lossy = results.filter((r) => verdictOf(r) === "lossy").length;
  const incon = results.filter((r) => verdictOf(r) === "inconclusive").length;
  const lines: string[] = [
    `# K8 browser input-integrity repro — ${runId}`,
    "",
    `- URL: \`${APP_URL}\``,
    `- Source idea: **${source.length} chars**, hard-wrapped at ${WRAP_COLS} cols, ${source.split("\n").length} lines`,
    `- Rollup: **${clean} clean · ${lossy} lossy · ${incon} inconclusive**`,
    `- Provider calls: **0** (\`POST /api/analyze\` intercepted and aborted)`,
    "",
    "> A `net::ERR_FAILED` console error per scenario is expected: it is this",
    "> harness aborting its own captured POST so no provider is reached.",
    "",
    "| Scenario | Textarea | React char count | Submitted body | Verdict | ms |",
    "|----------|----------|------------------|----------------|---------|----|",
  ];
  for (const r of results) {
    if (r.harnessError) {
      lines.push(
        `| \`${r.scenario}\` | did not run | did not run | did not run | inconclusive | — |`,
      );
      continue;
    }
    const react =
      r.reactCharCount === null
        ? "**unreadable**"
        : r.reactCharCount === r.expectedCharCount
          ? `${r.reactCharCount} (expected)`
          : `**${r.reactCharCount} vs ${r.expectedCharCount} expected**`;
    lines.push(
      `| \`${r.scenario}\` | ${r.textarea.identical ? "identical" : `**${r.textarea.lengthDelta} chars**`} | ${react} | ${
        r.submitted ? (r.submitted.identical ? "identical" : `**${r.submitted.lengthDelta} chars**`) : "not captured"
      } | ${verdictOf(r)} | ${r.elapsedMs} |`,
    );
  }
  for (const r of results) {
    lines.push("", `## \`${r.scenario}\``, "", `Method: ${r.method}`, "");
    if (r.harnessError) {
      lines.push(
        `- **Harness failed, scenario never completed:** \`${r.harnessError}\``,
        "- This is a limit of the test rig, not a measurement of the product.",
        "",
      );
      continue;
    }
    lines.push(
      `- **React state (rendered char counter):** ${
        r.reactCharCount === null
          ? "could not be read — treat this scenario as inconclusive"
          : `${r.reactCharCount} chars, expected ${r.expectedCharCount}`
      }`,
    );
    lines.push(...divergenceLines("textarea value", r.textarea));
    if (r.submitted) {
      lines.push(...divergenceLines("POST body `idea`", r.submitted));
    } else {
      lines.push(`- **POST body \`idea\`:** not captured — ${r.submitError}`);
    }
    if (r.consoleErrors.length) {
      lines.push("", "Console errors:", "", ...r.consoleErrors.map((e) => `- \`${e}\``));
    }
  }
  lines.push(
    "",
    "## What a clean run does and does not prove",
    "",
    "Proves: over this length, in these delivery modes, on this build, the",
    "browser path from input event to React state to POST body loses nothing.",
    "Together with `eval:input-integrity` (server side) that closes the loop end",
    "to end. The rendered char counter is read as a React-state cross-check, so a",
    "server-rendered but un-hydrated page cannot pass by returning the raw DOM",
    "value (the harness also aborts up front if hydration never happens).",
    "",
    "Does **not** prove K8 never happened. Not covered:",
    "",
    "- Real human typing cadence, IME composition, autocorrect, and mobile keyboards.",
    "- Any browser other than this Chromium build, and any device under real memory pressure.",
    "- Corruption that arrived **with the pasted text** — if the source was already",
    "  broken when it was copied, every layer here faithfully preserves the damage,",
    "  and the hard wraps K8 reported are consistent with exactly that.",
    "- `/` (the marketing route) mounts GSAP ScrollSmoother with `normalizeScroll: true`",
    "  and `lagSmoothing(0)`; `/app` does not, so this run says nothing about a",
    "  textarea placed under a smooth-scroll wrapper.",
    "",
  );
  return lines.join("\n");
}

/* ── Entry ────────────────────────────────────────────────────────────────── */

async function assertServerUp(): Promise<void> {
  try {
    const res = await fetch(APP_URL, { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    console.error(
      [
        `Cannot reach ${APP_URL} — ${String(err)}`,
        "",
        "Start the app in another terminal first:",
        "  npm run dev",
        "then re-run. Override the URL with BIF_APP_URL if it is not on :3000.",
      ].join("\n"),
    );
    process.exit(2);
  }
}

async function main(): Promise<void> {
  await assertServerUp();
  const scenarios = selectedScenarios();
  const source = buildSourceIdea(TARGET_CHARS, WRAP_COLS);
  const runId = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "_");
  const outDir = join(OUT_ROOT, runId);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "source.txt"), source, "utf8");

  console.log(
    `K8 repro — ${source.length} chars, ${scenarios.length} scenario(s), 0 provider calls\n`,
  );

  const browser = await chromium.launch();
  const results: ScenarioResult[] = [];
  try {
    for (const scenario of scenarios) {
      process.stdout.write(`  ${scenario} … `);
      const r = await runScenario(browser, scenario, source).catch(
        (err): ScenarioResult => ({
          scenario,
          method: "did not complete",
          textarea: compareText(source, ""),
          reactCharCount: null,
          expectedCharCount: source.trim().length,
          submitted: null,
          submitError: null,
          harnessError: String(err).split("\n")[0].slice(0, 300),
          elapsedMs: 0,
          consoleErrors: [],
        }),
      );
      results.push(r);
      const v = verdictOf(r);
      console.log(
        r.harnessError
          ? `INCONCLUSIVE — harness failed: ${r.harnessError}`
          : v === "clean"
            ? `clean (${r.elapsedMs} ms)`
            : `${v.toUpperCase()} — textarea ${r.textarea.lengthDelta}, body ${r.submitted?.lengthDelta ?? "n/a"}`,
      );
      if (v === "lossy" && r.textarea.divergence) {
        const d = r.textarea.divergence;
        console.log(`      first loss at ${d.index}${d.nearMarker ? ` after ${d.nearMarker}` : ""}`);
        console.log(`      expected …${d.expectedWindow}…`);
        console.log(`      actual   …${d.actualWindow}…`);
      }
      // Write after every scenario so a crash keeps earlier results.
      writeFileSync(
        join(outDir, "summary.json"),
        JSON.stringify(
          { run_id: runId, url: APP_URL, source_chars: source.length, wrap_cols: WRAP_COLS, results },
          null,
          2,
        ),
        "utf8",
      );
      writeFileSync(join(outDir, "REPORT.md"), buildReport(runId, source, results), "utf8");
    }
  } finally {
    await browser.close();
  }

  const lossy = results.filter((r) => verdictOf(r) === "lossy");
  const incon = results.filter((r) => verdictOf(r) === "inconclusive");
  console.log(`\nWrote ${join("eval", "input-repro", runId)}`);
  if (lossy.length) {
    console.log(`\n${lossy.length} scenario(s) LOST characters — see REPORT.md.`);
    if (GATE) process.exit(1);
  } else if (incon.length === results.length) {
    // Nothing was measured — that is a rig failure, not a negative result, and it
    // must never be mistaken for one.
    console.log("\nNothing measured — every scenario was inconclusive. See REPORT.md.");
    process.exit(1);
  } else {
    console.log(
      `\nNo character loss observed in ${results.length - incon.length}/${results.length} scenario(s)${
        incon.length ? `, ${incon.length} inconclusive` : ""
      }. Read the caveats in REPORT.md before closing K8.`,
    );
  }
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
