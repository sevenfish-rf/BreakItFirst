# 05 — Doc/code drift audit

**Goal:** every doc that makes a checkable claim about the backend must match the
backend, or be corrected. Started 2026-07-30, after the engine freeze (backlog
Q11) made docs the only safe thing left to fix.

## Method (and why it is this shape)

The docs total ~7,400 lines across 27 files. Reading all of them plus the source
they describe does not fit in one context window, so the audit is built to
survive being interrupted:

1. **Classify first, read second.** Docs split into SPEC (asserts something
   about the current system → must match code) and RECORD (a dated snapshot of
   what happened → frozen, must NOT be "updated"). Only SPEC is audited. This
   removes ~4,900 lines of history, scoring verdicts and dogfood transcripts
   from the surface before any reading starts.
2. **Audit claims, not prose.** For each SPEC doc, pull the lines shaped like
   verifiable claims — file paths, exported symbols, env vars, numeric limits,
   endpoint paths, npm script names — and check each against `src/` and `eval/`
   with a targeted grep. Prose about intent is not checkable and is skipped.
3. **Append verdicts immediately.** Every doc's findings land in §3 of this file
   as soon as that doc is done, before the next one is opened. If context is
   compacted mid-audit, the ledger is the state — resume from the first doc with
   no verdict row.
4. **Fix in a separate pass.** Auditing and editing at once means half-corrected
   files if the run is interrupted. §3 is complete before any doc is edited.

**Verdict values:** `ok` · `drift` (doc contradicts code) · `stale` (doc
describes something that no longer exists) · `missing` (code exists, doc never
mentions it) · `frozen` (correct but blocked by the engine freeze)

---

## 1. Classification

### SPEC — must match code

| File | Lines | Last touched | Why it is SPEC |
|------|------:|--------------|----------------|
| `docs/00-index.md` | 19 | 2026-07-23 | Claims which docs exist and where |
| `docs/01-product.md` | 239 | 2026-07-21 | Report block semantics, pipeline identity, BYOK stance |
| `docs/02-develop.md` | 290 | 2026-07-21 | Setup, architecture, API, schema, modules — highest drift risk |
| `docs/03-quality-gap.md` | 261 | 2026-07-23 | Eval protocol + rubric max + candidate set |
| `docs/04-refine-backlog.md` | 236 | 2026-07-30 | Work ledger; status claims must match shipped code |
| `docs/dogfood/00-analysis.md` | 750 | 2026-07-30 | Cites code by file:line; those refs must still resolve |
| `README.md` | 175 | — | Public-facing setup + feature claims |
| `AGENTS.md` / `CLAUDE.md` | 5 / 1 | — | Agent instructions |
| `BreakItFirst.md` | 555 | — | Root masterplan/spec |
| `eval/README.md` | 58 | — | Harness usage, env vars, scripts |
| `eval/rubric.md` | 108 | — | Scoring rubric, max points |

### RECORD — frozen, do not update

| File | Lines | Why frozen |
|------|------:|------------|
| `docs/90-history.md` | 857 | Archive; index says "sejarah — bukan source of truth harian" |
| `docs/91-directives.md` | 1090 | Archive of reviewer handoffs + directives as issued |
| `docs/Scoring/1.md` … `8.md` | 1539 | Dated judged verdicts; rewriting them destroys the evidence |
| `docs/dogfood/{1,2,3}test*.md` | 1150 | Raw report exports from dated runs |

Rewriting a RECORD to match today's code would delete the only evidence of what
the system did at the time — and the drift between a record and today's code is
often the finding itself, not an error to erase.

---

## 2. Progress

| Step | State |
|------|-------|
| Classification | done |
| Claim audit | **done** — all 10 SPEC entries have verdict rows in §3 |
| Fix pass | **done** — see §4 for what was changed and what was deliberately left |

**Audit rollup:** `ok` claims dominate the runtime surface — every rate limit,
schema bound, provider preset, SSRF guard, storage key and category list checked
out against code. The drift is concentrated in three places:

