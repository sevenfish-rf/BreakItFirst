# 04 â€” Refine backlog (all quality-gap trials)

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
3. When 5 ideas are done, use **Â§1 Master board** + **Â§2 By priority** to batch implement.  
4. Mark `Status` here as work completes.

**Status values:** `todo` Â· `doing` Â· `done` Â· `wont` Â· `blocked` Â· `validate-next`  
**ID scheme:** `E` engine Â· `S` surface/UI Â· `P` positioning Â· `Q` process/eval Â· suffix optional trial (`-A`)

---

## 1. Master board (all open + done)

*One row per unique work item. If the same insight repeats on later ideas, add a note in **Seen on** and raise priority â€” do not duplicate IDs.*

| ID | Area | Title | Priority | Status | Seen on | Where (code/docs) | Notes |
|----|------|-------|----------|--------|---------|-------------------|-------|
| E1 | Engine | Prefer **earliest load-bearing** SPOF when two hinges compete | P0 | **done** | A | `prompts.ts` Pass 1 / 1.5 | Rejected runner-up stays internal; report = one winner |
| E2 | Engine | Self-check: â€œWould founder already fear this as #1?â€ â†’ search deeper structural hinge | P0 | **done** | A | `prompts.ts` refine + Pass 1.5 attack | Core of Idea A win vs Claude |
| E3 | Engine | Geo/culture density when idea names place (e.g. Indonesia WA RT) | P2 | **done** | A | Pass 1 cover | Claude was strong; only tighten if BIF weak on Bâ€“E |
| E4 | Engine | Resilience scores must match **chosen path** (not generic app health) | P1 | **done** | A | Pass 2 + `schema.ts` soft-checks | ChatGPT trial had Technical 82 mismatch pattern |
| E5 | Engine | SaaS litmus: BIF must not land generic competition/trust/retention | P0 | **done** (pass) | A, **B** | scoring/2 | Idea B: SPOF = auto-overwrite+noise, not generic AI distrust |
| E6 | Engine | When differentiator is a pipeline, force **stacked sub-problem** SPOF (routing / what-to-change / safe write) | P0 | **done** | **B** | `prompts.ts` Pass 1 / 1.5 | From GLM win mode on Idea B |
| E7 | Engine | Prefer **quantified cascade thresholds** + explicit PONR in prose | P1 | **done** | **B** | Pass 1 cover + Pass 2 | BIF C strength - keep/amplify |
| E8 | Engine | Do not empty **security/legal** when path has transcripts, multi-reader docs, consent | P0 | **done** | **B** | Pass 1 domains + soft-check coverage | BIF weakness vs GLM on Idea B |
| E9 | Engine | **Do not invent** stack (RAG / fine-tune / grounding / â€¦) absent from idea text, then attack the invention | P0 | **done** | **C** | `prompts.ts` Pass 1 / 1.5 / claim guard | Idea C: BIF low - invented no-RAG SPOF |
| E10 | Engine | SPOF = failure of **idea as stated**, not architecture wishlist / implementation review | P0 | **done** | **C** | Pass 1 rules + 1.5 attack | Judges: C felt like arch critique |
| E11 | Engine | For LLM-wrapper / analysis tools: hunt **false specificity / generic camouflage** as candidate SPOF | P0 | **done** | **C** | Pass 1 multi-hyp + refine | Claude win hinge on dogfood |
| E12 | Engine | Modes/cascade must not bleed privacy/provider/security unless SPOF requires it | P1 | **done** | **C** | Pass 1.5 + soft-check | ChatGPT judge: C spine bleed |
| E13 | Engine | Physical/tech domains: cascade **internal-first** (mechanism), not external detection first | P1 | **done** | **D** | Pass 1 cascade rules | Idea D: BIF started at reviewers |
| E14 | Engine | No assumption that contradicts later cascade (e.g. firmware fix vs hardware ceiling) | P0 | **done** | **D** | Pass 1.5 consistency | Idea D spine tension |
| E15 | Engine | Multi-revenue ideas: surface **simultaneous multi-pillar collapse** when one hinge kills both | P2 | **done** | **D** | Pass 1 insight | Claude insight dual hardware+sub |
| E16 | Engine | API/infra: force **abuse-path** SPOF candidates (key share, cache bust, locality), not only "pricing bad" | P0 | **done** | **E** | Pass 1 multi-hyp + category lens | Idea E: GLM key-share beat BIF |
| E17 | Engine | Metered products: always consider **bill unit vs cost unit** mismatch when pricing is per-request | P0 | **done** | **E** | Pass 1 + API/SaaS lens | Claude win angle on E |
| E18 | Engine | One dominant spine only - no multi-independent causes in one cascade | P0 | **done** | **E** | Pass 1 / 1.5 | BIF packed compute+cache+key rot |
| S1 | Surface | Name stress test + velocity + PONR as product value (not â€œmulti-pass AIâ€) | P1 | **done** | A, B, D | `dictionaries.ts` / landing | Format alone lost C+E |
| S2 | Surface | Prefer always emitting `critical_assumption_indices` | P1 | **done** | A | Pass 2 + soft-check | Already partial; keep pressure |
| S3 | Surface | Optional SPOF kicker: â€œWhy this hinge, not the obvious riskâ€ | P2 | **done** | A | report UI / future field | Only if grounded in prose |
| S4 | Process | Judges score SPOF+cascade+insight first; schema extras secondary | P1 | **done** | A | `03-quality-gap` protocol | Reduces format confound |
| P1 | Position | Hero claim = structural / earlier hinge, **not** â€œmore detail than Claudeâ€ | P0 | **done** | A | landing / `01-product` | |
| P2 | Position | Frame Claude-class output as **expected-risk bar**, BIF as overlooked structural | P0 | **done** | A | marketing + docs | |
| P3 | Position | Keep weak free-form chat (hist. GPT) as shallow counter-example only â€” not main rival | P2 | **done** | A, B | case study notes | GPT dropped as candidate |
| P4 | Position | Test tagline: *Claude found what you already feared; BIF found the earlier link* | P1 | **done** | A | copy test | Owner wording |
| P5 | Position | Competitive bar = **Claude + GLM**; do not claim â€œalways #1 vs every modelâ€ | P0 | **done** | B, **C** | landing / case studies | Idea C: Claude beat BIF |
| P6 | Position | Own **false specificity / quality-gap** as known product risk (dogfood confirmed) | P0 | **done** | A dogfood + **C** | landing / 01-product | Claude camouflage hinge |
| Q1 | Process | Always pin platform + model ids on each `scoring/N.md` | P0 | **done** | A, B, C | scoring template | BIF = Mimo 2.5 Pro |
| Q6 | Process | High-variance fixtures (dogfood/meta): require **â‰¥3 judges**; do not sole-trust one scorer | P1 | **done** | **C** | scoring protocol | C ranged 17-25 |
| Q2 | Process | Prefer â‰¥1 judge outside platform family; footnote self-scores | P1 | **done** | A | protocol | GPT-as-judge inflated B on Idea A |
| Q3 | Process | Complete full A-E suite | P0 | **done** | Aâ€“E | suite | 5/5 scoring files complete |
| Q4 | Process | Suite verdict after full set | P0 | **done** | Aâ€“E | `03-quality-gap` Â§5 | See rollup Â§5 below |
| Q5 | Process | **Candidates = Claude + GLM + BIF only**; GPT/ChatGPT = judge optional, not premortem rival | P0 | done | Bâ€“E | `03-quality-gap` | |
| Q7 | Process | Run **implement batch** from P0 board (prompt + UI + docs) | P0 | **done** | suite | shipped 2026-07-21 |

