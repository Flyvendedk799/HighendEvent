"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Reveals its children once, when they first come into view. Things arrive from below because
 * that is the direction the page came from — nothing here bounces, and nothing decorates.
 *
 * The resting state is the visible one, so a browser without IntersectionObserver, a crawler, or
 * a reader with motion switched off gets the content rather than an empty box.
 */
export function Reveal({
  children,
  delayMs = 0,
  className,
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setShown(false);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setShown(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(18px)",
        transition:
          "opacity 520ms ease, transform 760ms cubic-bezier(0.16,1,0.3,1)",
        transitionDelay: `${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}
