# 01 — Draft brief dogfood (current state, 2026-08-03)

**Untuk apa file ini:** teks ide yang dipakai untuk menjalankan BreakItFirst atas
dirinya sendiri **pada kondisi sekarang**. Korpus dogfood yang ada
([`00-analysis.md`](./00-analysis.md), 5 run) dijalankan 27–29 Juli, **sebelum**
E19/E20/E21/E22/E23, S6/S7/S8/S9, Q8/Q19 dan seluruh harness evaluasi masuk. Jadi
kelima run itu menilai produk yang sudah tidak ada lagi, dan tidak satu pun
mekanisme kalibrasi yang sekarang berjalan pernah ikut dinilai.

| | |
|--|--|
| **Ditulis** | 2026-08-03 |
| **Status** | draft — belum dijalankan, belum ada biaya keluar |
| **Sumber fakta** | `src/lib/{schema,prompts,pipeline,input-validation,rate-limit,report-storage,feedback-store,input-damage}.ts`, `src/lib/i18n/dictionaries.ts`, `docs/04-refine-backlog.md`, keluaran `eval/read-feedback.ts` |
| **Bahasa input** | Indonesia — sama seperti 5 run lama, supaya perbandingan tidak sekaligus mengubah bahasa input |
| **Panjang** | 7.4k karakter terukur (§4); batas keras `MAX_IDEA_LENGTH` = 8000 |

> **Baca §3 sebelum menempel.** Empat dari lima run lama punya teks input yang
> **rusak saat ditempel** (K8) — kata menempel, kalimat terpotong di tengah. Itu
> mencemari input yang dianalisis dan sampai sekarang belum pernah direproduksi.

---

## 1. Teks brief (ini yang ditempel, tanpa diubah)

