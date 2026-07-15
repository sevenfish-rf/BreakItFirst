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
import type { CascadeNode as CascadeNodeModel } from "@/types/analysis";

const NODE_TYPES: NodeTypes = {
  cascade: CascadeNode,
};

const NODE_WIDTH = 280;
const NODE_GAP_Y = 132;
const STEP_MS = 180;

type FailureCascadeGraphProps = {
  nodes: CascadeNodeModel[];
};

function buildGraph(
  items: CascadeNodeModel[],
  visibleCount: number,
  signalLabel: string,
): { nodes: Node[]; edges: Edge[] } {
  const slice = items.slice(0, visibleCount);
  const nodes: Node[] = slice.map((item, i) => ({
    id: `n-${i}`,
    type: "cascade",
    position: { x: 0, y: i * NODE_GAP_Y },
    data: {
      label: item.step,
      signal: item.observable_signal,
      signalLabel,
      index: i + 1,
      total: items.length,
      isStart: i === 0,
      isEnd: i === items.length - 1 && visibleCount >= items.length,
    },
    style: { width: NODE_WIDTH },
  }));

  const edges: Edge[] = [];
  for (let i = 0; i < slice.length - 1; i++) {
    const progress = items.length <= 1 ? 0 : i / (items.length - 1);
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

function CascadeCanvas({ items }: { items: CascadeNodeModel[] }) {
  const { t } = useLanguage();
  const [visibleCount, setVisibleCount] = useState(0);
  const [ready, setReady] = useState(false);
  const { fitView } = useReactFlow();

  useEffect(() => {
    setVisibleCount(0);
    setReady(false);
    if (items.length === 0) return;

    let cancelled = false;
    let i = 0;

    const tick = () => {
      if (cancelled) return;
      i += 1;
      setVisibleCount(i);
      if (i < items.length) {
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
  }, [items]);

  const { nodes, edges } = useMemo(
    () => buildGraph(items, visibleCount, t.report.signal),
    [items, visibleCount, t.report.signal],
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

  const height = Math.max(400, Math.min(900, items.length * NODE_GAP_Y + 120));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-[11px] text-text-muted">
        <span className="tabular-nums">
          {t.report.step} {Math.min(visibleCount, items.length)} {t.report.of}{" "}
          {items.length}
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

export function FailureCascadeGraph({ nodes }: FailureCascadeGraphProps) {
  const safe = useMemo(
    () =>
      nodes.filter(
        (n) =>
          n &&
          typeof n.step === "string" &&
          n.step.trim() &&
          typeof n.observable_signal === "string",
      ),
    [nodes],
  );

  if (safe.length === 0) {
    return <p className="text-sm text-text-muted">—</p>;
  }

  const graphKey = safe.map((n) => `${n.step}|${n.observable_signal}`).join("||");

  return (
    <ReactFlowProvider key={graphKey}>
      <CascadeCanvas items={safe} />
    </ReactFlowProvider>
  );
}
