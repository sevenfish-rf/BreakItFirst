# Guide — setup, architecture, session UX

Product meaning → [product.md](./product.md) · API detail → [reference.md](./reference.md)

---

## 1. Overview

| | |
|--|--|
| **Name** | BreakItFirst |
| **Tagline** | What Would Break This? |
| **Role** | Structured premortem for **unbuilt ideas** (not security red teaming of a live platform) |

### User flow

```
Landing → idea + category + locale → provider (BYOK for owner/dev)
  → Analyze → job starts → overlay (poll stages) → report
  → optional: export MD, history, new analysis
```

Refresh mid-run **reconnects** to the same job (unless Cancel). Draft idea/form persists in the browser.

### Feature map (current code)

| Area | Status |
|------|--------|
| Pipeline Pass 1 → 1.5 → Pass 2 | Shipped |
| Deep analysis (2× Pass 1 + calibration) | Shipped |
| Archetypes, signals, stress test, velocity | Shipped |
| F1 critical assumptions · F2 point-of-no-return · F3 compounding note | Shipped |
| Reasoning refine (multi-hyp, dominance, counterfactual, pathway likelihood) | Shipped (prompts + soft-checks) |
| Async analyze jobs + poll + cancel | Shipped |
| Single-flight per session | Shipped |
| Form draft + report restore + history (localStorage, max 10) | Shipped |
| BYOK OpenAI-compatible | Shipped (**dev/owner testing**; prod may use fixed provider later) |
| Themes (5) · i18n EN/ID | Shipped |
| Eval harness | Shipped (`eval/`) |
| Redis / multi-instance job store | Deferred |
| Server DB / share links | Deferred |

---

## 2. Setup

### Requirements

Node.js **20+** (22.x recommended), npm.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start
npm run lint
```

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production |
| `npm run lint` | ESLint |
| `npm run smoke:session` | Job single-flight + report history (no LLM) |
| `npm run eval:assert-sample` | Schema/assertions smoke (no provider) |
| `npm run eval:baseline` | Golden set via `BIF_*` env |
| `npm run eval:compare` | Compare baseline scores |
| `npm run eval:baseline:ps1` | PowerShell helper for baseline |

### Env

**Not required for the web UI.** Analyze credentials come from the browser (BYOK) on each request and are **not** persisted server-side.

Eval only (local):

```text
BIF_BASE_URL, BIF_API_KEY, BIF_PASS1_MODEL, BIF_PASS2_MODEL
```

See `eval/env.example` and `eval/README.md`.

### Provider UI (analyze)

Navbar → **Provider**:

| Field | Example |
|-------|---------|
| Base URL | `https://api.openai.com/v1` |
| API key | `sk-...` (may be empty for local Ollama) |
| Pass 1 model | reasoning model id |
| Pass 2 model | structuring model id |

Presets: OpenAI · OpenRouter · Ollama (`http://127.0.0.1:11434/v1`) · Custom.  
**Fetch models / Test** → `POST /api/models`.

Server validates base URL (SSRF guard; HTTP only for localhost/LAN).

### Browser storage keys

| Key | Purpose |
|-----|---------|
| `breakitfirst.provider` | BYOK settings |
| `breakitfirst.sessionId` | Rate-limit session id |
| `breakitfirst.locale` | `en` \| `id` |
| `breakitfirst.theme` | Theme id |
| `breakitfirst.draft.v1` | Form draft (idea, category, deep flag, …) |
| `breakitfirst.activeJob.v1` | Running job id for refresh reconnect |
| `breakitfirst.report.v1` | Last report snapshot |
| `breakitfirst.reportHistory.v1` | Up to 10 past reports |

### Tailwind note

`src/app/globals.css` uses Tailwind v4 + `@source`. If UI looks unstyled: delete `.next`, restart dev, hard refresh.

---

## 3. Architecture

### Stack

Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · Zod · Framer Motion · React Flow · Recharts · three.js (background)

### Layout

```
src/
  app/                 # pages + api/analyze (+ status, cancel) + api/models
  components/          # shell, form, report, overlay, history, visuals, ui
  lib/                 # pipeline, jobs, prompts, schema, provider, i18n, …
  types/               # FailureAnalysis
eval/                  # golden fixtures, rubric, baselines
scripts/               # smoke-session, eval-baseline.ps1
docs/                  # product · guide · reference · archive/
```

### Analyze request lifecycle

```
Browser
  │  POST /api/analyze  { idea, category, locale, deepAnalysis, provider }
  │  header X-Session-Id
  │
  ▼
Server: single-flight check → rate limit → create job → return { jobId }
  │  (pipeline runs in background on the job)
  │
  ▼
Browser polls GET /api/analyze/status?jobId=…&mode=poll
  │  stages: ingest → pass1 → pass1_5 → pass2 → validate → done | error
  │
  ▼
On done: analysis + warnings → report UI + localStorage
Optional: POST /api/analyze/cancel  { jobId }
```

- Disconnect/refresh does **not** cancel provider work.
- Only **Cancel** (or process death / job expiry) stops the job.
- Job store: in-process `globalThis` + disk under `.breakitfirst-jobs/` (gitignored). Survives HMR better than memory alone; **not** multi-instance safe (use Redis later).

### AI pipeline (inside job)

```
Pass 1 (+ archetypes)  [Deep: Pass 1 ×2 parallel]
  → Pass 1.5 critique / calibration
  → Pass 2 JSON (+ 1 validation retry)
  → Zod + soft-checks
```

Pass 2 must not invent claims. Band enums English; free text follows locale.

### Rate limits (in-memory)

| Route | Limit |
|-------|--------|
| Analyze | 8 slots / 15 min (Deep cost = **2**); stricter after abuse strikes |
| Models | 40 / min |

`maxDuration` analyze routes: **300s**.

### Limits to know

- API keys: transient per request only on server.
- Rate limit + jobs: **single process** unless shared store is added.
- Report history: **browser only** (not server DB).

---

## 4. Themes

Navbar circle switcher → `localStorage`.

| ID | Swatch (approx) |
|----|-----------------|
| `ember` | coral (default) |
| `violet` | purple |
| `ocean` | sky |
| `forest` | emerald |
| `gold` | amber |

Themes drive CSS variables, GlowCard, PixelBlast, page background.

---

## 5. i18n

| Locale | UI | Report prose |
|--------|-----|--------------|
| `en` | English | English |
| `id` | Indonesian | Bahasa Indonesia |

Toggle → `localStorage` + analyze `locale`. Schema field names and band enums stay English.

```ts
const { locale, setLocale, t } = useLanguage();
```

---

## 6. Quality & eval

- Rubric / golden: `eval/` — see [eval/README.md](../eval/README.md).
- Official baseline note (historical): `docs/archive/in-progress.md` (mean **33.8**, run `230859`).
- Session smoke (no LLM): `npm run smoke:session`.

---

## 7. Deploy checklist

1. `npm run build` succeeds  
2. Host: Node runtime + long-running routes (Deep can exceed 60–120s)  
3. HTTPS for non-local providers  
4. Do not log API keys  
5. Revisit rate limits for public traffic  
6. Multi-instance: shared rate limit + job store (Redis) before horizontal scale  
7. Add `LICENSE` if open-sourcing  
