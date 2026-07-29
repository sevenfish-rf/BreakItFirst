# Laporan kegagalan

**Kategori:** SaaS  
**Dibuat:** 2026-07-29T09:47:58.617Z

---

## Ide yang dianalisis (basis pipeline)

_Input setelah validasi — teks sumber yang dipakai Pass 1–2._

```
BreakItFirst adalah aplikasi SaaS premortem dan failure analysis untuk membantu founder, product manager, indie hacker, dan tim produk mengevaluasi ide produk atau bisnis sebelum mengalokasikan waktu dan modal untuk membangunnya.

Pengguna memasukkan deskripsi ide yang belum dibangun, memilih kategori produk, lalu BreakItFirst menghasilkan satu laporan kegagalan terstruktur. Produk ini tidak bertujuan memberi brainstorming fitur, business coaching, daftar pro-kontra, atau prediksi numerik apakah sebuah startup akan berhasil. Pertanyaan utama yang ingin dijawab adalah: “Bagaimana ide ini paling masuk akal mengalami kegagalan, dan apa rantai sebab-akibatnya?”

Engine menggunakan pipeline analisis bertahap. Tahap pertama melakukan reasoning bebas dan menghasilkan beberapa kandidat jalur kegagalan secara internal. Dari kandidat tersebut, engine harus memilih satu Single Point of Failure (SPOF) yang dianggap paling dominan dan paling spesifik terhadap ide pengguna. Tahap berikutnya melakukan adversarial critique terhadap argumen tersebut untuk memeriksa apakah SPOF terlalu generik, hanya mengulang risiko yang sudah jelas, bergantung pada asumsi teknologi yang tidak disebutkan pengguna, atau tidak benar-benar menyebabkan cascade yang dipilih. Tahap terakhir mengubah reasoning yang sudah direvisi menjadi laporan JSON terstruktur tanpa menambahkan klaim baru.

Laporan akhir berisi:
- restatement atau ringkasan ide;
- 5–10 hidden assumptions;
- satu SPOF beserta tingkat keyakinan dan penjelasan mekanismenya;
- 7–12 langkah failure cascade yang tersusun secara kausal;
- observable signal untuk setiap langkah cascade;
- optional point of no return;
- failure modes pada domain technical, business, security, legal, dan operations;
- likelihood kualitatif untuk jalur kegagalan yang dipilih, bukan probabilitas keseluruhan bisnis gagal;
- resilience score pada dimensi technical, business, legal, operations, dan trust;
- stress test terhadap sejumlah failure archetype;
- failure velocity;
- serta kalibrasi konsistensi SPOF ketika pengguna menjalankan Deep Analysis.

Nilai utama yang ingin diberikan BreakItFirst bukan jumlah bagian laporan atau banyaknya AI pass. Nilainya adalah kemampuan menemukan satu structural hinge yang spesifik terhadap ide pengguna, lalu menjelaskan bagaimana kegagalan pada hinge tersebut berkembang menjadi satu causal spine yang koheren. Hasil yang dianggap berhasil harus membuat pengguna berpikir, “Saya belum mempertimbangkan jalur kegagalan itu.” Hasil yang hanya berisi nasihat startup generik dengan format yang terlihat profesional dianggap sebagai kegagalan produk.

Produk memiliki dua mode analisis:
1. Standard Analysis untuk analisis reguler dengan biaya dan waktu proses lebih rendah.
2. Deep Analysis yang menjalankan dua reasoning draft untuk membandingkan kandidat SPOF, lalu menampilkan kalibrasi tingkat kesepakatan di antara hasil reasoning tersebut. Deep Analysis memiliki biaya komputasi dan waktu tunggu lebih tinggi.

Alur pengguna yang direncanakan:
1. Pengguna membuka aplikasi dan memasukkan deskripsi idenya.
2. Pengguna memilih kategori dan bahasa laporan.
3. Pengguna memilih Standard atau Deep Analys
4. Analisis dijalankan sebagai background job dengan progres per tahap.
5. Jika halaman direfresh ketika proses masihenyambungkan kembali pengguna ke job yang sama.
6. Setelah selesai, pengguna membaca laporan visual, termasuk failure cascade dan resilience profile.
7. Pengguna dapat menyimpan riwayat laporan secara lokal dan mengekspor laporan ke Markdown.
8. Pengguna dapat memulai analisis baru atau membuka kembali laporan sebelumnya.

Pada fase development, BreakItFirst menggunakan BYOK (Bring Your Own Key) agar pemilik dan developer dapat menguji berbagai model serta provider OpenAI-compatible. BYOK hanya merupakan fasilitas development dan internal testing, bukan fitur utama yang akan dipasarkan kepada pengguna produksi.

Untuk versi produksi, pengguna tidak direncanakan memasukkan API key sendiri. BreakItFirst nantinya akan memakai provider yang lebih stabil dan dipilih serta dikelola oleh produk. Provider dan model final belum diputuskan. Strategi pricing juga belum ditentukan karena masih perlu disesuaikan dengan biaya provider, penggunaan token, perbedaan biaya antara Standard dan Deep Analysis, serta willingness to pay dari target pengguna. Opsi seperti pembayaran per analisis, paket kredit, atau subscription masih terbuka dan belum menjadi keputusan produk.

Pada tahap sekarang, laporan dan history pengguna disimpan di browser, dengan jumlah history terbatas. Job analysis disimpan sementara oleh server agar proses dapat dilanjutkan setelah refresh, tetapi sistem belum dirancang untuk deployment multi-instance berskala besar dan belum memiliki database laporan permanen atau akun pengguna penuh.

BreakItFirst mendukung laporan berbahasa Inggris dan Indonesia. Target awalnya adalah pengguna yang sedang berada pada
tahap sebelum build atau sebelum mengambil kongevaluasi ide startup, product manager yang
mengusulkan produk baru, indie hacker yang haif, dan tim yang ingin menguji asumsi proposalsebelum eksekusi.

Kompetitor atau alternatif pengguna adalah premortem menggunakan general-purpose AI chat, risk checklist, diskusi
internal tim, mentor atau konsultan, serta keounder. BreakItFirst tidak mengklaim selalumenghasilkan analisis yang lebih tajam daripada semua frontier model. Diferensiasi yang ingin diuji adalah apakah struktur satu SPOF dan satu causal spine dapat secara konsisten menghasilkan analisis yang lebih fokus, dapat diperiksa, dan berguna untuk keputusan daripada jawaban free-form yang menyebar ke banyak risiko.

Produk masih berada dalam tahap pengembangan dan validasi. Belum ada data production mengenai retention, conversion, willingness to pay, biaya rata-rata per laporan, atau seberapa sering hasil analisis benar-benar mengubah keputusan pengguna. Premis yang sedang diuji adalah bahwa target pengguna cukup sering memiliki ide atau keputusan sebelum build, bersedia memberikan konteks yang memadai, dan mendapatkan nilai yang cukup besar dari satu laporan premortem terstruktur untuk kembali menggunakan atau membayar produk.

Kenapa draft ini cocok untuk dogfood

Draft ini sengaja:

- Menyatakan BYOK hanya untuk development, bu
- Tidak mengasumsikan pricing sudah dipilih.
- Menyebut kandidat pricing hanya sebagai opsi terbuka, bukan keputusan.
- Membedakan Standard dan Deep tanpa menjadikan jumlah pass sebagai USP.
- Menjelaskan keterbatasan produk saat ini se
- Memberi informasi target pengguna, workflow, kompetitor, dan maturity produk.
- Tidak menyebut “risiko terbesar kami adalah generic output” sebagai fakta; itu hanya dimasukkan sebagai kriteria kualitas produk. Dengan begitu engine masih harus memilih sendiri SPOF dominannya.
- Tidak memberikan angka traction, biaya, atau conversion yang belum ada.
```

