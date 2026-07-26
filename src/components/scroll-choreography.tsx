"use client";

import { useEffect } from "react";

/**
 * Replays the concept-A scroll choreography over whatever is currently in the
 * DOM: reveal fades, cascade rail fill + step stagger, resilience bar fills,
 * likelihood marker pop, and the velocity dial arc. Re-runs when `viewKey`
 * changes (e.g. landing ⇄ report swap). Fully reduced-motion safe.
 */
export function ScrollChoreography({ viewKey }: { viewKey: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const supported = "IntersectionObserver" in window;
    const observers: IntersectionObserver[] = [];

    // rAF so the freshly-swapped view is in the DOM
    const raf = requestAnimationFrame(() => {
      const reveals = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
      const cascades = Array.from(document.querySelectorAll<HTMLElement>(".cascade"));
      const axesGroups = Array.from(document.querySelectorAll<HTMLElement>(".axes"));
      const bands = Array.from(document.querySelectorAll<HTMLElement>(".band"));
      const arcs = Array.from(document.querySelectorAll<SVGPathElement>(".velo-arc"));

      const fillBars = (axes: HTMLElement) => {
        axes.querySelectorAll<HTMLElement>(".axis").forEach((ax, idx) => {
          const v = parseInt(ax.getAttribute("data-value") || "0", 10);
          const fill = ax.querySelector<HTMLElement>(".bar-fill");
          if (!fill) return;
          window.setTimeout(
            () => {
              fill.style.width = v + "%";
            },
            reduced ? 0 : idx * 110,
          );
        });
      };
      const fireCascade = (c: HTMLElement) => {
        c.classList.add("in");
        const rail = c.querySelector<HTMLElement>(".cascade-rail");
        if (rail) rail.style.setProperty("--fill", "1");
      };
      const popMarker = (b: HTMLElement) => {
        const m = b.querySelector<HTMLElement>(".band-marker");
        if (m) m.style.setProperty("--pop", "1");
      };
      const fillArc = (a: SVGPathElement) => {
        const pct = parseFloat(a.getAttribute("data-arc") || "0.55");
        a.style.strokeDashoffset = String(188.5 * (1 - pct));
      };

      if (!supported || reduced) {
        reveals.forEach((el) => el.classList.add("in"));
        cascades.forEach(fireCascade);
        axesGroups.forEach(fillBars);
        bands.forEach(popMarker);
        arcs.forEach(fillArc);
        return;
      }

      const revealIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("in");
              revealIO.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
      );
      reveals.forEach((el) => revealIO.observe(el));
      observers.push(revealIO);

      const once = (
        els: HTMLElement[] | SVGPathElement[],
        fn: (el: HTMLElement & SVGPathElement) => void,
        threshold: number,
      ) => {
        (els as (HTMLElement & SVGPathElement)[]).forEach((el) => {
          const io = new IntersectionObserver(
            (entries) => {
              entries.forEach((e) => {
                if (e.isIntersecting) {
                  fn(e.target as HTMLElement & SVGPathElement);
                  io.disconnect();
                }
              });
            },
            { threshold },
          );
          io.observe(el);
          observers.push(io);
        });
      };

      once(cascades, (el) => fireCascade(el), 0.15);
      once(axesGroups, (el) => fillBars(el), 0.3);
      once(bands, (el) => popMarker(el), 0.4);
      once(arcs, (el) => fillArc(el), 0.4);
    });

    return () => {
      cancelAnimationFrame(raf);
      observers.forEach((o) => o.disconnect());
    };
  }, [viewKey]);

  return null;
}
