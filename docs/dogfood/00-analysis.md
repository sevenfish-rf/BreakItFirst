# 00 — Analisa dogfood (deep)

**Pertanyaan yang dijawab file ini:** setelah BreakItFirst menganalisa dirinya
sendiri lima kali, apa kekurangan nyata produk ini dan apa yang harus dikerjakan
berikutnya?

| | |
|--|--|
| **Sumber utama** | `1test.md`, `1test-deepanalyst.md`, `2test.md`, `2test-deepanalyst.md`, `3test-deepanalyst.md` (5 run, 1150 baris) |
| **Sumber triangulasi** | [`../03-quality-gap.md`](../03-quality-gap.md) suite A–E · [`../04-refine-backlog.md`](../04-refine-backlog.md) · [`../01-product.md`](../01-product.md) · `eval/` · `src/lib/{schema,input-validation,prompts}.ts` |
| **Ditulis** | 2026-07-30 |
| **Status** | analisa selesai · sebagian sudah jadi baris backlog dan sebagian sudah shipped — lihat kotak di bawah |
| **Sifat bukti** | self-referential (produk menilai dirinya), n=5, tanpa juri eksternal. Lihat §11 sebelum memakai ini sebagai justifikasi keputusan besar. |

> ### Status implementasi per 2026-07-30 (baca sebelum §6/§7)
>
> §6 dan §7 ditulis **sebelum** ada implementasi apa pun, dan penomoran ID yang
> diusulkan di §7 **tidak** sama dengan yang akhirnya dipakai di board. Peta yang
> benar:
>
> | Usulan di file ini | ID sebenarnya di `04-refine-backlog.md` | Status |
> |---|---|---|
> | N1 (`Q8` diusulkan) suite stabilitas | **Q10** + **Q14** | Instrumen **lengkap 2026-07-30**: 5 fixture × 3 tulisan-ulang (`para`/`strip`/`flip`) di `eval/golden-variants/`, verdict tema otomatis (`eval/hinge-labels.ts`), preflight offline `npm run eval:hinge-check`, gate CI `BIF_STABILITY_GATE=1`. **Run-nya masih blocked** — hanya butuh kredensial provider owner. Arti `strip`/`flip` berbeda dari rencana §6 N1 — lihat update di sana |
> | N2 (`Q9` diusulkan) collision check | belum ada ID | `todo` — belum dibangun |
> | N3 (`E19` diusulkan) `spof_candidates` top-level | — | **Frozen** oleh Q11: butuh ubah `prompts.ts` + `schema.ts`. Gantinya: **Q9** raw pass trace (`BIF_TRACE=1`) + **Q12** `npm run eval:traces`. Usulan id `E19` **tidak diadopsi**; id itu kini dipakai utang abuse di bawah |
> | N4 (`Q10` diusulkan) baseline ulang + re-score | **Q10** (bagian run) | Blocked; **lihat catatan saturasi di N4** — `eval:compare` atas skor rubrik tidak bisa menjawab pertanyaan N4. Rubrik diperluas 34 → 48/52 (`Q13`), yang menutup lubang cakupan tapi **tidak** membuat skor jadi alat ukur stabilitas |
> | N5/N6/N7/N8 | belum ada ID | belum dibangun; N6 masih butuh keputusan owner |
> | "utang abuse" (`Q11` diusulkan) | **E19** | `Q11` sudah dipakai untuk **engine freeze** (arahan owner 2026-07-30). Utang abuse dicatat sebagai **`E19`** di board 2026-07-30 — usulan `E19` untuk N3 tidak pernah diadopsi |
>
> Yang benar-benar shipped 2026-07-30: **Q8** run provenance di tiap report +
> export Markdown, **Q9** raw pass trace opt-in, **Q12** trace reader. Ketiganya
> lolos di bawah freeze karena hanya menambah provenance dan penangkapan data —
> tidak satu pun mengubah prompt, aturan schema, atau soft check.

Semua angka di file ini diambil langsung dari kelima laporan, bukan dari ingatan.
Nomor baris dicantumkan supaya tiap klaim bisa dicek ulang.

---

## 1. Korpus

| # | File | Locale | Kategori | Dibuat | Mode | Label SPOF |
|---|------|--------|----------|--------|------|------------|
| 1 | `1test-deepanalyst.md` | id (body EN) | SaaS | 2026-07-27 09:56 | Deep | Generic attack behind structured output |
| 2 | `1test.md` | id | SaaS | 2026-07-27 10:03 | Standard | Pemaksaan satu SPOF |
| 3 | `2test.md` | en | SaaS | 2026-07-29 09:03 | Standard | Forced single-hinge selection |
| 4 | `2test-deepanalyst.md` | id | SaaS | 2026-07-29 09:47 | Deep | Input underconstrained |
| 5 | `3test-deepanalyst.md` | en | **Business** | 2026-07-29 15:27 | Deep | Forced single-SPOF compression |

Catatan korpus:

- Run 1 dijalankan **7 menit sebelum** run 2 atas ide yang sama — jadi pasangan
  `1test-deep` / `1test` adalah perbandingan Deep-vs-Standard yang hampir
  terkontrol. Pasangan `2test` / `2test-deep` sama (44 menit, urutan terbalik).
- Run 5 satu-satunya yang dikategorikan **Business**, bukan SaaS. Ini penting:
  ia jadi satu-satunya titik uji sensitivitas kategori yang kita punya, dan
  hasilnya berbeda di dua tempat (§2.3, §2.5).
- Deskripsi ide antar run tidak identik. Run 3 memuat brief paling panjang dan
  paling eksplisit soal constraint (BYOK dev-only, pricing belum ditentukan,
  history browser-local, job server temporer, tanpa DB/akun permanen).
- Teks input di run 3 **korup di beberapa titik** — lihat K8.

---

## 2. Matriks bukti

### 2.1 SPOF, banding, dan PONR

| Run | Confidence | Likelihood | Velocity | PONR | Panjang cascade |
|-----|------------|------------|----------|-----:|----------------:|
| `1test` | **Very High** | High | **Fast** | 8 | 10 |
| `1test-deep` | High | High | Medium | 7 | 10 |
| `2test` | High | High | Medium | **10** | 10 |
| `2test-deep` | High | High | **Fast** | 8 | 10 |
| `3test-deep` | High | High | Medium | **7** | 10 |

Yang terbaca dari tabel ini:

- **Likelihood High di 5/5.** Tidak ada satu run pun yang menempatkan jalur ini
  di bawah High. Ini bukan noise.
- **Velocity tidak stabil:** Fast / Medium / Medium / Fast / Medium dari ide yang
  secara substansi sama. Alasan yang diberikan pun berbeda kerangkanya — run 5
  memisahkan "kegagalan kompresi terjadi di laporan pertama" dari "konsekuensi
  komersial butuh waktu", sementara run 1 dan 4 menilai keseluruhannya cepat.
  Dua run Fast keduanya berlokal `id`; tiga run Medium mencakup EN dan ID. Tidak
  cukup untuk menyimpulkan efek bahasa, cukup untuk mewajibkan tes (N1).
- **PONR bergerak 7–10** pada cascade yang sama-sama 10 langkah. Run 3 (PONR 10)
  praktis mengatakan tidak ada titik tanpa kembali sebelum akhir; run 1 dan 5
  (PONR 7) mengatakan tiga langkah terakhir sudah tidak bisa diselamatkan. Itu
  perbedaan interpretasi yang material, bukan pembulatan.