## Pembacaan sistem (restatement)

BreakItFirst paling mungkin gagal ketika kewajiban memilih satu SPOF spesifik memaksa engine mengubah deskripsi ide yang belum cukup menentukan menjadi satu hipotesis yang terlihat final. Adversarial critique dapat meloloskan kamuflase spesifik, sementara JSON, Deep Analysis, observable signal, dan resilience profile membuat hasilnya semakin formal tanpa menciptakan bukti pembeda.

## Single Point of Failure

**Input underconstrained**

- **Keyakinan:** High
- **Alasan keyakinan:** Mekanisme ini langsung mengikuti format input, kewajiban memilih satu SPOF, dan nilai produk yang bergantung pada spesifisitas causal spine.

### Kenapa hinge ini

_Asumsi struktural yang SPOF ini andalkan — bukan risiko generik yang sudah semua sebut._

Pengguna memberikan detail yang dapat membedakan mekanisme kegagalan, bukan hanya visi, target pengguna, dan deskripsi solusi. · Engine dapat membedakan SPOF dominan dari beberapa jalur yang sama-sama masuk akal.

### Penjelasan mekanisme

Deskripsi ide sebelum build dapat belum menjelaskan perilaku aktual pengguna, volume atau frekuensi penggunaan, proses operasional, batas distribusi, struktur biaya, atau dependensi yang membuat satu jalur kegagalan lebih dominan. Engine kemudian dapat memilih SPOF berdasarkan wording, kategori, dan pola reasoning, bukan mekanisme yang benar-benar dibedakan oleh input. Critique dapat menolak bahasa generik, tetapi tanpa bukti pembeda hanya mengganti satu formulasi dengan formulasi lain. Dua reasoning pass, agreement, dan JSON tidak menciptakan fakta baru.

