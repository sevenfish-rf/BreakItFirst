"use client";

/* eslint-disable react-hooks/set-state-in-effect --
   Intentional: provider settings + saved report are read from localStorage
   after mount (hydration gate) so SSR and first client render agree. */

import { useEffect, useState, type ReactNode } from "react";
import { Header } from "@/components/header";
import { LandingForm } from "@/components/landing-form";
import { AnalysisReport } from "@/components/analysis-report";
import { ProviderSettingsModal } from "@/components/provider-settings";
import { ScrollChoreography } from "@/components/scroll-choreography";
import { LanguageProvider, useLanguage } from "@/lib/i18n/context";
import { ThemeProvider } from "@/lib/theme-context";
import { loadActiveJob } from "@/lib/draft";
import {
  clearSavedReport,
  loadSavedReport,
  saveReport,
  type SavedReport,
} from "@/lib/report-storage";
import {
  DEFAULT_PROVIDER_SETTINGS,
  isProviderConfigured,
  loadProviderSettings,
  type ProviderSettings,
} from "@/lib/provider-settings";
import type { Locale } from "@/lib/i18n/types";
import type { FailureAnalysis } from "@/types/analysis";

export function AppShell() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AppShellInner />
      </ThemeProvider>
    </LanguageProvider>
  );
}

/** Wrap the first word matching the "failure" family in an <em> (signal accent). */
function emphasizeHeadline(headline: string): ReactNode {
  const parts = headline.split(/(\bbreak\w*\b|\bgagal\w*\b|\brusak\w*\b|\bhancur\w*\b)/i);
  return parts.map((part, i) =>
    /^(break\w*|gagal\w*|rusak\w*|hancur\w*)$/i.test(part) ? (
      <em key={i}>{part}</em>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

const PIPELINE: Record<
  Locale,
  { label: string; passes: { n: string; title: string; body: string }[] }
> = {
  en: {
    label: "How it works",
    passes: [
      { n: "Pass 1", title: "Open reasoning", body: "Free-form failure exploration across every domain." },
      { n: "Pass 1.5", title: "Adversarial critique", body: "The engine attacks its own weakest argument." },
      { n: "Pass 2", title: "Structured report", body: "One dominant thesis, typed and evidenced." },
    ],
  },
  id: {
    label: "Cara kerja",
    passes: [
      { n: "Pass 1", title: "Penalaran terbuka", body: "Eksplorasi kegagalan bebas lintas domain." },
      { n: "Pass 1.5", title: "Kritik adversarial", body: "Mesin menyerang argumen terlemahnya sendiri." },
      { n: "Pass 2", title: "Laporan terstruktur", body: "Satu tesis dominan, terstruktur & berdasar." },
    ],
  },
};

function AppShellInner() {
  const { locale, t } = useLanguage();
  const [settings, setSettings] = useState<ProviderSettings>(
    DEFAULT_PROVIDER_SETTINGS,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [analysis, setAnalysis] = useState<FailureAnalysis | null>(null);
  const [reportWarnings, setReportWarnings] = useState<string[]>([]);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    setSettings(loadProviderSettings());

    const activeJob = loadActiveJob();
    if (!activeJob?.jobId) {
      const saved = loadSavedReport();
      if (saved) {
        setAnalysis(saved.analysis);
        setReportWarnings(saved.warnings);
        setRestoredFromStorage(true);
      }
    }

    setHydrated(true);
  }, []);

  const providerReady = hydrated && isProviderConfigured(settings);

  function handleAnalysisSuccess(next: FailureAnalysis, warnings?: string[]) {
    const w = warnings ?? [];
    setAnalysis(next);
    setReportWarnings(w);
    setRestoredFromStorage(false);
    saveReport(next, w);
    setHistoryRefreshKey((k) => k + 1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  function handleOpenHistoryReport(report: SavedReport) {
    setAnalysis(report.analysis);
    setReportWarnings(report.warnings);
    setRestoredFromStorage(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  function handleResetReport() {
    setAnalysis(null);
    setReportWarnings([]);
    setRestoredFromStorage(false);
    clearSavedReport();
    setHistoryRefreshKey((k) => k + 1);
  }

  const pipe = PIPELINE[locale] ?? PIPELINE.en;

  return (
    <>
      <Header
        providerReady={providerReady}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main>
        {!analysis ? (
          <>
            <section className="hero">
              <div className="wrap">
                <div className="hero-eyebrow reveal">
                  <span className="tick" aria-hidden="true" />
                  <span className="label">{t.landing.kicker}</span>
                </div>
                <h1 className="reveal" data-delay="1">
                  {emphasizeHeadline(t.landing.headline)}
                </h1>
                <p className="hero-sub reveal" data-delay="2">
                  {t.landing.subhead}
                </p>

                <div className="reveal" data-delay="3">
                  <LandingForm
                    providerReady={providerReady}
                    provider={settings}
                    onNeedProvider={() => setSettingsOpen(true)}
                    onSuccess={handleAnalysisSuccess}
                    onOpenHistoryReport={handleOpenHistoryReport}
                    historyRefreshKey={historyRefreshKey}
                  />
                </div>

                <p className="hero-footnote reveal" data-delay="3">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6.5 1.5 12 11.5H1L6.5 1.5Z" />
                    <path d="M6.5 5.5v2.6M6.5 9.8v.01" />
                  </svg>
                  {t.landing.footerNote}
                </p>
              </div>
            </section>

            <section className="pipeline">
              <div className="wrap">
                <div className="pipeline-inner reveal">
                  <span className="label">{pipe.label}</span>
                  {pipe.passes.map((p) => (
                    <div className="pass" key={p.n}>
                      <span className="pass-n">{p.n}</span>
                      <div className="pass-body">
                        <b>{p.title}</b>
                        <span>{p.body}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : (
          <AnalysisReport
            analysis={analysis}
            warnings={reportWarnings}
            restoredFromStorage={restoredFromStorage}
            onReset={handleResetReport}
          />
        )}
      </main>

      <footer className="footer">
        <div className="wrap footer-inner">
          <svg className="brand-mark" width="22" height="22" viewBox="0 0 30 30" fill="none" aria-hidden="true">
            <path className="mk-ink" d="M20.8 3.2 A13 13 0 1 0 26.8 15" strokeWidth="1.8" strokeLinecap="round" />
            <path className="mk-sig" d="M22 4 L16.5 11.5 L20 13.5 L13 22" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="brand-name">{t.brand}</span>
          <p>{t.tagline}</p>
          <div className="nav-spacer" />
          <span className="mono">{t.brand.toUpperCase()} · EDITORIAL ANALYST</span>
        </div>
      </footer>

      <ProviderSettingsModal
        open={settingsOpen}
        initial={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={setSettings}
      />

      <ScrollChoreography viewKey={analysis ? "report" : "landing"} />
    </>
  );
}
