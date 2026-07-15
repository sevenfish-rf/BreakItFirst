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
    failureModes: string;
    resilience: string;
    resilienceHint: string;
    confidence: string;
    generated: string;
    step: string;
    of: string;
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
  analyzing: {
    title: string;
    subtitle: string;
    elapsed: string;
    stages: { id: string; label: string; hint: string }[];
    tips: string[];
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
    cascadeHint: "Causal chain from fragile point to end state",
    failureModes: "Failure modes",
    resilience: "Resilience score",
    resilienceHint: "0–100 per dimension — lower is more fragile",
    confidence: "Confidence",
    generated: "Generated",
    step: "Step",
    of: "of",
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
    subtitle: "Two-pass pipeline — reasoning then structure. This can take a minute.",
    elapsed: "Elapsed",
    stages: [
      {
        id: "ingest",
        label: "Ingest idea",
        hint: "Parsing input & category lens",
      },
      {
        id: "pass1",
        label: "Pass 1 · Reasoning",
        hint: "Deep pre-mortem with your model",
      },
      {
        id: "pass2",
        label: "Pass 2 · Structuring",
        hint: "Compressing into failure schema",
      },
      {
        id: "validate",
        label: "Validate",
        hint: "Schema check & cascade sanity",
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
    tipProvider:
      "Tip: buka Provider → Test connection / Fetch models untuk cek base URL, key, dan model.",
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
    cascadeHint: "Rantai kausal dari titik rapuh sampai end state",
    failureModes: "Mode kegagalan",
    resilience: "Skor ketahanan",
    resilienceHint: "0–100 per dimensi — semakin rendah semakin rapuh",
    confidence: "Keyakinan",
    generated: "Dibuat",
    step: "Langkah",
    of: "dari",
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
      "Pipeline dua pass — penalaran lalu struktur. Proses ini bisa ~1 menit.",
    elapsed: "Berjalan",
    stages: [
      {
        id: "ingest",
        label: "Ingest ide",
        hint: "Parse input & lens kategori",
      },
      {
        id: "pass1",
        label: "Pass 1 · Penalaran",
        hint: "Pre-mortem mendalam lewat modelmu",
      },
      {
        id: "pass2",
        label: "Pass 2 · Struktur",
        hint: "Kompres ke skema kegagalan",
      },
      {
        id: "validate",
        label: "Validasi",
        hint: "Cek schema & koneksi cascade",
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
