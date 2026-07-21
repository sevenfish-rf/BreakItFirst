# 91 — Directives & reviewer handoff (archive)
**Historical.** Implementer follows owner-approved directives then updates `01-product.md` / `02-develop.md`.

---

## A. Reviewer handoff (was HANDOFF-REVIEWER.md)

# Handoff â€” Reviewer Agent (READ-ONLY â†’ tulis MD arahan)

**Peran agent ini:** reviewer / strategist quality core.  
**Bukan** implementer. **Jangan edit** `src/`, `eval/` scores, atau pipeline.

**Output wajib:** satu file Markdown arahan (lihat template di bawah).  
**Setelah file itu ada:** owner serahkan ke implementer (Grok / agent lain) untuk ubah `prompts.ts` (+ kalau perlu `archetypes` / soft-check), **bukan** UI.

---

## Prompt untuk reviewer (copy-paste)

```markdown
# Role
You are a **read-only quality reviewer** for BreakItFirst, a failure-analysis engine
(not a chatbot or business coach). You do **not** edit application code.

# Your only deliverable
Write **one new Markdown file** with concrete directions for improving analysis
sharpness. Path:

  docs/91-directives.md (append section)

(Use today's date. Create the `directives/` folder if missing.)

Do **not**:
- Modify `src/**`, `package.json`, or baseline scores
- Implement prompts yourself
- Propose UI/theme work unless it blocks core quality (it almost never does)
- Invent eval scores without reading actual raw outputs

# Product north star
Question: "How would this idea most likely fail?"
Invariants: specificity > generic advice; causal mechanisms; no pep talk;
no single overall danger score; cascade is linear; Deep analysis stays opt-in.

# Official baseline (measure against later â€” you only recommend)
- Run: `eval/baselines/2026-07-16_051625`
- Mean quality score: **33.8 / 34** (owner-locked)
- Historical: `2026-07-16_043835` mean 33.4
- Latest code may include a "sharpness pass" **not yet re-scored** â€” note that

# What to read (in order)
1. docs/90-history.md â€” A (philosophy), C/D (mechanisms), E (done)
2. docs/90-history.md â€” current status
3. docs/01-product.md â€” product identity + report block quality bar
4. src/lib/prompts.ts â€” Pass 1 / 1.5 / 2 (main lever)
5. src/lib/pipeline.ts â€” stage order only (don't redesign unless necessary)
6. src/lib/archetypes.ts â€” knowledge layer
7. src/lib/schema.ts â€” soft-checks / claim-guard (secondary)
8. eval/rubric.md
9. eval/baselines/2026-07-16_051625/SCORE_SUMMARY.md
10. At least two raw reports:
    - eval/baselines/2026-07-16_051625/raw/04-saas-team-wiki.json
    - eval/baselines/2026-07-16_051625/raw/05-hardware-fitness-ring.json
    Optionally also 01 and 03 if you need more signal.

# Analysis goals
Find the **highest-leverage prompt (or small pipeline) changes** so that:
- SPOF labels stay short **and** name a concrete mechanism (not "trust collapse")
- Cascades stay 8â€“10 causal steps with observational signals (not advice)
- Pass 2 does not invent numbers in likelihood / velocity
- "Looks solid" ideas get attacked on their differentiator
- Outputs feel more "I hadn't thought of that" vs name-swappable startup advice

# Output file structure (required sections)
Use this exact outline in DIRECTIVES-YYYY-MM-DD.md:

## 1. Executive summary
- 3â€“6 bullets: what's already strong vs what's still weak

## 2. Evidence from baseline raw
- Cite fixture ids and quote short snippets (SPOF label, cascade length, warnings)
- Map each weakness â†’ which stage (Pass1 / 1.5 / Pass2)

## 3. Prioritized directives (max 5)
For each directive:
- **ID:** D1, D2, â€¦
- **Priority:** P0 / P1 / P2
- **Hypothesis:** one sentence
- **Target file(s):** almost always `src/lib/prompts.ts` (be specific: PASS1 / PASS1_5 / PASS2)
- **Change type:** add rule / rewrite paragraph / add negative example / soft-check only
- **Concrete instruction for implementer:** what to write or change (enough detail to implement without guessing)
- **Do not change:** anything out of scope
- **How to verify:** e.g. re-eval full set vs 33.8, or BIF_ONLY=04-saas-team-wiki
- **Risk:** token cost, latency, over-constraint, regression

## 4. Explicit non-goals
- List what implementer must ignore this round

## 5. Suggested implementer order
- Ordered checklist (D? then D? â€¦)

## 6. Open questions for owner (optional, max 3)
- Only if a product decision is truly required

# Tone of the directives file
- Actionable, specific, concise
- Indonesian or English OK (owner is Indonesian-speaking; English technical terms fine)
- No code dumps of entire prompts unless a short snippet is essential
- Prefer "add this rule: â€¦" over vague "make it better"

# Done when
The directives MD exists, is self-contained, and an implementer can apply it
to prompts without asking what you meant.
```

---

## File yang owner sertakan ke reviewer

### Wajib

| Path |
|------|
| `docs/91-directives.md` (file ini) |
| `docs/90-history.md` |
| `docs/90-history.md` |
| `docs/01-product.md` |
| `src/lib/prompts.ts` |
| `src/lib/pipeline.ts` |
| `src/lib/archetypes.ts` |
| `src/lib/schema.ts` |
| `eval/rubric.md` |
| `eval/baselines/2026-07-16_051625/SCORE_SUMMARY.md` |
| `eval/baselines/2026-07-16_051625/raw/04-saas-team-wiki.json` |
| `eval/baselines/2026-07-16_051625/raw/05-hardware-fitness-ring.json` |

### Opsional

| Path |
|------|
| `eval/baselines/2026-07-16_051625/raw/01-marketplace-pet-sitting.json` |
| `eval/baselines/2026-07-16_051625/raw/03-ai-therapy-chat.json` |
| `eval/golden/*.json` (ide input) |
| `src/types/analysis.ts` |

### Jangan sertakan

- API keys  
- Seluruh `node_modules` / `.next`  
- UI components (kecuali reviewer memaksa â€” default tidak)  
- Semua raw 5 file kalau context sempit â€” 2 raw cukup  

---

## Alur kerja (kamu)

```
1. Kasih HANDOFF-REVIEWER.md + file wajib ke agent reviewer
2. Agent tulis: docs/91-directives.md (append section)
3. Kamu review isi arahan (setuju / coret)
4. Serahkan file DIRECTIVES-* ke implementer (Grok):
   "Kerjakan arahan di docs/archive/directives/DIRECTIVES-â€¦.md
    â€” hanya prompts/core, no UI, ukur vs 33.8 kalau bisa"
5. Implementer edit prompts â†’ smoke assert â†’ (opsional) eval:baseline
```

---

## Template kosong (reviewer boleh copy ke file output)

```markdown
# Directives â€” BreakItFirst core sharpness
**Date:** YYYY-MM-DD  
**Author:** reviewer agent (read-only)  
**Baseline reference:** 2026-07-16_051625 (mean 33.8)  
**Status:** READY FOR IMPLEMENTER â€” do not treat as applied until coded

## 1. Executive summary
- â€¦

## 2. Evidence from baseline raw
### 04-saas-team-wiki
- â€¦
### 05-hardware-fitness-ring
- â€¦

## 3. Prioritized directives
### D1 â€” â€¦
- Priority:
- Hypothesis:
- Target file(s):
- Change type:
- Concrete instruction for implementer:
- Do not change:
- How to verify:
- Risk:

### D2 â€” â€¦
â€¦

## 4. Explicit non-goals
- â€¦

## 5. Suggested implementer order
1. â€¦
2. â€¦

## 6. Open questions for owner
- â€¦
```

---

## Catatan untuk implementer (Grok) nanti

Saat file `DIRECTIVES-*.md` sudah ada dan owner bilang gas:

1. Baca directives end-to-end  
2. Implement **hanya** D-priority sesuai order (biasanya `prompts.ts`)  
3. Jangan UI  
4. `npm run eval:assert-sample` + `tsc`  
5. Minta owner re-eval vs **33.8** bila mau claim improvement  
6. Update `docs/90-history.md` + live `docs/01-product.md` / `reference.md` if semantics change  


**Jangan** mulai implement sebelum file DIRECTIVES dari reviewer ada.


---

## B. DIRECTIVES-2026-07-16

# Directives â€” BreakItFirst core sharpness
**Date:** 2026-07-16
**Author:** reviewer agent (read-only)
**Baseline reference:** 2026-07-16_051625 (mean 33.8) â€” *not independently re-verified this pass, see limitation below*
**Status:** **APPLIED** by implementer (2026-07-16) â€” prompts + soft-checks; not yet re-scored vs 33.8

---

## 0. Session limitation (read first)

This pass did **not** have access to `eval/baselines/2026-07-16_051625/raw/*.json` or
`SCORE_SUMMARY.md` â€” only the golden **input** fixtures (`eval/golden/*.json`) were
available, plus the full core: `prompts.ts`, `schema.ts`, `pipeline.ts`,
`archetypes.ts`, `project-overview.md`, `masterplan.md`, `in-progress.md`,
`rubric.md`, `assertions.ts`.

Per the reviewer brief, I will **not** invent fixture-level scores or quote outputs
that were never shown to me. Instead, evidence below is **static consistency
review**: places where a quality criterion is explicitly defined in
`project-overview.md` / `rubric.md`, but is not actually enforced by the current
prompt text or `schema.ts` soft-checks â€” i.e. gaps the eval harness likely can't
catch yet regardless of which model runs it. See open question #1.

---

## 1. Executive summary

- The existing "sharpness pass" (SPOF mechanism rules, negative examples, claim
  guard on summary/SPOF/likelihood/velocity) is genuinely solid and internally
  consistent with `masterplan.md` Â§A.5 priority order. Do not touch it.
- That same rigor was applied **only to the SPOF field**. Four other report
  blocks that the docs treat as equally important â€” cascade middle-steps, stress
  test verdicts, failure-mode domain coverage, resilienceâ†”SPOF correlation â€”
  have documented "good vs bad" criteria in `project-overview.md`/`rubric.md`
  that have **no corresponding prompt instruction or soft-check**.
- Concretely: a model could produce a cascade with a sharp step 1 (near SPOF)
  and 7 generic filler steps after it, an all-`Maybe` stress test, and 2 empty
  `failure_modes` buckets on an idea where they're clearly relevant (e.g.
  `01-marketplace-pet-sitting`'s own `expected_spof_themes` includes
  `liability`) â€” and it would pass every hard assertion and every current soft
  check in `assertions.ts`.
- The claim guard (`pass2NovelClaimWarnings`) only watches 4 of the ~9
  free-text-bearing fields; cascade signals and failure-mode bullets can smuggle
  in ungrounded specifics without triggering a warning.
- One prompt line actively works against balance: PASS1's stress-test
  instruction says *"Prefer honest No/Maybe over marking everything Yes"* â€”
  this nudges toward hedging but has no counter-instruction against
  hedging into all-`Maybe`, and `stressTestNotAllYes` only catches the
  opposite failure mode.
- None of the directives below touch UI, pipeline stage order, model
  temperature, or the Pass 2 retry count.

---

## 2. Evidence from baseline raw

*(No raw baseline outputs were supplied this session â€” see Â§0. Evidence is
docâ†”code cross-reference instead of fixture output quotes.)*

### Cascade specificity (PASS1_SYSTEM_PROMPT rule 8 / PASS1_5 rule 9)
`prompts.ts` rule 8 says: *"Step 1 should sit next to the SPOF hinge."* â€” no
requirement for steps 2â€“10. The final self-check in `buildPass1UserMessage`
only re-checks *"Cascade has 8â€“10 steps and starts near the SPOF"*. Meanwhile
`project-overview.md` Â§2.4 explicitly lists as **Buruk**: *"Loncatan magis
tanpa tautanâ€¦ Urutan bisa diacak tanpa beda arti."* â€” this "can the middle be
shuffled without changing meaning" test is never asked of the model itself,
only implied as a human scoring criterion (rubric C1).

### Stress test verdict balance
`prompts.ts` PASS1 stress-test paragraph: *"Prefer honest No/Maybe over
marking everything Yes"* (no opposing pressure). `schema.ts`
`stressTestNotAllYes` only fails when **every** item is `Yes`; there is no
`stressTestNotAllMaybe`. An 8-item, all-`Maybe`, generically-worded stress
test passes `stressTestLooksUseful` (needs â‰¥3 items, â‰¥1 known id, â‰¥1
Yes-or-Maybe) and `stressTestNotAllYes` cleanly.

### Failure-mode domain coverage
`schema.ts` schema: `technical/business/security/legal/operations` are each
just `z.array(z.string())` â€” **no minimum length**. `project-overview.md`
Â§2.5 explicitly lists as **Buruk**: *"Bucket kosong padahal domain jelas
relevan (boleh kosong jika benar-benar tidak ada â€” tapi jarang untuk ide
nyata)."* Golden fixture `01-marketplace-pet-sitting`'s own
`expected_spof_themes` (`trust, liability, cold-start, density,
disintermediation`) implies `legal` and `operations` should almost never be
empty for that idea â€” nothing currently checks this.

### Claim-guard field coverage
`schema.ts` `pass2NovelClaimWarnings` only samples `summary`,
`spof.explanation`, `likelihood.reason`, `failure_velocity.reason`.
`cascade.nodes[].observable_signal` and `failure_modes.*` are outside its
scope, despite `project-overview.md` explicitly requiring signals to be
"observasi dunia nyata" grounded in the analysis, not invented specifics.

### Resilience â†” SPOF correlation
`rubric.md` R2 and `project-overview.md` Â§2.7 both give the identical bad
example: *"SPOF trust-rapuh tapi trust = 95."* `schema.ts`
`resilienceProfileLooksSane` checks flatness and a confidence-vs-min-score
floor, but never checks whether the *specific* dimension named by the SPOF is
actually the (or a) low one. This documented criterion has no code path.

---

## 3. Prioritized directives (max 5)

### D1 â€” Cascade middle-step specificity, not just step 1
- **Priority:** P0
- **Hypothesis:** Cascades currently only enforce SPOF-proximity at step 1;
  steps 2â€“10 can drift into category-generic filler ("revenue drops", "users
  get frustrated") without failing any check, which is exactly the "shuffle
  test" failure `project-overview.md` warns about.
- **Target file(s):** `src/lib/prompts.ts` â€” `PASS1_SYSTEM_PROMPT` rule 8,
  `SHARPNESS_DIRECTIVE`, `PASS1_5_SYSTEM_PROMPT` rule 9, and the final
  self-check block in `buildPass1UserMessage`.
- **Change type:** rewrite paragraph + add one negative/positive example pair.
- **Concrete instruction for implementer:**
  1. In PASS1 rule 8, append: *"Not just step 1 â€” every middle step must name
     something specific to this idea (an actor, number, mechanism, or
     constraint already established), never a domain-generic phrase alone.
     Test: could this exact step drop into another {category} idea's cascade
     unedited? If yes, tie it to a concrete detail from this idea."*
  2. Add one example pair to `SHARPNESS_DIRECTIVE`'s style block: bad â€”
     *"Retention drops"*; good â€” *"Sitters stop opening the app once the
     three free-booking credits run out."*
  3. In PASS1_5 rule 9, extend to explicitly re-run the shuffle test on
     middle steps, not just check step count.
  4. Update the self-check line in `buildPass1UserMessage` from *"Cascade has
     8â€“10 steps and starts near the SPOF"* to add: *"â€¦and at least 6 of the
     8â€“10 steps name something specific to this idea."*
- **Do not change:** node count range (7â€“12 hard / 8â€“10 preferred), the
  `observable_signal` field itself (covered by D4), UI rendering.
- **How to verify:** `BIF_ONLY=01-marketplace-pet-sitting npm run eval:baseline`
  (and one more fixture), manually re-run the shuffle test on the raw cascade
  steps; compare `soft_cascade_depth_preferred`/`soft_signals_observational`
  pass rates before/after; full re-eval vs 33.8 if budget allows.
- **Risk:** small system-prompt token increase; possible over-literal
  compliance (model padding steps with a forced "specific-sounding" detail
  that isn't actually load-bearing) â€” watch for this in manual C1/C2 scoring.

### D2 â€” Stop stress-test hedging into all-`Maybe`
- **Priority:** P0
- **Hypothesis:** The current instruction to "prefer No/Maybe over Yes" has no
  counterweight, and the only soft-check (`stressTestNotAllYes`) is asymmetric
  â€” it can't catch an equally uninformative all-`Maybe` result.
- **Target file(s):** `src/lib/prompts.ts` (PASS1 stress-test paragraph,
  `PASS2_SYSTEM_PROMPT` stress_test.items rule), `src/lib/schema.ts` (new
  soft-check), `eval/assertions.ts` (register it).
- **Change type:** rewrite paragraph + add soft-check.
- **Concrete instruction for implementer:**
  1. Replace PASS1's *"Prefer honest No/Maybe over marking everything Yes"*
     with: *"Yes requires a named idea-specific mechanism. No requires stating
     why the pattern doesn't apply here (not just 'not applicable'). Maybe is
     reserved for genuine uncertainty where you can name what evidence would
     resolve it â€” Maybe is not a safe default; an all-Maybe stress test is as
     uninformative as an all-Yes one."*
  2. In `PASS2_SYSTEM_PROMPT` stress_test.items rule, add: *"reason must cite
     the specific idea detail behind the verdict, not restate the archetype's
     generic definition."*
  3. Add `stressTestNotAllMaybe(analysis)` to `schema.ts`, mirroring
     `stressTestNotAllYes` (e.g. fail if `maybeCount / items.length >= 0.75`
     â€” tune threshold once real output is available), wire into
     `runSoftChecks` and `eval/assertions.ts` as `soft_stress_not_all_maybe`.
- **Do not change:** the archetype list itself, `stress_test.items` min/max
  bounds (1â€“16).
- **How to verify:** `npm run eval:assert-sample` still passes (current sample
  has a 2-Yes/2-Maybe/2-No/2-No-ish mix, won't trip a 0.75 threshold â€” good
  regression guard); re-eval vs 33.8; specifically watch that
  `stressTestNotAllYes` doesn't start failing as a side effect of pushing
  verdicts back toward Yes.
- **Risk:** rebalancing could overshoot toward more `Yes` verdicts if not
  worded carefully; threshold in the new soft-check is a guess pending real
  data (open question #3).

### D3 â€” Minimum failure-mode domain coverage
- **Priority:** P1
- **Hypothesis:** `failure_modes.*` has no minimum length in schema or
  prompt, so a model can leave 2+ domains empty even when the idea clearly
  implicates them (documented as a "Buruk" pattern, never enforced).
- **Target file(s):** `src/lib/prompts.ts` (risk-domains instruction in
  `PASS1_SYSTEM_PROMPT` / `buildPass1UserMessage` item 6), `src/lib/schema.ts`
  (new soft-check), `eval/assertions.ts`.
- **Change type:** add rule + soft-check only (explicitly **not** a hard
  schema minimum â€” see non-goals).
- **Concrete instruction for implementer:**
  1. Add to the risk-domains section: *"Populate at least 3 of the 5 domains
     with â‰¥1 idea-specific bullet. Leave a domain empty only when you can
     genuinely argue it has no material exposure for this idea â€” not because
     it's harder to write."*
  2. Add `failureModesCoverageLooksSane(analysis)` to `schema.ts`: count keys
     with `length >= 1`, fail (soft) if `< 3`. Wire into `runSoftChecks` and
     `assertions.ts` as `soft_failure_modes_coverage`.
- **Do not change:** the 5 key names, hard schema (`z.array(z.string())`
  stays unbounded â€” no hard minimum, per non-goals).
- **How to verify:** re-run `01-marketplace-pet-sitting` and
  `05-hardware-fitness-ring` (both have clearly multi-domain
  `expected_spof_themes`); check bucket-count distribution before/after.
- **Risk:** a hard minimum would be dangerous (some ideas legitimately have
  <3 relevant domains, e.g. a narrow internal tool) â€” keep this **soft/log
  only**, not a Pass 2 retry trigger. See open question #2.

### D4 â€” Extend claim guard to cascade signals and failure-mode bullets
- **Priority:** P1
- **Hypothesis:** `pass2NovelClaimWarnings` only watches 4 free-text fields;
  `observable_signal` and `failure_modes` bullets can carry Pass-2-invented
  specifics (numbers, named metrics) with zero grounding check, even though
  these are exactly the fields most likely to accumulate false precision
  (concrete "signals" are an easy place to quietly invent a number).
- **Target file(s):** `src/lib/schema.ts` only â€” no prompt change needed.
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
  short/listy text with naturally lower word-overlap ratio) â€” flag for
  re-tuning once real outputs are available (open question #1). The existing
  numeric-invention check in the same loop applies automatically to these new
  samples.
- **Do not change:** the 4 existing samples' thresholds, the overall
  claim-guard warning format (still non-blocking, `warnings[]` only).
- **How to verify:** re-eval, inspect `warnings` output count/false-positive
  rate on 2+ fixtures manually before trusting thresholds.
- **Risk:** thresholds picked without real data could over- or under-fire;
  this is a **warning-only** mechanism so worst case is noisy `warnings[]`,
  not a blocked analysis â€” low risk to ship, but tune before relying on it.

### D5 â€” Resilience score should track the SPOF's own dimension
- **Priority:** P2
- **Hypothesis:** `rubric.md` R2 and `project-overview.md` Â§2.7 both define
  "SPOF-relevant dimension should be relatively low" as a quality bar, but no
  code checks it â€” `resilienceProfileLooksSane` only checks flatness and a
  confidence-vs-floor rule, not correlation with the SPOF's actual theme.
- **Target file(s):** `src/lib/schema.ts` (new soft-check + small keyword
  map), `eval/assertions.ts`.
- **Change type:** soft-check only, no prompt change.
- **Concrete instruction for implementer:** add
  `spofDimensionLooksLow(analysis)` â€” a small keywordâ†’dimension map (e.g.
  `trust|safety` â†’ `trust`; `regulat|legal|waiver|licens` â†’ `legal`;
  `cost|margin|price|unit economics` â†’ `business`; `supply chain|oem|defect|
  manufactur` â†’ `operations`/`technical`; `support|scale|ops` â†’
  `operations`), matched against `single_point_of_failure.component +
  explanation`. If exactly one dimension matches confidently, soft-fail when
  that dimension's score is the *highest* (or top-2) of the 5. Ambiguous/no
  match â†’ skip (return true, don't guess). Wire into `runSoftChecks` /
  `assertions.ts` as `soft_resilience_matches_spof`.
- **Do not change:** `resilienceProfileLooksSane`'s existing logic (keep as
  a separate, additive check, not a replacement).
- **How to verify:** manually check the keyword map against 3â€“4 fixtures'
  expected SPOF themes for false-positive tagging before trusting it in CI.
- **Risk:** keyword matching is fuzzy and can mis-tag ambiguous SPOFs â€”
  ship as **informational only** (surfaced in `warnings[]` alongside other
  soft-checks), never block on it.

---

## 4. Explicit non-goals

- No UI/theme/visual changes of any kind.
- No change to pipeline stage order, Pass 2 retry count, or model
  temperatures in `pipeline.ts`.
- No hard schema minimums added anywhere (D3 stays soft-check only) â€” hard
  minimums risk failing legitimately narrow ideas.
- No redesign of the archetype taxonomy (`archetypes.ts` content itself) â€”
  only how stress-test verdicts against it are graded (D2).
- No change to Deep Analysis (C.6) default-on/off behavior.
- No change to rate limiting, i18n dictionaries, or provider/BYOK code.

## 5. Suggested implementer order

Soft-check-only additions first (zero prompt/token cost, easiest to isolate
in eval delta), then the two prompt-level rewrites last so their effect can
be measured independently:

1. **D4** â€” extend claim guard (schema.ts only, cheapest, no prompt risk)
2. **D3** â€” failure-mode coverage soft-check + one short prompt line
3. **D5** â€” resilienceâ†”SPOF soft-check (schema.ts only)
4. **D2** â€” stress-test rebalance (prompt rewrite + soft-check)
5. **D1** â€” cascade middle-step specificity (prompt rewrite, highest token
   cost, measure last so its delta isn't confounded with D2/D3)

After each step: `npm run eval:assert-sample` (must stay green), then
`tsc`, before moving to the next.

## 6. Open questions for owner

1. Can you attach 2 raw baseline files (`04-saas-team-wiki.json`,
   `05-hardware-fitness-ring.json` from `eval/baselines/2026-07-16_051625/raw/`)
   in a follow-up pass? All 5 directives above were derived from
   docâ†”code inconsistency, not observed model behavior â€” a raw-output pass
   would confirm which of these actually manifest vs. are already avoided by
   incidental prompt phrasing elsewhere.
2. D3 (domain coverage): soft-check only, or do you want it to eventually
   become a hard Pass-2-retry trigger once you've seen real distribution
   data? Soft is safer now but won't stop a bad output from reaching the user
   â€” only a review-time warning today, since there's no server-side gating
   on soft-check failures currently (`pipeline.ts` only warns, never blocks).
3. D2's 0.75 maybe-ratio threshold is a guess â€” do you have a preference
   here, or should the implementer just ship it disabled (log-only, not
   counted in `hard_fail`/`soft_fail` summary) until tuned against real runs?


---

## C. DIRECTIVES-2026-07-20

# BreakItFirst Engine Architecture vNext
**Status:** Design notes â€” **partially applied 2026-07-20** as prompt/soft-check *refine* (multi-hyp, dominance, counterfactual, pathway likelihood, modesâ†”cascade). Full multi-call hypothesis engine + formal causal-graph schema **not** implemented (by design).
**Audience:** Programmer / AI Engineer
**Purpose:** Refine Pass 1 reasoning architecture without changing the external product.

---

# Core Identity

BreakItFirst is **not** a risk analysis tool.

BreakItFirst is a **premortem / failure-analysis engine for unbuilt ideas**
(adversarial *idea* critique â€” **not** security AI red-teaming of a live platform).

It uses **Failure Reasoning** to construct the most plausible failure argument before execution.

---

# Core Mission

The engine should answer one question:

> "What is the most plausible way this idea fails, and why?"

Not:

- Is this idea good?
- Will this startup succeed?
- Give me advice.
- Generate business ideas.
- Predict the future.

Instead:

Construct one coherent, defensible failure argument.

---

# Mental Model

The engine should not think like:

Idea
â†“

Risk Analysis
â†“

Report

Instead it should think like:

Idea
â†“

Generate multiple failure hypotheses
â†“

Evaluate hypotheses
â†“

Choose ONE dominant hypothesis
â†“

Construct causal argument
â†“

Validate internal consistency
â†“

Generate report

The report is only the presentation.

The real product is the reasoning behind it.

---

# Pass 1 Architecture

Current:

Idea
â†“

Reasoning
â†“

JSON

Target:

Idea

â†“

Understand Idea

â†“

Extract core value mechanism

â†“

Generate multiple candidate failure hypotheses

â†“

Generate candidate SPOFs

â†“

Rank hypotheses

â†“

Select ONE dominant SPOF

â†“

Generate causal failure graph

â†“

Extract dominant failure spine

â†“

Run internal validation

â†“

Construct coherent reasoning

â†“

Pass 2

---

# Multi-Hypothesis Reasoning

Pass 1 SHOULD NOT immediately commit to the first SPOF.

Instead:

- generate multiple possible SPOFs
- generate multiple possible cascades
- compare them
- keep only the strongest

Think:

Hypothesis A

Hypothesis B

Hypothesis C

â†“

Ranking

â†“

Winner

Only the winning hypothesis becomes the report.

---

# SPOF Selection

The engine should SELECT a SPOF.

Not simply FIND one.

Internal reasoning should evaluate:

- specificity
- dependency on core value
- lack of redundancy
- causal leverage
- uniqueness to the idea

The chosen SPOF must satisfy:

"If this SPOF disappears,
the dominant failure path disappears."

---

# Dominance Test

Before finalizing SPOF:

Ask internally:

"Is there another failure point that better explains how this idea collapses?"

If YES

Replace SPOF.

If NO

Continue.

---

# Counterfactual Test

Before finalizing:

Ask:

"If this SPOF is completely removed,
does the cascade still happen?"

If YES

Reject SPOF.

Generate another.

---

# Genericity Test

Every major output should be tested.

Ask:

"Would this still sound correct if the idea were replaced by another startup?"

If YES

Reject.

Regenerate.

This is one of the highest priority validators.

---

# Hidden Assumptions

Hidden assumptions should NOT exist independently.

Each assumption must directly support the chosen SPOF.

Relationship:

Hidden Assumption

â†“

Makes SPOF possible

â†“

Creates Failure Cascade

Validator:

Every SPOF should be explainable by one or more assumptions.

---

# Failure Cascade

External output:

Linear.

Internal reasoning:

Graph.

Reasoning may contain:

- branches
- loops
- alternative paths

But output should expose only ONE dominant spine.

Reason:

Humans understand narratives better than graphs.

---

# Failure Modes

Failure Modes should NOT be generated independently.

Instead:

Cascade Node

â†“

Failure Mode

Each failure mode should map back to one or more nodes in the cascade.

No orphan failure modes.

---

# Likelihood

Likelihood measures:

NOT

"Chance startup fails."

Instead:

"The probability that THIS causal pathway becomes reality."

Relationship:

SPOF

â†“

Cascade

â†“

Likelihood

---

# Resilience

Resilience does NOT measure quality.

It measures the idea's ability to survive the generated failure path.

Evaluation should consider:

- redundancy
- fallback
- buffers
- recovery
- adaptability
- decoupling

Dimensions remain:

- Technical
- Business
- Legal
- Operations
- Trust

No overall score.

---

# Internal Validation Layer

Pass 1 should validate itself before Pass 2.

Minimum validators:

## Genericity Test

Would another startup produce the same answer?

If yes â†’ reject.

---

## Dominance Test

Is this really the strongest SPOF?

---

## Counterfactual Test

If SPOF disappears,
does cascade disappear?

---

## Consistency Test

Summary

â†“

Hidden Assumptions

â†“

SPOF

â†“

Cascade

â†“

Failure Modes

â†“

Likelihood

â†“

Resilience

Every block must reference the same reasoning.

No contradictions.

---

## Traceability Test

Every block must be traceable.

Summary

â†’ supports assumptions

Assumptions

â†’ support SPOF

SPOF

â†’ starts Cascade

Cascade

â†’ produces Failure Modes

Failure Modes

â†’ justify Likelihood

Cascade

â†’ determines Resilience

If any block cannot be traced back,

Reject.

---

# Reasoning Philosophy

BreakItFirst should think like:

- Red Team
- Premortem facilitator
- Systems thinker
- Failure analyst

NOT like:

- Startup advisor
- VC
- Business consultant
- Motivational coach

---

# Ground Truth Philosophy

BreakItFirst is NOT a prediction engine.

Its success metric is NOT:

"Was the prediction correct?"

Its success metric is:

"Did it produce the strongest plausible failure argument available?"

Reality may prove it wrong.

That is acceptable.

Generic reasoning is not.

---

# Research Foundations (Internal Only)

These frameworks should influence reasoning,
NOT become visible product features.

- Premortem Analysis (Gary Klein)
- Systems Thinking
- STAMP / STPA
- Fault Tree Analysis (FTA)
- Failure Mode and Effects Analysis (FMEA)
- Resilience Engineering
- Decision Science
- Root Cause Analysis
- Red Team Methodology
- Cognitive Bias Research

They should improve internal reasoning only.

Do not expose engineering terminology unless beneficial.

---

# North Star

BreakItFirst should become:

> The most honest AI for revealing how an idea can collapse before execution.

The user should leave thinking:

> "I never considered that failure path."

NOT:

> "This sounds like generic startup advice."

---

# Non-Negotiables

- One dominant failure argument.
- One dominant SPOF.
- Reports must be internally consistent.
- Output must be idea-specific.
- Pass 2 must never invent new claims.
- Cascade must originate from the chosen SPOF.
- Failure Modes must derive from Cascade.
- Likelihood evaluates the pathway, not startup success.
- Resilience evaluates adaptation, not prediction.
- Internal reasoning may be complex.
- External report must remain simple.

