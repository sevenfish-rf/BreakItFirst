"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type GlowCardProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Kept for API compat with the old BorderGlow card — no longer used. */
  animated?: boolean;
  borderRadius?: number;
  glowIntensity?: number;
  padding?: "none" | "sm" | "md" | "lg";
};

const padMap = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

/**
 * Editorial paper card. (Name kept as GlowCard for backward-compat.)
 * The old animated WebGL border glow is retired in favour of a calm,
 * hairline-bordered paper surface.
 */
export function GlowCard({
  children,
  className,
  contentClassName,
  borderRadius = 12,
  padding = "md",
}: GlowCardProps) {
  return (
    <div
      className={cn("paper-card paper-card-interactive w-full", className)}
      style={{ borderRadius }}
    >
      <div className={cn(padMap[padding], contentClassName)}>{children}</div>
    </div>
  );
}
