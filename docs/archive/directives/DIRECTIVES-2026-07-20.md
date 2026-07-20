# BreakItFirst Engine Architecture vNext
**Status:** Design notes — **partially applied 2026-07-20** as prompt/soft-check *refine* (multi-hyp, dominance, counterfactual, pathway likelihood, modes↔cascade). Full multi-call hypothesis engine + formal causal-graph schema **not** implemented (by design).
**Audience:** Programmer / AI Engineer
**Purpose:** Refine Pass 1 reasoning architecture without changing the external product.

---

# Core Identity

BreakItFirst is **not** a risk analysis tool.

BreakItFirst is a **premortem / failure-analysis engine for unbuilt ideas**
(adversarial *idea* critique — **not** security AI red-teaming of a live platform).

It uses **Failure Reasoning** to construct the most plausible failure argument before execution.

---

# Core Mission

The engine should answer one question:

> "What is the most plausible way this idea fails, and why?"

Not:

- Is this idea good?
- Will this startup succeed?
- Give me advice.
- Generate business ideas.
- Predict the future.

Instead:

Construct one coherent, defensible failure argument.

---

# Mental Model

The engine should not think like:

Idea
↓

Risk Analysis
↓

Report

Instead it should think like:

Idea
↓

Generate multiple failure hypotheses
↓

Evaluate hypotheses
↓

Choose ONE dominant hypothesis
↓

Construct causal argument
↓

Validate internal consistency
↓

Generate report

The report is only the presentation.

The real product is the reasoning behind it.

---

# Pass 1 Architecture

Current:

Idea
↓

Reasoning
↓

JSON

Target:

Idea

↓

Understand Idea

↓

Extract core value mechanism

↓

Generate multiple candidate failure hypotheses

↓

Generate candidate SPOFs

↓

Rank hypotheses

↓

Select ONE dominant SPOF

↓

Generate causal failure graph

↓

Extract dominant failure spine

↓

Run internal validation

↓

Construct coherent reasoning

↓

Pass 2

---

# Multi-Hypothesis Reasoning

Pass 1 SHOULD NOT immediately commit to the first SPOF.

Instead:

- generate multiple possible SPOFs
- generate multiple possible cascades
- compare them
- keep only the strongest

Think:

Hypothesis A

Hypothesis B

Hypothesis C

↓

Ranking

↓

Winner

Only the winning hypothesis becomes the report.

---

# SPOF Selection

The engine should SELECT a SPOF.

Not simply FIND one.

Internal reasoning should evaluate:

- specificity
- dependency on core value
- lack of redundancy
- causal leverage
- uniqueness to the idea

The chosen SPOF must satisfy:

"If this SPOF disappears,
the dominant failure path disappears."

---

# Dominance Test

Before finalizing SPOF:

Ask internally:

"Is there another failure point that better explains how this idea collapses?"

If YES

Replace SPOF.

If NO

Continue.

---

# Counterfactual Test

Before finalizing:

Ask:

"If this SPOF is completely removed,
does the cascade still happen?"

If YES

Reject SPOF.

Generate another.

---

# Genericity Test

Every major output should be tested.

Ask:

"Would this still sound correct if the idea were replaced by another startup?"

If YES

Reject.

Regenerate.

This is one of the highest priority validators.

---

# Hidden Assumptions

Hidden assumptions should NOT exist independently.

Each assumption must directly support the chosen SPOF.

Relationship:

Hidden Assumption

↓

Makes SPOF possible

↓

Creates Failure Cascade

Validator:

Every SPOF should be explainable by one or more assumptions.

---

# Failure Cascade

External output:

Linear.

Internal reasoning:

Graph.

Reasoning may contain:

- branches
- loops
- alternative paths

But output should expose only ONE dominant spine.

Reason:

Humans understand narratives better than graphs.

---

# Failure Modes

Failure Modes should NOT be generated independently.

Instead:

Cascade Node

↓

Failure Mode

Each failure mode should map back to one or more nodes in the cascade.

No orphan failure modes.

---

# Likelihood

Likelihood measures:

NOT

"Chance startup fails."

Instead:

"The probability that THIS causal pathway becomes reality."

Relationship:

SPOF

↓

Cascade

↓

Likelihood

---

# Resilience

Resilience does NOT measure quality.

It measures the idea's ability to survive the generated failure path.

Evaluation should consider:

- redundancy
- fallback
- buffers
- recovery
- adaptability
- decoupling

Dimensions remain:

- Technical
- Business
- Legal
- Operations
- Trust

No overall score.

---

# Internal Validation Layer

Pass 1 should validate itself before Pass 2.

Minimum validators:

## Genericity Test

Would another startup produce the same answer?

If yes → reject.

---

## Dominance Test

Is this really the strongest SPOF?

---

## Counterfactual Test

If SPOF disappears,
does cascade disappear?

---

## Consistency Test

Summary

↓

Hidden Assumptions

↓

SPOF

↓

Cascade

↓

Failure Modes

↓

Likelihood

↓

Resilience

Every block must reference the same reasoning.

No contradictions.

---

## Traceability Test

Every block must be traceable.

Summary

→ supports assumptions

Assumptions

→ support SPOF

SPOF

→ starts Cascade

Cascade

→ produces Failure Modes

Failure Modes

→ justify Likelihood

Cascade

→ determines Resilience

If any block cannot be traced back,

Reject.

---

# Reasoning Philosophy

BreakItFirst should think like:

- Red Team
- Premortem facilitator
- Systems thinker
- Failure analyst

NOT like:

- Startup advisor
- VC
- Business consultant
- Motivational coach

---

# Ground Truth Philosophy

BreakItFirst is NOT a prediction engine.

Its success metric is NOT:

"Was the prediction correct?"

Its success metric is:

"Did it produce the strongest plausible failure argument available?"

Reality may prove it wrong.

That is acceptable.

Generic reasoning is not.

---

# Research Foundations (Internal Only)

These frameworks should influence reasoning,
NOT become visible product features.

- Premortem Analysis (Gary Klein)
- Systems Thinking
- STAMP / STPA
- Fault Tree Analysis (FTA)
- Failure Mode and Effects Analysis (FMEA)
- Resilience Engineering
- Decision Science
- Root Cause Analysis
- Red Team Methodology
- Cognitive Bias Research

They should improve internal reasoning only.

Do not expose engineering terminology unless beneficial.

---

# North Star

BreakItFirst should become:

> The most honest AI for revealing how an idea can collapse before execution.

The user should leave thinking:

> "I never considered that failure path."

NOT:

> "This sounds like generic startup advice."

---

# Non-Negotiables

- One dominant failure argument.
- One dominant SPOF.
- Reports must be internally consistent.
- Output must be idea-specific.
- Pass 2 must never invent new claims.
- Cascade must originate from the chosen SPOF.
- Failure Modes must derive from Cascade.
- Likelihood evaluates the pathway, not startup success.
- Resilience evaluates adaptation, not prediction.
- Internal reasoning may be complex.
- External report must remain simple.