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
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CascadeNode } from "@/components/visuals/cascade-node";
import { CascadeFlowEdge } from "@/components/visuals/cascade-flow-edge";
import { useLanguage } from "@/lib/i18n/context";
import type { CascadeNode as CascadeNodeModel } from "@/types/analysis";
import type { EdgeTypes } from "@xyflow/react";

const NODE_TYPES: NodeTypes = {
  cascade: CascadeNode,
};

const EDGE_TYPES: EdgeTypes = {
  cascadeFlow: CascadeFlowEdge,
};

/** Compact footprint for zigzag flowchart */
const NODE_W = 200;
const NODE_H = 92;
const GAP_X = 56;
const GAP_Y = 44;
const COLS_DESKTOP = 3;
const STEP_MS = 100;

type FailureCascadeGraphProps = {
  nodes: CascadeNodeModel[];
  pointOfNoReturnIndex?: number;
};

type OutDir = "right" | "left" | "down";

function sourcePosFor(dir: OutDir): Position {
  if (dir === "left") return Position.Left;
  if (dir === "right") return Position.Right;
  return Position.Bottom;
}

function targetPosForIncoming(prevOut: OutDir): Position {
  if (prevOut === "left") return Position.Right;
  if (prevOut === "right") return Position.Left;
  return Position.Top;
}

/**
 * Zigzag serpentine: L→R on even rows, R→L on odd rows.
 * Keeps flowchart feel while cutting vertical height vs single column.
 */
function layoutZigzag(count: number, cols: number) {
  const out: {
    x: number;
    y: number;
    outDir: OutDir;
    row: number;
    col: number;
  }[] = [];

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const colInRow = i % cols;
    const rtl = row % 2 === 1;
    const col = rtl ? cols - 1 - colInRow : colInRow;

    const x = col * (NODE_W + GAP_X);
    const y = row * (NODE_H + GAP_Y);

    let outDir: OutDir = "right";
    if (i >= count - 1) {
      outDir = "down";
    } else if (colInRow === cols - 1) {
      outDir = "down";
    } else if (rtl) {
      outDir = "left";
    } else {
      outDir = "right";
    }

    out.push({ x, y, outDir, row, col });
  }

  return out;
}

function buildGraph(
  items: CascadeNodeModel[],
  visibleCount: number,
  signalLabel: string,
  ponrLabel: string,
  detailHint: string,
  pointOfNoReturnIndex: number | undefined,
  cols: number,
): { nodes: Node[]; edges: Edge[]; height: number } {
  const slice = items.slice(0, visibleCount);
  const layout = layoutZigzag(items.length, cols);

  const nodes: Node[] = slice.map((item, i) => {
    const L = layout[i]!;
    const prev = i > 0 ? layout[i - 1] : undefined;
    const isLastVisible =
      i === slice.length - 1 && visibleCount >= items.length;

    const sourcePos = sourcePosFor(L.outDir);
    const targetPos = prev
      ? targetPosForIncoming(prev.outDir)
      : Position.Top;

    return {
      id: `n-${i}`,
      type: "cascade",
      position: { x: L.x, y: L.y },
      sourcePosition: sourcePos,
      targetPosition: targetPos,
      data: {
        label: item.step,
        signal: item.observable_signal,
        signalLabel,
        index: i + 1,
        total: items.length,
        isStart: i === 0,
        isEnd: isLastVisible,
        isPonr: pointOfNoReturnIndex === i,
        ponrLabel,
        sourcePos,
        targetPos,
        detailHint,
      },
      style: { width: NODE_W },
    };
  });

  const edges: Edge[] = [];
  for (let i = 0; i < slice.length - 1; i++) {
    const pastPonr =
      pointOfNoReturnIndex !== undefined && i >= pointOfNoReturnIndex;
    const color = pastPonr ? "#F5A524" : "#FF6B6B";

    edges.push({
      id: `e-${i}-${i + 1}`,
      source: `n-${i}`,
      target: `n-${i + 1}`,
      type: "cascadeFlow",
      animated: true,
      data: { accent: pastPonr },
      style: {
        stroke: color,
        strokeWidth: pastPonr ? 2.25 : 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
        width: 16,
        height: 16,
      },
    });
  }

  const rows = Math.ceil(Math.max(items.length, 1) / cols);
  const height = rows * NODE_H + (rows - 1) * GAP_Y + 56;

  return { nodes, edges, height };
}