### Asumsi kritis untuk SPOF ini

- **#1** — Pengguna memberikan detail yang dapat membedakan mekanisme kegagalan, bukan hanya visi, target pengguna, dan deskripsi solusi.
- **#3** — Engine dapat membedakan SPOF dominan dari beberapa jalur yang sama-sama masuk akal.
- **#4** — Keharusan memilih satu SPOF tidak membuat keyakinan tampak lebih tinggi daripada buktinya.

### Kalibrasi SPOF (Deep)

- **Kesepakatan:** Medium
- **Run Pass 1:** 2
- **Alasan:** Kedua draft sepakat bahwa laporan dapat tampak spesifik tanpa dasar mekanistik cukup, tetapi Draft A menempatkan hinge pada input yang underconstrained dan Draft B pada adversarial gate yang meloloskan generik.
- **Kandidat:** Underconstrained input memaksa SPOF palsu-spesifik; Adversarial gate meloloskan generik; Pipeline reasoning-ke-JSON kehilangan causal spine; Satu laporan tidak mengubah keputusan; Ketergantungan provider dengan biaya per analisis yang belum diketahui

## Kemungkinan jalur gagal

_Peluang jalur kegagalan ini terjadi — bukan peluang keseluruhan perusahaan gagal._

- **Band:** High
- **Alasan:** Jalur ini langsung menyerang nilai inti dan dapat muncul pada analisis pertama: input yang tidak cukup membedakan kandidat tetap harus diubah sistem menjadi satu SPOF dan laporan yang tampak palsu-spesifik. Belum ada bukti production bahwa pengguna memberikan konteks cukup atau bahwa satu causal spine lebih tajam daripada alternatif.

## Kecepatan kegagalan

_Seberapa cepat jalur gagal ini cenderung terjadi._

- **Band:** Fast
- **Alasan:** Kegagalan dapat terlihat pada satu laporan pertama ketika pengguna menyadari input yang sama mendukung beberapa SPOF atau cascade terpilih tidak memiliki dasar pembeda. Dampak pada penggunaan ulang dan pricing muncul segera setelah perbandingan dengan alternatif yang sudah digunakan.

## Asumsi tersembunyi

