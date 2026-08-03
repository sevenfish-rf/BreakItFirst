/**
 * Offline preflight for the Q10 stability harness — no provider, no credentials.
 *
 * Three failure modes this catches before a paid run burns calls:
 *
 *  1. Fixture set out of shape — a base with a missing rewrite kind, a variant
 *     pointing at a base that does not exist, a theme with no keyword stems
 *     (which makes that theme permanently invisible to the screen), or an
 *     adjacent K2 idea that names no golden neighbour to crowd.
 *  2. A degenerate screen — a stem so broad that every hinge maps to one theme
 *     reports zero drift no matter what the model does, which looks like success.
 *     The probes below assert the screen still separates a rephrased hinge from
 *     a genuinely different one.
 *  3. A *lying* screen (added Q20) — a stem that fires inside an unrelated word,
 *     so a theme wins on prose that never mentioned it. `rma` matched inside
 *     "info**rma**tion" and decided a real recorded primary; `bot` matched inside
 *     "**bot**h". §6 pins the stem grammar against every misfire found on disk,
 *     §7 pins the tie behaviour that replaced the alphabetical tie-break, and §8
 *     pins the narrowed `likelihood_not_percent` assertion against both a real
 *     probability claim and a business percentage the analysis is merely quoting.
 *
 * Usage: npm run eval:hinge-check
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { likelihoodStatedAsPercent } from "./assertions";
import {
  compareHinge,
  describeSide,
  dismissedStems,
  loadThemeKeywords,
  matchThemes,
  primaryTheme,
  topGroup,
} from "./hinge-labels";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = path.join(__dirname, "golden");
const VARIANTS_DIR = path.join(__dirname, "golden-variants");
/**
 * Near-neighbour ideas for the K2 specificity corpus (`eval/specificity-check.ts`).
 * They are rivals for attribution, never run and never rewritten — so they are
 * checked for shape and theme coverage here, and deliberately exempt from the
 * `para`/`strip`/`flip` requirement that §1 puts on a golden base.
 */
const ADJACENT_DIR = path.join(__dirname, "golden-adjacent");
const REQUIRED_KINDS = ["para", "strip", "flip"];

type Fixture = {
  id: string;
  variant_of?: string;
  variant_kind?: string;
  adjacent_to?: string;
  idea: string;
  expected_spof_themes?: string[];
};

async function loadDir(dir: string): Promise<Fixture[]> {
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
  return Promise.all(
    files.map(
      async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as Fixture,
    ),
  );
}

const problems: string[] = [];
const notes: string[] = [];

function check(condition: boolean, message: string) {
  if (!condition) problems.push(message);
}

