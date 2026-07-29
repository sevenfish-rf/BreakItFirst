# Failure report

**Category:** SaaS  
**Generated:** 2026-07-29T09:03:47.431Z

---

## Idea analyzed (pipeline base)

_Validated input — source text used by Pass 1–2._

```
BreakItFirst adalah aplikasi SaaS premortem dan failure analysis untuk membantu founder, product manager, indie hacker, dan tim produk mengevaluasi ide produk atau bisnis sebelum mengalokasikan waktu dan modal untuk membangunnya.

Pengguna memasukkan deskripsi ide yang belum dibangun, memilih kategori produk, lalu BreakItFirst menghasilkan satu laporan kegagalan terstruktur. Produk ini tidak bertujuan memberi brainstorming fitur, business coaching, daftar pro-kontra, atau prediksi numerik apakah sebuah startup akan berhasil. Pertanyaan utama yang ingin dijawab adalah: “Bagaimana ide ini paling masuk akal mengalami kegagalan, dan apa rantai sebab-akibatnya?”

Engine menggunakan pipeline analisis bertahap. Tahap pertama melakukan reasoning bebas dan menghasilkan beberapa kandidat jalur kegagalan secara internal. Dari kandidat tersebut, engine harus memilih satu Single Point of Failure (SPOF) yang dianggap paling dominan dan paling spesifik terhadap ide pengguna. Tahap berikutnya melakukan adversarial critique terhadap argumen tersebut untuk memeriksa apakah SPOF terlalu generik, hanya mengulang risiko yang sudah jelas, bergantung pada asumsi teknologi yang tidak disebutkan pengguna, atau tidak benar-benar menyebabkan cascade yang dipilih. Tahap terakhir mengubah reasoning yang sudah direvisi menjadi laporan JSON terstruktur tanpa menambahkan klaim baru.

Laporan akhir berisi:
- restatement atau ringkasan ide;
- 5–10 hidden assumptions;
- satu SPOF beserta tingkat keyakinan dan penjelasan mekanismenya;
- 7–12 langkah failure cascade yang tersusun secara kausal;
- observable signal untuk setiap langkah cascade;
- optional point of no return;
- failure modes pada domain technical, business, security, legal, dan operations;
- likelihood kualitatif untuk jalur kegagalan yang dipilih, bukan probabilitas keseluruhan bisnis gagal;
- resilience score pada dimensi technical, business, legal, operations, dan trust;
- stress test terhadap sejumlah failure archetype;
- failure velocity;
- serta kalibrasi konsistensi SPOF ketika pengguna menjalankan Deep Analysis.

Nilai utama yang ingin diberikan BreakItFirst bukan jumlah bagian laporan atau banyaknya AI pass. Nilainya adalah kemampuan menemukan satu structural hinge yang spesifik terhadap ide pengguna, lalu menjelaskan bagaimana kegagalan pada hinge tersebut berkembang menjadi satu causal spine yang koheren. Hasil yang dianggap berhasil harus membuat pengguna berpikir, “Saya belum mempertimbangkan jalur kegagalan itu.” Hasil yang hanya berisi nasihat startup generik dengan format yang terlihat profesional dianggap sebagai kegagalan produk.

Produk memiliki dua mode analisis:
1. Standard Analysis untuk analisis reguler dengan biaya dan waktu proses lebih rendah.
2. Deep Analysis yang menjalankan dua reasoning draft untuk membandingkan kandidat SPOF, lalu menampilkan kalibrasi tingkat kesepakatan di antara hasil reasoning tersebut. Deep Analysis memiliki biaya komputasi dan waktu tunggu lebih tinggi.

Alur pengguna yang direncanakan:
1. Pengguna membuka aplikasi dan memasukkan deskripsi idenya.
2. Pengguna memilih kategori dan bahasa laporan.
3. Pengguna memilih Standard atau Deep Analys
4. Analisis dijalankan sebagai background job dengan progres per tahap.
5. Jika halaman direfresh ketika proses masihenyambungkan kembali pengguna ke job yang sama.
6. Setelah selesai, pengguna membaca laporan visual, termasuk failure cascade dan resilience profile.
7. Pengguna dapat menyimpan riwayat laporan secara lokal dan mengekspor laporan ke Markdown.
8. Pengguna dapat memulai analisis baru atau membuka kembali laporan sebelumnya.

Pada fase development, BreakItFirst menggunakan BYOK (Bring Your Own Key) agar pemilik dan developer dapat menguji berbagai model serta provider OpenAI-compatible. BYOK hanya merupakan fasilitas development dan internal testing, bukan fitur utama yang akan dipasarkan kepada pengguna produksi.

Untuk versi produksi, pengguna tidak direncanakan memasukkan API key sendiri. BreakItFirst nantinya akan memakai provider yang lebih stabil dan dipilih serta dikelola oleh produk. Provider dan model final belum diputuskan. Strategi pricing juga belum ditentukan karena masih perlu disesuaikan dengan biaya provider, penggunaan token, perbedaan biaya antara Standard dan Deep Analysis, serta willingness to pay dari target pengguna. Opsi seperti pembayaran per analisis, paket kredit, atau subscription masih terbuka dan belum menjadi keputusan produk.

Pada tahap sekarang, laporan dan history pengguna disimpan di browser, dengan jumlah history terbatas. Job analysis disimpan sementara oleh server agar proses dapat dilanjutkan setelah refresh, tetapi sistem belum dirancang untuk deployment multi-instance berskala besar dan belum memiliki database laporan permanen atau akun pengguna penuh.

BreakItFirst mendukung laporan berbahasa Inggris dan Indonesia. Target awalnya adalah pengguna yang sedang berada pada
tahap sebelum build atau sebelum mengambil kongevaluasi ide startup, product manager yang
mengusulkan produk baru, indie hacker yang haif, dan tim yang ingin menguji asumsi proposalsebelum eksekusi.

Kompetitor atau alternatif pengguna adalah premortem menggunakan general-purpose AI chat, risk checklist, diskusi
internal tim, mentor atau konsultan, serta keounder. BreakItFirst tidak mengklaim selalumenghasilkan analisis yang lebih tajam daripada semua frontier model. Diferensiasi yang ingin diuji adalah apakah struktur satu SPOF dan satu causal spine dapat secara konsisten menghasilkan analisis yang lebih fokus, dapat diperiksa, dan berguna untuk keputusan daripada jawaban free-form yang menyebar ke banyak risiko.

Produk masih berada dalam tahap pengembangan dan validasi. Belum ada data production mengenai retention, conversion, willingness to pay, biaya rata-rata per laporan, atau seberapa sering hasil analisis benar-benar mengubah keputusan pengguna. Premis yang sedang diuji adalah bahwa target pengguna cukup sering memiliki ide atau keputusan sebelum build, bersedia memberikan konteks yang memadai, dan mendapatkan nilai yang cukup besar dari satu laporan premortem terstruktur untuk kembali menggunakan atau membayar produk.

Kenapa draft ini cocok untuk dogfood

Draft ini sengaja:

- Menyatakan BYOK hanya untuk development, bu
- Tidak mengasumsikan pricing sudah dipilih.
- Menyebut kandidat pricing hanya sebagai opsi terbuka, bukan keputusan.
- Membedakan Standard dan Deep tanpa menjadikan jumlah pass sebagai USP.
- Menjelaskan keterbatasan produk saat ini se
- Memberi informasi target pengguna, workflow, kompetitor, dan maturity produk.
- Tidak menyebut “risiko terbesar kami adalah generic output” sebagai fakta; itu hanya dimasukkan sebagai kriteria kualitas produk. Dengan begitu engine masih harus memilih sendiri SPOF dominannya.
- Tidak memberikan angka traction, biaya, atau conversion yang belum ada.
```

