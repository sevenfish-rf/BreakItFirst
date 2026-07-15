# BreakItFirst — Core Development Master Plan
*Gabungan dari architecture directive + execution roadmap. Ini jadi satu-satunya rujukan untuk pengembangan core ke depan.*

---

## Bagian A — North Star (fondasi, jangan sering diubah)

### A.1 Product Identity
BreakItFirst **bukan** AI wrapper, **bukan** chatbot, **bukan** business consultant. Ini adalah **Failure Analysis Engine** — LLM cuma reasoning layer, implementasi. Yang dijual ke user adalah framework berpikir yang mengidentifikasi bagaimana ide gagal secara spesifik, kausal, terstruktur.

Pertanyaan inti yang selalu dijaga:
> **"How would this idea most likely fail?"**

Kalau sebuah fitur tidak memperkuat pertanyaan itu, keberadaannya harus dipertanyakan.

### A.2 Core Philosophy
- **AI bukan produk.** Model, provider, dan prompt boleh berubah — metodologi tidak.
- **Reasoning over Generation.** Output terbaik bukan yang paling panjang, tapi paling spesifik, paling kausal, paling mengungkap blind spot.
- **Failure before Success.** Produk ini memaksa user memahami cara gagal, bukan membantu user sukses. Kalau nanti ada fitur yang membantu sukses, itu harus lahir dari hasil failure analysis — bukan brainstorming generik.

### A.3 Product Invariants
- Selalu fokus failure analysis — tidak berubah jadi business consultant atau feature brainstorming tool.
- Tidak memberi motivational advice, tidak menghalusinasi fakta.
- Selalu menjelaskan mekanisme kausal kegagalan, bukan cuma daftar risiko.
- Output selalu spesifik terhadap ide yang dianalisis — bukan template.
- Blind spot lebih penting dari banyaknya insight.

### A.4 AI Constitution
**AI MUST:** memprioritaskan reasoning atas kreativitas · menjelaskan sebab-akibat · menyatakan uncertainty · menghasilkan insight spesifik terhadap ide · menghindari generic startup advice.

**AI MUST NOT:** jadi business coach atau motivator · brainstorm fitur · mengarang asumsi tanpa dasar · menyembunyikan uncertainty · menghasilkan jawaban template.

### A.5 Urutan Prioritas Pengembangan
Kalau dua prinsip bentrok, urutan ini yang menang:

**Specificity → Reasoning Quality → Depth → Honesty → Consistency → Explainability → Speed → Creativity**

(Ini paling sering relevan waktu memutuskan trade-off: mis. mekanisme yang menambah depth tapi mengorbankan speed — cek urutan ini dulu.)

### A.6 Lapisan Arsitektur (target jangka panjang)
Pipeline MVP saat ini (`Idea → Pass 1 → Pass 2 → Schema → UI`) adalah implementasi sementara. Target strukturnya:

```
Failure Analysis Methodology   ← IP inti, tidak berubah
        ↓
Reasoning Architecture         ← aturan reasoning, bukan prompt itu sendiri
        ↓
Prompt Implementation          ← prompt = implementasi dari reasoning rules di atas
        ↓
LLM
        ↓
Knowledge Layer                ← archetype library, web search, dst (plugin, bukan pengganti reasoning)
        ↓
Evaluation Layer               ← lihat catatan di A.7 — ini BUKAN lapisan yang nunggu giliran
        ↓
Structured Report
        ↓
Presentation Layer
```

Kenapa dipisah begini: prompt bisa berubah tanpa mengubah methodology, model bisa diganti tanpa mengubah framework, knowledge source bisa ditambah tanpa merombak pipeline.

### A.7 ⚠️ Koreksi terhadap roadmap fase awal — Evaluation adalah infrastruktur, bukan fase
Dokumen arsitektur awal menaruh Evaluation Framework di "Phase 4", setelah Reasoning Improvement dan Knowledge Integration. Ini **bertentangan** dengan prinsip sendiri di bagian evaluasi: *"Setiap perubahan prompt maupun pipeline harus dapat dibandingkan terhadap benchmark internal."* — kalau begitu, benchmark harus **sudah ada** sebelum Reasoning Improvement (Phase 2) dimulai, bukan menyusul di Phase 4.

