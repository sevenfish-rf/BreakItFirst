# Laporan kegagalan

**Kategori:** SaaS  
**Dibuat:** 2026-07-27T09:56:27.020Z

---

## Ide yang dianalisis (basis pipeline)

_Input setelah validasi — teks sumber yang dipakai Pass 1–2._

```
BreakItFirst adalah aplikasi SaaS premortem & failure analysis otomatis untuk ide produk/bisnis yang belum dibuat (unbuilt ideas).

Pengguna menginput deskripsi ide bisnis, memilih kategori, lalu engine 2-Pass (Reasoning + Adversarial Attack + Structured Output) menganalisis 1 engsel utama kegagalan (Single Point of Failure / SPOF) beserta kaskade dampaknya, kalkulasi Point of No Return (PONR), dan radar ketahanan (Resilience Radar).

Produk ini menggunakan model integrasi BYOK (Bring Your Own Key) untuk pengembang/pemilik, dan menargetkan pendiri startup & product manager agar mereka bisa menemukan risiko struktural awal yang belum pernah mereka pertimbangkan sebelum mulai menulis kode.
```

## Pembacaan sistem (restatement)

BreakItFirst’s dominant failure path is that its two-pass engine produces a polished, structured report whose supposed structural hinge is generic rather than grounded in the submitted idea. The generic SPOF propagates through the cascade, PONR, and Resilience Radar, fails to change decisions, and causes one-off usage, BYOK abandonment, and stalled team adoption.

## Single Point of Failure

**Generic attack behind structured output**

- **Keyakinan:** High
- **Alasan keyakinan:** Both drafts converge on generic attacks appearing tailored and adversarially tested while selecting a reusable startup-risk pattern.

### Kenapa hinge ini

_Asumsi struktural yang SPOF ini andalkan — bukan risiko generik yang sudah semua sebut._

A written description of an unbuilt idea contains enough actors, constraints, dependencies, and economics to identify one dominant failure mechanism. · The reasoning pass can distinguish a mechanism specific to that idea from familiar language about demand, competition, trust, pricing, or execution.

### Penjelasan mekanisme

The two-pass engine may produce an internally consistent adversarial report that is not materially specific to the submitted idea. The reasoning pass maps sparse descriptions to familiar risk patterns, while the adversarial pass can challenge the framing without adding evidence beyond the user’s description. Structured fields then turn the generic objection into a named SPOF, ordered cascade, PONR, and radar score, making weak grounding appear analytically complete.

### Asumsi kritis untuk SPOF ini

- **#1** — A written description of an unbuilt idea contains enough actors, constraints, dependencies, and economics to identify one dominant failure mechanism.
- **#2** — The reasoning pass can distinguish a mechanism specific to that idea from familiar language about demand, competition, trust, pricing, or execution.
- **#3** — The adversarial pass attacks the idea’s actual assumptions rather than merely elaborating the first pass’s framing.

### Kalibrasi SPOF (Deep)

- **Kesepakatan:** High
- **Run Pass 1:** 2
- **Alasan:** Both drafts converge on generic attacks behind structured output as the same mechanism: the engine appears tailored and adversarially tested while selecting a reusable startup-risk pattern.
- **Kandidat:** Generic-looking SPOF survives two-pass attack; Generic attacks behind structured specificity; Single-SPOF compression of complex ideas; BYOK key and metering friction; BYOK setup before demonstrated value; Model-quality ceiling

## Kemungkinan jalur gagal

_Peluang jalur kegagalan ini terjadi — bukan peluang keseluruhan perusahaan gagal._

- **Band:** High
- **Alasan:** The product asks a two-pass automated system to infer one overlooked structural hinge from a written description of an unbuilt idea and present it through authoritative-looking fields. Genericity can occur without a visible software malfunction; if early users see familiar attacks that do not change decisions, the pre-build use case, BYOK burden, and weak team propagation reinforce the decline.

## Kecepatan kegagalan

_Seberapa cepat jalur gagal ini cenderung terjadi._

- **Band:** Medium
- **Alasan:** The first report can reveal the weakness immediately because users can compare the named SPOF with what they already know about their idea. Broader collapse takes longer as users stop integrating reports into planning, avoid repeat analyses, and withhold team adoption, but this can occur before a recurring analysis habit forms.

## Asumsi tersembunyi

1. A written description of an unbuilt idea contains enough actors, constraints, dependencies, and economics to identify one dominant failure mechanism. *(terkait SPOF)*
2. The reasoning pass can distinguish a mechanism specific to that idea from familiar language about demand, competition, trust, pricing, or execution. *(terkait SPOF)*
3. The adversarial pass attacks the idea’s actual assumptions rather than merely elaborating the first pass’s framing. *(terkait SPOF)*
4. The forced SPOF, cascade, PONR, and Resilience Radar preserve decision-useful distinctions rather than giving weak reasoning a formal appearance.
5. Users can recognize whether a report settled a real assumption even though there is no operating evidence or built artifact yet.
6. A useful first report creates repeat use across additional ideas, planning cycles, or teams.
7. Users will tolerate BYOK setup before the product has demonstrated differentiated value.

## Skor ketahanan

_0–100 kemampuan menahan jalur gagal ini — semakin rendah semakin rapuh._

| Dimension | Score |
|-----------|------:|
| technical | 20 |
| business | 15 |
| legal | 35 |
| operations | 25 |
| trust | 15 |

## Rantai kegagalan

_Rantai kausal dari titik rapuh sampai end state — tiap langkah ada sinyal yang bisa diamati._

