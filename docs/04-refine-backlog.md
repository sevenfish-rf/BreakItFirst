# 04 — Refine backlog (all quality-gap trials)

**Single place** for todos / improvements that come out of side-by-side premortem tests.  
Per-idea write-ups stay in `docs/scoring/N.md` (verdict + evidence). **Action items live here.**

| | |
|--|--|
| Protocol | [03-quality-gap.md](./03-quality-gap.md) |
| Trial files | [scoring/](./scoring/) |
| Product semantics | [01-product.md](./01-product.md) |

**How to use**

1. After each idea test, update `scoring/N.md` (summary + verdict).  
2. **Append or update rows in this file** (do not only leave todos in `scoring/N.md`).  
3. When 5 ideas are done, use **§1 Master board** + **§2 By priority** to batch implement.  
4. Mark `Status` here as work completes.

**Status values:** `todo` · `doing` · `done` · `wont` · `blocked` · `validate-next`  
**ID scheme:** `E` engine · `S` surface/UI · `P` positioning · `Q` process/eval · suffix optional trial (`-A`)

---

## 1. Master board (all open + done)

*One row per unique work item. If the same insight repeats on later ideas, add a note in **Seen on** and raise priority — do not duplicate IDs.*

| ID | Area | Title | Priority | Status | Seen on | Where (code/docs) | Notes |
|----|------|-------|----------|--------|---------|-------------------|-------|
| E1 | Engine | Prefer **earliest load-bearing** SPOF when two hinges compete | P0 | todo | A | `prompts.ts` Pass 1 / 1.5 | Rejected runner-up stays internal; report = one winner |
| E2 | Engine | Self-check: “Would founder already fear this as #1?” → search deeper structural hinge | P0 | todo | A | `prompts.ts` refine + Pass 1.5 attack | Core of Idea A win vs Claude |
| E3 | Engine | Geo/culture density when idea names place (e.g. Indonesia WA RT) | P2 | validate-next | A | Pass 1 cover | Claude was strong; only tighten if BIF weak on B–E |
| E4 | Engine | Resilience scores must match **chosen path** (not generic app health) | P1 | todo | A | Pass 2 + `schema.ts` soft-checks | ChatGPT trial had Technical 82 mismatch pattern |
| E5 | Engine | SaaS litmus: BIF must not land generic competition/trust/retention | P0 | **done** (pass) | A, **B** | scoring/2 | Idea B: SPOF = auto-overwrite+noise, not generic AI distrust |
| E6 | Engine | When differentiator is a pipeline, force **stacked sub-problem** SPOF (routing / what-to-change / safe write) | P0 | todo | **B** | `prompts.ts` Pass 1 / 1.5 | From GLM win mode on Idea B |
| E7 | Engine | Prefer **quantified cascade thresholds** + explicit PONR in prose | P1 | todo | **B** | Pass 1 cover + Pass 2 | BIF C strength - keep/amplify |
| E8 | Engine | Do not empty **security/legal** when path has transcripts, multi-reader docs, consent | P0 | todo | **B** | Pass 1 domains + soft-check coverage | BIF weakness vs GLM on Idea B |
| E9 | Engine | **Do not invent** stack (RAG / fine-tune / grounding / …) absent from idea text, then attack the invention | P0 | todo | **C** | `prompts.ts` Pass 1 / 1.5 / claim guard | Idea C: BIF low - invented no-RAG SPOF |
| E10 | Engine | SPOF = failure of **idea as stated**, not architecture wishlist / implementation review | P0 | todo | **C** | Pass 1 rules + 1.5 attack | Judges: C felt like arch critique |
| E11 | Engine | For LLM-wrapper / analysis tools: hunt **false specificity / generic camouflage** as candidate SPOF | P0 | todo | **C** | Pass 1 multi-hyp + refine | Claude win hinge on dogfood |
| E12 | Engine | Modes/cascade must not bleed privacy/provider/security unless SPOF requires it | P1 | todo | **C** | Pass 1.5 + soft-check | ChatGPT judge: C spine bleed |
| S1 | Surface | Name stress test + velocity + PONR as product value (not “multi-pass AI”) | P1 | todo | A, B | `dictionaries.ts` / landing | Still true; format alone lost Idea C |
| S2 | Surface | Prefer always emitting `critical_assumption_indices` | P1 | todo | A | Pass 2 + soft-check | Already partial; keep pressure |
| S3 | Surface | Optional SPOF kicker: “Why this hinge, not the obvious risk” | P2 | todo | A | report UI / future field | Only if grounded in prose |
| S4 | Process | Judges score SPOF+cascade+insight first; schema extras secondary | P1 | todo | A | `03-quality-gap` protocol | Reduces format confound |
| P1 | Position | Hero claim = structural / earlier hinge, **not** “more detail than Claude” | P0 | todo | A | landing / `01-product` | |
| P2 | Position | Frame Claude-class output as **expected-risk bar**, BIF as overlooked structural | P0 | todo | A | marketing + docs | |
| P3 | Position | Keep weak free-form chat (hist. GPT) as shallow counter-example only — not main rival | P2 | todo | A, B | case study notes | GPT dropped as candidate |
| P4 | Position | Test tagline: *Claude found what you already feared; BIF found the earlier link* | P1 | todo | A | copy test | Owner wording |
| P5 | Position | Competitive bar = **Claude + GLM**; do not claim “always #1 vs every model” | P0 | todo | B, **C** | landing / case studies | Idea C: Claude beat BIF |
| P6 | Position | Own **false specificity / quality-gap** as known product risk (dogfood confirmed) | P0 | todo | A dogfood + **C** | landing / 01-product | Claude camouflage hinge |
| Q1 | Process | Always pin platform + model ids on each `scoring/N.md` | P0 | todo | A, B, C | scoring template | BIF = Mimo 2.5 Pro |
| Q6 | Process | High-variance fixtures (dogfood/meta): require **≥3 judges**; do not sole-trust one scorer | P1 | todo | **C** | scoring protocol | C ranged 17-25 |
| Q2 | Process | Prefer ≥1 judge outside platform family; footnote self-scores | P1 | todo | A | protocol | GPT-as-judge inflated B on Idea A |
| Q3 | Process | Complete Ideas D–E before “gap confirmed” | P0 | doing | A–C | suite | 3/5 done; D-E remain |
| Q4 | Process | Suite verdict only after ≥3 ideas | P0 | todo | A–C | `03-quality-gap` §5 | Now have 3; still finish D-E before hard claim |
| Q5 | Process | **Candidates = Claude + GLM + BIF only**; GPT/ChatGPT = judge optional, not premortem rival | P0 | done | B, C | `03-quality-gap` | C used A=Claude B=GLM C=BIF |

