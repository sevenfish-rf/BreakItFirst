# BreakItFirst

### *What Would Break This?*

**A structured premortem engine for product and business ideas — before you build.**  
Paste an idea. Get one dominant failure argument (SPOF + causal cascade), not a chat dump and not “how to win” coaching.

> Not security AI red-teaming of a live platform. This is **failure analysis of unbuilt ideas**.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

**Repository:** [github.com/sevenfish-rf/BreakItFirst](https://github.com/sevenfish-rf/BreakItFirst)

---

## Why this exists

Most AI tools help you **build**. BreakItFirst helps you see **how an idea might collapse** before execution.

A good run: *“I never considered that failure path.”*  
A bad run: *“Generic startup advice with nice formatting.”*

---

## Features

| Area | What you get |
|------|----------------|
| **Multi-stage pipeline** | Pass 1 reasoning → Pass 1.5 critique → Pass 2 JSON |
| **Selection discipline** | Multi-hypothesis SPOF (prompt-internal), dominance + counterfactual checks |
| **Archetype lenses** | Cold-start, unit economics, trust, … (optional, not a template dump) |
| **Structured report** | SPOF, cascade + signals, modes, pathway likelihood, path-resilience, stress, velocity |
| **Deep analysis** | 2× Pass 1 + SPOF calibration |
| **Session resilience** | Server jobs + poll; refresh reconnects; cancel; single-flight |
| **Browser persistence** | Form draft, last report, history (max 10) |
| **Visuals** | Cascade graph, resilience radar |
| **BYOK (dev)** | OpenAI-compatible providers — for owner/testing; production may use a fixed provider |
| **Themes & i18n** | 5 themes; EN / ID UI and report prose |
| **Eval harness** | Golden set + rubric (`eval/`) |
| **Safety** | Input validation, rate limits, SSRF checks on base URLs |

### Report sections

1. Summary · 2. Hidden assumptions · 3. SPOF · 4. Cascade (+ signals, optional point of no return)  
5. Failure modes · 6. Pathway likelihood · 7. Resilience (5 dimensions)  
8. Stress test · 9. Failure velocity · 10. SPOF calibration (Deep)

Details: [`docs/product.md`](./docs/product.md)

---

## Quick start

```bash
git clone https://github.com/sevenfish-rf/BreakItFirst.git
cd BreakItFirst
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. **Provider** — base URL, API key, Pass 1 & Pass 2 model IDs (dev BYOK)  
2. Paste idea → category → language / theme  
3. Optional: **Deep analysis**  
4. **Analyze** — wait for stages; refresh is safe (same job)

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production |
| `npm run lint` | ESLint |
| `npm run smoke:session` | Jobs + history smoke (no API key) |
| `npm run eval:assert-sample` | Schema assertions (no API key) |
| `npm run eval:baseline` | Golden set via `BIF_*` env |

---

## Eval harness

```powershell
$env:BIF_BASE_URL="https://api.openai.com/v1"
$env:BIF_API_KEY="sk-..."
$env:BIF_PASS1_MODEL="gpt-4o"
$env:BIF_PASS2_MODEL="gpt-4o-mini"
npm run eval:baseline
```

Or: `.\scripts\eval-baseline.ps1`. Guide: [`eval/README.md`](./eval/README.md)

---

## Tech stack

| Layer | Choice |
|-------|--------|
| App | Next.js 16 (App Router), React 19, TypeScript |
| Validation | Zod |
| Styling | Tailwind CSS v4 |
| Motion / graph / chart | Framer Motion, React Flow, Recharts |
| AI | OpenAI-compatible Chat Completions (BYOK in UI today) |

```
src/app/           API routes + pages
src/components/    UI, report, visuals
src/lib/           pipeline, jobs, prompts, schema, rate limit
eval/              golden fixtures, rubric, baseline runner
docs/              product · guide · reference · archive/
```

---

## Documentation

| Document | Contents |
|----------|----------|
| [docs/product.md](./docs/product.md) | Product identity + every report section |
| [docs/guide.md](./docs/guide.md) | Setup, architecture, session UX |
| [docs/reference.md](./docs/reference.md) | API, schema, modules |
| [docs/archive/](./docs/archive/) | Masterplan, directives, status snapshots |
| [eval/README.md](./eval/README.md) | Eval harness |

---

## Configuration notes

- **Presets:** OpenAI, OpenRouter, Ollama (`http://127.0.0.1:11434/v1`), custom  
- **Rate limits (in-memory):** 8 analyze slots / 15 min (Deep = **2** slots); models 40 / min  
- **API `maxDuration`:** 300s  
- **Jobs:** process memory + `.breakitfirst-jobs/` disk; not multi-instance  
- **Reports:** browser localStorage (not server DB)  
- **Horizontal scale:** shared Redis (or similar) for rate limit + jobs  

---

## Roadmap (honest)

- [x] MVP pipeline + structured report + visuals  
- [x] BYOK (dev), rate limiting, themes, EN/ID  
- [x] Eval harness + Pass 2 hardening  
- [x] Archetypes, critique, signals, stress, velocity, Deep  
- [x] Session jobs / poll / cancel / single-flight / client history  
- [x] Reasoning refine (selection + pathway semantics)  
- [ ] Re-baseline after latest prompt refine (optional)  
- [ ] Production fixed provider UX  
- [ ] Redis multi-instance  
- [ ] Export PDF / server-side history (if needed)  

---

## Contributing

1. Fork and branch  
2. Match existing TypeScript / UI patterns  
3. `npm run lint` && `npm run build` (and `smoke:session` / `eval:assert-sample` if you touch jobs or schema)  
4. Read [docs/product.md](./docs/product.md) for product semantics  

---

## License

No license file is committed yet. **All rights reserved** unless a `LICENSE` is added.

---

<p align="center">
  <strong>Build less. Break less.</strong><br />
  <sub>BreakItFirst · What Would Break This?</sub>
</p>
