import type { Locale } from "@/lib/i18n/types";

/**
 * Landing page copy (marketing route "/").
 * Kept out of the main i18n dictionary on purpose: this is long-form
 * editorial copy owned by the landing page, same pattern as the
 * PIPELINE record previously colocated in app-shell.
 */

export type LandingCopy = {
  hero: {
    kicker: string;
    /** `|` marks the emphasized (signal-colored, italic) fragment. */
    headline: string;
    sub: string;
    ctaPrimary: string;
    ctaSecondary: string;
    figCaption: string;
    figLabels: {
      spof: string;
      cascade: string;
      signal: string;
      ponr: string;
      terminal: string;
    };
  };
  manifest: {
    no: string;
    title: string;
    intro: string;
    isLabel: string;
    isNotLabel: string;
    rows: { is: string; not: string }[];
  };
  method: {
    no: string;
    title: string;
    intro: string;
    figCaption: string;
    passes: { n: string; title: string; body: string }[];
    guardTitle: string;
    guard: string;
    deepNote: string;
  };
  audience: {
    no: string;
    title: string;
    intro: string;
    cards: { who: string; when: string; body: string }[];
    quoteLead: string;
    quote: string;
  };
  cta: {
    kicker: string;
    title: string;
    sub: string;
    button: string;
    footnote: string;
  };
};

const en: LandingCopy = {
  hero: {
    kicker: "Structured premortem · for unbuilt ideas",
    headline: "Every idea hides its own |fault line.|",
    sub: "*BreakItFirst is a premortem engine for product and business ideas that don't exist yet.* Paste the idea — get one dominant failure argument: the single point of failure, and the causal cascade that follows it. Before reality runs the experiment for you.",
    ctaPrimary: "Run a premortem",
    ctaSecondary: "See the method",
    figCaption: "Fig. 01 — Anatomy of a failure path, specimen view.",
    figLabels: {
      spof: "single point of failure",
      cascade: "causal cascade",
      signal: "observable signal",
      ponr: "point of no return",
      terminal: "end state",
    },
  },
  manifest: {
    no: "01",
    title: "A premortem, not a pep talk.",
    intro:
      "Most idea feedback is either encouragement or a checklist. This is neither. *The engine argues one specific way your idea collapses* — and is judged only on whether that argument is sharper than the risk you already feared.",
    isLabel: "What you get",
    isNotLabel: "What you don't",
    rows: [
      {
        is: "One dominant failure argument — a structural hinge and its cascade",
        not: "Five equal risks arranged in a checklist",
      },
      {
        is: "Mechanisms specific to this idea's architecture and incentives",
        not: "Generic startup advice with nice formatting",
      },
      {
        is: "Judgment on one causal failure pathway, stated with confidence bands",
        not: "A numeric prediction that your company succeeds or fails",
      },
      {
        is: "A premortem for ideas that are still on paper",
        not: "Security red-teaming of a live platform",
      },
    ],
  },
  method: {
    no: "02",
    title: "The engine attacks its own argument before you see it.",
    intro:
      "A single model answer is a first draft. *The report you read is the survivor of a three-pass argument.*",
    figCaption: "Fig. 02 — Three-pass analysis pipeline.",
    passes: [
      {
        n: "Pass 1",
        title: "Open reasoning",
        body: "Multiple failure hypotheses are drafted and ranked internally. Only the strongest hinge for this idea survives — the rest are discarded.",
      },
      {
        n: "Pass 1.5",
        title: "Adversarial critique",
        body: "A second call attacks the draft's weakest claims: would the cascade still run if this hinge held? If yes, the hinge is wrong — rewrite.",
      },
      {
        n: "Pass 2",
        title: "Structured report",
        body: "The surviving argument is compressed — losslessly — into a typed, validated report. No new claims may be invented at this stage.",
      },
    ],
    guardTitle: "Camouflage hunting",
    guard:
      "Name-swappable risks — ones that fit a hundred startups — are treated as defects and rewritten. So is invent-then-attack: the engine may not fabricate an architecture just to break it.",
    deepNote:
      "Deep mode runs the reasoning pass twice, independently, and reports whether both runs converge on the same point of failure.",
  },
  audience: {
    no: "04",
    title: "Built for the moment before you commit.",
    intro:
      "*The cheapest time to watch an idea fail is before anything is built.*",
    cards: [
      {
        who: "Solo founders",
        when: "Before the first commit",
        body: "Six months of building is an expensive way to discover a structural flaw. Run the collapse on paper first — then decide what to de-risk.",
      },
      {
        who: "Product teams",
        when: "Before the pitch",
        body: "Walk into the room already holding the sharpest objection — with a structured, causal answer instead of an improvised one.",
      },
      {
        who: "Serial builders",
        when: "Between ideas",
        body: "Compare candidates by their failure paths instead of their upside stories. The idea with survivable failure modes wins.",
      },
    ],
    quoteLead: "The report has exactly one success condition —",
    quote: "“*I never considered that failure path.*”",
  },
  cta: {
    kicker: "The experiment runs either way",
    title: "Reality will test your idea. |Break it first.|",
    sub: "Paste the idea. Read its strongest failure argument. Build with your eyes open.",
    button: "Run a premortem",
    footnote:
      "Structured premortem engine — judged against strong free-form chat, not weak baselines.",
  },
};