function CascadeCanvas({
  items,
  pointOfNoReturnIndex,
  cols,
}: {
  items: CascadeNodeModel[];
  pointOfNoReturnIndex?: number;
  cols: number;
}) {
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

    const start = window.setTimeout(tick, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, [items, cols]);

  const { nodes, edges, height } = useMemo(
    () =>
      buildGraph(
        items,
        visibleCount,
        t.report.signal,
        t.report.pointOfNoReturn,
        t.report.stepDetail,
        pointOfNoReturnIndex,
        cols,
      ),
    [
      items,
      visibleCount,
      t.report.signal,
      t.report.pointOfNoReturn,
      t.report.stepDetail,
      pointOfNoReturnIndex,
      cols,
    ],
  );

  useEffect(() => {
    if (visibleCount === 0) return;
    const id = window.requestAnimationFrame(() => {
      void fitView({ padding: 0.16, maxZoom: 1.02, duration: 160 });
    });
    return () => window.cancelAnimationFrame(id);
  }, [visibleCount, fitView, cols]);

  const onInit = useCallback(() => {
    void fitView({ padding: 0.16, maxZoom: 1.02 });
  }, [fitView]);

  // Cap canvas height — zigzag keeps content shorter than pure vertical
  const canvasH = Math.min(480, Math.max(240, height + 20));

  const ponr =
    pointOfNoReturnIndex !== undefined &&
    pointOfNoReturnIndex >= 0 &&
    pointOfNoReturnIndex < items.length
      ? pointOfNoReturnIndex
      : undefined;

  return (
    <div className="space-y-3">
      <CascadeGuide />

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-muted">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tabular-nums">
            {t.report.step} {Math.min(visibleCount, items.length)} {t.report.of}{" "}
            {items.length}
            {!ready && visibleCount > 0 ? " · …" : ""}
          </span>
          {ponr !== undefined ? (
            <span className="rounded-full border border-warning/35 bg-warning/10 px-2 py-0.5 font-medium text-warning">
              {t.report.pointOfNoReturn} · #{ponr + 1}
            </span>
          ) : null}
        </div>
        <span className="hidden text-text-muted/75 sm:inline">
          {t.report.hoverForDetails} · drag · zoom
        </span>
      </div>

      <div
        className="overflow-hidden rounded-2xl border border-border/80 bg-background/70"
        style={{ height: canvasH }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          onInit={onInit}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1.02 }}
          minZoom={0.35}
          maxZoom={1.35}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          panOnScroll
          elevateNodesOnSelect
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: "cascadeFlow", animated: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={16}
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

function CascadeGuide() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(true);
  const r = t.report;

  const items: {
    key: string;
    title: string;
    desc: string;
    swatch: React.ReactNode;
  }[] = [
    {
      key: "start",
      title: r.cascadeLegendStart,
      desc: r.cascadeLegendStartDesc,
      swatch: (
        <span className="block h-8 w-11 rounded-md border-2 border-accent/55 bg-gradient-to-br from-accent/25 to-surface shadow-sm" />
      ),
    },
    {
      key: "mid",
      title: r.cascadeLegendMid,
      desc: r.cascadeLegendMidDesc,
      swatch: (
        <span className="block h-8 w-11 rounded-md border border-border/90 bg-surface/95 shadow-sm" />
      ),
    },
    {
      key: "late",
      title: r.cascadeLegendLate,
      desc: r.cascadeLegendLateDesc,
      swatch: (
        <span className="block h-8 w-11 rounded-md border border-accent/35 bg-gradient-to-br from-accent/12 to-surface shadow-sm" />
      ),
    },
    {
      key: "ponr",
      title: r.cascadeLegendPonr,
      desc: r.cascadeLegendPonrDesc,
      swatch: (
        <span className="relative block h-8 w-11 rounded-md border-2 border-warning/65 bg-gradient-to-br from-warning/25 to-surface ring-1 ring-warning/30 shadow-sm">
          <span className="absolute inset-x-1 top-1 truncate text-center text-[7px] font-bold uppercase tracking-wide text-warning">
            !
          </span>
        </span>
      ),
    },
    {
      key: "arrow",
      title: r.cascadeLegendArrow,
      desc: r.cascadeLegendArrowDesc,
      swatch: (
        <span className="flex h-8 w-11 items-center justify-center">
          <span className="h-0.5 w-8 rounded-full bg-accent cascade-edge-dash opacity-90 shadow-[0_0_8px_var(--accent)]" />
        </span>
      ),
    },
    {
      key: "signal",
      title: r.cascadeLegendSignal,
      desc: r.cascadeLegendSignalDesc,
      swatch: (
        <span className="flex h-8 w-11 flex-col justify-center gap-0.5 px-0.5">
          <span className="h-1 w-full rounded bg-text/80" />
          <span className="h-1 w-4/5 rounded bg-accent/50" />
          <span className="h-1 w-3/5 rounded bg-text-muted/40" />
        </span>
      ),
    },
    {
      key: "num",
      title: r.cascadeLegendNumber,
      desc: r.cascadeLegendNumberDesc,
      swatch: (
        <span className="flex h-8 w-11 items-center justify-center">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/25 text-[11px] font-bold text-accent">
            3
          </span>
        </span>
      ),
    },
    {
      key: "hover",
      title: r.cascadeLegendHover,
      desc: r.cascadeLegendHoverDesc,
      swatch: (
        <span className="flex h-8 w-11 items-center justify-center">
          <span className="rounded border border-accent/40 bg-surface px-1.5 py-0.5 text-[8px] text-text-muted shadow-md ring-1 ring-accent/30">
            popup
          </span>
        </span>
      ),
    },
  ];

  return (
    <div className="rounded-2xl border border-border/70 bg-background/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span className="text-[12px] font-semibold tracking-tight text-text">
          {r.cascadeGuideTitle}
        </span>
        <span className="text-[11px] text-text-muted">
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-border/50 px-3.5 pb-3.5 pt-2.5">
          <p className="text-[11px] leading-relaxed text-text-secondary">
            {r.cascadeGuideWhat}
          </p>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {items.map((item) => (
              <li
                key={item.key}
                className="flex gap-2.5 rounded-xl border border-border/50 bg-surface/40 px-2.5 py-2"
              >
                <div className="flex shrink-0 items-start pt-0.5">
                  {item.swatch}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-text">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-text-muted">
                    {item.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function useCascadeCols() {
  const [cols, setCols] = useState(COLS_DESKTOP);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setCols(1);
      else if (w < 1100) setCols(2);
      else setCols(COLS_DESKTOP);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return cols;
}

export function FailureCascadeGraph({
  nodes,
  pointOfNoReturnIndex,
}: FailureCascadeGraphProps) {
  const cols = useCascadeCols();

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

  const graphKey =
    safe.map((n) => `${n.step}|${n.observable_signal}`).join("||") +
    `|ponr=${pointOfNoReturnIndex ?? ""}|cols=${cols}`;

  return (
    <ReactFlowProvider key={graphKey}>
      <CascadeCanvas
        items={safe}
        pointOfNoReturnIndex={pointOfNoReturnIndex}
        cols={cols}
      />
    </ReactFlowProvider>
  );
}