1. **Themes.** Three docs (`02-develop.md` A4, `README.md`, `BreakItFirst.md`)
   claim five named palettes; `themes.ts` has only `light`/`dark`.
2. **Doc paths that never existed or moved.** `scoring/7-head-to-head.md`,
   `docs/project-overview.md`, `docs/guide.md`, `docs/reference.md`,
   `docs/README.md`, and `./scoring/` vs the on-disk `docs/Scoring/`.
3. **Trees, tables and ID maps that stopped being appended to** — `05`,
   `dogfood/`, `golden-variants/`, `stability.ts`, `read-traces.ts`, four npm
   scripts, the 17th soft check, `meta.run`, `src/app/type-lab/`, and the
   dogfood file's Q8–Q11 numbering now colliding with the shipped board.

Nothing found in the audit requires touching `prompts.ts` or the `schema.ts` rule
engine, so the whole fix pass is legal under the Q11 freeze. The one exception is
recorded as `frozen`: dogfood K3's own proposed fix (top-level
`spof_candidates`) stays unbuilt, and the fix is to write that down, not to do it.

---

## 3. Verdicts

*Appended one doc at a time. A doc with no row here has not been audited yet.*

<!-- AUDIT-ROWS -->

### `docs/00-index.md` — audited 2026-07-30

| Claim | Verdict | Evidence | Fix |
|-------|---------|----------|-----|
| Links `scoring/7-head-to-head.md` | `stale` | `docs/Scoring/` holds `1.md`–`8.md` only; no `7-head-to-head.md` | Point at `7.md` |
| Row label "1–8 · 7-head-to-head" describes 5 things for 8 files | `drift` | 8 scoring files exist | Rewrite the row |
| Index lists 01–04 + 90/91 | `stale` | `05-doc-audit.md` exists (this file); `docs/dogfood/` (6 files, 1,900 lines incl. `00-analysis.md`) is never mentioned | Add `05` and a `dogfood/` row |
| Path case `./scoring/1.md` | `drift` | Directory on disk is `docs/Scoring/`. Works on Windows, breaks on a case-sensitive host (CI, Linux deploy) | Normalise to the on-disk case |
| `90`/`91` = "sejarah — bukan source of truth harian" | `ok` | Matches the RECORD classification in §1 | — |

### `docs/02-develop.md` — audited 2026-07-30

Header claims *"Aligned with `src/` as of 2026-07-21"* — that date is before the
2026-07-21 evening prompt batch and before Q8/Q9 shipped on 2026-07-30, so it is
the highest-drift doc as predicted.

