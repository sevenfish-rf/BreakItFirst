# Guide — BreakItFirst

## 1. Overview

Web app **failure analysis engine**: paste ide → laporan pre-mortem terstruktur (bukan brainstorming fitur).

| | |
|--|--|
| **Nama** | BreakItFirst |
| **Tagline** | What Would Break This? |
| **Posisi** | Engine analisis kegagalan; LLM = backend, bukan chat wrapper |

**Prinsip:** prediksi kegagalan + mekanisme kausal + SPOF. Tanpa saran fitur / pep talk. Output harus spesifik ke ide.

### Alur user

```
Landing → paste ide → kategori → set provider (BYOK)
  → Analyze → overlay progress → report
```

### Fitur

| Fitur | Keterangan |
|-------|------------|
| Pipeline AI | Pass 1 (+ archetypes) → Pass 1.5 critique → Pass 2 JSON |
| Deep analysis | Opt-in: 2× Pass 1 + calibration (C.6); 2 rate-limit slots |
| Report extras | Signals · stress test · velocity · SPOF calibration (deep) |
| Observability | Server logs stage timings on each analyze |
| Eval harness | `npm run eval:baseline` (local BYOK) — lihat `eval/README.md` |
| BYOK | Base URL + key + 2 model (localStorage) |
| Visual | Cascade (React Flow), radar (Recharts), mode cards |
| Theme | 5 circle: ember, violet, ocean, forest, gold |
| i18n | UI + isi report: **EN** / **ID** |
| BorderGlow | Card shell interaktif (React Bits) |
| Rate limit | Per IP + session (in-memory) |

**Out of scope (sementara):** auth, DB/history, share link/card, stages v1.1.

---

## 2. Setup & configuration

### Requirements

Node.js 20+ (disarankan 22.13+), npm.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start
npm run lint
```

### Env server

**Tidak wajib.** Key lewat BYOK di browser, bukan `.env` (kecuali nanti ditambah server key).

### Provider (wajib untuk analyze)

Navbar → **Provider**:

| Field | Contoh |
|-------|--------|
| Base URL | `https://api.openai.com/v1` |
| API key | `sk-...` (boleh kosong untuk Ollama) |
| Pass 1 model | reasoning model id |
| Pass 2 model | structuring model id |

Preset: OpenAI · OpenRouter · Ollama (`http://127.0.0.1:11434/v1`) · Custom.  
**Fetch models / Test connection** → `POST /api/models`.

### localStorage

| Key | Isi |
|-----|-----|
| `breakitfirst.provider` | BYOK settings |
| `breakitfirst.sessionId` | Rate limit session |
| `breakitfirst.locale` | `en` \| `id` |
| `breakitfirst.theme` | theme id |

### Tailwind

`src/app/globals.css` memakai Tailwind v4 + `@source` ke file TSX.  
Jika UI polos: hapus `.next`, restart dev, hard refresh.

### Keamanan base URL

Server cek SSRF (blok metadata cloud). HTTP hanya localhost/LAN.

---

## 3. Architecture

### Stack

Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · Framer Motion · React Flow · Recharts · three.js · BorderGlow

### Folder (ringkas)

```
src/
  app/           # page, layout, api/analyze, api/models
  components/    # shell, form, report, effects, ui, visuals
  lib/           # pipeline, provider, i18n, theme, rate-limit, schema
  types/         # FailureAnalysis schema
docs/            # dokumentasi
```

### Pipeline AI

```
Client (idea + category + locale + provider)
  → POST /api/analyze  (rate limit + validate)
  → Pass 1: freeform pre-mortem (bahasa = locale)
  → Pass 2: extract JSON schema MVP
  → validateFailureAnalysis
  → UI report
```

Pass 2 **tidak** menambah klaim baru. Enum band (`Low`…`Very High`) selalu English; prose bisa EN/ID.

### Batasan

- Key tidak disimpan di server (hanya transient per request).
- Rate limit in-memory (single process); multi-instance butuh store bersama.
- Tanpa DB (share/history ditunda).

---

## 4. Themes

Switcher: **circle** di navbar.

| ID | Swatch | Mesh (BorderGlow) |
|----|--------|-------------------|
| `ember` | `#FF6B6B` | coral · pink · sky (default) |
| `violet` | `#a78bfa` | purple · violet · pink |
| `ocean` | `#38bdf8` | sky · cyan · indigo |
| `forest` | `#34d399` | emerald · teal · lime |
| `gold` | `#fbbf24` | amber · orange · pink |

Tiap theme mengatur: `glowColor`, `backgroundColor`, `colors[3]`, accent UI, PixelBlast, page background.  
Apply lewat CSS variables di `<html>` + re-render GlowCard / PixelBlast.

---

## 5. i18n

| Locale | UI | Report AI |
|--------|-----|-----------|
| `en` | English | English |
| `id` | Indonesia | **Bahasa Indonesia** |

Toggle navbar → `localStorage`. Request analyze mengirim `locale`.  
Field schema & band enum tetap English; teks bebas mengikuti locale.

```ts
const { locale, setLocale, t } = useLanguage();
```
