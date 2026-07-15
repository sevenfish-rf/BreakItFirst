# BreakItFirst — In Progress (dari masterplan)

**Sumber:** `docs/archive/masterplan.md`  
**Tanggal dibaca:** 2026-07-16  
**Status:** backlog aktif — keputusan F/Q **terkunci 2026-07-16**. Scope gelombang: **Wave 1–2 (B stabil)** saja; C.x belum.

---

## 0. Ringkasan review

Masterplan mengunci urutan yang benar: **eval dulu, baru “makin bagus”**. MVP UI/pipeline sudah jalan, tapi **kualitas core belum terukur**. Tanpa harness, setiap ubahan prompt/mekanisme C.x cuma tebakan.

| Area | Kondisi repo sekarang | Gap vs masterplan |
|------|----------------------|-------------------|
| Pipeline Pass 1 → Pass 2 | Ada (`pipeline.ts`) | Tidak ada Pass 1.5 / retry loop |
| Schema validation | Hand-rolled runtime checks (`schema.ts`) | Belum Zod; soft-check SPOF↔modes & resilience sanity belum ada |
| `cascadeLooksConnected` | Ada, log + warning saja | Soft-check lain (SPOF↔modes, resilience) belum; Pass 2 claim-guard belum otomatis |
| Eval harness | **Tidak ada** (`scripts/` kosong; no tests/golden) | B.1 sepenuhnya outstanding |
| Archetype / C.x | Tidak ada | Fase 2 tertunda sampai B stabil |
| Rubrik Baik/Buruk | Ada di `project-overview.md` | Belum diubah jadi scoring checklist / judge input |
| Regression checklist §5 | Dokumen saja | Belum automated assertion |

**Keputusan arsitektur yang dipegang (jangan dilanggar):**

1. Evaluation = infrastruktur, bukan Phase 4 (A.7).
2. Prioritas trade-off: Specificity → Reasoning → Depth → Honesty → … → Speed (A.5).
3. Filter fitur A.8 wajib untuk setiap mekanisme baru.
4. Cascade tetap **linear**; skor baru tidak digabung jadi one overall danger score (C.8).

---

## 1. Yang harus dikerjakan (urutan eksekusi)

Ikuti **Bagian D** masterplan. Jangan loncat ke C.x sebelum B.1 baseline ada.

### Wave 0 — Klarifikasi ✅ (terkunci 2026-07-16)

- [x] **F1** Golden set: **5 ide** (bukan 15–20), **di-generate** lalu di-kurasi ringan.
- [x] **F2** Scoring: **manual dulu**; LLM-as-judge belakangan.
- [x] **F3** Pass 2 retry: **maks 1**.
- [x] **F4** Archetype (nanti Wave 3): default sementara tetap manual seed — belum dikunci formal (C.x di luar scope sprint ini).
- [x] **F5** C.3–C.5: **langsung blok UI baru** saat diimplementasi (catatan untuk Wave 3+; bukan Wave 1–2).
- [x] **F6** C.6: belum dikunci terpisah; tetap defer (mahal) — default masterplan opt-in masih masuk akal.
- [x] **Q7** Eval: **local BYOK only** (tanpa CI secret).
- [x] **Q9** Scope sprint: **stop di B stabil** (Wave 1–2). Tidak lanjut C.1–C.2 di sprint ini.
- [x] Production-readiness (Wave 4) **di luar** sprint ini.

### Wave 1 — B.1 Eval harness (fondasi wajib, tidak boleh dilewati)