## System reading (restatement)

BreakItFirst's defining failure path is forced selection of one dominant failure hinge from often incomplete pre-build descriptions. When the input does not distinguish among plausible failure paths, the pipeline can elevate a familiar pattern, camouflage it with tailored wording, and present an uncertain interpretation as a decisive SPOF. Users then classify the report as formatted general-purpose AI advice, provide less context, and return to alternative review methods, eliminating the product's analytical selection advantage.

## Single Point of Failure

**Forced single-hinge selection**

- **Confidence:** High
- **Confidence reason:** The mechanism is earlier than generic output, trust loss, pricing, or provider economics and is specific to the defining architecture: selecting exactly one SPOF from an often incomplete pre-build description.

### Why this hinge

_Structural assumptions this SPOF depends on — not the generic risk everyone already names._

The idea description contains enough hinge-defining information about customers, workflow, distribution, economics, or operating constraints to distinguish one failure path from others. · Most ideas have one dominant failure hinge that can be selected before the product exists, rather than several conditional risks whose importance depends on missing facts.

### Mechanism explanation

BreakItFirst must select one dominant, idea-specific failure hinge from information that may not determine a dominant hinge. It must commit to one causal spine while avoiding unsupported facts. When the input does not discriminate between candidate failures, the selector is likely to rely on recurring patterns such as acquisition, retention, trust, pricing, or operational complexity. Critique can reject explicit unsupported claims but cannot supply missing facts, producing either a familiar risk dressed in the submitted idea's vocabulary or a heavily qualified report whose causal spine is no longer decisive.

