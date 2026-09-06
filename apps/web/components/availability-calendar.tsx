"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  getAvailabilityCalendar,
  toIsoDate,
  type DayAvailability,
} from "@rentora/domain";
import {
  productAvailabilityInput,
  type StoreBlackout,
  type StoreOccupancy,
  type StoreProduct,
} from "@/lib/product-model";

export type DateRange = { start: string | null; end: string | null };

type Props = {
  product: StoreProduct;
  value: DateRange;
  onChange: (range: DateRange) => void;
  quantity?: number;
  bookings?: StoreOccupancy[];
  blackouts?: StoreBlackout[];
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function endOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}

function monthTitle(d: Date): string {
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

function todayIso(): string {
  return toIsoDate(new Date());
}

function inSelectedRange(date: string, start: string | null, end: string | null): boolean {
  if (!start) return false;
  const last = end ?? start;
  return date >= start && date <= last;
}

function isEndpoint(date: string, start: string | null, end: string | null): boolean {
  return Boolean(start) && (date === start || date === (end ?? start));
}

type DayStatus = "past" | "available" | "booked" | "blackout";

function resolveStatus(
  meta: DayAvailability | undefined,
  date: string,
  quantity: number,
): DayStatus {
  if (date < todayIso()) return "past";
  if (!meta || meta.isBlackedOut) return "blackout";
  if (!meta.isAvailable || meta.availableQuantity < quantity) return "booked";
  return "available";
}

export function AvailabilityCalendar({
  product,
  value,
  onChange,
  quantity = 1,
  bookings,
  blackouts,
}: Props) {
  const [cursor, setCursor] = useState(() => startOfMonthUtc(new Date()));

  const monthStart = startOfMonthUtc(cursor);
  const monthEnd = endOfMonthUtc(cursor);
  const padStart = (monthStart.getUTCDay() + 6) % 7;
  const padEnd = (7 - ((monthEnd.getUTCDay() + 6) % 7) - 1 + 7) % 7;
  const gridStart = addDays(monthStart, -padStart);
  const gridEnd = addDays(monthEnd, padEnd);
  const gridStartIso = toIsoDate(gridStart);
  const gridEndIso = toIsoDate(gridEnd);

  const effectiveBookings = bookings ?? [];
  const effectiveBlackouts = blackouts ?? [];

  const dayMap = useMemo(() => {
    const days = getAvailabilityCalendar({
      product: productAvailabilityInput(product),
      startDate: gridStartIso,
      endDate: gridEndIso,
      bookings: effectiveBookings,
      blackouts: effectiveBlackouts,
    });
    return new Map(days.map((d) => [d.date, d] as const));
  }, [product, gridStartIso, gridEndIso, effectiveBookings, effectiveBlackouts]);

  const cells: Array<{ date: string; inMonth: boolean; meta?: DayAvailability }> = [];
  for (let d = new Date(gridStart); d.getTime() <= gridEnd.getTime(); d = addDays(d, 1)) {
    const iso = toIsoDate(d);
    cells.push({
      date: iso,
      inMonth: d.getUTCMonth() === monthStart.getUTCMonth(),
      meta: dayMap.get(iso),
    });
  }

  function handleDayClick(date: string, status: DayStatus) {
    if (status !== "available") return;

    if (!value.start || (value.start && value.end && value.start !== value.end)) {
      onChange({ start: date, end: date });
      return;
    }

    if (value.start === date) {
      onChange({ start: null, end: null });
      return;
    }

    const start = date < value.start ? date : value.start;
    const end = date < value.start ? value.start : date;

    const span = getAvailabilityCalendar({
      product: productAvailabilityInput(product),
      startDate: start,
      endDate: end,
      bookings: effectiveBookings,
      blackouts: effectiveBlackouts,
    });
    const blocked = span.some(
      (day) => day.isBlackedOut || !day.isAvailable || day.availableQuantity < quantity,
    );
    if (blocked) {
      onChange({ start: date, end: date });
      return;
    }
    onChange({ start, end });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 px-5 py-6 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_85%_15%,rgba(245,158,11,0.35),transparent_42%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
              Choose dates
            </p>
            <h3 className="mt-1 font-display text-2xl font-semibold tracking-tight">
              Availability calendar
            </h3>
            <p className="mt-2 max-w-md text-sm text-white/75">
              Tap one day for a single rental day, or tap a second day to select a range. Green days
              have stock; red are fully booked; grey are closed.
            </p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-center backdrop-blur sm:min-w-[10rem]">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-white/60">
              Selected
            </div>
            <div className="mt-1 text-xs font-semibold leading-snug">
              {value.start
                ? value.end && value.end !== value.start
                  ? `${value.start} → ${value.end}`
                  : value.start
                : "None yet"}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="rounded-lg border border-border bg-muted px-3 py-1.5 text-sm font-medium hover:bg-border/50"
            onClick={() =>
              setCursor(new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - 1, 1)))
            }
          >
            ← Prev
          </button>
          <div className="font-display text-lg font-semibold">{monthTitle(monthStart)}</div>
          <button
            type="button"
            className="rounded-lg border border-border bg-muted px-3 py-1.5 text-sm font-medium hover:bg-border/50"
            onClick={() =>
              setCursor(new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1)))
            }
          >
            Next →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {WEEKDAYS.map((label) => (
            <div key={label} className="py-1">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((cell) => {
            const status = resolveStatus(cell.meta, cell.date, quantity);
            const selected = inSelectedRange(cell.date, value.start, value.end);
            const endpoint = isEndpoint(cell.date, value.start, value.end);
            const dayNum = Number(cell.date.slice(-2));

            return (
              <button
                key={cell.date}
                type="button"
                disabled={status !== "available"}
                onClick={() => handleDayClick(cell.date, status)}
                title={
                  status === "available"
                    ? `${cell.meta?.availableQuantity ?? 0} available`
                    : status === "booked"
                      ? "Fully booked"
                      : status === "blackout"
                        ? "Closed / blackout"
                        : "Past date"
                }
                className={[
                  "relative flex min-h-[3.25rem] flex-col items-center justify-center rounded-xl border text-sm transition",
                  cell.inMonth ? "opacity-100" : "opacity-35",
                  status === "available" && !selected
                    ? "border-teal-200 bg-teal-50 text-teal-950 hover:border-teal-500 hover:bg-teal-100"
                    : "",
                  status === "booked"
                    ? "cursor-not-allowed border-red-100 bg-red-50 text-red-800/80"
                    : "",
                  status === "blackout"
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                    : "",
                  status === "past"
                    ? "cursor-not-allowed border-transparent bg-muted/40 text-muted-foreground"
                    : "",
                  selected ? "border-teal-700 bg-teal-600 text-white shadow-md" : "",
                  endpoint ? "ring-2 ring-amber-400 ring-offset-1" : "",
                ].join(" ")}
              >
                <span className="font-semibold">{dayNum}</span>
                {status === "available" && !selected ? (
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-teal-500" />
                ) : null}
                {status === "booked" ? (
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                ) : null}
                {status === "blackout" ? (
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <LegendDot color="bg-teal-500" title="Available" subtitle="Ready to book" />
          <LegendDot color="bg-red-500" title="Booked" subtitle="Not enough stock" />
          <LegendDot color="bg-slate-400" title="Blackout" subtitle="Closed day" />
        </div>
      </div>
    </div>
  );
}

function LegendDot({
  color,
  title,
  subtitle,
}: {
  color: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2">
      <span className={`h-3.5 w-3.5 rounded-full shadow ${color}`} />
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </div>
  );
}
