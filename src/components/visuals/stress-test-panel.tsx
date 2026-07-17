"use client";

import { motion } from "framer-motion";
import { FAILURE_ARCHETYPES } from "@/lib/archetypes";
import { useLanguage } from "@/lib/i18n/context";
import type { StressTestItem, StressVerdict } from "@/types/analysis";
import { cn } from "@/lib/utils";

const ARCHETYPE_NAME = Object.fromEntries(
  FAILURE_ARCHETYPES.map((a) => [a.id, a.name]),
) as Record<string, string>;

function verdictStyle(v: StressVerdict): string {
  switch (v) {
    case "Yes":
      return "border-accent/40 bg-accent/15 text-accent";
    case "Maybe":
      return "border-warning/40 bg-warning/12 text-warning";
    case "No":
      return "border-healthy/35 bg-healthy/10 text-healthy";
    default:
      return "border-border bg-surface text-text-secondary";
  }
}

function verdictLabel(
  v: StressVerdict,
  labels: { yes: string; maybe: string; no: string },
): string {
  if (v === "Yes") return labels.yes;
  if (v === "Maybe") return labels.maybe;
  return labels.no;
}

type StressTestPanelProps = {
  items: StressTestItem[];
};

export function StressTestPanel({ items }: StressTestPanelProps) {
  const { t } = useLanguage();

  // Prefer library order; append unknown ids at end
  const knownOrder = FAILURE_ARCHETYPES.map((a) => a.id);
  const sorted = [...items].sort((a, b) => {
    const ia = knownOrder.indexOf(a.archetype_id as (typeof knownOrder)[number]);
    const ib = knownOrder.indexOf(b.archetype_id as (typeof knownOrder)[number]);
    const sa = ia === -1 ? 999 : ia;
    const sb = ib === -1 ? 999 : ib;
    return sa - sb;
  });

  if (sorted.length === 0) {
    return <p className="text-sm text-text-muted">—</p>;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {sorted.map((item, i) => {
        const name =
          ARCHETYPE_NAME[item.archetype_id] ??
          item.archetype_id.replace(/_/g, " ");
        return (
          <motion.li
            key={`${item.archetype_id}-${i}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 + i * 0.03 }}
            className="flex h-full flex-col rounded-xl border border-border/70 bg-background/40 px-3.5 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-text">{name}</span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  verdictStyle(item.verdict),
                )}
              >
                {verdictLabel(item.verdict, t.report.stressVerdict)}
              </span>
            </div>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-text-secondary">
              {item.reason}
            </p>
          </motion.li>
        );
      })}
    </ul>
  );
}
