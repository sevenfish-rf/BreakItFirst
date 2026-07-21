export const CATEGORIES = [
  "Startup",
  "Business",
  "Software App",
  "API",
  "SaaS",
  "Mobile App",
  "AI Product",
  "Game",
  "Marketplace",
  "Hardware",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Injected into Pass 1 prompts — used from Phase 2 onward. */
export const CATEGORY_LENSES: Record<Category, string> = {
  Startup:
    "Unit economics, market timing, trust, distribution/CAC, supply-demand balance, regulatory exposure.",
  Business:
    "Unit economics, market timing, trust, distribution/CAC, supply-demand balance, regulatory exposure.",
  "Software App":
    "Onboarding friction, retention, platform dependency, technical debt, monetization fit; if multi-step auto-pipelines exist, stacked sub-failure of each step.",
  API: "Rate limits, versioning, auth & free-tier abuse (key sharing, cache bust, locality collapse), bill-unit vs cost-unit mismatch (request vs bytes/CPU/egress), latency/SLAs, docs & DX, usage pricing sustainability.",
  SaaS: "Churn, onboarding, pricing-tier mismatch, integration lock-in, pipeline differentiators that fail as stacked steps (write/review gates), expansion revenue dependency.",
  "Mobile App":
    "Platform policy risk (App Store/Play Store), retention curve (D1/D7/D30), notification fatigue, OS update breakage, monetization model fit (ads vs IAP vs subscription).",
  "AI Product":
    "False specificity / generic-analysis camouflage, quality ceiling/hallucination, inference cost, provider dependency, privacy; attack idea as stated — do not invent RAG/fine-tune/grounding unless claimed.",
  Game: "Retention loops, matchmaking/balance, monetization backlash, cheating/toxicity moderation, live-ops burnout.",
  Marketplace:
    "Chicken-and-egg, trust & safety, take-rate resistance; prefer earliest structural hinge (density/demand/incentives) before textbook disintermediation alone.",
  Hardware:
    "Physical sensor/BOM ceiling vs marketing claims, internal mechanism before external reviews, dual hardware+subscription collapse, supply chain, returns/logistics, certification lead time.",
  Other:
    "No fixed lens — infer the 3–4 most relevant failure dimensions for this idea before analyzing.",
};

export type ExampleChip = {
  /** Short chip label in UI */
  label: string;
  category: Category;
  /** Full idea text (EN) — long enough for analyze min length */
  ideaEn: string;
  ideaId: string;
};

/** Starter templates for quick debug / demo runs */
export const EXAMPLE_CHIPS: readonly ExampleChip[] = [
  {
    label: "Airbnb for pets",
    category: "Marketplace",
    ideaEn:
      "A mobile marketplace where pet owners in the same apartment building book last-minute dog walking and pet sitting from verified neighbors. Sitters get 80% of the fee; the platform takes 20%. Trust via government ID and video intro; first three bookings free for new sitters. No insurance partnership — owners waive liability in-app. Launch city is Jakarta high-rises only.",
    ideaId:
      "Marketplace mobile di mana pemilik hewan peliharaan di apartemen yang sama memesan jasa jalan-jalan anjing dan penitipan mendadak dari tetangga terverifikasi. Sitter dapat 80% fee, platform 20%. Trust lewat KTP + video intro; tiga booking pertama gratis untuk sitter baru. Belum ada asuransi — pemilik waver liability di app. Launch hanya high-rise Jakarta.",
  },
  {
    label: "Discord clone",
    category: "Software App",
    ideaEn:
      "A free desktop and mobile chat app for gaming communities with voice channels, text servers, and custom emoji. Monetization is Nitro-style subscriptions plus server boosts. Differentiator is lower latency voice in SEA regions and optional end-to-end encrypted DMs. Competing with Discord and Telegram simultaneously.",
    ideaId:
      "Aplikasi chat desktop dan mobile gratis untuk komunitas gaming dengan voice channel, server teks, dan emoji kustom. Monetisasi langganan ala Nitro plus server boost. Diferensiator: latency voice lebih rendah di SEA dan DM terenkripsi end-to-end opsional. Bersaing dengan Discord dan Telegram sekaligus.",
  },
  {
    label: "AI therapist",
    category: "AI Product",
    ideaEn:
      "A $19/month consumer app offering 24/7 AI therapy-style chat for anxiety and mild depression. Marketed as always-available support, not a replacement for licensed care (small footer). Backend calls a single frontier LLM with a long system prompt and RAG over CBT worksheets. Crisis keywords trigger a static hotline message. No human clinicians in the loop. Launch markets: US and Indonesia.",
    ideaId:
      "App konsumen $19/bulan untuk chat AI bergaya terapi 24/7 bagi anxiety dan depresi ringan. Dipasarkan sebagai support selalu tersedia, bukan pengganti tenaga berlisensi (catatan kecil di footer). Backend memanggil satu frontier LLM + RAG worksheet CBT. Keyword krisis memicu pesan hotline statis. Tidak ada klinisi manusia. Pasar launch: AS dan Indonesia.",
  },
  {
    label: "Usage-based API",
    category: "API",
    ideaEn:
      "A public REST API that enriches company domains with firmographic data (employee count bands, funding stage, tech stack hints). Pricing is pure usage-based at $0.02 per successful lookup, free tier 500 calls/month. Auth is API keys only. Data is scraped and licensed from mixed sources; weekly refresh SLA. Target customers are B2B SaaS sales tools that batch-enrich CRM lists overnight.",
    ideaId:
      "REST API publik yang memperkaya domain perusahaan dengan data firmografis (band jumlah karyawan, tahap funding, hint tech stack). Harga pure usage $0.02 per lookup sukses, free tier 500 call/bulan. Auth hanya API key. Data dari scrape + lisensi campuran; SLA refresh mingguan. Target: tools sales SaaS B2B yang batch-enrich CRM semalam.",
  },
  {
    label: "AI team wiki",
    category: "SaaS",
    ideaEn:
      "A B2B SaaS wiki that auto-summarizes Slack and meeting transcripts into living docs. Pricing $12/seat/month, minimum 10 seats. Differentiator is docs that update themselves via weekly AI refresh jobs. Integrations: Slack, Google Meet, Notion import. Sold to series-A startups already paying for Notion + Slack. Thesis: Notion is passive storage; this is active knowledge maintenance.",
    ideaId:
      "Wiki SaaS B2B yang auto-meringkas Slack dan transcript meeting jadi living docs. Harga $12/kursi/bulan, min 10 kursi. Diferensiator: docs yang update sendiri via job AI mingguan. Integrasi Slack, Google Meet, import Notion. Dijual ke startup series-A yang sudah bayar Notion + Slack. Tesis: Notion pasif; ini perawatan knowledge aktif.",
  },
  {
    label: "Fitness ring $49",
    category: "Hardware",
    ideaEn:
      "A $49 sleep and HRV tracking ring for Southeast Asia consumers undercutting Oura. Manufactured by a single OEM in Shenzhen on net-60 terms. App is white-label firmware plus Flutter companion; optional $3/month AI sleep coach. First batch 5,000 units pre-ordered via Instagram. No medical certification; sold as wellness. Battery claim 5 days. Returns handled by a 2-person Jakarta team from a home warehouse.",
    ideaId:
      "Ring pelacak tidur dan HRV $49 untuk konsumen SEA, undercut Oura. Diproduksi satu OEM Shenzhen net-60. App firmware white-label + companion Flutter; opsional coach tidur AI $3/bulan. Batch pertama 5.000 unit pre-order Instagram. Bukan sertifikasi medis; dijual sebagai wellness. Klaim baterai 5 hari. Retur ditangani 2 orang di Jakarta dari gudang rumah.",
  },
  {
    label: "Clipboard prompt enhancer",
    category: "Software App",
    ideaEn:
      "A desktop utility that watches the system clipboard, sends copied text to an LLM API to enhance/refine/translate prompts, then writes the result back so the user can paste into any AI chat. No access to the target AI's system prompt, chat history, or persona. Monetization unclear; each enhance costs an API call. Cross-platform Electron build.",
    ideaId:
      "Utilitas desktop yang memantau clipboard, mengirim teks ke LLM API untuk enhance/refine/translate prompt, lalu menulis hasil agar user bisa paste ke chat AI mana pun. Tidak akses system prompt, history, atau persona AI target. Monetisasi belum jelas; tiap enhance bayar API call. Build Electron lintas platform.",
  },
  {
    label: "Food delivery dark kitchen",
    category: "Startup",
    ideaEn:
      "A multi-brand dark kitchen network in one city delivering only via GrabFood and GoFood. Shared kitchen staff cook 6 virtual restaurant brands from the same prep line. Unit economics depend on platform promo subsidies and high order density within a 3km radius. No dine-in; no owned delivery fleet.",
    ideaId:
      "Jaringan dark kitchen multi-brand di satu kota, delivery hanya lewat GrabFood dan GoFood. Staff dapur bersama memasak 6 merek restoran virtual dari prep line yang sama. Unit economics bergantung subsidi promo platform dan densitas order tinggi dalam radius 3 km. Tidak dine-in; tidak punya armada delivery sendiri.",
  },
  {
    label: "Crypto self-custody wallet",
    category: "Software App",
    ideaEn:
      "A non-custodial mobile crypto wallet supporting major L1/L2 chains with seed phrase backup and optional social recovery. Revenue from swap fees inside the app. No KYC for basic use. Security model relies on secure enclave on device plus open-source audit once a year. Targeting first-time crypto users in Indonesia.",
    ideaId:
      "Wallet crypto mobile non-custodial untuk rantai L1/L2 utama, backup seed phrase dan opsional social recovery. Revenue dari fee swap di dalam app. Tanpa KYC untuk pakai dasar. Model keamanan: secure enclave perangkat + audit open-source setahun sekali. Target user crypto pemula di Indonesia.",
  },
  {
    label: "Restaurant booking",
    category: "Mobile App",
    ideaEn:
      "A mobile app for booking restaurant tables with prepaid deposits to reduce no-shows. Restaurants pay 8% of the bill for completed bookings. Differentiator is AI seating optimization and waitlist auto-SMS. Launch in Jakarta and Bali fine-dining only. Competes with Google Reserve and Instagram DMs.",
    ideaId:
      "App mobile booking meja restoran dengan deposit prabayar untuk kurangi no-show. Restoran bayar 8% tagihan untuk booking selesai. Diferensiator: AI seating optimization dan waitlist auto-SMS. Launch hanya fine-dining Jakarta dan Bali. Bersaing dengan Google Reserve dan DM Instagram.",
  },
  {
    label: "B2B HR SaaS",
    category: "SaaS",
    ideaEn:
      "An all-in-one HRIS for Indonesian SMEs: payroll, attendance via GPS selfie, leave requests, and e-signature contracts. Priced at Rp 25,000 per employee per month with a 20-employee minimum. Must integrate BPJS and tax withholding rules that change frequently. Sales motion is outbound SDRs plus partner accounting firms.",
    ideaId:
      "HRIS all-in-one untuk UMKM Indonesia: payroll, absensi GPS selfie, cuti, kontrak e-sign. Harga Rp 25.000/karyawan/bulan, min 20 karyawan. Harus integrasi BPJS dan potong pajak yang sering berubah. Sales: outbound SDR + partner kantor akuntan.",
  },
  {
    label: "Indie multiplayer game",
    category: "Game",
    ideaEn:
      "A free-to-play 4v4 extraction shooter on PC with battle pass and cosmetic shop. Live-ops calendar of weekly events. Anti-cheat is third-party. Solo studio plus three contractors. Target 50k concurrent at launch via TikTok creators. Servers in Singapore only.",
    ideaId:
      "Game free-to-play extraction shooter 4v4 di PC dengan battle pass dan toko kosmetik. Live-ops event mingguan. Anti-cheat pihak ketiga. Studio solo plus tiga kontraktor. Target 50k concurrent saat launch lewat kreator TikTok. Server hanya di Singapura.",
  },
  {
    label: "IoT coffee machine",
    category: "Hardware",
    ideaEn:
      "A $299 connected espresso machine that orders beans automatically via an app subscription. Hardware margin is thin; profit is expected from bean subscriptions and descaling kits. Single contract manufacturer in China. Needs UL/CE certification for US and EU. Firmware OTA updates over Wi-Fi.",
    ideaId:
      "Mesin espresso terhubung $299 yang otomatis order biji kopi lewat langganan app. Margin hardware tipis; profit diharapkan dari langganan biji dan kit descaling. Satu pabrik kontrak di China. Butuh sertifikasi UL/CE untuk AS dan EU. Update firmware OTA lewat Wi-Fi.",
  },
  {
    label: "Local LLM API gateway",
    category: "API",
    ideaEn:
      "A hosted OpenAI-compatible API gateway that routes to customer self-hosted vLLM clusters with usage metering, keys, and a simple dashboard. Target is enterprises that cannot send data to public OpenAI. Pricing is seat + overage on tokens metered at the gateway. Differentiator is on-prem agent that phones home only for billing metrics.",
    ideaId:
      "Gateway API kompatibel OpenAI yang di-host, merutekan ke cluster vLLM self-hosted pelanggan dengan metering, key, dan dashboard sederhana. Target enterprise yang tidak boleh kirim data ke OpenAI publik. Harga seat + overage token di gateway. Diferensiator: agent on-prem yang phone-home hanya untuk metrik billing.",
  },
  {
    label: "Niche marketplace tools",
    category: "Marketplace",
    ideaEn:
      "A marketplace connecting freelance construction quantity surveyors with property developers in secondary Indonesian cities. Take rate 15%. Escrow for milestone payments. Cold start plan is supply-side first via WhatsApp groups of QS professionals, then outbound to developers. Mobile-web only, no native apps at launch.",
    ideaId:
      "Marketplace menghubungkan quantity surveyor konstruksi freelance dengan developer properti di kota sekunder Indonesia. Take rate 15%. Escrow pembayaran milestone. Cold start: supply dulu lewat grup WhatsApp QS, lalu outbound ke developer. Hanya mobile-web, tanpa native app saat launch.",
  },
  // ── Heavy templates (multi-stakeholder, regulatory, brittle economics) ──
  {
    label: "Heavy · BNPL for SMEs",
    category: "Startup",
    ideaEn:
      "A B2B buy-now-pay-later product for Indonesian SMEs buying inventory from marketplace sellers (Tokopedia/Shopee-style wholesalers). Buyer pays in 3 installments over 60 days; we front the full invoice to the seller minus a 2.8% merchant fee and charge the buyer 1.5%/month on the outstanding. Underwriting is fully automated from (1) marketplace order history scraped via seller-granted session cookies, (2) a single bureau soft-pull when available, and (3) a bank statement PDF upload OCR’d by a third-party API. Credit limit starts at Rp 5–50 juta. Collections are WhatsApp reminders + automatic marketplace payout freeze if the seller is also on our network; no field collectors. We hold no banking license — structure is a partnership with one small multi-finance company that appears on the contract while we own UX, scoring, and risk. Capital is a $2M revolving warehouse line at SOFR+6 from a Singapore fund, callable on covenant breach (NPL > 5% or concentration > 15% in one vertical). Launch vertical: fashion & cosmetics restock only. Fraud assumption: marketplace identity ≈ real business. No human underwriters at launch; one risk ops person reviews only accounts flagged by a rules engine. Target 8,000 active lines in 12 months via marketplace co-marketing banners we pay for with CAC target Rp 180k per activated line.",
    ideaId:
      "Produk BNPL B2B untuk UMKM Indonesia yang belanja stok dari seller wholesale di marketplace (gaya Tokopedia/Shopee). Buyer cicil 3× dalam 60 hari; kami bayar lunas ke seller minus fee merchant 2,8% dan kenakan buyer 1,5%/bulan atas outstanding. Underwriting full otomatis dari (1) riwayat order marketplace lewat session cookie yang diizinkan seller, (2) soft-pull biro kredit jika ada, (3) upload PDF rekening yang di-OCR API pihak ketiga. Limit awal Rp 5–50 juta. Collection: reminder WhatsApp + freeze payout marketplace otomatis jika seller juga di jaringan kami; tanpa collector lapangan. Kami tidak pegang izin bank — skema partnership dengan satu multi-finance kecil yang namanya di kontrak, kami pegang UX, scoring, dan risk. Modal: revolving warehouse $2M di SOFR+6 dari fund Singapura, callable jika covenant pecah (NPL > 5% atau konsentrasi > 15% di satu vertikal). Vertikal launch: restock fashion & kosmetik saja. Asumsi fraud: identitas marketplace ≈ bisnis nyata. Tanpa underwriter manusia di launch; satu risk ops review hanya akun yang di-flag rules engine. Target 8.000 line aktif dalam 12 bulan lewat banner co-marketing marketplace (CAC target Rp 180rb per line aktif).",
  },
  {
    label: "Heavy · Autonomous clinic AI",
    category: "AI Product",
    ideaEn:
      "A $49/month clinical co-pilot sold to small outpatient clinics in Indonesia and the Philippines: ambient mic in the consult room transcribes doctor–patient speech, drafts SOAP notes into the clinic’s existing EMR via brittle RPA (UI automation, not FHIR), suggests ICD-10 codes, and auto-messages the patient a Bahasa care-summary on WhatsApp. Differentiator marketed as “zero typing for doctors.” Stack: one frontier multimodal model for ASR+note generation (no fine-tune), a second cheaper model for coding, audio stored 30 days on a single-region cloud bucket “for quality.” Consent is a paper form at reception; no granular per-visit audio consent UX. No on-staff clinicians; a 4-person labeling vendor in a third country spot-checks 1% of notes weekly. Liability: SaaS ToS says “decision support only,” but sales decks say “reduces misdiagnosis.” Clinics share one API key per site; nurses sometimes leave the mic on in shared rooms. Pricing ignores inference cost spikes; unit model assumes 12 consults/doctor/day and $0.04/consult all-in. Regulatory path is “wellness/productivity software” until forced otherwise. Integration promise: works with 6 local EMR brands via reverse-engineered web UIs that break on every EMR update. Launch motion: 50 clinic pilot free for 60 days, then convert; success metric is doctor NPS, not clinical outcome.",
    ideaId:
      "Co-pilot klinis $49/bulan untuk klinik rawat jalan kecil di Indonesia dan Filipina: mic ambient di ruang konsultasi mentranskrip dokter–pasien, draft SOAP note ke EMR klinik lewat RPA rapuh (otomasi UI, bukan FHIR), usul kode ICD-10, dan auto-kirim ringkasan perawatan Bahasa ke pasien via WhatsApp. Diferensiator marketing: “dokter tanpa mengetik.” Stack: satu frontier multimodal untuk ASR+note (tanpa fine-tune), model murah kedua untuk coding, audio disimpan 30 hari di bucket cloud satu region “untuk quality.” Consent: formulir kertas di resepsionis; tanpa UX consent audio per kunjungan. Tidak ada klinisi internal; vendor labeling 4 orang di negara ketiga spot-check 1% note per minggu. Liability: ToS SaaS bilang “decision support only,” tapi deck sales bilang “kurangi misdiagnosis.” Klinik pakai satu API key per cabang; perawat kadang biarkan mic nyala di ruang bersama. Harga mengabaikan lonjakan biaya inferensi; model unit asumsikan 12 konsultasi/dokter/hari dan $0.04/konsultasi all-in. Jalur regulasi: “software wellness/produktivitas” sampai dipaksa sebaliknya. Janji integrasi: 6 merek EMR lokal lewat web UI reverse-engineer yang rusak tiap update EMR. Go-to-market: 50 klinik pilot gratis 60 hari lalu convert; metrik sukses NPS dokter, bukan outcome klinis.",
  },
  {
    label: "Heavy · Cross-border labor OS",
    category: "Marketplace",
    ideaEn:
      "An end-to-end “labor OS” marketplace placing Indonesian migrant domestic and care workers into households in Hong Kong, Taiwan, and Malaysia. We charge workers a placement fee of 1 month salary (financed by our partner lender at 2.5%/month, repaid from first 6 paychecks) and charge employers a $400 matching fee. Differentiator: AI video interviews + skill scoring, digital contract, and an in-app remittance rail that takes 1.8% FX markup. Supply acquisition is TikTok ads + agency buyouts of existing penyalur networks; we re-badge their recruiters as “success managers” on payroll light contracts. Compliance: we claim to be a “tech platform not a penyalur,” so we avoid full Kementerian/BP2MI licensing at launch and rely on partner agencies’ licenses in each corridor — contracts are tripartite and confusing by design. Worker support after placement is a WhatsApp bot plus 3 CS agents for 2,000 active placements. If a worker absconds or is abused, escalation is a PDF checklist; no emergency housing fund. Employer KYC is passport photo + selfie; household income not verified. Seasonal demand spikes before Chinese New Year; we pre-place workers on tourist-adjacent visas in edge cases when work permits lag. Data: biometric face templates stored to “prevent identity fraud,” shared with partner agencies. Target 1,000 placements/month at month 18 with negative working capital covered by the worker-loan book.",
    ideaId:
      "Marketplace “labor OS” end-to-end menempatkan pekerja migran domestik & care Indonesia ke rumah tangga di Hong Kong, Taiwan, dan Malaysia. Kami kenakan pekerja biaya penempatan 1 bulan gaji (dibiayai lender partner 2,5%/bulan, dicicil dari 6 gaji pertama) dan kenakan majikan fee matching $400. Diferensiator: wawancara video AI + skor skill, kontrak digital, dan rail remitansi in-app dengan markup FX 1,8%. Akuisisi supply: iklan TikTok + buyout jaringan penyalur; recruiter mereka di-rebadge jadi “success manager” kontrak ringan. Compliance: kami klaim “platform tech bukan penyalur,” jadi hindari lisensi penuh Kementerian/BP2MI di launch dan andalkan lisensi agency partner per koridor — kontrak tripartite membingungkan by design. Support pasca-penempatan: bot WhatsApp + 3 agen CS untuk 2.000 penempatan aktif. Jika pekerja kabur atau disiksa, eskalasi = checklist PDF; tanpa dana emergency housing. KYC majikan: foto paspor + selfie; penghasilan rumah tangga tidak diverifikasi. Lonjakan musiman sebelum Imlek; di edge case kami pre-place pekerja dengan visa mendekati turis saat work permit telat. Data: template wajah biometrik disimpan “cegah fraud identitas,” dibagikan ke agency partner. Target 1.000 penempatan/bulan di bulan ke-18 dengan working capital negatif ditutup buku pinjaman pekerja.",
  },
] as const;

export const MIN_IDEA_LENGTH = 40;
