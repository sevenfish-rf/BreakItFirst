# Project Overview & Core — BreakItFirst

Dokumen ini menjelaskan **inti produk**: apa yang dianalisis, **setiap bagian output report** (core), bagaimana bagian-bagian itu saling terkait, dan apa arti “hasil bagus” vs “hasil jelek”.  

Detail setup/API/kode → [guide.md](./guide.md) · [reference.md](./reference.md).

---

## 1. Inti produk (core)

### Pertanyaan tunggal

User membawa **satu ide** (produk, bisnis, sistem, game, API, …). Produk menjawab:

> **Bagaimana ide ini paling mungkin gagal — secara spesifik, kausal, dan terstruktur?**

Bukan: “fitur apa yang ditambah?”  
Bukan: “bagaimana biar berhasil?” (kecuali user minta eksplisit di luar MVP).  
Adalah: **pre-mortem** — bayangkan gagal, jelaskan *mengapa* dan *jalur sebab-akibatnya*.

### Nilai yang dijual

| Bukan core | Core |
|------------|------|
| Chat UI yang enak | **Kerangka analisis** yang memaksa spesifisitas |
| Model AI terbaru | **Pipeline 2-pass** + schema + visual yang menampilkan struktur kegagalan |
| “AI wrapper” | **Engine laporan** dengan terminologi failure (SPOF, cascade, resilience) |

Kalau output bisa diganti nama produk dan tetap “benar” untuk ide lain → **core gagal**, meski UI bagus.

### Input core

| Input | Peran |
|-------|--------|
| **Ide (teks)** | Bahan mentah analisis. Semakin konkret (user, model uang, constraint, tech), semakin tajam output. |
| **Kategori** | Memilih *lens* (apa yang model prioritaskan: churn, chicken-egg, App Store, hallucination, …). |
| **Locale** | Bahasa prose report (`en` / `id`). Enum band tetap English. |
| **Provider + model** | Kualitas Pass 1 menentukan kualitas *seluruh* report. |

### Bagaimana core dihitung (pipeline)

```
Ide + kategori + lens
        │
        ▼
PASS 1 — Reasoning (prose bebas, tidak ditampilkan ke user)
  Model berpikir seperti analis: rapuh di mana, pecah dulu apa,
  lalu apa yang ditimbulkan, sampai end state.
        │
        ▼
PASS 2 — Structuring (hanya ekstraksi ke JSON schema)
  Tidak boleh menambah klaim baru. Hanya “mengompres” Pass 1.
        │
        ▼
Validasi schema → UI report (7 blok core + stress test + velocity; cascade node = step + signal)
```

**Implikasi untuk developer:** bug di prompt Pass 1 merusak *semua* section. Bug di Pass 2/schema merusak *bentuk* dan konsistensi, meski reasoning bagus. UI hanya menampilkan; **kebenaran produk ada di kualitas & kaitan antar field schema**.

### Skala kualitatif (berlaku di beberapa field)

Hampir semua “seberapa yakin / seberapa mungkin” memakai band:

`Very Low | Low | Medium | High | Very High`

- Selalu **plus alasan satu baris** (bukan angka persen).
- Alasan: produk menolak *false precision* (“gagal 73%”).

Pengecualian: **Resilience score** = integer 0–100 per dimensi (skor kerapuhan/ketahanan relatif, **bukan** probabilitas).

---

## 2. Core output report (wajib dipahami)

Tujuh blok berikut **adalah produk**. Developer yang mengubah prompt, schema, validasi, atau UI section harus paham peran masing-masing.

Hubungan antar blok (ideal):

```
Summary ── memahami ide
    │
Assumptions ── fondasi diam-diam
    │
SPOF ── titik paling rapuh (inti emosional)
    │
Cascade ── rantai dari SPOF → end state
    │
Failure modes ── risiko per domain (paralel, bukan urutan waktu)
    │
Likelihood ── penilaian keseluruhan
    │
Velocity ── seberapa cepat jalur gagal (Fast/Medium/Slow)
    │
Resilience ── profil ketahanan multi-dimensi (bukan 1 angka)
    │
Stress test ── paparan arketipe (Yes/Maybe/No) — terpisah dari resilience
```

