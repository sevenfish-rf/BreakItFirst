# 03 — Quality gap experiment

**Purpose:** Validate (or refute) the dogfood SPOF —  
*Is BreakItFirst’s failure argument clearly sharper than one good free-form ChatGPT prompt on the same idea?*

**Status:** Ready to run  
**Date started:** _______________  
**Locale used:** en / id  
**BreakItFirst mode:** Standard (Deep off for fair cost)  
**ChatGPT model:** _______________  

Related: [01-product.md](./01-product.md) · [00-index.md](./00-index.md)

---

## 1. Protocol

For **each idea** (A–E):

1. Paste the idea into **BreakItFirst** (matching category; same language).
2. Paste **§2 baseline prompt** + the same idea into **ChatGPT**.
3. Score both outputs 1–5 using **§4 criteria** (prefer blind / second reader).
4. Mark winner + one-sentence reason in **§5 results**.
5. Save BIF report (export MD or history). Optionally paste ChatGPT SPOF label into notes.

**Rules**

| Do | Don’t |
|----|--------|
| Same idea text both sides | Cherry-pick only the run that flatters BIF |
| Score **content**, not UI / cascade graph | Change ChatGPT prompt mid-experiment without noting it |
| One pass per tool first | Deep BIF vs weak ChatGPT without recording that |

**Pass bar (working rule)**

- **BIF wins** the experiment if it wins **≥ 3 / 5** ideas on overall winner, **or** clearly wins the “I never considered that” column on ≥ 3 ideas.
- **Gap thin / fails** if ChatGPT wins ≥ 3 or most rows are ties.

---

## 2. x baseline prompt (copy-paste)

```text
You are doing a structured premortem for an UNBUILT product/business idea.
Not coaching. Not “how to win.” Not security red-teaming a live system.

Answer only:
1) Restate the idea in one paragraph.
2) List 5–10 hidden assumptions.
3) Name ONE single point of failure: short mechanism label (3–8 words) + explanation of the causal hinge. Must be specific to THIS idea (not “competition” or “trust” alone).
4) An ordered failure cascade of 8–10 causal steps from that SPOF to an end state. Each step short and idea-specific.
5) For each cascade step: one observable real-world signal (observation only, no advice).
6) Failure modes by domain (technical / business / security / legal / operations) — only bullets that follow from the same cascade, not a laundry list.
7) Likelihood band (Very Low–Very High) for THIS pathway only + one-line reason.
8) Resilience 0–100 for: technical, business, legal, operations, trust — ability to absorb THIS path, not overall quality.

Idea:
<<<
[PASTE IDEA HERE]
>>>
```

---

## 3. Test ideas

### Idea A — Marketplace (thick domain)

**Category (BIF):** Marketplace  

```text
Marketplace on-demand untuk sitters hewan peliharaan di kota besar Indonesia.
Owner booking via app; sitter datang ke rumah. Platform ambil 15% take-rate.
Trust: review + verifikasi KTP. Cold-start: seed 50 sitter di 3 kecamatan dulu.
Bayar in-app wajib; chat in-app. Kompetitor: grup FB & WhatsApp RT.
```

### Idea B — Plain SaaS (often generic)

**Category (BIF):** SaaS  

```text
SaaS knowledge base untuk tim remote: wiki + search + AI summary halaman.
Pricing $12/user/mo. Integrasi Slack. Differentiator: "auto-update docs dari meeting transcript."
Target: startup 10–50 orang. Competitor: Notion, Confluence.
```

### Idea C — AI product (meta / close to us)

**Category (BIF):** AI Product  

```text
Web app premortem: user paste ide produk, dapat report SPOF + cascade terstruktur.
Hosted LLM (fixed provider). Pricing per analysis. Value: failure argument
idea-specific sebelum build. Kompetitor: ChatGPT free-form + template risk checklist.
```

### Idea D — Hardware / ops

**Category (BIF):** Hardware  

```text
Cincin fitness murah + app skor recovery. Hardware OEM China; margin tipis.
Subscription insight $5/mo. Klaim akurasi HR mirip brand premium.
Retail online dulu; return rate hardware unknown.
```

### Idea E — API / usage billing

**Category (BIF):** API  

```text
Public API image resize + CDN cache. Pricing per 1000 requests.
Free tier 10k/mo. Risk abuse, key sharing, competitor Cloudflare Images.
```

---

## 4. Scoring rubric (1–5 per criterion)

| Score | Meaning |
|------:|---------|
| 1 | Generic / wrong / laundry list |
| 3 | OK but partly name-swappable |
| 5 | Sharp, idea-specific, “I hadn’t thought of that” |

| Criterion | What “5” looks like |
|-----------|---------------------|
| **SPOF mechanism** | Label is a concrete hinge, not vibe words alone |
| **Idea-specific** | Swapping the product name breaks the text |
| **Cascade causal** | Order matters; middle steps are specific |
| **Insight** | Founder would feel non-obvious pressure |
| **Spine consistency** | Assumptions → SPOF → cascade → modes align |

**Per-idea score table (fill for each idea)**

### Scores — Idea ___

| Criterion (1–5) | BreakItFirst | x | Notes |
|-----------------|:------------:|:-------:|-------|
| SPOF mechanism | | | |
| Idea-specific | | | |
| Cascade causal | | | |
| Insight (“belum kepikiran”) | | | |
| Spine consistency | | | |
| **Sum (max 25)** | | | |

- **Winner this idea:** BIF / ChatGPT / Tie  
- **BIF SPOF label:**  
- **ChatGPT SPOF label:**  
- **One-sentence why:**  

---

## 5. Results summary

### 5.1 Per-idea winners

| Idea | BIF sum | x sum | Winner | BIF SPOF (short) | GPT SPOF (short) |
|------|--------:|--------:|--------|------------------|------------------|
| A Marketplace | | | | | |
| B SaaS | | | | | |
| C AI premortem | | | | | |
| D Hardware | | | | | |
| E API | | | | | |

**Tally:** BIF wins ___ / 5 · x wins ___ / 5 · Ties ___

### 5.2 Experiment verdict

| Outcome | Tick |
|---------|------|
| **Gap real — BIF clearer** (≥3 BIF wins or insight column) | [ ] |
| **Gap thin — mixed / ties** | [ ] |
| **Gap fails — x wins ≥3** | [ ] |

**Verdict paragraph (3–5 sentences):**

> …

### 5.3 Implications (fill after verdict)

| If gap real | If gap thin / fails |
|-------------|---------------------|
| Lean into one-spine premortem positioning | Tighten Pass 1.5 / niche before scale |
| Pricing / fixed provider path more defensible | Don’t sell “multi-pass AI” as USP |
| Optional: re-run with Deep later | Optional: change fixture set / domain |

**Next product actions (owner):**

1. …  
2. …  
3. …  

---

## 6. Optional detail logs

Paste or link exports if useful (paths only is fine).

| Idea | BIF export / history id | x notes / link |
|------|-------------------------|----------------------|
| A | | |
| B | | |
| C | | |
| D | | |
| E | | |

---

## 7. Change log

| Date | Note |
|------|------|
| 2026-07-21 | Draft protocol + 5 ideas + score/result tables created |
