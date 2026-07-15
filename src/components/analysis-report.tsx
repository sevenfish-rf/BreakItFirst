"use client";

import { motion } from "framer-motion";
import {
  Activity,
  AlertOctagon,
  GitBranch,
  Layers,
  ListChecks,
  RotateCcw,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/glow-card";
import { FailureCascadeGraph } from "@/components/visuals/failure-cascade-graph";
import { FailureModeCards } from "@/components/visuals/failure-mode-cards";
import { ResilienceRadar } from "@/components/visuals/resilience-radar";
import { useLanguage } from "@/lib/i18n/context";
import type { FailureAnalysis } from "@/types/analysis";
import { cn } from "@/lib/utils";

type AnalysisReportProps = {
  analysis: FailureAnalysis;
  onReset: () => void;
};

function bandColor(band: string): string {
  switch (band) {
    case "Very Low":
    case "Low":
      return "text-healthy border-healthy/30 bg-healthy/10";
    case "Medium":
      return "text-warning border-warning/30 bg-warning/10";
    case "High":
    case "Very High":
      return "text-accent border-accent/30 bg-accent/10";
    default:
      return "text-text-secondary border-border bg-surface";
  }
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

export function AnalysisReport({ analysis, onReset }: AnalysisReportProps) {
  const { t, locale } = useLanguage();
  const spof = analysis.single_point_of_failure;

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
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
                {t.report.kicker}
              </p>
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
        </GlowCard>
      </motion.div>

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
        </Panel>

        <Panel
          icon={<Activity className="h-4 w-4" />}
          title={t.report.likelihood}
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
      </div>

      <Panel
        icon={<Layers className="h-4 w-4" />}
        title={t.report.summary}
        delay={0.1}
      >
        <p className="text-sm leading-relaxed text-text-secondary">
          {analysis.summary}
        </p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          icon={<ListChecks className="h-4 w-4" />}
          title={t.report.assumptions}
          delay={0.12}
        >
          <ol className="space-y-3">
            {analysis.assumptions.map((item, i) => (
              <motion.li
                key={`${i}-${item.slice(0, 24)}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.14 + i * 0.03 }}
                className="flex items-start gap-3 text-sm leading-relaxed text-text-secondary"
              >
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-semibold tabular-nums text-accent ring-1 ring-accent/20"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span className="min-w-0 pt-0.5">{item}</span>
              </motion.li>
            ))}
          </ol>
        </Panel>

        <Panel
          icon={<Activity className="h-4 w-4" />}
          title={t.report.resilience}
          hint={t.report.resilienceHint}
          delay={0.14}
        >
          <ResilienceRadar scores={analysis.resilience_score} />
        </Panel>
      </div>

      <Panel
        icon={<GitBranch className="h-4 w-4" />}
        title={t.report.cascade}
        hint={t.report.cascadeHint}
        delay={0.16}
        glowIntensity={1.8}
      >
        <FailureCascadeGraph nodes={analysis.cascade.nodes} />
      </Panel>

      <Panel
        icon={<Shield className="h-4 w-4" />}
        title={t.report.failureModes}
        delay={0.18}
      >
        <FailureModeCards modes={analysis.failure_modes} />
      </Panel>
    </div>
  );
}
