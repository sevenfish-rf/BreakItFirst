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
| `locale-flip.ts` | Ide sama dijalankan `en` vs `id`; diff tiga band enum (K7) |
| `collision-check.ts` | Offline: 5 ide berbeda → 5 hinge berbeda? (diskriminasi, N2) |
| `input-integrity.ts` | Offline: `meta.idea_input` byte-identik dengan teks yang dikirim? (N7/E21) |
| `input-repro.ts` | Chromium sungguhan → `/app`: textarea + state React + body POST byte-identik? (K8/Q18) |
| `read-traces.ts` | Baca dump `.breakitfirst-traces/` (`BIF_TRACE=1`) → hinge per draft + drift antar run |
| `provider-host.ts` | `hostOf()` — satu-satunya tempat yang memutuskan bagaimana endpoint provider boleh dicatat (host saja, tanpa scheme/path/kredensial) |
| `provider-check.ts` | Preflight provider ~2 call: /models + 1 chat + 1 JSON-mode sebelum run mahal |
| `baselines/<run_id>/` | Output tiap run baseline (auto-created) |
| `stability/<run_id>/` | Output tiap run stabilitas (auto-created) |
| `input-repro/<run_id>/` | Output repro browser — berisi teks ide + body POST, **gitignored, lokal saja** |

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

Env template: `eval/env.example` (file ini **ikut ter-commit** — isinya placeholder saja, jangan pernah endpoint atau key sungguhan).

Semua run artifact hanya mencatat **host** provider (`models.host`), bukan base URL penuh, dan tidak pernah API key — satu-satunya tempat yang memutuskan ini: `eval/provider-host.ts` (`hostOf()`). Summary lama masih menyimpan field `baseUrl`; `compare-baseline.ts` menerima keduanya supaya run lama tetap bisa dibandingkan.

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

Sejak Q20 (2026-08-01) preflight juga menjaga hal ketiga: screen yang **bohong**.
Dulu stem dicocokkan sebagai substring biasa, jadi `rma` menyala di dalam
"info*rma*tion" dan `bot` di dalam "*bot*h" — satu tema bisa menang atas prosa
yang tidak pernah menyebutnya. Sekarang stem punya batas kata (`bot` = kata utuh,
`verif*` = awalan), stem panjang berbobot lebih besar, dan seri **dilaporkan
sebagai grup**, bukan dipilih menurut alfabet. Probe permanen: 12 kasus tata-bahasa
stem (tiap satu adalah misfire nyata yang pernah ditemukan di `raw/` on disk),
4 kasus perilaku seri, dan 7 kasus assertion `likelihood_not_percent` — dipatok
**dua arah**, supaya menyempitkan aturan itu tidak diam-diam melewatkan klaim
"70% chance" yang asli.

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
`same`, yang tidak mungkin didapat dari diff string. Lima nilai:

| Verdict | Arti |
|---------|------|
| `same` | Grup tema terkuat kedua sisi beririsan → **tidak ada drift terdeteksi** |
| `partial` | Grup terkuat disjoint tapi himpunan tema lengkap masih beririsan |
| `swap` | Grup disjoint, tapi **dua-duanya** berisi tema yang fixture-nya sendiri deklarasikan → osilasi co-valid pada ide yang memang rapuh di beberapa sisi, bukan frame escape (Q15). Dihitung dan ditampilkan, **tidak** di-gate |
| `shift` | Grup disjoint **dan** ada sisi yang keluar dari expected set fixture → ini sinyal drift-nya, satu-satunya yang di-gate |
| `unmatched` | Ada sisi yang tidak match stem apa pun; screen abstain, wajib dibaca manusia |

Yang dibandingkan adalah **grup tema dengan skor tertinggi**, bukan satu
pemenang: kalau bukti seri, `primary` mengaku seri (`null`) dan grupnya yang
dibandingkan. Sebelum Q20 seri diputus menurut alfabet — 49 dari 109 primary yang
pernah tercatat diputus begitu — yang membuat `partial` menggelembung dan `swap`
vs `shift` tidak bisa dipercaya. Konsekuensinya untuk pembacaan: aturan grup
membuat screen **lebih kecil** kemungkinannya mengarang drift, dan karenanya
**lebih besar** kemungkinannya melewatkan drift halus. Arah itu dipilih sengaja —
`shift` palsu berujung revert engine, `shift` yang terlewat cuma berujung baca
prosa lebih teliti.

