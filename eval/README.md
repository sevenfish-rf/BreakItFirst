# Eval harness (local BYOK)

Fondasi masterplan **B.1** — ukur kualitas report sebelum/sesudah ubahan prompt.

## Isi folder

| Path | Fungsi |
|------|--------|
| `golden/*.json` | 5 ide tes (generated) |
| `rubric.md` | Lembar nilai manual (0/1/2 per kriteria, max 34) |
| `score-template.json` | Template skor |
| `assertions.ts` | Cek struktural otomatis (regresi §5) |
| `run-baseline.ts` | Runner pipeline + simpan raw |
| `baselines/<run_id>/` | Output tiap run (auto-created) |

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
