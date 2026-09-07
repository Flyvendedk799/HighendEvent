"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cx, focusRing, monoLabel } from "./utils";

export type DayState = {
  /** Units still bookable on this day, after buffers and existing bookings. */
  availableQuantity: number;
  isAvailable: boolean;
  isBlackedOut: boolean;
  /** True when the day is only blocked because of a neighbouring booking prep/cleanup window. */
  isBuffer?: boolean;
};

export type DateRangeValue = { start: string | null; end: string | null };

export type CalendarProps = {
  /** ISO yyyy-mm-dd keys. Missing days are treated as unknown and rendered unavailable. */
  days?: Record<string, DayState>;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  /** How many quantity units the shopper wants; a day with fewer is not selectable. */
  quantity?: number;
  /** First month shown, as yyyy-mm-dd. Defaults to today. */
  initialMonth?: string;
  months?: number;
  minDate?: string;
  maxDate?: string;
  locale?: string;
  /** Called when the visible window changes, so the host can fetch more availability. */
  onMonthChange?: (firstVisibleMonthIso: string) => void;
  className?: string;
  legend?: ReactNode;
};

const MS_DAY = 86_400_000;

function toUtc(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
}

function isoOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function todayIso(): string {
  return isoOf(new Date());
}

function addMonths(iso: string, count: number): string {
  const d = toUtc(iso);
  return isoOf(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + count, 1)));
}

function startOfMonth(iso: string): Date {
  const d = toUtc(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Monday-first grid: the whole product is European-first and staff read weeks that way. */
function leadingBlanks(monthStart: Date): number {
  return (monthStart.getUTCDay() + 6) % 7;
}

function daysInMonth(monthStart: Date): number {
  return new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0),
  ).getUTCDate();
}

function between(iso: string, start: string, end: string): boolean {
  const t = toUtc(iso).getTime();
  return t >= toUtc(start).getTime() && t <= toUtc(end).getTime();
}

export function eachIsoDate(start: string, end: string): string[] {
  const out: string[] = [];
  let cursor = toUtc(start).getTime();
  const last = toUtc(end).getTime();
  while (cursor <= last) {
    out.push(isoOf(new Date(cursor)));
    cursor += MS_DAY;
  }
  return out;
}

/**
 * The availability grid. Every cell says what it is in a word as well as a colour — "out",
 * "buffer", "1 left" — because the difference between "someone has it" and "we are cleaning it"
 * is the difference between a lost sale and a phone call.
 */
