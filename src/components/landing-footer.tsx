"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/types";
import s from "./landing-footer.module.css";

/**
 * Site footer, used on both "/" and "/app".
 *
 * Section links are written as "/#anchor" rather than "#anchor" so they still
 * resolve when the footer is rendered on /app, where those sections are absent.
 *
 * Every destination here resolves to something that actually exists: two real
 * routes, three anchors rendered on this page, and the project's own
 * repository. The source template's social row and Privacy / Terms / Cookie
 * links were dropped rather than pointed at placeholders — a dead legal link
 * is a promise the site cannot keep. The privacy claim they would normally
 * cover is stated outright instead, and it is true: reports live in
 * localStorage only (see report-storage.ts), there is no account and no
 * server-side report store.
 */

type FooterCopy = {
  tagline: string;
  nav: { label: string; href: string }[];
  finePrint: string;
  sourceLabel: string;
  copyright: string;
};

const REPO = "https://github.com/sevenfish-rf/BreakItFirst";
const YEAR = "2026";

const COPY: Record<Locale, FooterCopy> = {
  en: {
    tagline:
      "A structured premortem engine: one idea-specific failure hinge, and the cascade that follows it.",
    nav: [
      { label: "Home", href: "/" },
      { label: "How it works", href: "/#method" },
      { label: "Anatomy of a report", href: "/#anatomy" },
      { label: "What's enforced", href: "/#constraints" },
      { label: "Run a premortem", href: "/app" },
    ],
    finePrint:
      "Reports are generated per run and kept in this browser only — no account, no server-side report storage.",
    sourceLabel: "Source on GitHub",
    copyright: `© ${YEAR} BreakItFirst · Premortem for unbuilt ideas`,
  },
  id: {
    tagline:
      "Mesin premortem terstruktur: satu engsel kegagalan yang spesifik pada idemu, beserta rantai yang mengikutinya.",
    nav: [
      { label: "Beranda", href: "/" },
      { label: "Cara kerja", href: "/#method" },
      { label: "Anatomi laporan", href: "/#anatomy" },
      { label: "Yang dijaga", href: "/#constraints" },
      { label: "Jalankan premortem", href: "/app" },
    ],
    finePrint:
      "Laporan dibuat per run dan hanya disimpan di browser ini — tanpa akun, tanpa penyimpanan laporan di server.",
    sourceLabel: "Kode sumber di GitHub",
    copyright: `© ${YEAR} BreakItFirst · Premortem untuk ide yang belum dibangun`,
  },
};

export function LandingFooter() {
  const { locale } = useLanguage();
  const c = COPY[locale] ?? COPY.en;
  const reduced = useReducedMotion() ?? false;

  return (
    <footer className={s.foot}>
      <div className="wrap">
        <div className={`${s.top} reveal`}>
          <div className={s.brandCol}>
            <Link className={s.brand} href="/" aria-label="BreakItFirst home">
              <svg
                className={s.mark}
                width="26"
                height="26"
                viewBox="0 0 30 30"
                fill="none"
                aria-hidden="true"
              >
                <path
                  className={s.markInk}
                  d="M20.8 3.2 A13 13 0 1 0 26.8 15"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  className={s.markSig}
                  d="M22 4 L16.5 11.5 L20 13.5 L13 22"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className={s.wordmark}>BreakItFirst</span>
            </Link>

            <p className={s.tagline}>{c.tagline}</p>

            <div className={s.links}>
              <motion.a
                className={s.iconBtn}
                href={REPO}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={c.sourceLabel}
                title={c.sourceLabel}
                whileHover={reduced ? undefined : { scale: 1.1 }}
                whileTap={reduced ? undefined : { scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M8 .2a8 8 0 0 0-2.53 15.6c.4.07.55-.17.55-.38l-.01-1.34c-2.23.49-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.81.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.2c0 .21.14.46.55.38A8 8 0 0 0 8 .2Z"
                  />
                </svg>
              </motion.a>
            </div>
          </div>

          <div className={s.navCol}>
            <nav className={s.nav} aria-label="Footer">
              {c.nav.map((l) =>
                l.href.startsWith("#") ? (
                  <a className={s.navLink} href={l.href} key={l.href}>
                    {l.label}
                  </a>
                ) : (
                  <Link className={s.navLink} href={l.href} key={l.href}>
                    {l.label}
                  </Link>
                ),
              )}
            </nav>
            <p className={s.finePrint}>{c.finePrint}</p>
          </div>
        </div>

        <div className={s.divider} />

        <div className={`${s.copy} reveal`}>
          <p>{c.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
