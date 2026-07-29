"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useLanguage } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/types";
import s from "./landing-metrics.module.css";

/**
 * "Enforced by the engine" — tabbed metrics band for the landing page.
 *
 * Self-contained by design: copy, data, markup and styles live in this file
 * and its CSS module. Removing the section = delete both files and the single
 * <LandingMetrics /> line in landing-page.tsx. Nothing else references it.
 *
 * Every figure below is a real constraint in this repo (schema.ts, pipeline.ts,
 * archetypes.ts) — not a marketing benchmark. Keep it that way: if a rule
 * changes in code, change it here too or drop the stat.
 */

type Stat = { value: string; title: string; desc: string };
type Tab = { id: string; label: string; stats: Stat[] };
type MetricsCopy = {
  eyebrow: string;
  title: string;
  titleAccent: string;
  sub: string;
  tabs: Tab[];
  footTitle: string;
  footText: string;
};

const COPY: Record<Locale, MetricsCopy> = {
  en: {
    eyebrow: "Enforced by the engine",
    title: "Every figure here is",
    titleAccent: "enforced in code.",
    sub: "Schema ranges the validator enforces, rules the critique pass applies, checks that run on every report.",
    tabs: [
      {
        id: "report",
        label: "The report",
        stats: [
          {
            value: "1",
            title: "single point of failure",
            desc: "One dominant hinge, ranked from several candidates the engine drafts internally",
          },
          {
            value: "7–12",
            title: "causal cascade steps",
            desc: "Each one carrying an observable real-world signal, never advice",
          },
          {
            value: "5",
            title: "resilience axes",
            desc: "Scored 0–100 and never collapsed into a single vanity number",
          },
        ],
      },
      {
        id: "engine",
        label: "The engine",
        stats: [
          {
            value: "3",
            title: "reasoning passes",
            desc: "Open reasoning, adversarial critique, then structured extraction",
          },
          {
            value: "2×",
            title: "Pass 1 drafts in Deep mode",
            desc: "Run independently, then calibrated for agreement on the hinge",
          },
          {
            value: "0",
            title: "new claims at structuring",
            desc: "Pass 2 may not invent what the reasoning passes never argued",
          },
        ],
      },
      {
        id: "guardrails",
        label: "The guardrails",
        stats: [
          {
            value: "17",
            title: "automated soft-checks",
            desc: "Cascade connectivity, signal quality, SPOF linkage and more, per run",
          },
          {
            value: "5–10",
            title: "hidden assumptions required",
            desc: "Hard schema validation — outside the range, the report is rejected",
          },
          {
            value: "9",
            title: "failure archetypes",
            desc: "Each answered Yes, Maybe or No against your specific idea",
          },
        ],
      },
    ],
    footTitle: "The constraints are the product.",
    footText:
      "Every limit above exists to keep the engine from drifting into an argument that would fit any startup at all.",
  },
  id: {
    eyebrow: "Dijaga oleh mesin",
    title: "Setiap angka di sini",
    titleAccent: "dipaksakan oleh kode.",
    sub: "Rentang skema yang dipaksakan validator, aturan yang diterapkan tahap kritik, pemeriksaan yang jalan di setiap laporan.",
    tabs: [
      {
        id: "report",
        label: "Laporan",
        stats: [
          {
            value: "1",
            title: "single point of failure",
            desc: "Satu engsel dominan, dipilih dari beberapa kandidat yang disusun mesin secara internal",
          },
          {
            value: "7–12",
            title: "langkah rantai kausal",
            desc: "Tiap langkah membawa sinyal yang bisa diamati di dunia nyata, bukan saran",
          },
          {
            value: "5",
            title: "sumbu ketahanan",
            desc: "Dinilai 0–100 dan tidak pernah digabung jadi satu angka vanity",
          },
        ],
      },
      {
        id: "engine",
        label: "Mesin",
        stats: [
          {
            value: "3",
            title: "tahap penalaran",
            desc: "Penalaran terbuka, kritik adversarial, lalu ekstraksi terstruktur",
          },
          {
            value: "2×",
            title: "draf Pass 1 di mode Deep",
            desc: "Dijalankan independen, lalu dikalibrasi kesepakatannya soal engsel",
          },
          {
            value: "0",
            title: "klaim baru saat penstrukturan",
            desc: "Pass 2 dilarang mengarang yang tidak pernah diargumenkan tahap penalaran",
          },
        ],
      },
      {
        id: "guardrails",
        label: "Pengaman",
        stats: [
          {
            value: "17",
            title: "pemeriksaan otomatis",
            desc: "Keterhubungan cascade, kualitas sinyal, keterkaitan SPOF, dan lainnya, tiap run",
          },
          {
            value: "5–10",
            title: "asumsi tersembunyi diwajibkan",
            desc: "Validasi skema keras — di luar rentang itu, laporan ditolak",
          },
          {
            value: "9",
            title: "arketipe kegagalan",
            desc: "Masing-masing dijawab Ya, Mungkin, atau Tidak untuk ide spesifikmu",
          },
        ],
      },
    ],
    footTitle: "Batasannya adalah produknya.",
    footText:
      "Semua batas di atas ada untuk mencegah mesin melantur ke argumen yang cocok untuk startup mana pun.",
  },
};

