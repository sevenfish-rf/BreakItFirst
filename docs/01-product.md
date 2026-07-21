# 01 — Product

**What Would Break This?** — structured **premortem / failure analysis** for product and business ideas **before they are built**.

Setup / API / schema → [02-develop.md](./02-develop.md)

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

**USP (honest after quality-gap suite):** one-spine, idea-specific premortem — a structural hinge and cascade founders had not considered. **Not** “always sharper than strong chat,” **not** multi-pass marketing.

**Competitive bar:** strong free-form chat (e.g. Claude-class / GLM-class). Weak free-form chat is not the bar. Win when hinge is earlier/more structural than the risk founders already fear.

**Known product risk (dogfood + suite):** **false specificity** — analysis that looks idea-specific but is structurally generic. Engine rules now hunt camouflage and ban invent-then-attack (e.g. inventing RAG then attacking it).

**BYOK today:** owner/dev testing. Production direction: fixed mainstream provider(s) chosen by the product — not end-user key as the long-term model.

---

## 2. Inputs

| Input | Role |
|-------|------|
| **Idea (text)** | Raw material. More concrete → sharper output. |
| **Category** | Lens checklist — not a template substitute. |
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

**Jobs:** `POST /api/analyze` starts a **server job**; UI **polls** status. Refresh reconnects unless **Cancel**. Single-flight: one running job per browser session.

**Dev implication:** Pass 1 prompt bugs poison every section. Pass 2/schema bugs break shape/consistency. UI only displays.

---

## 4. Report blocks (the product)

```
Summary → Assumptions → SPOF → Cascade → Failure modes
                ↓
         Likelihood (this pathway)
         Velocity · Resilience (survive this path)
         Stress test · Deep calibration
```

If cascade ignores SPOF/assumptions, or modes are orphan laundry lists → report feels like a template.

### 4.1 Summary

| | |
|--|--|
| **Field** | `summary: string` |
| **Shape** | One paragraph restatement |

**Role:** Prove the model understood the idea before attacking it.

| Good | Bad |
|------|-----|
| User: “yes, that’s the idea” | Wrong market/model |
| Names unique mechanisms | Swappable across 100 startups |

### 4.2 Hidden assumptions

| | |
|--|--|
| **Field** | `assumptions: string[]` |
| **Count** | **5–10** (hard validation) |

Silent conditions the idea needs true. Prefer fragile, idea-specific claims.

**Link to SPOF (F1):** `single_point_of_failure.critical_assumption_indices` — optional 0-based indices into `assumptions[]`.

### 4.3 Single Point of Failure (SPOF)

| | |
|--|--|
| **Field** | `single_point_of_failure` |
| **Subfields** | `component` (~3–8 word **mechanism** label), `confidence`, `confidence_reason`, `explanation`, optional `critical_assumption_indices` |

**Emotional core:** the single most fragile hinge — not five equal risks.

**Selection discipline (engine prompts):**

1. Multiple SPOF candidates internally → rank → write **only the winner**.
2. **Dominance:** stronger hinge for *this* idea?
3. **Counterfactual:** if SPOF could not fail, would cascade still run? If yes → wrong SPOF.
4. **Genericity:** name-swappable → rewrite.

| Good | Bad |
|------|-----|
| Mechanism unique to this architecture/incentives | “Trust collapse” / “competition” alone |
| Explanation is causal | Moralizing / pep talk |

### 4.4 Failure cascade

| | |
|--|--|
| **Field** | `cascade.nodes: { step, observable_signal }[]` |
| **Count** | **7–12** (prefer 8–10) |
| **Optional** | `point_of_no_return_index` (F2) — descriptive, not advice |

- `step`: short, idea-specific middle steps (shuffle test).
- `observable_signal`: real-world **observation** — never “you should…”.

| Good | Bad |
|------|-----|
| Top→bottom reads as dominos | Steps reorderable without meaning change |
| Tied to SPOF/assumptions | Generic “retention drops” only |

### 4.5 Failure modes

| | |
|--|--|
| **Field** | `failure_modes.{ technical, business, security, legal, operations }` |
| **Optional** | `compounding_note` (F3) |

Domain buckets for the **same spine** — not a second risk list. Prefer empty domain over generic filler.

| Key | Typical focus |
|-----|----------------|
| technical | Architecture, scale, model quality, integrations |
| business | Market, pricing, CAC, chicken-egg, competition structure |
| security | Abuse, fraud, data leak, attack surface |
| legal | Regulation, liability, platform policy |
| operations | Delivery, support, burn, live-ops |

### 4.6 Likelihood (pathway)

| | |
|--|--|
| **Field** | `likelihood: { band, reason }` |
| **Band** | `Very Low` … `Very High` |

**Means:** chance **this causal pathway** materializes.  
**Not:** overall “startup fails” odds, success prediction, or a percentage.

| | SPOF confidence | Likelihood band |
|--|-----------------|-----------------|
| Asks | Right hinge? | Path materializes? |

### 4.7 Resilience score

| | |
|--|--|
| **Field** | `resilience_score` five ints 0–100 |
| **Means** | Absorb / survive **the chosen failure path** — not overall quality |

**Never** one overall score. Higher ≈ more resilient on that axis.

### 4.8 Stress test & velocity

| Block | Notes |
|-------|--------|
| `stress_test.items[]` | Archetype Yes/Maybe/No + reason; no overall danger score |
| `failure_velocity` | Fast/Medium/Slow + reason for **this path** |

### 4.9 Deep — SPOF calibration

`self_consistency?`: `runs`, `spof_agreement`, `reason`, `candidate_spofs[]`.

---

## 5. Qualitative bands

`Very Low | Low | Medium | High | Very High` + one-line reason. No false precision (%).  
Exception: resilience 0–100 ints (still not success probability).

---

## 6. Not product core

| Not core | Why |
|----------|-----|
| Multi-turn debate chat | One structured shot |
| Auto “how to fix” coaching | MVP exposes blind spots |
| Theme / effects | Packaging |
| “AI multi-pass” as USP | Value = sharpness |
| Server report DB | Client history max 10 |
| Redis multi-instance | Deferred |

---

## 7. Regression checklist

- [ ] Summary wrong but confident  
- [ ] Assumptions/SPOF name-swappable  
- [ ] Cascade not near SPOF / generic middle  
- [ ] Modes laundry list / contradict cascade  
- [ ] Likelihood as “startup fails overall” or %  
- [ ] Resilience collapsed to one score  
- [ ] Pass 2 invents claims  
- [ ] UI buries SPOF/cascade  

---

## 8. One-liner

**BreakItFirst** = structured premortem so founders see **how this unbuilt idea collapses** before reality does.

Index → [00-index.md](./00-index.md) · Develop → [02-develop.md](./02-develop.md)
