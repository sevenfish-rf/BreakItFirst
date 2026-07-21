# 90 — History (archive)
**Not live source of truth.** Prefer `01-product.md` and `02-develop.md`.
Merged 2026-07-21 from masterplan, in-progress, early notes.

---

## A. Status snapshot (was in-progress.md)

# Status snapshot (archive)

**Last updated:** 2026-07-20  
**Live docs:** `docs/01-product.md`, `guide.md`, `reference.md`

---

## Shipped (code)

| Area | Notes |
|------|--------|
| Pipeline Pass 1 â†’ 1.5 â†’ Pass 2 | + Deep 2Ã— Pass 1 |
| Archetypes, signals, stress, velocity | C.1â€“C.5 |
| F1 / F2 / F3 | critical_assumption_indices, point_of_no_return_index, compounding_note |
| Sharpness + DIRECTIVES-2026-07-16 | Prompt + soft-checks |
| Reasoning refine (2026-07-20) | Multi-hyp, dominance, counterfactual, pathway likelihood, modesâ†”cascade (prompts + soft-checks; **not** full architecture rewrite) |
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

BreakItFirst = **premortem for unbuilt ideas**, not security AI red-teaming of a live platform. See `docs/01-product.md` Â§1.

## Changelog (high level)

| Date | Update |
|------|--------|
| 2026-07-16 | Core B+C, eval, sharpness, DIRECTIVES D1â€“D5; baseline 33.8 locked |
| 2026-07-17 | F1+F2+F3 fields + UI |
| 2026-07-20 | Session resilience (jobs/poll/cancel/single-flight/history); reasoning refine P0+P1; docs reorg |


---

## B. Masterplan (was masterplan.md)

# BreakItFirst â€” Core Development Master Plan
*Gabungan dari architecture directive + execution roadmap. Ini jadi satu-satunya rujukan untuk pengembangan core ke depan.*

---

## Bagian A â€” North Star (fondasi, jangan sering diubah)

### A.1 Product Identity
BreakItFirst **bukan** AI wrapper, **bukan** chatbot, **bukan** business consultant. Ini adalah **Failure Analysis Engine** â€” LLM cuma reasoning layer, implementasi. Yang dijual ke user adalah framework berpikir yang mengidentifikasi bagaimana ide gagal secara spesifik, kausal, terstruktur.

Pertanyaan inti yang selalu dijaga:
> **"How would this idea most likely fail?"**

Kalau sebuah fitur tidak memperkuat pertanyaan itu, keberadaannya harus dipertanyakan.

### A.2 Core Philosophy
- **AI bukan produk.** Model, provider, dan prompt boleh berubah â€” metodologi tidak.
- **Reasoning over Generation.** Output terbaik bukan yang paling panjang, tapi paling spesifik, paling kausal, paling mengungkap blind spot.
- **Failure before Success.** Produk ini memaksa user memahami cara gagal, bukan membantu user sukses. Kalau nanti ada fitur yang membantu sukses, itu harus lahir dari hasil failure analysis â€” bukan brainstorming generik.

### A.3 Product Invariants
- Selalu fokus failure analysis â€” tidak berubah jadi business consultant atau feature brainstorming tool.
- Tidak memberi motivational advice, tidak menghalusinasi fakta.
- Selalu menjelaskan mekanisme kausal kegagalan, bukan cuma daftar risiko.
- Output selalu spesifik terhadap ide yang dianalisis â€” bukan template.
- Blind spot lebih penting dari banyaknya insight.

### A.4 AI Constitution
**AI MUST:** memprioritaskan reasoning atas kreativitas Â· menjelaskan sebab-akibat Â· menyatakan uncertainty Â· menghasilkan insight spesifik terhadap ide Â· menghindari generic startup advice.

**AI MUST NOT:** jadi business coach atau motivator Â· brainstorm fitur Â· mengarang asumsi tanpa dasar Â· menyembunyikan uncertainty Â· menghasilkan jawaban template.

### A.5 Urutan Prioritas Pengembangan
Kalau dua prinsip bentrok, urutan ini yang menang:

**Specificity â†’ Reasoning Quality â†’ Depth â†’ Honesty â†’ Consistency â†’ Explainability â†’ Speed â†’ Creativity**

(Ini paling sering relevan waktu memutuskan trade-off: mis. mekanisme yang menambah depth tapi mengorbankan speed â€” cek urutan ini dulu.)

### A.6 Lapisan Arsitektur (target jangka panjang)
Pipeline MVP saat ini (`Idea â†’ Pass 1 â†’ Pass 2 â†’ Schema â†’ UI`) adalah implementasi sementara. Target strukturnya:

```
Failure Analysis Methodology   â† IP inti, tidak berubah
        â†“
Reasoning Architecture         â† aturan reasoning, bukan prompt itu sendiri
        â†“
Prompt Implementation          â† prompt = implementasi dari reasoning rules di atas
        â†“
LLM
        â†“
Knowledge Layer                â† archetype library, web search, dst (plugin, bukan pengganti reasoning)
        â†“
Evaluation Layer               â† lihat catatan di A.7 â€” ini BUKAN lapisan yang nunggu giliran
        â†“
Structured Report
        â†“
Presentation Layer
```

