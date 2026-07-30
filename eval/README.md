# Eval harness (local BYOK)

Fondasi masterplan **B.1** — ukur kualitas report sebelum/sesudah ubahan prompt.

## Isi folder

| Path | Fungsi |
|------|--------|
| `golden/*.json` | 5 ide tes (generated) |
| `golden-variants/*.json` | 3 tulisan-ulang per fixture `golden` — `para` (parafrase penuh), `strip` (nama merek/kota/pembanding dibuang, struktur & angka tetap), `flip` (fakta sama, urutan dibalik + gaya pitch) |
| `theme-keywords.json` | Kosakata stem per tema SPOF — dipakai screen otomatis |
| `rubric.md` | Lembar nilai manual (0/1/2 per kriteria, max **48** standard / **52** deep) |
| `score-template.json` | Template skor |
| `assertions.ts` | Cek struktural otomatis (regresi §5) |
| `run-baseline.ts` | Runner pipeline + simpan raw |
| `stability.ts` | Runner original vs tiap tulisan-ulang; verdict otomatis atas **tema SPOF**, bukan skor |
| `hinge-labels.ts` | Pemetaan SPOF → tema + pembanding verdict |
| `hinge-check.ts` | Preflight offline: bentuk fixture + screen tidak degenerate |
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

Optional: `BIF_LOCALE=en`, `BIF_ONLY=01-marketplace-pet-sitting` (satu fixture), `BIF_DEEP=1` (C.6 deep analysis). Khusus stability: `BIF_KINDS`, `BIF_REF`, `BIF_STABILITY_GATE`.

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
4. Bandingkan **per blok** antar run — bukan total. Total 34 dari run
   2026-07-16 memakai 7 blok; sejak 2026-07-30 rubrik menilai 10 blok
   (48 standard / 52 deep), jadi total lama dan baru bukan pembanding langsung.

**Tidak ada LLM-as-judge di sprint ini** — scoring manusia.

## Uji stabilitas SPOF (Q10)

Rubrik lama 34 poin sudah **saturasi**: tiga run `2026-07-16_*` semua 33–34/34,
nol hard/soft fail, dan summary run itu sendiri menulis *"ceiling already high at
33.8"*. Skor karena itu tidak bisa mendeteksi keluhan dogfood soal SPOF yang
goyah — bahkan setelah rubrik diperluas ke 48 poin, yang diukurnya tetap satu
laporan, bukan kestabilan antar laporan. Yang bisa: jalankan mekanisme yang sama
beberapa kali — versi asli (`golden/`) dan tiap tulisan-ulang
(`golden-variants/`) — lalu bandingkan **tema hinge**-nya.

Tiga jenis tulisan-ulang, masing-masing menyerang satu cara hinge bisa jadi
artefak teks, bukan artefak ide:

| Kind | Yang diubah | Pertanyaan yang dijawab |
|------|-------------|-------------------------|
| `para` | Semua kata diganti, tidak ada frasa khas yang dibawa | Hinge menempel pada kosakata? |
| `strip` | Nama merek, pembanding, dan nama tempat dibuang; semua angka & relasi struktural tetap | Hinge menempel pada merek/geografi yang dikenali? |
| `flip` | Fakta identik, urutan penyajian dibalik, gaya jadi pitch founder | Hinge menempel pada apa yang kebetulan disebut pertama? |

**Sebelum membakar kredit provider**, jalankan preflight offline:

```bash
npm run eval:hinge-check
```

Ia menolak fixture yang kurang satu kind, variant yatim, tema tanpa stem, dan —
yang paling penting — screen yang degenerate. Kalau satu stem terlalu lebar,
semua hinge memetakan ke satu tema dan drift-nya selalu nol, yang **terlihat
seperti sukses**. Dua probe di dalamnya memastikan screen masih memisahkan hinge
yang cuma diparafrase dari hinge yang benar-benar beda.

```bash
npm run eval:stability
# satu fixture saja:
BIF_ONLY=05-hardware-fitness-ring npm run eval:stability
# satu jenis tulisan-ulang saja:
BIF_KINDS=strip npm run eval:stability
# sekalian diff ke label baseline lama:
BIF_REF=2026-07-16_230859 npm run eval:stability
# gate untuk CI — exit code 1 kalau ada hinge yang bergeser:
BIF_STABILITY_GATE=1 npm run eval:stability
```

Env sama seperti baseline, plus opsional `BIF_REF`, `BIF_KINDS`,
`BIF_STABILITY_GATE`. Satu run penuh = 5 fixture × 4 analisis = 20 analisis
(60+ panggilan provider), jadi pakai `BIF_ONLY`/`BIF_KINDS` untuk uji coba.

Hasil:

- `eval/stability/<timestamp>/raw/<id>.json` — analysis lengkap tiap sisi
- `eval/stability/<timestamp>/summary.json` — label terstruktur (ditulis ulang setiap grup selesai, jadi run yang mati di tengah tidak kehilangan hasil sebelumnya)
- `eval/stability/<timestamp>/REPORT.md` — tabel berdampingan + verdict per tulisan-ulang + rollup per kind

**Verdict otomatis, tapi hanya screen.** Runner memetakan SPOF ke tema
(`hinge-labels.ts` + `theme-keywords.json`) lalu membandingkan tema, bukan
string — jadi `"OEM-owned firmware"` dan `"vendor firmware dependency"` keluar
`same`, yang tidak mungkin didapat dari diff string. Empat nilai:

| Verdict | Arti |
|---------|------|
| `same` | Tema terkuat kedua sisi sama → **tidak ada drift terdeteksi** |
| `partial` | Tema terkuat bergeser tapi himpunan tema masih beririsan |
| `shift` | Himpunan tema disjoint → ini sinyal drift-nya |
| `unmatched` | Ada sisi yang tidak match stem apa pun; screen abstain, wajib dibaca manusia |

Batasnya harus dinyatakan: **tema lebih kasar daripada hinge.** Dua mekanisme
yang benar-benar berbeda tapi masih di satu tema (biaya retur vs biaya komponen,
dua-duanya `margins`) juga keluar `same`. Jadi baca `same` sebagai *tidak
terdeteksi bergeser*, bukan *identik*. Verdict ditulis ke REPORT.md sebagai
default yang boleh ditimpa — untuk pasangan yang menentukan keputusan, tetap baca
prose SPOF di `raw/`, timpa verdict-nya, lalu update Q10 di
`docs/04-refine-backlog.md` bersama model id-nya (angka stabilitas tanpa model id
tidak bisa dibandingkan dengan run berikutnya).

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