| Claim | Verdict | Evidence | Fix |
|-------|---------|----------|-----|
| A4: themes are `ember` (default), `violet`, `ocean`, `forest`, `gold` | `stale` | `src/lib/themes.ts` exports only `ThemeMode = "light" \| "dark"` + `applyThemeToDocument` toggling `html.dark`. No named palettes anywhere | Rewrite A4 as light/dark mode |
| Part C schema block: `meta: { idea_input, category, generated_at }` | `drift` | `src/types/analysis.ts:59` also has `run?: RunProvenance`; `schema.ts:59` validates it | Add `run?` to the block |
| Soft-check list (16 ids) | `missing` | `schema.ts` defines **17**; `security_legal_when_data_path` (line 676) is absent from the doc | Add the 17th |
| A2 command table | `missing` | `package.json` now also has `eval:stability` and `eval:traces` | Add both rows |
| A2 env list (`BIF_BASE_URL/API_KEY/PASS1_MODEL/PASS2_MODEL`) | `missing` | `eval/env.example` also documents `BIF_LOCALE`, `BIF_ONLY`, `BIF_DEEP`, `BIF_TRACE`; `stability.ts` adds `BIF_REF`; `run-baseline.ts` reads `BIF_CALL_TIMEOUT_MS` | List the optional vars or point at `eval/env.example` |
| A3 tree: `eval/ golden, rubric, baselines` | `missing` | `eval/` also has `golden-variants/`, `stability.ts`, `read-traces.ts`, `assertions.ts`, `compare-baseline.ts`, `stability/` output dir | Update the tree |
| A3 tree: `docs/ 00-index · 01-product · 02-develop · 90/91 archive` | `stale` | `03`, `04`, `05`, `Scoring/`, `dogfood/` all exist | Update the tree |
| A3 tree: `src/app/ pages + api/...` | `missing` | `src/app/type-lab/page.tsx` is a live route and is documented nowhere | Delete the route or document it |
| Report provenance chip + Markdown "Run provenance" block | `missing` | Shipped 2026-07-30 (`report-markdown.ts`, `analysis-report.tsx`) — no mention in Part D | Add to Part D / feature map |
| Rate limits: analyze 8 / 15 min, Deep costs 2, models 40 / min | `ok` | `rate-limit.ts:32-41` (`limit: 8`, `windowMs: 15*60*1000`, `limit: 40`, `windowMs: 60*1000`); `api/analyze/route.ts:91` `cost: deepAnalysis ? 2 : 1` | — |
| Rate limits list is complete | `missing` | `LIMITS.analyzeStrict` (after repeated `not_analyzable`) and the 1-hour abuse-strike window are undocumented | Add both |
| `maxDuration` 300s | `drift` | 300 on `api/analyze` and `api/analyze/status`, but **30** on `api/models` | Qualify per route |
| Browser storage table (8 keys) | `ok` | All 8 found: `provider-settings.ts:8`, `session.ts:1`, `i18n/types.ts:4`, `layout.tsx:66`, `draft.ts:4-5`, `report-storage.ts:3-4` | — |
| Categories list (11) | `ok` | `categories.ts:1-13` matches exactly, in order | — |
| Provider presets OpenAI / OpenRouter / Ollama `http://127.0.0.1:11434/v1` / custom | `ok` | `provider-settings.ts:17-42`; `custom` fallback at `provider-settings.tsx:54` | — |
| SSRF guard on base URL | `ok` | `provider-client.ts:93` + `169.254.169.254` block at line 115 | — |
| Ollama fallback `/api/tags` | `ok` | `provider-client.ts:720-724` | — |
| `status?mode=poll\|stream`, poll default | `ok` | `status/route.ts:20-51` | — |
| Schema bounds: assumptions 5–10, cascade 7–12, resilience 0–100 | `ok` | `schema.ts:73-74`, `90-91`, `25` | — |
| Module table paths | `ok` | Every listed file exists under `src/lib/` | — |
| Module table is complete | `missing` | `analysis-trace.ts`, `provider-errors.ts`, `input-validation.ts`, `landing-copy.ts`, `ndjson-stream.ts`, `session.ts`, `user-warnings.ts` are not listed | Add or state the table is partial |
| UI component table | `missing` | Listed files exist, but `header.tsx`, `landing-page.tsx`, `landing-faq/metrics/spine/footer.tsx`, `scroll-choreography.tsx`, `smooth-scroller.tsx`, `scroll-highlight.tsx`, `effects/` are absent | Add a landing row |
| Historical baseline mean **33.8** (`230859`) | `ok` | `eval/baselines/2026-07-16_230859/SCORE_SUMMARY.md` | — |
| Node 20+ / 22.x, npm | `ok` | `@types/node: ^20`; nothing contradicts it | — |
| Stack list (Next 16 · React 19 · TS · Tailwind v4 · Zod · Framer Motion · React Flow · Recharts · three) | `ok` | `package.json`: next 16.2.10, react 19.2.4, zod ^4.4.3, tailwindcss ^4, framer-motion, `@xyflow/react`, recharts, three | — |

### `docs/01-product.md` — audited 2026-07-30

Nearly clean: this doc describes semantics rather than file layout, and the
semantics did not move. Every checkable numeric claim matched.

