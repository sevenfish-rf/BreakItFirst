import type { FailureAnalysis } from "@/types/analysis";

export const REPORT_STORAGE_KEY = "breakitfirst.report.v1";

/** Soft size guard — browser localStorage is typically ~5MB */
const MAX_JSON_CHARS = 4_500_000;

export type SavedReport = {
  analysis: FailureAnalysis;
  warnings: string[];
  /** When the client saved this snapshot */
  savedAt: string;
};

function isFailureAnalysis(value: unknown): value is FailureAnalysis {
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

/** Load last saved report (client only). */
export function loadSavedReport(): SavedReport | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(REPORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedReport>;
    if (!isFailureAnalysis(parsed.analysis)) {
      clearSavedReport();
      return null;
    }
    // Optional age limit: 30 days
    const savedAt =
      typeof parsed.savedAt === "string" ? Date.parse(parsed.savedAt) : NaN;
    if (!Number.isNaN(savedAt) && Date.now() - savedAt > 30 * 24 * 60 * 60 * 1000) {
      clearSavedReport();
      return null;
    }
    return {
      analysis: parsed.analysis,
      warnings: Array.isArray(parsed.warnings)
        ? parsed.warnings.filter((w): w is string => typeof w === "string")
        : [],
      savedAt:
        typeof parsed.savedAt === "string"
          ? parsed.savedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Persist report so refresh can reopen it. */
export function saveReport(
  analysis: FailureAnalysis,
  warnings: string[] = [],
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: SavedReport = {
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
      return;
    }
    window.localStorage.setItem(REPORT_STORAGE_KEY, json);
  } catch (err) {
    console.warn("[report-storage] save failed", err);
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

export function hasSavedReport(): boolean {
  return Boolean(loadSavedReport());
}
