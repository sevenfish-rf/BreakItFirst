"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { Header } from "@/components/header";
import { LandingMetrics } from "@/components/landing-metrics";
import { LandingSpine } from "@/components/landing-spine";
import { LandingFooter } from "@/components/landing-footer";
import { LandingFaq } from "@/components/landing-faq";
import { SmoothScroller } from "@/components/smooth-scroller";
import { ScrollChoreography } from "@/components/scroll-choreography";
import { LanguageProvider, useLanguage } from "@/lib/i18n/context";
import { ThemeProvider } from "@/lib/theme-context";
import { LANDING_COPY, type LandingCopy } from "@/lib/landing-copy";

export function LandingPage() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <LandingInner />
      </ThemeProvider>
    </LanguageProvider>
  );
}

/** Render `|emphasized|` fragments as signal-colored italics. */
function em(text: string): ReactNode {
  const parts = text.split("|");
  return parts.map((part, i) =>
    i % 2 === 1 ? <em key={i}>{part}</em> : <span key={i}>{part}</span>,
  );
}

function LandingInner() {
  const { locale } = useLanguage();
  const c: LandingCopy = LANDING_COPY[locale] ?? LANDING_COPY.en;

  return (
    <>
      <Header />

      <SmoothScroller>
        <main>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="lp-hero">
          <div className="wrap lp-hero-grid">
            <div className="lp-hero-copy">
              <div className="hero-eyebrow reveal">
                <span className="tick" aria-hidden="true" />
                <span className="label">{c.hero.kicker}</span>
              </div>
              <h1 className="lp-h1 reveal" data-delay="1">
                {em(c.hero.headline)}
              </h1>
              <p className="hero-sub reveal" data-delay="2">
                {c.hero.sub}
              </p>
              <div className="lp-cta-row reveal" data-delay="3">
                <Link className="analyze-btn lp-cta" href="/app">
                  <span>{c.hero.ctaPrimary}</span>
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
                <a className="lp-cta-ghost" href="#method">
                  {c.hero.ctaSecondary}
                </a>
              </div>
            </div>

            <figure className="lp-fig lp-fig--hero reveal" data-delay="2">
              <SpecimenFigure labels={c.hero.figLabels} />
              <figcaption className="lp-figcap">{c.hero.figCaption}</figcaption>
            </figure>
          </div>
        </section>

        {/* ── 01 · Manifest ────────────────────────────────────── */}
        <section className="lp-sec">
          <div className="wrap">
            <LpSecHead no={c.manifest.no} title={c.manifest.title} />
            <p className="lp-intro reveal">{c.manifest.intro}</p>

            <div className="lp-manifest reveal">
              <div className="lp-manifest-head">
                <span className="label label--signal">{c.manifest.isLabel}</span>
                <span className="label">{c.manifest.isNotLabel}</span>
              </div>
              {c.manifest.rows.map((row, i) => (
                <div className="lp-manifest-row" key={i}>
                  <div className="lp-manifest-is">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 13 13"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M2 7l3 3 6-7" />
                    </svg>
                    <span>{row.is}</span>
                  </div>
                  <div className="lp-manifest-not">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
                    </svg>
                    <span>{row.not}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 02 · Method ──────────────────────────────────────── */}
        <section className="lp-sec" id="method">
          <div className="wrap">
            <LpSecHead no={c.method.no} title={c.method.title} />
            <p className="lp-intro reveal">{c.method.intro}</p>

            <div className="lp-passes reveal" role="list">
              {c.method.passes.map((p, i) => (
                <article className="lp-pass" role="listitem" key={p.n}>
                  <div className="lp-pass-head">
                    <span className="lp-pass-n">{p.n}</span>
                    <PassGlyph index={i} />
                  </div>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                  {i < c.method.passes.length - 1 ? (
                    <span className="lp-pass-arrow" aria-hidden="true">
                      →
                    </span>
                  ) : null}
                </article>
              ))}
            </div>
            <p className="lp-figcap lp-figcap--center reveal">
              {c.method.figCaption}
            </p>

            <div className="lp-method-notes reveal">
              <div className="lp-note">
                <span className="label label--signal">{c.method.guardTitle}</span>
                <p>{c.method.guard}</p>
              </div>
              <div className="lp-note">
                <span className="label">Deep</span>
                <p>{c.method.deepNote}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Causal spine (self-contained, safe to remove) ────── */}
        <LandingSpine />

        {/* ── Metrics band (unnumbered — self-contained, safe to remove) ── */}
        <LandingMetrics />

        {/* ── 04 · Audience ────────────────────────────────────── */}
        <section className="lp-sec">
          <div className="wrap">
            <LpSecHead no={c.audience.no} title={c.audience.title} />
            <p className="lp-intro reveal">{c.audience.intro}</p>

            <div className="lp-cards reveal">
              {c.audience.cards.map((card) => (
                <article className="lp-card" key={card.who}>
                  <span className="label label--signal">{card.when}</span>
                  <h3>{card.who}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>

            <div className="lp-quote reveal">
              <p className="lp-quote-lead">{c.audience.quoteLead}</p>
              <blockquote>{c.audience.quote}</blockquote>
            </div>
          </div>
        </section>

        {/* ── FAQ (self-contained, safe to remove) ──────────────── */}
        <LandingFaq />

        {/* ── Final CTA ────────────────────────────────────────── */}
        <section className="lp-final">
          <div className="wrap lp-final-inner reveal">
            <span className="label label--signal">{c.cta.kicker}</span>
            <h2 className="lp-final-title">{em(c.cta.title)}</h2>
            <p className="lp-final-sub">{c.cta.sub}</p>
            <Link className="analyze-btn lp-cta" href="/app">
              <span>{c.cta.button}</span>
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
            <p className="lp-final-footnote">{c.cta.footnote}</p>
          </div>
        </section>
      </main>

      <LandingFooter />
      </SmoothScroller>
      <ScrollChoreography viewKey="landing-marketing" />
    </>
  );
}

function LpSecHead({ no, title }: { no: string; title: string }) {
  return (
    <div className="lp-sec-head reveal">
      <span className="lp-sec-no">{no}</span>
      <h2 className="lp-sec-title">{title}</h2>
    </div>
  );
}

/* ================================================================
   Fig. 01 — hero specimen: SPOF → cascade → end state, annotated
   like a museum plate. Built from self-aligning flex rows (node,
   leader line, label share one row) — no hand-placed coordinates.
   ================================================================ */
function SpecimenFigure({
  labels,
}: {
  labels: LandingCopy["hero"]["figLabels"];
}) {
  return (
    <div
      className="lps2"
      role="img"
      aria-label={`${labels.spof} → ${labels.cascade} → ${labels.terminal}`}
    >
      <span className="lps2-rail" aria-hidden="true">
        <i />
      </span>

      {/* SPOF — fractured circle */}
      <div className="lps2-row">
        <span className="lps2-nodecol">
          <span className="lps2-pop lps2-spof">
            <svg viewBox="0 0 34 34" fill="none" aria-hidden="true">
              <circle cx="17" cy="17" r="14.5" className="lps2-ring" strokeWidth="1.5" />
              <path
                className="lps2-crack"
                d="M24 7 L17.5 15.5 L21 17.5 L11 27"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </span>
        <i className="lps2-leader" />
        <span className="lps2-label lps2-label--sig">{labels.spof}</span>
      </div>

      {/* step 1 — unlabeled */}
      <div className="lps2-row">
        <span className="lps2-nodecol">
          <span className="lps2-pop lps2-step">1</span>
        </span>
      </div>

      {/* step 2 — causal cascade */}
      <div className="lps2-row">
        <span className="lps2-nodecol">
          <span className="lps2-pop lps2-step">2</span>
        </span>
        <i className="lps2-leader" />
        <span className="lps2-label">{labels.cascade}</span>
      </div>

      {/* step 3 — observable signal chip */}
      <div className="lps2-row">
        <span className="lps2-nodecol">
          <span className="lps2-pop lps2-step">3</span>
        </span>
        <span className="lps2-chip" aria-hidden="true">
          <i />
          <i />
        </span>
        <i className="lps2-leader" />
        <span className="lps2-label">{labels.signal}</span>
      </div>

      {/* step 4 — point of no return */}
      <div className="lps2-row">
        <span className="lps2-nodecol">
          <span className="lps2-pop lps2-step lps2-step--ponr">4</span>
        </span>
        <i className="lps2-leader" />
        <span className="lps2-label lps2-label--sig">{labels.ponr}</span>
      </div>

      {/* end state */}
      <div className="lps2-row">
        <span className="lps2-nodecol">
          <span className="lps2-pop lps2-end">
            <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M2.5 2.5l7 7M9.5 2.5l-7 7"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </span>
        <i className="lps2-leader" />
        <span className="lps2-label lps2-label--sig">{labels.terminal}</span>
      </div>
    </div>
  );
}

/** Small editorial glyphs for the three passes. */
function PassGlyph({ index }: { index: number }) {
  if (index === 0) {
    // candidates → one winner
    return (
      <svg className="lp-glyph" width="34" height="22" viewBox="0 0 34 22" fill="none" aria-hidden="true">
        <circle cx="6" cy="6" r="3" className="g-mut" strokeWidth="1.2" />
        <circle cx="6" cy="16" r="3" className="g-mut" strokeWidth="1.2" />
        <circle cx="27" cy="11" r="4.5" className="g-sig" strokeWidth="1.4" />
        <path d="M10 6 L21 10 M10 16 L21 12" className="g-mut" strokeWidth="1" strokeDasharray="2 2.5" />
      </svg>
    );
  }
  if (index === 1) {
    // critique: strike through a line
    return (
      <svg className="lp-glyph" width="34" height="22" viewBox="0 0 34 22" fill="none" aria-hidden="true">
        <path d="M4 7 H30" className="g-mut" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M4 15 H30" className="g-mut" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M8 18 L26 4" className="g-sig" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  // structured: brackets
  return (
    <svg className="lp-glyph" width="34" height="22" viewBox="0 0 34 22" fill="none" aria-hidden="true">
      <path d="M10 3 H5 V19 H10" className="g-sig" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 3 H29 V19 H24" className="g-sig" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 8 H21 M13 14 H21" className="g-mut" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
