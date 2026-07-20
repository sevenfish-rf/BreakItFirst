# Reference — API, schema, modules, components

Aligned with `src/` as of 2026-07-20. Product semantics → [product.md](./product.md)

---

## 1. API

### `POST /api/analyze`

Starts a **background job** (does not return the full analysis inline).

```json
// request
{
  "idea": "string (validated length; see input-validation)",
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
// header: X-Session-Id (recommended)
```

```json
// 200 — new job
{ "ok": true, "jobId": "…", "stage": "ingest" }

// 200 — single-flight reuse (same session already running)
{ "ok": true, "jobId": "…", "reused": true, "stage": "…", "message": "…" }
```

| Status | Meaning |
|--------|---------|
| 200 | Job accepted or reused |
| 400 | Invalid body / input / provider |
| 422 | `not_analyzable` (neutral user message) |
| 429 | Rate limited + `retryAfterSec` |
| 500 | Unexpected |

- Single-flight runs **before** rate limit (reconnect does not burn a second slot).
- `maxDuration` 300s · `runtime` nodejs · `dynamic` force-dynamic.
- Rate: 8 slots / 15 min (Deep **cost = 2**); strict mode after abuse strikes.

### `GET /api/analyze/status?jobId=…&mode=poll|stream`

| Mode | Behavior |
|------|----------|
| `poll` (default) | JSON snapshot: stage, progress, result/error when terminal |
| `stream` | NDJSON live tail (optional) |

Disconnect does **not** cancel the job.  
404 `job_not_found` if expired / server restart without disk recovery.

### `POST /api/analyze/cancel`

```json
{ "jobId": "…" }
```

Aborts in-flight provider work when possible; clears client active job.

### `POST /api/models`

```json
{ "baseUrl": "…", "apiKey": "…", "test": false, "model": "optional" }
// → { ok, tested, modelCount, models: string[] }
```

Rate: 40 / min. Ollama fallback: `/api/tags` if `/models` empty.

---

## 2. Output schema

Types: `src/types/analysis.ts` · Zod + normalize: `src/lib/schema.ts`.

```ts
FailureAnalysis {
  meta: { idea_input, category, generated_at }  // server overwrites idea/category/time as needed
  summary: string
  assumptions: string[]            // 5–10
  single_point_of_failure: {
    component: string              // short mechanism label
    confidence: "Low" | "Medium" | "High" | "Very High"
    confidence_reason: string
    explanation: string
    critical_assumption_indices?: number[]  // F1: 0-based into assumptions, 1–3
  }
  cascade: {
    nodes: { step: string, observable_signal: string }[]  // 7–12
    point_of_no_return_index?: number  // F2: 0-based into nodes
  }
  failure_modes: {
    technical: string[]
    business: string[]
    security: string[]
    legal: string[]
    operations: string[]
    compounding_note?: string      // F3
  }
  likelihood: {
    band: "Very Low" | "Low" | "Medium" | "High" | "Very High"
    reason: string                 // this pathway, not overall company odds
  }
  resilience_score: {
    technical, business, legal, operations, trust  // 0–100 int
  }
  stress_test: {
    items: { archetype_id, verdict: "Yes" | "Maybe" | "No", reason }[]
  }
  failure_velocity: {
    band: "Fast" | "Medium" | "Slow"
    reason: string
  }
  self_consistency?: {             // Deep only
    runs: number
    spof_agreement: "High" | "Medium" | "Low"
    reason: string
    candidate_spofs: string[]
  }
}
```

Pass 2 error object: `{ error: "not_analyzable", message }`.

### Soft-checks (warnings only — do not fail the pipeline)

