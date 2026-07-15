# Manual scoring rubric — BreakItFirst eval

Skor tiap run golden set dengan checklist ini.  
**Skala per kriteria:** `0` = gagal / buruk · `1` = sebagian · `2` = bagus  
**Skala per blok:** rata-rata kriteria di blok itu (0–2), atau catat total poin / max.

Isi skor di `eval/baselines/<date>/scores/<fixture-id>.json` (template di `score-template.json`).

Sumber: tabel Baik/Buruk di `docs/project-overview.md`.

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

## Global product checks (pass/fail, bukan 0–2)

| ID | Check | Pass jika |
|----|--------|-----------|
| G1 | Bukan template | Ganti nama produk → SPOF/assumptions **tidak** tetap valid |
| G2 | Bukan coach | Tidak ada motivational / “kamu harus…” sebagai inti report |
| G3 | Blind spot | Setidaknya satu insight yang “belum kepikiran” (subjektif scorer) |

---

## Skor total

- **Blok quality:** S+A+P+C+M+L+R = **max 34**
- Catat juga `assertions_passed` dari runner (otomatis structural)
- Baseline = raw + scores; improvement diukur delta total / per blok vs baseline folder sebelumnya
