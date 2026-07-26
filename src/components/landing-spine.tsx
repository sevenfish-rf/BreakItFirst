"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/types";
import s from "./landing-spine.module.css";

/**
 * "Anatomy of one argument" — the report's causal spine, drawn.
 *
 * One hinge (the SPOF) forks into the three blocks that derive from it. The
 * connector tree is not decoration: it *is* the product's structure, which is
 * why the flow layout was chosen over a feature list.
 *
 * Self-contained: this file plus its CSS module are the whole section, so
 * removing it means deleting both and one line in landing-page.tsx.
 *
 * The specimen quoted in the flagship card is real output from a recorded run
 * (docs/Scoring/4.md — Hardware / budget fitness ring). Do not replace it with
 * invented text; a fabricated example would undo the point of showing one.
 */

type Branch = {
  n: string;
  title: string;
  body: string;
  kind: "cascade" | "modes" | "stress";
  items: string[];
  note?: string;
};

type SpineCopy = {
  eyebrow: string;
  title: string;
  titleAccent: string;
  sub: string;
  hinge: {
    pill: string;
    title: string;
    body: string;
    specimenLabel: string;
    category: string;
    idea: string;
    spof: string;
    confidenceLabel: string;
    confidence: string;
    caption: string;
  };
  branches: Branch[];
};

const COPY: Record<Locale, SpineCopy> = {
  en: {
    eyebrow: "Anatomy of one argument",
    title: "Everything in the report hangs off",
    titleAccent: "one hinge.",
    sub: "The engine does not hand back a risk list. It names the single most fragile mechanism, then traces what follows from it. Everything quoted below is output from a recorded run.",
    hinge: {
      pill: "The hinge",
      title: "Single point of failure",
      body: "One dominant mechanism, ranked from several candidates the engine drafts and discards internally. The test it has to pass: if this point could not fail, would the cascade still run? If it would, the hinge is wrong and gets rewritten.",
      specimenLabel: "Specimen",
      category: "Hardware",
      idea: "Budget fitness ring built on an OEM sensor, sold with a $5/mo recovery subscription and marketed on premium-grade heart-rate accuracy.",
      spof: "Budget sensor claimed as premium accuracy",
      confidenceLabel: "Confidence",
      confidence: "High",
      caption: "Recorded run · four independent judges scored this spine in the top tier",
    },
    branches: [
      {
        n: "02",
        title: "Failure cascade",
        body: "Seven to twelve causal steps from the hinge to the end state, each carrying a signal you could actually observe.",
        kind: "cascade",
        items: [
          "OEM optical sensor cannot meet the accuracy claim",
          "Recovery score loses credibility with users",
          "Returns climb and subscriptions churn",
          "Thin margin meets reverse-logistics cost",
          "Pivot to budget tracker — now fighting Xiaomi",
        ],
      },
      {
        n: "03",
        title: "Failure modes",
        body: "The same spine read across five domains. A domain with nothing material stays empty rather than padded with filler.",
        kind: "modes",
        items: ["Technical", "Business", "Security", "Legal", "Operations"],
      },
      {
        n: "04",
        title: "Archetype stress test",
        body: "Known collapse patterns, each answered Yes, Maybe or No against your specific idea — never a single danger score.",
        kind: "stress",
        items: [
          "Cold-start / chicken-egg",
          "Unit economics death spiral",
          "Trust erosion cascade",
          "Model / quality ceiling",
        ],
        note: "and five more",
      },
    ],
  },
  id: {
    eyebrow: "Anatomi satu argumen",
    title: "Semua isi laporan bertumpu pada",
    titleAccent: "satu engsel.",
    sub: "Mesin ini tidak mengembalikan daftar risiko. Ia menyebut satu mekanisme paling rapuh, lalu menelusuri apa yang mengikutinya. Semua yang dikutip di bawah adalah keluaran dari run yang terekam.",
    hinge: {
      pill: "Engselnya",
      title: "Single point of failure",
      body: "Satu mekanisme dominan, dipilih dari beberapa kandidat yang disusun dan dibuang mesin secara internal. Ujian yang harus dilewati: kalau titik ini tidak mungkin gagal, apakah cascade-nya tetap jalan? Kalau ya, engselnya salah dan ditulis ulang.",
      specimenLabel: "Spesimen",
      category: "Hardware",
      idea: "Cincin kebugaran murah berbasis sensor OEM, dijual dengan langganan recovery $5/bln dan dipasarkan dengan klaim akurasi detak jantung setara produk premium.",
      spof: "Sensor murah diklaim berakurasi premium",
      confidenceLabel: "Keyakinan",
      confidence: "Tinggi",
      caption: "Run terekam · empat juri independen menempatkan spine ini di tier teratas",
    },
    branches: [
      {
        n: "02",
        title: "Rantai kegagalan",
        body: "Tujuh sampai dua belas langkah kausal dari engsel sampai kondisi akhir, tiap langkah membawa sinyal yang benar-benar bisa diamati.",
        kind: "cascade",
        items: [
          "Sensor optik OEM tak sanggup memenuhi klaim akurasi",
          "Skor recovery kehilangan kredibilitas di mata pengguna",
          "Retur naik dan langganan berguguran",
          "Margin tipis bertemu ongkos logistik balik",
          "Pivot ke tracker murah — kini melawan Xiaomi",
        ],
      },
      {
        n: "03",
        title: "Mode kegagalan",
        body: "Spine yang sama dibaca lintas lima domain. Domain tanpa risiko material dibiarkan kosong, bukan diisi basa-basi.",
        kind: "modes",
        items: ["Teknis", "Bisnis", "Keamanan", "Hukum", "Operasional"],
      },
      {
        n: "04",
        title: "Stress test arketipe",
        body: "Pola keruntuhan yang dikenal, masing-masing dijawab Ya, Mungkin, atau Tidak untuk ide spesifikmu — bukan satu skor bahaya.",
        kind: "stress",
        items: [
          "Cold-start / chicken-egg",
          "Unit economics death spiral",
          "Trust erosion cascade",
          "Model / quality ceiling",
        ],
        note: "dan lima lainnya",
      },
    ],
  },
};