Kenapa dipisah begini: prompt bisa berubah tanpa mengubah methodology, model bisa diganti tanpa mengubah framework, knowledge source bisa ditambah tanpa merombak pipeline.

### A.7 âš ï¸ Koreksi terhadap roadmap fase awal â€” Evaluation adalah infrastruktur, bukan fase
Dokumen arsitektur awal menaruh Evaluation Framework di "Phase 4", setelah Reasoning Improvement dan Knowledge Integration. Ini **bertentangan** dengan prinsip sendiri di bagian evaluasi: *"Setiap perubahan prompt maupun pipeline harus dapat dibandingkan terhadap benchmark internal."* â€” kalau begitu, benchmark harus **sudah ada** sebelum Reasoning Improvement (Phase 2) dimulai, bukan menyusul di Phase 4.

**Keputusan final:** Evaluation/benchmark harness dibangun **duluan**, jalan terus-menerus sebagai infrastruktur â€” bukan fase diskrit yang ditunggu gilirannya. Setiap mekanisme baru di bagian eksekusi bawah ini diukur lewat harness yang sama sejak hari pertama.

### A.8 Development Rule â€” Filter untuk Fitur Baru
Setiap usulan mekanisme/fitur baru wajib lolos 5 pertanyaan ini sebelum dikerjakan:
1. Memperkuat Failure Analysis Methodology?
2. Meningkatkan kualitas reasoning?
3. Membantu menemukan blind spot?
4. Membuat reasoning lebih spesifik?
5. Bisa diukur kualitasnya (lewat eval harness)?

Kalau mayoritas jawabannya "tidak" â€” jangan diprioritaskan. Semua mekanisme di Bagian C sudah dicek lewat filter ini.

---

## Bagian B â€” Fondasi Eksekusi (Fase 1: sebelum apapun lain)

Ini prasyarat sebelum Bagian C boleh mulai. Tanpa ini, "makin bagus" cuma tebakan.

### B.1 Eval Harness (bangun duluan â€” lihat A.7)
1. **Golden test set:** 15â€“20 ide lintas kategori (marketplace, API, AI product, fintech, dll), campuran ide fragile-jelas dan ide yang kelihatan solid.
2. **Rubric = tabel Baik/Buruk per blok** yang sudah ada di `docs/01-product.md`, dikonversi jadi scoring checklist (manual dulu â†’ LLM-as-judge untuk scaling; pertimbangkan judge model beda dari model Pass 1/2 biar tidak bias menilai output dirinya sendiri).
3. **Regression checklist** (section 5 `project-overview.md`) dijadikan automated assertion, jalan tiap kali prompt/schema berubah.
4. **Baseline dulu** â€” jalankan pipeline apa adanya di golden set, catat skor per blok, sebelum improvement apapun.

### B.2 Pass 2 â€” Perketat Validasi (cheap win, independen dari kualitas reasoning)
1. Runtime schema validation (Zod/sejenis) di server â€” bukan cuma TypeScript compile-time types.
2. Retry loop dengan error feedback spesifik ke model (maks 1â€“2x) sebelum fallback ke error jujur ke user.
3. Soft-check yang sudah disebut di docs, jadi kode nyata: `cascadeLooksConnected`, konsistensi SPOFâ†”failure_modes, sanity check resilience score.
4. Guard eksplisit terhadap klaim baru di Pass 2 yang tidak ada di Pass 1 (sudah masuk checklist regresi â€” tinggal diotomasi).

---

## Bagian C â€” Mekanisme Pendalaman (Fase 2, setelah B stabil)

Semua mekanisme di bawah sudah dicek lewat filter A.8, dan posisinya di peta jangka panjang A.6/Knowledge Layer & long-term vision (Failure Simulation, Risk Timeline, Validation Planning) sudah dipetakan di C.7.

| Mekanisme | Masalah yang diserang | Effort |
|---|---|---|
| **C.1 Archetype Library** | Reasoning freeform ngarang pola dangkal | Rendah â€” statis, fondasi untuk C.2 & C.4 |
| **C.2 Adversarial Critique Pass ("Pass 1.5")** | Pass 1 single-shot berhenti di jawaban permukaan | Sedang |
| **C.3 Early Warning Signals** | Cascade node kurang actionable tanpa jadi "saran" | Sedang |
| **C.4 Stress Test Score** | Belum ada layer pattern-based (beda dari resilience yang dimension-based) | Rendah (reuse C.1) |
| **C.5 Timeline/Velocity Estimate** | User tidak tahu urgensi kegagalan | Rendah |
| **C.6 Self-Consistency Calibration** | Confidence band SPOF cuma tebakan single-shot | Tinggi (multi-call) |

**Detail:**

