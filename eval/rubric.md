# Manual scoring rubric — BreakItFirst eval

Skor tiap run golden set dengan checklist ini.  
**Skala per kriteria:** `0` = gagal / buruk · `1` = sebagian · `2` = bagus  
**Skala per blok:** rata-rata kriteria di blok itu (0–2), atau catat total poin / max.

Isi skor di `eval/baselines/<date>/scores/<fixture-id>.json` (template di `score-template.json`).

Sumber: tabel Baik/Buruk di [`../docs/01-product.md`](../docs/01-product.md) §4.

> ## ⚠ Rubrik ini saturasi — baca sebelum memakai skornya
>
> Tiga run `eval/baselines/2026-07-16_*` semuanya mendapat **33–34 dari 34**
> dengan **nol** hard fail dan **nol** soft fail; summary run itu sendiri menulis
> *"ceiling already high at 33.8"*. Artinya rubrik ini **tidak bisa mendeteksi
> regresi** dalam rentang yang penting: perubahan prompt bisa menggeser hinge
> sepenuhnya dan totalnya tetap ~34.
>
> Untuk pertanyaan "apakah hinge-nya stabil / berubah", pakai
> **`npm run eval:stability`** (`eval/stability.ts`) — ia membandingkan **label
> SPOF** antara ide asli dan parafrasenya, bukan skor. Rubrik ini tetap berguna
> untuk memeriksa satu laporan secara kualitatif, bukan untuk mengukur delta.
>
> **Cakupan diperluas 2026-07-30.** Sebelumnya rubrik ini hanya menilai 7 blok
> (max 34) dan mengabaikan `stress_test`, `failure_velocity`, `self_consistency`,
> serta F1/F2/F3 — padahal semuanya sudah shipped dan dirender. Blok T / V / X / F
> di bawah menutup lubang itu. **Total berubah: 48 (standard) / 52 (deep).**
> Skor 34 dari run 2026-07-16 karena itu **tidak** bisa dibandingkan langsung
> dengan skor baru — bandingkan per blok, atau catat keduanya sebagai persentase.

---

## Cara pakai (manual)

1. Jalankan `npm run eval:baseline` (local BYOK) → raw analysis masuk `eval/baselines/.../raw/`.
2. Buka raw JSON + ide di golden fixture.
3. Copy `eval/score-template.json` → `scores/<id>.json`, isi angka + notes.
4. (Opsional) hitung rata-rata blok di notes keseluruhan.

**Tes spesifisitas (wajib mental check):** ganti nama produk di kepala — apakah SPOF/assumptions masih “benar” untuk startup sejenis lain? Kalau iya → skor spesifisitas rendah.

---

## Summary (max 4 pts)

| ID | Kriteria | 2 | 0 |
|----|----------|---|---|
| S1 | Paham ide | User bilang “iya, itu idenya” | Salah market / model bisnis |
| S2 | Spesifik | Menyebut mekanisme unik input | Bisa dipakai 100 startup lain |

Bukan summary: saran fitur, kritik panjang, “ide bagus jika…”.

---

## Assumptions (max 6 pts)

| ID | Kriteria | 2 | 0 |
|----|----------|---|---|
| A1 | Fragile / bisa digoyang | Bukan truisme (“butuh user”) | Truisme / kosong makna |
| A2 | Spesifik ke ide | Tied ke model/user/constraint | Sama untuk semua SaaS/marketplace |
| A3 | Bentuk | 5–10 item, satu klaim jelas per baris | Di luar range atau bertele-tele |

---

## SPOF (max 6 pts)

| ID | Kriteria | 2 | 0 |
|----|----------|---|---|
| P1 | Idea-specific | User “iya, itu yang rawan”; ganti nama → hancur | Copy-paste kompetitor mana saja |
| P2 | Kausal | explanation = mekanisme | Moral / motivasi / “kurang eksekusi” |
| P3 | Selaras | Nyambung assumptions atas + cascade | Bertentangan total dengan cascade |

---

## Cascade (max 6 pts)

| ID | Kriteria | 2 | 0 |
|----|----------|---|---|
| C1 | Domino | Baca top→bottom sebab-akibat | Bisa diacak tanpa beda arti |
| C2 | Terhubung SPOF | Mulai dekat SPOF/asumsi kritis | “Dunia lain” dari SPOF |
| C3 | Panjang & end state | 7–12 langkah, end state jelas | Terlalu pendek/generik / loncat magis |

---

## Failure modes (max 4 pts)

| ID | Kriteria | 2 | 0 |
|----|----------|---|---|
| M1 | Risk statements | Bullet pendek, domain benar | Esai / bucket salah domain |
| M2 | Konsisten SPOF | SPOF muncul di 1–2 domain relevan | Random, tidak nyambung ide |

---

## Likelihood (max 4 pts)

| ID | Kriteria | 2 | 0 |
|----|----------|---|---|
| L1 | Reason bermakna | Merujuk mekanisme di report | Generik / kosong |
| L2 | Konsisten end state | Band masuk akal vs cascade | Very Low + shutdown total tanpa mitigasi |

