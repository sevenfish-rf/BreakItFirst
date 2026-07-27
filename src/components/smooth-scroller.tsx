"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { useGSAP } from "@gsap/react";

/**
 * GSAP ScrollSmoother wrapper.
 *
 * Adds a smooth-scrolling effect to the entire page using GSAP's native-scroll
 * approach (no fake scrollbars, no touch/pointer hijacking).
 *
 * Usage: wrap page content inside this component. Fixed/sticky elements
 * (e.g. the navigation bar) should be placed **outside** this wrapper
 * since ScrollSmoother translates the content div.
 *
 * Note: ScrollSmoother is a GSAP Club plugin. The npm `gsap` package
 * includes a trial that works on localhost. For production, install
 * `@gsap/shockingly` with a Club GSAP license.
 */

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
}

export function SmoothScroller({ children }: { children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Disable on touch devices for better native UX
      if (ScrollTrigger.isTouch === 1) return;

      ScrollSmoother.create({
        wrapper: wrapperRef.current!,
        content: contentRef.current!,
        smooth: 1.2,
        effects: true,
        smoothTouch: false,
      });
    },
    { scope: wrapperRef },
  );

  return (
    <div id="smooth-wrapper" ref={wrapperRef}>
      <div id="smooth-content" ref={contentRef}>
        {children}
      </div>
    </div>
  );
}
