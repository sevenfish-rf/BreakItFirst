# Product — BreakItFirst

**What Would Break This?** — structured **premortem / failure analysis** for product and business ideas **before they are built**.

Technical setup → [guide.md](./guide.md) · API/schema → [reference.md](./reference.md)

---

## 1. Identity (what we are / are not)

| We are | We are not |
|--------|------------|
| Premortem engine for **unbuilt ideas** | Security **AI red teaming** (attack a live platform / mitigate attackers) |
| One dominant **failure argument** (SPOF + causal cascade) | Startup coach / “how to win” advisor |
| Idea-specific mechanisms | Generic risk checklists / chat dump |
| Judgment on **this failure pathway** | Numeric prediction of “will the company succeed?” |

**Single product question**

> How does this idea most plausibly fail — specifically, causally, and in a structured way?

**Success reaction:** *“I never considered that failure path.”*  
**Failure reaction:** *“Generic startup advice with nice formatting.”*

**Working product risk (dogfood / strategy):** multi-pass is not a moat if the quality gap vs a good free ChatGPT prompt is too thin to justify cost. USP must be **felt sharpness**, not “we run 3 LLM passes.”

**BYOK today:** owner/dev testing. Production direction: fixed mainstream provider(s) chosen by the product — not end-user key as the long-term model.

---

## 2. Inputs

| Input | Role |
|-------|------|
| **Idea (text)** | Raw material. More concrete (users, money model, constraints, tech) → sharper output. |
| **Category** | Lens checklist (churn, chicken-egg, App Store, hallucination, …) — not a template substitute. |
| **Locale** | Report prose `en` / `id`. Band enums stay English. |
| **Provider + models** | Dev: BYOK OpenAI-compatible. Pass 1 quality drives the whole report. |
| **Deep analysis (opt-in)** | 2× Pass 1 + SPOF calibration; costs **2** rate-limit slots. |

---

## 3. How analysis is produced

```
Idea + category + locale + provider
        │
        ▼
PASS 1 — Reasoning (prose; not shown raw to user)
  Multi-hypothesis SPOF selection (internal) → rank → one winner
  Dominance + counterfactual self-checks; genericity / sharpness rules
  Archetype knowledge as optional lenses
        │
        ▼
PASS 1.5 — Adversarial critique (prose revision)
  Deep: calibrate across two Pass 1 drafts
        │
        ▼
PASS 2 — Lossless compress to JSON schema (no new claims)
        │
        ▼
Zod validate + soft-checks (warnings) → UI report
```

**Jobs (session resilience):** `POST /api/analyze` starts a **server job**; UI **polls** status. Refresh reconnects to the same job unless the user **Cancel**s. Single-flight: one running job per browser session.

**Dev implication:** Pass 1 prompt bugs poison every section. Pass 2/schema bugs break shape/consistency. UI only displays.

---

## 4. Report blocks (the product)

Ideal spine:

```
Summary → Assumptions → SPOF → Cascade → Failure modes
                ↓
         Likelihood (this pathway)
         Velocity · Resilience (survive this path)
         Stress test (archetypes) · Deep calibration
```

If cascade ignores SPOF/assumptions, or modes are orphan laundry lists → report feels like a template.

### 4.1 Summary

| | |
|--|--|
| **Field** | `summary: string` |
| **Shape** | One paragraph restatement in the model’s words |

**Role:** Prove the model understood the idea before attacking it. Not marketing, not a feature list, not long critique.

| Good | Bad |
|------|-----|
| User: “yes, that’s the idea” | Wrong market/model |
| Names unique mechanisms | Swappable across 100 startups |

### 4.2 Hidden assumptions

| | |
|--|--|
| **Field** | `assumptions: string[]` |
| **Count** | **5–10** (hard validation) |

Silent conditions the idea needs to be true. Prefer fragile, idea-specific claims — not “needs users.”

**Link to SPOF (F1):** `single_point_of_failure.critical_assumption_indices` — optional 0-based indices into `assumptions[]` that the SPOF most depends on. UI highlights these.

### 4.3 Single Point of Failure (SPOF)

| | |
|--|--|
| **Field** | `single_point_of_failure` |
| **Subfields** | `component` (short **mechanism** label, ~3–8 words), `confidence`, `confidence_reason`, `explanation`, optional `critical_assumption_indices` |

**Emotional core of the product:** the single most fragile hinge — not five equal risks.

**Selection discipline (engine prompts):**

1. Internally consider multiple SPOF candidates → rank → write **only the winner**.
2. **Dominance:** is there a stronger hinge for *this* idea?
3. **Counterfactual:** if this SPOF mechanism could not fail, would the cascade still run? If yes → wrong SPOF.
4. **Genericity:** name-swappable paragraph → rewrite.

| Good | Bad |
|------|-----|
| Mechanism unique to this architecture/incentives | “Trust collapse” / “competition” alone |
| Explanation is causal | Moralizing / pep talk |

### 4.4 Failure cascade

| | |
|--|--|
| **Field** | `cascade.nodes: { step, observable_signal }[]` |
| **Count** | **7–12** (prefer 8–10); hard validation |
| **Optional** | `point_of_no_return_index` (F2) — step that becomes hard to reverse (descriptive, not advice) |

