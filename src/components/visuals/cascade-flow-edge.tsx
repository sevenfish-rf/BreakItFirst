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
    (accent ? "#F5A524" : "#FF6B6B");
  const width = (style?.strokeWidth as number | undefined) ?? 2;

  return (
    <>
      {/* Glow underlay */}
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          stroke,
          strokeWidth: width + 4,
          opacity: 0.15,
          filter: "blur(3px)",
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
          opacity: 0.85,
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
        style={{ opacity: 0.95 }}
      />
      {/* Moving pulse dot along path */}
      <circle r="3.5" fill={stroke} className="cascade-edge-pulse">
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
            style={{ background: stroke, boxShadow: `0 0 8px ${stroke}` }}
          />
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const CascadeFlowEdge = memo(CascadeFlowEdgeComponent);
