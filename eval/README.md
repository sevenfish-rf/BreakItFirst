# Eval harness (local BYOK)

Fondasi masterplan **B.1** — ukur kualitas report sebelum/sesudah ubahan prompt.

## Isi folder

| Path | Fungsi |
|------|--------|
| `golden/*.json` | 5 ide tes (generated) |
| `golden-variants/*.json` | Parafrase penuh dari tiap fixture `golden` — mekanisme sama, kata-kata beda |
| `rubric.md` | Lembar nilai manual (0/1/2 per kriteria, max 34) |
| `score-template.json` | Template skor |
| `assertions.ts` | Cek struktural otomatis (regresi §5) |
| `run-baseline.ts` | Runner pipeline + simpan raw |
| `stability.ts` | Runner pasangan original↔parafrase; bandingkan **label SPOF**, bukan skor |
| `read-traces.ts` | Baca dump `.breakitfirst-traces/` (`BIF_TRACE=1`) → hinge per draft + drift antar run |
| `baselines/<run_id>/` | Output tiap run baseline (auto-created) |
| `stability/<run_id>/` | Output tiap run stabilitas (auto-created) |

## Setup env

```bash
# PowerShell example
$env:BIF_BASE_URL="https://api.openai.com/v1"
$env:BIF_API_KEY="sk-..."
$env:BIF_PASS1_MODEL="gpt-4o"
$env:BIF_PASS2_MODEL="gpt-4o-mini"
```

Optional: `BIF_LOCALE=en`, `BIF_ONLY=01-marketplace-pet-sitting` (satu fixture), `BIF_DEEP=1` (C.6 deep analysis).

## Jalankan

```bash
npm run eval:baseline
```

**PowerShell (interactive):**

```powershell
.\scripts\eval-baseline.ps1
# optional deep / single fixture:
.\scripts\eval-baseline.ps1 -Deep
.\scripts\eval-baseline.ps1 -Only "01-marketplace-pet-sitting"
```

Env template: `eval/env.example`

Hasil:

- `eval/baselines/<timestamp>/raw/<id>.json` — analysis + assertions
- `eval/baselines/<timestamp>/scores/<id>.json` — stub manual score
- `eval/baselines/<timestamp>/summary.json` — ringkas run

## Skor manual

1. Buka `rubric.md`
2. Baca `raw/<id>.json`
3. Isi `scores/<id>.json` (criteria 0|1|2, total_points)
4. Bandingkan total antar run = delta kualitas

**Tidak ada LLM-as-judge di sprint ini** — scoring manusia.

## Uji stabilitas SPOF (Q10)

Rubrik 34 poin sudah **saturasi**: tiga run `2026-07-16_*` semua 33–34/34, nol
hard/soft fail, dan summary run itu sendiri menulis *"ceiling already high at
33.8"*. Jadi skor tidak bisa mendeteksi keluhan dogfood soal SPOF yang goyah.
Yang bisa: jalankan mekanisme yang sama dua kali — versi asli (`golden/`) dan
versi parafrase penuh (`golden-variants/`) — lalu bandingkan label hinge-nya.

```bash
npm run eval:stability
# hanya satu pasangan:
BIF_ONLY=05-hardware-fitness-ring npm run eval:stability
# sekalian diff ke label baseline lama:
BIF_REF=2026-07-16_230859 npm run eval:stability
```

Env sama seperti baseline, plus opsional `BIF_REF=<baseline run_id>`.

Hasil:

- `eval/stability/<timestamp>/raw/<id>.json` — analysis lengkap kedua sisi
- `eval/stability/<timestamp>/summary.json` — label terstruktur (ditulis ulang setiap pasangan selesai, jadi run yang mati di tengah tidak kehilangan hasil sebelumnya)
- `eval/stability/<timestamp>/REPORT.md` — tabel berdampingan + kolom **Same hinge?** yang masih `TODO`

**Kolom `Same hinge?` diisi manusia**, bukan runner. `"OEM-owned firmware"` dan
`"vendor firmware dependency"` adalah hinge yang sama dengan kata berbeda —
tidak ada perbandingan string yang benar untuk itu. Baca prose SPOF di `raw/`
dulu, isi `yes` / `no` / `partial`, lalu update Q10 di
`docs/04-refine-backlog.md`.

## Baca trace mentah (Q9)

`BIF_TRACE=1` menulis prose mentah tiap pass ke `.breakitfirst-traces/`
(gitignored, **lokal saja** — isinya teks ide + output model penuh).

```bash
BIF_TRACE=1 npm run eval:baseline
npm run eval:traces
# atau folder lain:
npm run eval:traces -- path/ke/.breakitfirst-traces
```

Yang ditampilkan: SPOF final, `candidate_spofs` (hanya ada di mode deep), kutipan
kalimat hinge per pass (`pass1_a` / `pass1_b` / `pass1_5`), dan grup ide yang
ditrace lebih dari sekali beserta jumlah label berbeda.

**Batasnya jujur:** Pass 1 disuruh membuat 3 kandidat tapi hanya menuliskan
pemenangnya, jadi dua runner-up biasanya tidak ada di prose sama sekali dan tool
ini tidak bisa memunculkan yang tidak pernah ditulis. Yang bisa dipulihkan
adalah drift nyata: draft A vs draft B vs yang lolos Pass 1.5. Semua baris `~`
adalah hasil regex atas prose, bukan field skema.
