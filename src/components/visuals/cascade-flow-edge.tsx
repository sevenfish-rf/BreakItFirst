"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";

export type CascadeFlowEdgeData = {
  accent?: boolean;
};

function CascadeFlowEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  const accent = Boolean(
    data && typeof data === "object" && "accent" in data && data.accent,
  );
  const stroke =
    (style?.stroke as string | undefined) ??
    (accent ? "var(--accent)" : "var(--text-muted)");
  const width = (style?.strokeWidth as number | undefined) ?? 1.5;

  return (
    <>
      {/* Faint underlay — widens the fault-line without glow */}
      <BaseEdge
        id={`${id}-under`}
        path={edgePath}
        style={{
          stroke,
          strokeWidth: width + 3,
          opacity: 0.08,
        }}
      />
      {/* Static path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke,
          strokeWidth: width,
          opacity: 0.75,
        }}
      />
      {/* Running dash animation */}
      <path
        d={edgePath}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray="6 10"
        className="cascade-edge-dash"
        style={{ opacity: 0.9 }}
      />
      {/* Moving pulse dot along path */}
      <circle r="3" fill={stroke} className="cascade-edge-pulse">
        <animateMotion dur="1.6s" repeatCount="indefinite" path={edgePath} />
      </circle>
      <EdgeLabelRenderer>
        <div
          className="pointer-events-none absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          <span
            className="block h-1 w-1 rounded-full opacity-40"
            style={{ background: stroke }}
          />
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const CascadeFlowEdge = memo(CascadeFlowEdgeComponent);
