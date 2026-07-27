"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
}

export function SmoothScroller({ children }: { children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Disable on touch devices for better native mobile scrolling
      if (ScrollTrigger.isTouch === 1) return;

      // Disable lagSmoothing so GSAP doesn't skip frames during scroll interpolation
      gsap.ticker.lagSmoothing(0);

      const smoother = ScrollSmoother.create({
        wrapper: wrapperRef.current!,
        content: contentRef.current!,
        smooth: 1.2, // Returned to 1.2s while keeping 60fps GPU acceleration
        effects: true,
        smoothTouch: false,
        normalizeScroll: true,
      });

      return () => {
        smoother.kill();
      };
    },
    { scope: wrapperRef },
  );

  return (
    <div
      id="smooth-wrapper"
      ref={wrapperRef}
      style={{ overflow: "hidden", position: "fixed", width: "100%", height: "100%" }}
    >
      <div
        id="smooth-content"
        ref={contentRef}
        style={{
          willChange: "transform",
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