**Counts:** todo **18** · doing **1** · done **2** (E5, Q5) · validate-next **1** (E3)

---

## 2. By priority (implement order when ready)

### P0 — do first (after enough trial signal, or ASAP for process)

| ID | Title |
|----|--------|
| Q3 | Finish B–E trials |
| Q5 | Candidates Claude+GLM+BIF (GPT judge-only) — **done** |
| Q1 | Pin models on scoring files |
| Q4 | No full gap claim before ≥3 ideas |
| E1 | Earliest load-bearing SPOF rule |
| E2 | “Founder already fears this?” deeper search |
| E5 | SaaS litmus — **done (pass)** |
| E6 | Stacked sub-problem SPOF (from GLM) |
| E8 | Fill security/legal when data path exists |
| **E9** | **No invent-then-attack (RAG etc.)** - from Idea C loss |
| **E10** | **Idea-as-stated failure, not arch wishlist** |
| **E11** | **Hunt false specificity / camouflage** for LLM tools |
| P1 | Positioning: not “more detail” |
| P2 | Expected-risk bar vs structural |
| P5 | Bar = Claude + GLM; no “always #1” claim |
| P6 | Own quality-gap as product risk |

**Recommend:** implement **E9-E11** soon (prompt), even before D/E finish - Idea C is a clear fail mode.

### P1

| ID | Title |
|----|--------|
| E4 | Resilience ↔ path consistency |
| E7 | Quantified cascade thresholds + PONR pressure |
| S1 | Name stress / velocity / PONR in product copy |
| S2 | critical_assumption_indices pressure |
| S4 | Scoring protocol: content first |
| P4 | Tagline test |
| Q2 | Judge bias rule |

