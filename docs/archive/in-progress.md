# BreakItFirst — In Progress (dari masterplan)

**Sumber:** `docs/archive/masterplan.md`  
**Status:** Sharpness pass **shipped** (prompts + soft-checks).  
**Official baseline (measure against):** `2026-07-16_051625` mean **33.8/34**.  
**Not yet re-scored** after this sharpness pass — run `eval:baseline` to measure delta.

---

## Status fitur

| Area | Status |
|------|--------|
| B.1 Eval harness (kode) | OK |
| B.1 Baseline data | **current 051625 (33.8)** · hist 043835 (33.4) |
| B.2 Pass 2 ketat | Zod, retry×1, soft-checks |
| C.1 Archetypes | OK |
| C.2 Pass 1.5 | default on |
| C.3 Cascade signals | + UI |
| C.4 Stress test | + UI |
| C.5 Velocity | + UI |
| C.6 Deep analysis | opt-in checkbox; 2× Pass 1 + calibration |
| Rate limit weighted | deep = cost 2 |
| Stage timing logs | `meta.stages` + console |
| Multi-instance Redis rate limit | deferred |
| Full public observability stack | deferred |

---

## Deep analysis (C.6)

- UI form: Deep analysis / Analisis mendalam  
- API: `{ "deepAnalysis": true }`  
- Eval: `BIF_DEEP=1 npm run eval:baseline`  
- Report: SPOF calibration (`self_consistency`)  

Trade-off: slower, more expensive; uses 2 rate-limit slots.

---

## Optional next (not blocking)

1. Further core prompt tuning vs locked 33.8 baseline  
2. Redis rate limit for multi-instance deploy  
3. UI polish (deferred by owner)

---

## Changelog

| Tanggal | Update |
|---------|--------|
| 2026-07-16 | B + C.1–C.5 |
| 2026-07-16 | C.6 opt-in deep, rate-limit cost, pipeline meta, UI toggle |
| 2026-07-16 | README/reference, eval-baseline.ps1, report warnings + deep badge |
| 2026-07-16 | Baseline 043835 mean 33.4 owner approved |
| 2026-07-16 | Core polish: cascade 8–10, short SPOF, claim guard |
| 2026-07-16 | Re-eval 051625 mean 33.8; **owner locked as current official baseline** |
| 2026-07-16 | **Sharpness pass:** mechanistic SPOF, negative examples, velocity claim-guard, soft `spof_label_mechanistic` |