- **Titik tanpa kembali (indeks langkah):** 7

### 1. Sparse descriptions map to reusable risks

*Sinyal:* Reports for materially different ideas contain similar SPOF labels, causal transitions, PONRs, or radar interpretations.

### 2. Reasoning adds an idea-specific surface

*Sinyal:* The report uses the user’s terminology, but its central causal claims could remain after replacing the product with another idea.

### 3. Adversarial pass reinforces generic framing

*Sinyal:* Rebuttals and counterarguments introduce no new fact, actor constraint, dependency, or observable condition beyond the original description.

### 4. Structured fields create apparent completeness

*Sinyal:* Users describe the report as polished or convincing but cannot identify a conclusion depending on a detail unique to their idea.

### 5. Named SPOF fails to change decisions

*Sinyal:* Users make the same next-step decision before and after reading the report, or ask for more risks instead of treating the SPOF as central.

### 6. PONR and radar lose operational meaning

*Sinyal:* Users cannot state what observable event makes the proposed PONR irreversible, and sparse ideas receive similarly confident thresholds or resilience profiles.

### 7. Users stop integrating reports into planning **[Titik tanpa kembali]**

*Sinyal:* Reports remain in personal sessions or downloads and do not appear in planning documents, review discussions, or documented product decisions.

### 8. Pre-build workflow produces one-off usage

*Sinyal:* Users complete an initial analysis but do not submit another idea, rerun it later, or return to the first report.

### 9. BYOK friction outweighs delivered value

*Sinyal:* Users abandon during key setup, provide minimal descriptions after setup, or state that using their own key is not justified by the result.

### 10. Team expansion and product role stall

*Sinyal:* Users do not invite teammates, reports do not spread across projects, and usage concentrates around isolated analyses rather than shared decision records.

## Stress test arketipe

_Paparan pola untuk ide ini — bukan satu skor bahaya keseluruhan._

### Cold-start / chicken-egg

- **ID arketipe:** `cold_start_chicken_egg`
- **Verdict:** No
- **Alasan:** A single founder or PM can submit an idea and receive an analysis without another user, reviewer, or marketplace participant.

### Unit economics death spiral

- **ID arketipe:** `unit_economics_death_spiral`
- **Verdict:** Maybe
- **Alasan:** BYOK limits direct model-inference exposure, but no pricing or usage-cost model is stated; it becomes relevant only if one-off usage leaves support, orchestration, storage, or product costs unsupported.

### Trust erosion cascade

- **ID arketipe:** `trust_erosion`
- **Verdict:** Yes
- **Alasan:** Repeated generic attacks presented as unique SPOFs undermine trust in the cascade, PONR, and radar simultaneously.

### Regulatory / policy kill

- **ID arketipe:** `regulatory_kill`
- **Verdict:** No
- **Alasan:** No regulated decision domain, licensing requirement, or jurisdiction-specific prohibition is stated.

### Model / quality ceiling

- **ID arketipe:** `model_quality_ceiling`
- **Verdict:** Yes
- **Alasan:** The product cannot differentiate itself if its models plateau at familiar risk language when inferring one dominant failure mechanism from an idea description.

### Vendor / provider lock-in

- **ID arketipe:** `vendor_lock_in`
- **Verdict:** Maybe
- **Alasan:** BYOK avoids dependence on one named provider, but the two-pass workflow may vary with provider behavior, prompting, and structured-output support.

### Distribution moat erosion

- **ID arketipe:** `distribution_moat_erosion`
- **Verdict:** No
- **Alasan:** No specific acquisition channel or distribution moat is stated; reduced referrals are already represented by the failure to produce shareable decision value.

### Abuse / fraud spiral

- **ID arketipe:** `abuse_fraud_spiral`
- **Verdict:** No
- **Alasan:** No free tier, public API, shared key, or subsidized metered endpoint is described, so no stated incentive exists for attackers to consume BreakItFirst’s resources.

## Mode kegagalan

> **Domain yang saling memperparah:** Generic output simultaneously weakens trust in the analysis and heightens confidentiality concerns about submitted ideas.

### technical

- The two-pass pipeline amplifies a weak initial interpretation, propagating it through the SPOF, cascade, PONR, and Resilience Radar.
- Different user-supplied models or configurations can produce different degrees of genericity and different dominant failure mechanisms for the same idea.

### business

- A polished report fails to provide a more decision-specific conclusion than a conventional AI critique.
- Generic first-use value removes the reason to return, share reports with teams, or apply the tool across later decisions.
- BYOK raises the minimum perceived value required before adoption, and generic criticism does not justify the setup burden.

### security

- Users may submit confidential ideas and model credentials while receiving little differentiated value in return.
- Perceived exposure can accelerate abandonment when generic output makes the submission feel unjustified.

### legal

- The structured PONR and Resilience Radar can make speculative judgments look more calculated than their input supports.
- Users may rely on a confident but generic conclusion in a product or investment decision, creating a mismatch between apparent authority and evidentiary basis.
- Confidentiality expectations around submitted ideas become more salient when proprietary descriptions produce only generic output.

### operations

- Support cases become difficult because users may dispute reports that sound tailored but cannot be traced to a unique assumption.
- Without a stated human review layer or evidence source, support can explain the output’s structure but not establish that the selected SPOF was genuinely dominant.
- Inconsistent reports across user-supplied models or repeated runs are difficult to defend as shared planning artifacts.

## Catatan pipeline

- Struktur laporan diperbaiki otomatis setelah satu percobaan ulang (format JSON).

---

*Diekspor dari BreakItFirst · What Would Break This?*
