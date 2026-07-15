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

It runs a disciplined pre-mortem:

- What’s fragile?
- What breaks first?
- What does that cause next?
- Where is the single point of failure?

A good run should make you think: *“I hadn’t even considered that.”*  
Not: *“That’s a nice feature idea.”*

---

## Features

| Area | What you get |
|------|----------------|
| **Two-pass AI pipeline** | Pass 1 freeform reasoning → Pass 2 schema extraction (MVP fields only) |
| **Structured report** | Summary, hidden assumptions, SPOF, failure cascade, failure modes, likelihood, resilience radar |
| **Visuals** | Interactive cascade graph (React Flow), multi-dimension radar (Recharts) |
| **Bring your own key** | OpenAI-compatible providers (OpenAI, OpenRouter, Ollama, custom) — key stays in the browser |
| **Themes** | Five color themes (Ember, Violet, Ocean, Forest, Gold) with BorderGlow cards |
| **i18n** | English & Indonesian UI **and** report prose |
| **Safety** | Input validation, rate limiting, SSRF checks on provider base URLs |

### Report core (product heart)

1. **Summary** — restatement of the idea  
2. **Hidden assumptions** — 5–10 silent dependencies  
3. **Single point of failure** — most fragile component + confidence + mechanism  
4. **Failure cascade** — 7–12 ordered causal steps (graph)  
5. **Failure modes** — technical · business · security · legal · operations  
6. **Likelihood** — qualitative band + reason  
7. **Resilience scores** — 0–100 per dimension (never collapsed to one vanity number)  

Deep definitions for each block: [`docs/project-overview.md`](./docs/project-overview.md)

---

## Quick start

```bash
git clone https://github.com/sevenfish-rf/BreakItFirst.git
cd BreakItFirst
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. Click **Provider** — set base URL, API key (optional for local Ollama), Pass 1 & Pass 2 model IDs  
2. Optionally **Fetch models** / **Test connection**  
3. Paste an idea, pick a category, choose language & theme  
4. **Analyze Failure**

No server-side API key is required. Credentials are stored only in `localStorage` and sent with each analysis request (not persisted on the server).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |

---

## Tech stack

| Layer | Choice |
|-------|--------|
| App | [Next.js](https://nextjs.org/) 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, custom theme tokens |
| Motion | Framer Motion |
| Graph / chart | React Flow, Recharts |
| Effects | PixelBlast (three.js), BorderGlow (React Bits–style) |
| AI | OpenAI-compatible Chat Completions API (BYOK) |

---

## Project structure

```
src/
  app/                 # App Router, API routes, global styles
  components/          # Shell, form, report, UI, visuals, effects
  lib/                 # Pipeline, prompts, provider client, i18n, themes, rate limit
  types/               # FailureAnalysis schema
docs/                  # Product & technical documentation
```

---

## Documentation

| Document | Contents |
|----------|----------|
| [docs/project-overview.md](./docs/project-overview.md) | **Product core** — every report section explained in depth |
| [docs/guide.md](./docs/guide.md) | Setup, architecture, themes, i18n |
| [docs/reference.md](./docs/reference.md) | API, schema, modules, components |
| [docs/README.md](./docs/README.md) | Docs index |

---

## Configuration notes

- **Provider presets:** OpenAI, OpenRouter, Ollama (`http://127.0.0.1:11434/v1`), custom  
- **Rate limits (in-memory):** analyze ~8 / 15 min per IP+session; models ~40 / min  
- **No database** in MVP — analysis is session-ephemeral unless the user copies it  
- **Privacy:** API keys are not written to a backend store; treat the app host as a proxy you control  

Full configuration details: [docs/guide.md](./docs/guide.md)

---

## Roadmap (high level)

- [x] MVP two-pass pipeline + structured report + visuals  
- [x] BYOK, rate limiting, themes, EN/ID  
- [ ] Optional share / history (needs storage)  
- [ ] v1.1 stages (early warning, stress test, timeline)  
- [ ] Export (e.g. PDF) and specialized modes  

---

## Contributing

Issues and pull requests are welcome.

1. Fork the repo and create a feature branch  
2. Keep changes focused; match existing TypeScript and UI patterns  
3. Run `npm run lint` and `npm run build` before opening a PR  
4. For product semantics (SPOF, cascade, scores), read [docs/project-overview.md](./docs/project-overview.md) first  

---

## License

No license file is committed yet. **All rights reserved** by the repository owner unless a `LICENSE` is added.

If you intend open-source reuse, add an explicit license (e.g. MIT) to the repo root.

---

## Acknowledgments

- Design cues from modern dark product UIs (Linear / Vercel–style density and contrast)  
- Visual building blocks inspired by [React Bits](https://reactbits.dev/)-style effects (BorderGlow, PixelBlast)  
- Product framing: structured failure analysis over generic chat  

---

<p align="center">
  <strong>Build less. Break less.</strong><br />
  <sub>BreakItFirst · What Would Break This?</sub>
</p>