/** Choreography, in seconds. Order mirrors the way the eye reads the tree. */
const T = {
  node1: 0,
  line1: 0.15,
  hinge: 0.3,
  line2: 0.55,
  rail: 0.75,
  branch: (i: number) => 0.95 + i * 0.12,
  card: (i: number) => 1.25 + i * 0.12,
};

export function LandingSpine() {
  const { locale } = useLanguage();
  const c = COPY[locale] ?? COPY.en;
  const reduced = useReducedMotion() ?? false;

  return (
    <section className={s.spine} aria-labelledby="spine-title">
      <div className="wrap">
        <div className={`${s.head} reveal`}>
          <span className={s.eyebrow}>
            <i aria-hidden="true" />
            {c.eyebrow}
          </span>
          <h2 className={s.title} id="spine-title">
            {c.title} <span className={s.accent}>{c.titleAccent}</span>
          </h2>
          <p className={s.sub}>{c.sub}</p>
        </div>

        <div className={s.tree}>
          <Node n="01" delay={T.node1} reduced={reduced} />
          <Line delay={T.line1} reduced={reduced} />

          {/* ── the hinge ───────────────────────────────────────── */}
          <motion.article
            className={s.hinge}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={
              reduced
                ? { duration: 0 }
                : { duration: 0.5, ease: "easeOut", delay: T.hinge }
            }
          >
            <div className={s.hingeCopy}>
              <span className={s.pill}>{c.hinge.pill}</span>
              <h3 className={s.hingeTitle}>{c.hinge.title}</h3>
              <p className={s.hingeBody}>{c.hinge.body}</p>
            </div>

            <div className={s.specimen}>
              <div className={s.specimenCard}>
                <div className={s.specimenHead}>
                  <span className={s.specimenLabel}>
                    {c.hinge.specimenLabel}
                  </span>
                  <span className={s.specimenChip}>{c.hinge.category}</span>
                </div>
                <div className={s.specimenBody}>
                  <p className={s.specimenIdea}>{c.hinge.idea}</p>
                  <p className={s.specimenSpof}>
                    <span>{c.hinge.spof}</span>
                  </p>
                  <div className={s.specimenFoot}>
                    <span className={s.specimenKey}>
                      {c.hinge.confidenceLabel}
                    </span>
                    <span className={s.specimenVal}>{c.hinge.confidence}</span>
                  </div>
                </div>
              </div>
              <p className={s.specimenCaption}>{c.hinge.caption}</p>
            </div>
          </motion.article>

          <Line delay={T.line2} reduced={reduced} />

          {/* ── fork: rail spans the outer two column centres ────── */}
          <div className={s.fork} aria-hidden="true">
            <span className={s.forkTrack} />
            <motion.span
              className={s.forkLive}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { duration: 0.45, ease: "easeInOut", delay: T.rail }
              }
            />
          </div>

          {/* ── branches: each column owns its own drop + node + card,
                 so a single-column stack on mobile still reads in order ── */}
          <div className={s.branches}>
            {c.branches.map((b, i) => (
              <div className={s.branch} key={b.n}>
                <Line delay={T.branch(i)} reduced={reduced} short />
                <Node n={b.n} delay={T.branch(i) + 0.15} reduced={reduced} />
                <motion.article
                  className={s.card}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { duration: 0.45, ease: "easeOut", delay: T.card(i) }
                  }
                >
                  <div className={s.cardCopy}>
                    <h4 className={s.cardTitle}>{b.title}</h4>
                    <p className={s.cardBody}>{b.body}</p>
                  </div>
                  <Vignette branch={b} />
                </motion.article>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Node({
  n,
  delay,
  reduced,
}: {
  n: string;
  delay: number;
  reduced: boolean;
}) {
  return (
    <motion.span
      className={s.node}
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={
        reduced ? { duration: 0 } : { duration: 0.35, ease: "easeOut", delay }
      }
      aria-hidden="true"
    >
      {n}
    </motion.span>
  );
}

function Line({
  delay,
  reduced,
  short,
}: {
  delay: number;
  reduced: boolean;
  short?: boolean;
}) {
  return (
    <div className={`${s.line}${short ? ` ${s.lineShort}` : ""}`} aria-hidden="true">
      <span className={s.lineTrack} />
      <motion.span
        className={s.lineLive}
        initial={{ scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 0.35, ease: "easeInOut", delay }
        }
      />
    </div>
  );
}

/** Small in-card figure. Content comes from the branch data, never invented. */
function Vignette({ branch }: { branch: Branch }) {
  if (branch.kind === "cascade") {
    return (
      <div className={s.fig}>
        <ol className={s.chain}>
          {branch.items.map((step, i) => (
            <li key={step}>
              <span className={s.chainDot} aria-hidden="true" />
              <span className={s.chainText}>{step}</span>
              {i === branch.items.length - 1 ? null : (
                <span className={s.chainRail} aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (branch.kind === "modes") {
    return (
      <div className={s.fig}>
        <ul className={s.domains}>
          {branch.items.map((d) => (
            <li key={d}>
              <span className={s.domainTick} aria-hidden="true" />
              {d}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={s.fig}>
      <ul className={s.patterns}>
        {branch.items.map((p) => (
          <li key={p}>
            <span className={s.patternRing} aria-hidden="true" />
            <span className={s.patternName}>{p}</span>
          </li>
        ))}
      </ul>
      {branch.note ? <p className={s.patternNote}>{branch.note}</p> : null}
    </div>
  );
}