- **Confidence hampir rata High.** Satu-satunya Very High justru di run Standard
  (`1test`) — mode yang paling sedikit punya dasar untuk yakin, karena tidak
  menjalankan kalibrasi dua draft. Ini pola yang salah arah.

### 2.2 Resilience (0–100, makin rendah makin rapuh)

| Dimensi | `1test` | `1test-deep` | `2test` | `2test-deep` | `3test-deep` | Rentang |
|---------|--------:|-------------:|--------:|-------------:|-------------:|--------:|
| technical | 20 | 20 | 20 | **50** | 20 | 30 |
| business | **15** | **15** | **15** | 20 | 20 | 5 |
| legal | 35 | 35 | 50 | 50 | 50 | 15 |
| operations | 25 | 25 | 20 | **50** | 20 | 30 |
| trust | **10** | 15 | 15 | **30** | 20 | 20 |

Tiga hal:

1. **Business adalah dimensi paling rapuh dan paling konsisten** — 15/15/15/20/20,
   rentang hanya 5 poin. Lima run sepakat: yang rapuh bukan mesinnya, tapi
   ketiadaan bukti bahwa outputnya bernilai.
2. **`2test-deep` adalah outlier di tiga dimensi sekaligus** (technical 50 vs 20,
   operations 50 vs 20–25, trust 30 vs 10–20). Ini run yang sama yang melaporkan
   Kesepakatan **Medium**. Korelasinya masuk akal — ketika dua draft Pass 1 tidak
   sepakat soal hinge, penilaian turunannya juga berayun — tapi artinya angka
   resilience mewarisi ketidakpastian seleksi tanpa menandainya. Pembaca laporan
   melihat "technical 50" dan "technical 20" sebagai fakta setara.
3. **Legal naik 35 → 50 antara 27 dan 29 Juli.** Perubahannya bertepatan dengan
   input run 3+ yang menyatakan BYOK dev-only secara eksplisit. Jadi input yang
   lebih ketat memang menaikkan skor yang benar — bukti bahwa mesin responsif
   terhadap constraint yang **dinyatakan**, yang justru memperkuat K4: yang tidak
   dinyatakan akan diisi sendiri.

### 2.3 Archetype stress test

| Archetype | `1test` | `1test-deep` | `2test` | `2test-deep` | `3test-deep` |
|-----------|:-------:|:------------:|:-------:|:------------:|:------------:|
| `cold_start_chicken_egg` | No | No | No | No | No |
| `unit_economics_death_spiral` | Maybe | Maybe | Maybe | Maybe | Maybe |
| `trust_erosion` | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** |
| `regulatory_kill` | No | No | No | No | No |
| `model_quality_ceiling` | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** |
| `vendor_lock_in` | Maybe | Maybe | Maybe | Maybe | Maybe |
| `distribution_moat_erosion` | No | No | No | No | **Yes** |
| `abuse_fraud_spiral` | **Maybe** | No | No | No | No |

Matriks ini yang paling bersih dari seluruh korpus, dan dua kolom bergerak:

- **`abuse_fraud_spiral`: Maybe (run 1) → No (4 run berikutnya).** Alasan run 1:
  *"BYOK membuka kemungkinan key sharing, penggunaan sesi oleh pihak lain…"*
  Alasan run 5: *"BYOK is development-only, and the production design does not
  state a public API key, free tier, metered public endpoint, or payment loop."*
  Perubahan ini benar dan disebabkan input, bukan model. **Implikasi ke depan:**
  begitu provider produksi dipilih dan ada endpoint termeter, verdict ini balik
  ke Maybe/Yes. Itu utang yang sudah teridentifikasi sebelum migrasi dimulai.
- **`distribution_moat_erosion`: No (4 run) → Yes (run 5).** Ini pembalikan paling
  penting di seluruh korpus dan **belum tercermin di `01-product.md` maupun
  `04-refine-backlog.md`.** Alasan No pada run 1–4 semuanya bertumpu pada definisi
  sempit: *"tidak ada kanal distribusi tertentu sebagai fondasi; general-purpose
  AI adalah substitusi langsung, bukan kanal distribusi"* (`2test-deep`). Run 5
  membacanya lebih luas dan lebih benar: *"General-purpose AI, internal teams,
  mentors, and checklists can imitate much of the workflow if BreakItFirst cannot
  show that its causal spine changes decisions."* Run 5 juga satu-satunya yang
  berkategori Business — jadi ini bisa efek kategori, bukan insight. Perlu tes
  (N1 varian kategori).
- **`trust_erosion` + `model_quality_ceiling` = Yes, 5/5, tanpa kecuali.** Dua
  arketipe ini adalah inti masalahnya, dan keduanya bermuara ke hal yang sama:
  tidak ada mekanisme yang membuktikan hinge terpilih itu benar.

### 2.4 Kandidat SPOF yang dilaporkan (hanya mode Deep)

`1test-deep` — Kesepakatan **High**, 2 run Pass 1, **6 kandidat**:

> Generic-looking SPOF survives two-pass attack · Generic attacks behind
> structured specificity · Single-SPOF compression of complex ideas · BYOK key and
> metering friction · BYOK setup before demonstrated value · Model-quality ceiling

`2test-deep` — Kesepakatan **Medium**, 2 run Pass 1, **5 kandidat**:

> Underconstrained input memaksa SPOF palsu-spesifik · Adversarial gate meloloskan
> generik · Pipeline reasoning-ke-JSON kehilangan causal spine · Satu laporan tidak
> mengubah keputusan · Ketergantungan provider dengan biaya per analisis yang belum
> diketahui

`3test-deep` — Kesepakatan **High**, 2 run Pass 1, **2 kandidat**:

> Forced specificity from thin inputs · Single-SPOF compression of ambiguous ideas

Pengamatan yang tidak bisa didapat dari laporan mana pun secara terpisah:

