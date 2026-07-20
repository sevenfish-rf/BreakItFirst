"use client";

import { motion } from "framer-motion";
import {
  Activity,
  AlertOctagon,
  Download,
  FileText,
  Gauge,
  GitBranch,
  ListChecks,
  RotateCcw,
  Shield,
  Target,
  Scale,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/glow-card";
import { FailureCascadeGraph } from "@/components/visuals/failure-cascade-graph";
import { FailureModeCards } from "@/components/visuals/failure-mode-cards";
import { ResilienceRadar } from "@/components/visuals/resilience-radar";
import { StressTestPanel } from "@/components/visuals/stress-test-panel";
import { useLanguage } from "@/lib/i18n/context";
import { downloadAnalysisMarkdown } from "@/lib/report-markdown";
import { toUserFacingWarnings } from "@/lib/user-warnings";
import type { FailureAnalysis, VelocityBand } from "@/types/analysis";
import { cn } from "@/lib/utils";

type AnalysisReportProps = {
  analysis: FailureAnalysis;
  warnings?: string[];
  onReset: () => void;
};

function bandColor(band: string): string {
  switch (band) {
    case "Very Low":
    case "Low":
    case "Slow":
    case "No":
      return "text-healthy border-healthy/30 bg-healthy/10";
    case "Medium":
    case "Maybe":
      return "text-warning border-warning/30 bg-warning/10";
    case "High":
    case "Very High":
    case "Fast":
    case "Yes":
      return "text-accent border-accent/30 bg-accent/10";
    default:
      return "text-text-secondary border-border bg-surface";
  }
}

function velocityLabel(band: VelocityBand, locale: string): string {
  if (locale === "id") {
    if (band === "Fast") return "Cepat";
    if (band === "Slow") return "Lambat";
    return "Sedang";
  }
  return band;
}

function Panel({
  icon,
  title,
  hint,
  children,
  delay = 0,
  glowIntensity = 1.5,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
  delay?: number;
  glowIntensity?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <GlowCard padding="md" borderRadius={24} glowIntensity={glowIntensity}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/25 shadow-[0_0_20px_-6px_rgba(255,107,107,0.5)]">
              {icon}
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-text">
                {title}
              </h2>
              {hint && (
                <p className="mt-0.5 text-[11px] text-text-muted">{hint}</p>
              )}
            </div>
          </div>
        </div>
        {children}
      </GlowCard>
    </motion.div>
  );
}

export function AnalysisReport({
  analysis,
  warnings = [],
  onReset,
}: AnalysisReportProps) {
  const { t, locale } = useLanguage();
  const spof = analysis.single_point_of_failure;
  const velocity = analysis.failure_velocity;
  const calibration = analysis.self_consistency;
  const isDeep = Boolean(calibration);
  /** Never surface claim-guard / soft-check jargon to end users */
  const softWarnings = toUserFacingWarnings(warnings, locale);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-10">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-16 z-30"
      >
        <GlowCard padding="sm" borderRadius={20} glowIntensity={1.3}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
                  {t.report.kicker}
                </p>
                {isDeep ? (
                  <span className="rounded-full border border-accent/35 bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                    {t.report.deepBadge}
                  </span>
                ) : null}
              </div>
              <h1 className="text-lg font-semibold tracking-tight text-text sm:text-xl">
                {t.report.title}
              </h1>
              <p className="mt-0.5 text-xs text-text-secondary">
                {analysis.meta.category} · {t.report.generated}{" "}
                {new Date(analysis.meta.generated_at).toLocaleString(
                  locale === "id" ? "id-ID" : "en-US",
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  downloadAnalysisMarkdown(analysis, {
                    locale,
                    warnings: softWarnings,
                  })
                }
              >
                <Download className="h-4 w-4" />
                {t.report.exportMarkdown}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onReset}
              >
                <RotateCcw className="h-4 w-4" />
                {t.report.newAnalysis}
              </Button>
            </div>
          </div>
        </GlowCard>
      </motion.div>

      {softWarnings.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3"
        >
          <p className="text-xs font-semibold text-warning">{t.report.warnings}</p>
          <ul className="mt-1.5 list-inside list-disc space-y-1 text-[11px] leading-relaxed text-text-secondary">
            {softWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </motion.div>
      ) : null}

      {/* Analysis base: validated user input that fed the pipeline */}
      <Panel
        icon={<FileText className="h-4 w-4" />}
        title={t.report.analysisBase}
        hint={t.report.analysisBaseHint}
        delay={0.02}
        glowIntensity={1.2}
      >
        <div className="rounded-xl border border-border/60 bg-background/50 px-3.5 py-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
            {analysis.meta.idea_input}
          </p>
        </div>
        <p className="mt-2 text-[10px] text-text-muted">
          {analysis.meta.category}
          {" · "}
          {analysis.meta.idea_input.trim().split(/\s+/).filter(Boolean).length}{" "}
          words
        </p>
      </Panel>

      {/* System reading = model summary (refined restatement) */}
      <Panel
        icon={<Sparkles className="h-4 w-4" />}
        title={t.report.systemReading}
        hint={t.report.systemReadingHint}
        delay={0.03}
      >
        <p className="text-sm leading-relaxed text-text-secondary">
          {analysis.summary}
        </p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          icon={<AlertOctagon className="h-4 w-4" />}
          title={t.report.spof}
          delay={0.04}
          glowIntensity={2.1}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
              {spof.component}
            </span>
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                bandColor(spof.confidence),
              )}
            >
              {t.report.confidence}: {spof.confidence}
            </span>
          </div>
          <p className="mt-2 text-xs text-text-muted">{spof.confidence_reason}</p>
          <p className="mt-4 text-sm leading-relaxed text-text-secondary">
            {spof.explanation}
          </p>
          {spof.critical_assumption_indices &&
          spof.critical_assumption_indices.length > 0 ? (
            <div className="mt-4 rounded-xl border border-border/70 bg-background/40 px-3 py-2.5">
              <p className="text-[11px] font-semibold text-text">
                {t.report.criticalAssumptions}
              </p>
              <ul className="mt-2 space-y-1.5">
                {spof.critical_assumption_indices.map((idx) => {
                  const text = analysis.assumptions[idx];
                  if (!text) return null;
                  return (
                    <li
                      key={idx}
                      className="flex gap-2 text-xs leading-relaxed text-text-secondary"
                    >
                      <span className="shrink-0 font-semibold tabular-nums text-accent">
                        #{idx + 1}
                      </span>
                      <span className="min-w-0">{text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {calibration ? (
            <div className="mt-5 rounded-xl border border-border/70 bg-background/50 px-3 py-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-text">
                <Scale className="h-3.5 w-3.5 text-accent" />
                {t.report.calibration}
              </div>
              <p className="mb-2 text-[11px] text-text-muted">
                {t.report.calibrationHint}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                    bandColor(calibration.spof_agreement),
                  )}
                >
                  {calibration.spof_agreement}
                </span>
                <span className="text-[11px] text-text-muted">
                  {t.report.calibrationRuns}: {calibration.runs}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                {calibration.reason}
              </p>
              {calibration.candidate_spofs.length > 0 ? (
                <div className="mt-2">
                  <p className="text-[10px] uppercase tracking-wide text-text-muted">
                    {t.report.candidates}
                  </p>
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {calibration.candidate_spofs.map((c) => (
                      <li
                        key={c}
                        className="rounded-md border border-border/60 bg-surface/80 px-2 py-0.5 text-[11px] text-text-secondary"
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Panel
            icon={<Activity className="h-4 w-4" />}
            title={t.report.likelihood}
            hint={t.report.likelihoodHint}
            delay={0.08}
            glowIntensity={1.7}
          >
            <motion.span
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: 0.15,
                type: "spring",
                stiffness: 260,
                damping: 18,
              }}
              className={cn(
                "inline-flex rounded-2xl border px-4 py-2 text-lg font-semibold",
                bandColor(analysis.likelihood.band),
              )}
            >
              {analysis.likelihood.band}
            </motion.span>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              {analysis.likelihood.reason}
            </p>
          </Panel>

          <Panel
            icon={<Gauge className="h-4 w-4" />}
            title={t.report.velocity}
            hint={t.report.velocityHint}
            delay={0.1}
            glowIntensity={1.7}
          >
            <motion.span
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: 0.18,
                type: "spring",
                stiffness: 260,
                damping: 18,
              }}
              className={cn(
                "inline-flex rounded-2xl border px-4 py-2 text-lg font-semibold",
                bandColor(velocity.band),
              )}
            >
              {velocityLabel(velocity.band, locale)}
            </motion.span>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              {velocity.reason}
            </p>
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          icon={<ListChecks className="h-4 w-4" />}
          title={t.report.assumptions}
          delay={0.14}
        >
          <ol className="space-y-0 divide-y divide-border/40">
            {analysis.assumptions.map((item, i) => {
              const isCritical =
                analysis.single_point_of_failure.critical_assumption_indices?.includes(
                  i,
                );
              return (
                <motion.li
                  key={`${i}-${item.slice(0, 24)}`}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.14 + i * 0.03 }}
                  className={cn(
                    "relative flex items-start gap-3 py-3 text-sm leading-relaxed first:pt-0 last:pb-0",
                    isCritical
                      ? "border-l-2 border-l-accent pl-3 text-text"
                      : "pl-[calc(0.75rem+2px)] text-text-secondary",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums",
                      isCritical
                        ? "bg-accent text-background"
                        : "bg-white/[0.04] text-text-muted ring-1 ring-border/80",
                    )}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    {isCritical ? (
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
                        {t.report.linkedToSpof}
                      </p>
                    ) : null}
                    <p className={cn(isCritical ? "text-text" : undefined)}>
                      {item}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </Panel>

        <Panel
          icon={<Activity className="h-4 w-4" />}
          title={t.report.resilience}
          hint={t.report.resilienceHint}
          delay={0.16}
        >
          <ResilienceRadar scores={analysis.resilience_score} />
        </Panel>
      </div>

      <Panel
        icon={<GitBranch className="h-4 w-4" />}
        title={t.report.cascade}
        hint={t.report.cascadeHint}
        delay={0.18}
        glowIntensity={1.8}
      >
        <FailureCascadeGraph
          nodes={analysis.cascade.nodes}
          pointOfNoReturnIndex={analysis.cascade.point_of_no_return_index}
        />
      </Panel>

      <Panel
        icon={<Target className="h-4 w-4" />}
        title={t.report.stressTest}
        hint={t.report.stressTestHint}
        delay={0.2}
        glowIntensity={1.7}
      >
        <StressTestPanel items={analysis.stress_test.items} />
      </Panel>

      <Panel
        icon={<Shield className="h-4 w-4" />}
        title={t.report.failureModes}
        delay={0.22}
      >
        <FailureModeCards modes={analysis.failure_modes} />
      </Panel>
    </div>
  );
}
