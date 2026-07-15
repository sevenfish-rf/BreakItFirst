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
import { GlowCard } from "@/components/ui/glow-card";
import { useLanguage } from "@/lib/i18n/context";
import type { FailureAnalysis } from "@/types/analysis";
import { cn } from "@/lib/utils";

type FailureModeCardsProps = {
  modes: FailureAnalysis["failure_modes"];
};

const MODE_META: {
  key: keyof FailureAnalysis["failure_modes"];
  icon: LucideIcon;
  badge: string;
}[] = [
  {
    key: "technical",
    icon: Wrench,
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  },
  {
    key: "business",
    icon: Building2,
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  },
  {
    key: "security",
    icon: Lock,
    badge: "border-accent/30 bg-accent/10 text-accent",
  },
  {
    key: "legal",
    icon: Gavel,
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  {
    key: "operations",
    icon: Server,
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
];

export function FailureModeCards({ modes }: FailureModeCardsProps) {
  const { t } = useLanguage();
  const labels = t.modes;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {MODE_META.map((mode, index) => {
        const items = modes[mode.key] ?? [];
        const Icon = mode.icon;
        const label = labels[mode.key];

        return (
          <motion.div
            key={mode.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.04 * index }}
          >
            <GlowCard
              padding="sm"
              borderRadius={18}
              glowIntensity={1.35}
              contentClassName="no-scrollbar"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-xl border",
                      mode.badge,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-semibold text-text">{label}</h3>
                </div>
                <span className="tabular-nums text-[11px] text-text-muted">
                  {items.length}
                </span>
              </div>

              {items.length === 0 ? (
                <p className="text-xs text-text-muted">—</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((item, i) => (
                    <li
                      key={`${mode.key}-${i}`}
                      className="flex gap-2 text-xs leading-relaxed text-text-secondary"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent/80" />
                      <span className="min-w-0 break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </GlowCard>
          </motion.div>
        );
      })}
    </div>
  );
}