### Critical assumptions for this SPOF

- **#1** — The idea description contains enough hinge-defining information about customers, workflow, distribution, economics, or operating constraints to distinguish one failure path from others.
- **#2** — Most ideas have one dominant failure hinge that can be selected before the product exists, rather than several conditional risks whose importance depends on missing facts.
- **#3** — The engine can remain specific without inventing facts about technology, pricing, regulations, customer behavior, or market conditions.

## Pathway likelihood

_Chance this failure path materializes — not overall odds the company fails._

- **Band:** High
- **Reason:** Users normally evaluate ideas before market, workflow, pricing, and operating constraints are fully known, while the product requires one dominant SPOF and forbids unsupported additions. This makes underdetermined selection, false-specificity camouflage, or Deep Analysis disagreement plausible from the first launch cohort.

## Failure velocity

_How quickly this failure path tends to unfold._

- **Band:** Medium
- **Reason:** Weak or generic SPOF selection can appear in the first launch cohort because ambiguous pre-build descriptions are normal inputs and the pipeline must commit immediately. Full deterioration requires repeated observation, a judgment that richer context does not improve results, and a return to general-purpose AI or existing review practices.

## Hidden assumptions

1. The idea description contains enough hinge-defining information about customers, workflow, distribution, economics, or operating constraints to distinguish one failure path from others. *(linked to SPOF)*
2. Most ideas have one dominant failure hinge that can be selected before the product exists, rather than several conditional risks whose importance depends on missing facts. *(linked to SPOF)*
3. The engine can remain specific without inventing facts about technology, pricing, regulations, customer behavior, or market conditions. *(linked to SPOF)*
4. The forced single-spine format produces more decision value than a competing set of plausible failure paths.
5. A plausible, idea-shaped narrative will be recognized as useful only when its causal mechanism is genuinely grounded in the submitted idea.
6. The critique stage can distinguish real specificity from false specificity.
7. Deep Analysis measures useful calibration rather than shared generic model tendencies or input underdetermination.
8. Users will provide sufficiently sensitive context despite temporary server-side job storage, browser-local history, and the absence of a full account and permanent report database.
9. A report has enough value to support repeat use or payment despite the use case being concentrated before building or committing resources.
10. Provider and model variation will not materially change SPOF selection.

## Resilience score

_0–100 ability to absorb this failure path — lower is more fragile._

| Dimension | Score |
|-----------|------:|
| technical | 20 |
| business | 15 |
| legal | 50 |
| operations | 20 |
| trust | 15 |

## Failure cascade

_Causal chain from fragile point to end state — each step includes an observable signal._

- **Point of no return (step index):** 10

### 1. User submits underspecified idea

*Signal:* Reports repeatedly identify the same missing context, while materially different ideas receive similar candidate failure paths.

### 2. Candidate paths remain plausible

*Signal:* Reasoning contains multiple plausible conditional chains without a concrete submission feature making one path dominant.

### 3. Selector elevates familiar pattern

*Signal:* Similar SPOF labels recur across unrelated categories, with tailoring mainly in nouns describing the product.

### 4. Pipeline camouflages generic hinge

*Signal:* Removing the product name and category still leaves recognizable actors and causal sequence from another SaaS analysis.

### 5. Critique cannot resolve evidence gap

*Signal:* Reports alternate between disputed confident claims and caveats such as “may,” “could,” and “depends.”