Batasnya harus dinyatakan: **tema lebih kasar daripada hinge.** Dua mekanisme
yang benar-benar berbeda tapi masih di satu tema (biaya retur vs biaya komponen,
dua-duanya `margins`) juga keluar `same`. Jadi baca `same` sebagai *tidak
terdeteksi bergeser*, bukan *identik*. Verdict ditulis ke REPORT.md sebagai
default yang boleh ditimpa — untuk pasangan yang menentukan keputusan, tetap baca
prose SPOF di `raw/`, timpa verdict-nya, lalu update Q10 di
`docs/04-refine-backlog.md` bersama model id-nya (angka stabilitas tanpa model id
tidak bisa dibandingkan dengan run berikutnya).

## Uji drift locale (K7)

Keluhan dogfood K7 ("Bahasa menggeser hasil"): ide yang **sama** bisa keluar
band berbeda tergantung locale output — `id` pernah lebih alarmis dari `en` pada
ide identik, dan itu **belum pernah diukur**. Harness ini instrumen N1-nya:
untuk tiap golden ia menjalankan teks ide yang identik dua kali — sekali `en`,
sekali `id` — mode dijaga konstan (standard, atau deep kalau `BIF_DEEP=1`).
Hanya arahan bahasa yang berubah, jadi pasangannya mengisolasi efek locale.

Yang dibandingkan: tiga **band enum** yang model wajib keluarkan dalam bahasa
Inggris di **kedua** locale (`languageDirective` menjaga enum tetap Inggris,
hanya prose yang diterjemahkan) → langsung dapat dibandingkan lintas locale:

- `single_point_of_failure.confidence`
- `likelihood.band`
- `failure_velocity.band`

```bash
npm run eval:locale-flip
# satu fixture saja (mulai dari sini untuk hemat kredit):
BIF_ONLY=01-marketplace-pet-sitting npm run eval:locale-flip
# mode deep di kedua sisi:
BIF_DEEP=1 npm run eval:locale-flip
# gate CI — exit 1 kalau ada fixture yang band-drift:
BIF_LOCALE_GATE=1 npm run eval:locale-flip
```

Verdict: `stable` (ketiga band sama lintas locale) atau `band-drift` (satu+
berbeda; tiap pergeseran dinamai, mis. `likelihood: High → Very High`). SPOF
`component`/`explanation` adalah prose dan beda per bahasa — ditampilkan
berdampingan untuk dibaca manusia, **bukan** verdict.

**Yang tidak bisa diukurnya:** satu pasang en/id tidak bisa memisahkan drift
locale dari noise run-to-run biasa (confound yang sama seperti kerja stabilitas
SPOF). Baca `band-drift` sebagai **layar untuk diselidiki** — di samping noise
same-locale yang sudah diukur — bukan bukti. Ulangi pasangannya untuk yakin, dan
**jangan** edit `prompts.ts` dari satu run. Catat count + model id di Q16
(`docs/04-refine-backlog.md`). Fix produk K7 (arahan locale-invariance di
`prompts.ts`) ditunda ke Phase B, digerbang oleh angka-angka run ini.

Hasil: `eval/locale-flip/<timestamp>/` — `raw/<id>.<locale>.json` (lokal saja,
gitignored), `summary.json`, `REPORT.md`.

## Uji diskriminasi lintas-ide (N2)

Stabilitas dan diskriminasi adalah **dua sumbu yang berbeda**, dan sampai N2 kita
hanya mengukur satu. Harness stabilitas bertanya *"hinge tetap di tempat kalau
cuma kata-katanya diubah?"*. Ini bertanya kebalikannya: *"lima ide yang
benar-benar berbeda menghasilkan lima hinge berbeda, atau engine terus meraih
kegagalan familiar yang sama?"* Engine yang menjawab "flat pricing tanpa cost
guard" untuk produk API **dan** untuk SaaS wiki bukan menganalisis ide — ia
mencocokkan template, dan **setiap angka stabilitas yang kita punya akan menilai
itu sebagai sempurna stabil.**

