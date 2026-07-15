# BreakItFirst

### *What Would Break This?*

**A structured failure-analysis engine for product and business ideas.**  
Paste an idea. Get a causal pre-mortem — not feature brainstorming, not a chat wrapper.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-See_repo-lightgrey)](#license)

**Repository:** [github.com/sevenfish-rf/BreakItFirst](https://github.com/sevenfish-rf/BreakItFirst)

---

## Why this exists

Most AI tools help you **build**. BreakItFirst helps you see **why something might not survive contact with reality**.

A good run should make you think: *“I hadn’t even considered that.”*  
Not: *“That’s a nice feature idea.”*

---

## Features

| Area | What you get |
|------|----------------|
| **Multi-stage AI pipeline** | Pass 1 reasoning → Pass 1.5 adversarial critique → Pass 2 JSON schema |
| **Archetype knowledge layer** | Static failure patterns (cold-start, unit economics, trust, …) as optional lenses |
| **Structured report** | Core 7 blocks + cascade signals + stress test + velocity |
| **Deep analysis (opt-in)** | 2× Pass 1 + SPOF calibration (agreement High/Medium/Low) |
| **Visuals** | Cascade graph (React Flow), resilience radar (Recharts) |
| **BYOK** | OpenAI-compatible providers — key stays in the browser |
| **Themes & i18n** | 5 themes; EN / ID UI **and** report prose |
| **Eval harness** | Golden set + rubric + local baseline runner (`eval/`) |
| **Safety** | Input validation, weighted rate limits, SSRF checks on base URLs |

### Report sections

1. **Summary** — restatement of the idea  
2. **Hidden assumptions** — 5–10 silent dependencies  
3. **SPOF** — most fragile hinge + confidence + mechanism  
4. **Failure cascade** — 7–12 causal steps, each with an **observable signal**  
5. **Failure modes** — technical · business · security · legal · operations  
6. **Likelihood** — qualitative band + reason  
7. **Resilience** — 0–100 per dimension (never one vanity score)  
8. **Stress test** — Yes / Maybe / No per failure archetype  
9. **Failure velocity** — Fast / Medium / Slow + reason  
10. **SPOF calibration** — Deep mode only  

Details: [`docs/project-overview.md`](./docs/project-overview.md)

---

## Quick start

```bash
git clone https://github.com/sevenfish-rf/BreakItFirst.git
cd BreakItFirst
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. **Provider** — base URL, API key, Pass 1 & Pass 2 model IDs  
2. Paste idea → category → language / theme  
3. Optional: enable **Deep analysis**  
4. **Analyze Failure**

No server-side API key is required for the web UI. Credentials live in `localStorage` and are sent only with analyze requests (not stored server-side).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production |
| `npm run lint` | ESLint |
| `npm run eval:assert-sample` | Smoke-test assertions (no API key) |
| `npm run eval:baseline` | Run golden set via local BYOK env vars |

---

## Eval harness (quality baseline)

Before claiming “the model got smarter,” measure it.

```powershell
# PowerShell
$env:BIF_BASE_URL="https://api.openai.com/v1"
$env:BIF_API_KEY="sk-..."
$env:BIF_PASS1_MODEL="gpt-4o"
$env:BIF_PASS2_MODEL="gpt-4o-mini"
npm run eval:baseline
```

Or: `.\scripts\eval-baseline.ps1` (prompts for missing vars).

Outputs → `eval/baselines/<timestamp>/`. Score with `eval/rubric.md` (max 34 pts).  
Guide: [`eval/README.md`](./eval/README.md)

---

## Tech stack

| Layer | Choice |
|-------|--------|
| App | Next.js 16 (App Router), React 19, TypeScript |
| Validation | Zod |
| Styling | Tailwind CSS v4 |
| Motion / graph / chart | Framer Motion, React Flow, Recharts |
| AI | OpenAI-compatible Chat Completions (BYOK) |

```
src/app/           API routes + pages
src/components/    UI, report, visuals
src/lib/           pipeline, prompts, archetypes, schema, rate limit
eval/              golden fixtures, rubric, baseline runner
docs/              product + technical docs
```

---

## Documentation

| Document | Contents |
|----------|----------|
| [docs/project-overview.md](./docs/project-overview.md) | Product core — every report section |
| [docs/guide.md](./docs/guide.md) | Setup, architecture, themes, i18n |
| [docs/reference.md](./docs/reference.md) | API & schema reference |
| [docs/archive/masterplan.md](./docs/archive/masterplan.md) | Core development master plan |
| [eval/README.md](./eval/README.md) | Eval harness |

---

## Configuration notes

- **Presets:** OpenAI, OpenRouter, Ollama (`http://127.0.0.1:11434/v1`), custom  
- **Rate limits (in-memory):** 8 analyze slots / 15 min (Deep costs **2** slots); models 40 / min  
- **API `maxDuration`:** 300s (Deep needs longer)  
- **No database** in MVP — reports are ephemeral unless the user copies them  
- **Multi-instance deploy:** swap in-memory rate limit for Redis before horizontal scale  

---

## Deploy (checklist)

1. `npm run build` succeeds  
2. Host supports Node runtime + long server actions/routes (Deep can exceed 60–120s)  
3. HTTPS only for non-local providers  
4. Do not log API keys; stage timing logs are OK  
5. Revisit rate limits for public traffic  
6. Add a `LICENSE` if you open-source  

---

## Roadmap

- [x] MVP pipeline + structured report + visuals  
- [x] BYOK, rate limiting, themes, EN/ID  
- [x] Eval harness + Pass 2 hardening (Zod, retry)  
- [x] Archetypes, critique pass, signals, stress test, velocity  
- [x] Deep analysis (self-consistency) opt-in  
- [ ] Baseline scores filled + prompt iteration from data  
- [ ] Redis rate limit / multi-instance  
- [ ] Export (PDF) / history (needs storage)  

---

## Contributing

1. Fork and branch  
2. Match existing TypeScript / UI patterns  
3. `npm run lint` && `npm run build` (and `npm run eval:assert-sample` if you touch schema)  
4. Read [docs/project-overview.md](./docs/project-overview.md) for product semantics  

---

## License

No license file is committed yet. **All rights reserved** unless a `LICENSE` is added.

---

<p align="center">
  <strong>Build less. Break less.</strong><br />
  <sub>BreakItFirst · What Would Break This?</sub>
</p>
