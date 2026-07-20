# Status snapshot (archive)

**Last updated:** 2026-07-20  
**Live docs:** `docs/product.md`, `guide.md`, `reference.md`

---

## Shipped (code)

| Area | Notes |
|------|--------|
| Pipeline Pass 1 → 1.5 → Pass 2 | + Deep 2× Pass 1 |
| Archetypes, signals, stress, velocity | C.1–C.5 |
| F1 / F2 / F3 | critical_assumption_indices, point_of_no_return_index, compounding_note |
| Sharpness + DIRECTIVES-2026-07-16 | Prompt + soft-checks |
| Reasoning refine (2026-07-20) | Multi-hyp, dominance, counterfactual, pathway likelihood, modes↔cascade (prompts + soft-checks; **not** full architecture rewrite) |
| Async jobs + poll + cancel + single-flight | Session resilience |
| Draft / report restore / history (localStorage) | Max 10 history |
| Eval harness | Official baseline **230859** mean **33.8** (2026-07-16) |

## Deferred

| Area | Notes |
|------|--------|
| Redis / multi-instance jobs + rate limit | Single-process + `.breakitfirst-jobs` disk today |
| Server DB / share links | Client-only history |
| Production fixed provider (non-BYOK UX) | BYOK remains owner/dev path |
| Full re-baseline after 2026-07-20 prompt refine | Optional / expensive |

## Identity note

BreakItFirst = **premortem for unbuilt ideas**, not security AI red-teaming of a live platform. See `docs/product.md` §1.

## Changelog (high level)

| Date | Update |
|------|--------|
| 2026-07-16 | Core B+C, eval, sharpness, DIRECTIVES D1–D5; baseline 33.8 locked |
| 2026-07-17 | F1+F2+F3 fields + UI |
| 2026-07-20 | Session resilience (jobs/poll/cancel/single-flight/history); reasoning refine P0+P1; docs reorg |
