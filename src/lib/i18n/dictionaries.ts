import type { Locale } from "@/lib/i18n/types";

export type Dictionary = {
  brand: string;
  tagline: string;
  nav: {
    provider: string;
    providerReady: string;
    providerNotSet: string;
    language: string;
  };
  landing: {
    kicker: string;
    headline: string;
    subhead: string;
    footerNote: string;
    features: { title: string; body: string }[];
  };
  form: {
    ideaLabel: string;
    ideaPlaceholder: string;
    categoryLabel: string;
    examplesLabel: string;
    cta: string;
    analyzing: string;
    pass1: string;
    pass2: string;
    helper: string;
    tooShort: (n: number) => string;
    chars: string;
    needProvider: string;
    tipProvider: string;
    deepLabel: string;
    deepHint: string;
    draftRestored: string;
    clearDraft: string;
    cancelled: string;
  };
  analyzing: {
    title: string;
    subtitle: string;
    elapsed: string;
    stillWorking: string;
    cancel: string;
    cancelHint: string;
    stages: { id: string; label: string; hint: string }[];
    tips: string[];
  };
  report: {
    kicker: string;
    title: string;
    newAnalysis: string;
    summary: string;
    spof: string;
    likelihood: string;
    assumptions: string;
    cascade: string;
    cascadeHint: string;
    signal: string;
    failureModes: string;
    resilience: string;
    resilienceHint: string;
    stressTest: string;
    stressTestHint: string;
    stressVerdict: { yes: string; maybe: string; no: string };
    velocity: string;
    velocityHint: string;
    calibration: string;
    calibrationHint: string;
    calibrationRuns: string;
    candidates: string;
    confidence: string;
    generated: string;
    step: string;
    of: string;
    deepBadge: string;
    warnings: string;
    criticalAssumptions: string;
    pointOfNoReturn: string;
    compoundingNote: string;
    expandSignals: string;
    collapseSignals: string;
    phaseEarly: string;
    phaseLate: string;
    stepDetail: string;
    hoverForDetails: string;
    cascadeGuideTitle: string;
    cascadeGuideWhat: string;
    cascadeLegendStart: string;
    cascadeLegendStartDesc: string;
    cascadeLegendMid: string;
    cascadeLegendMidDesc: string;
    cascadeLegendLate: string;
    cascadeLegendLateDesc: string;
    cascadeLegendPonr: string;
    cascadeLegendPonrDesc: string;
    cascadeLegendArrow: string;
    cascadeLegendArrowDesc: string;
    cascadeLegendSignal: string;
    cascadeLegendSignalDesc: string;
    cascadeLegendNumber: string;
    cascadeLegendNumberDesc: string;
    cascadeLegendHover: string;
    cascadeLegendHoverDesc: string;
    linkedToSpof: string;
    emptyDomain: string;
    exportMarkdown: string;
    analysisBase: string;
    analysisBaseHint: string;
    systemReading: string;
    systemReadingHint: string;
  };
  modes: {
    technical: string;
    business: string;
    security: string;
    legal: string;
    operations: string;
  };
  errors: {
    detail: string;
    rateLimited: (s: number) => string;
    failed: string;
  };
};

