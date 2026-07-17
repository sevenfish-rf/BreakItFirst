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
            className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-warning/20 cascade-ponr-pulse"
            aria-hidden
          />
        ) : null}

        <div
          className={cn(
            "w-[200px] cursor-pointer rounded-xl border px-2.5 py-2 shadow-md backdrop-blur-sm transition-all duration-200",
            "hover:scale-[1.03] hover:shadow-[0_0_24px_-4px_rgba(255,107,107,0.35)]",
            showPopup && "ring-1 ring-accent/40",
            d.isPonr &&
              "border-warning/65 bg-gradient-to-br from-warning/20 to-surface ring-1 ring-warning/35 hover:shadow-[0_0_28px_-4px_rgba(245,165,36,0.45)]",
            !d.isPonr &&
              tone === "start" &&
              "border-accent/50 bg-gradient-to-br from-accent/20 to-surface",
            !d.isPonr &&
              tone === "end" &&
              "border-accent/35 bg-gradient-to-br from-accent/10 to-surface",
            !d.isPonr && tone === "mid" && "border-border/90 bg-surface/95",
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
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tabular-nums",
                d.isPonr && "bg-warning/30 text-warning",
                !d.isPonr && tone === "start" && "bg-accent/30 text-accent",
                !d.isPonr && tone === "end" && "bg-accent/20 text-accent",
                !d.isPonr &&
                  tone === "mid" &&
                  "bg-background text-text-muted",
              )}
            >
              {d.index}
            </motion.span>
            <div className="min-w-0 space-y-1">
              {d.isPonr && d.ponrLabel ? (
                <p className="text-left text-[9px] font-semibold uppercase tracking-wide text-warning">
                  {d.ponrLabel}
                </p>
              ) : null}
              <p className="line-clamp-2 text-left text-[12px] font-medium leading-snug text-text">
                {d.label}
              </p>
              {d.signal ? (
                <p className="line-clamp-2 text-left text-[10px] leading-snug text-text-muted">
                  <span className="font-medium text-accent/85">
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
            "w-[min(300px,78vw)] rounded-xl border px-3 py-2.5 shadow-2xl backdrop-blur-md",
            d.isPonr
              ? "border-warning/40 bg-[rgba(20,16,10,0.97)]"
              : "border-accent/30 bg-[rgba(12,12,16,0.97)]",
            "shadow-[0_16px_48px_-10px_rgba(0,0,0,0.8)]",
          )}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold",
                d.isPonr
                  ? "bg-warning/25 text-warning"
                  : "bg-accent/20 text-accent",
              )}
            >
              {d.index}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
              {d.detailHint ?? "Detail"}
            </span>
          </div>
          {d.isPonr && d.ponrLabel ? (
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-warning">
              {d.ponrLabel}
            </p>
          ) : null}
          <p className="text-[13px] font-semibold leading-snug text-text">
            {d.label}
          </p>
          {d.signal ? (
            <p className="mt-2 border-t border-white/10 pt-2 text-[11px] leading-relaxed text-text-secondary">
              <span className="font-semibold text-accent">
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
