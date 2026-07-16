# Directives — BreakItFirst core sharpness
**Date:** 2026-07-16
**Author:** reviewer agent (read-only)
**Baseline reference:** 2026-07-16_051625 (mean 33.8) — *not independently re-verified this pass, see limitation below*
**Status:** **APPLIED** by implementer (2026-07-16) — prompts + soft-checks; not yet re-scored vs 33.8

---

## 0. Session limitation (read first)

This pass did **not** have access to `eval/baselines/2026-07-16_051625/raw/*.json` or
`SCORE_SUMMARY.md` — only the golden **input** fixtures (`eval/golden/*.json`) were
available, plus the full core: `prompts.ts`, `schema.ts`, `pipeline.ts`,
`archetypes.ts`, `project-overview.md`, `masterplan.md`, `in-progress.md`,
`rubric.md`, `assertions.ts`.

Per the reviewer brief, I will **not** invent fixture-level scores or quote outputs
that were never shown to me. Instead, evidence below is **static consistency
review**: places where a quality criterion is explicitly defined in
`project-overview.md` / `rubric.md`, but is not actually enforced by the current
prompt text or `schema.ts` soft-checks — i.e. gaps the eval harness likely can't
catch yet regardless of which model runs it. See open question #1.

---

## 1. Executive summary

- The existing "sharpness pass" (SPOF mechanism rules, negative examples, claim
  guard on summary/SPOF/likelihood/velocity) is genuinely solid and internally
  consistent with `masterplan.md` §A.5 priority order. Do not touch it.
- That same rigor was applied **only to the SPOF field**. Four other report
  blocks that the docs treat as equally important — cascade middle-steps, stress
  test verdicts, failure-mode domain coverage, resilience↔SPOF correlation —
  have documented "good vs bad" criteria in `project-overview.md`/`rubric.md`
  that have **no corresponding prompt instruction or soft-check**.
- Concretely: a model could produce a cascade with a sharp step 1 (near SPOF)
  and 7 generic filler steps after it, an all-`Maybe` stress test, and 2 empty
  `failure_modes` buckets on an idea where they're clearly relevant (e.g.
  `01-marketplace-pet-sitting`'s own `expected_spof_themes` includes
  `liability`) — and it would pass every hard assertion and every current soft
  check in `assertions.ts`.
- The claim guard (`pass2NovelClaimWarnings`) only watches 4 of the ~9
  free-text-bearing fields; cascade signals and failure-mode bullets can smuggle
  in ungrounded specifics without triggering a warning.
- One prompt line actively works against balance: PASS1's stress-test
  instruction says *"Prefer honest No/Maybe over marking everything Yes"* —
  this nudges toward hedging but has no counter-instruction against
  hedging into all-`Maybe`, and `stressTestNotAllYes` only catches the
  opposite failure mode.
- None of the directives below touch UI, pipeline stage order, model
  temperature, or the Pass 2 retry count.

---

## 2. Evidence from baseline raw

*(No raw baseline outputs were supplied this session — see §0. Evidence is
doc↔code cross-reference instead of fixture output quotes.)*

### Cascade specificity (PASS1_SYSTEM_PROMPT rule 8 / PASS1_5 rule 9)
`prompts.ts` rule 8 says: *"Step 1 should sit next to the SPOF hinge."* — no
requirement for steps 2–10. The final self-check in `buildPass1UserMessage`
only re-checks *"Cascade has 8–10 steps and starts near the SPOF"*. Meanwhile
`project-overview.md` §2.4 explicitly lists as **Buruk**: *"Loncatan magis
tanpa tautan… Urutan bisa diacak tanpa beda arti."* — this "can the middle be
shuffled without changing meaning" test is never asked of the model itself,
only implied as a human scoring criterion (rubric C1).

### Stress test verdict balance
`prompts.ts` PASS1 stress-test paragraph: *"Prefer honest No/Maybe over
marking everything Yes"* (no opposing pressure). `schema.ts`
`stressTestNotAllYes` only fails when **every** item is `Yes`; there is no
`stressTestNotAllMaybe`. An 8-item, all-`Maybe`, generically-worded stress
test passes `stressTestLooksUseful` (needs ≥3 items, ≥1 known id, ≥1
Yes-or-Maybe) and `stressTestNotAllYes` cleanly.