Membaca run baseline yang **sudah ada** di disk. Tidak ada panggilan provider,
tidak ada kredit terpakai.

```bash
npm run eval:collision-check
# run tertentu (default: run terbaru):
BIF_BASELINE=2026-07-31_134152 npm run eval:collision-check
# gate CI — exit 1 kalau ada pasangan yang collision:
BIF_COLLISION_GATE=1 npm run eval:collision-check
```

Default-nya run **terbaru**, jadi kalau run terbaru dijalankan dengan `BIF_ONLY`
(satu fixture) harness ini **gagal keras** — *"Need at least 2 usable fixtures"* —
dan itu memang yang diinginkan: "0 collision atas 0 pasangan" akan terbaca
seperti lulus padahal tak mengukur apa pun. Sebut `BIF_BASELINE=<run_id>` run
5-fixture terakhir kalau run terbaru cuma satu fixture.

Dua sinyal independen, karena masing-masing menutup blind spot yang lain: **tema
primer sama** (kelas kegagalan yang sama walau kata-katanya beda) dan **overlap
token tinggi** (prose yang sama walau temanya beda). Verdict per pasangan:
`collision` (kedua sinyal menyala — ini yang digerbang, kriteria lulus N2 = 0),
`echo` (satu sinyal saja; dibaca, tidak menggerbang), `distinct`.

**Batasnya:** overlap token itu leksikal, tema lebih kasar daripada hinge, dan
fixture 01 & 03 memang **sengaja** berbagi `trust`/`liability` di expected set-nya
— jadi tema yang sama di antara keduanya jauh lebih tidak mengejutkan daripada
antara 02 & 04. Baca `collision` sebagai *"pergi baca dua SPOF ini
berdampingan"*, dan baca 0 collision sebagai *"tidak terdeteksi template"*,
**bukan** *"lima analisis independen terkonfirmasi"*. Catat count + baseline id di
Q17 (`docs/04-refine-backlog.md`).

## Invarian integritas input (N7/E21)

K8 melaporkan **ide yang korup di dalam report yang sudah dikirim** — spasi hilang
di sambungan, kata terpotong di tengah token (`"masihenyambungkan"`,
`"kongevaluasi"`, `"keounder"`). Ide korup yang dianalisis dengan badge High
adalah cacat yang lebih buruk daripada ide tipis yang dianalisis dengan High, dan
sebelum ini **tidak ada apa pun yang memeriksanya**.

K8 sendiri memerintahkan *"reproduksi dulu, jangan tebak"*, jadi harness ini
mengubah setiap run baseline yang sudah ada di disk menjadi bukti: untuk tiap
fixture ia membandingkan `analysis.meta.idea_input` dengan `idea` di fixture
golden karakter per karakter, dan pada mismatch mencetak divergensi **pertama**
beserta jendela di kedua sisinya — bentuk dari apa yang hilang, bukan cuma fakta
bahwa ada yang hilang.

Offline. Tanpa panggilan provider.

```bash
npm run eval:input-integrity
# run tertentu (default: semua run di eval/baselines/):
BIF_BASELINE=2026-07-31_134152 npm run eval:input-integrity
```

Exit code non-nol pada mismatch apa pun — ini **invarian, bukan screen**.
Pasangannya di runtime adalah restamp di `pipeline.ts`: kalau `meta.idea_input`
ternyata tidak byte-identik dengan input tervalidasi, pipeline menimpanya
kembali dari input (slip metadata tidak boleh membuang satu analisis berbayar)
lalu mencatat warning dev supaya regresinya terlihat, bukan senyap.

**Cakupannya, dibaca sebelum memercayai run yang hijau:** ini membuktikan jalur
**server** (body POST → `validateAnalyzeInput` → pipeline → `meta.idea_input`)
lossless atas teks fixture. Ia **tidak bisa melihat jalur input browser**, yang
justru tempat paling mungkin korupsi K8 masuk — harness memposting string
fixture langsung dan tidak pernah menyentuh textarea. Baseline saja: run
stability dan locale-flip memakai varian yang sengaja ditulis ulang, jadi diff di
sana adalah rewrite-nya, bukan korupsi. Dan fixture terpanjang kita jauh lebih
pendek dari paste ~6000 karakter tempat K8 muncul, jadi run hijau **tidak**
membebaskan regime input panjang.