1. Pengguna memberikan detail yang dapat membedakan mekanisme kegagalan, bukan hanya visi, target pengguna, dan deskripsi solusi. *(terkait SPOF)*
2. Kategori produk mempersempit ruang hipotesis secara substantif.
3. Engine dapat membedakan SPOF dominan dari beberapa jalur yang sama-sama masuk akal. *(terkait SPOF)*
4. Keharusan memilih satu SPOF tidak membuat keyakinan tampak lebih tinggi daripada buktinya. *(terkait SPOF)*
5. Adversarial critique dapat mendeteksi klaim yang hanya mengulang istilah pengguna.
6. Pengguna lebih terbantu oleh satu jalur yang dipilih daripada pengungkapan bahwa beberapa jalur belum dapat dibedakan.
7. Pengguna dapat membedakan insight struktural dari checklist startup yang memakai istilah produk mereka.
8. Laporan selesai ketika pengguna masih memiliki keputusan konkret yang dapat diubah.
9. Dua reasoning draft menghasilkan kalibrasi yang bermakna.
10. Satu laporan cukup bernilai untuk mengatasi pola penggunaan episodik sebelum build.

## Skor ketahanan

_0–100 kemampuan menahan jalur gagal ini — semakin rendah semakin rapuh._

| Dimension | Score |
|-----------|------:|
| technical | 50 |
| business | 20 |
| legal | 50 |
| operations | 50 |
| trust | 30 |

## Rantai kegagalan

_Rantai kausal dari titik rapuh sampai end state — tiap langkah ada sinyal yang bisa diamati._

- **Titik tanpa kembali (indeks langkah):** 8

### 1. Pengguna mengirim input tanpa constraint pembeda

*Sinyal:* Deskripsi berhenti pada visi, persona, dan fitur inti tanpa detail tentang bagaimana kegagalan terjadi.

### 2. Engine menghasilkan beberapa kandidat yang sama-sama kompatibel

*Sinyal:* Reasoning memuat kandidat distribusi, perilaku pengguna, operasi, atau biaya tanpa bukti input yang jelas untuk merankingnya.

### 3. Pemilihan SPOF bergeser ke sinyal tekstual

*Sinyal:* Perubahan wording tanpa perubahan fakta ide menghasilkan SPOF yang berbeda.

### 4. Critique mengganti istilah tanpa bukti dominasi

*Sinyal:* Critique menghapus frasa generik lalu memakai istilah produk tanpa menyebut constraint input sebagai dasar.

### 5. Serialisasi mengunci satu hipotesis

*Sinyal:* Laporan JSON tidak menjelaskan mengapa jalur terpilih mengalahkan kandidat lain.

### 6. Format rapi menyamarkan dasar informasi lemah

*Sinyal:* Pengguna memuji struktur tetapi mempertanyakan dominasi hinge atau melihat cascade dapat diterapkan pada ide lain.

### 7. Pengguna tidak mengubah keputusan sebelum build

*Sinyal:* Laporan selesai dibaca tetapi tidak dikaitkan dengan pembatalan ide, perubahan scope, atau alokasi waktu dan modal.

### 8. Alternatif dianggap sama tajamnya **[Titik tanpa kembali]**

*Sinyal:* Prompt yang sama menghasilkan jawaban alternatif yang dianggap sama tajamnya, dengan perbedaan terutama pada format.

### 9. Deep Analysis terlihat sebagai pengulangan

*Sinyal:* Agreement tinggi tidak memberi insight tambahan, atau agreement rendah tidak dapat dijelaskan oleh fakta baru.

### 10. Penggunaan berhenti setelah satu analisis

*Sinyal:* History lokal menyimpan laporan, tetapi tidak terlihat pembukaan kembali atau analisis lanjutan.

## Stress test arketipe

_Paparan pola untuk ide ini — bukan satu skor bahaya keseluruhan._

### Cold-start / chicken-egg

- **ID arketipe:** `cold_start_chicken_egg`
- **Verdict:** No
- **Alasan:** BreakItFirst bukan marketplace atau produk jaringan dua sisi; nilai laporan tidak bergantung pada jumlah pengguna lain.

### Unit economics death spiral

- **ID arketipe:** `unit_economics_death_spiral`
- **Verdict:** Maybe
- **Alasan:** Pricing, provider, biaya Standard dan Deep, serta pola penggunaan belum ditentukan; jalur ini dapat material bila Deep lebih mahal tetapi tidak mengubah keputusan.

