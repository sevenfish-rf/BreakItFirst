/**
 * K3 — raw-pass trace dump (opt-in, `BIF_TRACE=1`).
 *
 * Pass 1 is instructed to generate 3 SPOF candidates internally and pick one.
 * Only the winner survives Pass 2, and in Standard mode the two runners-up are
 * discarded with no record — which is why the dogfood reports could complain
 * about SPOF instability but nothing could measure it.
 *
 * This writes the raw prose of every pass to disk so those candidates are
 * recoverable after the fact. It deliberately changes nothing about the
 * pipeline's output: prompts, schema rules and soft checks are untouched.
 *
 * Off by default. Traces contain the user's idea text and full model output, so
 * this is a local development instrument — never enable it on a shared host.
 * The API key is never written.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import type { PipelineStageTiming } from "@/lib/pipeline-stages";
import type { FailureAnalysis, RunProvenance } from "@/types/analysis";

export const TRACE_DIR_NAME = ".breakitfirst-traces";

export type AnalysisTrace = {
  generated_at: string;
  run: RunProvenance;
  category: string;
  idea_input: string;
  /** Raw prose per pass — where the discarded SPOF candidates live. */
  raw: {
    pass1_a: string;
    pass1_b?: string;
    /** Pass 1.5 critique output, i.e. the text Pass 2 actually compressed. */
    pass1_5: string;
    pass2: string;
  };
  spof: string;
  candidate_spofs?: string[];
  warnings: string[];
  stages: PipelineStageTiming[];
};

/** Opt-in only: an unset or any other value means no trace is written. */
export function traceEnabled(): boolean {
  return process.env.BIF_TRACE === "1";
}

function traceDir(): string {
  return join(process.cwd(), TRACE_DIR_NAME);
}

/** Filesystem-safe, sortable, collision-resistant. */
function traceFileName(generatedAt: string): string {
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const rand = Math.random().toString(36).slice(2, 8);
  return `${stamp}_${rand}.json`;
}

/**
 * Write one trace file. Returns the path, or null when disabled or on any
 * failure — tracing must never break an analysis that otherwise succeeded.
 */
export function writeAnalysisTrace(trace: AnalysisTrace): string | null {
  if (!traceEnabled()) return null;
  try {
    const dir = traceDir();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const path = join(dir, traceFileName(trace.generated_at));
    writeFileSync(path, JSON.stringify(trace, null, 2), "utf8");
    console.info("[trace] wrote", path);
    return path;
  } catch (err) {
    console.warn("[trace] write failed", err);
    return null;
  }
}

/** Build the trace payload from what the pipeline already has in scope. */
export function buildAnalysisTrace(params: {
  analysis: FailureAnalysis;
  run: RunProvenance;
  reasoningA: string;
  reasoningB?: string;
  reasoning: string;
  structuredRaw: string;
  warnings: string[];
  stages: PipelineStageTiming[];
}): AnalysisTrace {
  const { analysis, run } = params;
  return {
    generated_at: analysis.meta.generated_at,
    run,
    category: analysis.meta.category,
    idea_input: analysis.meta.idea_input,
    raw: {
      pass1_a: params.reasoningA,
      pass1_b: params.reasoningB,
      pass1_5: params.reasoning,
      pass2: params.structuredRaw,
    },
    spof: analysis.single_point_of_failure.component,
    candidate_spofs: analysis.self_consistency?.candidate_spofs,
    warnings: [...params.warnings],
    stages: [...params.stages],
  };
}