export function Calendar({
  days,
  value,
  onChange,
  quantity = 1,
  initialMonth,
  months = 1,
  minDate,
  maxDate,
  locale = "en",
  onMonthChange,
  className,
  legend,
}: CalendarProps) {
  const [cursorMonth, setCursorMonth] = useState(
    () => isoOf(startOfMonth(initialMonth ?? value.start ?? todayIso())),
  );

  const intlLocale = locale === "da" ? "da-DK" : "en-GB";
  const floor = minDate ?? todayIso();

  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(intlLocale, { weekday: "short", timeZone: "UTC" });
    // 2024-01-01 was a Monday.
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 1 + i))));
  }, [intlLocale]);

  type ResolvedDay = DayState & { selectable: boolean; known: boolean };

  function dayStateFor(iso: string): ResolvedDay {
    const state = days?.[iso];
    const withinBounds =
      toUtc(iso).getTime() >= toUtc(floor).getTime() &&
      (!maxDate || toUtc(iso).getTime() <= toUtc(maxDate).getTime());

    /*
     * A day we have no answer for is not a booked day. Yesterday, and any month past the fetched
     * window, arrive here — and painting them the same red as "someone has it" would tell the
     * shopper their dates are gone when the truth is that we simply have not looked yet.
     */
    if (!state) {
      return {
        availableQuantity: 0,
        isAvailable: false,
        isBlackedOut: false,
        selectable: false,
        known: false,
      };
    }

    return {
      ...state,
      known: true,
      selectable: withinBounds && state.isAvailable && state.availableQuantity >= quantity,
    };
  }

  function handleSelect(iso: string) {
    // First click sets the start; second click closes the range; a third starts over.
    if (!value.start || (value.start && value.end)) {
      onChange({ start: iso, end: null });
      return;
    }

    if (toUtc(iso).getTime() < toUtc(value.start).getTime()) {
      onChange({ start: iso, end: null });
      return;
    }

    // Refuse a range that spans a day the shopper cannot have.
    const blocked = eachIsoDate(value.start, iso).find((d) => !dayStateFor(d).selectable);
    if (blocked) {
      onChange({ start: iso, end: null });
      return;
    }

    onChange({ start: value.start, end: iso });
  }

  function shiftMonth(delta: number) {
    const next = addMonths(cursorMonth, delta);
    setCursorMonth(next);
    onMonthChange?.(next);
  }

  const canGoBack = toUtc(cursorMonth).getTime() > startOfMonth(floor).getTime();

  return (
    <div className={cx("select-none border border-line bg-ink-raised", className)}>
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <CalendarNavButton direction="prev" disabled={!canGoBack} onClick={() => shiftMonth(-1)} />
        <div className="flex flex-1 justify-around px-2">
          {Array.from({ length: months }, (_, i) => (
            <p key={i} className={cx("text-[10px] text-paper-dim", monoLabel)}>
              {new Intl.DateTimeFormat(intlLocale, {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(startOfMonth(addMonths(cursorMonth, i)))}
            </p>
          ))}
        </div>
        <CalendarNavButton direction="next" onClick={() => shiftMonth(1)} />
      </div>

      <div className={cx("grid", months > 1 ? "sm:grid-cols-2 sm:divide-x sm:divide-line" : null)}>
        {Array.from({ length: months }, (_, monthOffset) => {
          const monthStart = startOfMonth(addMonths(cursorMonth, monthOffset));
          const blanks = leadingBlanks(monthStart);
          const total = daysInMonth(monthStart);

          return (
            <div key={monthOffset}>
              <div className="grid grid-cols-7 border-b border-line">
                {weekdayLabels.map((label) => (
                  <div
                    key={label}
                    className={cx(
                      "border-l border-line-soft py-2 text-center text-[9.5px] text-paper-faint first:border-l-0",
                      monoLabel,
                    )}
                  >
                    {label.slice(0, 3)}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: blanks }, (_, i) => (
                  <div
                    key={`blank-${i}`}
                    className="aspect-[1/0.86] border-b border-l border-line-soft bg-ink-sunk"
                  />
                ))}
                {Array.from({ length: total }, (_, i) => {
                  const date = new Date(
                    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), i + 1),
                  );
                  const iso = isoOf(date);
                  return (
                    <CalendarDay
                      key={iso}
                      iso={iso}
                      dayNumber={i + 1}
                      state={dayStateFor(iso)}
                      value={value}
                      onSelect={handleSelect}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {legend === null ? null : (legend ?? <CalendarLegend />)}
    </div>
  );
}

function CalendarDay({
  iso,
  dayNumber,
  state,
  value,
  onSelect,
}: {
  iso: string;
  dayNumber: number;
  state: DayState & { selectable: boolean; known: boolean };
  value: DateRangeValue;
  onSelect: (iso: string) => void;
}) {
  const isStart = value.start === iso;
  const isEnd = value.end === iso;
  const inRange = Boolean(value.start && value.end && between(iso, value.start, value.end));
  const isEdge = isStart || isEnd;
  const picked = isEdge || inRange;

  const lowStock = state.selectable && state.availableQuantity <= 2;
  const bookedOut = state.known && (state.isBlackedOut || !state.isAvailable) && !state.isBuffer;

  // Word first, colour second — the tag is what makes the cell readable without the legend.
  const tag = !state.known
    ? ""
    : state.isBlackedOut
      ? "out"
      : state.isBuffer
        ? "buffer"
        : !state.isAvailable || state.availableQuantity === 0
          ? "out"
          : state.selectable
            ? state.availableQuantity <= 2
              ? `${state.availableQuantity} left`
              : String(state.availableQuantity)
            : "held";

  const label = !state.known
    ? "not bookable"
    : state.isBlackedOut
      ? "unavailable, blocked"
      : state.isBuffer
        ? "unavailable, prep or cleanup buffer"
        : !state.isAvailable
          ? "unavailable"
          : `${state.availableQuantity} available`;

  return (
    <button
      type="button"
      disabled={!state.selectable}
      onClick={() => onSelect(iso)}
      aria-label={`${iso} — ${label}`}
      aria-pressed={picked}
      className={cx(
        "relative flex aspect-[1/0.86] flex-col items-start justify-between border-b border-l border-line-soft px-2 py-1.5 text-left font-mono text-[12px] transition-colors duration-instant",
        picked
          ? "bg-signal text-signal-ink"
          : !state.known
            ? // Nothing known about this day: inert, and it says nothing rather than "booked".
              "cursor-not-allowed bg-ink-sunk text-paper-ghost"
            : bookedOut
              ? "cursor-not-allowed bg-danger-tint text-[#FF8A72]"
              : state.isBuffer
                ? "cursor-not-allowed bg-[rgba(237,238,234,0.05)] text-paper-mute"
                : lowStock
                  ? "bg-[rgba(255,176,32,0.16)] text-warn hover:bg-[rgba(255,176,32,0.26)]"
                  : state.selectable
                    ? "text-paper-soft hover:bg-ink-hover"
                    : "cursor-not-allowed text-paper-ghost",
        // The edges of the range get a hard outline so the boundary is unmistakable.
        isEdge ? "outline outline-2 -outline-offset-2 outline-signal" : null,
        focusRing,
      )}
    >
      <span className="tabular-nums">{dayNumber}</span>
      <span className="text-[8.5px] uppercase tracking-[0.1em] opacity-75">{tag}</span>
    </button>
  );
}

export function CalendarLegend({ className }: { className?: string }) {
  return (
    <ul
      className={cx(
        "flex flex-wrap gap-x-4 gap-y-2 border-t border-line px-3 py-3 text-[9.5px] text-paper-faint",
        monoLabel,
        className,
      )}
    >
      <LegendItem className="bg-signal border-signal-line">Free</LegendItem>
      <LegendItem className="bg-[rgba(255,176,32,0.28)] border-warn-line">Low</LegendItem>
      <LegendItem className="bg-[rgba(237,238,234,0.05)] border-line-strong">Buffer</LegendItem>
      <LegendItem className="bg-danger-tint border-danger-line">Booked</LegendItem>
    </ul>
  );
}

function LegendItem({ className, children }: { className: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className={cx("h-2.5 w-2.5 border", className)} />
      {children}
    </li>
  );
}

function CalendarNavButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Previous month" : "Next month"}
      className={cx(
        "border border-line-strong p-1.5 text-paper-dim transition-colors duration-instant",
        "hover:border-signal hover:text-signal disabled:pointer-events-none disabled:border-line disabled:text-paper-ghost",
        focusRing,
      )}
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d={direction === "prev" ? "M12 4 6 10l6 6" : "m8 4 6 6-6 6"}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
        />
      </svg>
    </button>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Occupancy board                                                                               */
/* ------------------------------------------------------------------------------------------- */

export type BoardTone = "signal" | "warn" | "danger" | "quiet";

export type BoardBar = {
  id: string;
  label: string;
  /** Column index the bar starts on, 0-based. */
  start: number;
  /** How many columns it spans. Clamped to the board width. */
  span: number;
  tone?: BoardTone;
  href?: string;
  title?: string;
};

export type BoardRow = {
  id: string;
  /** Short machine identifier — SKU, ref, plate. Rendered in mono ahead of the name. */
  code?: string;
  name: string;
  bars: BoardBar[];
};

export type OccupancyBoardProps = {
  columns: string[];
  rows: BoardRow[];
  /**
   * Fraction across the board (0–1) where "now" falls; draws the today rule. Omit outside the
   * visible window rather than clamping it to an edge, which would lie about the date.
   */
  nowFraction?: number;
  density?: "store" | "console";
  /** Rendered in place of the rows when there is nothing on the board. */
  empty?: ReactNode;
  /**
   * How many bars are currently drawn, counting left-to-right and top-to-bottom. Omit and the
   * board fills itself in on mount; pass a number and the caller drives it — that is how the
   * marketing hero has the board fill as you scroll without forking the component.
   */
  revealCount?: number;
  className?: string;
  renderLink?: (props: { href: string; className: string; children: ReactNode }) => ReactNode;
};

const barTones: Record<BoardTone, string> = {
  signal: "bg-signal-tint border-signal-line text-signal",
  warn: "bg-warn-tint border-warn-line text-warn",
  danger: "bg-danger-tint border-danger-line text-danger",
  quiet: "bg-[rgba(237,238,234,0.06)] border-line-strong text-paper-dim",
};

/**
 * The board is the product. Every other surface — the hero, the console dashboard, the resource
 * calendar — is a view onto this one primitive, with the same bars and the same colours, so the
 * occupancy a customer sees when they pick a date is the occupancy the crew loads the van from.
 *
 * Bars are positioned in percentages rather than grid spans because a booking rarely starts on a
 * column boundary once buffers are folded in, and rounding it to one would be a lie about stock.
 */
export function OccupancyBoard({
  columns,
  rows,
  nowFraction,
  density = "console",
  empty,
  revealCount,
  className,
  renderLink,
}: OccupancyBoardProps) {
  const driven = typeof revealCount === "number";
  const rowHeight = density === "store" ? "h-[42px]" : "h-[34px]";
  const headHeight = density === "store" ? "h-[30px]" : "h-[26px]";
  const barInset = density === "store" ? "top-2 h-[26px]" : "top-1.5 h-[22px]";
  const count = Math.max(1, columns.length);

  // A single running index across the whole board keeps the fill-in reading left-to-right,
  // top-to-bottom, like a board actually filling up over a week.
  let barIndex = 0;

  if (rows.length === 0 && empty) {
    return (
      <div className={cx("border border-line bg-ink p-8", className)}>{empty}</div>
    );
  }

  return (
    <div className={cx("border border-line bg-ink", className)}>
      <div className="grid grid-cols-[minmax(104px,150px)_minmax(0,1fr)] md:grid-cols-[minmax(120px,180px)_minmax(0,1fr)]">
        {/* Row headers */}
        <div className="border-r border-line">
          <div className={cx(headHeight, "border-b border-line")} />
          {rows.map((row) => (
            <div
              key={row.id}
              className={cx(
                rowHeight,
                "flex items-center gap-2 overflow-hidden whitespace-nowrap border-b border-line-soft px-3 text-[12.5px] text-paper-soft",
              )}
            >
              {row.code ? (
                <span className="shrink-0 font-mono text-[9.5px] text-paper-faint">{row.code}</span>
              ) : null}
              <span className="min-w-0 truncate">{row.name}</span>
            </div>
          ))}
        </div>

        {/* Lanes */}
        <div className="relative min-w-0 overflow-hidden">
          <div
            className={cx("grid border-b border-line", headHeight)}
            style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
          >
            {columns.map((column, i) => (
              <div
                key={`${column}-${i}`}
                className={cx(
                  "flex items-center justify-center border-l border-line-soft text-[9.5px] text-paper-mute",
                  monoLabel,
                )}
              >
                {column}
              </div>
            ))}
          </div>

          {rows.map((row) => (
            <div
              key={row.id}
              className={cx(rowHeight, "relative grid border-b border-line-soft")}
              style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
            >
              {columns.map((_, i) => (
                <span key={i} aria-hidden="true" className="border-l border-line-soft" />
              ))}

              {row.bars.map((bar) => {
                const start = Math.max(0, Math.min(count - 1, bar.start));
                const span = Math.max(1, Math.min(count - start, bar.span));
                const index = barIndex++;

                // The wrapper owns position and the fill-in; the bar itself owns the styling, so
                // a linked bar and a static one are the same object with the same hit area.
                const barClasses = cx(
                  "flex h-full w-full items-center overflow-hidden whitespace-nowrap border px-2 font-mono text-[9.5px] uppercase tracking-[0.05em]",
                  barTones[bar.tone ?? "signal"],
                  bar.href
                    ? "transition-[filter] duration-instant hover:brightness-[1.4] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal"
                    : null,
                );

                const shown = !driven || index < revealCount!;

                return (
                  <div
                    key={bar.id}
                    className={cx(
                      "absolute origin-left",
                      driven
                        ? "transition-[transform,opacity] duration-surface ease-out"
                        : "animate-bar-in",
                      barInset,
                    )}
                    style={{
                      left: `${((start / count) * 100).toFixed(3)}%`,
                      width: `${((span / count) * 100 - 0.6).toFixed(3)}%`,
                      ...(driven
                        ? { transform: shown ? "scaleX(1)" : "scaleX(0)", opacity: shown ? 1 : 0 }
                        : // The stagger is the board filling in — capped so a long list is not a slideshow.
                          { animationDelay: `${Math.min(index * 45, 900)}ms` }),
                    }}
                    title={bar.title ?? bar.label}
                  >
                    {bar.href && renderLink ? (
                      renderLink({
                        href: bar.href,
                        className: barClasses,
                        children: <span className="truncate">{bar.label}</span>,
                      })
                    ) : (
                      <div className={barClasses}>
                        <span className="truncate">{bar.label}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {typeof nowFraction === "number" && nowFraction >= 0 && nowFraction <= 1 ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 w-px bg-signal opacity-50"
              style={{ left: `${(nowFraction * 100).toFixed(3)}%`, top: density === "store" ? 30 : 26 }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** The legend for the board. Same four words as the calendar, same four colours. */
export function BoardLegend({ className }: { className?: string }) {
  return (
    <ul
      className={cx(
        "flex flex-wrap gap-x-4 gap-y-2 text-[9.5px] text-paper-faint",
        monoLabel,
        className,
      )}
    >
      <LegendItem className="bg-signal-tint border-signal-line">Booked out</LegendItem>
      <LegendItem className="bg-warn-tint border-warn-line">Unpaid hold</LegendItem>
      <LegendItem className="bg-danger-tint border-danger-line">Overdue</LegendItem>
      <LegendItem className="bg-[rgba(237,238,234,0.06)] border-line-strong">Buffer</LegendItem>
    </ul>
  );
}

/** Total bars on a board — a caller driving `revealCount` needs to know what full looks like. */
export function countBars(rows: BoardRow[]): number {
  return rows.reduce((sum, row) => sum + row.bars.length, 0);
}
