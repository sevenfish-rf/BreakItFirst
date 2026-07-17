"use client";

import { motion } from "framer-motion";
import {
  Building2,
  Gavel,
  Lock,
  Server,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import type { FailureAnalysis } from "@/types/analysis";
import { cn } from "@/lib/utils";

type FailureModeCardsProps = {
  modes: FailureAnalysis["failure_modes"];
};

type ModeBucket = Exclude<
  keyof FailureAnalysis["failure_modes"],
  "compounding_note"
>;

const MODE_META: {
  key: ModeBucket;
  icon: LucideIcon;
  badge: string;
  bar: string;
}[] = [
  {
    key: "technical",
    icon: Wrench,
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    bar: "bg-sky-400/80",
  },
  {
    key: "business",
    icon: Building2,
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    bar: "bg-violet-400/80",
  },
  {
    key: "security",
    icon: Lock,
    badge: "border-accent/30 bg-accent/10 text-accent",
    bar: "bg-accent/80",
  },
  {
    key: "legal",
    icon: Gavel,
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    bar: "bg-amber-400/80",
  },
  {
    key: "operations",
    icon: Server,
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    bar: "bg-emerald-400/80",
  },
];

export function FailureModeCards({ modes }: FailureModeCardsProps) {
  const { t } = useLanguage();
  const labels = t.modes;
  const compounding = modes.compounding_note?.trim();

  // Symmetric grid: fixed min height, equal cards, internal scroll if long
  return (
    <div className="space-y-3">
      {compounding ? (
        <p className="rounded-xl border border-accent/25 bg-accent/10 px-3 py-2.5 text-xs leading-relaxed text-text-secondary">
          <span className="font-semibold text-accent">
            {t.report.compoundingNote}:{" "}
          </span>
          {compounding}
        </p>
      ) : null}

      {/* Full-width section: 2 cols tablet, 3 desktop — not squeezed beside stress test */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:auto-rows-fr">
        {MODE_META.map((mode, index) => {
          const items = modes[mode.key] ?? [];
          const Icon = mode.icon;
          const label = labels[mode.key];
          const empty = items.length === 0;

          return (
            <motion.div
              key={mode.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.04 * index }}
              className="min-h-[220px] h-full"
            >
              <div
                className={cn(
                  "flex h-full min-h-[220px] flex-col overflow-hidden rounded-2xl border bg-surface/80",
                  empty
                    ? "border-dashed border-border/60 bg-background/30"
                    : "border-border/70",
                )}
              >
                {/* Header — fixed height for row alignment */}
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/40 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                        mode.badge,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <h3 className="truncate text-[12px] font-semibold text-text">
                      {label}
                    </h3>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                      empty
                        ? "bg-white/[0.03] text-text-muted"
                        : "bg-white/[0.06] text-text-secondary",
                    )}
                  >
                    {items.length}
                  </span>
                </div>

                {/* Body — equal grow, scroll if needed */}
                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5 no-scrollbar">
                  {empty ? (
                    <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-1.5 text-center">
                      <span className="text-[20px] leading-none text-text-muted/30">
                        —
                      </span>
                      <p className="max-w-[12rem] text-[10px] leading-snug text-text-muted">
                        {t.report.emptyDomain}
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2.5">
                      {items.map((item, i) => (
                        <li
                          key={`${mode.key}-${i}`}
                          className="flex gap-2 text-[11px] leading-relaxed text-text-secondary"
                        >
                          <span
                            className={cn(
                              "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                              mode.bar,
                            )}
                          />
                          <span className="min-w-0 break-words">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