- **C.1 Archetype Library** â€” taxonomy 5â€“10 pola kegagalan yang sudah dikenal (cold-start/chicken-egg, unit economics death spiral, regulatory kill, trust erosion, model quality ceiling, vendor lock-in, distribution moat erosion). Disuntik sebagai *knowledge layer* (bukan pengganti reasoning â€” lihat A.6) ke Pass 1.
- **C.2 Adversarial Critique Pass** â€” sisipkan step kritik antara Pass 1 dan Pass 2: model menyerang draft SPOF/cascade-nya sendiri ("apa yang bikin ini spesifik ke ide ini, bukan ide manapun?"), revisi sebelum lanjut. Dampak tertinggi ke ketajaman kalau data eval B.1 menunjukkan Pass 1 masih sering generik.
- **C.3 Early Warning Signals** â€” per node cascade, tambah field `observable_signal` (apa yang terlihat di dunia nyata kalau langkah ini terjadi). **Observasi, bukan rekomendasi** â€” begitu berbunyi "sebaiknya kamu...", itu melanggar A.3/A.4.
- **C.4 Stress Test Score** â€” jalankan ide lewat checklist archetype (C.1): tiap archetype, `Ya/Mungkin/Tidak` + alasan. Terpisah dari resilience score â€” jangan collapse jadi satu angka (lihat guardrail C.8).
- **C.5 Timeline/Velocity** â€” band kualitatif (`Cepat/Sedang/Lambat`) + alasan, konsisten dengan pola likelihood yang sudah ada. No false numeric precision.
- **C.6 Self-Consistency Calibration** â€” jalankan Pass 1 beberapa kali, cek konvergensi SPOF. Paling mahal â€” pertimbangkan sebagai opsi "deep analysis" terpisah untuk publik, bukan default path.

### C.7 Pemetaan ke Long-Term Vision
C.1 (archetype) = cikal bakal Knowledge Layer di A.6. C.3 (early warning) = versi awal dari "Risk Timeline" di visi jangka panjang. C.4 (stress test) = versi awal dari "Failure Simulation". Ini artinya Fase 2 bukan cabang baru â€” ini **langkah pertama** menuju Phase 5â€“7 di roadmap jangka panjang (Failure Simulation â†’ Validation Planning â†’ Experiment Roadmap), dikerjakan secara bertahap dan terukur, bukan lompat langsung ke situ.

### C.8 Guardrail
- Cascade tetap **satu rantai linear** â€” early warning & archetype adalah layer tambahan di node yang ada, bukan alasan mengubah jadi graph bercabang.
- Jangan collapse skor baru (stress test, velocity) jadi satu "overall danger score" â€” melanggar prinsip "jangan false precision" yang sudah berlaku di resilience score.
- Semua mekanisme C.1â€“C.6 wajib lolos regression checklist (B.1.3) yang sama sebelum ship. Tambah cost/latency tanpa delta kualitas jelas di eval harness = jangan dilanjut.

---

## Bagian D â€” Urutan Eksekusi Teknis (ringkas)