**Counts:** todo **0** · doing **0** · **done (suite + implement batch)** · see master board

---

## 2. By priority (implement order when ready)

### P0 â€” do first (after enough trial signal, or ASAP for process)

| ID | Title |
|----|--------|
| Q3 / Q4 | Suite complete â€” **done** |
| Q5 | Candidates Claude+GLM+BIF â€” **done** |
| **Q7** | **Implement prompt batch now** |
| Q1 | Pin models on scoring files |
| E1 | Earliest load-bearing SPOF rule |
| E2 | â€œFounder already fears this?â€ deeper search |
| E5 | SaaS litmus â€” **done (pass)** |
| E6 | Stacked sub-problem SPOF (from GLM) |
| E8 | Fill security/abuse when relevant |
| **E9** | **No invent-then-attack** |
| **E10** | **Idea-as-stated failure** |
| **E11** | **False specificity / camouflage** |
| E14 | Assumption-cascade consistency |
| **E16** | **API abuse-path SPOFs** |
| **E17** | **Bill unit vs cost unit** |
| **E18** | **One spine only (no multi-cause)** |
| P1 | Positioning: not â€œmore detailâ€ |
| P2 | Expected-risk bar vs structural |
| P5 | Bar = Claude + GLM; no â€œalways #1â€ |
| P6 | Own quality-gap as product risk |

**Recommend:** ship **E9-E11 + E14 + E16-E18** in one `prompts.ts` pass; then optional re-score C+E.

### P1

| ID | Title |
|----|--------|
| E4 | Resilience â†” path consistency |
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
| S3 | SPOF â€œwhy not obviousâ€ kicker |
| P3 | ChatGPT counter-example docs |

---

## 3. Explicit non-goals (from trials so far)

