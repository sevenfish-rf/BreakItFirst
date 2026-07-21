# 03 — Quality gap experiment

**Purpose:** Validate (or refute) the dogfood SPOF —  
*Is BreakItFirst’s failure argument clearly sharper than strong free-form chat premortems on the same idea?*

**Status:** In progress — A + B + C done; next Idea D  
**Date started:** 2026-07-21  
**Locale used:** id (Idea A); pin per scoring file for B+  
**BreakItFirst mode:** Standard (Deep off for fair cost) · model pin: Mimo 2.5 Pro (A; re-pin each file)

### Platform roles (from Idea B onward)

| Role | System | Notes |
|------|--------|--------|
| **Candidate C** | **BreakItFirst** | Product under test |
| **Candidate A** | Claude | Strong chat bar (expected-risk quality) |
| **Candidate G** | **GLM 5.2** | New competitor chat (added Idea B) |
| **Not a candidate** | GPT / ChatGPT | **Dropped as premortem rival** after weak scores (Idea A low teens–21; Idea B early signal **18/25**). May still help as **judge/scorer only**. |

Idea A historical note: compared Claude + ChatGPT + BIF. Keep that in [scoring/1.md](./scoring/1.md); do not re-run A for protocol change.

Related: [01-product.md](./01-product.md) · [00-index.md](./00-index.md) · [scoring/](./scoring/) · **[04-refine-backlog.md](./04-refine-backlog.md)** (all todos)

---

## 1. Protocol

For **each idea** (B–E; A already archived):

1. Same idea text into **BIF** + **Claude** + **GLM** (matching category/language on BIF).
2. Paste **§2 baseline prompt** + idea into Claude and GLM (same prompt both).
3. Score outputs 1–5 with **§4 criteria** (prefer multi-judge; GPT may score but not compete).
4. Write `scoring/N.md` summary + register todos in [04-refine-backlog.md](./04-refine-backlog.md).
5. Save BIF export/history id; note SPOF labels for A/G/C.

**Rules**

| Do | Don’t |
|----|--------|
| Same idea text all candidates | Use GPT as a **candidate** again (judge OK) |
| Score **content** first (SPOF/cascade/insight) | Cherry-pick only flattering BIF runs |
| Pin model ids on every scoring file | Compare Deep BIF vs single-shot chat without noting it |

**Pass bar (working rule)**

- **BIF wins** the suite if it wins **≥ 3 / 5** ideas overall, **or** clearly wins insight on ≥ 3 ideas.
- **Gap thin / fails** if Claude or GLM wins ≥ 3, or most rows are ties.
- GPT candidate results are **historical only** (Idea A); not part of suite tally from B onward.

---

## 2. Baseline premortem prompt (Claude / GLM — copy-paste)

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

| Criterion (1–5) | Claude (A) | GLM (G) | BIF (C) | Notes |
|-----------------|:----------:|:-------:|:-------:|-------|
| SPOF mechanism | | | | |
| Idea-specific | | | | |
| Cascade causal | | | | |
| Insight (“belum kepikiran”) | | | | |
| Spine consistency | | | | |
| **Sum (max 25)** | | | | |

- **Winner this idea:** BIF / Claude / GLM / Tie  
- **SPOF labels (A / G / C):**  
- **Judges used:** (e.g. GLM / Claude / GPT-as-judge only / …)  
- **One-sentence why:**  

**Per-trial write-up:** `docs/scoring/N.md` = summary + verdict + pointer to new backlog rows.  
**All todos:** [04-refine-backlog.md](./04-refine-backlog.md) only (required update after each idea).

---

## 5. Results summary

### 5.1 Per-idea winners

| Idea | File | Candidates | Winner | BIF SPOF (short) | Notes |
|------|------|------------|--------|------------------|--------|
| A Marketplace | [scoring/1.md](./scoring/1.md) | Claude + **GPT** + BIF | **BIF** (provisional) | Demand sporadis vs retensi sitter | GPT last as candidate; then dropped |
| B SaaS | [scoring/2.md](./scoring/2.md) | Claude + GPT* + BIF + **GLM** | **BIF + GLM tie** | Auto-overwrite wiki / no review + noise | *GPT last candidate run (~16 mean); then dropped |
| C AI premortem (dogfood) | [scoring/3.md](./scoring/3.md) | Claude + GLM + BIF | **Claude** (BIF mid) | Camouflage vs no-grounding | First BIF underperformance |
| D Hardware | | Claude + GLM + BIF | | | |
| E API | | Claude + GLM + BIF | | | |

**Tally (suite):** BIF sole **1** (A) · BIF-GLM co **1** (B) · **Claude sole 1** (C) · Suite incomplete (3/5)

### 5.2 Experiment verdict

| Outcome | Tick |
|---------|------|
| **Provisional gap-real (partial suite)** | [x] Idea A only |
| **Gap real — full suite** (≥3 BIF wins) | [ ] |
| **Gap thin — mixed / ties** | [ ] |
| **Gap fails — chat wins ≥3** | [ ] |

**Verdict paragraph (suite — update after ≥3 ideas):**

> A: BIF sole win. B: BIF+GLM tie. **C (dogfood): Claude wins; BIF mid/low** - invent-stack + weaker hinge vs camouflage. Suite incomplete (3/5).

### 5.3 Implications (fill after suite)

| If gap real | If gap thin / fails |
|-------------|---------------------|
| Lean into structural / earlier-hinge positioning | Tighten Pass 1.5 / niche before scale |
| Pricing / fixed provider path more defensible | Don’t sell “multi-pass AI” as USP |
| Case studies from scoring/* | Change fixtures / domain |

**Rolled-up todos:** only in [04-refine-backlog.md](./04-refine-backlog.md) — implement from Master board / By priority.

---

## 6. Central refine backlog (required)

**One file for all ideas:** [04-refine-backlog.md](./04-refine-backlog.md)

| After each idea | Do this |
|-----------------|---------|
| 1 | Write `scoring/N.md` (setup, scores, verdict, SPOF labels) |
| 2 | Open `04-refine-backlog.md` → add/update **Master board** rows (reuse ID if same issue) |
| 3 | Fill **§4 Log by trial** for that idea |
| 4 | In `scoring/N.md`, list only **IDs contributed** + link to `04` |

Do **not** keep five separate full todo lists in five scoring files.

**ID prefixes:** `E` engine · `S` surface · `P` positioning · `Q` process.  
**Status:** `todo` · `doing` · `done` · `wont` · `blocked` · `validate-next`.

### Snapshots (full board in 04)

| Trial | Top actions | ID |
|-------|-------------|-----|
| A | Earliest hinge + founder-fear; positioning | E1, E2, P1, P2 |
| B | Stacked SPOF; fill security/legal; bar = Claude+GLM | E6, E8, P5 |
| B | SaaS litmus pass; stress/PONR | E5 done, E7, S1 |
| C | No invent-then-attack; idea-as-stated; false specificity | **E9, E10, E11** |

---

## 7. Optional detail logs

| Idea | BIF export / history id | Comparator notes |
|------|-------------------------|------------------|
| A | | Claude + ChatGPT + multi-judge → scoring/1.md |
| B | | |
| C | | |
| D | | |
| E | | |

---

## 8. Change log

| Date | Note |
|------|------|
| 2026-07-21 | Draft protocol + 5 ideas + score/result tables created |
| 2026-07-21 | Idea A complete; todos in **04-refine-backlog.md** |
| 2026-07-21 | **Protocol v2:** candidates = Claude + GLM + BIF; **GPT out as candidate** (judge OK); Idea B WIP |
