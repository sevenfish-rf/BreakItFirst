"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { FailureAnalysis } from "@/types/analysis";
import { cn } from "@/lib/utils";

type ResilienceRadarProps = {
  scores: FailureAnalysis["resilience_score"];
};

const DIMENSIONS: {
  key: keyof FailureAnalysis["resilience_score"];
  label: string;
}[] = [
  { key: "technical", label: "Technical" },
  { key: "business", label: "Business" },
  { key: "legal", label: "Legal" },
  { key: "operations", label: "Operations" },
  { key: "trust", label: "Trust" },
];

function scoreTone(value: number): string {
  if (value >= 70) return "text-healthy";
  if (value >= 40) return "text-warning";
  return "text-accent";
}

export function ResilienceRadar({ scores }: ResilienceRadarProps) {
  const target = useMemo(
    () =>
      DIMENSIONS.map((d) => ({
        dimension: d.label,
        key: d.key,
        score: Math.min(100, Math.max(0, Math.round(scores[d.key]))),
      })),
    [scores],
  );

  // Animate bars/radar from 0 → target
  const [display, setDisplay] = useState(
    () => target.map((d) => ({ ...d, score: 0 })),
  );

  useEffect(() => {
    setDisplay(target.map((d) => ({ ...d, score: 0 })));
    let frame = 0;
    const frames = 28;
    let raf = 0;

    const step = () => {
      frame += 1;
      const t = Math.min(1, frame / frames);
      // ease-out cubic
      const e = 1 - Math.pow(1 - t, 3);
      setDisplay(
        target.map((d) => ({
          ...d,
          score: Math.round(d.score * e),
        })),
      );
      if (frame < frames) {
        raf = window.requestAnimationFrame(step);
      }
    };

    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [target]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_220px] lg:items-center">
      <div className="h-[280px] w-full sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={display}>
            <PolarGrid stroke="#232328" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "#71717a", fontSize: 10 }}
              axisLine={false}
            />
            <Radar
              name="Resilience"
              dataKey="score"
              stroke="#FF6B6B"
              fill="#FF6B6B"
              fillOpacity={0.22}
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Tooltip
              contentStyle={{
                background: "#141417",
                border: "1px solid #232328",
                borderRadius: 12,
                fontSize: 12,
                color: "#fff",
              }}
              formatter={(value) => [
                typeof value === "number" ? value : Number(value ?? 0),
                "Score",
              ]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
        {display.map((d) => (
          <li
            key={d.key}
            className="rounded-xl border border-border bg-background/50 px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-secondary">{d.dimension}</span>
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  scoreTone(d.score),
                )}
              >
                {d.score}
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-border/60">
              <div
                className="h-full rounded-full bg-accent/80 transition-[width] duration-75"
                style={{ width: `${d.score}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
