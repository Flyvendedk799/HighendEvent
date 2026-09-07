"use client";

import { useId, useState, type ReactNode } from "react";
import { cx } from "@rentora/ui";

/**
 * Charts for the operations console.
 *
 * There is one series colour and it is the signal. On near-black, magnitude reads as light, and
 * a second hue would imply a second meaning the data does not have; amber and red stay reserved
 * for money and risk so a chart can never borrow them for a category.
 *
 * These are literal rather than tenant variables: the console is not brand-themed, and staff read
 * this screen all day whatever colour a shop picked for its storefront. Text always wears text
 * tokens, never the series colour.
 */
const SERIES = "#D7FF3E";
const SERIES_SOFT = "rgba(215,255,62,0.26)";
// One hue stepped down, so stage order survives without relying on colour naming.
const FUNNEL_STEPS = ["#D7FF3E", "#AECC32", "#7D9224"];

export type Point = { label: string; value: number; caption?: string };

function niceMax(values: number[]): number {
  const max = Math.max(...values, 0);
  if (max === 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / magnitude) * magnitude;
}

/**
 * Vertical bars for a value over discrete time buckets.
 * Bars are anchored to the baseline, square, with a 2px gap between them.
 */
export function ColumnChart({
  points,
  format,
  emptyLabel = "No data for this period yet",
  height = 180,
}: {
  points: Point[];
  format: (value: number) => string;
  emptyLabel?: string;
  height?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = niceMax(points.map((p) => p.value));
  const allZero = points.every((p) => p.value === 0);

  if (points.length === 0 || allZero) {
    return <ChartEmpty label={emptyLabel} height={height} />;
  }

  return (
    <figure className="m-0">
      <div className="relative">
        {/* Recessive gridlines at the quarter marks give the eye a scale without competing. */}
        <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
          {[1, 0.75, 0.5, 0.25, 0].map((fraction) => (
            <div
              key={fraction}
              className="border-t border-dashed border-line-soft"
            />
          ))}
        </div>

        <div className="relative flex items-end gap-[2px]" style={{ height }}>
          {points.map((point, index) => {
            const pct = (point.value / max) * 100;
            return (
              <button
                key={point.label}
                type="button"
                className="group relative flex flex-1 items-end justify-center"
                style={{ height: "100%" }}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
                aria-label={`${point.label}: ${format(point.value)}`}
              >
                <span
                  className="w-full transition-opacity duration-instant"
                  style={{
                    height: `${Math.max(pct, point.value > 0 ? 1.5 : 0)}%`,
                    background: hovered === null || hovered === index ? SERIES : SERIES_SOFT,
                  }}
                />
                {hovered === index ? (
                  <Tooltip>
                    <strong>{format(point.value)}</strong>
                    <span className="block text-paper-mute">
                      {point.caption ?? point.label}
                    </span>
                  </Tooltip>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-1.5 flex gap-[2px]">
        {points.map((point, index) => (
          <span
            key={point.label}
            className={cx(
              "flex-1 text-center font-mono text-[9.5px] tabular-nums",
              // Only every other label on a crowded axis, so nothing collides.
              points.length > 8 && index % 2 === 1 ? "invisible" : null,
              hovered === index
                ? "text-paper"
                : "text-paper-faint",
            )}
          >
            {point.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

/** Horizontal bars, for categories with long names — products, in practice. */
export function BarList({
  points,
  format,
  emptyLabel = "Nothing to show yet",
  trackLabel,
}: {
  points: Point[];
  format: (value: number) => string;
  emptyLabel?: string;
  /** When set, bars are drawn against a full-width track (a share of a whole). */
  trackLabel?: string;
}) {
  const max = niceMax(points.map((p) => p.value));

  if (points.length === 0 || points.every((p) => p.value === 0)) {
    return <ChartEmpty label={emptyLabel} height={120} />;
  }

  return (
    <ul className="space-y-2.5">
      {points.map((point) => (
        <li key={point.label}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-paper-soft">{point.label}</span>
            <span className="shrink-0 font-mono text-[12.5px] tabular-nums">{format(point.value)}</span>
          </div>
          <div
            className="mt-1.5 h-1.5 w-full border border-line-soft bg-ink-hover"
            role="img"
            aria-label={`${point.label}: ${format(point.value)}${
              trackLabel ? ` of ${trackLabel}` : ""
            }`}
          >
            <div
              className="h-full"
              style={{
                width: `${Math.max((point.value / max) * 100, point.value > 0 ? 2 : 0)}%`,
                background: SERIES,
              }}
            />
          </div>
          {point.caption ? (
            <p className="mt-1 text-[11px] text-paper-faint">
              {point.caption}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Ordered stages, each narrower than the last. The ramp is one hue stepped light to dark, so
 * the ordering is legible without relying on colour naming.
 */
export function Funnel({
  stages,
}: {
  stages: Array<{ label: string; value: number; hint?: string }>;
}) {
  const first = stages[0]?.value ?? 0;

  if (first === 0) {
    return <ChartEmpty label="No activity in this window yet" height={120} />;
  }

  return (
    <ol className="space-y-2">
      {stages.map((stage, index) => {
        const share = first > 0 ? stage.value / first : 0;
        return (
          <li key={stage.label}>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span>{stage.label}</span>
              <span className="font-mono text-[12.5px] tabular-nums">
                {stage.value}
                {index > 0 ? (
                  <span className="ml-2 font-mono text-[11px] text-paper-faint">
                    {(share * 100).toFixed(0)}%
                  </span>
                ) : null}
              </span>
            </div>
            <div className="mt-1.5 h-6 w-full border border-line-soft bg-ink-hover">
              <div
                className="flex h-full items-center px-2 font-mono text-[10.5px] tabular-nums text-signal-ink"
                style={{
                  width: `${Math.max(share * 100, stage.value > 0 ? 6 : 0)}%`,
                  background: FUNNEL_STEPS[Math.min(index, FUNNEL_STEPS.length - 1)],
                }}
              >
                {share > 0.18 ? stage.value : null}
              </div>
            </div>
            {stage.hint ? (
              <p className="mt-1 text-[11px] text-paper-faint">
                {stage.hint}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Every chart on this page can be read as a table, for screen readers and for copying out. */
export function DataTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: Array<Array<ReactNode>>;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-signal hover:underline"
      >
        {open ? "Hide the numbers" : "Show the numbers"}
      </button>

      <div id={id} hidden={!open} className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-[11.5px]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line">
              {columns.map((column, i) => (
                <th
                  key={column}
                  scope="col"
                  className={cx(
                    "py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-paper-ghost",
                    i === 0 ? "text-left" : "text-right",
                  )}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={cx("py-2", j === 0 ? "text-left text-paper-soft" : "text-right font-mono tabular-nums")}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Tooltip({ children }: { children: ReactNode }) {
  return (
    <span
      role="status"
      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap border border-line-raised bg-ink-raised px-2.5 py-1.5 text-left text-[11px] shadow-panel"
    >
      {children}
    </span>
  );
}

function ChartEmpty({ label, height }: { label: string; height: number }) {
  return (
    <div
      className="flex items-center justify-center border border-dashed border-line-strong font-mono text-[10.5px] uppercase tracking-[0.14em] text-paper-faint"
      style={{ height }}
    >
      {label}
    </div>
  );
}