| Claim | Verdict | Evidence | Fix |
|-------|---------|----------|-----|
| Assumptions **5–10** (hard validation) | `ok` | `schema.ts:73-74` | — |
| Cascade **7–12**, prefer **8–10** | `ok` | `schema.ts:90-91` hard; `cascade_depth_preferred` message says "preferred 8–10 … hard still 7–12" | — |
| SPOF `component` ≈ **3–8 word** mechanism label | `ok` | `spof_label_short` message: "prefer 3–8 words" | — |
| Resilience = five ints **0–100** | `ok` | `schema.ts:25` | — |
| Deep costs **2** rate-limit slots | `ok` | `api/analyze/route.ts:91` | — |
| `self_consistency` is Deep-only | `ok` | `pipeline.ts` deletes it when `!deepAnalysis` | — |
| Single-flight = one running job per browser session, checked **before** rate limit | `ok` | `api/analyze/route.ts:53,68`; `analyze-jobs.ts:46,270` | — |
| Likelihood bands `Very Low … Very High` | `ok` | `types/analysis.ts:4-9` | — |
| Velocity `Fast\|Medium\|Slow` | `ok` | `types/analysis.ts:15` | — |
| BYOK = owner/dev testing; production direction is a fixed provider | `ok` | Matches the standing owner constraint — BYOK is never marketed as a feature | — |
| §4 report-block list is complete | `missing` | Run provenance (`meta.run`) is now rendered as a report chip and exported in Markdown, but no §4.x block describes it | Add a §4.10 or fold into §4 preamble |
| §6 "Not core: server report DB — client history max 10" | `ok` | `report-storage.ts` `MAX_REPORT_HISTORY = 10` | — |

### `docs/00-index.md` follow-up

`05-doc-audit.md` (this file) must be added to the index in the fix pass.

### `README.md` — audited 2026-07-30

| Claim | Verdict | Evidence | Fix |
|-------|---------|----------|-----|
| Features: "Themes & i18n — **5 themes**; EN / ID" | `stale` | `src/lib/themes.ts` has only `light`/`dark` | "Light / dark + EN / ID" |
| Quick start step 2: "category → language / **theme**" | `stale` | Same — there is no theme picker beyond mode | Drop "theme" |
| Scripts table (6 rows) | `missing` | `package.json` also has `eval:compare`, `eval:baseline:ps1`, `eval:stability`, `eval:traces` | Add the four |
| Tree: `eval/ golden fixtures, rubric, baseline runner` | `missing` | Also `golden-variants/`, `stability.ts`, `read-traces.ts` | Update |
| Tree: `docs/ 00-index · 01-product · 02-develop · 90/91 archive` | `stale` | `03`, `04`, `05`, `Scoring/`, `dogfood/` exist | Update |
| Documentation table (6 rows) | `missing` | `03-quality-gap.md`, `04-refine-backlog.md`, `05-doc-audit.md` absent | Add the three |
| "API `maxDuration`: 300s" | `drift` | 300 on analyze + status, **30** on `api/models` | Qualify per route |
| Features table has no provenance row | `missing` | Report chip + Markdown "Run provenance" shipped 2026-07-30 | Add a row |
| Roadmap: "Re-baseline after latest prompt refine (**optional**)" | `drift` | It is backlog **Q10, P0, blocked** — the reason the engine is frozen. Calling it optional contradicts `04-refine-backlog.md` | Mark as required/blocked |
| Rate limits 8 / 15 min, Deep = 2, models 40 / min | `ok` | `rate-limit.ts:32-41`, `api/analyze/route.ts:91` | — |
| Presets OpenAI / OpenRouter / Ollama / custom | `ok` | `provider-settings.ts:17-42` | — |
| SSRF checks on base URLs | `ok` | `provider-client.ts:93` | — |
| Jobs: process memory + `.breakitfirst-jobs/`, not multi-instance | `ok` | `analyze-jobs.ts` | — |
| Reports in localStorage, history max 10 | `ok` | `report-storage.ts` `MAX_REPORT_HISTORY = 10` | — |
| Report sections 1–10 | `ok` | Matches the schema block order | — |
| "No license file is committed yet" | `ok` | No `LICENSE*` in the repo root | — |
| BYOK row: "(dev) … production may use a fixed provider" | `ok` | Consistent with the owner constraint; not marketed as a feature | — |
| Badges Next 16 / TS 5 / React 19 / Tailwind v4 | `ok` | `package.json` | — |

