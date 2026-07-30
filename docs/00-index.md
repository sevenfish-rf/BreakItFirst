# Docs index

| # | File | Isi |
|---|------|-----|
| **01** | [01-product.md](./01-product.md) | Identitas produk + arti tiap blok report |
| **02** | [02-develop.md](./02-develop.md) | Setup, arsitektur, API, schema, modules |
| **03** | [03-quality-gap.md](./03-quality-gap.md) | Eksperimen quality gap (protokol + ide) |
| **04** | [04-refine-backlog.md](./04-refine-backlog.md) | **Semua** todo/improve dari semua idea test |
| **05** | [05-doc-audit.md](./05-doc-audit.md) | Audit drift doc ↔ code: klasifikasi, verdict per klaim, fix pass |
| **Scoring/** | [1–8](./Scoring/1.md) | 1–5 suite A–E · 6 spot-check pasca-refine · 7 H2H API · 8 complex marketplace |
| **dogfood/** | [00-analysis.md](./dogfood/00-analysis.md) | Analisa 5 run dogfood + 5 export mentah (`1test*`–`3test*`) |
| **90** | [90-history.md](./90-history.md) | Arsip: status, masterplan, early notes |
| **91** | [91-directives.md](./91-directives.md) | Arsip: handoff reviewer + directives |

**Baca dulu:** `01-product.md`  
**Setup / API:** `02-develop.md`  
**Uji USP:** `03-quality-gap.md`  
**Semua todo improve:** `04-refine-backlog.md`  
**Doc vs code:** `05-doc-audit.md`  
**Eval harness:** [`../eval/README.md`](../eval/README.md)

`90` / `91` = sejarah — bukan source of truth harian. Begitu juga
`Scoring/*.md` dan `dogfood/{1,2,3}test*.md`: itu snapshot bertanggal, jangan
di-update supaya "cocok" dengan kode hari ini.

> Nama folder di disk adalah **`Scoring/`** (huruf besar) dan **`dogfood/`**
> (huruf kecil). Tulis persis seperti itu di link — host case-sensitive (CI,
> deploy Linux) akan 404 kalau ditulis `scoring/`.