Kalau **Cascade** tidak merujuk SPOF/assumptions, atau **modes** tidak konsisten dengan SPOF → report “terasa template”.

---

### 2.1 Summary

| | |
|--|--|
| **Field schema** | `summary: string` |
| **Bentuk** | **Satu paragraf** — restatement ide dengan kata model sendiri |
| **UI** | Panel “Summary” / “Ringkasan” |

**Fungsi core**

- Membuktikan model **mengerti ide** sebelum mengkritik.
- Menjadi “kontrak pemahaman”: kalau summary salah, sisa report tidak bisa dipercaya.
- Bukan sinopsis marketing; bukan daftar pro/kontra.

**Isi yang diharapkan**

- Apa produk/sistemnya, untuk siapa, bagaimana (secara kasar) bekerja atau menghasilkan value.
- Detail yang **ada di input user**, bukan inventarisasi industri generik.

**Bukan summary**

- “Ini ide bagus yang bisa berhasil jika…”
- Saran fitur.
- Kritik panjang (itu di SPOF/cascade).

**Kriteria kualitas**

| Baik | Buruk |
|------|--------|
| User bilang “iya, itu idenya” | Salah paham market / model bisnis |
| Menyebut mekanisme unik ide | Bisa dipakai untuk 100 startup lain |

**Saat develop**

- Jangan dihapus dari schema: ini anchor kepercayaan user.
- Jangan digabung ke SPOF di UI: urutan mental “dulu sepakat ide, baru dihancurkan”.

---

### 2.2 Hidden assumptions (asumsi tersembunyi)

| | |
|--|--|
| **Field schema** | `assumptions: string[]` |
| **Jumlah** | **5–10** item (validasi server menolak di luar range) |
| **UI** | Daftar bernomor |

**Fungsi core**

- Mengekspos **syarat diam-diam** yang ide *butuh* benar agar hidup.
- Fondasi logis sebelum SPOF: SPOF sering = asumsi paling rapuh yang diandalkan berlebihan.
- Membantu user audit: “kalau asumsi #3 salah, apa yang pecah?”

**Contoh bentuk (bukan template wajib)**

- “Asumsi user percaya titip aset ke orang asing.”
- “Asumsi regulasi mengizinkan model X.”
- “Asumsi supply side mau onboarding tanpa insentif besar.”

**Bukan assumptions**

- Fitur yang “harusnya ada”.
- Risiko generik tanpa tautan ke ide (“butuh marketing”).
- Langkah eksekusi (“harus hire sales”).

**Kriteria kualitas**

| Baik | Buruk |
|------|--------|
| Fragile: bisa digoyang bukti/perilaku nyata | Truisme (“butuh user”) |
| Spesifik ke model / user / constraint ide | Sama untuk semua SaaS |
| 5–10, masing-masing satu klaim jelas | 2 item, atau 15 item bertele-tele |

**Saat develop**

- Jaga range 5–10 di schema + prompt.
- UI numbering harus stabil (satu klaim = satu nomor).
- Soft-check cascade: idealnya cascade “nyambung” ke setidaknya sebagian asumsi/SPOF.

---

### 2.3 Single Point of Failure (SPOF)

| | |
|--|--|
| **Field schema** | `single_point_of_failure` |
| **Subfield** | `component`, `confidence`, `confidence_reason`, `explanation` |
| **UI** | Hero panel report (paling menonjol) |

**Fungsi core — ini “jantung emosional” produk**

- Menjawab: **apa yang paling rapuh**, yang kalau gagal, sistem/ide goyah parah.
- Bukan daftar 5 risiko setara; **satu** titik fokus (meski dunia nyata multi-kausal, produk memilih *paling* rapuh untuk kejernihan).
- Harus **idea-specific**: ganti nama produk → penjelasan tidak boleh tetap masuk akal.

**Subfield**

