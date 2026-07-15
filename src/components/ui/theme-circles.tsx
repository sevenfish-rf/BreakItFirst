"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

/** Compact circle swatches to switch themes */
export function ThemeCircles({ className }: { className?: string }) {
  const { themeId, themes, setThemeId } = useTheme();

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      role="group"
      aria-label="Theme"
    >
      {themes.map((theme) => {
        const active = themeId === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            title={theme.label}
            aria-label={theme.label}
            aria-pressed={active}
            onClick={() => setThemeId(theme.id)}
            className={cn(
              "relative h-5 w-5 rounded-full transition-transform duration-200",
              "hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
              active && "scale-110",
            )}
            style={{
              background: `radial-gradient(circle at 30% 30%, #fff8, transparent 45%), ${theme.swatch}`,
              boxShadow: active
                ? `0 0 0 2px #070708, 0 0 0 3.5px ${theme.swatch}, 0 0 12px ${theme.swatch}99`
                : `0 0 0 1px rgba(255,255,255,0.12) inset`,
            }}
          >
            {active && (
              <motion.span
                layoutId="theme-ring"
                className="pointer-events-none absolute -inset-0.5 rounded-full"
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
