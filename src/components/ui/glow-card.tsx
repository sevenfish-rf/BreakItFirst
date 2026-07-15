"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

const BorderGlow = dynamic(() => import("@/components/effects/BorderGlow"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full rounded-3xl border border-white/10"
      style={{ minHeight: 48, background: "var(--theme-card-bg, #110b0b)" }}
    />
  ),
});

type GlowCardProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Defaults to true — intro sweep on every card */
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
 * BorderGlow card — colors follow active theme.
 * Intro animation ON by default for all instances.
 */
export function GlowCard({
  children,
  className,
  contentClassName,
  animated = true,
  borderRadius = 24,
  glowIntensity = 1.6,
  padding = "md",
}: GlowCardProps) {
  const { theme } = useTheme();

  return (
    <BorderGlow
      className={cn("w-full", className)}
      edgeSensitivity={28}
      glowColor={theme.glowColor}
      backgroundColor={theme.backgroundColor}
      borderRadius={borderRadius}
      glowRadius={36}
      glowIntensity={glowIntensity}
      coneSpread={30}
      animated={animated}
      colors={[...theme.colors]}
      fillOpacity={0.55}
      idleVisible
    >
      <div className={cn(padMap[padding], contentClassName)}>{children}</div>
    </BorderGlow>
  );
}