| ID | Task | Deliverable | Done when |
|----|------|-------------|-----------|
| **B.1.1** | Golden test set **5 ide** (generated) | `eval/golden/` atau `scripts/eval/fixtures/` — lintas kategori, mix fragile vs “kelihatan solid” | 5 fixture; 1 ide = 1 file JSON + expected focus notes (bukan expected full report) |
| **B.1.2** | Rubric → scoring checklist **manual** | Checklist per blok (Summary…Resilience) dari tabel Baik/Buruk `project-overview.md` | Bisa diisi skor manual per run (0–N / pass-fail per kriteria); **tanpa** LLM-as-judge dulu |
| **B.1.3** | Regression assertions | Otomatisasi checklist §5 `project-overview` | Script/assert jalan di struktur output (range field, no overall score, cascade length, dsb.) |
| **B.1.4** | Runner + baseline (**local BYOK**) | CLI/script: baca provider dari env/local, jalankan pipeline golden set, simpan raw + slot skor manual | **Baseline file** (raw analysis + skor manual per blok) sebelum improvement apapun |
| **B.1.5** | LLM-as-judge | — | **Out of scope** sprint ini (F2) |

**Aturan wave ini:** tidak ada commit “improve prompt” yang claim victory tanpa delta vs baseline B.1.4.

### Wave 2 — B.2 Perketat Pass 2 (cheap win; paralel B.1 jika resource)

| ID | Task | Deliverable | Done when |
|----|------|-------------|-----------|
| **B.2.1** | Runtime schema lebih ketat | Zod (atau setara) di server mengganti/melengkapi `validateFailureAnalysis` | Validasi = single source of truth; type inferensi selaras `types/analysis.ts` |
| **B.2.2** | Retry loop Pass 2 | **Maks 1** retry + error feedback spesifik ke model | Gagal validasi → 1× feedback issues → re-call; masih gagal → error jujur ke user (no silent fallback) |
| **B.2.3** | Soft-checks nyata | Extend `schema.ts` / soft layer: `cascadeLooksConnected` (sudah), + SPOF↔failure_modes, sanity resilience | Warning terstruktur di `PipelineSuccess.warnings`; log server |
| **B.2.4** | Guard klaim baru Pass 2 | Heuristic/check: field prose tidak boleh invent di luar Pass 1 (regresi §5) | Assertion di eval + soft/hard policy di pipeline (mulai soft) |

### Wave 3 — C.x Mekanisme pendalaman (**setelah** B stabil; **bukan** scope sprint ini)

Kerjakan **satu mekanisme per iterasi**, ukur delta vs baseline.  
**UI policy (F5):** C.3–C.5 **langsung jadi blok UI** saat diimplementasi (bukan metadata-only).

| Urutan | ID | Task | Catatan effort / dependensi |
|--------|-----|------|------------------------------|
| 1 | **C.1** | Archetype library (5–10 pola) sebagai knowledge inject ke Pass 1 | Statis dulu; fondasi C.2 & C.4 |
| 2 | **C.2** | Adversarial critique pass (“Pass 1.5”) | Prioritas tinggi **jika** baseline nunjukin Pass 1 generik |
| 3 | **C.4** | Stress test score (Ya/Mungkin/Tidak per archetype) + **UI block** | Reuse C.1; **jangan** merge ke resilience |
| 4 | **C.3** | Early warning `observable_signal` per node cascade + **UI** | Observasi, bukan saran (“sebaiknya…”) |
| 5 | **C.5** | Timeline/velocity band kualitatif + **UI** | Cepat/Sedang/Lambat + reason |
| 6 | **C.6** | Self-consistency calibration | Mahal; defer; prefer opt-in deep analysis |

**Guardrail C.8 saat implementasi:** cascade linear; multi-score tetap multi; regression + eval harness wajib lolos sebelum ship; cost tanpa delta kualitas = stop.

### Wave 4 — Production-readiness (setelah core stabil)

- Observability pipeline (latency/error per stage, warning rates).
- Review rate limit untuk skala publik.
- Error handling jujur end-to-end (sudah sebagian; audit ulang).
- **Bukan** silent fallback yang mengaburkan kegagalan analisis.

---

## 2. Work breakdown teknis (file/target kasar)

Ini peta implementasi **setelah** Wave 0; path bisa menyesuaikan saat PR.

