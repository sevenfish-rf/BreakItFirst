"use client";

/* eslint-disable react-hooks/set-state-in-effect --
   Intentional: the saved-report list is read from localStorage after mount and
   whenever `refreshKey` changes (external store), rendering null until then. */

import {
  listReportHistory,
  removeReportFromHistory,
  reportListLabel,
  type SavedReport,
} from "@/lib/report-storage";
import { useLanguage } from "@/lib/i18n/context";
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
    <div className={"history" + (className ? ` ${className}` : "")}>
      <div className="history-head">
        <span className="label">{t.form.recentReports}</span>
      </div>
      <div className="hlist">
        {items.map((report, i) => {
          const when = new Date(report.savedAt).toLocaleString(
            locale === "id" ? "id-ID" : "en-US",
            { dateStyle: "short", timeStyle: "short" },
          );
          const spof =
            report.analysis.single_point_of_failure?.component?.slice(0, 48) ??
            "";
          return (
            <div
              key={report.id}
              className="hrow"
              role="button"
              tabIndex={0}
              onClick={() => onOpen(report)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen(report);
                }
              }}
            >
              <span className="h-no">{String(i + 1).padStart(2, "0")}</span>
              <span
                className="h-idea"
                title={
                  spof ? `${reportListLabel(report)} · ${spof}` : undefined
                }
              >
                {reportListLabel(report)}
              </span>
              <span className="h-time">{when}</span>
              <button
                type="button"
                className="h-del"
                title={t.form.deleteReport}
                aria-label={t.form.deleteReport}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeReportFromHistory(report.id);
                  setItems(listReportHistory());
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M3 3l6 6M9 3l-6 6" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
