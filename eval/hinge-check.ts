/**
 * Offline preflight for the Q10 stability harness — no provider, no credentials.
 *
 * Two failure modes this catches before a paid run burns calls:
 *
 *  1. Fixture set out of shape — a base with a missing rewrite kind, a variant
 *     pointing at a base that does not exist, a theme with no keyword stems
 *     (which makes that theme permanently invisible to the screen).
 *  2. A degenerate screen — a stem so broad that every hinge maps to one theme
 *     reports zero drift no matter what the model does, which looks like success.
 *     The probes below assert the screen still separates a rephrased hinge from
 *     a genuinely different one.
 *
 * Usage: npm run eval:hinge-check
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compareHinge, describeSide, loadThemeKeywords } from "./hinge-labels";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = path.join(__dirname, "golden");
const VARIANTS_DIR = path.join(__dirname, "golden-variants");
const REQUIRED_KINDS = ["para", "strip", "flip"];

type Fixture = {
  id: string;
  variant_of?: string;
  variant_kind?: string;
  idea: string;
  expected_spof_themes?: string[];
};

async function loadDir(dir: string): Promise<Fixture[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
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

  // 3. Every theme a fixture expects has keyword stems, or the screen goes blind.
  const declared = new Set(
    [...originals, ...variants].flatMap((f) => f.expected_spof_themes ?? []),
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

  console.log(
    `\nPreflight: ${originals.length} base fixtures · ${variants.length} variants · ${Object.keys(keywords).length} themes`,
  );
  console.log(
    `Screen probes: rephrased → ${rephrased.verdict}, different → ${different.verdict}`,
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