### 6. Output locks in one interpretation

*Signal:* Users identify several equally plausible paths that the report does not acknowledge while assigning one confidence or resilience profile.

### 7. Deep Analysis reveals instability

*Signal:* Deep Analysis shows divergent SPOFs, materially different middle steps, or high agreement on an obvious general risk.

### 8. Users classify report as generic advice

*Signal:* Users describe the output as generic, obvious, or similar to general-purpose AI chat.

### 9. Users provide less context

*Signal:* Subsequent submissions omit variables distinguishing competing hinges or remain similarly sparse.

### 10. Selection advantage disappears **[Point of no return]**

*Signal:* Users return to general-purpose AI, internal discussion, mentors, consultants, or checklists.

## Archetype stress test

_Pattern exposure for this idea — not one overall danger score._

### Cold-start / chicken-egg

- **Archetype id:** `cold_start_chicken_egg`
- **Verdict:** No
- **Reason:** A single premortem can function without a dense network of users; network density is not required for the analysis loop.

### Unit economics death spiral

- **Archetype id:** `unit_economics_death_spiral`
- **Verdict:** Maybe
- **Reason:** Standard and Deep Analysis have different compute and waiting costs while pricing and willingness to pay are unresolved, but this remains downstream of the SPOF problem.

### Trust erosion cascade

- **Archetype id:** `trust_erosion`
- **Verdict:** Yes
- **Reason:** An unsupported or arbitrary hinge directly damages the central promise of accepting one dominant interpretation.

### Regulatory / policy kill

- **Archetype id:** `regulatory_kill`
- **Verdict:** No
- **Reason:** The core analysis workflow does not depend on a regulated transaction, license, or platform permission.

### Model / quality ceiling

- **Archetype id:** `model_quality_ceiling`
- **Verdict:** Yes
- **Reason:** The required quality threshold is distinguishing a dominant structural hinge from familiar generic risks under incomplete input.

### Vendor / provider lock-in

- **Archetype id:** `vendor_lock_in`
- **Verdict:** Maybe
- **Reason:** An external provider is required and not yet selected; the risk becomes material if provider changes alter SPOF selection, Deep Analysis agreement, or Standard and Deep cost differences.

### Distribution moat erosion

- **Archetype id:** `distribution_moat_erosion`
- **Verdict:** No
- **Reason:** No specific acquisition channel, search dependency, app-store position, or viral loop is stated; substitution follows perceived analytical genericity.

### Abuse / fraud spiral

- **Archetype id:** `abuse_fraud_spiral`
- **Verdict:** No
- **Reason:** Production BYOK, public API keys, a free tier, and a metered public endpoint are not part of the stated product.

## Failure modes

> **Compounding domains:** The same sensitive-context trigger spans security and the analytical path: reluctance to disclose information makes hinge selection less specific, while any confidentiality incident further reduces disclosure.

### technical

- Candidate generation, SPOF selection, critique, and JSON rendering can complete successfully while carrying forward a weakly grounded hinge.
- Deep Analysis may reveal disagreement without establishing which draft is better supported; provider or model changes may also alter selected failure patterns.

### business

- The differentiator becomes difficult to distinguish from a structured prompt applied to general-purpose AI chat when the SPOF is generic beneath tailored wording.
- The concentrated pre-build use case threatens repeat use and payment validation when users do not observe sharper results after providing more context.
- Unresolved pricing remains coupled to an unproven value unit: one report whose central insight may not be trusted.

### security

- Users may withhold richer confidential product, market, customer, and business information because reports use temporary server-side jobs and browser-local history; reduced context lowers analytical specificity.
- A confidentiality incident after disclosure would reduce willingness to provide the context needed to distinguish candidate failures.

### legal

- No distinct legal failure mechanism is established; confidential idea handling may create legal or contractual exposure depending on deployment and user context.

### operations

- The team must distinguish insufficient context, model variation, unsupported specificity, and genuine disagreement over whether a selected SPOF is dominant.
- Temporary job storage, browser-local history, and no permanent database limit longitudinal evidence for diagnosing disputes, comparing Standard and Deep outputs, or investigating refresh and job interruptions.

---

*Exported from BreakItFirst · What Would Break This?*