| Skip | Why | Until |
|------|-----|--------|
| Extra LLM passes | Idea A win wasnâ€™t â€œneed more passesâ€ | Suite shows thin reasoning gap |
| Redis / job infra | Unrelated to quality gap | Production multi-instance pain |
| Formal causal-graph schema | Win was hinge selection + existing spine | Eval demands it |
| USP â€œprovenâ€ marketing | N=1 | â‰¥3 ideas same pattern |

---

## 4. Log by trial (evidence â†’ backlog)

### 4.1 Idea A â€” Marketplace pet sitter

| | |
|--|--|
| **File** | [scoring/1.md](./scoring/1.md) |
| **Date** | 2026-07-21 |
| **Winner** | BIF (provisional) |
| **BIF SPOF** | Demand sporadis vs threshold retensi sitter |
| **Strong chat SPOF** | Disintermediasi pasca-match |
| **Pattern** | Expected behavioral risk (A/B) vs earlier structural (C) |

**Items added/updated from A:** E1â€“E5, S1â€“S4, P1â€“P4, Q1â€“Q4  

**Steal from Claude if BIF weaker later:** in-home mechanism clarity, ride-hailing contrast, dense local context.  
**Amplify from BIF win:** structural density/math, linked assumptions, stress/velocity/PONR, non-obvious primary SPOF.

### 4.2 Idea B â€” SaaS wiki + transcript auto-update

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

### 4.3 Idea C â€” AI premortem (BreakItFirst dogfood)

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

### 4.4 Idea D â€” Hardware budget fitness ring

| | |
|--|--|
| **File** | [scoring/4.md](./scoring/4.md) |
| **Date** | 2026-07-21 |
| **Candidates** | Claude + GLM + BIF |
| **Winner** | **Thin top** - GLM slight edge; BIF close #2 (~23.5 mean) |
| **Convergent SPOF** | OEM/budget sensor vs premium accuracy claim |
| **Pattern** | BIF recovered vs Idea C; same hinge family; thin gaps |
| **Items added** | **E13, E14, E15**; E7/S1 reinforced |

### 4.5 Idea E â€” API image resize + CDN

| | |
|--|--|
| **File** | [scoring/5.md](./scoring/5.md) |
| **Date** | 2026-07-21 |
| **Candidates** | Claude + GLM + BIF |
| **Winner** | **GLM** (majority); Claude close 2nd; **BIF 3rd / low** (~19 mean) |
| **BIF SPOF** | Flat pricing without cost guard |
| **Best peer SPOFs** | Key-share cache flood (GLM); request vs bytes metering (Claude) |
| **Pattern** | Second clear BIF loss; domain-specific abuse/metering depth missing |
| **Items added** | **E16, E17, E18, Q7**; E8/E9/E12/E1 reinforced; Q3/Q4 done |

---

## 5. Rollup after 5 ideas (suite complete)

| Question | Answer |
|----------|--------|
| How many ideas did BIF win (sole or co-top)? | **2 / 5** (A sole, B co-tie) |
| Clear BIF losses? | **2 / 5** (C dogfood, E API) |
| Thin peer (no sole win)? | **1 / 5** (D hardware) |
| Did â€œstructural / earlier hingeâ€ pattern repeat? | **Mixed** - yes on A/B/D; failed on C (invent stack) and E (generic pricing) |
| Top implement IDs (P0) | **E9, E10, E11, E14, E16, E17, E18, Q7, P5, P6** |
| Implement batch 1 | **Shipped** — SUITE_REFINE prompts, lenses, soft-check, landing/report UI (S3), docs |
| Wont / drop list | Extra LLM passes; Redis as quality fix; â€œalways beats Claudeâ€ marketing |

**Honest USP read after suite:** BIF can match or beat strong chat on **some** domains (marketplace, SaaS product hinge, hardware claim mismatch) via structured spine. It **does not** reliably beat Claude/GLM on **meta/self** or **deep infra abuse** fixtures. Positioning must stay: *one-spine idea-specific premortem*, not *always sharper than frontier chat*.

---

## 6. Changelog

| Date | Note |
|------|------|
| 2026-07-21 | File created; seeded from Idea A refine backlog |
| 2026-07-21 | Q5 done: GPT out as candidate |
| 2026-07-21 | Idea B complete: BIF-GLM tie; E5 pass; E6-E8 + P5 added |
| 2026-07-21 | Idea C complete: BIF low / Claude win; E9-E12 + P6 + Q6 |
| 2026-07-21 | Idea D complete: thin top GLM>BIF>Claude; E13-E15 |
| 2026-07-21 | Idea E complete: BIF low / GLM win; suite 5/5; E16-E18 + Q7; rollup Â§5 |

| 2026-07-21 | **Implement batch:** SUITE_REFINE + lenses + soft-check + S3 UI + mark backlog done |
| 2026-07-21 | Post-refine spot-check formalized: [scoring/6.md](./scoring/6.md) (BreakPath; BIF 25 co-lead) |

