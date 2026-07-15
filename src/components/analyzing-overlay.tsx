"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

type AnalyzingOverlayProps = {
  open: boolean;
};

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0
    ? `${m}:${String(r).padStart(2, "0")}`
    : `0:${String(r).padStart(2, "0")}`;
}

/**
 * Seamless full-card analyzing layer (no nested “boxes”).
 * Covers parent completely with solid theme bg + soft ambient only.
 */
export function AnalyzingOverlay({ open }: AnalyzingOverlayProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const stages = t.analyzing.stages;
  const tips = t.analyzing.tips;

  const [elapsedMs, setElapsedMs] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [progress, setProgress] = useState(4);

  useEffect(() => {
    if (!open) return;
    setElapsedMs(0);
    setStageIndex(0);
    setTipIndex(0);
    setProgress(4);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t0 = performance.now();
    const id = window.setInterval(() => {
      setElapsedMs(performance.now() - t0);
    }, 200);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Heuristic UI stages (not server-synced): ingest → pass1 → pass1.5 → pass2 → validate
    const timers = [
      window.setTimeout(() => setStageIndex(1), 900),
      window.setTimeout(() => setStageIndex(2), 18_000),
      window.setTimeout(() => setStageIndex(3), 50_000),
      window.setTimeout(() => setStageIndex(4), 75_000),
    ];
    return () => timers.forEach((x) => window.clearTimeout(x));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      setProgress((p) => {
        const caps = [18, 38, 62, 82, 92];
        const cap = caps[Math.min(stageIndex, caps.length - 1)] ?? 92;
        return Math.min(cap, p + (cap - p) * 0.04 + 0.15);
      });
    }, 120);
    return () => window.clearInterval(id);
  }, [open, stageIndex]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [open, tips.length]);

  const orbitDots = useMemo(() => [0, 1, 2, 3, 4, 5], []);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col overflow-hidden"
      style={{
        background: theme.backgroundColor,
        borderRadius: "inherit",
      }}
    >
      {/* Soft ambient — no hard boxes */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 55% at 50% -5%, ${theme.accent}28 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 100% 100%, ${theme.colors[2]}18 0%, transparent 45%)
          `,
        }}
      />

      <motion.div
        className="pointer-events-none absolute inset-x-8 h-px opacity-50"
        style={{
          background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
          boxShadow: `0 0 16px ${theme.accent}`,
        }}
        animate={{ top: ["8%", "92%"] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-6 py-10 sm:px-10">
        {/* Loader */}
        <div className="relative h-24 w-24">
          <motion.div
            className="absolute inset-0 rounded-full border border-white/[0.08]"
            style={{ boxShadow: `inset 0 0 28px ${theme.accent}18` }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: theme.accent,
              borderRightColor: `${theme.accent}44`,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.35, repeat: Infinity, ease: "linear" }}
          />
          {orbitDots.map((d) => (
            <motion.span
              key={d}
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ background: theme.colors[d % 3] }}
              animate={{
                x: [
                  Math.cos((d / 6) * Math.PI * 2) * 40,
                  Math.cos((d / 6) * Math.PI * 2 + Math.PI * 2) * 40,
                ],
                y: [
                  Math.sin((d / 6) * Math.PI * 2) * 40,
                  Math.sin((d / 6) * Math.PI * 2 + Math.PI * 2) * 40,
                ],
                opacity: [0.35, 1, 0.35],
              }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: "linear",
                delay: d * 0.08,
              }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="h-5 w-5" style={{ color: theme.accent }} />
          </div>
        </div>

        <div className="w-full max-w-[20rem] text-center">
          <h3 className="text-[15px] font-semibold tracking-tight text-text">
            {t.analyzing.title}
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
            {t.analyzing.subtitle}
          </p>
          <p className="mt-2.5 font-mono text-[11px] tabular-nums text-text-muted">
            {t.analyzing.elapsed} {formatElapsed(elapsedMs)}
          </p>
        </div>

        {/* Progress — line only, no box */}
        <div className="w-full max-w-[20rem]">
          <div className="mb-1.5 flex justify-between text-[10px] uppercase tracking-wider text-text-muted">
            <span>{stages[stageIndex]?.label}</span>
            <span className="tabular-nums">{Math.round(progress)}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${theme.colors[0]}, ${theme.colors[1]}, ${theme.colors[2]})`,
                boxShadow: `0 0 10px ${theme.accent}77`,
              }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Stages — clean list, no nested cards */}
        <ul className="w-full max-w-[20rem] space-y-0">
          {stages.map((stage, i) => {
            const done = i < stageIndex;
            const active = i === stageIndex;
            return (
              <li
                key={stage.id}
                className={cn(
                  "flex items-center gap-3 py-2.5",
                  i < stages.length - 1 && "border-b border-white/[0.05]",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                    done && "bg-healthy/15 text-healthy",
                    active && "bg-accent/15 text-accent",
                    !done && !active && "bg-white/[0.04] text-text-muted",
                  )}
                >
                  {done ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : active ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <p
                    className={cn(
                      "text-xs font-medium",
                      active ? "text-text" : done ? "text-text-secondary" : "text-text-muted",
                    )}
                  >
                    {stage.label}
                  </p>
                  {(active || done) && (
                    <p className="text-[11px] text-text-muted">{stage.hint}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Tip — no card chrome, just divider + text */}
        <div className="w-full max-w-[20rem] pt-1 text-left">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Tip
          </p>
          <AnimatePresence mode="wait">
            <motion.p
              key={tipIndex}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22 }}
              className="min-h-[2.5rem] text-xs leading-relaxed text-text-secondary"
            >
              {tips[tipIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
