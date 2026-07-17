/**
 * Analysis jobs that survive browser refresh AND Next.js HMR.
 *
 * - In-memory Map on globalThis (not module scope) so Turbopack reloads
 *   don't drop running jobs mid-pipeline.
 * - Disk snapshots under .breakitfirst-jobs/ for terminal results after
 *   full process restart (running pipelines cannot resume after kill).
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import type { PipelineLiveStage } from "@/lib/pipeline-stages";
import type { FailureAnalysis } from "@/types/analysis";

export type AnalyzeJobEvent =
  | {
      type: "stage";
      stage: PipelineLiveStage;
      detail?: string;
      at: number;
    }
  | {
      type: "ping";
      at: number;
    }
  | {
      type: "result";
      ok: true;
      analysis: FailureAnalysis;
      warnings: string[];
      meta?: unknown;
    }
  | {
      type: "result";
      ok: false;
      message: string;
      code?: string;
      stage?: string;
    };

export type AnalyzeJobStatus = "running" | "done" | "error" | "cancelled";

export type AnalyzeJob = {
  id: string;
  status: AnalyzeJobStatus;
  currentStage: PipelineLiveStage;
  currentDetail?: string;
  events: AnalyzeJobEvent[];
  resultEvent?: Extract<AnalyzeJobEvent, { type: "result" }>;
  createdAt: number;
  updatedAt: number;
  abort: AbortController;
  listeners: Set<(event: AnalyzeJobEvent) => void>;
  /** True if restored from disk without a live pipeline */
  orphaned?: boolean;
};

export type AnalyzeJobSnapshot = {
  jobId: string;
  status: AnalyzeJobStatus;
  stage: PipelineLiveStage;
  detail?: string;
  updatedAt: number;
  createdAt: number;
  result?: Extract<AnalyzeJobEvent, { type: "result" }>;
};

type PersistedJob = {
  id: string;
  status: AnalyzeJobStatus;
  currentStage: PipelineLiveStage;
  currentDetail?: string;
  events: AnalyzeJobEvent[];
  resultEvent?: Extract<AnalyzeJobEvent, { type: "result" }>;
  createdAt: number;
  updatedAt: number;
};

const JOB_TTL_MS = 45 * 60 * 1000;

type GlobalJobs = {
  __breakitfirst_jobs?: Map<string, AnalyzeJob>;
};

function jobStore(): Map<string, AnalyzeJob> {
  const g = globalThis as unknown as GlobalJobs;
  if (!g.__breakitfirst_jobs) {
    g.__breakitfirst_jobs = new Map();
  }
  return g.__breakitfirst_jobs;
}

function jobsDir(): string {
  return join(process.cwd(), ".breakitfirst-jobs");
}

function jobPath(id: string): string {
  // sanitize id
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return join(jobsDir(), `${safe}.json`);
}

function ensureJobsDir(): void {
  try {
    const dir = jobsDir();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  } catch {
    /* ignore */
  }
}