### Failure-mode domain coverage
`schema.ts` schema: `technical/business/security/legal/operations` are each
just `z.array(z.string())` — **no minimum length**. `project-overview.md`
§2.5 explicitly lists as **Buruk**: *"Bucket kosong padahal domain jelas
relevan (boleh kosong jika benar-benar tidak ada — tapi jarang untuk ide
nyata)."* Golden fixture `01-marketplace-pet-sitting`'s own
`expected_spof_themes` (`trust, liability, cold-start, density,
disintermediation`) implies `legal` and `operations` should almost never be
empty for that idea — nothing currently checks this.

### Claim-guard field coverage
`schema.ts` `pass2NovelClaimWarnings` only samples `summary`,
`spof.explanation`, `likelihood.reason`, `failure_velocity.reason`.
`cascade.nodes[].observable_signal` and `failure_modes.*` are outside its
scope, despite `project-overview.md` explicitly requiring signals to be
"observasi dunia nyata" grounded in the analysis, not invented specifics.

### Resilience ↔ SPOF correlation
`rubric.md` R2 and `project-overview.md` §2.7 both give the identical bad
example: *"SPOF trust-rapuh tapi trust = 95."* `schema.ts`
`resilienceProfileLooksSane` checks flatness and a confidence-vs-min-score
floor, but never checks whether the *specific* dimension named by the SPOF is
actually the (or a) low one. This documented criterion has no code path.

---

## 3. Prioritized directives (max 5)