| Subfield | Arti |
|----------|------|
| `component` | Label pendek: mis. “Trust cold-start”, “Unit economics ads”, “Model-provider lock-in” |
| `confidence` | Band seberapa yakin *ini* memang SPOF-nya: `Low`…`Very High` (bukan % gagal bisnis) |
| `confidence_reason` | Satu baris: kenapa band itu |
| `explanation` | 2–4 kalimat: **mekanisme** bagaimana component ini meruntuhkan ide |

**Bukan SPOF**

- “Kurang eksekusi / kurang modal” tanpa mekanisme spesifik ide.
- Seluruh “persaingan” tanpa tautan ke moat/struktur *ini*.
- Saran perbaikan (itu di luar positioning MVP).

**Kriteria kualitas**

| Baik | Buruk |
|------|--------|
| User kaget: “iya, itu yang rawan” | Bisa di-copy ke deck kompetitor mana saja |
| explanation = kausal | explanation = moral / motivasi |
| Selaras dengan assumptions #teratas | Bertentangan total dengan cascade |

**Saat develop**

- UI: SPOF di atas lipatan report; jangan dikubur di accordion.
- Prompt: self-check “ganti nama → masih valid?” → rewrite.
- Jangan pecah jadi multi-SPOF di MVP schema tanpa redesign produk.

---

### 2.4 Failure cascade

| | |
|--|--|
| **Field schema** | `cascade.nodes: { step, observable_signal }[]` |
| **Jumlah** | **7–12** node berurutan |
| **UI** | Graf vertikal (React Flow), reveal node-by-node; signal di bawah step |

**Fungsi core**

- Menampilkan **jalur kausal** dari titik rapuh (dekat SPOF) sampai **end state** (shutdown, stagnasi, pivot paksa, regulatory kill, dll.).
- Ini yang membedakan “daftar risiko” vs “cerita kegagalan”.
- Visual: **satu rantai**, bukan dua graf terpisah (spec: jangan Dependency Graph terpisah).

**Bentuk tiap node**

- Frasa pendek (ideal ~maks 8 kata di prompt), cocok jadi node diagram.
- Urutan = waktu/logika sebab → akibat, bukan prioritas acak.
- Node awal idealnya dekat `single_point_of_failure.component` / asumsi kritis.
- Node akhir = end state yang masuk akal dari rantai itu.

**Contoh alur (ilustrasi)**

```
Cold-start supply kosong
  → listing jarang
  → demand kecewa
  → retensi drop
  → supply makin undervalue platform
  → take-rate ditolak
  → unit economics jebol
  → shutdown / pivot
```

**Bukan cascade**

- Bullet fitur backlog.
- 3 node terlalu pendek / 20 node bertele-tele.
- Loncatan magis tanpa tautan (“lalu bangkrut”) tanpa langkah tengah.

**Kriteria kualitas**

| Baik | Buruk |
|------|--------|
| Baca top→bottom seperti domino | Urutan bisa diacak tanpa beda arti |
| Terhubung SPOF/assumptions | Cascade “dunia lain” dari SPOF |
| 7–12 langkah | 4 langkah atau 15+ langkah generik |

**Saat develop**

- Validasi jumlah node 7–12 di server.
- Soft-check `cascadeLooksConnected` — log jika putus dari SPOF/asumsi.
- UI: satu komponen graf; animasi build memperkuat “rantai”, bukan dekorasi.
- Jangan render sebagai list biasa saja di MVP “lengkap” — graf adalah bagian positioning.

---

### 2.5 Failure modes

| | |
|--|--|
| **Field schema** | `failure_modes.{ technical, business, security, legal, operations }` |
| **Bentuk** | Array string per kategori |
| **UI** | Kartu per kategori |

**Fungsi core**

- Memetakan risiko ke **domain** — paralel terhadap cascade (cascade = urutan waktu/kausal utama; modes = taksonomi “di mana bisa sakit”).
- Membantu pembaca dengan lensa berbeda (CTO vs legal vs ops) tanpa mengulang seluruh prose.

**Arti tiap bucket (panduan semantik)**