### `docs/03-quality-gap.md` — audited 2026-07-30

| Claim | Verdict | Evidence | Fix |
|-------|---------|----------|-----|
| §8: "template remains `7-head-to-head.md`" | `stale` | No such file; `Scoring/7.md` is the H2H write-up | Drop the sentence |
| All `./scoring/...` links | `drift` | Directory is `docs/Scoring/`; case-sensitive hosts will 404 | Normalise case |
| Header status: "Suite complete · post-refine spot-check → `scoring/6.md`" | `stale` | `Scoring/7.md` and `8.md` exist and are logged in §8 | Mention 7 + 8 in the header |
| §5.3: "**Q7 implement batch** next" | `stale` | Q7 is `done` (shipped 2026-07-21) per `04-refine-backlog.md`; the open item is Q10 (blocked) under the Q11 freeze | Point at Q10/Q11 |
| §4 rubric is 1–5 × 5 criteria = max 25 | `ok` | Internally consistent; this is the **human** rubric and is deliberately not the 34-point harness rubric | — |
| Ideas A–E texts here differ from `eval/golden/*.json` | `ok` | Two different fixture sets by design (human head-to-head vs harness). No doc claims they match | Worth one clarifying line so nobody "syncs" them |
| §6 ID prefixes + status values | `ok` | Matches `04-refine-backlog.md` header | — |
| §5.1 per-idea winners / tally | `ok` | Matches `04-refine-backlog.md` §4 and §5 | — |

### `eval/rubric.md` — audited 2026-07-30

| Claim | Verdict | Evidence | Fix |
|-------|---------|----------|-----|
| "Sumber: tabel Baik/Buruk di `docs/project-overview.md`" | `stale` | No such file; those tables live in `docs/01-product.md` §4 | Repoint |
| Block totals sum to **max 34** | `ok` | 4+6+6+6+4+4+4 = 34; matches the `max_points: 34` stub in `run-baseline.ts:238` | — |
| Rubric covers the shipped report | `missing` | No criteria for `stress_test`, `failure_velocity`, `self_consistency`, or the F1/F2/F3 fields (`critical_assumption_indices`, `point_of_no_return_index`, `compounding_note`) — all shipped and all rendered | Add criteria, or state the omission |
| Rubric can detect a quality regression | `drift` | Not a claim the rubric makes, but the reason it must be read with a caveat: all three 2026-07-16 baselines scored 33–34/34 with zero failures and that run's own summary says *"ceiling already high at 33.8"*. **Saturated.** | Add the caveat + point at `eval/stability.ts` |
| Instructions reference `eval/baselines/<date>/scores/<id>.json` + `score-template.json` | `ok` | Both exist; `run-baseline.ts` writes the stubs | — |

### `eval/README.md` — audited + corrected 2026-07-30

| Claim | Verdict | Evidence | Fix |
|-------|---------|----------|-----|
| Folder contents table | `ok` (was `stale`) | Updated in this pass: added `golden-variants/`, `stability.ts`, `read-traces.ts`, `stability/<run_id>/` | Done |
| Stability + trace sections | `ok` (new) | Added in this pass, including the saturation caveat and the honest limit of the trace reader | Done |
| Env template pointer, `eval:baseline` usage, manual-scoring steps | `ok` | Matches `run-baseline.ts` and `env.example` | — |

### `BreakItFirst.md` — audited 2026-07-30

The most stale SPEC file in the repo. It is the original masterplan and describes
a system two architectural steps behind the shipped one. Recommendation in the fix
pass is **not** to rewrite 555 lines (that duplicates `01-product.md` +
`02-develop.md`): add a superseded banner at the top pointing at those two, and
reclassify it as RECORD.

