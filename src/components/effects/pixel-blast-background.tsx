"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme-context";

const PixelBlast = dynamic(() => import("./PixelBlast"), {
  ssr: false,
  loading: () => null,
});

type PixelBlastBackgroundProps = {
  opacity?: number;
  className?: string;
};

export function PixelBlastBackground({
  opacity = 0.82,
  className,
}: PixelBlastBackgroundProps) {
  const { theme } = useTheme();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setEnabled(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!enabled) return null;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden pixel-blast-bg ${className ?? ""}`}
      aria-hidden
      style={{ opacity }}
    >
      <div className="absolute inset-0 h-full w-full min-h-full">
        {/* key forces WebGL re-init when theme color changes */}
        <PixelBlast
          key={theme.id}
          variant="circle"
          pixelSize={6}
          color={theme.blastColor}
          patternScale={10}
          patternDensity={1.6}
          pixelSizeJitter={1.0}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.13}
          rippleIntensityScale={1.6}
          liquid={false}
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={0.75}
          edgeFade={0.18}
          transparent
          className="h-full w-full"
          style={{ width: "100%", height: "100%", minHeight: "100vh" }}
        />
      </div>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 75% 62% at 50% 40%, transparent 0%, color-mix(in srgb, ${theme.pageBg} 55%, transparent) 65%, ${theme.pageBg} 100%)`,
        }}
      />
    </div>
  );
}
