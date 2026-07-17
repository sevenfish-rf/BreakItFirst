/**
 * In-process analysis jobs.
 *
 * Why: a single streaming POST dies when the browser refreshes, so the UI
 * restarts and the user often burns a second set of provider calls.
 * Jobs keep running after the client disconnects; only explicit cancel
 * aborts the pipeline AbortController.
 *
 * Limitation: in-memory Map — lost on server restart / multi-instance.
 * Fine for local BYOK and single-node deploys.
 */

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

export type AnalyzeJobStatus =
  | "running"
  | "done"
  | "error"
  | "cancelled";

export type AnalyzeJob = {
  id: string;
  status: AnalyzeJobStatus;
  events: AnalyzeJobEvent[];
  createdAt: number;
  updatedAt: number;
  abort: AbortController;
  listeners: Set<(event: AnalyzeJobEvent) => void>;
};

const JOB_TTL_MS = 45 * 60 * 1000; // keep results ~45 min for reconnect
const jobs = new Map<string, AnalyzeJob>();

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `j${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function pruneJobs(now = Date.now()): void {
  for (const [id, job] of jobs) {
    if (now - job.updatedAt > JOB_TTL_MS) {
      try {
        if (job.status === "running") job.abort.abort();
      } catch {
        /* ignore */
      }
      jobs.delete(id);
    }
  }
}

export function createAnalyzeJob(): AnalyzeJob {
  pruneJobs();
  const job: AnalyzeJob = {
    id: newId(),
    status: "running",
    events: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    abort: new AbortController(),
    listeners: new Set(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getAnalyzeJob(id: string): AnalyzeJob | undefined {
  pruneJobs();
  return jobs.get(id);
}

/** Push event to log + all live subscribers. */
export function publishJobEvent(job: AnalyzeJob, event: AnalyzeJobEvent): void {
  job.events.push(event);
  job.updatedAt = Date.now();
  // Cap event log (keep stages + final result; drop old pings)
  if (job.events.length > 200) {
    job.events = job.events.filter((e, i) => {
      if (e.type === "ping" && i < job.events.length - 20) return false;
      return true;
    });
  }
  for (const listener of job.listeners) {
    try {
      listener(event);
    } catch {
      /* ignore subscriber errors */
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

/**
 * Cancel a running job. Returns false if missing or already terminal.
 * Does NOT refund rate-limit slots (already consumed at start).
 */
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

/** Subscribe; immediately replays history. Returns unsubscribe. */
export function subscribeJob(
  job: AnalyzeJob,
  listener: (event: AnalyzeJobEvent) => void,
): () => void {
  // Replay existing events first
  for (const ev of job.events) {
    try {
      listener(ev);
    } catch {
      /* ignore */
    }
  }
  // Terminal jobs: no further events
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