**Role:** Causal spine from near-SPOF to end state. One chain, not a separate dependency graph.

- Each `step`: short (~max 8 words), idea-specific middle steps (shuffle test).
- Each `observable_signal`: real-world **observation** if the step is happening — never “you should…”.

| Good | Bad |
|------|-----|
| Top→bottom reads as dominos | Steps reorderable without meaning change |
| Tied to SPOF/assumptions | Generic “retention drops” only |

### 4.5 Failure modes

| | |
|--|--|
| **Field** | `failure_modes.{ technical, business, security, legal, operations }` |
| **Optional** | `compounding_note` (F3) — two domains share one root trigger |

**Role:** Domain buckets for consequences of the **same spine** — not a second independent risk list. Prefer empty domain over generic filler. Soft-check prefers modes that track SPOF/cascade tokens.

| Key | Typical focus |
|-----|----------------|
| technical | Architecture, scale, model quality, integrations |
| business | Market, pricing, CAC, chicken-egg, competition structure |
| security | Abuse, fraud, data leak, attack surface |
| legal | Regulation, liability, platform policy |
| operations | Delivery, support, burn, live-ops, supply chain ops |

### 4.6 Likelihood (pathway)

| | |
|--|--|
| **Field** | `likelihood: { band, reason }` |
| **Band** | `Very Low` … `Very High` |

**Means:** chance **this causal pathway** (SPOF → cascade) materializes.  
**Does not mean:** overall odds “the startup fails for any reason,” success prediction, or a percentage.

UI label: pathway likelihood (EN/ID). Always band + reason; never convert to %.

**vs SPOF confidence**

| | SPOF confidence | Likelihood band |
|--|-----------------|-----------------|
| Asks | How sure is *this* the right hinge? | How likely does *this path* play out? |
| Can diverge | High on hinge identity | Medium if timing/world may delay |

### 4.7 Resilience score

| | |
|--|--|
| **Field** | `resilience_score: { technical, business, legal, operations, trust }` |
| **Type** | Integer **0–100** per dimension |

**Means:** ability to **absorb / survive the chosen failure path** (redundancy, buffers, recovery) — not overall product quality or success odds.  
**Never** collapse to one overall score in the product.

Higher ≈ more resilient on that axis; lower ≈ more fragile. Soft-checks flag flat profiles and mismatch with SPOF confidence.

### 4.8 Stress test & failure velocity

| Block | Field | Notes |
|-------|--------|--------|
| Stress test | `stress_test.items[]` | Per archetype: `archetype_id`, `Yes`/`Maybe`/`No`, `reason`. No overall danger score. Avoid all-Yes / all-Maybe. |
| Velocity | `failure_velocity` | `Fast`/`Medium`/`Slow` + reason — how quickly **this path** tends to unfold. |

Archetype ids: see `src/lib/archetypes.ts`.

### 4.9 Deep only — SPOF calibration

| | |
|--|--|
| **Field** | `self_consistency?` |
| **When** | Deep analysis |

`runs`, `spof_agreement` (High/Medium/Low), `reason`, `candidate_spofs[]`.

---

## 5. Qualitative bands

Most confidence/likelihood fields use:

`Very Low | Low | Medium | High | Very High`

Always with a **one-line reason** — product rejects false precision (“73% chance of failure”).  
Exception: resilience integers 0–100 (still not a probability of success).

---

## 6. Not product core (packaging / deferred)

| Not core | Why |
|----------|-----|
| Multi-turn debate chat | One structured analysis shot |
| Auto “how to fix” coaching | Expose blind spots, not coach (MVP) |
| Theme / BorderGlow / PixelBlast | Packaging |
| “AI multi-pass” as USP | Process is internal; value is sharpness |
| Server-side report DB | Client localStorage history only (max 10) |
| Redis multi-instance jobs | Deferred; single-process job + rate limit today |

---

## 7. Outcomes & regression checklist

**Good run:** summary fits; assumptions sting; SPOF is a mechanism; cascade retellable in 30s; modes map the spine; likelihood/velocity/resilience grounded in that path.

**Regression if:**

- [ ] Summary wrong but report sounds confident  
- [ ] Assumptions/SPOF name-swappable  
- [ ] Cascade not near SPOF / no end state / middle steps generic  
- [ ] Modes contradict cascade or pure laundry list  
- [ ] Likelihood framed as “startup fails overall” or shown as %  
- [ ] Resilience collapsed to one vanity score  
- [ ] Pass 2 invents claims not in prose  
- [ ] UI buries SPOF/cascade under “chat AI” feel  

---

## 8. One-liner

**BreakItFirst** produces a **structured premortem** — Summary → Assumptions → one SPOF → causal cascade → domain modes → pathway likelihood & path-resilience — so founders see **how this unbuilt idea collapses** before reality does.

---

## 9. Related docs

| Doc | Role |
|-----|------|
| [guide.md](./guide.md) | Setup, architecture, session UX |
| [reference.md](./reference.md) | API, schema, modules |
| [archive/](./archive/) | Masterplan, directives, baselines notes (historical) |
| [eval/README.md](../eval/README.md) | Quality harness |