### D1 — Cascade middle-step specificity, not just step 1
- **Priority:** P0
- **Hypothesis:** Cascades currently only enforce SPOF-proximity at step 1;
  steps 2–10 can drift into category-generic filler ("revenue drops", "users
  get frustrated") without failing any check, which is exactly the "shuffle
  test" failure `project-overview.md` warns about.
- **Target file(s):** `src/lib/prompts.ts` — `PASS1_SYSTEM_PROMPT` rule 8,
  `SHARPNESS_DIRECTIVE`, `PASS1_5_SYSTEM_PROMPT` rule 9, and the final
  self-check block in `buildPass1UserMessage`.
- **Change type:** rewrite paragraph + add one negative/positive example pair.
- **Concrete instruction for implementer:**
  1. In PASS1 rule 8, append: *"Not just step 1 — every middle step must name
     something specific to this idea (an actor, number, mechanism, or
     constraint already established), never a domain-generic phrase alone.
     Test: could this exact step drop into another {category} idea's cascade
     unedited? If yes, tie it to a concrete detail from this idea."*
  2. Add one example pair to `SHARPNESS_DIRECTIVE`'s style block: bad —
     *"Retention drops"*; good — *"Sitters stop opening the app once the
     three free-booking credits run out."*
  3. In PASS1_5 rule 9, extend to explicitly re-run the shuffle test on
     middle steps, not just check step count.
  4. Update the self-check line in `buildPass1UserMessage` from *"Cascade has
     8–10 steps and starts near the SPOF"* to add: *"…and at least 6 of the
     8–10 steps name something specific to this idea."*
- **Do not change:** node count range (7–12 hard / 8–10 preferred), the
  `observable_signal` field itself (covered by D4), UI rendering.
- **How to verify:** `BIF_ONLY=01-marketplace-pet-sitting npm run eval:baseline`
  (and one more fixture), manually re-run the shuffle test on the raw cascade
  steps; compare `soft_cascade_depth_preferred`/`soft_signals_observational`
  pass rates before/after; full re-eval vs 33.8 if budget allows.
- **Risk:** small system-prompt token increase; possible over-literal
  compliance (model padding steps with a forced "specific-sounding" detail
  that isn't actually load-bearing) — watch for this in manual C1/C2 scoring.

### D2 — Stop stress-test hedging into all-`Maybe`
- **Priority:** P0
- **Hypothesis:** The current instruction to "prefer No/Maybe over Yes" has no
  counterweight, and the only soft-check (`stressTestNotAllYes`) is asymmetric
  — it can't catch an equally uninformative all-`Maybe` result.
- **Target file(s):** `src/lib/prompts.ts` (PASS1 stress-test paragraph,
  `PASS2_SYSTEM_PROMPT` stress_test.items rule), `src/lib/schema.ts` (new
  soft-check), `eval/assertions.ts` (register it).
- **Change type:** rewrite paragraph + add soft-check.
- **Concrete instruction for implementer:**
  1. Replace PASS1's *"Prefer honest No/Maybe over marking everything Yes"*
     with: *"Yes requires a named idea-specific mechanism. No requires stating
     why the pattern doesn't apply here (not just 'not applicable'). Maybe is
     reserved for genuine uncertainty where you can name what evidence would
     resolve it — Maybe is not a safe default; an all-Maybe stress test is as
     uninformative as an all-Yes one."*
  2. In `PASS2_SYSTEM_PROMPT` stress_test.items rule, add: *"reason must cite
     the specific idea detail behind the verdict, not restate the archetype's
     generic definition."*
  3. Add `stressTestNotAllMaybe(analysis)` to `schema.ts`, mirroring
     `stressTestNotAllYes` (e.g. fail if `maybeCount / items.length >= 0.75`
     — tune threshold once real output is available), wire into
     `runSoftChecks` and `eval/assertions.ts` as `soft_stress_not_all_maybe`.
- **Do not change:** the archetype list itself, `stress_test.items` min/max
  bounds (1–16).
- **How to verify:** `npm run eval:assert-sample` still passes (current sample
  has a 2-Yes/2-Maybe/2-No/2-No-ish mix, won't trip a 0.75 threshold — good
  regression guard); re-eval vs 33.8; specifically watch that
  `stressTestNotAllYes` doesn't start failing as a side effect of pushing
  verdicts back toward Yes.
- **Risk:** rebalancing could overshoot toward more `Yes` verdicts if not
  worded carefully; threshold in the new soft-check is a guess pending real
  data (open question #3).

### D3 — Minimum failure-mode domain coverage
- **Priority:** P1
- **Hypothesis:** `failure_modes.*` has no minimum length in schema or
  prompt, so a model can leave 2+ domains empty even when the idea clearly
  implicates them (documented as a "Buruk" pattern, never enforced).
- **Target file(s):** `src/lib/prompts.ts` (risk-domains instruction in
  `PASS1_SYSTEM_PROMPT` / `buildPass1UserMessage` item 6), `src/lib/schema.ts`
  (new soft-check), `eval/assertions.ts`.
- **Change type:** add rule + soft-check only (explicitly **not** a hard
  schema minimum — see non-goals).
- **Concrete instruction for implementer:**
  1. Add to the risk-domains section: *"Populate at least 3 of the 5 domains
     with ≥1 idea-specific bullet. Leave a domain empty only when you can
     genuinely argue it has no material exposure for this idea — not because
     it's harder to write."*
  2. Add `failureModesCoverageLooksSane(analysis)` to `schema.ts`: count keys
     with `length >= 1`, fail (soft) if `< 3`. Wire into `runSoftChecks` and
     `assertions.ts` as `soft_failure_modes_coverage`.
- **Do not change:** the 5 key names, hard schema (`z.array(z.string())`
  stays unbounded — no hard minimum, per non-goals).
- **How to verify:** re-run `01-marketplace-pet-sitting` and
  `05-hardware-fitness-ring` (both have clearly multi-domain
  `expected_spof_themes`); check bucket-count distribution before/after.
- **Risk:** a hard minimum would be dangerous (some ideas legitimately have
  <3 relevant domains, e.g. a narrow internal tool) — keep this **soft/log
  only**, not a Pass 2 retry trigger. See open question #2.

### D4 — Extend claim guard to cascade signals and failure-mode bullets
- **Priority:** P1
- **Hypothesis:** `pass2NovelClaimWarnings` only watches 4 free-text fields;
  `observable_signal` and `failure_modes` bullets can carry Pass-2-invented
  specifics (numbers, named metrics) with zero grounding check, even though
  these are exactly the fields most likely to accumulate false precision
  (concrete "signals" are an easy place to quietly invent a number).
- **Target file(s):** `src/lib/schema.ts` only — no prompt change needed.
- **Change type:** extend existing function (cheap, no token/latency cost).
- **Concrete instruction for implementer:** in `pass2NovelClaimWarnings`,
  add two entries to the `samples` array:
  ```
  { label: "cascade.signals",
    text: analysis.cascade.nodes.map(n => n.observable_signal).join(" "),
    threshold: 0.30 },
  { label: "failure_modes",
    text: Object.values(analysis.failure_modes).flat().join(" "),
    threshold: 0.25 },
  ```
  Thresholds are starting guesses (looser than summary/SPOF since these are
  short/listy text with naturally lower word-overlap ratio) — flag for
  re-tuning once real outputs are available (open question #1). The existing
  numeric-invention check in the same loop applies automatically to these new
  samples.
- **Do not change:** the 4 existing samples' thresholds, the overall
  claim-guard warning format (still non-blocking, `warnings[]` only).
- **How to verify:** re-eval, inspect `warnings` output count/false-positive
  rate on 2+ fixtures manually before trusting thresholds.
- **Risk:** thresholds picked without real data could over- or under-fire;
  this is a **warning-only** mechanism so worst case is noisy `warnings[]`,
  not a blocked analysis — low risk to ship, but tune before relying on it.

### D5 — Resilience score should track the SPOF's own dimension
- **Priority:** P2
- **Hypothesis:** `rubric.md` R2 and `project-overview.md` §2.7 both define
  "SPOF-relevant dimension should be relatively low" as a quality bar, but no
  code checks it — `resilienceProfileLooksSane` only checks flatness and a
  confidence-vs-floor rule, not correlation with the SPOF's actual theme.
- **Target file(s):** `src/lib/schema.ts` (new soft-check + small keyword
  map), `eval/assertions.ts`.
- **Change type:** soft-check only, no prompt change.
- **Concrete instruction for implementer:** add
  `spofDimensionLooksLow(analysis)` — a small keyword→dimension map (e.g.
  `trust|safety` → `trust`; `regulat|legal|waiver|licens` → `legal`;
  `cost|margin|price|unit economics` → `business`; `supply chain|oem|defect|
  manufactur` → `operations`/`technical`; `support|scale|ops` →
  `operations`), matched against `single_point_of_failure.component +
  explanation`. If exactly one dimension matches confidently, soft-fail when
  that dimension's score is the *highest* (or top-2) of the 5. Ambiguous/no
  match → skip (return true, don't guess). Wire into `runSoftChecks` /
  `assertions.ts` as `soft_resilience_matches_spof`.
- **Do not change:** `resilienceProfileLooksSane`'s existing logic (keep as
  a separate, additive check, not a replacement).
- **How to verify:** manually check the keyword map against 3–4 fixtures'
  expected SPOF themes for false-positive tagging before trusting it in CI.
- **Risk:** keyword matching is fuzzy and can mis-tag ambiguous SPOFs —
  ship as **informational only** (surfaced in `warnings[]` alongside other
  soft-checks), never block on it.

---

## 4. Explicit non-goals

- No UI/theme/visual changes of any kind.
- No change to pipeline stage order, Pass 2 retry count, or model
  temperatures in `pipeline.ts`.
- No hard schema minimums added anywhere (D3 stays soft-check only) — hard
  minimums risk failing legitimately narrow ideas.
- No redesign of the archetype taxonomy (`archetypes.ts` content itself) —
  only how stress-test verdicts against it are graded (D2).
- No change to Deep Analysis (C.6) default-on/off behavior.
- No change to rate limiting, i18n dictionaries, or provider/BYOK code.

## 5. Suggested implementer order

Soft-check-only additions first (zero prompt/token cost, easiest to isolate
in eval delta), then the two prompt-level rewrites last so their effect can
be measured independently:

1. **D4** — extend claim guard (schema.ts only, cheapest, no prompt risk)
2. **D3** — failure-mode coverage soft-check + one short prompt line
3. **D5** — resilience↔SPOF soft-check (schema.ts only)
4. **D2** — stress-test rebalance (prompt rewrite + soft-check)
5. **D1** — cascade middle-step specificity (prompt rewrite, highest token
   cost, measure last so its delta isn't confounded with D2/D3)

After each step: `npm run eval:assert-sample` (must stay green), then
`tsc`, before moving to the next.

## 6. Open questions for owner

1. Can you attach 2 raw baseline files (`04-saas-team-wiki.json`,
   `05-hardware-fitness-ring.json` from `eval/baselines/2026-07-16_051625/raw/`)
   in a follow-up pass? All 5 directives above were derived from
   doc↔code inconsistency, not observed model behavior — a raw-output pass
   would confirm which of these actually manifest vs. are already avoided by
   incidental prompt phrasing elsewhere.
2. D3 (domain coverage): soft-check only, or do you want it to eventually
   become a hard Pass-2-retry trigger once you've seen real distribution
   data? Soft is safer now but won't stop a bad output from reaching the user
   — only a review-time warning today, since there's no server-side gating
   on soft-check failures currently (`pipeline.ts` only warns, never blocks).
3. D2's 0.75 maybe-ratio threshold is a guess — do you have a preference
   here, or should the implementer just ship it disabled (log-only, not
   counted in `hard_fail`/`soft_fail` summary) until tuned against real runs?