**Keputusan final:** Evaluation/benchmark harness dibangun **duluan**, jalan terus-menerus sebagai infrastruktur — bukan fase diskrit yang ditunggu gilirannya. Setiap mekanisme baru di bagian eksekusi bawah ini diukur lewat harness yang sama sejak hari pertama.

### A.8 Development Rule — Filter untuk Fitur Baru
Setiap usulan mekanisme/fitur baru wajib lolos 5 pertanyaan ini sebelum dikerjakan:
1. Memperkuat Failure Analysis Methodology?
2. Meningkatkan kualitas reasoning?
3. Membantu menemukan blind spot?
4. Membuat reasoning lebih spesifik?
5. Bisa diukur kualitasnya (lewat eval harness)?

Kalau mayoritas jawabannya "tidak" — jangan diprioritaskan. Semua mekanisme di Bagian C sudah dicek lewat filter ini.

---

## Bagian B — Fondasi Eksekusi (Fase 1: sebelum apapun lain)

Ini prasyarat sebelum Bagian C boleh mulai. Tanpa ini, "makin bagus" cuma tebakan.

### B.1 Eval Harness (bangun duluan — lihat A.7)
1. **Golden test set:** 15–20 ide lintas kategori (marketplace, API, AI product, fintech, dll), campuran ide fragile-jelas dan ide yang kelihatan solid.
2. **Rubric = tabel Baik/Buruk per blok** yang sudah ada di `docs/project-overview.md`, dikonversi jadi scoring checklist (manual dulu → LLM-as-judge untuk scaling; pertimbangkan judge model beda dari model Pass 1/2 biar tidak bias menilai output dirinya sendiri).
3. **Regression checklist** (section 5 `project-overview.md`) dijadikan automated assertion, jalan tiap kali prompt/schema berubah.
4. **Baseline dulu** — jalankan pipeline apa adanya di golden set, catat skor per blok, sebelum improvement apapun.

### B.2 Pass 2 — Perketat Validasi (cheap win, independen dari kualitas reasoning)
1. Runtime schema validation (Zod/sejenis) di server — bukan cuma TypeScript compile-time types.
2. Retry loop dengan error feedback spesifik ke model (maks 1–2x) sebelum fallback ke error jujur ke user.
3. Soft-check yang sudah disebut di docs, jadi kode nyata: `cascadeLooksConnected`, konsistensi SPOF↔failure_modes, sanity check resilience score.
4. Guard eksplisit terhadap klaim baru di Pass 2 yang tidak ada di Pass 1 (sudah masuk checklist regresi — tinggal diotomasi).

---

## Bagian C — Mekanisme Pendalaman (Fase 2, setelah B stabil)

Semua mekanisme di bawah sudah dicek lewat filter A.8, dan posisinya di peta jangka panjang A.6/Knowledge Layer & long-term vision (Failure Simulation, Risk Timeline, Validation Planning) sudah dipetakan di C.7.

| Mekanisme | Masalah yang diserang | Effort |
|---|---|---|
| **C.1 Archetype Library** | Reasoning freeform ngarang pola dangkal | Rendah — statis, fondasi untuk C.2 & C.4 |
| **C.2 Adversarial Critique Pass ("Pass 1.5")** | Pass 1 single-shot berhenti di jawaban permukaan | Sedang |
| **C.3 Early Warning Signals** | Cascade node kurang actionable tanpa jadi "saran" | Sedang |
| **C.4 Stress Test Score** | Belum ada layer pattern-based (beda dari resilience yang dimension-based) | Rendah (reuse C.1) |
| **C.5 Timeline/Velocity Estimate** | User tidak tahu urgensi kegagalan | Rendah |
| **C.6 Self-Consistency Calibration** | Confidence band SPOF cuma tebakan single-shot | Tinggi (multi-call) |

**Detail:**

