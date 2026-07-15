# Reference — API, schema, modules, components

## 1. API

### `POST /api/analyze`

```json
// request
{
  "idea": "string (40–8000 chars)",
  "category": "Startup | Business | Software App | API | SaaS | Mobile App | AI Product | Game | Marketplace | Hardware | Other",
  "locale": "en | id",
  "deepAnalysis": false,
  "provider": {
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "optional for local",
    "pass1Model": "…",
    "pass2Model": "…"
  }
}
// header: X-Session-Id
```

| Status | Arti |
|--------|------|
| 200 | `{ ok: true, analysis, warnings?, meta? }` |
| 400 | Input/provider invalid |
| 422 | `not_analyzable` (pesan netral) |
| 429 | Rate limited + `retryAfterSec` |
| 502 | Provider / schema gagal |
| 500 | Unexpected |

**Rate limit analyze:** 8 slots / 15 menit (Deep analysis **cost = 2**); strict 2 / 15 menit setelah abuse strikes ≥ 3.  
`maxDuration` 300s · `runtime` nodejs.

`meta` (server timing):

```ts
{ deepAnalysis: boolean, stages: { stage, ms, ok }[], totalMs: number }
```

### `POST /api/models`

```json
{ "baseUrl": "…", "apiKey": "…", "test": false, "model": "optional" }
// → { ok, tested, modelCount, models: string[] }
```

Rate limit: 40 / menit. Fallback Ollama: `/api/tags` jika `/models` kosong.

---

## 2. Schema output

Tipe: `src/types/analysis.ts` · validasi Zod: `src/lib/schema.ts`.

```ts
FailureAnalysis {
  meta: { idea_input, category, generated_at }  // di-overwrite server
  summary: string
  assumptions: string[]            // 5–10
  single_point_of_failure: {
    component, confidence, confidence_reason, explanation
    // confidence: Low | Medium | High | Very High
  }
  cascade: {
    nodes: { step: string, observable_signal: string }[]  // 7–12
  }
  failure_modes: {
    technical, business, security, legal, operations  // string[]
  }
  likelihood: {
    band: Very Low | Low | Medium | High | Very High
    reason: string
  }
  resilience_score: {
    technical, business, legal, operations, trust  // 0–100 int
  }
  stress_test: {
    items: { archetype_id, verdict: Yes|Maybe|No, reason }[]
  }
  failure_velocity: {
    band: Fast | Medium | Slow
    reason: string
  }
  self_consistency?: {  // Deep analysis only
    runs: number
    spof_agreement: High | Medium | Low
    reason: string
    candidate_spofs: string[]
  }
}
```

Error Pass 2: `{ error: "not_analyzable", message }`.

Soft-checks (warnings, tidak block): cascade connected, SPOF↔modes, resilience sane, stress useful, signals observational, claim guard.

---

## 3. Pipeline stages

```
Pass 1 (+ archetype knowledge)
  [Deep: Pass 1 ×2 parallel]
Pass 1.5 critique / calibration
Pass 2 JSON (+ 1 validation retry)
Zod validate + soft-checks
```

Archetypes: `src/lib/archetypes.ts`  
Prompts: `src/lib/prompts.ts`  
Orchestration: `src/lib/pipeline.ts`

---

## 4. Modules `src/lib` (utama)

| File | Peran |
|------|--------|
| `pipeline.ts` | Orchestrate passes + meta timing |
| `schema.ts` | Zod + soft-checks + extract JSON |
| `prompts.ts` | Pass 1 / 1.5 / 2 prompts |
| `archetypes.ts` | C.1 knowledge library |
| `provider-client.ts` | OpenAI-compatible fetch + SSRF guard |
| `rate-limit.ts` | In-memory sliding window + cost |
| `input-validation.ts` | Idea/category/provider validation |

---

## 5. Eval

| Command | |
|---------|--|
| `npm run eval:assert-sample` | No provider |
| `npm run eval:baseline` | Needs `BIF_*` env |
| `.\scripts\eval-baseline.ps1` | Interactive PowerShell |

See `eval/README.md`.