const en: Dictionary = {
  brand: "BreakItFirst",
  tagline: "What Would Break This?",
  nav: {
    provider: "Provider",
    providerReady: "Provider ready",
    providerNotSet: "Provider not set",
    language: "Language",
  },
  landing: {
    kicker: "Failure Analysis Engine",
    headline: "Build less. Break less.",
    subhead:
      "Paste your startup, app, API, or product idea. We'll tell you how it fails before reality does.",
    footerNote:
      "Not a brainstorming tool. No feature ideas, no pep talks — only causal failure analysis.",
    features: [
      {
        title: "Causal, not cosmetic",
        body: "Pre-mortem reasoning that traces fragile assumptions to end states.",
      },
      {
        title: "Structured cascade",
        body: "Ordered failure chain, SPOF, and multi-dimension resilience — not a chat dump.",
      },
      {
        title: "Bring your own model",
        body: "OpenAI-compatible providers. Your key stays in the browser.",
      },
    ],
  },
  form: {
    ideaLabel: "Your idea",
    ideaPlaceholder: "Paste your startup, app, API, or product idea…",
    categoryLabel: "Category",
    examplesLabel: "Try an example",
    cta: "Analyze Failure",
    analyzing: "Analyzing…",
    pass1: "Pass 1 — reasoning…",
    pass2: "Pass 2 — structuring…",
    helper: "Be specific — business model, users, tech, and constraints all help.",
    tooShort: (n) => `Add a bit more detail (${n} more characters).`,
    chars: "chars",
    needProvider: "Configure an AI provider before analyzing.",
    tipProvider:
      "Tip: open Provider → Test connection / Fetch models to verify base URL, key, and model ids.",
    deepLabel: "Deep analysis",
    deepHint:
      "Runs Pass 1 twice and calibrates SPOF agreement. Slower, uses 2 rate-limit slots.",
    draftRestored: "Draft restored from this browser",
    clearDraft: "Clear draft",
    cancelled:
      "Analysis cancelled. Your idea is still here — you can run again anytime.",
  },
  report: {
    kicker: "Failure report",
    title: "Analysis complete",
    newAnalysis: "New analysis",
    summary: "Summary",
    spof: "Single Point of Failure",
    likelihood: "Failure likelihood",
    assumptions: "Hidden assumptions",
    cascade: "Failure cascade",
    cascadeHint:
      "Causal chain from fragile point to end state — each step includes an observable signal",
    signal: "Signal",
    failureModes: "Failure modes",
    resilience: "Resilience score",
    resilienceHint: "0–100 per dimension — lower is more fragile",
    stressTest: "Archetype stress test",
    stressTestHint:
      "Pattern exposure checklist — not one overall danger score",
    stressVerdict: { yes: "Yes", maybe: "Maybe", no: "No" },
    velocity: "Failure velocity",
    velocityHint: "How quickly the main failure path tends to unfold",
    calibration: "SPOF calibration",
    calibrationHint:
      "Deep analysis only — agreement across independent reasoning runs",
    calibrationRuns: "Pass 1 runs",
    candidates: "Candidate SPOFs",
    confidence: "Confidence",
    generated: "Generated",
    step: "Step",
    of: "of",
    deepBadge: "Deep analysis",
    warnings: "Notes",
    criticalAssumptions: "Critical assumptions for this SPOF",
    pointOfNoReturn: "Point of no return",
    compoundingNote: "Compounding domains",
    expandSignals: "Expand signals",
    collapseSignals: "Collapse signals",
    phaseEarly: "Build-up",
    phaseLate: "Aftermath",
    stepDetail: "Step detail",
    hoverForDetails: "Hover a step for full signal",
    cascadeGuideTitle: "How to read this flow",
    cascadeGuideWhat:
      "Each box is one step in a causal failure chain: earlier steps cause later ones. Follow the animated arrows — this is not a random list, and not advice on what to do.",
    cascadeLegendStart: "Early step",
    cascadeLegendStartDesc:
      "Accent-tinted box (stronger red edge). Near the start of the chain — closer to the SPOF / first cracks.",
    cascadeLegendMid: "Middle step",
    cascadeLegendMidDesc:
      "Neutral border. Intermediate cause-and-effect; still part of the same path.",
    cascadeLegendLate: "Late step",
    cascadeLegendLateDesc:
      "Stronger accent tint toward the end. Near the end state (collapse, churn, shutdown, etc.).",
    cascadeLegendPonr: "Point of no return",
    cascadeLegendPonrDesc:
      "Gold/warning outline + badge. From this step onward the path is hard to reverse — descriptive, not a “you should act” tip.",
    cascadeLegendArrow: "Animated arrows",
    cascadeLegendArrowDesc:
      "Show order and direction of the chain. Gold arrows appear after the point of no return.",
    cascadeLegendSignal: "Signal line",
    cascadeLegendSignalDesc:
      "What you’d observe in the real world if that step is happening (metrics, behavior, news). Observation only.",
    cascadeLegendNumber: "Step number",
    cascadeLegendNumberDesc:
      "Order in the chain (1 → N). Same number as in the step counter above the chart.",
    cascadeLegendHover: "Hover / select",
    cascadeLegendHoverDesc:
      "Opens a popup with the full step title and full signal text (nothing truncated).",
    linkedToSpof: "Linked to SPOF",
    emptyDomain: "No material risks flagged in this domain",
    exportMarkdown: "Export Markdown",
    analysisBase: "Idea analyzed",
    analysisBaseHint:
      "Your input after validation — the exact text the analysis pipeline used as source",
    systemReading: "System reading",
    systemReadingHint:
      "How the model restated the idea before critiquing it (analysis contract)",
  },
  modes: {
    technical: "Technical",
    business: "Business",
    security: "Security",
    legal: "Legal",
    operations: "Operations",
  },
  errors: {
    detail: "Please describe your idea in more detail.",
    rateLimited: (s) => `Too many analyses. Try again in ${s}s.`,
    failed: "Analysis failed. Retry.",
  },
  analyzing: {
    title: "Running failure analysis",
    subtitle:
      "Live stages from the server. Often 2–5+ minutes (longer with Deep / slow models).",
    elapsed: "Elapsed",
    stillWorking:
      "Model still generating — this is normal for slow providers. Stages advance only when the server finishes each pass. Keep this tab open.",
    cancel: "Cancel analysis",
    cancelHint:
      "Stops waiting on this tab. The model may still finish on the provider side (tokens may still be billed).",
    stages: [
      {
        id: "ingest",
        label: "Ingest idea",
        hint: "Input accepted · starting pipeline",
      },
      {
        id: "pass1",
        label: "Pass 1 · Reasoning",
        hint: "Waiting on your model (usually the longest step)",
      },
      {
        id: "pass1_5",
        label: "Pass 1.5 · Critique",
        hint: "Second model call · adversarial rewrite",
      },
      {
        id: "pass2",
        label: "Pass 2 · Structuring",
        hint: "Third model call · building failure JSON",
      },
      {
        id: "validate",
        label: "Validate / finalize",
        hint: "Schema checks after model JSON returns (usually quick)",
      },
    ],
    tips: [
      "Generic failure clichés are filtered — good analyses stay idea-specific.",
      "Single Point of Failure is the emotional core of the report.",
      "Cascade nodes should read as a causal chain, not a bullet wishlist.",
      "Resilience scores are multi-dimensional — never collapsed to one number.",
      "While you wait: which assumption would kill this idea if false?",
      "Tip: more concrete details in your idea → sharper failure mechanisms.",
    ],
  },
};

