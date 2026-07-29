"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Split a highlighted mark element into line spans if it wraps onto multiple lines.
 * Returns an array of elements to animate (either 1 mark, or 2+ line spans).
 */
function prepareHighlightLines(mark: HTMLElement): HTMLElement[] {
  const fullText = mark.textContent || "";
  const words = fullText.trim().split(/\s+/);
  if (words.length <= 1) return [mark];

  const highlightAttr = mark.getAttribute("data-highlight") || "background";

  // Temporarily insert word spans to measure line breaks
  mark.innerHTML = "";
  const wordSpans: HTMLSpanElement[] = words.map((w, i) => {
    const span = document.createElement("span");
    span.textContent = w + (i < words.length - 1 ? " " : "");
    mark.appendChild(span);
    return span;
  });

  const lineTexts: string[] = [];
  let currentLine = "";
  let currentTop = -1;

  wordSpans.forEach((span) => {
    const top = Math.round(span.getBoundingClientRect().top);
    if (currentTop === -1) {
      currentTop = top;
      currentLine = span.textContent || "";
    } else if (Math.abs(top - currentTop) < 6) {
      currentLine += span.textContent || "";
    } else {
      lineTexts.push(currentLine.trimEnd());
      currentTop = top;
      currentLine = span.textContent || "";
    }
  });
  if (currentLine) lineTexts.push(currentLine);

  mark.innerHTML = "";

  if (lineTexts.length <= 1) {
    // Single line phrase: 1 single sweep animation!
    mark.textContent = fullText;
    return [mark];
  } else {
    // Multi-line phrase: 1 sweep for Line 1, 1 sweep for Line 2 sequentially!
    const lineElements = lineTexts.map((text, idx) => {
      const lineSpan = document.createElement("span");
      lineSpan.className = "hl-line";
      lineSpan.setAttribute("data-highlight", highlightAttr);
      lineSpan.textContent = text + (idx < lineTexts.length - 1 ? " " : "");
      mark.appendChild(lineSpan);
      return lineSpan;
    });
    return lineElements;
  }
}

export function ScrollHighlight() {
  useGSAP(() => {
    if (typeof window === "undefined") return;

    const raf = requestAnimationFrame(() => {
      const marks = gsap.utils.toArray<HTMLElement>(".text-highlight");

      marks.forEach((mark) => {
        const targets = prepareHighlightLines(mark);

        gsap.fromTo(
          targets,
          { backgroundSize: "0% 100%" },
          {
            backgroundSize: "100% 100%",
            duration: 1.2,
            stagger: 1.12, // 30% slower: Line 1 completes fully at 1.2s, then Line 2 sweeps at exact same speed
            ease: "power2.out",
            scrollTrigger: {
              trigger: mark,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });

      ScrollTrigger.refresh();
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  return null;
}