```
BreakItFirst adalah aplikasi web premortem dan failure analysis untuk ide produk atau bisnis yang belum dibangun. Pengguna menempelkan deskripsi ide, memilih kategori, bahasa laporan, dan mode analisis, lalu menerima satu laporan kegagalan terstruktur. Ini bukan brainstorming fitur, bukan business coaching, bukan daftar pro-kontra, dan bukan prediksi apakah bisnisnya akan berhasil. Satu pertanyaan yang dijawab: bagaimana ide ini paling masuk akal gagal, dan apa rantai sebab-akibatnya. Hasil berhasil kalau pembaca merasa belum pernah mempertimbangkan jalur kegagalan itu; nasihat startup generik berformat profesional dianggap kegagalan produk.

Alur pengguna. Halaman depan menjelaskan produk; analisis dijalankan di halaman aplikasi terpisah. Pengguna menulis atau menempelkan ide 40 sampai 8000 karakter, memilih satu dari sebelas kategori, bahasa laporan Inggris atau Indonesia, dan mode Standard atau Deep. Sebelum submit, bentuk teks ide diperiksa dan temuannya muncul sebagai saran yang tidak memblokir. Analisis berjalan sebagai job di server dengan progres per tahap; refresh menyambungkan pengguna ke job yang sama kecuali dibatalkan, dan satu job per sesi browser. Setelah selesai pengguna membaca laporan, boleh menjawab satu pertanyaan umpan balik, mengekspor ke Markdown, membuka laporan lama dari riwayat browser, atau memulai analisis baru.

Pipeline analisis. Tahap pertama melakukan reasoning bebas, membangun beberapa kandidat jalur kegagalan secara internal, memberi peringkat, lalu memilih satu yang paling dominan dan paling spesifik terhadap ide. Tahap berikutnya melakukan adversarial critique atas argumen itu: apakah hinge terlalu generik, hanya mengulang risiko yang sudah jelas, bergantung pada teknologi yang tidak disebutkan pengguna, atau tidak benar-benar menyebabkan cascade yang dipilih. Tahap terakhir memadatkan reasoning yang sudah direvisi menjadi JSON terstruktur tanpa menambah klaim baru, lalu divalidasi terhadap schema; pelanggaran ringan muncul sebagai peringatan di laporan, bukan penolakan.

Isi laporan:
- restatement ide dan 5 sampai 10 hidden assumption;
- satu SPOF dengan label mekanisme, tingkat keyakinan, alasan keyakinan, dan penjelasan;
- kandidat SPOF berperingkat: pemenang plus sampai tiga kandidat yang ditolak beserta alasan penolakan satu baris, di kedua mode;
- 7 sampai 12 langkah failure cascade dengan observable signal per langkah dan optional point of no return;
- failure modes pada domain technical, business, security, legal, dan operations;
- likelihood kualitatif untuk jalur yang dipilih, bukan probabilitas bisnisnya gagal;
- failure velocity dan resilience score lima dimensi skala 0 sampai 100;
- stress test terhadap sejumlah failure archetype;
- kalibrasi konsistensi SPOF pada mode Deep, dan blok provenance run.

Kalibrasi yang sudah berjalan. Pipeline mengukur seberapa banyak konteks pembeda yang dibawa teks ide, bukan panjangnya, lalu menulis skor, dimensi terdeteksi, dan band tipis, cukup, atau kaya ke laporan. Ukuran itu membatasi keyakinan yang boleh diklaim: input tipis menurunkan tingkat keyakinan, dengan alasannya sebagai peringatan. Teks ide pada laporan distempel server byte demi byte dari input tervalidasi, dan model dilarang menyalin ulang ide ke outputnya. Provenance run berisi mode, bahasa, id model tiap tahap, host provider tanpa kredensial, dan jumlah draft; ditulis oleh pipeline, bukan oleh model. Pada mode Deep, tingkat kesepakatan SPOF dihitung dari daftar kandidat kedua draft, bukan dinilai sendiri oleh model, dan alasannya menyebut batasnya sendiri: pendeteksian parafrase bersifat leksikal.

Pemeriksaan input sebelum submit. Delapan bentuk kerusakan tempel dideteksi, antara lain kata menempel tanpa spasi, dua kata utuh yang tersambung, deretan huruf terlalu panjang, karakter tak terlihat, karakter rusak akibat salah encoding, dan line break di tengah kalimat. Peringatan ini bersifat saran: tidak ada yang diblokir, dan copy-nya menyatakan bahwa pemeriksaan yang bersih bukan bukti teksnya utuh.

Umpan balik hinge. Di laporan ada satu pertanyaan dengan tiga jawaban: hinge-nya benar dan baru; bukan yang ini; sudah saya tahu. Ada kolom opsional untuk menuliskan hinge yang menurut pengguna seharusnya dipilih. Yang dikirim hanya sidik jari satu arah dari teks ide, verdict, bahasa, mode, dan kategori; teks idenya sendiri tidak pernah dikirim. Event ditulis append-only di instance yang melayani permintaan, tanpa akun dan tanpa id sesi, lewat endpoint tanpa autentikasi. Karena sink-nya per proses dan tidak bertahan melewati redeploy, hitungannya batas bawah. Sampai hari ini hanya ada tiga event, ketiganya dari pengujian internal pemilik, bukan pengguna nyata.

Penyimpanan dan batas teknis. Laporan dan riwayat disimpan di browser, maksimal sepuluh laporan dengan masa simpan 30 hari; tidak ada database laporan permanen di server dan tidak ada akun pengguna. Job analisis disimpan sementara oleh server supaya proses bisa dilanjutkan setelah refresh, tetapi sistem belum dirancang untuk deployment multi-instance. Batas laju delapan analisis per 15 menit per kombinasi alamat ip dan sesi; mode Deep memakai dua slot. Enum band untuk keyakinan, likelihood, dan velocity tetap berbahasa Inggris pada kedua bahasa laporan; hanya prosanya yang diterjemahkan.

Model dan provider. Pada fase development, pemilik dan developer memakai kunci sendiri terhadap provider yang kompatibel dengan OpenAI untuk menguji berbagai model; ini fasilitas development dan internal testing, bukan fitur yang akan dipasarkan. Untuk versi produksi, pengguna tidak direncanakan memasukkan kunci sendiri, dan provider serta model finalnya belum diputuskan. Pricing juga belum diputuskan karena masih perlu disesuaikan dengan biaya provider, pemakaian token, selisih biaya Standard dan Deep, serta willingness to pay target pengguna; bayar per analisis, paket kredit, dan subscription masih sama-sama terbuka.

Instrumen pengukuran internal. Ada harness evaluasi offline yang membaca run yang sudah tersimpan: lima ide fixture dengan tiga penulisan ulang masing-masing untuk memeriksa apakah hinge bertahan ketika kata-katanya diubah; pemeriksaan apakah lima ide berbeda menghasilkan hinge berbeda; penyekoran yang menyamarkan nama produk lalu menebak sebuah laporan milik ide yang mana di antara delapan ide bersaing; pemasangan run Inggris dan Indonesia atas ide yang sama; serta pemeriksaan byte teks ide di setiap run tersimpan. Yang belum ada: perbandingan antar model, cakupan mode Deep yang setara, juri di luar produk, dan yang paling penting, ground truth apakah hinge yang dipilih benar di dunia nyata.

Target pengguna dan alternatif. Sasaran awal: orang sebelum tahap build atau sebelum mengambil komitmen — founder yang mengevaluasi ide, product manager yang mengusulkan produk baru, indie hacker, dan tim yang ingin menguji asumsi proposal. Alternatif sekarang: premortem dengan AI chat umum, risk checklist, diskusi internal tim, serta mentor atau konsultan. Produk tidak mengklaim selalu lebih tajam daripada semua frontier model. Yang diuji adalah apakah struktur satu SPOF dan satu causal spine konsisten menghasilkan analisis yang lebih fokus, lebih bisa diperiksa, dan lebih berguna untuk keputusan dibanding jawaban free-form yang menyebar ke banyak risiko.

Status validasi. Produk masih dalam tahap pengembangan. Belum ada data produksi tentang retention, konversi, willingness to pay, biaya rata-rata per laporan, maupun seberapa sering laporan benar-benar mengubah keputusan pengguna. Premis yang sedang diuji: target pengguna cukup sering punya keputusan sebelum build, bersedia memberi konteks yang memadai, dan mendapat nilai cukup besar dari satu laporan premortem terstruktur untuk kembali memakai atau membayar produk.
```