- **C.1 Archetype Library** — taxonomy 5–10 pola kegagalan yang sudah dikenal (cold-start/chicken-egg, unit economics death spiral, regulatory kill, trust erosion, model quality ceiling, vendor lock-in, distribution moat erosion). Disuntik sebagai *knowledge layer* (bukan pengganti reasoning — lihat A.6) ke Pass 1.
- **C.2 Adversarial Critique Pass** — sisipkan step kritik antara Pass 1 dan Pass 2: model menyerang draft SPOF/cascade-nya sendiri ("apa yang bikin ini spesifik ke ide ini, bukan ide manapun?"), revisi sebelum lanjut. Dampak tertinggi ke ketajaman kalau data eval B.1 menunjukkan Pass 1 masih sering generik.
- **C.3 Early Warning Signals** — per node cascade, tambah field `observable_signal` (apa yang terlihat di dunia nyata kalau langkah ini terjadi). **Observasi, bukan rekomendasi** — begitu berbunyi "sebaiknya kamu...", itu melanggar A.3/A.4.
- **C.4 Stress Test Score** — jalankan ide lewat checklist archetype (C.1): tiap archetype, `Ya/Mungkin/Tidak` + alasan. Terpisah dari resilience score — jangan collapse jadi satu angka (lihat guardrail C.8).
- **C.5 Timeline/Velocity** — band kualitatif (`Cepat/Sedang/Lambat`) + alasan, konsisten dengan pola likelihood yang sudah ada. No false numeric precision.
- **C.6 Self-Consistency Calibration** — jalankan Pass 1 beberapa kali, cek konvergensi SPOF. Paling mahal — pertimbangkan sebagai opsi "deep analysis" terpisah untuk publik, bukan default path.

### C.7 Pemetaan ke Long-Term Vision
C.1 (archetype) = cikal bakal Knowledge Layer di A.6. C.3 (early warning) = versi awal dari "Risk Timeline" di visi jangka panjang. C.4 (stress test) = versi awal dari "Failure Simulation". Ini artinya Fase 2 bukan cabang baru — ini **langkah pertama** menuju Phase 5–7 di roadmap jangka panjang (Failure Simulation → Validation Planning → Experiment Roadmap), dikerjakan secara bertahap dan terukur, bukan lompat langsung ke situ.

### C.8 Guardrail
- Cascade tetap **satu rantai linear** — early warning & archetype adalah layer tambahan di node yang ada, bukan alasan mengubah jadi graph bercabang.
- Jangan collapse skor baru (stress test, velocity) jadi satu "overall danger score" — melanggar prinsip "jangan false precision" yang sudah berlaku di resilience score.
- Semua mekanisme C.1–C.6 wajib lolos regression checklist (B.1.3) yang sama sebelum ship. Tambah cost/latency tanpa delta kualitas jelas di eval harness = jangan dilanjut.

---

## Bagian D — Urutan Eksekusi Teknis (ringkas)

1. **B.1** Eval harness + baseline (fondasi wajib, tidak bisa dilewati).
2. **B.2** Perketat Pass 2 (cheap win, paralel dengan #1 kalau resource ada).
3. **C.1** Archetype library (murah, fondasi C.2/C.4).
4. **C.2** Adversarial critique pass (prioritas tinggi kalau eval nunjukin Pass 1 masih generik).
5. **C.4** Stress test scoring (reuse C.1).
6. **C.3** Early warning signals.
7. **C.5** Timeline/velocity.
8. **C.6** Self-consistency calibration (paling akhir, evaluasi cost/latency untuk publik).
9. Baru setelah core stabil: production-readiness untuk launch (observability pipeline, review rate limit untuk skala publik, error handling jujur — bukan silent fallback).

Tiap langkah: ukur delta terhadap baseline B.1 sebelum lanjut. Jangan gabung dua mekanisme sekaligus tanpa tahu mana yang berkontribusi.

---

## Bagian E — Definition of Done
Sebuah analisis dianggap selesai bukan ketika AI selesai generate teks, tapi ketika: report berhasil dibuat, blind spot utama teridentifikasi, failure chain bisa dipahami, dan user memperoleh perspektif baru soal idenya — sesuai reaksi sukses yang jadi tolok ukur sejak awal: *"Belum kepikiran,"* bukan *"Ini AI copy-paste startup advice."*

---

## Bagian F — Belum Diputuskan
- Golden test set: ditulis manual, atau dibantu generate + dikurasi?
- LLM-as-judge: model sama dengan Pass 1/2, atau model terpisah?
- Retry loop Pass 2: berapa kali maksimal sebelum fallback ke error jujur?
- Archetype library: taksonomi tetap manual, atau sebagian model-generated + direview?
- C.3–C.5: jadi blok baru di UI, atau internal/metadata dulu sambil diuji dampaknya?
- C.6: default untuk semua user publik, atau opsi terpisah (trade-off cost/latency)?