export function LandingMetrics() {
  const { locale } = useLanguage();
  const c = COPY[locale] ?? COPY.en;
  const [activeId, setActiveId] = useState(c.tabs[0].id);

  const active = c.tabs.find((t) => t.id === activeId) ?? c.tabs[0];

  return (
    <section className={s.band} id="constraints" aria-labelledby="metrics-title">
      <div className="wrap">
        {/* .reveal is the page-level scroll choreography (see ScrollChoreography);
            harmless if this section is deleted, since nothing else references it */}
        <div className={`${s.head} reveal`}>
          <span className={s.eyebrow}>
            <i aria-hidden="true" />
            {c.eyebrow}
          </span>
          <h2 className={s.title} id="metrics-title">
            {c.title} <span className={s.accent}>{c.titleAccent}</span>
          </h2>
          <p className={s.sub}>{c.sub}</p>
        </div>

        <div
          className={`${s.tabs} reveal`}
          data-delay="1"
          role="tablist"
          aria-label={c.eyebrow}
        >
          {c.tabs.map((tab, i) => {
            const on = tab.id === activeId;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`metrics-panel-${tab.id}`}
                className={`${s.tab}${on ? ` ${s.tabOn}` : ""}`}
                onClick={() => setActiveId(tab.id)}
              >
                <span className={s.tabIndex} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{tab.label}</span>
                {on ? (
                  <motion.span
                    layoutId="metricsTabRule"
                    className={s.rule}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <div
          className={`${s.stats} reveal`}
          data-delay="2"
          role="tabpanel"
          id={`metrics-panel-${active.id}`}
        >
          {active.stats.map((stat, i) => (
            <motion.div
              // key includes the tab so numbers re-animate on every switch
              key={`${active.id}-${stat.title}`}
              className={s.cell}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.1, ease: "easeOut" }}
            >
              <Counter value={stat.value} />
              <h3 className={s.cellTitle}>{stat.title}</h3>
              <p className={s.cellDesc}>{stat.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className={`${s.foot} reveal`} data-delay="3">
          <h3 className={s.footTitle}>{c.footTitle}</h3>
          <p className={s.footText}>{c.footText}</p>
        </div>
      </div>
    </section>
  );
}

/**
 * Counts up the first number inside a value, preserving whatever sits around
 * it: "7–12" counts to 7 and keeps "–12", "2×" keeps the multiplier sign.
 *
 * The true value is what renders by default — the animation is only ever an
 * overlay on top of it. So a value with no digits, a reduced-motion visitor,
 * a browser without IntersectionObserver, or JS failing outright all still
 * show the real figure rather than a misleading "0".
 */
function Counter({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduced = useReducedMotion();

  const match = /^(\D*)(\d+(?:\.\d+)?)(.*)$/.exec(value);
  const prefix = match?.[1] ?? "";
  const target = match ? Number(match[2]) : 0;
  const suffix = match?.[3] ?? "";
  const decimals = match?.[2].split(".")[1]?.length ?? 0;

  // Seeded with the real figure, so the first paint (and any visitor the
  // animation never reaches) reads the true number instead of a zero.
  const count = useMotionValue(target);
  const text = useTransform(
    count,
    (latest) => `${prefix}${latest.toFixed(decimals)}${suffix}`,
  );

  useEffect(() => {
    if (!match || !inView || reduced) return;
    count.set(0);
    const controls = animate(count, target, { duration: 1.4, ease: "easeOut" });
    return () => controls.stop();
  }, [count, inView, match, reduced, target]);

  if (!match) {
    return (
      <span className={s.num} ref={ref}>
        {value}
      </span>
    );
  }

  return (
    <span className={s.num} ref={ref} aria-label={value}>
      <motion.span aria-hidden="true">{text}</motion.span>
    </span>
  );
}
