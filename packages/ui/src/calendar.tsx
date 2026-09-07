"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cx, focusRing } from "./utils";

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
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(Date.UTC(2024, 0, 1 + i))),
    );
  }, [intlLocale]);

  function dayStateFor(iso: string): DayState & { selectable: boolean } {
    const state = days?.[iso];
    const withinBounds =
      toUtc(iso).getTime() >= toUtc(floor).getTime() &&
      (!maxDate || toUtc(iso).getTime() <= toUtc(maxDate).getTime());

    if (!state) {
      return {
        availableQuantity: 0,
        isAvailable: false,
        isBlackedOut: false,
        selectable: false,
      };
    }

    return {
      ...state,
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
    <div className={cx("select-none", className)}>
      <div className="mb-3 flex items-center justify-between">
        <CalendarNavButton
          direction="prev"
          disabled={!canGoBack}
          onClick={() => shiftMonth(-1)}
        />
        <div className="flex flex-1 justify-around px-2">
          {Array.from({ length: months }, (_, i) => (
            <p key={i} className="text-sm font-semibold capitalize">
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

      <div className={cx("grid gap-6", months > 1 ? "sm:grid-cols-2" : null)}>
        {Array.from({ length: months }, (_, monthOffset) => {
          const monthStart = startOfMonth(addMonths(cursorMonth, monthOffset));
          const blanks = leadingBlanks(monthStart);
          const total = daysInMonth(monthStart);

          return (
            <div key={monthOffset}>
              <div className="mb-1 grid grid-cols-7 gap-0.5">
                {weekdayLabels.map((label) => (
                  <div
                    key={label}
                    className="py-1 text-center text-[11px] font-medium uppercase text-[var(--color-muted-foreground,#94a3b8)]"
                  >
                    {label.slice(0, 2)}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: blanks }, (_, i) => (
                  <div key={`blank-${i}`} />
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

      {legend ?? <CalendarLegend />}
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
  state: DayState & { selectable: boolean };
  value: DateRangeValue;
  onSelect: (iso: string) => void;
}) {
  const isStart = value.start === iso;
  const isEnd = value.end === iso;
  const inRange = Boolean(value.start && value.end && between(iso, value.start, value.end));
  const isEdge = isStart || isEnd;

  const label = state.isBlackedOut
    ? "unavailable, blocked"
    : !state.isAvailable
      ? "unavailable"
      : `${state.availableQuantity} available`;

  return (
    <button
      type="button"
      disabled={!state.selectable}
      onClick={() => onSelect(iso)}
      aria-label={`${iso} — ${label}`}
      aria-pressed={isEdge || inRange}
      className={cx(
        "relative flex h-10 flex-col items-center justify-center rounded-md text-[13px] transition-colors",
        focusRing,
        isEdge
          ? "bg-[var(--color-primary,#0f766e)] font-semibold text-white"
          : inRange
            ? "bg-[var(--color-primary,#0f766e)]/12 text-[var(--color-foreground,#0f172a)]"
            : state.selectable
              ? "hover:bg-[var(--color-muted,#f1f5f9)]"
              : null,
        !state.selectable && !isEdge
          ? cx(
              "cursor-not-allowed text-[var(--color-muted-foreground,#cbd5e1)]",
              state.isBlackedOut ? "bg-[repeating-linear-gradient(45deg,#f8fafc,#f8fafc_3px,#e2e8f0_3px,#e2e8f0_6px)]" : null,
            )
          : null,
      )}
    >
      <span>{dayNumber}</span>
      {state.selectable && state.availableQuantity <= 2 ? (
        <span
          className={cx(
            "text-[10px] leading-none",
            isEdge ? "text-white/80" : "text-amber-600",
          )}
        >
          {state.availableQuantity} left
        </span>
      ) : null}
    </button>
  );
}

export function CalendarLegend() {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-[var(--color-muted-foreground,#64748b)]">
      <LegendItem className="bg-[var(--color-primary,#0f766e)]">Selected</LegendItem>
      <LegendItem className="bg-[var(--color-primary,#0f766e)]/12">In range</LegendItem>
      <LegendItem className="bg-[repeating-linear-gradient(45deg,#f8fafc,#f8fafc_3px,#e2e8f0_3px,#e2e8f0_6px)]">
        Blocked
      </LegendItem>
      <LegendItem className="bg-slate-100">Fully booked</LegendItem>
    </ul>
  );
}

function LegendItem({ className, children }: { className: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cx("h-3 w-3 rounded border border-[var(--color-border,#e2e8f0)]", className)}
      />
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
        "rounded-md p-1.5 text-[var(--color-muted-foreground,#64748b)] transition-colors hover:bg-[var(--color-muted,#f1f5f9)] disabled:pointer-events-none disabled:opacity-30",
        focusRing,
      )}
    >
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d={direction === "prev" ? "M12 4 6 10l6 6" : "m8 4 6 6-6 6"}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