function persistJob(job: AnalyzeJob): void {
  try {
    ensureJobsDir();
    const payload: PersistedJob = {
      id: job.id,
      status: job.status,
      currentStage: job.currentStage,
      currentDetail: job.currentDetail,
      // keep last stages + result only (smaller file)
      events: job.events.filter((e) => e.type === "stage" || e.type === "result").slice(-40),
      resultEvent: job.resultEvent,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
    writeFileSync(jobPath(job.id), JSON.stringify(payload), "utf8");
  } catch (err) {
    console.warn("[analyze-jobs] persist failed", job.id, err);
  }
}

function loadPersisted(id: string): AnalyzeJob | undefined {
  try {
    const path = jobPath(id);
    if (!existsSync(path)) return undefined;
    const raw = readFileSync(path, "utf8");
    const data = JSON.parse(raw) as PersistedJob;
    if (!data?.id || data.id !== id) return undefined;

    // Stale
    if (Date.now() - (data.updatedAt || 0) > JOB_TTL_MS) {
      try {
        unlinkSync(path);
      } catch {
        /* ignore */
      }
      return undefined;
    }

    // Process died while "running" — pipeline is gone; surface as recoverable error
    let status = data.status;
    let resultEvent = data.resultEvent;
    let currentStage = data.currentStage || "ingest";
    let currentDetail = data.currentDetail;
    let orphaned = false;

    if (status === "running") {
      orphaned = true;
      status = "error";
      currentStage = "validate";
      currentDetail = "Server process restarted";
      resultEvent = {
        type: "result",
        ok: false,
        code: "job_orphaned",
        message:
          "Analysis was interrupted (dev server reload/restart). Your idea is still saved — click Analyze again. This starts a new run.",
      };
      // rewrite disk so we don't keep "running" forever
      try {
        writeFileSync(
          path,
          JSON.stringify({
            ...data,
            status,
            currentStage,
            currentDetail,
            resultEvent,
            updatedAt: Date.now(),
          }),
          "utf8",
        );
      } catch {
        /* ignore */
      }
    }

    const job: AnalyzeJob = {
      id: data.id,
      status,
      currentStage: currentStage as PipelineLiveStage,
      currentDetail,
      events: Array.isArray(data.events) ? data.events : [],
      resultEvent,
      createdAt: data.createdAt || Date.now(),
      updatedAt: data.updatedAt || Date.now(),
      abort: new AbortController(),
      listeners: new Set(),
      orphaned,
    };

    // Already aborted controller for orphans
    if (orphaned) {
      try {
        job.abort.abort();
      } catch {
        /* ignore */
      }
    }

    jobStore().set(job.id, job);
    return job;
  } catch {
    return undefined;
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `j${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function pruneJobs(now = Date.now()): void {
  const store = jobStore();
  for (const [id, job] of store) {
    if (now - job.updatedAt > JOB_TTL_MS) {
      try {
        if (job.status === "running") job.abort.abort();
      } catch {
        /* ignore */
      }
      store.delete(id);
      try {
        const p = jobPath(id);
        if (existsSync(p)) unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
  }

  // prune disk files
  try {
    const dir = jobsDir();
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      try {
        const full = join(dir, name);
        const data = JSON.parse(readFileSync(full, "utf8")) as PersistedJob;
        if (now - (data.updatedAt || 0) > JOB_TTL_MS) unlinkSync(full);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

export function createAnalyzeJob(): AnalyzeJob {
  pruneJobs();
  const job: AnalyzeJob = {
    id: newId(),
    status: "running",
    currentStage: "ingest",
    currentDetail: "Queued",
    events: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    abort: new AbortController(),
    listeners: new Set(),
  };
  jobStore().set(job.id, job);
  persistJob(job);
  console.info("[analyze-jobs] created", job.id, "storeSize=", jobStore().size);
  return job;
}

export function getAnalyzeJob(id: string): AnalyzeJob | undefined {
  pruneJobs();
  const store = jobStore();
  const live = store.get(id);
  if (live) return live;
  // HMR / cold route: rehydrate from disk
  const fromDisk = loadPersisted(id);
  if (fromDisk) {
    console.info(
      "[analyze-jobs] rehydrated",
      id,
      "status=",
      fromDisk.status,
      "orphaned=",
      Boolean(fromDisk.orphaned),
    );
  }
  return fromDisk;
}

export function getJobSnapshot(job: AnalyzeJob): AnalyzeJobSnapshot {
  return {
    jobId: job.id,
    status: job.status,
    stage: job.currentStage,
    detail: job.currentDetail,
    updatedAt: job.updatedAt,
    createdAt: job.createdAt,
    result: job.resultEvent,
  };
}

export function publishJobEvent(job: AnalyzeJob, event: AnalyzeJobEvent): void {
  // Ensure job is registered in the live store (in case of weird module edges)
  if (!jobStore().has(job.id)) {
    jobStore().set(job.id, job);
  }

  if (event.type === "stage") {
    job.currentStage = event.stage;
    job.currentDetail = event.detail;
  }
  if (event.type === "result") {
    job.resultEvent = event;
  }

  job.events.push(event);
  job.updatedAt = Date.now();

  if (job.events.length > 200) {
    job.events = job.events.filter((e, i) => {
      if (e.type === "ping" && i < job.events.length - 20) return false;
      return true;
    });
  }

  // Persist stages/results (not every ping)
  if (event.type === "stage" || event.type === "result") {
    persistJob(job);
  }

  for (const listener of job.listeners) {
    try {
      listener(event);
    } catch {
      /* ignore */
    }
  }
}

export function completeJobSuccess(
  job: AnalyzeJob,
  payload: {
    analysis: FailureAnalysis;
    warnings: string[];
    meta?: unknown;
  },
): void {
  if (job.status !== "running") return;
  job.status = "done";
  job.currentStage = "done";
  job.currentDetail = "Complete";
  publishJobEvent(job, {
    type: "result",
    ok: true,
    analysis: payload.analysis,
    warnings: payload.warnings,
    meta: payload.meta,
  });
}

export function completeJobFailure(
  job: AnalyzeJob,
  payload: {
    message: string;
    code?: string;
    stage?: string;
    cancelled?: boolean;
  },
): void {
  if (job.status !== "running") return;
  job.status = payload.cancelled ? "cancelled" : "error";
  publishJobEvent(job, {
    type: "result",
    ok: false,
    message: payload.message,
    code: payload.code,
    stage: payload.stage,
  });
}

export function cancelAnalyzeJob(id: string): {
  ok: boolean;
  message: string;
  status?: AnalyzeJobStatus;
} {
  const job = getAnalyzeJob(id);
  if (!job) {
    return { ok: false, message: "Job not found or expired." };
  }
  if (job.status !== "running") {
    return {
      ok: true,
      message: `Job already ${job.status}.`,
      status: job.status,
    };
  }
  try {
    job.abort.abort();
  } catch {
    /* ignore */
  }
  completeJobFailure(job, {
    message: "Analysis cancelled.",
    code: "cancelled",
    cancelled: true,
  });
  return { ok: true, message: "Cancelled.", status: "cancelled" };
}

export function subscribeJob(
  job: AnalyzeJob,
  listener: (event: AnalyzeJobEvent) => void,
): () => void {
  for (const ev of job.events) {
    try {
      listener(ev);
    } catch {
      /* ignore */
    }
  }
  if (job.status !== "running") {
    return () => undefined;
  }
  job.listeners.add(listener);
  return () => {
    job.listeners.delete(listener);
  };
}

export function isJobTerminal(job: AnalyzeJob): boolean {
  return job.status !== "running";
}
