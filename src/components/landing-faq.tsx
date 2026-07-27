"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/types";
import s from "./landing-faq.module.css";

/**
 * FAQ section for the landing page — "FAQ 01 Luma" layout adapted to
 * the BreakItFirst design system.
 *
 * Self-contained: this file plus its CSS module are the whole section.
 * Removing it means deleting both files and the single <LandingFaq />
 * line in landing-page.tsx. Nothing else references it.
 */

type FaqItem = { q: string; a: string };

type FaqCopy = {
  headBefore: string;
  headDim: string;
  headAfter: string;
  sub: string;
  cta: string;
  items: FaqItem[];
};

const COPY: Record<Locale, FaqCopy> = {
  en: {
    headBefore: "Frequently Ask",
    headDim: "ed",
    headAfter: " Questions",
    sub: "What founders ask before their first premortem.",
    cta: "Run a premortem",
    items: [
      {
        q: "What is a premortem?",
        a: "It asks \u2018how does this fail?\u2019 before you build. You get one dominant failure argument \u2014 not a checklist of five equal risks.",
      },
      {
        q: "How is this different from ChatGPT or Claude?",
        a: "A three-pass pipeline drafts hypotheses, attacks its own argument, and compresses the survivor into a validated report. Generic risks are caught and rewritten.",
      },
      {
        q: "Do I need an API key?",
        a: "Yes. You connect your own OpenAI-compatible provider (OpenAI, OpenRouter, Ollama, or custom). Your key stays in the browser.",
      },
      {
        q: "What\u2019s in the report?",
        a: "One SPOF, a causal cascade with observable signals, a point of no return, a resilience radar, stress tests, and domain failure modes.",
      },
      {
        q: "Is the output actually specific to my idea?",
        a: "The engine hunts generic camouflage and rejects invented architectures. We publish quality-gap results and document where it falls short.",
      },
    ],
  },
  id: {
    headBefore: "Pertanyaan",
    headDim: " yang",
    headAfter: " Sering Ditanyakan",
    sub: "Yang sering ditanyakan sebelum premortem pertama.",
    cta: "Jalankan premortem",
    items: [
      {
        q: "Apa itu premortem?",
        a: "Bertanya \u2018bagaimana ini gagal?\u2019 sebelum dibangun. Hasilnya satu argumen kegagalan dominan \u2014 bukan checklist lima risiko setara.",
      },
      {
        q: "Apa bedanya dengan ChatGPT atau Claude?",
        a: "Pipeline tiga tahap menyusun hipotesis, menyerang argumennya sendiri, lalu mengompres hasilnya jadi laporan tervalidasi. Risiko generik ditangkap dan ditulis ulang.",
      },
      {
        q: "Apakah perlu API key?",
        a: "Ya. Hubungkan provider OpenAI-compatible Anda (OpenAI, OpenRouter, Ollama, atau kustom). Key tetap di browser.",
      },
      {
        q: "Apa isi laporannya?",
        a: "Satu SPOF, rantai kausal dengan sinyal teramati, titik tanpa kembali, radar ketahanan, stress test, dan mode kegagalan per domain.",
      },
      {
        q: "Apakah hasilnya spesifik untuk ide saya?",
        a: "Engine memburu kamuflase generik dan menolak arsitektur yang dikarang. Kami mempublikasikan hasil quality-gap dan mendokumentasikan kelemahannya.",
      },
    ],
  },
};

const ease: [number, number, number, number] = [0.4, 0, 0.2, 1];

export function LandingFaq() {
  const { locale } = useLanguage();
  const c = COPY[locale] ?? COPY.en;
  const [openIds, setOpenIds] = useState<number[]>([]);

  const toggle = (i: number) =>
    setOpenIds((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );

  return (
    <section className={s.section} id="faq">
      <div className="wrap">
        <div className={s.grid}>
          {/* ── Left column — Header block ─────────────────── */}
          <div>
            <h2 className={s.headline}>
              {c.headBefore}
              <span className={s.headDim}>{c.headDim}</span>
              {c.headAfter}
            </h2>
            <p className={s.sub}>{c.sub}</p>
            <Link href="/app" className="analyze-btn lp-cta">
              <span>{c.cta}</span>
              <svg
                className="arr"
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2.5 7.5h10M8.5 3.5l4 4-4 4" />
              </svg>
            </Link>
          </div>

          {/* ── Right column — Accordion stack ─────────────── */}
          <div className={s.stack}>
            {c.items.map((item, i) => {
              const isOpen = openIds.includes(i);
              return (
                <div key={i} className={s.card} data-open={isOpen}>
                  <button
                    className={s.trigger}
                    onClick={() => toggle(i)}
                    aria-expanded={isOpen}
                  >
                    <span className={s.question}>{item.q}</span>
                    <motion.div
                      className={s.chevron}
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.4, ease }}
                    >
                      <ChevronDown className="w-5 h-5" />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease }}
                      >
                        <div className={s.answer}>{item.a}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
