# BreakItFirst — In Progress (dari masterplan)

**Sumber:** `docs/archive/masterplan.md`  
**Status:** **Official baseline** `230859` mean **33.8**.  
**Shipped (unmeasured vs 33.8):** F1 critical assumptions · F2 point-of-no-return · F3 compounding note (Pass 2 + soft-check + minimal UI).

---

## Status fitur

| Area | Status |
|------|--------|
| B.1 Eval harness | OK |
| B.1 Baseline data | **current 230859 (33.8)** |
| B.2 Pass 2 ketat | Zod, retry×1, soft-checks (14+ soft gates, F1–F3) |
| C.1–C.6 | shipped (Deep opt-in) |
| DIRECTIVES-2026-07-16 | applied + re-measured |
| Redis / full observability | deferred |
| UI polish | deferred by owner |

---

## Optional next

1. Further core tuning only if real-user pain (mean already at ceiling)  
2. Deploy / multi-instance rate limit  
3. UI polish  

---

## Changelog

| Tanggal | Update |
|---------|--------|
| 2026-07-16 | Core B+C, eval, polish, sharpness, DIRECTIVES D1–D5 |
| 2026-07-16 | Re-eval `230859` mean 33.8; **owner locked as current official baseline** |
| 2026-07-17 | **F1+F2+F3** Pass2 fields: critical_assumption_indices, point_of_no_return_index, compounding_note + UI |
