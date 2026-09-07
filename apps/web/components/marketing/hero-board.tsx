"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LiveDot, OccupancyBoard, countBars, type BoardRow } from "@rentora/ui";

/**
 * A sample week, shown at the size and density the real console runs at. It is illustrative and
 * says so in the header: the product's rule is that a board never shows invented numbers, and a
 * marketing page borrowing the board has to keep that promise where a visitor can read it.
 */
const SAMPLE_WEEK: BoardRow[] = [
  {
    id: "tnt-06",
    code: "TNT-06",
    name: "Stretch tent 6×12",
    bars: [
      { id: "b1", label: "Holm wedding", start: 0, span: 3 },
      { id: "b2", label: "Nordic Party", start: 4, span: 3 },
    ],
  },
  {
    id: "flr-01",
    code: "FLR-01",
    name: "Dancefloor 36m²",
    bars: [
      { id: "b3", label: "prep + clean", start: 1, span: 2, tone: "quiet" },
      { id: "b4", label: "Lumen AV", start: 3, span: 4 },
    ],
  },
  {
    id: "snd-12",
    code: "SND-12",
    name: "PA stack 2kW",
    bars: [
      { id: "b5", label: "Bech 40yr", start: 0, span: 2, tone: "warn" },
      { id: "b6", label: "Garden Events", start: 5, span: 2 },
    ],
  },
  {
    id: "lgt-04",
    code: "LGT-04",
    name: "Festoon 50m",
    bars: [{ id: "b7", label: "Rådhus gala", start: 2, span: 5 }],
  },
  {
    id: "frn-22",
    code: "FRN-22",
    name: "Bar unit, oak",
    bars: [
      { id: "b8", label: "return", start: 0, span: 1, tone: "quiet" },
      { id: "b9", label: "Vega launch", start: 2, span: 2 },
      { id: "b10", label: "hold", start: 6, span: 1, tone: "warn" },
    ],
  },
  {
    id: "htr-03",
    code: "HTR-03",
    name: "Patio heater ×8",
    bars: [{ id: "b11", label: "Kastrup expo", start: 3, span: 3 }],
  },
  {
    id: "tbl-09",
    code: "TBL-09",
    name: "Trestle table ×40",
    bars: [
      { id: "b12", label: "Holm wedding", start: 1, span: 3 },
      { id: "b13", label: "Amager fest", start: 5, span: 2 },
    ],
  },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TOTAL_BARS = countBars(SAMPLE_WEEK);

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * The hero is one sticky stage the page scrolls *through*, in three acts: the claim recedes, the
 * board arrives, the board fills. Scroll drives a target, and a frame loop eases the current
 * value toward it — binding transforms straight to scrollY makes every wheel notch a jolt, and
 * on a trackpad it reads as stutter rather than weight.
 */
export function HeroBoard() {
  const trackRef = useRef<HTMLElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const boardWrapRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLElement[]>([]);

  const [revealed, setRevealed] = useState(0);
  const [linesIn, setLinesIn] = useState(false);
  const revealedRef = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // With motion off, the hero is simply its finished state — nothing is lost but the timing.
    if (reduced) {
      setLinesIn(true);
      setRevealed(TOTAL_BARS);
      if (boardWrapRef.current) boardWrapRef.current.style.opacity = "1";
      return;
    }

    const raf = requestAnimationFrame(() => setLinesIn(true));

    let target = 0;
    let cur = 0;
    let ticking = false;
    let frameHandle = 0;

    const frame = () => {
      cur += (target - cur) * 0.12;
      if (Math.abs(target - cur) < 0.0004) cur = target;
      const p = cur;

      // Act 1 — the claim recedes.
      const out = ease(seg(p, 0.1, 0.3));
      if (typeRef.current) {
        typeRef.current.style.transform = `translate3d(0, ${-70 * out}px, 0) scale(${1 - 0.09 * out})`;
        typeRef.current.style.opacity = String(1 - out);
        typeRef.current.style.filter = out > 0.001 ? `blur(${5 * out}px)` : "";
      }
      if (hintRef.current) hintRef.current.style.opacity = String(1 - ease(seg(p, 0.02, 0.12)));

      for (const el of parallaxRef.current) {
        const k = Number(el.dataset.parallax ?? 0);
        el.style.transform = `translate3d(0, ${-p * 620 * k}px, 0)`;
      }
      if (gridRef.current) {
        gridRef.current.style.transform = `translate3d(0, ${-p * 190}px, 0) scale(${1 + p * 0.22})`;
      }
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(-50%, -50%) scale(${0.72 + p * 0.75})`;
      }

      // Act 2 — the board arrives, and tilts away again on the way out.
      const inB = ease(seg(p, 0.2, 0.4));
      const tilt = ease(seg(p, 0.7, 0.94));
      if (boardWrapRef.current) boardWrapRef.current.style.opacity = String(inB);
      if (boardRef.current) {
        const scale = 0.9 + 0.1 * inB - 0.06 * tilt;
        boardRef.current.style.transform =
          `perspective(1600px) rotateX(${(1 - inB) * 12 + tilt * 18}deg) ` +
          `translate3d(0, ${(1 - inB) * 56 - tilt * 26}px, 0) scale(${scale})`;
      }

      // Act 3 — the week fills in. Only re-render when the bar count actually changes.
      const next = Math.round(seg(p, 0.34, 0.74) * TOTAL_BARS);
      if (next !== revealedRef.current) {
        revealedRef.current = next;
        setRevealed(next);
      }

      if (captionRef.current) {
        const c = ease(seg(p, 0.76, 0.92));
        captionRef.current.style.opacity = String(c);
        captionRef.current.style.transform = `translate3d(0, ${16 - 16 * c}px, 0)`;
      }

      if (Math.abs(target - cur) > 0.0004) {
        frameHandle = requestAnimationFrame(frame);
      } else {
        ticking = false;
      }
    };

    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const total = track.offsetHeight - window.innerHeight;
      target = clamp(-rect.top / (total || 1), 0, 1);
      if (!ticking) {
        ticking = true;
        frameHandle = requestAnimationFrame(frame);
      }
    };

    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    measure();

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(frameHandle);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const collectParallax = (el: HTMLElement | null) => {
    if (el && !parallaxRef.current.includes(el)) parallaxRef.current.push(el);
  };

  return (
    <section ref={trackRef} className="relative h-[520vh]">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <div
          ref={gridRef}
          aria-hidden="true"
          className="absolute -inset-[25%] bg-field bg-[length:64px_64px] will-change-transform"
        />
        <div
          ref={glowRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[38%] h-[min(120vw,1300px)] w-[min(120vw,1300px)] -translate-x-1/2 -translate-y-1/2 will-change-transform"
          style={{
            background:
              "radial-gradient(circle, rgba(215,255,62,0.14), rgba(215,255,62,0.03) 42%, transparent 66%)",
          }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-scan" />

        {/* Act 1 — the claim */}
        <div
          ref={typeRef}
          className="absolute inset-x-0 mx-auto flex h-full max-w-measure flex-col justify-center px-gutter will-change-transform"
        >
          <p
            ref={collectParallax}
            data-parallax="0.24"
            className="font-mono text-[11px] uppercase tracking-[0.24em] text-signal will-change-transform"
          >
            Rental operations, alarent
          </p>
          <h1 className="mt-6 text-[clamp(48px,9.4vw,142px)] font-semibold leading-[0.88] tracking-[-0.05em]">
            <HeroLine index={0} shown={linesIn} parallax={0.06} innerRef={collectParallax}>
              Every crate.
            </HeroLine>
            <HeroLine index={1} shown={linesIn} parallax={0.13} innerRef={collectParallax}>
              Every hour.
            </HeroLine>
            <HeroLine index={2} shown={linesIn} parallax={0.2} muted innerRef={collectParallax}>
              Accounted for.
            </HeroLine>
          </h1>
          <p
            ref={collectParallax}
            data-parallax="0.3"
            className="mt-7 max-w-[50ch] text-[17px] leading-relaxed text-paper-dim will-change-transform"
          >
            alarent runs event-equipment rental the way an airline runs gates. Stock, buffers,
            delivery and money on one board — and the board is never wrong.
          </p>
          <div ref={collectParallax} data-parallax="0.36" className="mt-9 flex flex-wrap gap-2.5">
            <Link
              href="/signup"
              className="bg-signal px-6 py-4 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-signal-ink transition-colors duration-instant hover:bg-signal-press"
            >
              Start free →
            </Link>
            <a
              href="#surfaces"
              className="border border-line-strong px-6 py-4 font-mono text-[12px] uppercase tracking-[0.14em] text-paper transition-colors duration-instant hover:border-signal hover:text-signal"
            >
              See the board
            </a>
          </div>
        </div>

        {/* Act 2 — the board */}
        <div
          ref={boardWrapRef}
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 pb-10 pt-[88px] opacity-0 [perspective:1600px]"
        >
          <div
            ref={boardRef}
            className="w-[min(1180px,100%)] shadow-lift will-change-transform [transform-style:preserve-3d]"
          >
            <div className="flex items-center justify-between border border-b-0 border-line-raised bg-ink-raised px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-paper-mute">
              <span className="flex items-center gap-2">
                <LiveDot />
                Occupancy — sample week
              </span>
              <span className="tabular-nums">
                {revealed} booking{revealed === 1 ? "" : "s"}
              </span>
            </div>
            <div className="relative overflow-hidden">
              <OccupancyBoard
                columns={DAYS}
                rows={SAMPLE_WEEK}
                revealCount={revealed}
                density="store"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-16 animate-sweep bg-gradient-to-r from-transparent via-[rgba(215,255,62,0.09)] to-transparent"
              />
            </div>
          </div>
        </div>

        {/* Act 3 — the point of it */}
        <div
          ref={captionRef}
          className="absolute inset-x-0 bottom-[8vh] px-gutter text-center opacity-0 will-change-transform"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-signal">
            One board. Storefront and warehouse.
          </p>
          <p className="mx-auto mt-3.5 max-w-[46ch] text-[15px] leading-relaxed text-paper-dim">
            The same occupancy your customer sees when they pick a date is the one your crew loads
            the van from.
          </p>
        </div>

        <div
          ref={hintRef}
          aria-hidden="true"
          className="absolute bottom-6 left-gutter font-mono text-[10px] uppercase tracking-[0.18em] text-paper-faint"
        >
          Scroll ↓
        </div>
      </div>
    </section>
  );
}

/**
 * A heading line that rolls up out of its own overflow. The padding/negative-margin pair gives
 * descenders room to exist without the mask clipping them.
 */
function HeroLine({
  children,
  index,
  shown,
  parallax,
  muted,
  innerRef,
}: {
  children: React.ReactNode;
  index: number;
  shown: boolean;
  parallax: number;
  muted?: boolean;
  innerRef: (el: HTMLElement | null) => void;
}) {
  return (
    <span className="-mb-[0.16em] block overflow-hidden pb-[0.16em]">
      <span
        ref={innerRef}
        data-parallax={parallax}
        className={muted ? "block text-paper-mute will-change-transform" : "block will-change-transform"}
        style={{
          transform: shown ? "translateY(0)" : "translateY(102%)",
          transition: "transform 1100ms cubic-bezier(0.16,1,0.3,1)",
          transitionDelay: `${120 + index * 130}ms`,
        }}
      >
        {children}
      </span>
    </span>
  );
}