---

## Resilience (max 4 pts)

| ID | Kriteria | 2 | 0 |
|----|----------|---|---|
| R1 | Profil bergelombang | Dimensi beda-beda masuk akal vs SPOF | Semua ~50 atau semua ~90 |
| R2 | Dimensi SPOF | Dimensi terkait SPOF cenderung rendah | SPOF trust-rapuh tapi trust tinggi |

**Dilarang:** overall single danger/resilience score di produk.

---

## Stress test (max 4)

Blok `stress_test.items` — tiap item = satu archetype (`src/lib/archetypes.ts`)
dengan `verdict` (`Yes` / `Maybe` / `No`) + `reason`.

| ID | Kriteria | 2 | 0 |
|----|----------|---|---|
| T1 | Reason menyentuh mekanisme ide | Merujuk SPOF/cascade/asumsi konkret dari report ini | Definisi archetype diulang, ide tidak disebut |
| T2 | Verdict diskriminatif | Campuran masuk akal; archetype yang jelas tidak relevan dapat `No` | Semua `Yes` atau semua `Maybe` (tidak memilih apa pun) |

**Catatan:** `Maybe` di semua baris adalah kegagalan yang paling mudah lolos —
terlihat berhati-hati, padahal tidak menyatakan apa pun.

---

## Failure velocity (max 4)

| ID | Kriteria | 2 | 0 |
|----|----------|---|---|
| V1 | Band konsisten dengan cascade | `Fast` untuk rantai yang runtuh dalam hitungan minggu; `Slow` untuk erosi bertahun | `Fast` padahal cascade butuh siklus penjualan panjang, atau sebaliknya |
| V2 | Reason spesifik waktu | Menyebut apa yang menentukan kecepatan (batch overnight, siklus refresh, net-60, musim) | "Bisa cepat kalau tidak ditangani" |

---

## Self-consistency (max 4, **hanya deep mode**)

Blok `self_consistency` bersifat optional dan hanya ada saat Pass 1 dijalankan
2x. **Standard mode: tulis `null`, bukan 0**, dan pakai denominator 48.

| ID | Kriteria | 2 | 0 |
|----|----------|---|---|
| X1 | `spof_agreement` jujur | `Low`/`Medium` ketika `candidate_spofs` memang berbeda mekanisme | Selalu `High` padahal kandidatnya tidak berhubungan |
| X2 | `candidate_spofs` bermakna | Kandidat = mekanisme berbeda yang sama-sama plausibel | Parafrase satu hinge yang sama, atau daftar generik |

---

## Field F1/F2/F3 (max 6)

| ID | Kriteria | 2 | 0 |
|----|----------|---|---|
| F1 | `critical_assumption_indices` | Menunjuk asumsi yang benar-benar menopang SPOF; kalau asumsi itu jatuh, SPOF ikut | Menunjuk asumsi acak / paling umum |
| F2 | `point_of_no_return_index` | Berada di langkah yang memang ireversibel (uang keluar, data hilang, reputasi publik) | Di langkah 0 / langkah terakhir, atau di tempat yang masih bisa dibatalkan |
| F3 | `compounding_note` | Menambah interaksi antar-domain yang belum ada di cascade | Mengulang cascade dengan kata lain |

**Tes F2 (mental check):** tanya "sesudah langkah ini, apakah masih ada jalan
pulang yang murah?" Kalau masih ada, indexnya terlalu awal.

---

## Global product checks (pass/fail, bukan 0–2)

| ID | Check | Pass jika |
|----|--------|-----------|
| G1 | Bukan template | Ganti nama produk → SPOF/assumptions **tidak** tetap valid |
| G2 | Bukan coach | Tidak ada motivational / “kamu harus…” sebagai inti report |
| G3 | Blind spot | Setidaknya satu insight yang “belum kepikiran” (subjektif scorer) |

---

## Skor total

| Blok | Max |
|------|-----|
| Summary (S1–S2) | 4 |
| Assumptions (A1–A3) | 6 |
| SPOF (P1–P3) | 6 |
| Cascade (C1–C3) | 6 |
| Failure modes (M1–M2) | 4 |
| Likelihood (L1–L2) | 4 |
| Resilience (R1–R2) | 4 |
| Stress test (T1–T2) | 4 |
| Failure velocity (V1–V2) | 4 |
| Field F1/F2/F3 | 6 |
| **Subtotal (standard mode)** | **48** |
| Self-consistency (X1–X2, deep only) | 4 |
| **Total (deep mode)** | **52** |

- Catat juga `assertions_passed` dari runner (otomatis structural)
- Baseline = raw + scores; improvement diukur delta **per blok** vs baseline folder sebelumnya
- Skor lama (max 34, run 2026-07-16) bukan pembanding langsung — lihat peringatan di kepala file
- Skor ini menilai **satu laporan**. Untuk pertanyaan "apakah hinge stabil", pakai
  `npm run eval:stability` (jalankan `npm run eval:hinge-check` dulu — preflight
  offline, tidak butuh kredensial)
