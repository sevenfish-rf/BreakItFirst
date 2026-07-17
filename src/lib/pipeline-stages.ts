/**
 * Lightweight stage types shared by server pipeline + client UI.
 * Keep this free of provider/schema imports so client components stay slim.
 */

/** Live stages streamed to the UI (real progress, not timer heuristics). */
export type PipelineLiveStage =
  | "ingest"
  | "pass1"
  | "pass1_5"
  | "pass2"
  | "pass2_retry"
  | "validate"
  | "done";

export type PipelineStageEvent = {
  stage: PipelineLiveStage;
  /** Optional human note for logs / UI */
  detail?: string;
};

/** Map live stage → UI stage list index (0-based). */
export function liveStageToUiIndex(stage: PipelineLiveStage): number {
  switch (stage) {
    case "ingest":
      return 0;
    case "pass1":
      return 1;
    case "pass1_5":
      return 2;
    case "pass2":
    case "pass2_retry":
      return 3;
    case "validate":
    case "done":
      return 4;
    default:
      return 0;
  }
}