async function main() {
  const keywords = await loadThemeKeywords();
  const originals = await loadDir(GOLDEN_DIR);
  const variants = await loadDir(VARIANTS_DIR);
  const adjacent = await loadDir(ADJACENT_DIR);
  const baseIds = new Set(originals.map((o) => o.id));

  // 1. Every base carries every rewrite kind, exactly once.
  for (const base of originals) {
    const mine = variants.filter((v) => v.variant_of === base.id);
    for (const kind of REQUIRED_KINDS) {
      const hits = mine.filter((v) => v.variant_kind === kind);
      check(hits.length === 1, `${base.id}: expected 1 \`${kind}\` variant, found ${hits.length}`);
    }
    for (const v of mine) {
      check(
        v.idea.trim().length > 0 && v.idea !== base.idea,
        `${v.id}: idea is empty or identical to the base — a rewrite that did not rewrite`,
      );
    }
  }

  // 2. No orphan variants, and every variant declares a kind.
  for (const v of variants) {
    check(!!v.variant_of, `${v.id}: missing "variant_of"`);
    check(!!v.variant_kind, `${v.id}: missing "variant_kind"`);
    if (v.variant_of) {
      check(baseIds.has(v.variant_of), `${v.id}: variant_of "${v.variant_of}" has no base fixture`);
    }
  }

  // 2b. Adjacent ideas (K2 corpus). No variants required — they are never rewritten
  //     and never run. What must hold: a distinct id, real prose, and a `crowds`
  //     pointer at a golden base, because an "adjacent" fixture that names no
  //     neighbour is just a sixth unrelated idea and adds no attribution pressure.
  for (const a of adjacent) {
    check(!baseIds.has(a.id), `${a.id}: adjacent fixture reuses a golden fixture id`);
    check(
      a.idea.trim().length > 0,
      `${a.id}: adjacent fixture has empty idea text`,
    );
    check(
      !!a.adjacent_to && baseIds.has(a.adjacent_to),
      `${a.id}: "adjacent_to" must name a fixture in eval/golden (got "${a.adjacent_to ?? "—"}")`,
    );
    check(
      !a.variant_of && !a.variant_kind,
      `${a.id}: adjacent fixture declares variant fields — it belongs in golden-variants, not golden-adjacent`,
    );
  }
  if (adjacent.length) {
    notes.push(
      `${adjacent.length} adjacent idea(s) in golden-adjacent (specificity rivals, not run): ${adjacent
        .map((a) => `${a.id}→${a.adjacent_to}`)
        .join(", ")}`,
    );
  }

  // 3. Every theme a fixture expects has keyword stems, or the screen goes blind.
  const declared = new Set(
    [...originals, ...variants, ...adjacent].flatMap((f) => f.expected_spof_themes ?? []),
  );
  for (const theme of declared) {
    check(
      Array.isArray(keywords[theme]) && keywords[theme].length > 0,
      `theme "${theme}" is used by a fixture but has no stems in theme-keywords.json`,
    );
  }
  const unused = Object.keys(keywords).filter((t) => !declared.has(t));
  if (unused.length) notes.push(`themes with stems but no fixture: ${unused.join(", ")}`);

  // 4. The screen must still discriminate. Same mechanism, different words →
  //    `same`; different mechanism → not `same`.
  const themes = ["supply chain", "margins", "ops"];
  const sameA = describeSide(
    "OEM-owned firmware. The single contract manufacturer controls the firmware build, so a defect cannot be fixed without them.",
    themes,
    keywords,
  );
  const sameB = describeSide(
    "Vendor firmware dependency. Every unit ships a rebadged build from the one factory, leaving no path to patch a fault in-house.",
    themes,
    keywords,
  );
  const other = describeSide(
    "Returns handling capacity. A two-person team mailing replacements by hand cannot absorb the support backlog once volume arrives.",
    themes,
    keywords,
  );
  const rephrased = compareHinge(sameA, sameB);
  const different = compareHinge(sameA, other);
  check(
    rephrased.verdict === "same",
    `screen probe: two phrasings of one hinge scored "${rephrased.verdict}" (${rephrased.reason}) — stems are too narrow`,
  );
  check(
    different.verdict !== "same",
    `screen probe: two different mechanisms both scored "same" (${different.reason}) — stems are too broad`,
  );

  // 5. swap vs shift. A move between two themes the fixture DECLARED expected is
  //    co-valid oscillation (`swap`), not drift; a move to a theme off the
  //    expected set is frame escape (`shift`). Guards the distinction that keeps
  //    a single-run gate from reading a multi-fragile idea as a regression.
  const marketThemes = ["cold-start", "disintermediation", "density"];
  const coldStart = describeSide(
    "Cold-start density fails inside a single building: with no supply seeded, the marketplace is empty at launch.",
    marketThemes,
    keywords,
  );
  const offApp = describeSide(
    "Neighbors take repeat bookings off-app, circumventing the platform entirely.",
    marketThemes,
    keywords,
  );
  const escaped = describeSide(
    "The assistant gives harmful advice during a crisis — a clinical error no filter catches.",
    marketThemes,
    keywords,
  );
  const coValid = compareHinge(coldStart, offApp);
  const frameEscape = compareHinge(coldStart, escaped);
  check(
    coValid.verdict === "swap",
    `swap probe: two fixture-declared themes scored "${coValid.verdict}" (${coValid.reason}) — expected "swap"`,
  );
  check(
    frameEscape.verdict === "shift",
    `shift probe: a hinge off the expected set scored "${frameEscape.verdict}" (${frameEscape.reason}) — expected "shift"`,
  );

  // 6. Stem grammar (Q20). Each case below is a misfire that actually occurred in
  //    stored raw under plain substring matching, or a vocabulary hole that
  //    produced a false `shift`. A regression here silently returns the screen to
  //    deciding hinges on syllables.
  const themesOf = (t: string) => matchThemes(t, keywords).map((m) => m.theme);
  const grammar: [boolean, string][] = [
    [
      !themesOf("The information layer normalizes performance data").includes("defects"),
      "`rma` fires inside information/normalizes/performance",
    ],
    [!themesOf("Both sides of the market stall").includes("abuse"), "`bot` fires inside 'both'"],
    [themesOf("Scripted bots drain the free tier").includes("abuse"), "`bot` no longer fires on 'bots'"],
    [!themesOf("A slack-native app with slang").includes("sla"), "`sla` fires inside slack/slang"],
    [themesOf("The weekly SLA is unenforceable").includes("sla"), "`sla` no longer fires as a word"],
    [
      !themesOf("The proposition is unclear").includes("positioning"),
      "`position*` fires inside 'proposition'",
    ],
    [
      themesOf("Positioning against the incumbent").includes("positioning"),
      "`position*` no longer fires as a prefix",
    ],
    [
      themesOf("Identity verification is theatre").includes("trust"),
      "`verif*` prefix no longer fires",
    ],
    [
      themesOf("Repeat bookings move off-platform after the intro").includes("disintermediation"),
      "`off platform` stem missing — this hole produced a false shift",
    ],
    [
      themesOf("White-label firmware the company cannot patch").includes("supply chain"),
      "`white label` stem missing — this hole produced a false shift",
    ],
    [
      !themesOf("White-label firmware the company cannot patch").includes("claims"),
      "`label` drags white-label into claims",
    ],
    [
      themesOf("A single provider with no self-hosted fallback").includes("provider lock-in"),
      "`single provider`/`no fallback` stems missing — this hole produced a false shift",
    ],
  ];
  for (const [pass, why] of grammar) check(pass, `stem grammar: ${why}`);

  // 7. Negation guard (2026-08-01). The only `shift` in the 2026-08-01 gate run
  //    came from one literal `churn` inside "its failure is unrecoverable in a way
  //    churn is not" — prose saying the mechanism is NOT churn scored as evidence
  //    for `churn`. Pinned in BOTH directions, because the tempting wider rule is
  //    wrong: negation is not absence. A sentence that negates a *verb* ("does not
  //    prevent liability") is still an argument about the theme and must keep
  //    firing; only a comparative dismissal of the named theme itself is dropped,
  //    and only at that occurrence.
  const negation: [boolean, string][] = [
    [
      !themesOf(
        "The crisis filter fails silently, and its failure is unrecoverable in a way churn is not.",
      ).includes("churn"),
      "`churn is not.` (the real 2026-08-01 misfire) still scores as evidence for `churn`",
    ],
    [
      themesOf("Its failure is unrecoverable in a way churn is not measured by.").includes("churn"),
      "`churn is not measured by` was dismissed — an object follows, so the clause is still about churn",
    ],
    [
      !themesOf("A claim-level failure rather than a defect.").includes("defects"),
      "`rather than a defect` still scores as evidence for `defects`",
    ],
    [
      !themesOf("The risk is unlike churn: it does not recover.").includes("churn"),
      "`unlike churn` still scores as evidence for `churn`",
    ],
    [
      !themesOf("This is not churn, it is a licensing wall.").includes("churn"),
      "`is not churn` still scores as evidence for `churn`",
    ],
    [
      !themesOf("The failure mode is instead of churn a hard stop.").includes("churn"),
      "`instead of churn` still scores as evidence for `churn`",
    ],
    [
      themesOf("The keyword filter does not prevent liability.").includes("liability"),
      "verb negation dropped a real mention — negation is being read as absence",
    ],
    [
      themesOf("The gap is not addressed by churn measurement at all.").includes("churn"),
      "`is not addressed by churn` was dismissed — an object follows, the sentence is still about the theme",
    ],
    [
      themesOf("Churn is not the only exposure: churn compounds every month.").includes("churn"),
      "one dismissed occurrence suppressed the whole stem — the guard must be per-occurrence",
    ],
    [
      dismissedStems("A claim-level failure rather than a defect.", keywords).some(
        (d) => d.theme === "defects" && d.stems.includes("defect*"),
      ),
      "`dismissedStems` does not report what the guard removed — a report would show a silent hole",
    ],
  ];
  for (const [pass, why] of negation) check(pass, `negation guard: ${why}`);

  // 8. Tie behaviour (Q20). Before, a tie was settled by the theme name's first
  //    letter — 49 of 109 recorded primaries were decided that way. Now a tie is
  //    reported as a group and compared as a group: `primary` abstains, but the
  //    verdict does not.
  const tied = matchThemes("Cold-start liquidity per building has no density floor", keywords);
  check(
    topGroup(tied).length >= 2,
    `tie probe: a two-mechanism SPOF collapsed to one theme (${topGroup(tied).join("/")}) — the group is gone`,
  );
  check(
    primaryTheme(tied) === null,
    `tie probe: \`primary\` picked "${primaryTheme(tied)}" out of a tie instead of abstaining`,
  );
  const groupA = describeSide(
    "Cold-start liquidity per building has no density floor",
    marketThemes,
    keywords,
  );
  const groupB = describeSide(
    "Density per building never reaches a usable floor",
    marketThemes,
    keywords,
  );
  const intersecting = compareHinge(groupA, groupB);
  check(
    intersecting.verdict === "same",
    `tie probe: groups sharing a theme scored "${intersecting.verdict}" (${intersecting.reason}) — expected "same"`,
  );
  const noStem = describeSide("zzz qqq", marketThemes, keywords);
  const abstained = compareHinge(groupA, noStem);
  check(
    abstained.verdict === "unmatched",
    `tie probe: a side matching no stem scored "${abstained.verdict}" — expected "unmatched", the screen must abstain rather than guess`,
  );

  // 9. `likelihood_not_percent` (Q20). The rule is "don't dress a judgement up as
  //    a probability", not "don't mention a percentage" — the first version failed
  //    a real fixture on the *idea's own take rate*, which is the analysis quoting
  //    its input. Both directions are pinned because narrowing it too far would
  //    let a genuine "70% chance" through.
  for (const s of [
    "Likelihood is roughly 70% within the first year.",
    "There is a 70% chance the take rate collapses.",
    "We estimate an 80 percent probability of failure inside 6 months.",
    "45% risk that supply never forms.",
  ]) {
    check(likelihoodStatedAsPercent(s), `percent probe: missed a probability claim — "${s}"`);
  }
  for (const s of [
    "Sitters keep 80% of the fee and the 20% take purchases no ongoing service.",
    "The only retention hook after three free bookings is a 20% fee with zero risk absorption.",
    "We expect 30% of sitters to churn monthly, which starves the tower.",
  ]) {
    check(
      !likelihoodStatedAsPercent(s),
      `percent probe: flagged a business percentage the analysis is quoting — "${s}"`,
    );
  }

  console.log(
    `\nPreflight: ${originals.length} base fixtures · ${variants.length} variants · ${adjacent.length} adjacent ideas · ${Object.keys(keywords).length} themes`,
  );
  console.log(
    `Screen probes: rephrased → ${rephrased.verdict}, different → ${different.verdict}, co-valid → ${coValid.verdict}, escaped → ${frameEscape.verdict}`,
  );
  console.log(
    `Grammar probes: ${grammar.length} stem cases · ${negation.length} negation-guard cases (dismissal suppressed / verb negation kept) · tie group → ${topGroup(tied).join("/")} (primary abstains) · percent assertion pinned both ways`,
  );
  for (const n of notes) console.log(`  note: ${n}`);

  if (problems.length) {
    console.error(`\n${problems.length} problem(s):`);
    for (const p of problems) console.error(`  ✗ ${p}`);
    process.exit(1);
  }
  console.log("\nOK — fixture set and hinge screen are usable for a stability run.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