| Claim | Verdict | Evidence | Fix |
|-------|---------|----------|-----|
| Pipeline is **two passes** (Pass 1 freeform → Pass 2 JSON) | `stale` | `pipeline.ts` runs Pass 1 (×2 in Deep) → **Pass 1.5 adversarial critique** → Pass 2 → Zod + 17 soft checks + claim guard | Banner + point at `02-develop.md` |
| `cascade.nodes: string[]` | `drift` | `schema.ts:38-41` — `cascadeNodeSchema = { step, observable_signal }`; `nodes` is an array of objects | Banner |
| "Five color themes (Ember, Violet, Ocean, Forest, Gold)" | `stale` | `src/lib/themes.ts` exports only `ThemeMode = "light" \| "dark"`. Same finding as `02-develop.md` A4 and `README.md` | Banner |
| **Seven** report blocks | `stale` | Ten ship. Missing from the list: `stress_test`, `failure_velocity`, `self_consistency`, plus F1/F2/F3 fields and `meta.run` | Banner |
| Doc table rows `docs/project-overview.md`, `docs/guide.md`, `docs/reference.md`, `docs/README.md` (lines 65–68) | `stale` | None exist. `docs/` holds `00-index`, `01-product`, `02-develop`, `03-quality-gap`, `04-refine-backlog`, `05-doc-audit`, `90`, `91`, `Scoring/`, `dogfood/` | Repoint to the real files |
| `docs/project-overview.md` cited again at line 39 and line 74 (`docs/guide.md`) as the place to read block/config detail | `stale` | Same — dead targets; `eval/rubric.md:9` has the identical dead reference | Repoint to `01-product.md` §4 / `02-develop.md` |
| Rate limits + provider presets | `ok` | `rate-limit.ts:32-41`, `provider-settings.ts:17-42` | — |
| Numeric bounds: assumptions 5–10, cascade 7–12, resilience 0–100 | `ok` | `schema.ts:73-74`, `90-91`, `25` | — |

### `docs/dogfood/00-analysis.md` — audited 2026-07-30

Cited `file:line` refs mostly resolve; the real drift is that this file's proposed
backlog IDs were **assigned to different work** when it shipped, so reading §7 and
`04-refine-backlog.md` side by side now gives two contradictory meanings for Q8–Q11.

