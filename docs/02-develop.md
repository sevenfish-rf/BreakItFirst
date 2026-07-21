# 02 — Develop (setup · architecture · API · schema)

Product semantics → [01-product.md](./01-product.md) · Index → [00-index.md](./00-index.md)

*Aligned with `src/` as of 2026-07-21.*

---

# Part A — Setup & architecture

## A1. Overview

| | |
|--|--|
| **Name** | BreakItFirst |
| **Tagline** | What Would Break This? |
| **Role** | Premortem for **unbuilt ideas** (not security red teaming) |

### User flow

```
Landing → idea + category + locale → provider (BYOK for owner/dev)
  → Analyze → job starts → overlay (poll stages) → report
  → optional: export MD, history, new analysis
```

Refresh mid-run **reconnects** (unless Cancel). Draft persists in the browser.

### Feature map

| Area | Status |
|------|--------|
| Pipeline Pass 1 → 1.5 → Pass 2 | Shipped |
| Deep analysis (2× Pass 1 + calibration) | Shipped |
| Archetypes, signals, stress, velocity | Shipped |
| F1 / F2 / F3 fields | Shipped |
| Reasoning refine (multi-hyp, dominance, counterfactual, pathway) | Shipped |
| Async jobs + poll + cancel + single-flight | Shipped |
| Draft / report restore / history (localStorage, max 10) | Shipped |
| BYOK | Dev/owner; prod may use fixed provider |
| Themes · i18n EN/ID | Shipped |
| Eval harness | Shipped (`eval/`) |
| Redis / multi-instance / server DB | Deferred |

## A2. Setup

**Requirements:** Node.js 20+ (22.x recommended), npm.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start
npm run lint
```

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production |
| `npm run lint` | ESLint |
| `npm run smoke:session` | Jobs + history (no LLM) |
| `npm run eval:assert-sample` | Schema smoke (no provider) |
| `npm run eval:baseline` | Golden set via `BIF_*` |
| `npm run eval:compare` | Diff scores |
| `npm run eval:baseline:ps1` | PowerShell helper |

**Env:** not required for UI. Keys via browser BYOK, not stored server-side.  
Eval only: `BIF_BASE_URL`, `BIF_API_KEY`, `BIF_PASS1_MODEL`, `BIF_PASS2_MODEL` — see `eval/env.example`.

**Provider UI:** base URL, API key, Pass 1 / Pass 2 model. Presets: OpenAI, OpenRouter, Ollama (`http://127.0.0.1:11434/v1`), custom. Test → `POST /api/models`. SSRF guard on base URL.

### Browser storage

| Key | Purpose |
|-----|---------|
| `breakitfirst.provider` | BYOK settings |
| `breakitfirst.sessionId` | Rate-limit session |
| `breakitfirst.locale` | `en` \| `id` |
| `breakitfirst.theme` | Theme id |
| `breakitfirst.draft.v1` | Form draft |
| `breakitfirst.activeJob.v1` | Job reconnect |
| `breakitfirst.report.v1` | Last report |
| `breakitfirst.reportHistory.v1` | History (max 10) |

**Tailwind:** if UI unstyled → delete `.next`, restart, hard refresh.

## A3. Architecture

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind v4 · Zod · Framer Motion · React Flow · Recharts · three.js

```
src/app/           pages + api/analyze (+ status, cancel) + api/models
src/components/    shell, form, report, overlay, history, visuals
src/lib/           pipeline, jobs, prompts, schema, provider, i18n
src/types/         FailureAnalysis
eval/              golden, rubric, baselines
scripts/           smoke-session, eval-baseline.ps1
docs/              00-index · 01-product · 02-develop · 90/91 archive
```

### Analyze lifecycle

```
POST /api/analyze → { jobId }   (single-flight → rate limit → create job)
GET  /api/analyze/status?jobId=&mode=poll
     stages: ingest → pass1 → pass1_5 → pass2 → validate → done|error
POST /api/analyze/cancel { jobId }
```

- Refresh does **not** cancel. Only Cancel / process death / expiry.
- Job store: `globalThis` + `.breakitfirst-jobs/` (gitignored). Not multi-instance.

### AI pipeline (inside job)

```
Pass 1 (+ archetypes)  [Deep: ×2]
  → Pass 1.5 critique / calibration
  → Pass 2 JSON (+ 1 validation retry)
  → Zod + soft-checks
```

**Rate limits (in-memory):** analyze 8 slots / 15 min (Deep cost **2**); models 40 / min.  
`maxDuration` 300s.

## A4. Themes & i18n

Themes: `ember` (default), `violet`, `ocean`, `forest`, `gold`.  
Locale: `en` / `id` for UI + report prose; schema field names and band enums stay English.

```ts
const { locale, setLocale, t } = useLanguage();
```

## A5. Quality & deploy

- Eval: `eval/README.md`. Historical baseline mean **33.8** (`230859`) — see [90-history.md](./90-history.md).
- Smoke: `npm run smoke:session`.

