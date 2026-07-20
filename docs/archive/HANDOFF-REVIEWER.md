# Handoff — Reviewer Agent (READ-ONLY → tulis MD arahan)

**Peran agent ini:** reviewer / strategist quality core.  
**Bukan** implementer. **Jangan edit** `src/`, `eval/` scores, atau pipeline.

**Output wajib:** satu file Markdown arahan (lihat template di bawah).  
**Setelah file itu ada:** owner serahkan ke implementer (Grok / agent lain) untuk ubah `prompts.ts` (+ kalau perlu `archetypes` / soft-check), **bukan** UI.

---

## Prompt untuk reviewer (copy-paste)

```markdown
# Role
You are a **read-only quality reviewer** for BreakItFirst, a failure-analysis engine
(not a chatbot or business coach). You do **not** edit application code.

# Your only deliverable
Write **one new Markdown file** with concrete directions for improving analysis
sharpness. Path:

  docs/archive/directives/DIRECTIVES-YYYY-MM-DD.md

(Use today's date. Create the `directives/` folder if missing.)

Do **not**:
- Modify `src/**`, `package.json`, or baseline scores
- Implement prompts yourself
- Propose UI/theme work unless it blocks core quality (it almost never does)
- Invent eval scores without reading actual raw outputs

# Product north star
Question: "How would this idea most likely fail?"
Invariants: specificity > generic advice; causal mechanisms; no pep talk;
no single overall danger score; cascade is linear; Deep analysis stays opt-in.

# Official baseline (measure against later — you only recommend)
- Run: `eval/baselines/2026-07-16_051625`
- Mean quality score: **33.8 / 34** (owner-locked)
- Historical: `2026-07-16_043835` mean 33.4
- Latest code may include a "sharpness pass" **not yet re-scored** — note that

# What to read (in order)
1. docs/archive/masterplan.md — A (philosophy), C/D (mechanisms), E (done)
2. docs/archive/in-progress.md — current status
3. docs/product.md — product identity + report block quality bar
4. src/lib/prompts.ts — Pass 1 / 1.5 / 2 (main lever)
5. src/lib/pipeline.ts — stage order only (don't redesign unless necessary)
6. src/lib/archetypes.ts — knowledge layer
7. src/lib/schema.ts — soft-checks / claim-guard (secondary)
8. eval/rubric.md
9. eval/baselines/2026-07-16_051625/SCORE_SUMMARY.md
10. At least two raw reports:
    - eval/baselines/2026-07-16_051625/raw/04-saas-team-wiki.json
    - eval/baselines/2026-07-16_051625/raw/05-hardware-fitness-ring.json
    Optionally also 01 and 03 if you need more signal.

# Analysis goals
Find the **highest-leverage prompt (or small pipeline) changes** so that:
- SPOF labels stay short **and** name a concrete mechanism (not "trust collapse")
- Cascades stay 8–10 causal steps with observational signals (not advice)
- Pass 2 does not invent numbers in likelihood / velocity
- "Looks solid" ideas get attacked on their differentiator
- Outputs feel more "I hadn't thought of that" vs name-swappable startup advice

# Output file structure (required sections)
Use this exact outline in DIRECTIVES-YYYY-MM-DD.md:

## 1. Executive summary
- 3–6 bullets: what's already strong vs what's still weak

## 2. Evidence from baseline raw
- Cite fixture ids and quote short snippets (SPOF label, cascade length, warnings)
- Map each weakness → which stage (Pass1 / 1.5 / Pass2)

## 3. Prioritized directives (max 5)
For each directive:
- **ID:** D1, D2, …
- **Priority:** P0 / P1 / P2
- **Hypothesis:** one sentence
- **Target file(s):** almost always `src/lib/prompts.ts` (be specific: PASS1 / PASS1_5 / PASS2)
- **Change type:** add rule / rewrite paragraph / add negative example / soft-check only
- **Concrete instruction for implementer:** what to write or change (enough detail to implement without guessing)
- **Do not change:** anything out of scope
- **How to verify:** e.g. re-eval full set vs 33.8, or BIF_ONLY=04-saas-team-wiki
- **Risk:** token cost, latency, over-constraint, regression

## 4. Explicit non-goals
- List what implementer must ignore this round

## 5. Suggested implementer order
- Ordered checklist (D? then D? …)

## 6. Open questions for owner (optional, max 3)
- Only if a product decision is truly required

# Tone of the directives file
- Actionable, specific, concise
- Indonesian or English OK (owner is Indonesian-speaking; English technical terms fine)
- No code dumps of entire prompts unless a short snippet is essential
- Prefer "add this rule: …" over vague "make it better"

# Done when
The directives MD exists, is self-contained, and an implementer can apply it
to prompts without asking what you meant.
```

---

## File yang owner sertakan ke reviewer

### Wajib

| Path |
|------|
| `docs/archive/HANDOFF-REVIEWER.md` (file ini) |
| `docs/archive/masterplan.md` |
| `docs/archive/in-progress.md` |
| `docs/product.md` |
| `src/lib/prompts.ts` |
| `src/lib/pipeline.ts` |
| `src/lib/archetypes.ts` |
| `src/lib/schema.ts` |
| `eval/rubric.md` |
| `eval/baselines/2026-07-16_051625/SCORE_SUMMARY.md` |
| `eval/baselines/2026-07-16_051625/raw/04-saas-team-wiki.json` |
| `eval/baselines/2026-07-16_051625/raw/05-hardware-fitness-ring.json` |

### Opsional

| Path |
|------|
| `eval/baselines/2026-07-16_051625/raw/01-marketplace-pet-sitting.json` |
| `eval/baselines/2026-07-16_051625/raw/03-ai-therapy-chat.json` |
| `eval/golden/*.json` (ide input) |
| `src/types/analysis.ts` |

### Jangan sertakan

- API keys  
- Seluruh `node_modules` / `.next`  
- UI components (kecuali reviewer memaksa — default tidak)  
- Semua raw 5 file kalau context sempit — 2 raw cukup  

---

## Alur kerja (kamu)

```
1. Kasih HANDOFF-REVIEWER.md + file wajib ke agent reviewer
2. Agent tulis: docs/archive/directives/DIRECTIVES-YYYY-MM-DD.md
3. Kamu review isi arahan (setuju / coret)
4. Serahkan file DIRECTIVES-* ke implementer (Grok):
   "Kerjakan arahan di docs/archive/directives/DIRECTIVES-….md
    — hanya prompts/core, no UI, ukur vs 33.8 kalau bisa"
5. Implementer edit prompts → smoke assert → (opsional) eval:baseline
```

---

## Template kosong (reviewer boleh copy ke file output)

```markdown
# Directives — BreakItFirst core sharpness
**Date:** YYYY-MM-DD  
**Author:** reviewer agent (read-only)  
**Baseline reference:** 2026-07-16_051625 (mean 33.8)  
**Status:** READY FOR IMPLEMENTER — do not treat as applied until coded

## 1. Executive summary
- …

## 2. Evidence from baseline raw
### 04-saas-team-wiki
- …
### 05-hardware-fitness-ring
- …

## 3. Prioritized directives
### D1 — …
- Priority:
- Hypothesis:
- Target file(s):
- Change type:
- Concrete instruction for implementer:
- Do not change:
- How to verify:
- Risk:

### D2 — …
…

## 4. Explicit non-goals
- …

## 5. Suggested implementer order
1. …
2. …

## 6. Open questions for owner
- …
```

---

## Catatan untuk implementer (Grok) nanti

Saat file `DIRECTIVES-*.md` sudah ada dan owner bilang gas:

1. Baca directives end-to-end  
2. Implement **hanya** D-priority sesuai order (biasanya `prompts.ts`)  
3. Jangan UI  
4. `npm run eval:assert-sample` + `tsc`  
5. Minta owner re-eval vs **33.8** bila mau claim improvement  
6. Update `docs/archive/in-progress.md` + live `docs/product.md` / `reference.md` if semantics change  


**Jangan** mulai implement sebelum file DIRECTIVES dari reviewer ada.