| Kunci | Fokus tipikal |
|-------|----------------|
| `technical` | Arsitektur, scale, reliabilitas, kualitas model/tech, integrasi |
| `business` | Market, pricing, churn, CAC, chicken-egg, kompetisi model |
| `security` | Abuse, fraud, data leak, trust breach, attack surface |
| `legal` | Regulasi, lisensi, liability, platform policy, compliance |
| `operations` | Delivery, support, burn, live-ops, proses, supply chain ops |

**Bukan failure modes**

- Mengulang cascade verbatim di tiap bucket.
- Bucket kosong padahal domain jelas relevan (boleh kosong jika *benar-benar* tidak ada — tapi jarang untuk ide nyata).
- Campur domain dalam satu bullet tanpa jelas bucket.

**Kriteria kualitas**

| Baik | Buruk |
|------|--------|
| Bullet pendek, actionable as *risk statement* | Esai panjang di satu item |
| Konsisten dengan SPOF (SPOF biasanya muncul di 1–2 domain) | Domain random tidak nyambung ke ide |
| Melengkapi cascade | Menggantikan cascade |

**Saat develop**

- Jaga 5 key schema tetap (UI & validasi bergantung nama key English).
- Label UI bisa di-i18n; **key JSON tetap English**.
- Hindari scrollbar jahat di card: konten mengatur tinggi, jangan cage scroll tanpa perlu.

---

### 2.6 Likelihood (kemungkinan gagal keseluruhan)

| | |
|--|--|
| **Field schema** | `likelihood: { band, reason }` |
| **Band** | `Very Low` … `Very High` |
| **UI** | Panel menonjol di samping/dekat SPOF |

**Fungsi core**

- Satu **penilaian keseluruhan** seberapa mungkin jalur kegagalan (yang dibahas report) materialize — tetap kualitatif.
- Bukan prediksi pasar numerik; **judgment** setelah melihat SPOF + cascade + modes.

**Hubungan dengan SPOF confidence**

| | SPOF `confidence` | Likelihood `band` |
|--|-------------------|-------------------|
| Menjawab | Seberapa yakin *ini* titik paling rapuh | Seberapa yakin *kegagalan material* (jalur itu) mungkin terjadi |
| Bisa beda | Tinggi: “jelas SPOF-nya X” | Medium: “tapi dunia bisa menunda gagal” |

**Kriteria kualitas**

| Baik | Buruk |
|------|--------|
| `reason` merujuk mekanisme di report | Band tanpa reason, atau reason generik |
| Konsisten dengan cascade/end state | “Very Low” padahal cascade berakhir shutdown total tanpa mitigasi di ide |

**Saat develop**

- Selalu pair band + reason di UI.
- Jangan konversi band ke % di UI (melanggar prinsip false precision).

---

### 2.7 Resilience score

| | |
|--|--|
| **Field schema** | `resilience_score: { technical, business, legal, operations, trust }` |
| **Tipe** | Integer **0–100** per dimensi |
| **UI** | Radar chart + angka per sumbu |

**Fungsi core**

- Profil **ketahanan relatif** multi-dimensi: di mana ide “lebih kuat / lebih rapuh”.
- **Dilarang** digabung jadi satu overall score di produk (spec: never collapse). Satu angka overall = false comfort.

**Arti arah skor (konvensi produk)**

- **Lebih tinggi** ≈ lebih resilient / kurang rapuh di dimensi itu.
- **Lebih rendah** ≈ lebih fragile.
- Ini **bukan** probabilitas sukses, bukan ranking vs kompetitor global.

**Dimensi**

| Dimensi | Membaca |
|---------|---------|
| `technical` | Ketahanan arsitektur/tech/delivery teknis |
| `business` | Ketahanan model ekonomi/market |
| `legal` | Ketahanan terhadap pressure regulasi/legal |
| `operations` | Ketahanan proses/ops/skala operasi |
| `trust` | Ketahanan terhadap erosi kepercayaan user/partner |

**Kriteria kualitas**

| Baik | Buruk |
|------|--------|
| Profil “bergelombang” yang masuk akal vs SPOF | Semua 50, atau semua 90 |
| Dimensi SPOF cenderung rendah | SPOF trust-rapuh tapi trust = 95 |
| Integer 0–100 valid | Float liar / di luar range |

