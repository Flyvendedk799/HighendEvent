"use client";

import { useId, useState, type ReactNode } from "react";
import { cx } from "@rentora/ui";

/**
 * Charts for the operations console.
 *
 * The palette is deliberately NOT the tenant brand: these live in the neutral admin surface,
 * and a tenant who picks a pale yellow primary must not end up with unreadable charts. One
 * validated blue carries every single-series magnitude chart; the funnel uses an ordinal ramp
 * of the same hue. Text always wears text tokens, never the series colour.
 */
const SERIES = "#2a78d6";
const SERIES_SOFT = "#cde2fb";
const FUNNEL_STEPS = ["#2a78d6", "#5598e7", "#86b6ef"];

export type Point = { label: string; value: number; caption?: string };

function niceMax(values: number[]): number {
  const max = Math.max(...values, 0);
  if (max === 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / magnitude) * magnitude;
}

/**
 * Vertical bars for a value over discrete time buckets.
 * Bars are anchored to the baseline with rounded tops and a 2px gap between them.
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
              className="border-t border-dashed border-[var(--color-border)]/70"
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
                  className="w-full rounded-t transition-opacity"
                  style={{
                    height: `${Math.max(pct, point.value > 0 ? 1.5 : 0)}%`,
                    background: hovered === null || hovered === index ? SERIES : SERIES_SOFT,
                  }}
                />
                {hovered === index ? (
                  <Tooltip>
                    <strong>{format(point.value)}</strong>
                    <span className="block text-[var(--color-muted-foreground)]">
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
              "flex-1 text-center text-[10px]",
              // Only every other label on a crowded axis, so nothing collides.
              points.length > 8 && index % 2 === 1 ? "invisible" : null,
              hovered === index
                ? "font-medium text-[var(--color-foreground)]"
                : "text-[var(--color-muted-foreground)]",
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
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{point.label}</span>
            <span className="shrink-0 tabular font-medium">{format(point.value)}</span>
          </div>
          <div
            className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--color-muted)]"
            role="img"
            aria-label={`${point.label}: ${format(point.value)}${
              trackLabel ? ` of ${trackLabel}` : ""
            }`}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((point.value / max) * 100, point.value > 0 ? 2 : 0)}%`,
                background: SERIES,
              }}
            />
          </div>
          {point.caption ? (
            <p className="mt-0.5 text-[11px] text-[var(--color-muted-foreground)]">
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
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span>{stage.label}</span>
              <span className="tabular font-medium">
                {stage.value}
                {index > 0 ? (
                  <span className="ml-1.5 text-xs font-normal text-[var(--color-muted-foreground)]">
                    {(share * 100).toFixed(0)}%
                  </span>
                ) : null}
              </span>
            </div>
            <div className="mt-1 h-6 w-full rounded bg-[var(--color-muted)]">
              <div
                className="flex h-full items-center rounded px-2 text-[11px] font-medium text-white"
                style={{
                  width: `${Math.max(share * 100, stage.value > 0 ? 6 : 0)}%`,
                  background: FUNNEL_STEPS[Math.min(index, FUNNEL_STEPS.length - 1)],
                }}
              >
                {share > 0.18 ? stage.value : null}
              </div>
            </div>
            {stage.hint ? (
              <p className="mt-0.5 text-[11px] text-[var(--color-muted-foreground)]">
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
        className="text-xs font-medium text-[var(--color-primary)] hover:underline"
      >
        {open ? "Hide the numbers" : "Show the numbers"}
      </button>

      <div id={id} hidden={!open} className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {columns.map((column, i) => (
                <th
                  key={column}
                  scope="col"
                  className={cx(
                    "py-1.5 font-medium text-[var(--color-muted-foreground)]",
                    i === 0 ? "text-left" : "text-right",
                  )}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={cx("py-1.5 tabular", j === 0 ? "text-left" : "text-right")}
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
      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-left text-[11px] shadow-lg"
    >
      {children}
    </span>
  );
}

function ChartEmpty({ label, height }: { label: string; height: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] text-sm text-[var(--color-muted-foreground)]"
      style={{ height }}
    >
      {label}
    </div>
  );
}