- **Jumlah kandidat turun 6 → 5 → 2** sementara Kesepakatan naik. Di run 5, dua
  kandidat yang tersisa adalah **parafrase satu sama lain** ("forced specificity
  from thin inputs" vs "single-SPOF compression of ambiguous ideas"). Kesepakatan
  "High" dengan dua kandidat yang isomorfik bukan kalibrasi — itu tautologi. Enum
  High/Medium/Low tidak bisa membedakan "dua draft sepakat setelah memeriksa
  alternatif berbeda" dari "dua draft menghasilkan kalimat yang sama". Ini alasan
  langsung N8.
- **Kandidat yang dibuang berisi diagnosis yang lebih dapat diuji** daripada yang
  menang. "Pipeline reasoning-ke-JSON kehilangan causal spine" (`2test-deep`) bisa
  diuji hari ini dengan mem-diff prosa Pass 1.5 terhadap JSON Pass 2. "BYOK setup
  before demonstrated value" (`1test-deep`) bisa diuji dengan funnel. Keduanya
  kalah dari hinge yang secara desain tidak dapat difalsifikasi. Aturan E1
  (pilih hinge paling awal yang load-bearing) tidak punya klausa apa pun soal
  keterujian, dan biayanya terlihat di sini.
- **Mode Standard tidak melaporkan kandidat sama sekali** — lihat K3.

### 2.5 Konvergensi dan divergensi

**Yang konvergen (kuat):** kelima run menunjuk satu keluarga hinge — *engine
dipaksa mengompresi ide pra-build yang underspecified menjadi satu SPOF dominan,
sehingga bisa menghasilkan spesifisitas palsu: kosakata ide di atas pola risiko
startup yang dapat dipakai ulang.* Kelima juga sepakat bahwa **critique
adversarial hanya bisa mengubah kata, tidak bisa menambah evidensi.** Kalimatnya
muncul hampir identik di lima file, misalnya `3test-deep:102`: *"Revisions add
detailed actors, mechanisms, and consequences while leaving the underlying
unverified assumption unchanged."*

**Yang divergen (dan tiap divergensi adalah bug atau tes yang belum ada):**

| Divergensi | Nilai | Kemungkinan sebab | Ditangani oleh |
|---|---|---|---|
| Velocity | Fast ×2 / Medium ×3 | framing "kapan kompresi terjadi" vs "kapan komersial terasa" | N1 (paraphrase) |
| PONR | 7 / 8 / 8 / 10 | batas antara "masih bisa dibalik" tidak terdefinisi di prompt | N1, E7 review |
| technical resilience | 20 ×4 / 50 ×1 | mewarisi Kesepakatan Medium tanpa menandainya | N8 |
| `distribution_moat_erosion` | No ×4 / Yes ×1 | kategori Business vs SaaS, atau definisi "moat" yang lebih luas | N1 (varian kategori) |
| Confidence | Very High ×1 / High ×4 | Standard tidak punya penalti keyakinan | N5 (ceiling) |
| Jumlah kandidat | 6 / 5 / 2 | tidak ada batas bawah keragaman kandidat | N8 |

**Kesimpulan §2:** yang disepakati lima run adalah diagnosis yang tidak dapat
difalsifikasi oleh produk itu sendiri. Yang tidak disepakati justru hal-hal yang
seharusnya deterministik. Kombinasi itulah masalahnya — bukan salah satunya.

---

## 3. Triangulasi dengan suite eval eksternal

Dogfood bisa dituduh sebagai model yang menyukai jawabannya sendiri. Tuduhan itu
gugur karena eval eksternal menyebut cacat yang sama dari arah berbeda.

Dari [`../03-quality-gap.md`](../03-quality-gap.md) §5.1, juri manusia + multi-model,
BIF vs Claude vs GLM:

| Ide | Fixture | Pemenang | Skor BIF | SPOF BIF |
|-----|---------|----------|---------:|----------|
| A | Marketplace pet sitter | **BIF** | top | Demand sporadis vs retensi sitter |
| B | SaaS wiki + transcript | **BIF + GLM seri** | ~25 | Auto-overwrite tanpa review |
| C | **AI premortem (meta/dogfood)** | Claude | ~22 (mid) | Prompt-template specificity without grounding |
| D | Hardware fitness ring | GLM tipis, BIF #2 | ~23.5 | OEM sensor vs klaim premium |
| E | **API image resize + CDN** | GLM | **~19 (terendah)** | Flat pricing without cost guard |

**Tally: BIF top-tier 2/5, kalah jelas 2/5.**

Pola yang mengikat dua sumber bukti:

- Kedua kekalahan BIF (C dan E) adalah fixture di mana **input paling sedikit
  membedakan kandidat hinge**. Pada C, BIF mengarang stack (no-RAG) lalu
  menyerangnya. Pada E, BIF mendarat di "flat pricing", risiko paling generik yang
  tersedia, sementara GLM menemukan key-share cache flood. Ini *persis* mekanisme
  yang dogfood sebut: input tipis → kompresi paksa → spesifisitas palsu.
- Fixture C adalah ide yang **sama** dengan yang dianalisa lima run dogfood.
  Artinya: pada satu-satunya fixture di mana kita punya penilaian eksternal atas
  ide ini, BIF kalah dari Claude — dan hinge pemenang Claude ("generic-analysis
  camouflage") adalah hinge yang sama yang kemudian ditemukan sendiri oleh dogfood
  run 1 dan 2. Mesin akhirnya menemukan diagnosis yang benar tentang dirinya,
  tetapi hanya setelah batch prompt E9–E11 dikirim untuk mengejar Claude.
- Konsekuensinya untuk cara membaca dogfood: konvergensi lima run **bukan** bukti
  bahwa hinge itu benar. Ia bukti bahwa aturan E9–E11 bekerja sesuai instruksinya
  pada satu ide yang aturannya memang ditulis untuk itu. Nilai bukti sebenarnya
  ada di divergensi (§2.5) dan di gap instrumentasi (§5).

---

## 4. Kekurangan

Diurut dari yang paling langsung menyerang nilai inti. Tiap item: klaim, bukti,
lokasi kode, dampak, cara verifikasi.

### K1 — Tidak ada ground truth · P0

**Klaim.** Produk memilih satu hinge dominan dan tidak pernah tahu apakah
pilihannya benar. Deep Analysis mengukur konsistensi kompresi, bukan kebenaran
seleksi.

**Bukti.** `3test-deep:187` menyatakannya sendiri sebagai failure mode teknis:
*"Deep Analysis agreement may measure consistency of compression rather than
correctness of the selected hinge."* `2test-deep:122` menutup celah pelariannya:
*"Agreement tinggi tidak memberi insight tambahan, atau agreement rendah tidak
dapat dijelaskan oleh fakta baru."* Lalu §2.4 menunjukkan Kesepakatan High run 5
dicapai atas dua kandidat yang saling parafrase.

**Kode.** Tidak ada. Tidak ada field, tabel, event, atau script yang menyimpan
"apakah hinge ini benar". `eval/assertions.ts` (30 assertion) seluruhnya
struktural. `eval/rubric.md` menempatkan penilaian kebenaran pada manusia, manual,
di luar produk.

**Dampak.** "Confidence: High" adalah pernyataan tentang keyakinan model, bukan
tentang ide. Ini induk K2, K3, K6, dan penyebab langsung `trust_erosion` = Yes 5/5
serta business resilience 15–20.

**Verifikasi.** N6 (loop feedback) adalah satu-satunya jalur realistis. N1/N2
tidak memberi kebenaran, tapi memberi *syarat perlu*: hinge yang tidak stabil
terhadap parafrase pasti bukan hinge yang benar.

### K2 — Sinyal false-specificity ada di dokumen, tidak ada di kode · P0

**Klaim.** Tes yang tepat sudah dirumuskan tiga kali oleh laporan produk sendiri,
dan nol kali diimplementasikan sebagai pengukuran.

**Bukti.** `3test-deep:98` (cascade step 3): *"Small wording, category, or emphasis
changes produce materially different SPOFs for similar ideas, or the same familiar
hinge for different ideas."* `2test.md` step 4: *"Removing the product name and
category still leaves recognizable actors and causal sequence from another SaaS
analysis."* `eval/rubric.md` menyebutnya **"Tes spesifisitas (wajib mental
check)"** — kata "mental" itu masalahnya.

**Kode.** `04-refine-backlog.md` menandai **E11 (hunt false specificity) sebagai
`done`**. Yang shipped adalah aturan prompt di `prompts.ts`. Aturan prompt tidak
bisa memverifikasi dirinya sendiri; ia hanya menggeser distribusi output.

**Dampak.** Cacat yang paling sering disebut lima run adalah satu-satunya cacat
yang tidak punya alat ukur. Tanpa itu, tidak ada cara membedakan "E11 bekerja" dari
"E11 mengubah kosakata".

**Verifikasi.** N1 + N2, otomatis, di atas `eval/golden/*.json` yang sudah ada.

### K3 — Standard mode tidak bisa menunjukkan kenapa hinge ini menang · P0

**Klaim.** Kandidat yang ditolak hanya ada di mode Deep. Di Standard, dua kandidat
yang kalah dibuang tanpa jejak.

**Bukti.** `src/lib/schema.ts:125–132` — `candidate_spofs` bersarang di dalam
`self_consistency`, yang `.optional()` dan hanya diisi oleh jalur Deep.
`src/lib/prompts.ts:90` dan `:398` — prompt tetap menyusun 3 kandidat secara
internal di kedua mode, lalu me-ranking, lalu menulis hanya pemenang.
`2test-deep` menyebut biayanya di failure mode teknis: *"serialisasi beberapa
kandidat menjadi satu SPOF menghapus alasan kandidat terpilih lebih kuat."*
`3test-deep:94` menjadikannya sinyal cascade step 2: *"Internal candidate paths
contain materially different failure mechanisms, while the final report presents
only one without showing that the input separated it from the others."*

**Dampak.** Bagi user, output Standard tidak dapat dibedakan antara "satu hinge
yang menang meyakinkan" dan "satu hinge yang dipilih sembarang dari tiga yang
setara". Field `critical_assumption_indices` (F1) dan kicker "Why this hinge" (S3)
menjelaskan *isi* hinge, bukan *jaraknya* ke runner-up — dan jarak itulah yang
menjadi klaim produk.

**Verifikasi.** N3. Setelah `spof_candidates` naik ke top-level, margin seleksi
bisa dicatat dan dilacak antar run.

> **Update 2026-07-30 — apa yang sebenarnya dikerjakan.** N3 menyentuh
> `prompts.ts` dan `schema.ts`, jadi ia **frozen** oleh Q11 dan tidak dibangun.
> Yang shipped sebagai pengganti: **Q9** menulis prose mentah tiap pass ke
> `.breakitfirst-traces/` (`BIF_TRACE=1`, lokal saja) dan **Q12**
> `npm run eval:traces` membacanya. Batas penggantinya harus dinyatakan jujur:
> Pass 1 hanya menuliskan pemenang, jadi dua runner-up biasanya **tidak ada** di
> prose dan tidak bisa dipulihkan oleh tool apa pun. Yang bisa dipulihkan adalah
> drift antar draft (`pass1_a` vs `pass1_b` vs `pass1_5`) dan antar run atas ide
> yang sama. Klaim K3 sendiri tetap berlaku dan belum tertutup.

### K4 — Kualitas input tidak digating, padahal seluruh SPOF menyalahkan input · P1

**Klaim.** Asumsi #1 di 5/5 run adalah asumsi yang produk tidak pernah cek.

**Bukti.** Asumsi #1 `3test-deep:32`: *"The idea description contains enough
discriminating context to separate one load-bearing failure mechanism from several
plausible alternatives."* Kalimat setara ada di keempat run lain. Nama SPOF run 4
adalah **"Input underconstrained"** — mesin menamai cacat produk dengan nama
input-nya sendiri.

**Kode.** `src/lib/input-validation.ts` menolak: kosong, `< MIN_IDEA_LENGTH`,
`> MAX_IDEA_LENGTH` (8000), control character, repetisi/spam (`isMostlyRepeated`),
10 pola injection, dan `< 5` kata unik. Tidak ada satu pun yang mengukur **konteks
pembeda**: aktor bernama, mekanisme revenue, constraint operasional, kompetitor,
angka/threshold.

**Dampak.** Templat meredam ini karena sudah kaya konteks; paste bebas tidak. Input
tipis + kompresi paksa + Confidence High adalah kombinasi yang menghasilkan tepat
apa yang dituduhkan fixture C dan E di eval eksternal.

**Verifikasi.** N5, dengan skor kecukupan disimpan di `meta` supaya N1/N2 bisa
mengkorelasikan tipisnya input dengan tidak-stabilnya hinge. Itu mengubah asumsi
#1 dari asumsi menjadi variabel terukur.

### K5 — Backlog kosong, eval basi, dogfood belum masuk board · P1

**Klaim.** Proyek terlihat sehat di papan, tetapi tidak ada pengukuran setelah
perubahan terbesarnya.

**Bukti — kronologi.**

| Tanggal | Peristiwa |
|---------|-----------|
| 2026-07-16 | Baseline eval terakhir dijalankan (`eval/baselines/2026-07-16_043835`, `_051625`, `_230859`) |
| 2026-07-21 | Suite A–E selesai; **batch prompt E9–E18 shipped** (Q7) |
| 2026-07-21/23 | Spot-check `Scoring/6.md`, `7.md`, `8.md` — **fixture baru**, bukan re-score C/E |
| 2026-07-27/29 | 5 run dogfood |
| 2026-07-30 | `04-refine-backlog.md`: **todo 0 · doing 0 · 32 baris `done`** (snapshot pagi itu; sore hari sudah `todo 0 · doing 1 (Q11) · blocked 1 (Q10)`) |

**Dampak.** (a) Tidak ada satu pun baseline yang dijalankan setelah perubahan
prompt terbesar proyek ini, jadi delta E9–E18 tidak diketahui. (b) Rekomendasi
`03-quality-gap.md` §5.2 sendiri — *"then optional re-score C+E"* — tidak pernah
dieksekusi; `Scoring/6–8.md` memakai fixture berbeda sehingga tidak bisa mengukur
delta. (c) Lima temuan dogfood berumur 3 hari belum menjadi baris backlog apa pun,
padahal §6 protokol mewajibkan itu setelah tiap trial.

**Verifikasi.** N4 (satu hari kerja) + §7 di file ini (baris siap paste).

### K6 — Model penyimpanan menghalangi bukti yang dibutuhkan produk · P1

**Klaim.** Keputusan privasi yang sah menutup jalur ke K1, dan itu belum diakui
sebagai trade-off eksplisit.

**Bukti.** `3test-deep:188`: *"Temporary job storage and browser-local history limit
comparison of repeated outputs, making SPOF stability or sensitivity to prompt
wording harder to observe."* `3test-deep:209`: *"Without permanent account-based
history or an empirical validation loop tied to later decisions, it is difficult to
track unstable or misleading SPOFs across English and Indonesian reports."*

**Kode/desain.** History browser-local maks 10 (`src/lib/report-storage.ts`), job
server temporer, tanpa akun/DB permanen. `01-product.md` §6 mendaftar "Server report
DB" dan "Redis multi-instance" sebagai **bukan core** — pilihan yang benar untuk MVP.

**Dampak.** Dua arah friksi sekaligus: (a) engine tidak bisa membandingkan output
berulang, jadi K1 tetap tertutup; (b) engine butuh konteks sensitif, sementara user
tidak diberi alasan untuk mempercayakannya — `3test-deep:198` menandai ini di domain
security, dan `:204` di legal (*"Confidentiality expectations may exceed the current
storage model"*).

**Verifikasi.** N6 dirancang untuk membuka K1 **tanpa** membatalkan keputusan ini:
event feedback anonim, tanpa teks ide, terpisah dari history. Butuh keputusan owner.

### K7 — Bahasa menggeser hasil · P2

**Klaim.** Locale bisa mengubah banding, dan belum pernah diuji.

**Bukti.** `2test-deep` mencatatnya sebagai temuan: wording EN/ID dapat menggeser
nuansa constraint dan confidence. Terkonfirmasi lintas file pada ide yang sama:
`1test` (ID) → Very High / **Fast** / trust 10, versus `1test-deep` (EN body) → High /
**Medium** / trust 15, jarak 7 menit. Kedua run Velocity Fast di korpus berlokal `id`.

**Dampak.** Kalau report `id` sistematis lebih alarmis daripada `en` atas ide yang
sama, itu cacat kalibrasi yang menyentuh langsung klaim produk, dan invisible
sekarang.

**Verifikasi.** N1 varian locale-flip — fixture identik, dua locale, diff
`component` + banding. Perlu hati-hati memisahkan efek locale dari efek mode
(Deep/Standard) pada pasangan `1test`.

### K8 — Bukti bahwa input handling rusak · P2

**Klaim.** Teks input yang tersimpan di run 3 korup.

**Bukti.** Di `2test.md`, bagian ide yang dianalisa memuat: `"Standard atau Deep
Analys"`, `"ketika proses masihenyambungkan kembali"`, `"kongevaluasi"`,
`"keounder"`, `"haif"`, `"proposalsebelum"`. Polanya — spasi hilang di sambungan dan
kata terpotong di tengah — konsisten dengan truncation atau chunk boundary saat
paste / saat menulis `meta.idea_input`, bukan salah ketik manusia.

**Dampak.** Kalau engine menganalisa teks rusak sambil melaporkan Confidence High,
K4 berubah dari "input tipis" menjadi "input rusak dan tetap dijawab yakin". Run 3
adalah run dengan PONR 10 dan legal 50 — kita tidak tahu apakah kerusakan teks ikut
menggeser itu.

**Verifikasi.** N7 — reproduksi dulu, jangan tebak. Lalu assertion permanen bahwa
`meta.idea_input` identik byte-per-byte dengan input tersubmit.

---

## 5. Gap instrumentasi — temuan paling tajam dari korpus

Cascade `3test-deep` memuat 10 sinyal yang dapat diamati. Kolom terakhir menjawab:
apakah produk hari ini bisa mengamatinya?

| # | Langkah | Sinyal | Terukur sekarang? |
|--:|---------|--------|-------------------|
| 1 | Deskripsi meninggalkan ketidakpastian penting | Laporan berulang menambah asumsi soal aktor/perilaku/WTP yang tidak ada di input | **Tidak** — butuh diff asumsi vs input (N5) |
| 2 | Engine me-ranking jadi satu SPOF | Kandidat internal berbeda material, laporan hanya menampilkan satu | **Tidak** — Standard tidak emit kandidat (N3) |
| 3 | Seleksi menukar framing dengan evidensi | Perubahan wording/kategori kecil → SPOF berbeda material | **Tidak** — tapi paling mudah dibuat (N1) |
| 4 | Critique memperbaiki bahasa, bukan grounding | Revisi menambah detail, asumsi tak terverifikasi tetap | **Tidak** — butuh diff Pass 1.5 → Pass 2 |
| 5 | Struktur membuat interpretasi tampak diagnostik | User menyebut laporan rigorous sambil menyanggah hinge-nya | **Tidak** — butuh feedback (N6) |
| 6 | Draft Deep saling menguatkan kompresi | Agreement tinggi sementara reviewer menunjuk dependensi lain | **Tidak** — butuh N6 + N8 |
| 7 | **User memperlakukan spine sebagai komentar (PONR)** | User membaca/ekspor lalu tetap jalan tanpa mengutip SPOF | **Tidak** — butuh N6 |
| 8 | Repeat use tetap sesekali | Laporan menumpuk di eksperimen awal; history dibuka ulang terbatas | **Tidak** — history lokal, tak ada telemetri (K6) |
| 9 | Payment tak bisa menempel pada outcome terpercaya | User menyebut menarik tapi menolak bayar | **Tidak** — belum ada pricing |
| 10 | Diferensiator tetap tak terbukti | Laporan rapi menumpuk tanpa bukti perubahan keputusan | **Tidak** |

**0 dari 10 sinyal dapat diamati oleh produk hari ini.**

Ini temuan tunggal terpenting di seluruh analisa: laporan mendiagnosis dirinya
sendiri memakai sinyal yang arsitekturnya sendiri membuat tak terlihat. Sinyal 3
adalah yang paling murah untuk dibuka (tidak butuh user, tidak butuh storage, tidak
butuh pricing — hanya menjalankan fixture yang sudah ada beberapa kali), dan itulah
alasan N1 mendahului semua item lain yang bersifat produk.

Konsekuensi prioritas: **tiga item pertama di §6 semuanya soal mengukur, bukan
menambah kemampuan.** Batch E9–E18 sudah menambah 18 aturan; yang belum ada adalah
cara mengetahui apakah aturan itu bekerja.

---

## 6. Next — rencana kerja

### N1 · Suite stabilitas SPOF (`Q8`) · P0

**Tujuan.** Mengubah cascade step 3 dari sinyal tak terlihat menjadi metrik.

**Definisi.** Runner yang mengeksekusi tiap golden fixture dalam **4 varian**:

| Varian | Perubahan | Ekspektasi |
|--------|-----------|------------|
| `base` | apa adanya | acuan |
| `para` | parafrase, mekanisme identik | SPOF **harus sama** |
| `strip` | nama produk + kategori dibuang | SPOF **harus berubah / melemah** |
| `flip` | locale dibalik (en ↔ id) | SPOF + banding **harus sama** |

Bandingkan `single_point_of_failure.component`, `likelihood.band`,
`failure_velocity.band`, `point_of_no_return_index`, dan lima skor resilience.

**Kriteria lulus.** ≥4/5 fixture stabil pada `para` dan `flip`; ≥4/5 fixture
**bergeser** pada `strip`. Fixture yang identik di `strip` berarti hinge-nya tidak
pernah bergantung pada ide tersebut.

**File.** `eval/stability.ts` baru + `npm run eval:stability`. Reuse
`run-baseline.ts`, `golden/*.json`, `compare-baseline.ts`. Varian `para`/`strip`
disimpan sebagai fixture turunan di `eval/golden/variants/`.

> **Update 2026-07-30 — yang benar-benar shipped (ID sebenarnya: Q10 + Q14).**
> Path fixture adalah **`eval/golden-variants/`**, bukan `eval/golden/variants/`.
> Ketiga varian kini **ada** untuk kelima fixture (15 file), dan verdict-nya
> **otomatis**. Dua hal berubah dari rencana di atas dan harus dicatat, bukan
> disamarkan:
>
> **1. Arti `strip` dan `flip` bergeser.** Rencana ini memakai `strip` = nama
> produk + kategori dibuang, *ekspektasi SPOF berubah*, dan `flip` = locale
> dibalik. Yang dibangun berbeda: ketiga kind menyerang satu cara hinge bisa jadi
> artefak **teks**, dan ketiganya karena itu berekspektasi **SPOF tetap sama**.
>
> | Kind | Yang diubah | Pertanyaan |
> |------|-------------|------------|
> | `para` | semua kata diganti | hinge menempel pada kosakata? |
> | `strip` | merek, pembanding, nama kota dibuang — **semua angka dan relasi struktural tetap** | hinge menempel pada merek/geografi yang dikenali? |
> | `flip` | fakta identik, urutan dibalik, gaya jadi pitch founder | hinge menempel pada apa yang disebut pertama? |
>
> Konsekuensinya kriteria lulus lama "≥4/5 **bergeser** pada `strip`" **tidak
> berlaku** untuk instrumen ini: kalau `strip` juga membuang angka dan relasi,
> SPOF yang berubah tidak bisa dibedakan dari hinge yang tidak stabil — dua
> hipotesis, satu pengamatan. Uji "hinge tidak bergantung pada ide" yang dimaksud
> N1 tetap belum ada instrumennya. Locale-flip pindah ke §N1-verifikasi (`BIF_LOCALE`).
>
> **2. Kolom `Same hinge?` tidak lagi diisi manusia.** Alasan lama masih benar —
> `"OEM-owned firmware"` dan `"vendor firmware dependency"` adalah hinge yang sama
> dengan kata berbeda — tapi jawabannya bukan diff string, melainkan **diff tema**:
> `eval/hinge-labels.ts` + `eval/theme-keywords.json` memetakan SPOF ke tema lalu
> membandingkan tema (`same` / `partial` / `shift` / `unmatched`). Verdict itu
> ditulis ke `REPORT.md` sebagai default yang **boleh ditimpa**, plus rollup per
> kind. Batas yang harus tetap terlihat: **tema lebih kasar daripada hinge**, jadi
> dua mekanisme berbeda di satu tema juga keluar `same` — baca `same` sebagai
> *tidak terdeteksi bergeser*. Risiko sebaliknya (satu stem terlalu lebar → semua
> hinge satu tema → drift nol yang **terlihat seperti sukses**) dijaga
> `npm run eval:hinge-check`, preflight offline dengan dua probe diskriminasi.
> `BIF_REF=<baseline run_id>` mendiff ke label baseline lama;
> `BIF_STABILITY_GATE=1` exit non-zero kalau ada yang bergeser.
>
> Run-nya sendiri tetap **blocked** pada kredensial provider owner — itu satu-satunya
> yang tersisa; tidak ada lagi langkah manual antara run dan angka.

**Effort.** ~1 hari + biaya provider 5 fixture × 4 varian.

**Menutup.** K2, K7, sebagian K1 (syarat perlu), divergensi velocity/PONR §2.5.

### N2 · Cross-idea collision check (`Q9`) · P0

**Tujuan.** Arah kebalikan N1 — apakah 5 fixture berbeda menghasilkan hinge yang
berbeda, atau hinge familiar yang sama?

**Definisi.** Bandingkan `component` + label cascade lintas fixture dalam satu run
baseline. Tandai pasangan yang bertabrakan secara semantik ("flat pricing without
cost guard" pada fixture API dan SaaS sekaligus = tabrakan).

**Kriteria lulus.** 0 tabrakan pada 5 fixture. Satu tabrakan = satu bug prompt.

**Effort.** ~2 jam. Tidak butuh run provider tambahan — pakai output N4.

**Menutup.** paruh kedua K2; mengetes `distribution_moat_erosion` = Yes secara
langsung.

### N3 · `spof_candidates` naik ke top-level schema (`E19`) · P0

**Tujuan.** Menutup cascade step 2; membuat margin seleksi terlihat dan terukur.

**Definisi.** Pindahkan daftar kandidat keluar dari `self_consistency`
(`schema.ts:125–132`) ke `single_point_of_failure.rejected_candidates`:
`{ label, rejection_reason }[]`, 2 item, wajib di kedua mode. `self_consistency`
tetap ada untuk kalibrasi Deep.

**Batasan render (penting).** Runner-up masuk `<details>` di bawah blok SPOF, satu
baris per kandidat. **Bukan** risk list kedua — itu akan melanggar E18 (satu spine)
dan membatalkan seluruh positioning "satu hinge, bukan lima risiko setara".

**Kriteria lulus.** 5/5 fixture emit 2 kandidat + alasan penolakan yang merujuk
konteks ide (bukan "kurang dominan" generik). Assertion baru di `assertions.ts`.

**Efek samping yang diinginkan.** Kandidat terbuang §2.4 menunjukkan hinge yang
lebih dapat diuji sering kalah dari yang tidak dapat difalsifikasi. Dengan field
ini, pola itu bisa dihitung, dan aturan E1 bisa ditinjau dengan data.

**Menutup.** K3.

### N4 · Baseline ulang + re-score C & E (`Q10`) · P0, kerjakan hari pertama

**Tujuan.** Menutup lubang 14 hari antara baseline terakhir dan batch prompt.

**Definisi.** `npm run eval:baseline` pada prompt saat ini →
`npm run eval:compare` terhadap `eval/baselines/2026-07-16_230859`. Lalu jalankan
fixture C dan E dengan protokol `03-quality-gap.md` (Claude + GLM + BIF, ≥3 juri
untuk C sesuai Q6).

**Pertanyaan yang dijawab.** Apakah E9–E18 memperbaiki C dan E, atau sekadar
menghasilkan fixture baru yang lebih ramah? `Scoring/6–8.md` tidak bisa menjawab
ini karena fixture-nya berbeda.

**Kriteria lulus.** C dan E naik dari ~22 dan ~19 ke ≥23. Kalau tidak naik, batch
E9–E18 harus ditinjau ulang sebelum aturan ke-19 ditulis.

**Effort.** ~1 hari termasuk penjurian. Termurah dan menetapkan garis dasar untuk
semua item lain.

> **Koreksi 2026-07-30 — N4 seperti ditulis tidak bisa menjawab pertanyaannya.**
> Rencana ini bertumpu pada `eval:compare` atas total 34 poin. Tapi tiga run
> `eval/baselines/2026-07-16_*` semuanya **33–34/34** dengan nol hard/soft fail,
> dan summary run itu sendiri menulis *"ceiling already high at 33.8"*. Rubriknya
> **saturasi**: batas atasnya sudah tersentuh, jadi delta E9–E18 tidak akan muncul
> di angka itu apa pun hasilnya, dan kriteria lulus "C dan E naik ke ≥23" memakai
> rubrik manusia 25 poin yang berbeda lagi. Instrumen yang benar untuk pertanyaan
> "apakah hinge-nya bergerak" adalah **diff label SPOF** (`npm run eval:stability`),
> bukan skor. Baseline ulang tetap berguna sebagai arsip provenance — bukan sebagai
> pengukur kualitas. Caveat ini juga sudah ditulis di `eval/rubric.md` dan
> `eval/README.md`.
>
> **Tambahan 2026-07-30.** Rubrik lalu diperluas ke 10 blok (**48 standard / 52
> deep**, `Q13`) karena empat blok laporan yang di-render tidak dinilai sama sekali.
> Itu memperbaiki cakupan, **bukan** saturasi: batas atas yang lebih lebar tetap
> batas atas, dan satu laporan tetap bukan pengukuran stabilitas antar laporan.
> Total 34 lama dan 48/52 baru juga bukan pembanding langsung — bandingkan per blok.

**Menutup.** K5.

### N5 · Skor kecukupan input + disclosure jujur (`E20` / `S5`) · P1

**Tujuan.** Mengubah asumsi #1 (5/5 run) dari asumsi menjadi variabel terukur.

**Definisi.** Sebelum memanggil provider, skor input pada dimensi pembeda: aktor
bernama, mekanisme revenue, constraint operasional, kompetitor, angka/threshold.
Tiga aksi:

1. **Jangan blokir.** Tampilkan yang hilang sebelum submit, satu baris, actionable.
2. **Turunkan ceiling confidence.** Input tanpa mekanisme revenue tidak boleh
   mengeluarkan Confidence High untuk hinge ekonomi. Ini juga memperbaiki anomali
   §2.1 (Very High justru di mode Standard).
3. **Simpan skornya di `meta`** supaya N1/N2 bisa mengkorelasikan tipisnya input
   dengan tidak-stabilnya hinge.

**File.** `src/lib/input-validation.ts` (fungsi baru, bukan menambah gate penolakan),
`schema.ts` (`meta.input_sufficiency`), surface input.

**Menutup.** K4, sebagian K8 (input rusak akan skor rendah).

### N6 · Loop feedback satu-klik (`S6`) · P1 — butuh keputusan owner

**Tujuan.** Satu-satunya jalur realistis ke ground truth tanpa menunggu 18 bulan
hasil startup.

**Definisi.** Di bawah blok SPOF: *"Apakah ini hinge-nya?"* → **Ya** /
**Bukan-yang-ini** / **Sudah-saya-tahu**. Opsional satu field bebas: hinge apa yang
menurut Anda benar.

Tiga pilihan itu memetakan langsung ke rubrik yang sudah ada:

| Jawaban | Arti | Rubrik |
|---------|------|--------|
| Ya | insight tercapai | `rubric.md` P1 / "belum kepikiran" |
| Bukan-yang-ini | seleksi salah | K1, cascade step 5 |
| Sudah-saya-tahu | hinge tidak lebih awal dari yang sudah ditakuti | kegagalan **E2** |

**Kenapa ini moat.** Chat umum (Claude/GLM) tidak mengumpulkan sinyal ini. Ini
satu-satunya aset yang tidak bisa direplikasi dalam satu sore, dan langsung
menjawab `distribution_moat_erosion` = Yes (§2.3).

**Keputusan yang dibutuhkan.** Butuh transport minimal (endpoint + store
append-only), yang menyentuh non-goal "tanpa DB permanen" (`01-product.md` §6).
**Saran:** event anonim `{ fixture_hash, spof_hash, verdict, locale, mode, ts }` —
**tanpa teks ide**, terpisah dari history, tidak terhubung ke identitas. Itu menjaga
posisi privasi (K6) sambil membuka K1.

**Menutup.** K1 (sebagian nyata), cascade step 5/6/7.

### N7 · Reproduksi bug input korup (`E21`) · P1

**Definisi.** Paste ~1200 karakter multi-paragraf melalui path yang menghasilkan
`2test.md`, lalu diff `meta.idea_input` terhadap sumber. Curiga pada penulisan
`idea_input` atau boundary chunk streaming, **bukan** pada validasi — validasi hanya
menolak, tidak memotong.

**Kriteria lulus.** Bug tereproduksi dan diperbaiki, plus assertion permanen:
`meta.idea_input` identik dengan input tersubmit.

**Catatan.** Reproduksi dulu. Kalau tidak tereproduksi, kemungkinan korupsi terjadi
saat menyalin laporan ke file markdown, bukan di produk — itu pun perlu dicatat
supaya tidak jadi hantu.

**Menutup.** K8.

### N8 · Kuantifikasi kalibrasi Deep (`E22`) · P2

**Tujuan.** Enum High/Medium/Low menyembunyikan variance besar.

**Bukti pendorong.** `2test-deep` (Kesepakatan Medium) menyimpang di tiga dimensi
resilience sekaligus (§2.2). `3test-deep` mencapai "High" atas **dua kandidat yang
saling parafrase** (§2.4). Enum saat ini tidak bisa membedakan keduanya.

**Definisi.** Turunkan `spof_agreement` dari tiga komponen, jangan minta model
menilai dirinya: (a) overlap kandidat antar dua draft, (b) apakah `component` cocok,
(c) deviasi maksimum resilience antar draft. Tambah **batas bawah keragaman
kandidat** — dua kandidat yang saling parafrase dihitung sebagai satu.

**Kenapa P2, bukan P0.** Deep membebankan 2 slot rate-limit (`01-product.md` §2)
untuk sinyal yang laporannya sendiri sebut mungkin hanya konsistensi. Itu serius —
tapi memperbaikinya tanpa N1 lebih dulu hanya menghasilkan angka baru yang juga
tidak terverifikasi.

**Menutup.** divergensi §2.5 baris 3 dan 6; sebagian K1.

---

## 7. Baris backlog siap paste ke `04-refine-backlog.md` §1

> **Sudah tidak "siap paste" — sudah lewat.** Baris di bawah adalah usulan
> **2026-07-30 pagi**, sebelum board diperbarui, dan **penomorannya bertabrakan**
> dengan ID yang akhirnya dipakai (`Q8` = provenance, `Q9` = raw trace, `Q11` =
> engine freeze, `Q12` = trace reader). Board yang berlaku ada di
> `04-refine-backlog.md`; tabel ini disimpan sebagai catatan usulan awal, bukan
> instruksi. Peta ID yang benar ada di kotak status dekat kepala file ini.

Board saat itu `todo 0`, sementara §6 di file ini memuat 9 item. Baris berikut
mengikuti skema ID yang ada (`E` engine · `S` surface · `Q` process) dan
melanjutkan penomoran dari E18 / S4 / Q7 **seperti yang diusulkan saat itu**.

| ID | Area | Title | Priority | Status | Seen on | Where | Notes |
|----|------|-------|----------|--------|---------|-------|-------|
| Q8 | Process | Suite stabilitas SPOF: paraphrase / name-strip / locale-flip per fixture | P0 | todo | dogfood 1–5 | `eval/stability.ts` (baru) | Otomatisasi "mental check" `rubric.md`; satu-satunya cara verifikasi E11 |
| Q9 | Process | Cross-idea collision check — 5 fixture harus beda hinge | P0 | todo | dogfood 5 | `eval/stability.ts` | Mengetes `distribution_moat_erosion`=Yes |
| Q10 | Process | Baseline ulang pasca E9–E18 + re-score C & E | P0 | todo | K5 | `eval/baselines/` | Baseline terakhir 07-16, batch shipped 07-21; §5.2 pernah minta ini |
| E19 | Engine | `rejected_candidates` top-level (2 item + alasan), wajib di Standard | P0 | todo | dogfood 3–5 | `schema.ts:111`, `prompts.ts:90/398` | Tutup cascade step 2; render di `<details>`, jangan jadi risk list kedua (E18) |
| E20 | Engine | Skor kecukupan input (aktor/revenue/constraint/kompetitor/angka) → ceiling confidence | P1 | todo | dogfood 1–5 | `input-validation.ts`, `schema.ts` meta | Asumsi #1 di 5/5 run tak pernah dicek; jangan blokir, cukup gating confidence |
| S5 | Surface | Tampilkan konteks yang hilang sebelum submit | P1 | todo | K4 | surface input | Pasangan UI dari E20 |
| S6 | Surface | Feedback SPOF 1-klik: Ya / Bukan-yang-ini / Sudah-saya-tahu | P1 | **done** | K1 | `src/lib/feedback-event.ts`, `src/lib/feedback-store.ts`, `src/app/api/feedback/route.ts`, `src/components/spof-feedback.tsx`, `eval/read-feedback.ts` | Shipped 2026-08-01 — event anonim, tanpa teks ide, hash di browser, sink append-only lokal. Menutup **transport**-nya K1, bukan K1: hitungannya lantai (per-proses), endpoint tanpa auth, dan tanpa akun ini mengukur reaksi, bukan hasil. Detail: `04-refine-backlog.md` baris S6 |
| E21 | Engine | Bug: `meta.idea_input` korup/terpotong pada paste panjang | P1 | todo | `2test.md` | path idea_input / streaming | Reproduksi dulu; assertion identitas byte |
| E22 | Engine | Turunkan `spof_agreement` dari overlap+match+deviasi; batas keragaman kandidat | P2 | todo | dogfood 4,5 | `schema.ts`, Pass 1.5 | "High" atas 2 kandidat isomorfik = tautologi |
| P7 | Position | Akui `distribution_moat_erosion`=Yes; moat = bukti perubahan keputusan, bukan format | P1 | **done** | dogfood 5 | `01-product.md`, landing | Shipped 2026-08-01 di `01-product.md` §1 (blok Moat + utang abuse) dan §6.1 (trade-off penyimpanan / K6). Copy landing dicek: tidak ada overclaim yang perlu diubah. Caveat tetap: run 5 satu-satunya kategori Business, jadi bisa efek kategori |
| Q11 | Process | Catat utang: `abuse_fraud_spiral` balik ke Maybe/Yes saat provider produksi dipilih | P2 | todo | dogfood 1 vs 2–5 | `01-product.md` §1 | Verdict No hari ini bergantung pada BYOK dev-only |

---

## 8. Implikasi positioning

`01-product.md` sudah jujur: USP dibatasi ("bukan selalu lebih tajam dari strong
chat"), false specificity terdaftar sebagai known risk, P5/P6 `done`. Yang perlu
ditambahkan dari dogfood adalah satu hal yang belum ada di dokumen mana pun:

**`distribution_moat_erosion` = Yes** (`3test-deep:171`). Bacaannya:

- **Format bukan moat.** Fixture C dan E membuktikan format kalah dari hinge yang
  lebih baik.
- **Aturan prompt bukan moat.** 18 aturan bisa ditiru dalam satu sore oleh siapa pun
  yang membaca laporan output.
- **Satu-satunya moat yang mungkin adalah bukti terakumulasi bahwa hinge-nya benar
  dan mengubah keputusan.** Itu berarti N1, N2, dan N6 bukan pekerjaan QA — mereka
  pekerjaan produk yang sebenarnya.

Ini juga menjelaskan pola resilience §2.2: technical 20 tapi business 15–20 secara
konsisten. Mesinnya jalan; ceritanya belum terbukti.

**BYOK.** Konsisten dengan constraint owner: BYOK **development-only**, **tidak
dipasarkan sebagai fitur**, produksi akan memakai provider yang lebih stabil, dan
**pricing belum ditentukan**. Dogfood menambahkan satu konsekuensi teknis yang
sebelumnya tidak tercatat: verdict `abuse_fraud_spiral` = **No** pada run 2–5
**bergantung** pada BYOK dev-only. Begitu ada endpoint termeter atau free tier di
produksi, verdict itu balik. **Dicatat sekarang, bukan saat migrasi** — tapi **bukan** sebagai `Q11`: ID itu
sudah dipakai untuk engine freeze. Utang ini sekarang ada di board sebagai **`E19`**
(`src/lib/input-validation.ts`, P2, `todo`).

---

## 9. Yang sebaiknya TIDAK dikerjakan

Sejalan dengan `04-refine-backlog.md` §3, diperkuat bukti dogfood:

| Jangan | Alasan dari korpus |
|--------|--------------------|
| Menambah pass LLM | `1test-deep` malah kena retry JSON repair; `2test-deep` malah disagreement. Pass ketiga = biaya lebih untuk kompresi lebih konsisten, bukan seleksi lebih benar |
| Redis / job infra | Nol temuan dogfood menunjuk ke situ |
| Aturan prompt baru sebelum N1/N4 jalan | 18 aturan shipped tanpa terukur; aturan ke-19 hanya memperlebar permukaan yang tak diamati, dan risiko konkretnya adalah aturan yang bertabrakan tanpa ada yang tahu |
| Formal causal-graph schema | Cacatnya di seleksi, bukan representasi |
| Memasarkan konvergensi 5 run sebagai validasi | §3 dan §11 — konvergensi di sini bukan bukti kebenaran |

---

## 10. Urutan eksekusi

**N4 → N1 → N2 → N3 → N5 → N6 → N7 → N8**

Alasan urutannya:

1. **N4 dulu** — termurah, tidak menyentuh kode produk, dan menetapkan garis dasar
   yang dibutuhkan semua item lain untuk mengukur delta.
2. **N1 + N2** — alat ukurnya. Setelah ini ada, tiap perubahan prompt punya angka.
3. **N3** — membuat mekanisme seleksi terlihat, dan memberi data untuk meninjau E1.
4. **N5 → N6** — memperluas apa yang bisa diukur (kualitas input, lalu kebenaran).
5. **N7, N8** — perbaikan yang tidak memblokir apa pun.

**Definition of done untuk gelombang ini:**

- [x] `npm run eval:stability` **ada** — dan instrumennya lengkap: `para`/`strip`/`flip` ×5 fixture, verdict tema otomatis, preflight `eval:hinge-check` lulus, gate CI opsional (Q10 + Q14)
- [ ] `npm run eval:stability` **lulus** — blocked **satu kali saja** sekarang: kredensial provider owner. Catatan: kriteria "≥4/5 bergeser pada `strip`" di §6 N1 tidak berlaku untuk instrumen yang dibangun (semantik `strip` berbeda — lihat update N1); bar-nya adalah tidak ada `shift` pada ketiga kind
- [ ] 0 tabrakan hinge lintas 5 fixture (N2) — belum dibangun
- [ ] `rejected_candidates` terisi di 5/5 fixture, kedua mode (N3) — **frozen** (Q11); pengganti Q9/Q12 sudah ada
- [ ] delta C dan E pasca E9–E18 terukur dan tercatat di `Scoring/` (N4) — lihat koreksi saturasi di N4: pengukurnya harus diff label, bukan skor
- [x] `04-refine-backlog.md` §1 memuat baris untuk temuan dogfood, dengan status akurat (Q8, Q9, Q10, Q11, Q12, Q13, Q14, E19)
- [x] `01-product.md` memuat P7 (moat) dan utang abuse — ID-nya sekarang **`E19`** (`Q11` dipakai untuk freeze). Ditutup 2026-08-01: §1 memuat blok **Moat — honest reading (P7)** dan **Known debt** (`abuse_fraud_spiral` No hanya karena BYOK dev-only), §6.1 memuat trade-off penyimpanan (K6). Copy landing dicek terhadap overclaim: tidak ada yang perlu diubah — `headline`/`subhead`/`footerNote` (en + id) tidak mengklaim superioritas atau jaminan.

---

## 11. Batas validitas analisa ini

Dicatat supaya file ini tidak dipakai melampaui daya dukungnya:

- **Self-referential.** Produk menilai dirinya sendiri. Konvergensi lima run bisa
  berarti aturan E9–E11 bekerja, atau berarti mesin punya prior kuat tentang
  kategori "AI wrapper". §3 memberi satu titik jangkar eksternal (fixture C, di mana
  BIF **kalah**), tapi satu titik bukan validasi.
- **n=5, satu keluarga ide, satu provider.** Semua run memakai satu pin model
  (lihat `Q1` — BIF di-pin ke Mimo 2.5 Pro pada suite; pin untuk run dogfood tidak
  tercatat di file-file dogfood, dan **itu sendiri pelanggaran Q1** yang perlu
  diperbaiki di run berikutnya).
- **Ide antar run tidak identik**, jadi sebagian divergensi §2.5 bisa berasal dari
  perbedaan input, bukan ketidakstabilan engine. N1 dirancang khusus untuk memisahkan
  keduanya — sebelum N1 jalan, angka divergensi di file ini adalah **hipotesis, bukan
  temuan**.
- **Teks input run 3 korup** (K8), jadi seluruh banding run 3 (termasuk PONR 10 dan
  legal 50) harus dianggap tersangka sampai N7 selesai.
- **Tidak ada juri manusia** pada kelima run dogfood, berbeda dari protokol
  `03-quality-gap.md` yang mewajibkan ≥3 juri untuk fixture meta (Q6).

---

## 12. Changelog

| Tanggal | Catatan |
|---------|---------|
| 2026-07-30 | File dibuat. Analisa 5 run dogfood; K1–K8; N1–N8; 11 baris backlog usulan (§7); belum ada implementasi |
