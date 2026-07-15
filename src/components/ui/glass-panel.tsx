"use client";

import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type GlassPanelProps = Omit<HTMLMotionProps<"div">, "children"> & {
  glow?: boolean;
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  children?: ReactNode;
};

const padMap = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export function GlassPanel({
  className,
  glow,
  interactive,
  padding = "md",
  children,
  ...props
}: GlassPanelProps) {
  return (
    <motion.div
      className={cn(
        "glass-panel",
        padMap[padding],
        glow && "glass-panel-glow",
        interactive && "glass-panel-interactive",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

type GradientBorderPanelProps = Omit<HTMLMotionProps<"div">, "children"> & {
  padding?: "none" | "sm" | "md" | "lg";
  children?: ReactNode;
};

export function GradientBorderPanel({
  className,
  padding = "lg",
  children,
  ...props
}: GradientBorderPanelProps) {
  return (
    <motion.div className={cn("gradient-border", className)} {...props}>
      <div className={cn("gradient-border-inner relative", padMap[padding])}>
        {children}
      </div>
    </motion.div>
  );
}