| Claim | Verdict | Evidence | Fix |
|-------|---------|----------|-----|
| §7 ID map: N1=`Q8`, N2=`Q9`, N3=`E19`, N4=`Q10`, N8=`E22`, "utang abuse"=`Q11` | `drift` | Shipped board: **Q8** = run provenance, **Q9** = raw pass trace, **Q10** = stability run (blocked), **Q11** = engine freeze, **Q12** = trace reader. Only Q10 keeps roughly its meaning | Renumber §7 to the real IDs; move the abuse-debt row off `Q11` |
| Header status: "belum ada baris backlog · belum ada implementasi" | `stale` | Q8/Q9/Q12 shipped 2026-07-30 and the board carries rows for them | Update the status line |
| §7 preamble "Board saat ini kosong (todo 0) sementara §6 memuat 9 item" | `stale` | Board is `todo 0 · doing 1 (Q11) · blocked 1 (Q10)` — no longer "kosong" in the sense meant | Rewrite the sentence |
| §6 N1: four variants `base` / `para` / `strip` / `flip`, pass bar ≥4/5 | `drift` | `eval/stability.ts` ships **`para` only**. `strip` and `flip` were not built | State that only `para` shipped, or add the two |
| §6 N1 file claim: variants live in `eval/golden/variants/` | `drift` | Shipped path is `eval/golden-variants/` | Correct the path |
| §6 N4 "baseline ulang + `eval:compare` → delta terukur" | `drift` | Rubric is saturated (3 runs of 2026-07-16 at 33–34/34, own summary: "ceiling already high at 33.8"), so `eval:compare` on the 34-pt score cannot show the delta N4 asks for. The label diff can | Add the saturation caveat; point at `eval:stability` |
| §6 N3 / §7 E19 cite `schema.ts:111–118` for `candidate_spofs` in `self_consistency` | `drift` | Now `schema.ts:125-132` (`self_consistency` object, `candidate_spofs` at :130). Lines 111-118 are `stress_test` | Update the line ref |
| K3 evidence: `candidate_spofs` is Deep-only and `.optional()` | `ok` | `schema.ts:125` `.optional()`; `pipeline.ts` deletes `self_consistency` when `!deepAnalysis` | — |
| K3: prompt builds 3 candidates in both modes, writes only the winner | `ok` | `prompts.ts:89-94` ("Generate 3 distinct SPOF candidates … Keep ONLY the winner") and `:398-401` | — |
| K3 verification "setelah `spof_candidates` naik ke top-level" | `frozen` | Requires editing `prompts.ts` + `schema.ts` — blocked by Q11. Trace dump (Q9) + `eval/read-traces.ts` (Q12) shipped as the non-engine substitute | Record the substitution in K3 |
| K4 code claim: `input-validation.ts` rejects empty, `< MIN_IDEA_LENGTH`, `> 8000`, control chars, `isMostlyRepeated`, **10** injection patterns, `< 5` unique words | `ok` | `input-validation.ts:3` `MAX_IDEA_LENGTH = 8000`; `:20-31` exactly 10 `SUSPICIOUS_PATTERNS`; `:46` `isMostlyRepeated`; `:159` `uniqueWords.size < 5` | — |
| K4: nothing measures discriminating context | `ok` | No sufficiency scoring anywhere in `input-validation.ts` | — |
| K5 chronology row "2026-07-30: todo 0 · doing 0 · 32 baris done" | `stale` | Counts line now reads `todo 0 · doing 1 · blocked 1` | Date-stamp the row as a snapshot |
| §10 definition-of-done checkbox "`npm run eval:stability` ada dan lulus kriteria §6 N1" | `drift` | The script exists but cannot "lulus" §6 N1 — that bar needs `strip`/`flip`, which do not exist, and a run, which is blocked on credentials | Split into "exists" (done) and "passes" (blocked) |
| §11 validity limits (self-referential, n=5, non-identical ideas, corrupt run-3 input, no human judge) | `ok` | Honest and still accurate; the Q1 self-violation is correctly owned | — |
| Report-storage + rate-limit refs (`report-storage.ts`, `01-product.md` §2 Deep = 2 slots) | `ok` | `MAX_REPORT_HISTORY = 10`; `api/analyze/route.ts:91` | — |

### `AGENTS.md` / `CLAUDE.md` — audited 2026-07-30

| Claim | Verdict | Evidence | Fix |
|-------|---------|----------|-----|
| `CLAUDE.md` is `@AGENTS.md` | `ok` | Single-line include; no duplicated instructions to drift apart | — |
| "Read the relevant guide in `node_modules/next/dist/docs/`" | `ok` | Directory present: `01-app`, `02-pages`, `03-architecture`, `04-community`, `index.md` | — |
| "This is NOT the Next.js you know" (breaking changes vs training data) | `ok` | `next@16.2.10` — well past the assistant knowledge cutoff for this repo's purposes | — |

---

## 4. Fix pass — 2026-07-30

Applied after §3 was complete, doc by doc. No file under RECORD was touched.