## Repro input browser (K8)

Bagian yang **tidak bisa** dilihat harness di atas: jalur input **browser**.
Harness ini menjalankan Chromium sungguhan ke route `/app`, mengetik/menempel
satu string sumber **6000 karakter** (panjang yang sama dengan paste tempat K8
muncul), lalu membandingkan byte per byte tiga hal: isi `<textarea>`, **jumlah
karakter yang dirender React** (state, bukan DOM), dan field `idea` di body POST
yang benar-benar dikirim.

`POST /api/analyze` dicegat lalu di-abort, jadi **0 panggilan provider, $0** —
tidak mungkin memakai waktu GPU Modal.

Butuh server yang **kamu kendalikan** (bukan port yang dipegang dev server lain):

```bash
npm run build && npx next start -p 3010
BIF_APP_URL=http://127.0.0.1:3010/app npm run eval:input-repro
# satu skenario saja:
BIF_REPRO_SCENARIOS=paste npm run eval:input-repro
# panjang lain / gate CI:
BIF_REPRO_CHARS=8000 BIF_REPRO_GATE=1 npm run eval:input-repro
```

Env lain: `BIF_REPRO_WRAP` (kolom hard-wrap, default 72),
`BIF_REPRO_TYPE_TIMEOUT_MS` (plafon satu `pressSequentially`; default 30s
Playwright bukan anggaran untuk ribuan keystroke).

Tiga skenario: `paste` (clipboard nyata + `Ctrl+V`), `type` (6000 key event
sungguhan), `type-loaded` (sama, tapi main thread disibukkan ~10ms tiap frame —
kontensi yang dibutuhkan hipotesis K8). Sumbernya deterministik dan bertanda
posisi (`[m0000]…`), jadi potongan yang hilang **menyebut sendiri** offset-nya.

**Pelajaran yang lebih penting dari hasilnya: perbandingan berbasis DOM bisa lulus
melawan halaman mati.** Halaman yang ter-render tapi **belum pernah hydrate** tetap
menerima teks ke DOM dan mengembalikan 6000 karakter penuh dari `inputValue()`,
padahal state React kosong dan tidak ada POST yang pernah terbang. Di artifact
`eval/input-repro/2026-07-31_15_34_21` (`:3000`) kolom textarea-nya benar-benar
menulis `identical (6000 chars)` — run itu lolos dari verdict `clean` **hanya
karena tidak ada POST yang tertangkap**, kebetulan, bukan karena ada pemeriksaan
yang dirancang. Sekarang ada
`assertHydrated()` (membalik `button.switch`, menuntut `aria-checked` berubah,
kalau tidak: error dengan diagnosis "kemungkinan ada server lain memegang port
ini"), plus cross-check `reactCharCount` vs `expectedCharCount` masuk ke verdict,
dan run yang **seluruh** skenarionya inconclusive keluar dengan exit code non-nol
— tidak ada yang terukur adalah kegagalan alat, **bukan** hasil negatif.

Hasil run `eval/input-repro/2026-07-31_152244` (build produksi di `:3010`):
**3 clean · 0 lossy · 0 inconclusive** — textarea identik (6000), counter React
6000 sesuai harapan, body POST identik, di ketiga mode termasuk di bawah kontensi
main thread.

**Cakupannya, dibaca sebelum memercayai run hijau:** ini membuktikan jalur
browser → state React → body POST lossless **pada panjang ini, di mode ini, di
build Chromium ini**. Yang **tidak** tercakup: ritme mengetik manusia nyata, IME,
autocorrect, keyboard mobile; browser/perangkat lain di bawah tekanan memori;
textarea di bawah wrapper smooth-scroll (`ScrollSmoother` hanya dipasang di route
`/`, bukan `/app`); dan yang terpenting — **korupsi yang datang bersama teks yang
di-paste tidak terlihat di sini.** Kalau sumbernya sudah rusak saat dicopy, semua
lapisan meneruskan kerusakan itu dengan setia, dan hard-wrap yang hanya ada di
region korup laporan K8 justru konsisten dengan tepat skenario itu.

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