const id: LandingCopy = {
  hero: {
    kicker: "Premortem terstruktur · untuk ide yang belum dibangun",
    headline: "Setiap ide menyimpan |garis retaknya| sendiri.",
    sub: "BreakItFirst adalah mesin premortem untuk ide produk dan bisnis yang belum dibangun. Tempel idenya — dapatkan satu argumen kegagalan dominan: single point of failure, beserta rantai kausal yang mengikutinya. *Sebelum realita menjalankan eksperimennya untukmu.*",
    ctaPrimary: "Jalankan premortem",
    ctaSecondary: "Lihat metodenya",
    figCaption: "Gbr. 01 — Anatomi jalur kegagalan, tampilan spesimen.",
    figLabels: {
      spof: "single point of failure",
      cascade: "rantai kausal",
      signal: "sinyal teramati",
      ponr: "titik tanpa kembali",
      terminal: "kondisi akhir",
    },
  },
  manifest: {
    no: "01",
    title: "Premortem, bukan pep talk.",
    intro:
      "Kebanyakan feedback ide itu antara penyemangat atau checklist. Ini bukan keduanya. *Mesin ini berargumen tentang satu cara spesifik idemu runtuh* — dan hanya dinilai dari apakah argumen itu lebih tajam daripada risiko yang sudah kamu takuti.",
    isLabel: "Yang kamu dapat",
    isNotLabel: "Yang tidak",
    rows: [
      {
        is: "Satu argumen kegagalan dominan — hinge struktural beserta cascade-nya",
        not: "Lima risiko setara yang disusun jadi checklist",
      },
      {
        is: "Mekanisme yang spesifik ke arsitektur dan insentif ide ini",
        not: "Nasihat startup generik dengan format rapi",
      },
      {
        is: "Penilaian atas satu jalur kegagalan kausal, dengan band keyakinan",
        not: "Prediksi angka bahwa perusahaanmu sukses atau gagal",
      },
      {
        is: "Premortem untuk ide yang masih di atas kertas",
        not: "Red-teaming keamanan atas platform yang sudah live",
      },
    ],
  },
  method: {
    no: "02",
    title: "Mesin menyerang argumennya sendiri sebelum kamu membacanya.",
    intro:
      "Satu jawaban model hanyalah draf pertama. *Laporan yang kamu baca adalah yang selamat dari argumen tiga tahap.*",
    figCaption: "Gbr. 02 — Pipeline analisis tiga tahap.",
    passes: [
      {
        n: "Pass 1",
        title: "Penalaran terbuka",
        body: "Beberapa hipotesis kegagalan disusun dan diranking secara internal. Hanya hinge terkuat untuk ide ini yang lolos — sisanya dibuang.",
      },
      {
        n: "Pass 1.5",
        title: "Kritik adversarial",
        body: "Panggilan kedua menyerang klaim terlemah draf: kalau hinge ini bertahan, apakah cascade tetap jalan? Jika ya, hinge-nya salah — tulis ulang.",
      },
      {
        n: "Pass 2",
        title: "Laporan terstruktur",
        body: "Argumen yang selamat dikompres — tanpa kehilangan makna — menjadi laporan bertipe dan tervalidasi. Tahap ini dilarang mengarang klaim baru.",
      },
    ],
    guardTitle: "Perburuan kamuflase",
    guard:
      "Risiko yang bisa ditukar-nama — yang cocok untuk seratus startup — dianggap cacat dan ditulis ulang. Begitu juga invent-then-attack: mesin dilarang mengarang arsitektur hanya untuk menyerangnya.",
    deepNote:
      "Mode Deep menjalankan tahap penalaran dua kali secara independen, lalu melaporkan apakah keduanya menunjuk titik gagal yang sama.",
  },
  audience: {
    no: "04",
    title: "Dibuat untuk momen sebelum kamu berkomitmen.",
    intro:
      "*Waktu termurah untuk menonton sebuah ide gagal adalah sebelum ada yang dibangun.*",
    cards: [
      {
        who: "Solo founder",
        when: "Sebelum commit pertama",
        body: "Enam bulan membangun adalah cara mahal menemukan cacat struktural. Jalankan keruntuhannya di atas kertas dulu — baru putuskan apa yang di-de-risk.",
      },
      {
        who: "Tim produk",
        when: "Sebelum pitching",
        body: "Masuk ruangan sudah memegang keberatan paling tajam — dengan jawaban kausal terstruktur, bukan improvisasi.",
      },
      {
        who: "Serial builder",
        when: "Di antara ide-ide",
        body: "Bandingkan kandidat dari jalur kegagalannya, bukan cerita upside-nya. Ide dengan mode gagal yang bisa diselamatkan yang menang.",
      },
    ],
    quoteLead: "Laporan ini hanya punya satu syarat sukses —",
    quote: "“*Jalur kegagalan itu belum pernah terpikir olehku.*”",
  },
  cta: {
    kicker: "Eksperimennya tetap berjalan",
    title: "Realita akan menguji idemu. |Patahkan duluan.|",
    sub: "Tempel idenya. Baca argumen kegagalan terkuatnya. Bangun dengan mata terbuka.",
    button: "Jalankan premortem",
    footnote:
      "Mesin premortem terstruktur — diukur terhadap chat bebas yang kuat, bukan baseline lemah.",
  },
};

export const LANDING_COPY: Record<Locale, LandingCopy> = { en, id };
