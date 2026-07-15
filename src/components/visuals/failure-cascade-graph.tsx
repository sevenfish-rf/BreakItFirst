"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CascadeNode } from "@/components/visuals/cascade-node";
import { useLanguage } from "@/lib/i18n/context";

const NODE_TYPES: NodeTypes = {
  cascade: CascadeNode,
};

const NODE_WIDTH = 260;
const NODE_GAP_Y = 108;
const STEP_MS = 180;

type FailureCascadeGraphProps = {
  nodes: string[];
};

function buildGraph(
  labels: string[],
  visibleCount: number,
): { nodes: Node[]; edges: Edge[] } {
  const slice = labels.slice(0, visibleCount);
  const nodes: Node[] = slice.map((label, i) => ({
    id: `n-${i}`,
    type: "cascade",
    position: { x: 0, y: i * NODE_GAP_Y },
    data: {
      label,
      index: i + 1,
      total: labels.length,
      isStart: i === 0,
      isEnd: i === labels.length - 1 && visibleCount >= labels.length,
    },
    style: { width: NODE_WIDTH },
  }));

  const edges: Edge[] = [];
  for (let i = 0; i < slice.length - 1; i++) {
    const progress = labels.length <= 1 ? 0 : i / (labels.length - 1);
    const opacity = 0.55 + progress * 0.35;
    edges.push({
      id: `e-${i}-${i + 1}`,
      source: `n-${i}`,
      target: `n-${i + 1}`,
      type: "smoothstep",
      animated: i === slice.length - 2,
      style: {
        stroke: "#FF6B6B",
        strokeWidth: 2,
        opacity,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#FF6B6B",
        width: 18,
        height: 18,
      },
    });
  }

  return { nodes, edges };
}

function CascadeCanvas({ labels }: { labels: string[] }) {
  const { t } = useLanguage();
  const [visibleCount, setVisibleCount] = useState(0);
  const [ready, setReady] = useState(false);
  const { fitView } = useReactFlow();

  useEffect(() => {
    setVisibleCount(0);
    setReady(false);
    if (labels.length === 0) return;

    let cancelled = false;
    let i = 0;

    const tick = () => {
      if (cancelled) return;
      i += 1;
      setVisibleCount(i);
      if (i < labels.length) {
        window.setTimeout(tick, STEP_MS);
      } else {
        setReady(true);
      }
    };

    const start = window.setTimeout(tick, 100);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, [labels]);

  const { nodes, edges } = useMemo(
    () => buildGraph(labels, visibleCount),
    [labels, visibleCount],
  );

  useEffect(() => {
    if (visibleCount === 0) return;
    const id = window.requestAnimationFrame(() => {
      void fitView({ padding: 0.28, maxZoom: 1.05, duration: 220 });
    });
    return () => window.cancelAnimationFrame(id);
  }, [visibleCount, fitView]);

  const onInit = useCallback(() => {
    void fitView({ padding: 0.28, maxZoom: 1.05 });
  }, [fitView]);

  const height = Math.max(360, Math.min(760, labels.length * NODE_GAP_Y + 120));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-[11px] text-text-muted">
        <span className="tabular-nums">
          {t.report.step} {Math.min(visibleCount, labels.length)} {t.report.of}{" "}
          {labels.length}
          {!ready && visibleCount > 0 ? " · …" : ""}
        </span>
        <span className="hidden sm:inline">Drag · scroll · zoom</span>
      </div>
      <div
        className="overflow-hidden rounded-2xl border border-border/80 bg-background/70"
        style={{ height }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onInit={onInit}
          fitView
          fitViewOptions={{ padding: 0.28, maxZoom: 1.05 }}
          minZoom={0.35}
          maxZoom={1.5}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          panOnScroll
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: "smoothstep" }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={18}
            size={1}
            color="#232328"
          />
          <Controls
            showInteractive={false}
            className="!overflow-hidden !rounded-xl !border !border-border !bg-surface !shadow-none [&>button]:!border-border [&>button]:!bg-surface [&>button]:!fill-text-secondary [&>button:hover]:!bg-surface-hover"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

export function FailureCascadeGraph({ nodes: labels }: FailureCascadeGraphProps) {
  const safeLabels = useMemo(
    () => labels.filter((n) => typeof n === "string" && n.trim()),
    [labels],
  );

  if (safeLabels.length === 0) {
    return <p className="text-sm text-text-muted">—</p>;
  }

  const graphKey = safeLabels.join("|");

  return (
    <ReactFlowProvider key={graphKey}>
      <CascadeCanvas labels={safeLabels} />
    </ReactFlowProvider>
  );
}
