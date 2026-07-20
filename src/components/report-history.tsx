"use client";

import { History, Trash2 } from "lucide-react";
import {
  listReportHistory,
  removeReportFromHistory,
  reportListLabel,
  type SavedReport,
} from "@/lib/report-storage";
import { useLanguage } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type ReportHistoryProps = {
  /** Bump to refresh list after a new save */
  refreshKey?: number;
  onOpen: (report: SavedReport) => void;
  className?: string;
};

export function ReportHistory({
  refreshKey = 0,
  onOpen,
  className,
}: ReportHistoryProps) {
  const { locale, t } = useLanguage();
  const [items, setItems] = useState<SavedReport[]>([]);

  useEffect(() => {
    setItems(listReportHistory());
  }, [refreshKey]);

  if (items.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
        <History className="h-3.5 w-3.5" />
        {t.form.recentReports}
      </div>
      <ul className="max-h-[9rem] space-y-1 overflow-y-auto rounded-xl border border-border/60 bg-background/30 p-1.5">
        {items.map((report) => {
          const when = new Date(report.savedAt).toLocaleString(
            locale === "id" ? "id-ID" : "en-US",
            { dateStyle: "short", timeStyle: "short" },
          );
          const spof =
            report.analysis.single_point_of_failure?.component?.slice(0, 48) ??
            "";
          return (
            <li key={report.id} className="group flex items-stretch gap-1">
              <button
                type="button"
                onClick={() => onOpen(report)}
                className="min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent/10"
              >
                <p className="truncate text-xs font-medium text-text">
                  {reportListLabel(report)}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-text-muted">
                  {when}
                  {spof ? ` · ${spof}` : ""}
                </p>
              </button>
              <button
                type="button"
                title={t.form.deleteReport}
                onClick={(e) => {
                  e.preventDefault();
                  removeReportFromHistory(report.id);
                  setItems(listReportHistory());
                }}
                className="shrink-0 rounded-lg px-2 text-text-muted opacity-60 transition-opacity hover:bg-accent/15 hover:text-accent hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
