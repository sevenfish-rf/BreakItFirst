"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type CascadeNodeData = {
  label: string;
  index: number;
  total: number;
  isStart: boolean;
  isEnd: boolean;
};

function severityTone(index: number, total: number) {
  const t = total <= 1 ? 0 : (index - 1) / (total - 1);
  if (t < 0.25) return "start";
  if (t > 0.75) return "end";
  return "mid";
}

function CascadeNodeComponent({ data }: NodeProps) {
  const d = data as CascadeNodeData;
  const tone = severityTone(d.index, d.total);

  return (
    <div
      className={cn(
        "group min-w-[220px] max-w-[280px] rounded-2xl border px-3.5 py-3 shadow-lg backdrop-blur-sm transition-transform duration-200",
        "hover:scale-[1.02]",
        tone === "start" &&
          "border-accent/55 bg-gradient-to-br from-accent/25 to-surface shadow-accent/15",
        tone === "end" &&
          "border-warning/45 bg-gradient-to-br from-warning/15 to-surface",
        tone === "mid" && "border-border bg-surface/95 shadow-black/40",
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-border !bg-accent"
      />
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold tabular-nums",
            tone === "start" && "bg-accent/30 text-accent",
            tone === "end" && "bg-warning/25 text-warning",
            tone === "mid" && "bg-background text-text-muted",
          )}
        >
          {d.index}
        </span>
        <p className="text-left text-[13px] font-medium leading-snug text-text">
          {d.label}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-border !bg-accent"
      />
    </div>
  );
}

export const CascadeNode = memo(CascadeNodeComponent);
