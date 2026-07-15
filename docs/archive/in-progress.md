# BreakItFirst — In Progress (dari masterplan)

**Sumber:** `docs/archive/masterplan.md`  
**Status:** Core complete + **post-baseline core polish** (prompts/soft-checks).  
**Official baseline:** `2026-07-16_043835` mean **33.4/34** (mimo-v2.5-pro).  
**Next measure:** re-run `eval:baseline` to compare delta (optional).

---

## Status fitur

| Area | Status |
|------|--------|
| B.1 Eval harness (kode) | ✅ |
| B.1 Baseline data | ⏳ owner BYOK |
| B.2 Pass 2 ketat | ✅ Zod, retry×1, soft-checks |
| C.1 Archetypes | ✅ |
| C.2 Pass 1.5 | ✅ default |
| C.3 Cascade signals | ✅ + UI |
| C.4 Stress test | ✅ + UI |
| C.5 Velocity | ✅ + UI |
| **C.6 Deep analysis** | ✅ **opt-in** checkbox; 2× Pass 1 + calibration field |
| Rate limit weighted | ✅ deep = cost 2 |
| Stage timing logs | ✅ `meta.stages` + console |
| Multi-instance Redis rate limit | ⏸ |
| Full public observability stack | ⏸ |

---

## Deep analysis (C.6) — cara pakai

- UI form: centang **Deep analysis** / **Analisis mendalam**
- API: `{ "deepAnalysis": true }`
- Eval: `BIF_DEEP=1 npm run eval:baseline`
- Report: panel **SPOF calibration** (`self_consistency`)

**Trade-off:** lebih lambat + lebih mahal; memakai 2 slot rate limit (8/15min → deep max ~4).

---

## Masih butuh kamu (bukan blocker app)

1. **Eval baseline + skor manual** — buktikan kualitas; tanpa ini tuning prompt = feeling.
2. Deploy multi-instance → ganti rate limit in-memory ke Redis (belum).

---

## Changelog

| Tanggal | Update |
|---------|--------|
| 2026-07-16 | B + C.1–C.5 |
| 2026-07-16 | **C.6 opt-in deep**, rate-limit cost, pipeline meta timing, UI toggle |
| 2026-07-16 | README/reference refresh, `scripts/eval-baseline.ps1`, report warnings + deep badge |
| 2026-07-16 | **Baseline official:** run `2026-07-16_043835`, mean 33.4/34, owner approved scores |
| 2026-07-16 | Core polish: cascade prefer 8–10, short SPOF label, stricter Pass2 claim guard + soft-checks |