| id | Intent |
|----|--------|
| `cascade_connected` | Cascade mentions SPOF/assumption themes |
| `spof_in_failure_modes` | SPOF theme appears in modes |
| `resilience_sane` | Profile not flat / not absurd vs confidence |
| `stress_test_useful` | Enough known archetypes; not all-No |
| `stress_test_not_all_yes` | Avoid rubber-stamp Yes |
| `stress_test_not_all_maybe` | Avoid uninformative Maybe |
| `failure_modes_coverage` | ≥3 of 5 domains non-empty |
| `signals_observational` | Signals not advice-like |
| `spof_label_short` | Component not a paragraph |
| `cascade_depth_preferred` | Prefer 8–10 nodes |
| `spof_label_mechanistic` | Prefer concrete mechanism label |
| `resilience_matches_spof` | SPOF-related dimension not too high |
| `critical_assumptions_overlap` | Indices theme-match SPOF when present |
| `critical_assumptions_present` | Prefer ≥1 linked assumption index |
| `failure_modes_track_cascade` | Modes bullets track SPOF/cascade (~40% token hit) |
| `ponr_in_range_ok` | PONR index sane if present |

Also: `pass2NovelClaimWarnings` — free-text fields should be grounded in Pass 1/1.5 prose.

---

## 3. Pipeline stages (job + LLM)

```
Job stages (UI): ingest → pass1 → [pass1_b deep] → pass1_5 → pass2 → validate → done|error

LLM:
  Pass 1 (+ archetype block)     [Deep: ×2]
  Pass 1.5 critique / calibrate
  Pass 2 JSON (+ up to 1 retry)
  Zod + soft-checks
```

| Module | Path |
|--------|------|
| Orchestration | `src/lib/pipeline.ts` |
| Stage ids / UI mapping | `src/lib/pipeline-stages.ts` |
| Prompts | `src/lib/prompts.ts` (`SHARPNESS_DIRECTIVE`, `REASONING_REFINE_DIRECTIVE`, Pass 1/1.5/2) |
| Archetypes | `src/lib/archetypes.ts` |
| Jobs | `src/lib/analyze-jobs.ts` |
| Client start+poll | `src/lib/analyze-client.ts` |

---

## 4. Modules `src/lib` (map)

| File | Role |
|------|------|
| `pipeline.ts` | Pass orchestration + stage events + meta timing |
| `pipeline-stages.ts` | Live stage names → overlay index |
| `analyze-jobs.ts` | Job create/get/complete/cancel, single-flight, disk persist |
| `analyze-client.ts` | Browser: start job, poll, cancel, resume |
| `prompts.ts` | System/user messages Pass 1 / 1.5 / 2 |
| `schema.ts` | Zod, normalize, soft-checks, claim guard |
| `archetypes.ts` | Failure pattern library for stress test + Pass 1 lenses |
| `categories.ts` | Category ids + prompt lenses |
| `provider-client.ts` | OpenAI-compatible chat; SSRF guard; reasoning_content extract |
| `provider-errors.ts` | Humanized provider errors |
| `provider-settings.ts` | localStorage provider prefs |
| `input-validation.ts` | Idea/category/locale/provider validation |
| `rate-limit.ts` | In-memory sliding window + abuse strict mode |
| `draft.ts` | Form draft + active job keys |
| `report-storage.ts` | Last report + history (max 10) |
| `report-markdown.ts` | Export MD |
| `session.ts` | Session id helper |
| `user-warnings.ts` | Map soft-check ids → user-facing warnings |
| `ndjson-stream.ts` | Status stream encoding |
| `i18n/*` | Dictionaries EN/ID + context |
| `themes.ts` / `theme-context.tsx` | Theme tokens + provider |

---

## 5. Main UI components

| Component | Role |
|-----------|------|
| `app-shell.tsx` | State: form ↔ analyzing ↔ report; restore report/history |
| `landing-form.tsx` | Idea form, deep toggle, resume job, history entry |
| `analyzing-overlay.tsx` | Stage progress (poll-driven floors) |
| `analysis-report.tsx` | Full report panels |
| `report-history.tsx` | Open/delete saved reports |
| `provider-settings.tsx` | BYOK UI |
| `visuals/*` | Cascade graph, radar, mode cards, stress panel |

---

## 6. Eval

| Command | |
|---------|--|
| `npm run eval:assert-sample` | No provider |
| `npm run eval:baseline` | Needs `BIF_*` env |
| `npm run eval:compare` | Diff score summaries |
| `.\scripts\eval-baseline.ps1` | Interactive PowerShell |
| `npm run smoke:session` | Jobs + history (no LLM) |

Details: `eval/README.md`. Baselines under `eval/baselines/`.
