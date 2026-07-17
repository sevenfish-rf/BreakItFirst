import { CATEGORIES, type Category } from "@/lib/categories";
import { MAX_IDEA_LENGTH } from "@/lib/input-validation";

export const DRAFT_STORAGE_KEY = "breakitfirst.draft.v1";
export const ACTIVE_JOB_STORAGE_KEY = "breakitfirst.activeJob.v1";

export type FormDraft = {
  idea: string;
  category: Category;
  deepAnalysis: boolean;
  /** ISO timestamp of last save */
  updatedAt: string;
  /** Optional template chip label if last load was a chip */
  activeChip?: string | null;
};

export type ActiveJobRecord = {
  jobId: string;
  startedAt: string;
  idea: string;
  category: Category;
  deepAnalysis: boolean;
};

function isCategory(value: unknown): value is Category {
  return (
    typeof value === "string" &&
    (CATEGORIES as readonly string[]).includes(value)
  );
}

/** Load draft from localStorage (client only). Returns null if missing/invalid. */
export function loadFormDraft(): FormDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FormDraft>;
    const idea =
      typeof parsed.idea === "string" ? parsed.idea.slice(0, MAX_IDEA_LENGTH) : "";
    if (!idea.trim() && !parsed.deepAnalysis) {
      if (!isCategory(parsed.category) || parsed.category === "Startup") {
        return null;
      }
    }
    return {
      idea,
      category: isCategory(parsed.category) ? parsed.category : "Startup",
      deepAnalysis: Boolean(parsed.deepAnalysis),
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
      activeChip:
        typeof parsed.activeChip === "string" ? parsed.activeChip : null,
    };
  } catch {
    return null;
  }
}

/** Persist form draft (debounced by caller). */
export function saveFormDraft(draft: {
  idea: string;
  category: Category;
  deepAnalysis: boolean;
  activeChip?: string | null;
}): void {
  if (typeof window === "undefined") return;
  try {
    const idea = draft.idea.slice(0, MAX_IDEA_LENGTH);
    if (!idea.trim() && !draft.deepAnalysis && draft.category === "Startup") {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      return;
    }
    const payload: FormDraft = {
      idea,
      category: draft.category,
      deepAnalysis: draft.deepAnalysis,
      updatedAt: new Date().toISOString(),
      activeChip: draft.activeChip ?? null,
    };
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearFormDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function parseActiveJobRaw(raw: string | null): ActiveJobRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ActiveJobRecord>;
    if (typeof parsed.jobId !== "string" || parsed.jobId.length < 8) {
      return null;
    }
    // Stale after 40 minutes
    const started = parsed.startedAt
      ? Date.parse(parsed.startedAt)
      : Number.NaN;
    if (!Number.isNaN(started) && Date.now() - started > 40 * 60 * 1000) {
      return null;
    }
    return {
      jobId: parsed.jobId,
      startedAt:
        typeof parsed.startedAt === "string"
          ? parsed.startedAt
          : new Date().toISOString(),
      idea: typeof parsed.idea === "string" ? parsed.idea : "",
      category: isCategory(parsed.category) ? parsed.category : "Startup",
      deepAnalysis: Boolean(parsed.deepAnalysis),
    };
  } catch {
    return null;
  }
}

/**
 * Persist running job so refresh reopens the analyzer overlay.
 * Written to both localStorage + sessionStorage (belt & suspenders).
 */
export function saveActiveJob(record: ActiveJobRecord): void {
  if (typeof window === "undefined") return;
  const json = JSON.stringify(record);
  try {
    window.localStorage.setItem(ACTIVE_JOB_STORAGE_KEY, json);
  } catch {
    /* ignore */
  }
  try {
    window.sessionStorage.setItem(ACTIVE_JOB_STORAGE_KEY, json);
  } catch {
    /* ignore */
  }
}

export function loadActiveJob(): ActiveJobRecord | null {
  if (typeof window === "undefined") return null;
  // Prefer session (this tab), fall back to local
  let record: ActiveJobRecord | null = null;
  try {
    record = parseActiveJobRaw(
      window.sessionStorage.getItem(ACTIVE_JOB_STORAGE_KEY),
    );
  } catch {
    /* ignore */
  }
  if (!record) {
    try {
      record = parseActiveJobRaw(
        window.localStorage.getItem(ACTIVE_JOB_STORAGE_KEY),
      );
    } catch {
      /* ignore */
    }
  }
  if (!record) {
    // Clean stale keys if parse rejected as expired
    clearActiveJob();
    return null;
  }
  return record;
}

export function clearActiveJob(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  try {
    window.sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Sync check for first paint / layout effect. */
export function hasActiveJob(): boolean {
  return Boolean(loadActiveJob()?.jobId);
}
