# Reference — API, schema, modules, components

## 1. API

### `POST /api/analyze`

```json
// request
{
  "idea": "string (40–8000 chars)",
  "category": "Startup | Business | Software App | API | SaaS | Mobile App | AI Product | Game | Marketplace | Hardware | Other",
  "locale": "en | id",
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
| 200 | `{ ok: true, analysis, warnings? }` |
| 400 | Input/provider invalid |
| 422 | `not_analyzable` (pesan netral) |
| 429 | Rate limited + `retryAfterSec` |
| 502 | Provider / schema gagal |
| 500 | Unexpected |

**Rate limit analyze:** 8 / 15 menit; strict 2 / 15 menit setelah abuse strikes ≥ 3.  
`maxDuration` 120s · `runtime` nodejs.

### `POST /api/models`

```json
{ "baseUrl": "…", "apiKey": "…", "test": false, "model": "optional" }
// → { ok, tested, modelCount, models: string[] }
```

Rate limit: 40 / menit. Fallback Ollama: `/api/tags` jika `/models` kosong.

---

## 2. Schema output (MVP)

Tipe: `src/types/analysis.ts` · validasi: `validateFailureAnalysis`.

```ts
FailureAnalysis {
  meta: { idea_input, category, generated_at }  // meta di-overwrite server
  summary: string
  assumptions: string[]            // 5–10
  single_point_of_failure: {
    component, confidence, confidence_reason, explanation
    // confidence: Low | Medium | High | Very High
  }
  cascade: { nodes: string[] }     // 7–12
  failure_modes: {
    technical, business, security, legal, operations  // string[]
  }
  likelihood: {
    band: Very Low | Low | Medium | High | Very High
    reason: string
  }
  resilience_score: {
    technical, business, legal, operations, trust  // 0–100
  }
}
```

Error Pass 2: `{ error: "not_analyzable", message }`.  
Soft check: `cascadeLooksConnected` (log only, tidak block).

**Bukan MVP:** early_warning_signals, stress_test, timeline.

---

## 3. Modules `src/lib`

| File | Export utama | Peran |
|------|--------------|--------|
| `pipeline.ts` | `runFailureAnalysisPipeline` | Pass 1 + 2 + validate |
| `prompts.ts` | `pass1SystemForCategory`, `buildPass*UserMessage`, `pass2SystemForLocale` | Prompt + language |
| `provider-client.ts` | `callProvider`, `listProviderModels`, `testProviderConnection`, `assertSafeBaseUrl` | HTTP ke provider |
| `provider-errors.ts` | `humanizeProviderFailure`, `redactSecrets` | Error aman untuk UI |
| `provider-settings.ts` | `load/save/clearProviderSettings`, `isProviderConfigured`, presets | BYOK localStorage |
| `schema.ts` | `validateFailureAnalysis`, `extractJsonObject`, `cascadeLooksConnected` | Schema guard |
| `input-validation.ts` | `validateAnalyzeInput`, `validateProviderFields` | Input + safety |
| `rate-limit.ts` | `checkRateLimit`, `recordAbuseStrike`, `getClientIp`, `getSessionId` | Throttle |
| `analyze-client.ts` | `requestAnalysis` | Fetch dari browser |
| `categories.ts` | `CATEGORIES`, `CATEGORY_LENSES`, `EXAMPLE_CHIPS`, `MIN_IDEA_LENGTH` | Kategori & lens |
| `session.ts` | `getOrCreateSessionId` | Session id |
| `themes.ts` | `THEMES`, `THEME_LIST`, `applyThemeToDocument` | Definisi theme |
| `theme-context.tsx` | `ThemeProvider`, `useTheme` | React theme state |
| `i18n/*` | `LanguageProvider`, `useLanguage`, `getDictionary` | EN/ID |
| `utils.ts` | `cn` | className merge |

### Konstanta penting

| | |
|--|--|
| Min ide | 40 karakter (+ ≥5 unique words) |
| Max ide | 8000 |
| Rate analyze | 8 / 15m (strict 2) |
| Rate models | 40 / m |

---

## 4. Components

### Shell & flow

| | |
|--|--|
| `AppShell` | Providers, background, landing ↔ report |
| `Header` | Brand, theme circles, EN/ID, provider |
| `LandingForm` | Form + trigger analyze |
| `AnalyzingOverlay` | Progress full-card saat loading |
| `AnalysisReport` | Layout report |
| `ProviderSettingsModal` | BYOK UI |

### UI

| | |
|--|--|
| `GlowCard` | BorderGlow + theme (`animated` default **true**) |
| `Button` / `Input` / `Textarea` / `Label` | Controls |
| `ThemeCircles` | 5 circle theme |

### Effects

| | |
|--|--|
| `BorderGlow` | Mesh border + edge glow (React Bits) |
| `PixelBlastBackground` | WebGL bg (warna theme) |

**BorderGlow (via GlowCard):** `glowColor`, `backgroundColor`, `colors[]` dari theme; `glowIntensity` ~1.3–2.1; `idleVisible` mesh idle.

### Visuals report

| | |
|--|--|
| `FailureCascadeGraph` | React Flow cascade |
| `CascadeNode` | Node severity tone |
| `ResilienceRadar` | Radar 5 dimensi |
| `FailureModeCards` | 5 risk category |

### Report layout

```
Sticky header
SPOF | Likelihood
Summary
Assumptions | Resilience
Cascade graph
Failure modes
```
