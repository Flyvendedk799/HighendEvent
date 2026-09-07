"use client";

import Link from "next/link";
import { useMemo } from "react";
import { cx, statusLabel, statusTone } from "@rentora/ui";
import type { AvailabilityOverview } from "@/lib/types";
import { eachDay } from "@/lib/board";

/**
 * One row per product, one column per day, for a whole month.
 *
 * This is the occupancy board run at its densest: thirty-one columns leaves no room for a
 * labelled bar, so each cell carries a number instead — the quantity on a booking, or how many
 * units are still free that day. Same four colours as the week board and the storefront
 * calendar, because occupancy comes from the same availability engine all three read.
 */
const CELL_TONES: Record<string, string> = {
  success: "bg-signal-tint text-signal",
  accent: "bg-signal-tint text-signal",
  info: "bg-[rgba(237,238,234,0.10)] text-paper",
  warning: "bg-warn-tint text-warn",
  danger: "bg-danger-tint text-danger",
  neutral: "bg-[rgba(237,238,234,0.06)] text-paper-dim",
  quiet: "bg-transparent text-paper-faint",
};

export function ResourceCalendar({
  overview,
  locale = "en",
}: {
  overview: AvailabilityOverview;
  locale?: string;
}) {
  const days = useMemo(
    () => eachDay(overview.startDate, overview.endDate),
    [overview.startDate, overview.endDate],
  );

  const todayIso = new Date().toISOString().slice(0, 10);
  const intlLocale = locale === "da" ? "da-DK" : "en-GB";

  const dayLabel = new Intl.DateTimeFormat(intlLocale, { day: "numeric", timeZone: "UTC" });
  const weekdayLabel = new Intl.DateTimeFormat(intlLocale, { weekday: "narrow", timeZone: "UTC" });

  // Bookings grouped by product so each row can draw its own cells.
  const bookingsByProduct = useMemo(() => {
    const map = new Map<string, AvailabilityOverview["bookings"]>();
    for (const booking of overview.bookings) {
      const list = map.get(booking.productId) ?? [];
      list.push(booking);
      map.set(booking.productId, list);
    }
    return map;
  }, [overview.bookings]);

  if (overview.products.length === 0) {
    return (
      <p className="border border-dashed border-line-strong p-8 text-center font-mono text-[10.5px] uppercase tracking-[0.14em] text-paper-faint">
        No published products to show. Add inventory and it will appear here.
      </p>
    );
  }

  return (
    <div className="border border-line bg-ink">
      <div className="overflow-x-auto [overscroll-behavior-x:contain]">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-line bg-ink-sunk">
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-[190px] bg-ink-sunk px-3 py-2 text-left font-mono text-[9px] uppercase tracking-[0.14em] text-paper-ghost"
              >
                Item
              </th>
              {days.map((day) => {
                const date = new Date(`${day}T00:00:00Z`);
                const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
                return (
                  <th
                    key={day}
                    scope="col"
                    className={cx(
                      "w-8 border-l border-line-soft px-0 py-1.5 text-center font-mono",
                      weekend ? "bg-ink" : null,
                    )}
                  >
                    <span className="block text-[8.5px] uppercase tracking-[0.1em] text-paper-ghost">
                      {weekdayLabel.format(date)}
                    </span>
                    <span
                      className={cx(
                        "block tabular-nums",
                        day === todayIso ? "text-signal" : "text-paper-mute",
                      )}
                    >
                      {dayLabel.format(date)}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {overview.products.map((product) => {
              const byDate = new Map(product.days.map((day) => [day.date, day]));
              const bookings = bookingsByProduct.get(product.id) ?? [];

              return (
                <tr key={product.id} className="border-b border-line-soft last:border-b-0">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 min-w-[190px] max-w-[240px] bg-ink px-3 py-2 text-left font-normal"
                  >
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="block truncate text-[12.5px] text-paper-soft transition-colors duration-instant hover:text-signal"
                    >
                      {product.name}
                    </Link>
                    <span className="mt-0.5 block font-mono text-[9.5px] text-paper-faint">
                      ×{product.stockQty} in fleet
                    </span>
                  </th>

                  {days.map((day) => {
                    const state = byDate.get(day);
                    const booking = bookings.find((b) => day >= b.startDate && day <= b.endDate);
                    const free = state?.availableQuantity ?? 0;
                    const partly = !!state && free > 0 && free < product.stockQty;

                    const title = booking
                      ? `${booking.bookingNo} — ${booking.customerName} (${statusLabel(booking.statusKey)})`
                      : state?.isBlackedOut
                        ? `${day}: blocked`
                        : `${day}: ${free} of ${product.stockQty} free`;

                    const cell = (
                      <span
                        title={title}
                        className={cx(
                          "flex h-7 items-center justify-center font-mono text-[10px] tabular-nums",
                          booking
                            ? CELL_TONES[statusTone(booking.statusKey)]
                            : state?.isBlackedOut
                              ? "bg-[repeating-linear-gradient(45deg,#15181C,#15181C_3px,#23251F_3px,#23251F_6px)] text-paper-ghost"
                              : free === 0
                                ? "bg-[rgba(237,238,234,0.06)] text-paper-mute"
                                : partly
                                  ? "bg-warn-tint text-warn"
                                  : null,
                        )}
                      >
                        {booking ? booking.quantity : partly && !state?.isBlackedOut ? free : ""}
                      </span>
                    );

                    return (
                      <td key={day} className="border-l border-line-soft p-0">
                        {booking ? (
                          <Link href={`/admin/bookings/${booking.bookingId}`}>{cell}</Link>
                        ) : (
                          cell
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/*
        A bespoke legend rather than the board's: at this density a cell means something slightly
        different — amber here is "partly booked", not "unpaid" — and a legend that is nearly
        right is worse than none.
      */}
      <ul className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line px-4 py-3 font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper-faint">
        <Legend className="bg-signal-tint border-signal-line">Confirmed</Legend>
        <Legend className="bg-warn-tint border-warn-line">Unpaid / partly booked</Legend>
        <Legend className="bg-danger-tint border-danger-line">Damaged</Legend>
        <Legend className="bg-[rgba(237,238,234,0.06)] border-line-strong">Fully booked</Legend>
        <Legend className="border-line-strong bg-[repeating-linear-gradient(45deg,#15181C,#15181C_3px,#23251F_3px,#23251F_6px)]">
          Blocked
        </Legend>
      </ul>
    </div>
  );
}

function Legend({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className={cx("h-2.5 w-2.5 border", className)} />
      {children}
    </li>
  );
}