**Saat develop**

- Validasi 0–100 di schema.
- Radar wajib 5 sumbu; jangan tambah “overall” di UI.
- Animasi angka boleh; jangan menyiratkan presisi palsu di copy.

---

### 2.8 Stress test (arketipe) & failure velocity

| Blok | Field | Catatan |
|------|--------|---------|
| **Stress test** | `stress_test.items[]` | Per arketipe: `archetype_id`, `verdict` Yes/Maybe/No, `reason`. **Jangan** digabung jadi overall danger score. |
| **Velocity** | `failure_velocity` | `band`: Fast/Medium/Slow + `reason`. Kualitatif, bukan %. |
| **Cascade signal** | `cascade.nodes[].observable_signal` | Observasi dunia nyata — **bukan** saran (“sebaiknya…”). |

---

## 3. Apa yang *bukan* core (tapi sering dikira core)

| Bukan core | Kenapa |
|------------|--------|
| Chat history / multi-turn debate | MVP = satu shot analisis terstruktur |
| Saran perbaikan otomatis | Positioning: expose blind spot, bukan coach |
| Share card / gallery | Distribusi; tidak mengubah kebenaran analisis |
| Theme / BorderGlow / PixelBlast | Packaging; **tidak** boleh menggantikan ketajaman SPOF/cascade |
| Model flagship | Alat; core = **struktur pertanyaan + schema + kriteria spesifisitas** |

---

## 4. Hasil produk (outcomes)

### Untuk end user

Setelah run yang baik:

1. **Summary** cocok dengan niat ide.
2. **Assumptions** memunculkan “oh iya, kita anggap itu gratis”.
3. **SPOF** menusuk — spesifik, bukan slide deck klise.
4. **Cascade** bisa diceritakan ulang dalam 30 detik sebagai domino.
5. **Modes** memetakan “siapa di tim harus peduli apa”.
6. **Likelihood + reason** memberi bobot tanpa %.
7. **Resilience** menunjukkan profil, bukan ranking vanity.

Reaksi sukses: *“Belum kepikiran.”*  
Reaksi gagal: *“Ini AI copy-paste startup advice.”*

### Untuk developer / maintainer

Memahami core = tahu **field mana yang tidak boleh dipecah sembarangan**, mana yang boleh di-i18n di UI saja, mana yang wajib validasi ketat, dan mana yang hanya soft-check.

### Contoh skenario (hanya ilustrasi; core tetap 7 blok di atas)

| Input ringkas | Yang diharapkan di core |
|---------------|-------------------------|
| Marketplace “Airbnb for pets” | Assumptions: trust, supply density; SPOF sering cold-start/trust; cascade chicken-egg; modes legal/ops/safety |
| API publik usage-based | Lens rate limit/abuse/versioning; SPOF sering auth/abuse atau pricing; modes technical + business |
| AI product | SPOF sering quality ceiling / cost / provider dependency; trust score cenderung ditekan |

---

## 5. Kapan core “rusak” (checklist regresi)

Anggap regresi produk jika:

- [ ] Summary salah paham ide, tapi report tetap “yakin”.
- [ ] Assumptions & SPOF generik (nama produk bisa diganti).
- [ ] Cascade tidak mulai dari dekat SPOF / tidak sampai end state.
- [ ] Cascade dan failure modes saling kontradiksi parah.
- [ ] Likelihood tanpa reason, atau dipaksa jadi persen di UI.
- [ ] Resilience digabung jadi 1 overall score.
- [ ] Pass 2 menambah klaim yang tidak ada di Pass 1.
- [ ] UI terlihat “chat AI” dan mengubur SPOF/cascade.

---

## 6. One-liner

**Core BreakItFirst** adalah **tujuh blok analisis kegagalan terstruktur** (Summary → Assumptions → SPOF → Cascade → Modes → Likelihood → Resilience) yang dihasilkan two-pass pipeline, dengan satu misi: menampakkan jalur gagal yang *spesifik ke ide* sebelum realitas melakukannya.