### P2

| ID | Title |
|----|--------|
| E3 | Geo/culture boost if needed |
| S3 | SPOF “why not obvious” kicker |
| P3 | ChatGPT counter-example docs |

---

## 3. Explicit non-goals (from trials so far)

| Skip | Why | Until |
|------|-----|--------|
| Extra LLM passes | Idea A win wasn’t “need more passes” | Suite shows thin reasoning gap |
| Redis / job infra | Unrelated to quality gap | Production multi-instance pain |
| Formal causal-graph schema | Win was hinge selection + existing spine | Eval demands it |
| USP “proven” marketing | N=1 | ≥3 ideas same pattern |

---

## 4. Log by trial (evidence → backlog)

### 4.1 Idea A — Marketplace pet sitter

| | |
|--|--|
| **File** | [scoring/1.md](./scoring/1.md) |
| **Date** | 2026-07-21 |
| **Winner** | BIF (provisional) |
| **BIF SPOF** | Demand sporadis vs threshold retensi sitter |
| **Strong chat SPOF** | Disintermediasi pasca-match |
| **Pattern** | Expected behavioral risk (A/B) vs earlier structural (C) |

**Items added/updated from A:** E1–E5, S1–S4, P1–P4, Q1–Q4  

**Steal from Claude if BIF weaker later:** in-home mechanism clarity, ride-hailing contrast, dense local context.  
**Amplify from BIF win:** structural density/math, linked assumptions, stress/velocity/PONR, non-obvious primary SPOF.

### 4.2 Idea B — SaaS wiki + transcript auto-update

| | |
|--|--|
| **File** | [scoring/2.md](./scoring/2.md) |
| **Date** | 2026-07-21 |
| **Candidates** | Claude + GPT + BIF + **GLM 5.2** (GPT last candidate run) |
| **Winner** | **BIF + GLM tie** (~25); Claude ~22; GPT ~16 |
| **BIF SPOF** | Auto-overwrite wiki without review from transcript noise |
| **GLM SPOF** | Transcript-to-doc mapping accuracy (3 stacked problems) |
| **Pattern** | Structured/top-tier chat >> generic GPT; BIF no longer sole #1 |
| **Items added/updated** | E5 done; **E6, E7, E8, P5** new; S1/P1/P2 reinforced; Q3/Q5 |

### 4.3 Idea C — AI premortem (BreakItFirst dogfood)

| | |
|--|--|
| **File** | [scoring/3.md](./scoring/3.md) |
| **Date** | 2026-07-21 |
| **Candidates** | Claude + GLM + BIF |
| **Winner** | **Claude** (majority); BIF mid (~22 mean); GLM often 3rd |
| **BIF SPOF** | Prompt-template specificity without retrieval grounding |
| **Claude SPOF** | Generic-analysis camouflage |
| **Pattern** | First BIF underperformance; invent-stack + obvious cascade; format != hinge |
| **Items added** | **E9, E10, E11, E12, P6, Q6**; P5/E1/E2 reinforced |

### 4.4 Idea D — Hardware (pending)

| | |
|--|--|
| **File** | `scoring/4.md` (TBD) |
| **Items added** | |

### 4.5 Idea E — API (pending)

| | |
|--|--|
| **File** | `scoring/5.md` (TBD) |
| **Items added** | |

---

## 5. Rollup after 5 ideas (fill at end)

| Question | Answer |
|----------|--------|
| How many ideas did BIF win? | _ / 5 |
| Did “structural / earlier hinge” pattern repeat? | Y / N / mixed |
| Top 5 IDs still open (P0/P1 only) | |
| Implement batch 1 (this week) | |
| Wont / drop list | |

---

## 6. Changelog

| Date | Note |
|------|------|
| 2026-07-21 | File created; seeded from Idea A refine backlog |
| 2026-07-21 | Q5 done: GPT out as candidate |
| 2026-07-21 | Idea B complete: BIF-GLM tie; E5 pass; E6-E8 + P5 added |
| 2026-07-21 | Idea C complete: BIF low / Claude win; E9-E12 + P6 + Q6 |