1. **B.1** Eval harness + baseline (fondasi wajib, tidak bisa dilewati).
2. **B.2** Perketat Pass 2 (cheap win, paralel dengan #1 kalau resource ada).
3. **C.1** Archetype library (murah, fondasi C.2/C.4).
4. **C.2** Adversarial critique pass (prioritas tinggi kalau eval nunjukin Pass 1 masih generik).
5. **C.4** Stress test scoring (reuse C.1).
6. **C.3** Early warning signals.
7. **C.5** Timeline/velocity.
8. **C.6** Self-consistency calibration (paling akhir, evaluasi cost/latency untuk publik).
9. Baru setelah core stabil: production-readiness untuk launch (observability pipeline, review rate limit untuk skala publik, error handling jujur â€” bukan silent fallback).

Tiap langkah: ukur delta terhadap baseline B.1 sebelum lanjut. Jangan gabung dua mekanisme sekaligus tanpa tahu mana yang berkontribusi.

---

## Bagian E â€” Definition of Done
Sebuah analisis dianggap selesai bukan ketika AI selesai generate teks, tapi ketika: report berhasil dibuat, blind spot utama teridentifikasi, failure chain bisa dipahami, dan user memperoleh perspektif baru soal idenya â€” sesuai reaksi sukses yang jadi tolok ukur sejak awal: *"Belum kepikiran,"* bukan *"Ini AI copy-paste startup advice."*

---

## Bagian F â€” Belum Diputuskan
- Golden test set: ditulis manual, atau dibantu generate + dikurasi?
- LLM-as-judge: model sama dengan Pass 1/2, atau model terpisah?
- Retry loop Pass 2: berapa kali maksimal sebelum fallback ke error jujur?
- Archetype library: taksonomi tetap manual, atau sebagian model-generated + direview?
- C.3â€“C.5: jadi blok baru di UI, atau internal/metadata dulu sambil diuji dampaknya?
- C.6: default untuk semua user publik, atau opsi terpisah (trade-off cost/latency)?


---

## C. Early notes 1 (was 1.md)

# BreakItFirst â€” Core Development Roadmap
*What Would Break This? â€” dan sekarang: apa yang bikin engine-nya sendiri gagal kalau di-launch?*

Konteks: project masih MVP, belum pernah di-stress-test serius, dan arahnya mau jadi produk publik. Fokus dokumen ini murni **core/pipeline** (Pass 1, Pass 2, kualitas output) â€” bukan UI.

---

## 1. Kondisi Saat Ini (dari docs & repo)

- Pipeline: **Pass 1** (freeform reasoning, tidak ditampilkan) â†’ **Pass 2** (ekstraksi ke schema JSON, MVP fields only) â†’ validasi schema â†’ UI.
- 7 blok report: Summary, Hidden Assumptions, SPOF, Failure Cascade, Failure Modes, Likelihood, Resilience Score.
- Kriteria kualitas untuk tiap blok **sudah didefinisikan dengan sangat baik** di `docs/01-product.md` (tabel Baik/Buruk per blok) â€” ini aset besar yang belum dipakai jadi apa-apa selain dokumentasi.
- Ada "soft-check" yang disebut di docs (`cascadeLooksConnected`) tapi statusnya belum jelas apakah sudah jadi kode atau baru niat.
- Belum ada testing/eval sistematis. Ini bottleneck utama menurut lo sendiri â€” dan ini yang paling berbahaya untuk produk yang mau dilaunching publik, karena **kualitas output = keseluruhan value proposition produk ini** (bukan fitur pelengkap).

**Insight kunci:** BreakItFirst punya risiko SPOF-nya sendiri, ironisnya â€” dan itu adalah *reasoning quality Pass 1 yang tidak diverifikasi*. Kalau Pass 1 generik, semua 7 blok generik, dan produk gagal di janji intinya ("Belum kepikiran" vs "Ini AI copy-paste startup advice" â€” persis dibedakan di docs sendiri).

---

## 2. Tiga Pilar Pengembangan (sesuai arahan)

### 2.1 Pass 1 â€” Reasoning Quality

**Masalah potensial:** tanpa guardrail eksplisit, LLM cenderung fallback ke saran generik ("butuh marketing", "kompetisi ketat") â€” persis hal yang sudah diidentifikasi sebagai anti-pattern di docs.

**Langkah teknis konkret:**
1. **Bangun rubric jadi bagian prompt, bukan cuma dokumentasi.** Tabel "Baik vs Buruk" per blok di `project-overview.md` di-embed langsung ke system prompt Pass 1 sebagai instruksi eksplisit + 1-2 contoh negatif ("jangan seperti ini").
2. **Self-check instruction built-in:** minta model menjalankan tes "ganti nama produk â€” apakah SPOF/assumptions ini masih masuk akal untuk startup lain?" sebagai langkah reasoning wajib sebelum output final, bukan cuma catatan developer.
3. **Few-shot per kategori.** Kategori ide (marketplace, API, AI product, dst.) punya failure pattern beda. 2-3 contoh calibrated per kategori akan menaikkan spesifisitas jauh lebih efektif daripada instruksi umum.
4. **Pisahkan "scratchpad" dari "final reasoning".** Kalau belum ada, pertimbangkan reasoning 2 tahap di dalam Pass 1 sendiri: draft kasar â†’ kritik diri â†’ revisi. Ini masih 1 API call (pakai extended thinking/prompt chaining), belum perlu jadi Pass 3 terpisah.
5. **Cascade-to-SPOF linkage check** dijadikan instruksi eksplisit di prompt: node pertama cascade harus secara eksplisit merujuk `component` dari SPOF.

### 2.2 Pass 2 â€” Schema & Validation Strictness

**Masalah potensial:** Pass 2 saat ini "hanya mengompres Pass 1" â€” tapi tanpa validasi keras, kompresi yang buruk (field kosong, count di luar range, klaim baru yang tidak ada di Pass 1) bisa lolos ke user.

**Langkah teknis konkret:**
1. **Schema validation dengan Zod (atau sejenis) di server, bukan cuma TypeScript types.** Type-level `FailureAnalysis` di `src/types/` itu compile-time saja â€” perlu runtime validator yang benar-benar menolak response yang melanggar range (assumptions 5â€“10, cascade 7â€“12, resilience 0â€“100 integer).
2. **Retry loop dengan error feedback.** Kalau validasi gagal, jangan langsung error ke user â€” kirim balik ke model dengan pesan spesifik ("assumptions harus 5-10 item, kamu kasih 3") dan retry maks 1-2x sebelum fallback ke error message yang jujur.
3. **Implementasikan soft-check yang disebut di docs jadi kode nyata:**
   - `cascadeLooksConnected(cascade, spof, assumptions)` â€” cek keterkaitan tekstual/semantik, log kalau putus.
   - Konsistensi SPOF â†” failure_modes (SPOF harusnya muncul di minimal 1-2 domain).
   - Resilience score sanity check (dimensi yang berkaitan dengan SPOF harus relatif rendah â€” flag kalau tidak).
4. **Guard terhadap "klaim baru di Pass 2 yang tidak ada di Pass 1"** â€” checklist regresi di docs sudah menyebut ini eksplisit sebagai bentuk kegagalan; ini perlu jadi automated check, bukan cuma review manual.

### 2.3 Testing & Evaluation â€” fondasi yang belum ada

Karena belum pernah di-test serius, ini **harus jadi prioritas pertama secara eksekusi**, karena tanpa ini, perbaikan Pass 1/Pass 2 di atas cuma tebak-tebakan â€” nggak ada cara ukur "makin bagus" atau "makin jelek".

**Langkah teknis konkret:**
1. **Golden test set:** 15-20 ide startup/produk yang beragam kategori (marketplace, API, AI product, fintech, dll â€” termasuk yang gampang [ide jelas fragile] dan yang susah [ide yang kelihatan solid]).
2. **Eval rubric = tabel Baik/Buruk di docs, dikonversi jadi scoring checklist** (bisa manual dulu, lalu LLM-as-judge untuk scaling).
3. **Regression checklist di section 5 `project-overview.md` dijadikan automated assertion** â€” itu sudah berupa checklist siap pakai, tinggal diimplementasi sebagai test yang jalan tiap kali prompt/schema berubah.
4. **Snapshot/unit test untuk pipeline glue code** (bukan LLM output-nya, tapi kode yang manggil, parse, validasi) â€” supaya refactor nggak diam-diam merusak alur.
5. **Baseline dulu sebelum optimasi.** Jalankan golden set dengan pipeline saat ini apa adanya, catat skor rubric per blok â€” baru itu jadi acuan sebelum improvement (2.1) dan (2.2) diukur.

---

## 3. What Next â€” Urutan Eksekusi Teknis

Urutan ini penting: jangan optimasi prompt sebelum ada cara ngukur.

1. **Bangun eval harness dulu** (2.3.1â€“2.3.3) â€” golden set + rubric checklist, walau manual scoring dulu.
2. **Jalankan baseline** pipeline saat ini, dokumentasikan skor/kegagalan per blok.
3. **Perketat Pass 2** (2.2.1â€“2.2.2) â€” runtime schema validation + retry loop. Ini "cheap win": mencegah output rusak sampai ke user, independen dari kualitas reasoning.
4. **Implementasi soft-check jadi kode** (2.2.3â€“2.2.4) â€” mulai dari cascade-SPOF linkage, karena itu paling sering jadi indikator "report terasa template".
5. **Iterasi prompt Pass 1** (2.1.1â€“2.1.5) melawan eval harness â€” ubah satu variabel sekaligus (rubric-in-prompt dulu, baru few-shot, baru self-check), ukur delta di golden set tiap perubahan.
6. **Re-run regression checklist** tiap kali ada perubahan prompt/schema â€” jangan andalkan "kelihatannya bagus" dari 1-2 contoh manual.
7. **Baru setelah core stabil**, pikirkan production-readiness untuk launch publik: observability pipeline (log kegagalan validasi, retry rate, latency Pass 1/Pass 2), rate limit yang sudah ada di-review ulang untuk skala publik, dan error handling yang jujur ke user (bukan silent fallback).

---

## 4. Kembali ke Tujuan Project

Semua pengembangan di atas harus terus dicek balik ke satu pertanyaan inti dari docs:

> *Bagaimana ide ini paling mungkin gagal â€” secara spesifik, kausal, dan terstruktur?*

Kalau eval harness, validasi ketat, dan prompt iteration nanti malah bikin sistem terasa lebih "aman"/generik supaya gampang lolos validasi â€” itu justru gagal balik ke tujuan. Definisi sukses tetap seperti yang dokumen aslinya bilang: reaksi user *"Belum kepikiran"*, bukan *"Ini AI copy-paste startup advice"*. Rubric dan validasi yang dibangun harus menjaga **spesifisitas dan ketajaman**, bukan cuma menjaga bentuk (shape) output.

---

## 5. Belum Diputuskan (perlu keputusan lo)

- Golden test set: lo yang nulis 15-20 ide contoh, atau minta dibantu generate + lo kurasi?
- LLM-as-judge pakai model yang sama dengan Pass 1/2, atau model terpisah (biar nggak bias menilai output dirinya sendiri)?
- Retry loop Pass 2: berapa kali maksimal sebelum nyerah dan kasih error jujur ke user?

# BreakItFirst â€” Core Development Roadmap: Fase 2 (Memperdalam Analisis)

*Lanjutan dari `breakitfirst-core-roadmap.md`. Asumsi: eval harness sudah jalan, baseline sudah diukur, Pass 2 validation ketat, regression checklist hijau semua.*

Kalau Fase 1 itu soal **"pastikan yang ada sekarang nggak rusak dan bisa diukur"**, Fase 2 ini soal **"bikin analisisnya lebih tajam dari yang MVP bisa kasih"** â€” langsung mengarah ke 3 item roadmap yang sebelumnya cuma judul (`early warning`, `stress test`, `timeline`), plus 2 mekanisme baru yang belum ada di roadmap tapi menyerang bottleneck utama: reasoning Pass 1 yang gampang generik kalau cuma single-shot.

---

## 1. Lima Mekanisme Baru

### 2.1 Adversarial Critique Pass ("Pass 1.5")
**Masalah yang diserang:** Pass 1 single-shot rawan berhenti di jawaban permukaan.

Sisipkan langkah kritik di antara Pass 1 dan Pass 2 â€” bisa API call terpisah atau reasoning step tambahan dalam Pass 1 yang sama. Model diminta menyerang draft SPOF/cascade-nya sendiri: *"Ini masih terlalu generik â€” apa yang bikin ini spesifik ke ide ini, bukan ide manapun?"* Model harus merevisi atau mempertahankan dengan argumen konkret sebelum lanjut ke Pass 2.

Ini mekanisme dengan potensi dampak terbesar ke ketajaman, karena langsung menyerang failure mode paling sering: SPOF/assumptions yang bisa dicopy ke startup lain.

### 2.2 Failure Archetype Grounding
**Masalah yang diserang:** reasoning freeform tanpa anchor cenderung mengarang pola yang terdengar masuk akal tapi dangkal.

Bangun taxonomy kecil (5-10 pola kegagalan yang sudah dikenal): cold-start/chicken-egg, unit economics death spiral, regulatory kill, trust erosion, model quality ceiling, vendor/platform lock-in, distribution moat erosion, dst. Suntikkan sebagai context ke Pass 1 supaya model beralasan berbasis pola kausal yang sudah terbukti terjadi di dunia nyata, bukan generatif murni.

Ini juga jadi fondasi murah untuk mekanisme 2.4 di bawah â€” dibangun sekali, dipakai dua kali.

### 2.3 Early Warning Signals *(mengisi roadmap item "early warning")*
Untuk tiap node di failure cascade, tambahkan satu **sinyal yang bisa diobservasi** â€” jawaban dari "kalau langkah ini sedang terjadi di dunia nyata, apa yang akan terlihat?" Ini memperdalam cascade tanpa melanggar batas produk: ini observasi, bukan saran perbaikan (produk secara eksplisit bukan coach).

Implementasi: field tambahan per node (`observable_signal: string`), bukan blok UI baru â€” extend schema cascade yang sudah ada.

### 2.4 Stress Test Score *(mengisi roadmap item "stress test")*
Setelah 7 blok inti selesai, jalankan ide lewat checklist archetype dari 2.2: untuk tiap archetype, apakah pola ini mengancam ide ini? (`Ya` / `Mungkin` / `Tidak` + alasan satu baris). Ini **berbeda** dari resilience score (yang berbasis dimensi) â€” ini berbasis pola/preseden historis, layer analisis yang beda sudut.

### 2.5 Timeline / Velocity Estimate *(mengisi roadmap item "timeline")*
Band kualitatif (mis. `Cepat (minggu)` / `Sedang (bulan)` / `Lambat (>1 tahun)`) untuk cascade secara keseluruhan atau per node kritis â€” membantu user membedakan "ini bom waktu" vs "ini pendarahan lambat". Tetap band + alasan, konsisten dengan pola likelihood/confidence yang sudah ada (no false numeric precision).

### 2.6 Self-Consistency Confidence Calibration
Jalankan Pass 1 reasoning beberapa kali (mis. 3x, temperature bervariasi), cek apakah SPOF yang dihasilkan konvergen. Kalau konsisten â†’ confidence band punya dasar empiris, bukan tebakan single-shot. Kalau divergen â†’ itu sendiri sinyal berharga (ide ini punya beberapa jalur kegagalan yang sama-sama plausible, bukan satu titik rapuh dominan).

Ini mekanisme paling mahal (butuh multiple calls) â€” pertimbangkan sebagai opsional/premium tier kalau sudah publik, bukan default path.

---

## 2. Guardrail â€” Supaya Depth Nggak Melenceng dari Positioning

- **Cascade tetap satu rantai linear.** Early warning & archetype adalah *layer tambahan* di atas node yang ada, bukan alasan untuk mengubah cascade jadi tree/graph bercabang (spec asli eksplisit menolak ini).
- **Early warning signal = observasi, bukan rekomendasi.** Begitu mulai berbunyi "sebaiknya kamu...", itu sudah melanggar positioning "expose blind spot, bukan coach".
- **Jangan collapse lagi jadi satu angka.** Stress test score dan velocity tetap terpisah dari resilience score â€” bukan digabung jadi "overall danger score".
- **Semua mekanisme baru wajib lolos regression checklist yang sama** dengan MVP sebelum ship. Kalau nambah latency/cost tanpa delta kualitas yang jelas di eval harness, jangan dilanjut.

---

## 3. What Next â€” Urutan Eksekusi Teknis

1. **Archetype library (2.2)** â€” konten statis, tidak mengubah pipeline, paling murah untuk mulai, dan jadi fondasi 2.1 & 2.4.
2. **Adversarial critique pass (2.1)** â€” prioritas tertinggi kalau data eval Fase 1 menunjukkan Pass 1 masih sering jatuh ke generik.
3. **Stress test scoring (2.4)** â€” reuse archetype library dari langkah 1, effort inkremental kecil.
4. **Early warning signals (2.3)** â€” extend schema node cascade, effort kecil-menengah.
5. **Timeline/velocity (2.5)** â€” field tambahan ringan, dampak naratif tinggi untuk effort rendah.
6. **Self-consistency calibration (2.6)** â€” taruh paling akhir; evaluasi trade-off cost/latency vs value sebelum masuk default path publik.

Tiap langkah: ukur delta terhadap baseline eval harness dari Fase 1 sebelum lanjut ke langkah berikutnya â€” jangan tambah dua mekanisme sekaligus tanpa tahu mana yang berkontribusi ke peningkatan.

---

## 4. Balik ke Tujuan Project

Kelima mekanisme di atas semua harus lulus satu tes yang sama dengan Fase 1: apakah ini bikin analisis **lebih spesifik ke ide ini**, atau cuma bikin report terlihat lebih rumit/lebih panjang? Archetype grounding dan adversarial critique berisiko jadi kontraproduktif kalau malah membuat model "mencocokkan" ide ke pola yang sudah ada alih-alih benar-benar menganalisis mekanisme spesifiknya â€” jadi archetype harus dipakai sebagai *lensa tambahan*, bukan template jawaban.

---

## 5. Belum Diputuskan

- Archetype library: taksonomi tetap yang lo kurasi manual, atau sebagian model-generated dan lo review?
- 2.3â€“2.5 jadi blok baru yang tampil di UI, atau dulu internal/metadata saja sambil diuji dampaknya ke eval?
- 2.6 worth di-jalanin default untuk semua user publik, atau jadi opsi "deep analysis" terpisah (trade-off cost/latency)?


---

## D. Early notes 2 (was 2.md)

# BreakItFirst â€” Core Development Directive (Architecture Instruction)

> **Purpose**
>
> Dokumen ini menjadi **north star** pengembangan BreakItFirst. Dokumen ini bukan membahas implementasi code maupun UI, melainkan menjelaskan bagaimana project ini harus berkembang sebagai sebuah **Failure Analysis Engine**. Setiap perubahan arsitektur, prompt, pipeline, maupun feature baru harus dievaluasi berdasarkan prinsip-prinsip di bawah ini.

---

# 1. Product Identity

BreakItFirst **bukan** AI wrapper.

BreakItFirst **bukan** chatbot.

BreakItFirst **bukan** business consultant.

BreakItFirst adalah sebuah **Failure Analysis Engine** yang menggunakan AI sebagai reasoning layer.

LLM hanyalah implementasi.

Yang dijual kepada user bukan model AI, melainkan framework berpikir yang mampu mengidentifikasi bagaimana sebuah ide kemungkinan besar akan gagal secara spesifik, kausal, dan terstruktur.

Core question yang selalu dijaga adalah:

> **"How would this idea most likely fail?"**

Jika suatu feature tidak memperkuat pertanyaan tersebut, maka feature tersebut harus dipertanyakan keberadaannya.

---

# 2. Long-Term Vision

Target akhir project bukan sekadar menghasilkan report.

Target akhirnya adalah membangun sebuah discipline bernama:

> **Failure Intelligence**

Report hanyalah salah satu output dari discipline tersebut.

Dalam jangka panjang, Failure Intelligence dapat berkembang menjadi:

* Failure Analysis
* Failure Simulation
* Validation Planning
* Experiment Roadmap
* Decision Tree
* Risk Timeline
* Due Diligence Support

Namun seluruh evolusi tersebut tetap berada dalam domain yang sama:

> Membantu manusia menemukan blind spot sebelum realitas menemukannya.

---

# 3. Core Philosophy

Project harus selalu mengikuti prinsip berikut.

## AI is not the product.

AI hanyalah reasoning engine.

Model boleh berubah.

Provider boleh berubah.

Prompt boleh berubah.

Namun metodologi BreakItFirst tidak boleh berubah.

---

## Reasoning over Generation

BreakItFirst tidak menghasilkan jawaban.

BreakItFirst menghasilkan reasoning.

Output terbaik bukan output paling panjang.

Output terbaik adalah output yang paling spesifik, paling kausal, dan paling mampu mengungkap blind spot yang sebelumnya tidak disadari user.

---

## Failure before Success

Produk ini tidak dirancang untuk membantu user sukses.

Produk ini dirancang untuk memaksa user memahami bagaimana ia bisa gagal.

Jika nantinya terdapat fitur yang membantu user sukses, maka fitur tersebut harus tetap berasal dari hasil failure analysis, bukan brainstorming generik.

---

# 4. Core Assets

Aset terbesar BreakItFirst bukanlah model AI.

Bukan pula provider AI.

Core asset project adalah:

1. Failure Analysis Methodology
2. Prompt Architecture
3. Two-pass Pipeline
4. Report Structure
5. Evaluation Methodology

Prompt merupakan implementasi.

Methodology merupakan intellectual property.

---

# 5. Architectural Layers

Arsitektur jangka panjang tidak boleh dipandang sebagai:

Input

â†“

Prompt

â†“

LLM

â†“

UI

Melainkan:

Failure Analysis Methodology

â†“

Reasoning Architecture

â†“

Prompt Implementation

â†“

LLM

â†“

Knowledge Layer

â†“

Evaluation Layer

â†“

Structured Report

â†“

Presentation Layer

Dengan pemisahan ini:

* Prompt dapat berubah tanpa mengubah methodology.
* Model dapat diganti tanpa mengubah framework.
* Knowledge source dapat ditambahkan tanpa merombak pipeline.

---

# 6. Product Invariants

Hal-hal berikut dianggap sebagai invariant dan tidak boleh berubah tanpa alasan yang sangat kuat.

* Produk selalu berfokus pada failure analysis.
* Produk tidak berubah menjadi AI business consultant.
* Produk tidak berubah menjadi feature brainstorming tool.
* Produk tidak memberikan motivational advice.
* Produk tidak menghalusinasi fakta.
* Produk selalu menjelaskan mekanisme penyebab kegagalan.
* Output harus selalu spesifik terhadap ide yang dianalisis.
* Blind spot lebih penting daripada banyaknya insight.

---

# 7. AI Constitution

Model harus mengikuti aturan berikut.

## AI MUST

* Memprioritaskan reasoning daripada kreativitas.
* Menjelaskan hubungan sebab-akibat.
* Menyatakan uncertainty ketika diperlukan.
* Menghasilkan insight yang spesifik terhadap ide.
* Menghindari generic startup advice.

## AI MUST NOT

* Menjadi business coach.
* Menjadi motivator.
* Brainstorm feature.
* Mengarang asumsi tanpa dasar.
* Menyembunyikan uncertainty.
* Menghasilkan jawaban template.

---

# 8. Product Principles

Urutan prioritas pengembangan.

1. Specificity
2. Reasoning Quality
3. Depth
4. Honesty
5. Consistency
6. Explainability
7. Speed
8. Creativity

Ketika dua prinsip bertentangan, urutan di atas menjadi acuan pengambilan keputusan.

---

# 9. Prompt Philosophy

Prompt bukan tempat menyimpan seluruh logika produk.

Prompt hanyalah implementasi dari methodology.

Idealnya:

Reasoning Rules

â†“

Prompt Generator

â†“

Prompt

Bukan seluruh framework ditulis langsung di system prompt.

---

# 10. Knowledge Strategy

Versi MVP hanya menggunakan internal knowledge model.

Roadmap selanjutnya memungkinkan integrasi:

* Web Search
* Regulations
* GitHub
* Research Papers
* Market Data

Knowledge source diperlakukan sebagai reasoning plugin, bukan sebagai pengganti reasoning.

Reasoning tetap menjadi pengambil keputusan utama.

---

# 11. Future Pipeline

Pipeline saat ini:

Idea

â†“

Pass 1

â†“

Pass 2

â†“

Schema

â†“

UI

Merupakan MVP.

Target jangka panjang:

Idea

â†“

Failure Analysis Methodology

â†“

Reasoning Engine

â†“

Knowledge Layer

â†“

Evaluation Layer

â†“

Report Builder

â†“

Visualization

Dengan struktur ini, penambahan source baru tidak memerlukan redesign pipeline.

---

# 12. Evaluation Philosophy

BreakItFirst tidak boleh mengevaluasi dirinya berdasarkan kualitas model AI.

Yang harus dievaluasi adalah kualitas framework.

Masa depan project harus memiliki evaluation framework sendiri.

Contoh metrik:

* Reasoning Accuracy
* Blind Spot Discovery
* Specificity Score
* Insight Depth
* Cross-model Consistency
* Output Stability
* Schema Consistency

Setiap perubahan prompt maupun pipeline harus dapat dibandingkan terhadap benchmark internal.

---

# 13. Future Benchmark

Project harus memiliki benchmark sendiri.

Bukan benchmark LLM.

Melainkan benchmark BreakItFirst.

Contoh:

Input Idea

â†“

Expected Hidden Assumptions

â†“

Expected SPOF

â†“

Expected Failure Cascade

â†“

Expected Failure Modes

â†“

Compare

â†“

Quality Score

Dengan benchmark ini, setiap perubahan dapat diukur secara objektif.

---

# 14. Definition of Done

Sebuah analisis dianggap selesai ketika:

* Report berhasil dibuat.
* Blind spot utama berhasil diidentifikasi.
* Failure chain dapat dipahami.
* User memperoleh perspektif baru mengenai ide tersebut.

Bukan ketika AI selesai menghasilkan teks.

---

# 15. Long-Term Roadmap

Tahap evolusi produk:

Phase 1

Failure Analysis Report

â†“

Phase 2

Reasoning Improvement

â†“

Phase 3

Knowledge Integration

â†“

Phase 4

Evaluation Framework

â†“

Phase 5

Failure Simulation

â†“

Phase 6

Validation Planning

â†“

Phase 7

Experiment Roadmap

â†“

Phase 8

Failure Intelligence Platform

---

# 16. Development Rule

Setiap usulan feature baru harus menjawab pertanyaan berikut.

1. Apakah feature ini memperkuat Failure Analysis Methodology?
2. Apakah feature ini meningkatkan kualitas reasoning?
3. Apakah feature ini membantu menemukan blind spot?
4. Apakah feature ini membuat reasoning lebih spesifik?
5. Apakah feature ini dapat diukur kualitasnya?

Jika sebagian besar jawabannya "tidak", maka feature tersebut seharusnya tidak diprioritaskan.

---

# One Sentence

> **BreakItFirst is not an AI product. It is a Failure Analysis Methodology implemented through AI, designed to help people discover why ideas fail before reality does.**


