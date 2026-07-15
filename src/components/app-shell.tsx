"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Crosshair, KeyRound, Network } from "lucide-react";
import { Header } from "@/components/header";
import { LandingForm } from "@/components/landing-form";
import { AnalysisReport } from "@/components/analysis-report";
import { ProviderSettingsModal } from "@/components/provider-settings";
import { PixelBlastBackground } from "@/components/effects/pixel-blast-background";
import { GlowCard } from "@/components/ui/glow-card";
import { LanguageProvider, useLanguage } from "@/lib/i18n/context";
import { ThemeProvider } from "@/lib/theme-context";
import {
  DEFAULT_PROVIDER_SETTINGS,
  isProviderConfigured,
  loadProviderSettings,
  type ProviderSettings,
} from "@/lib/provider-settings";
import type { FailureAnalysis } from "@/types/analysis";

const FEATURE_ICONS = [Crosshair, Network, KeyRound] as const;

export function AppShell() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AppShellInner />
      </ThemeProvider>
    </LanguageProvider>
  );
}

function AppShellInner() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<ProviderSettings>(
    DEFAULT_PROVIDER_SETTINGS,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [analysis, setAnalysis] = useState<FailureAnalysis | null>(null);
  const [reportWarnings, setReportWarnings] = useState<string[]>([]);

  useEffect(() => {
    setSettings(loadProviderSettings());
    setHydrated(true);
  }, []);

  const providerReady = hydrated && isProviderConfigured(settings);

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-x-hidden">
      <PixelBlastBackground opacity={analysis ? 0.16 : 0.32} />
      <div className="page-mesh" aria-hidden />

      <div className="relative z-10 flex min-h-full flex-1 flex-col">
        <Header
          providerReady={providerReady}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
          <AnimatePresence mode="wait">
            {!analysis ? (
              <motion.div
                key="landing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28 }}
                className="grid flex-1 items-start gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14"
              >
                <div className="space-y-8 lg:sticky lg:top-24 lg:self-start">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <motion.p
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.05 }}
                      className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-accent shadow-[0_0_24px_-8px_rgba(255,107,107,0.5)]"
                    >
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                      </span>
                      {t.landing.kicker}
                    </motion.p>

                    <h1 className="text-balance text-4xl font-semibold tracking-[-0.03em] text-text sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
                      {t.landing.headline}
                    </h1>

                    <p className="mt-6 max-w-lg text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
                      {t.landing.subhead}
                    </p>

                    <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1">
                        <ArrowRight className="h-3 w-3 text-accent" />
                        Pre-mortem
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1">
                        Cascade
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1">
                        BYOK
                      </span>
                    </div>
                  </motion.div>

                  <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                    {t.landing.features.map((f, i) => {
                      const Icon = FEATURE_ICONS[i] ?? Crosshair;
                      return (
                        <motion.div
                          key={f.title}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.14 + i * 0.07, duration: 0.4 }}
                        >
                          <GlowCard
                            padding="sm"
                            borderRadius={20}
                            glowIntensity={1.4}
                          >
                            <div className="flex gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/25">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-text">
                                  {f.title}
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                                  {f.body}
                                </p>
                              </div>
                            </div>
                          </GlowCard>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="lg:mt-2"
                >
                  <GlowCard padding="lg" borderRadius={28} glowIntensity={2.0}>
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
                          {t.form.ideaLabel}
                        </p>
                        <p className="mt-0.5 text-sm text-text-secondary">
                          {t.landing.kicker}
                        </p>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent/50 to-fuchsia-500/20 ring-1 ring-accent/30" />
                    </div>
                    <LandingForm
                      providerReady={providerReady}
                      provider={settings}
                      onNeedProvider={() => setSettingsOpen(true)}
                      onSuccess={(next, warnings) => {
                        setAnalysis(next);
                        setReportWarnings(warnings ?? []);
                      }}
                    />
                  </GlowCard>
                </motion.div>

                <p className="text-center text-xs leading-relaxed text-text-muted lg:col-span-2">
                  {t.landing.footerNote}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="report"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.32 }}
              >
                <AnalysisReport
                  analysis={analysis}
                  warnings={reportWarnings}
                  onReset={() => {
                    setAnalysis(null);
                    setReportWarnings([]);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="border-t border-white/[0.05] py-6 text-center text-[11px] text-text-muted">
          <span className="inline-flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-accent/80" />
            {t.brand}
            <span className="text-white/15">·</span>
            {t.tagline}
          </span>
        </footer>
      </div>

      <ProviderSettingsModal
        open={settingsOpen}
        initial={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={setSettings}
      />
    </div>
  );
}