**Deploy:** Node + long routes; HTTPS; no key logging; Redis before multi-instance; optional LICENSE.

---

# Part B — API

## B1. `POST /api/analyze`

Starts a **background job** (not inline analysis).

```json
{
  "idea": "string",
  "category": "Startup | Business | Software App | API | SaaS | Mobile App | AI Product | Game | Marketplace | Hardware | Other",
  "locale": "en | id",
  "deepAnalysis": false,
  "provider": {
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "optional for local Ollama",
    "pass1Model": "…",
    "pass2Model": "…"
  }
}
// header: X-Session-Id
```

```json
// new: { "ok": true, "jobId": "…", "stage": "ingest" }
// reuse: { "ok": true, "jobId": "…", "reused": true, "stage": "…" }
```

| Status | Meaning |
|--------|---------|
| 200 | Accepted or reused |
| 400 | Invalid input/provider |
| 422 | `not_analyzable` |
| 429 | Rate limited + `retryAfterSec` |
| 500 | Unexpected |

Single-flight **before** rate limit. Deep cost = 2 slots.

## B2. `GET /api/analyze/status?jobId=…&mode=poll|stream`

| Mode | Behavior |
|------|----------|
| `poll` | JSON snapshot (primary) |
| `stream` | NDJSON tail (optional) |

404 `job_not_found` if expired / restart without recovery.

## B3. `POST /api/analyze/cancel`

```json
{ "jobId": "…" }
```

## B4. `POST /api/models`

```json
{ "baseUrl": "…", "apiKey": "…", "test": false, "model": "optional" }
// → { ok, tested, modelCount, models: string[] }
```

40 / min. Ollama fallback: `/api/tags`.

---

# Part C — Schema & soft-checks

Types: `src/types/analysis.ts` · Zod: `src/lib/schema.ts`.

```ts
FailureAnalysis {
  meta: { idea_input, category, generated_at }
  summary: string
  assumptions: string[]            // 5–10
  single_point_of_failure: {
    component, confidence, confidence_reason, explanation
    critical_assumption_indices?: number[]  // F1
  }
  cascade: {
    nodes: { step, observable_signal }[]    // 7–12
    point_of_no_return_index?: number       // F2
  }
  failure_modes: {
    technical, business, security, legal, operations  // string[]
    compounding_note?: string               // F3
  }
  likelihood: { band, reason }              // pathway
  resilience_score: { technical, business, legal, operations, trust }  // 0–100
  stress_test: { items: { archetype_id, verdict, reason }[] }
  failure_velocity: { band, reason }        // Fast|Medium|Slow
  self_consistency?: {                      // Deep
    runs, spof_agreement, reason, candidate_spofs
  }
}
```

Error: `{ error: "not_analyzable", message }`.

### Soft-checks (warn only)

`cascade_connected` · `spof_in_failure_modes` · `resilience_sane` · `stress_test_useful` · `stress_test_not_all_yes` · `stress_test_not_all_maybe` · `failure_modes_coverage` · `signals_observational` · `spof_label_short` · `cascade_depth_preferred` · `spof_label_mechanistic` · `resilience_matches_spof` · `critical_assumptions_overlap` · `critical_assumptions_present` · `failure_modes_track_cascade` · `ponr_in_range_ok`  
+ `pass2NovelClaimWarnings` (grounding).

---

# Part D — Modules & UI

### Pipeline stages

```
Job UI: ingest → pass1 → [pass1_b] → pass1_5 → pass2 → validate → done|error
LLM:    Pass1 → Pass1.5 → Pass2 → Zod
```

| Module | Path |
|--------|------|
| Orchestration | `src/lib/pipeline.ts` |
| Stages | `src/lib/pipeline-stages.ts` |
| Prompts | `src/lib/prompts.ts` |
| Archetypes | `src/lib/archetypes.ts` |
| Jobs | `src/lib/analyze-jobs.ts` |
| Client poll | `src/lib/analyze-client.ts` |
| Schema | `src/lib/schema.ts` |
| Provider | `src/lib/provider-client.ts` |
| Rate limit | `src/lib/rate-limit.ts` |
| Draft / report | `src/lib/draft.ts`, `report-storage.ts` |
| i18n / themes | `src/lib/i18n/*`, `themes.ts` |

### UI components

| Component | Role |
|-----------|------|
| `app-shell.tsx` | form ↔ analyzing ↔ report |
| `landing-form.tsx` | idea, deep, resume, history |
| `analyzing-overlay.tsx` | poll progress |
| `analysis-report.tsx` | report panels |
| `report-history.tsx` | open/delete history |
| `provider-settings.tsx` | BYOK |
| `visuals/*` | cascade, radar, modes, stress |

### Eval commands

| Command | |
|---------|--|
| `npm run eval:assert-sample` | No provider |
| `npm run eval:baseline` | Needs `BIF_*` |
| `npm run eval:compare` | Diff scores |
| `npm run smoke:session` | Jobs + history |

Details: `eval/README.md`.