### Trust erosion cascade

- **ID arketipe:** `trust_erosion`
- **Verdict:** Yes
- **Alasan:** Laporan yang tampak spesifik tetapi berubah mengikuti wording atau tidak menjelaskan dominasi SPOF merusak kepercayaan.

### Regulatory / policy kill

- **ID arketipe:** `regulatory_kill`
- **Verdict:** No
- **Alasan:** Fungsi premortem tidak bergantung pada izin khusus atau akses ke keputusan teregulasi; risiko legal terkait penyajian dan data.

### Model / quality ceiling

- **ID arketipe:** `model_quality_ceiling`
- **Verdict:** Yes
- **Alasan:** Reasoning harus memilih satu hinge dari input yang belum tentu menentukan, dan tambahan reasoning pass tidak mengatasi batas informasi tersebut.

### Vendor / provider lock-in

- **ID arketipe:** `vendor_lock_in`
- **Verdict:** Maybe
- **Alasan:** Provider produksi belum dipilih; ketergantungan relevan bila perpindahan model mengubah SPOF, agreement Deep, biaya, atau konsistensi bahasa.

### Distribution moat erosion

- **ID arketipe:** `distribution_moat_erosion`
- **Verdict:** No
- **Alasan:** Tidak ada kanal distribusi tertentu sebagai fondasi; general-purpose AI adalah substitusi langsung, bukan kanal distribusi.

### Abuse / fraud spiral

- **ID arketipe:** `abuse_fraud_spiral`
- **Verdict:** No
- **Alasan:** BYOK hanya untuk development, tanpa public API key produksi, free-tier, atau sistem kredit yang dinyatakan sebagai model pemasaran.

## Mode kegagalan

> **Domain yang saling memperparah:** Pemrosesan dan penyimpanan ide sensitif melalui server, provider, dan history lokal mempertemukan risiko security dengan kesan kepastian legal ketika diagnosisnya tidak sebanding.

### technical

- Pipeline menghasilkan JSON valid, tetapi serialisasi beberapa kandidat menjadi satu SPOF menghapus alasan kandidat terpilih lebih kuat.
- Adversarial critique memperbaiki bahasa tanpa memperbaiki evidensi.
- Deep Analysis atas input yang sama tidak otomatis menjadi kalibrasi informatif ketika constraint pembeda tidak ada.

### business

- Nilai produk runtuh ketika diagnosis tidak berbeda dari general-purpose AI, diskusi tim, mentor, atau checklist internal.
- Penggunaan episodik sebelum build tidak berlanjut jika laporan pertama tidak mengubah keputusan.
- Standard dan Deep sulit dibedakan berdasarkan manfaat keputusan bila Deep hanya memperbanyak interpretasi input yang sama.
- History lokal yang terbatas tidak mengubah analisis satu kali menjadi aset konteks untuk penggunaan berulang.

### security

- Ide sensitif diproses melalui server dan provider yang dikelola produk meskipun diagnosisnya lemah.
- History lokal pada browser dapat terekspos kepada pengguna lain pada perangkat atau profil browser yang sama.

### legal

- Confidence dan causal spine dapat membuat hipotesis underconstrained terbaca sebagai penilaian profesional.
- Tindakan berdasarkan laporan yang tampak spesifik tetapi tidak didukung detail dapat menimbulkan sengketa mengenai kesenjangan antara kepastian presentasi dan keterbatasan input.

### operations

- Kualitas tidak cukup diperiksa dengan memastikan field JSON terisi; hubungan klaim, detail input, kandidat alternatif, dan cascade harus tetap ada.
- Background job dan reconnect dapat berhasil tetapi tetap mengantarkan diagnosis yang salah arah.
- Dukungan Inggris dan Indonesia dapat mengubah nuansa constraint, confidence, atau hubungan sebab-akibat dan menyamarkan dasar SPOF yang lemah.

---

*Diekspor dari BreakItFirst · What Would Break This?*
