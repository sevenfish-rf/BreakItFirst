"use client";

/* eslint-disable react-hooks/set-state-in-effect --
   Intentional: effects reset/advance the elapsed timer, progress crawl, and
   tip rotation in response to `open`/stage changes — timer-driven UI state. */

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import {
  liveStageToUiIndex,
  type PipelineLiveStage,
} from "@/lib/pipeline-stages";

type AnalyzingOverlayProps = {
  open: boolean;
  /**
   * Real pipeline stage from server NDJSON stream.
   * When null, stay on "ingest" until first event (no fake timer advance).
   */
  liveStage?: PipelineLiveStage | null;
  /** Optional detail from last stage event */
  liveDetail?: string | null;
  /** Abort in-flight analysis without leaving the page */
  onCancel?: () => void;
};

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0
    ? `${m}:${String(r).padStart(2, "0")}`
    : `0:${String(r).padStart(2, "0")}`;
}

/** Progress floors / caps by real stage index (server-driven). */
const STAGE_PROGRESS_FLOOR = [4, 18, 38, 58, 82];
const STAGE_PROGRESS_CAPS = [16, 36, 56, 80, 97];

/**
 * Concept-A analyzing layer: editorial stepper over the console.
 * Stage list is driven by real server events (poll snapshot), not wall-clock.
 */
export function AnalyzingOverlay({
  open,
  liveStage = null,
  liveDetail = null,
  onCancel,
}: AnalyzingOverlayProps) {
  const { t } = useLanguage();
  const stages = t.analyzing.stages;
  const tips = t.analyzing.tips;

  const [elapsedMs, setElapsedMs] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [progress, setProgress] = useState(4);

  const stageIndex = liveStage ? liveStageToUiIndex(liveStage) : 0;

  useEffect(() => {
    if (!open) return;
    setElapsedMs(0);
    setTipIndex(0);
    setProgress(4);
  }, [open]);

  // When server stage advances, jump progress floor immediately (no stuck 12%)
  useEffect(() => {
    if (!open) return;
    const floor =
      STAGE_PROGRESS_FLOOR[
        Math.min(stageIndex, STAGE_PROGRESS_FLOOR.length - 1)
      ] ?? 4;
    setProgress((p) => Math.max(p, floor));
  }, [open, stageIndex, liveStage]);

  useEffect(() => {
    if (!open) return;
    const t0 = performance.now();
    const id = window.setInterval(() => {
      setElapsedMs(performance.now() - t0);
    }, 200);
    return () => window.clearInterval(id);
  }, [open]);

  // Soft crawl within the *current real stage* only
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      setProgress((p) => {
        const cap =
          STAGE_PROGRESS_CAPS[
            Math.min(stageIndex, STAGE_PROGRESS_CAPS.length - 1)
          ] ?? 97;
        const floor =
          STAGE_PROGRESS_FLOOR[
            Math.min(stageIndex, STAGE_PROGRESS_FLOOR.length - 1)
          ] ?? 4;
        if (p < floor) return floor;
        if (p >= cap) {
          return Math.min(cap, p + 0.02);
        }
        return Math.min(cap, p + (cap - p) * 0.05 + 0.2);
      });
    }, 160);
    return () => window.clearInterval(id);
  }, [open, stageIndex]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [open, tips.length]);

  // Long wait tip: show after 90s on any stage that talks to the model
  const showStillWorking = elapsedMs > 90_000 && stageIndex >= 1;

  if (!open) return null;

  return (
    <div className="analyzing" role="status" aria-live="polite">
      <div className="analyzing-head">
        <span className="label label--signal">{t.analyzing.title}</span>
        <span className="analyzing-elapsed">
          {t.analyzing.elapsed} {formatElapsed(elapsedMs)}
        </span>
      </div>

      <ol className="ana-steps">
        {stages.map((stage, i) => {
          const done = i < stageIndex;
          const active = i === stageIndex;
          return (
            <li
              key={stage.id}
              className={[
                "ana-step",
                active ? "active" : "",
                done ? "done" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={active ? "step" : undefined}
            >
              <span className="ana-dot" aria-hidden="true">
                {done ? "✓" : i + 1}
              </span>
              <span className="ana-label" title={stage.hint}>
                {stage.label}
                {active && liveDetail && stageIndex >= 1
                  ? ` — ${liveDetail}`
                  : null}
              </span>
            </li>
          );
        })}
      </ol>

      <div
        className="ana-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="ana-foot">
        <span className="ana-tip">
          {showStillWorking ? t.analyzing.stillWorking : tips[tipIndex]}
        </span>
        {onCancel ? (
          <button
            type="button"
            className="link-btn"
            onClick={onCancel}
            title={t.analyzing.cancelHint}
          >
            {t.analyzing.cancel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