```
docs/archive/masterplan.md     ← rujukan north star (jangan diedit ringan)
docs/archive/in-progress.md    ← file ini (update status tiap wave)
docs/project-overview.md       ← sumber rubrik + regression (read-only sumber; checklist di-port ke eval)

eval/ or scripts/eval/
  golden/                      ← B.1.1 fixtures
  rubric.md | rubric.ts        ← B.1.2
  assertions.ts                ← B.1.3
  run-baseline.ts              ← B.1.4
  baselines/YYYY-MM-DD.json    ← skor baseline

src/lib/schema.ts              ← B.2.x soft-checks + (atau) migrasi Zod
src/lib/pipeline.ts            ← B.2.2 retry; nanti C.2 pass 1.5
src/lib/prompts.ts             ← C.1 inject archetype; C.2 critique
src/types/analysis.ts          ← C.3–C.5 field schema (setelah F: UI vs metadata)
src/components/...             ← hanya jika F putuskan C.3–C.5 surface di UI
```

**Dependency npm yang mungkin masuk Wave 2:** `zod` (B.2.1). Eval runner bisa Node/tsx murni dulu tanpa test framework berat.

---

## 3. Keputusan terkunci (Wave 0)

| # | Keputusan |
|---|-----------|
| **F1** | Golden set = **5 ide**, **generated** (bukan 15–20 manual). |
| **F2** | Eval scoring = **manual rubric** dulu; LLM-as-judge belakangan. |
| **F3** | Pass 2 retry = **maks 1**. |
| **F5** | Saat C.3–C.5 dikerjakan nanti → **langsung blok UI baru**. |
| **Q7** | Eval runner = **local BYOK only**. |
| **Q9** | Sprint ini = **stop di B stabil** (Wave 1–2). |

**Masih longgar (non-blocking untuk Wave 1–2):**

| # | Topik | Default sementara |
|---|--------|-------------------|
| F4 | Archetype taxonomy (Wave 3) | Manual seed 7–10 |
| F6 | C.6 default vs opt-in | Opt-in / deep only |
| Q8 | Locale golden/rubric | **EN dulu** (boleh tambah 1 fixture ID nanti) |

---

## 4. Next actions (untuk agent / programmer)

**Siap dikerjakan sekarang (urutan disarankan):**

1. **B.1.1** — Generate + simpan **5 golden fixtures** (lintas kategori).
2. **B.1.2** — Port rubrik Baik/Buruk → **manual scoring checklist**.
3. **B.1.3** — Automated regression assertions (§5 project-overview).
4. **B.1.4** — Local BYOK runner + slot baseline (raw + skor manual).
5. Parallel murah: **B.2.1 Zod**, **B.2.2 1× retry**, **B.2.3 soft-checks**, **B.2.4 claim guard soft**.

**Jangan kerjakan di sprint ini:**

- C.1–C.6 (termasuk UI C.3–C.5) — ditunda sampai B stabil.
- LLM-as-judge.
- CI secret / server-side eval key.
- Fitur UI tema/animasi baru (di luar A.8 filter).
- Merge skor jadi overall danger meter.

---

## 5. Definition of Done (gelombang “B stabil”)

Gelombang fondasi dianggap selesai bila:

1. Golden set **5** + baseline (raw + skor manual) tersimpan dan reproducible via local BYOK.
2. Regression §5 punya automated assertions yang gagal bila schema/report “rusak”.
3. Pass 2: Zod + **max 1 retry** + soft-checks SPOF/cascade/modes/resilience ter-log.
4. Tidak ada mekanisme C.x yang di-ship tanpa delta terukur vs baseline.
5. Setiap analisis user masih lolos definisi E masterplan: report jadi, blind spot ketemu, failure chain terbaca, reaksi target = *“Belum kepikiran”*.

---

## 6. Changelog status (update di sini)

| Tanggal | Update |
|---------|--------|
| 2026-07-16 | File dibuat setelah deep review `masterplan.md`. |
| 2026-07-16 | Wave 0 dikunci: golden=5 generated; manual rubric; Pass2 retry=1; local BYOK; scope=B stabil; C.3–C.5 nanti = UI blocks. Siap mulai Wave 1. |