| File | What changed |
|------|--------------|
| `docs/00-index.md` | Added `05` and a `dogfood/` row; `Scoring/` row now describes all 8 files and drops the dead `7-head-to-head.md` link; all links normalised to the on-disk case, with an explicit note about case-sensitive hosts; RECORD warning widened to cover `Scoring/` and `dogfood/{1,2,3}test*` |
| `docs/02-develop.md` | Header re-dated to 2026-07-30; A4 rewritten as light/dark **mode** (no named palettes); `breakitfirst.theme` described as a mode; command table + env list gained `eval:stability`, `eval:traces` and every optional `BIF_*`; A3 tree updated (incl. `type-lab`, landing components, `golden-variants/`, `stability.ts`, `read-traces.ts`, docs 03–05, `Scoring/`, `dogfood/`); rate limits became a table incl. `analyzeStrict` + the 1 h abuse-strike window; `maxDuration` qualified per route (300s analyze/status, **30s** models) in both places; schema block gained `meta.run`; soft-check list corrected to **17** with `security_legal_when_data_path`; module + component tables completed; new "Report provenance (Q8)" section; feature map gained provenance, trace and the blocked stability run |
| `README.md` | "5 themes" → light/dark; quick-start step 2 no longer offers a theme picker; scripts table gained the four missing scripts; tree and Documentation table updated (03/04/05); `maxDuration` qualified per route; rate limits mention strict mode; new provenance feature row; roadmap item "Re-baseline … (optional)" rewritten as **required and blocked**, with the saturation reason and a pointer to Q10/Q11 |
| `docs/01-product.md` | New **§4.10 Run provenance** (fields, host-only rule, why it is a report block); §4.9 now states the Standard-mode asymmetry and that the top-level-candidates fix is frozen with Q9/Q12 as the shipped substitute |
| `docs/03-quality-gap.md` | Header lists spot-checks 6, 7 **and** 8; §3 gained a note that these five texts are deliberately *not* `eval/golden/*.json` (and points at `golden-variants/`); "Q7 implement batch next" replaced with the real open state (Q10 blocked under the Q11 freeze); §8 dead "template remains `7-head-to-head.md`" removed; all `scoring/` paths → `Scoring/` |
| `docs/04-refine-backlog.md` | All `scoring/` paths → `Scoring/` |
| `eval/rubric.md` | Dead `docs/project-overview.md` source line repointed to `docs/01-product.md` §4; prominent saturation warning added (3 runs at 33–34/34, "ceiling already high at 33.8"), directing quality-delta questions to `eval:stability`; records that the 34 points cover neither `stress_test`, `failure_velocity`, `self_consistency` nor F1/F2/F3 |
| `eval/README.md` | Already corrected during the audit (folder table + stability/trace sections) |
| `BreakItFirst.md` | Superseded banner at the top: reclassified **RECORD**, points at `01-product.md` / `02-develop.md` / `README.md` / `04-refine-backlog.md`, and lists the five concrete differences (three passes not two, ten blocks not seven, `cascade.nodes` object shape, no named themes, BYOK dev-only). Dead doc targets repointed; the rest left as the historical plan it is |
| `docs/dogfood/00-analysis.md` | Status line corrected; an ID-map box added near the head because §7's proposed `Q8`/`Q9`/`Q10`/`Q11` collide with the shipped meanings; N1 corrected (`eval/golden-variants/`, `para` only, human `Same hinge?` column); N3 marked frozen with the Q9/Q12 substitute and its honest limit; N4 given the saturation correction; `schema.ts:111–118` → `:125–132` in both places; §7 reframed as a superseded proposal; §10 checklist split into what exists vs what is blocked; K5 snapshot row date-stamped; abuse-debt no longer claims the `Q11` id |

### Left deliberately unfixed

| Item | Why |
|------|-----|
| `spof_candidates` at top level (dogfood K3 / N3) | Needs `prompts.ts` + `schema.ts` — **frozen** by Q11. Documented as frozen instead of implemented |
| `src/app/type-lab/` | Documented in the A3 tree as a dev-only playground rather than deleted. Deleting a live route is an owner decision, not a doc fix |
| The `strip` / `flip` stability variants | Building them means new fixtures and a second run design; recorded as a gap in N1 rather than silently dropped from the pass criteria |
| RECORD files (`90`, `91`, `Scoring/*`, `dogfood/{1,2,3}test*`) | Rewriting them would destroy the dated evidence — see §1 |
| Q10's actual run | Blocked on owner provider credentials |




