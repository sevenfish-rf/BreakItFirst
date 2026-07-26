"use client";

import { memo, useState } from "react";
import {
  Handle,
  NodeToolbar,
  Position,
  type NodeProps,
} from "@xyflow/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type CascadeNodeData = {
  label: string;
  signal?: string;
  index: number;
  total: number;
  isStart: boolean;
  isEnd: boolean;
  signalLabel?: string;
  isPonr?: boolean;
  ponrLabel?: string;
  sourcePos: Position;
  targetPos: Position;
  detailHint?: string;
};

function severityTone(index: number, total: number) {
  const t = total <= 1 ? 0 : (index - 1) / (total - 1);
  if (t < 0.25) return "start";
  if (t > 0.75) return "end";
  return "mid";
}

function CascadeNodeComponent({ data, selected }: NodeProps) {
  const d = data as CascadeNodeData;
  const tone = severityTone(d.index, d.total);
  const [hover, setHover] = useState(false);
  const showPopup = hover || Boolean(selected);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 380,
          damping: 24,
          delay: Math.min((d.index - 1) * 0.04, 0.45),
        }}
        className="relative"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {d.isPonr ? (
          <span
            className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-accent/15 cascade-ponr-pulse"
            aria-hidden
          />
        ) : null}

        <div
          className={cn(
            "w-[200px] cursor-pointer rounded-lg border bg-surface px-2.5 py-2 shadow-sm transition-all duration-200",
            "hover:-translate-y-px hover:border-border-strong hover:shadow-md",
            showPopup && "ring-1 ring-accent/30",
            d.isPonr &&
              "border-accent/60 bg-accent-soft ring-1 ring-accent/25 hover:border-accent/70",
            !d.isPonr &&
              tone === "start" &&
              "border-border-strong",
            !d.isPonr &&
              tone === "end" &&
              "border-accent/45 bg-accent-soft",
            !d.isPonr && tone === "mid" && "border-border",
          )}
        >
          {!d.isStart ? (
            <Handle
              type="target"
              position={d.targetPos}
              className="!h-2 !w-2 !border-border !bg-accent cascade-handle-glow"
            />
          ) : null}

          <div className="flex items-start gap-2">
            <motion.span
              animate={
                d.isPonr
                  ? { scale: [1, 1.08, 1] }
                  : showPopup
                    ? { scale: 1.06 }
                    : { scale: 1 }
              }
              transition={
                d.isPonr
                  ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.2 }
              }
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold tabular-nums",
                d.isPonr && "bg-accent/15 text-accent",
                !d.isPonr && tone === "start" && "bg-background-elevated text-text-secondary",
                !d.isPonr && tone === "end" && "bg-accent/12 text-accent",
                !d.isPonr &&
                  tone === "mid" &&
                  "bg-background-elevated text-text-muted",
              )}
            >
              {d.index}
            </motion.span>
            <div className="min-w-0 space-y-1">
              {d.isPonr && d.ponrLabel ? (
                <p className="text-left font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-accent">
                  {d.ponrLabel}
                </p>
              ) : null}
              <p className="line-clamp-2 text-left text-[12px] font-medium leading-snug text-text">
                {d.label}
              </p>
              {d.signal ? (
                <p className="line-clamp-2 text-left text-[10px] leading-snug text-text-muted">
                  <span className="font-mono font-medium uppercase tracking-wide text-text-secondary">
                    {d.signalLabel ?? "Signal"}:{" "}
                  </span>
                  {d.signal}
                </p>
              ) : null}
            </div>
          </div>

          {!d.isEnd ? (
            <Handle
              type="source"
              position={d.sourcePos}
              className="!h-2 !w-2 !border-border !bg-accent cascade-handle-glow"
            />
          ) : null}
        </div>
      </motion.div>

      {/* Full detail popup — portal via NodeToolbar so not clipped by canvas */}
      <NodeToolbar
        isVisible={showPopup}
        position={Position.Bottom}
        offset={10}
        className="!z-[100] !border-0 !bg-transparent !p-0 !shadow-none"
      >
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.16 }}
          className={cn(
            "paper-card w-[min(300px,78vw)] px-3 py-2.5",
            d.isPonr
              ? "!border-accent/40"
              : "!border-border-strong",
          )}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-md font-mono text-[10px] font-bold tabular-nums",
                d.isPonr
                  ? "bg-accent/15 text-accent"
                  : "bg-background-elevated text-text-secondary",
              )}
            >
              {d.index}
            </span>
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-text-muted">
              {d.detailHint ?? "Detail"}
            </span>
          </div>
          {d.isPonr && d.ponrLabel ? (
            <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
              {d.ponrLabel}
            </p>
          ) : null}
          <p className="text-[13px] font-semibold leading-snug text-text">
            {d.label}
          </p>
          {d.signal ? (
            <p className="mt-2 border-t border-border pt-2 text-[11px] leading-relaxed text-text-secondary">
              <span className="font-mono font-medium uppercase tracking-wide text-text-muted">
                {d.signalLabel ?? "Signal"}:{" "}
              </span>
              {d.signal}
            </p>
          ) : null}
        </motion.div>
      </NodeToolbar>
    </>
  );
}

export const CascadeNode = memo(CascadeNodeComponent);