const id: Dictionary = {
  brand: "BreakItFirst",
  tagline: "What Would Break This?",
  nav: {
    provider: "Provider",
    providerReady: "Provider siap",
    providerNotSet: "Provider belum diset",
    language: "Bahasa",
  },
  landing: {
    kicker: "Mesin Analisis Kegagalan",
    headline: "Bangun lebih sedikit. Gagal lebih sedikit.",
    subhead:
      "Tempel ide startup, app, API, atau produkmu. Kami tunjukkan cara gagalnya sebelum kenyataan melakukannya.",
    footerNote:
      "Bukan tool brainstorming. Tanpa saran fitur, tanpa motivasi — hanya analisis kegagalan kausal.",
    features: [
      {
        title: "Kausal, bukan kosmetik",
        body: "Pre-mortem yang menelusuri asumsi rapuh sampai end state.",
      },
      {
        title: "Cascade terstruktur",
        body: "Rantai kegagalan berurutan, SPOF, dan skor ketahanan multi-dimensi.",
      },
      {
        title: "Bawa model sendiri",
        body: "Provider kompatibel OpenAI. Kunci API tetap di browser.",
      },
    ],
  },
  form: {
    ideaLabel: "Ide kamu",
    ideaPlaceholder: "Tempel ide startup, app, API, atau produk…",
    categoryLabel: "Kategori",
    examplesLabel: "Coba contoh",
    cta: "Analisis Kegagalan",
    analyzing: "Menganalisis…",
    pass1: "Pass 1 — penalaran…",
    pass2: "Pass 2 — penstrukturan…",
    helper:
      "Spesifik — model bisnis, pengguna, tech, dan constraint sangat membantu.",
    tooShort: (n) => `Tambah detail (${n} karakter lagi).`,
    chars: "karakter",
    needProvider: "Atur AI provider dulu sebelum menganalisis.",
    deepLabel: "Analisis mendalam",
    deepHint:
      "Pass 1 dijalankan 2× lalu dikalibrasi. Lebih lambat, memakai 2 slot rate limit.",
    tipProvider:
      "Tip: buka Provider → Test connection / Fetch models untuk cek base URL, key, dan model.",
    draftRestored: "Draf dipulihkan dari browser ini",
    clearDraft: "Hapus draf",
    cancelled:
      "Analisis dibatalkan. Ide masih ada di form — bisa dijalankan lagi kapan saja.",
  },
  report: {
    kicker: "Laporan kegagalan",
    title: "Analisis selesai",
    newAnalysis: "Analisis baru",
    summary: "Ringkasan",
    spof: "Single Point of Failure",
    likelihood: "Kemungkinan gagal",
    assumptions: "Asumsi tersembunyi",
    cascade: "Rantai kegagalan",
    cascadeHint:
      "Rantai kausal dari titik rapuh sampai end state — tiap langkah ada sinyal yang bisa diamati",
    signal: "Sinyal",
    failureModes: "Mode kegagalan",
    resilience: "Skor ketahanan",
    resilienceHint: "0–100 per dimensi — semakin rendah semakin rapuh",
    stressTest: "Stress test arketipe",
    stressTestHint:
      "Ceklis paparan pola — bukan satu skor bahaya keseluruhan",
    stressVerdict: { yes: "Ya", maybe: "Mungkin", no: "Tidak" },
    velocity: "Kecepatan kegagalan",
    velocityHint: "Seberapa cepat jalur gagal utama cenderung terjadi",
    calibration: "Kalibrasi SPOF",
    calibrationHint:
      "Hanya deep analysis — kesepakatan antar run penalaran independen",
    calibrationRuns: "Run Pass 1",
    candidates: "Kandidat SPOF",
    confidence: "Keyakinan",
    generated: "Dibuat",
    step: "Langkah",
    of: "dari",
    deepBadge: "Analisis mendalam",
    warnings: "Catatan",
    criticalAssumptions: "Asumsi kritis untuk SPOF ini",
    pointOfNoReturn: "Titik tanpa kembali",
    compoundingNote: "Domain yang saling memperparah",
    expandSignals: "Perluas sinyal",
    collapseSignals: "Ciutkan sinyal",
    phaseEarly: "Awal rantai",
    phaseLate: "Akibat lanjut",
    stepDetail: "Detail langkah",
    hoverForDetails: "Arahkan kursor ke langkah untuk sinyal lengkap",
    cascadeGuideTitle: "Cara membaca alur ini",
    cascadeGuideWhat:
      "Setiap kotak = satu langkah dalam rantai sebab-akibat kegagalan: langkah awal memicu langkah berikutnya. Ikuti panah beranimasi — ini bukan daftar acak, dan bukan saran “apa yang harus dilakukan”.",
    cascadeLegendStart: "Langkah awal",
    cascadeLegendStartDesc:
      "Kotak dengan aksen merah lebih kuat. Dekat awal rantai — dekat SPOF / retakan pertama.",
    cascadeLegendMid: "Langkah tengah",
    cascadeLegendMidDesc:
      "Outline netral. Sebab-akibat di tengah jalan; masih satu jalur yang sama.",
    cascadeLegendLate: "Langkah akhir",
    cascadeLegendLateDesc:
      "Aksen lebih terasa di ujung rantai. Mendekati end state (runtuh, churn, shutdown, dll.).",
    cascadeLegendPonr: "Titik tanpa kembali",
    cascadeLegendPonrDesc:
      "Outline emas/warning + badge. Mulai langkah ini jalur sulit dibalik — deskriptif, bukan saran “kamu harus bertindak”.",
    cascadeLegendArrow: "Panah beranimasi",
    cascadeLegendArrowDesc:
      "Menunjukkan urutan dan arah rantai. Panah emas muncul setelah titik tanpa kembali.",
    cascadeLegendSignal: "Baris sinyal",
    cascadeLegendSignalDesc:
      "Apa yang terlihat di dunia nyata jika langkah itu terjadi (metrik, perilaku, berita). Hanya observasi.",
    cascadeLegendNumber: "Nomor langkah",
    cascadeLegendNumberDesc:
      "Urutan di rantai (1 → N). Sama dengan counter di atas chart.",
    cascadeLegendHover: "Hover / pilih",
    cascadeLegendHoverDesc:
      "Membuka popup judul langkah + teks sinyal lengkap (tidak terpotong).",
    linkedToSpof: "Terkait SPOF",
    emptyDomain: "Tidak ada risiko material di domain ini",
    exportMarkdown: "Ekspor Markdown",
    analysisBase: "Ide yang dianalisis",
    analysisBaseHint:
      "Input kamu setelah validasi — teks yang dipakai pipeline sebagai sumber analisis",
    systemReading: "Pembacaan sistem",
    systemReadingHint:
      "Bagaimana model merumuskan ulang ide sebelum mengkritik (kontrak pemahaman)",
  },
  modes: {
    technical: "Teknis",
    business: "Bisnis",
    security: "Keamanan",
    legal: "Hukum",
    operations: "Operasional",
  },
  errors: {
    detail: "Jelaskan idemu dengan lebih detail.",
    rateLimited: (s) => `Terlalu banyak analisis. Coba lagi dalam ${s}d.`,
    failed: "Analisis gagal. Coba lagi.",
  },
  analyzing: {
    title: "Menjalankan analisis kegagalan",
    subtitle:
      "Stage real dari server. Sering 2–5+ menit (lebih lama Deep / model lambat).",
    elapsed: "Berjalan",
    stillWorking:
      "Model masih generate — normal untuk provider lambat. Stage maju hanya saat server selesai tiap pass. Jangan tutup tab ini.",
    cancel: "Batalkan analisis",
    cancelHint:
      "Berhenti menunggu di tab ini. Model mungkin tetap selesai di sisi provider (token bisa tetap terhitung).",
    stages: [
      {
        id: "ingest",
        label: "Ingest ide",
        hint: "Input diterima · pipeline mulai",
      },
      {
        id: "pass1",
        label: "Pass 1 · Penalaran",
        hint: "Menunggu modelmu (biasanya langkah terlama)",
      },
      {
        id: "pass1_5",
        label: "Pass 1.5 · Kritik",
        hint: "Panggilan model ke-2 · rewrite adversarial",
      },
      {
        id: "pass2",
        label: "Pass 2 · Struktur",
        hint: "Panggilan model ke-3 · bangun JSON kegagalan",
      },
      {
        id: "validate",
        label: "Validasi / finalisasi",
        hint: "Cek skema setelah JSON model kembali (biasanya cepat)",
      },
    ],
    tips: [
      "Klise gagal generik difilter — analisis bagus selalu spesifik ke ide.",
      "Single Point of Failure adalah inti emosional laporan.",
      "Node cascade harus rantai kausal, bukan daftar fitur.",
      "Skor ketahanan multi-dimensi — tidak digabung jadi satu angka.",
      "Sambil menunggu: asumsi mana yang membunuh ide ini jika salah?",
      "Tip: detail lebih konkret di ide → mekanisme gagal lebih tajam.",
    ],
  },
};

export const dictionaries: Record<Locale, Dictionary> = { en, id };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? en;
}
