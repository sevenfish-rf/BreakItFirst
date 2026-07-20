import type { FailureAnalysis } from "@/types/analysis";

export const REPORT_STORAGE_KEY = "breakitfirst.report.v1";
export const REPORT_HISTORY_KEY = "breakitfirst.reportHistory.v1";

/** Soft size guard — browser localStorage is typically ~5MB */
const MAX_JSON_CHARS = 4_500_000;
export const MAX_REPORT_HISTORY = 10;
const REPORT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type SavedReport = {
  /** Stable id for history list (client-generated) */
  id: string;
  analysis: FailureAnalysis;
  warnings: string[];
  /** When the client saved this snapshot */
  savedAt: string;
};

function newReportId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function isFailureAnalysis(value: unknown): value is FailureAnalysis {
  if (!value || typeof value !== "object") return false;
  const a = value as Partial<FailureAnalysis>;
  return (
    Boolean(a.meta) &&
    typeof a.summary === "string" &&
    Array.isArray(a.assumptions) &&
    Boolean(a.single_point_of_failure) &&
    Boolean(a.cascade) &&
    Boolean(a.failure_modes) &&
    Boolean(a.resilience_score)
  );
}

function parseSavedReport(parsed: Partial<SavedReport>): SavedReport | null {
  if (!isFailureAnalysis(parsed.analysis)) return null;
  const savedAt =
    typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString();
  const ts = Date.parse(savedAt);
  if (!Number.isNaN(ts) && Date.now() - ts > REPORT_TTL_MS) return null;
  return {
    id:
      typeof parsed.id === "string" && parsed.id.length >= 4
        ? parsed.id
        : newReportId(),
    analysis: parsed.analysis,
    warnings: Array.isArray(parsed.warnings)
      ? parsed.warnings.filter((w): w is string => typeof w === "string")
      : [],
    savedAt,
  };
}

/** Load last saved report (client only). */
export function loadSavedReport(): SavedReport | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(REPORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedReport>;
    const report = parseSavedReport(parsed);
    if (!report) {
      clearSavedReport();
      return null;
    }
    return report;
  } catch {
    return null;
  }
}

/** List recent reports (newest first), max MAX_REPORT_HISTORY. */
export function listReportHistory(): SavedReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REPORT_HISTORY_KEY);
    if (!raw) {
      // Migrate: single latest → history of 1
      const latest = loadSavedReport();
      return latest ? [latest] : [];
    }
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    const out: SavedReport[] = [];
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const r = parseSavedReport(item as Partial<SavedReport>);
      if (r) out.push(r);
    }
    out.sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
    return out.slice(0, MAX_REPORT_HISTORY);
  } catch {
    return [];
  }
}

export function loadReportFromHistory(id: string): SavedReport | null {
  const list = listReportHistory();
  return list.find((r) => r.id === id) ?? null;
}

function writeHistory(list: SavedReport[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = list.slice(0, MAX_REPORT_HISTORY);
    const json = JSON.stringify(trimmed);
    if (json.length > MAX_JSON_CHARS) {
      // Drop oldest until it fits
      while (trimmed.length > 1) {
        trimmed.pop();
        const j = JSON.stringify(trimmed);
        if (j.length <= MAX_JSON_CHARS) {
          window.localStorage.setItem(REPORT_HISTORY_KEY, j);
          return;
        }
      }
      console.warn("[report-storage] history too large, skip");
      return;
    }
    window.localStorage.setItem(REPORT_HISTORY_KEY, json);
  } catch (err) {
    console.warn("[report-storage] history save failed", err);
  }
}

/** Persist report as current + prepend to history. */
export function saveReport(
  analysis: FailureAnalysis,
  warnings: string[] = [],
): SavedReport | null {
  if (typeof window === "undefined") return null;
  try {
    const payload: SavedReport = {
      id: newReportId(),
      analysis,
      warnings,
      savedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(payload);
    if (json.length > MAX_JSON_CHARS) {
      console.warn(
        "[report-storage] report too large for localStorage, skip save",
        json.length,
      );
      return null;
    }
    window.localStorage.setItem(REPORT_STORAGE_KEY, json);

    const history = listReportHistory().filter((r) => {
      // de-dupe by idea + generated_at if same analysis re-saved
      const sameTime =
        r.analysis.meta.generated_at === analysis.meta.generated_at;
      const sameIdea = r.analysis.meta.idea_input === analysis.meta.idea_input;
      return !(sameTime && sameIdea);
    });
    history.unshift(payload);
    writeHistory(history);
    return payload;
  } catch (err) {
    console.warn("[report-storage] save failed", err);
    return null;
  }
}

export function clearSavedReport(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(REPORT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Clear current + full history. */
export function clearReportHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(REPORT_STORAGE_KEY);
    window.localStorage.removeItem(REPORT_HISTORY_KEY);
  } catch {
    /* ignore */
  }
}

export function removeReportFromHistory(id: string): void {
  const next = listReportHistory().filter((r) => r.id !== id);
  writeHistory(next);
  const current = loadSavedReport();
  if (current?.id === id) {
    if (next[0]) {
      try {
        window.localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(next[0]));
      } catch {
        clearSavedReport();
      }
    } else {
      clearSavedReport();
    }
  }
}

export function hasSavedReport(): boolean {
  return Boolean(loadSavedReport());
}

/** Short label for history list UI */
export function reportListLabel(report: SavedReport, maxLen = 72): string {
  const idea = report.analysis.meta.idea_input.replace(/\s+/g, " ").trim();
  const cat = report.analysis.meta.category;
  const base = idea.length > maxLen ? `${idea.slice(0, maxLen - 1)}…` : idea;
  return `${cat} · ${base}`;
}
