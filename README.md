# BreakItFirst — What Would Break This?

Dark-mode **failure analysis** web app. Paste an idea → structured causal pre-mortem (not feature brainstorming).

## Docs

- **[docs/project-overview.md](./docs/project-overview.md)** — penjelasan proyek, fitur, hasil  
- **[docs/guide.md](./docs/guide.md)** — setup, arsitektur, theme, i18n  
- **[docs/reference.md](./docs/reference.md)** — API, schema, modules, komponen  
- **[docs/README.md](./docs/README.md)** — index docs

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. Set **Provider** (OpenAI-compatible base URL + models; key in localStorage only)  
2. Paste idea · pick category · optional theme / language  
3. **Analyze Failure**

## Stack (short)

Next.js 16 · React 19 · TypeScript · Tailwind v4 · Framer Motion · React Flow · Recharts · three.js · BorderGlow
