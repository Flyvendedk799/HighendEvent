"use client";

import Link from "next/link";
import { useMemo } from "react";
import { cx, statusTone, statusLabel } from "@rentora/ui";
import type { AvailabilityOverview } from "@/lib/types";

const MS_DAY = 86_400_000;

function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  let cursor = new Date(`${start}T00:00:00Z`).getTime();
  const last = new Date(`${end}T00:00:00Z`).getTime();
  while (cursor <= last) {
    out.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += MS_DAY;
  }
  return out;
}

const TONE_BAR: Record<string, string> = {
  success: "bg-teal-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-sky-500",
  neutral: "bg-slate-400",
  accent: "bg-amber-500",
};

/**
 * One row per product, one column per day. Occupancy comes from the same availability engine
 * the storefront calendar uses, so what staff see here is exactly what shoppers can book.
 */
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

  // Bookings grouped by product so each row can draw its own bars.
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
      <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-muted-foreground)]">
        No published products to show. Add inventory and it will appear here.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
              <th className="sticky left-0 z-10 min-w-[180px] bg-[var(--color-muted)] px-4 py-2 text-left text-[12px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Product
              </th>
              {days.map((day) => {
                const date = new Date(`${day}T00:00:00Z`);
                const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
                return (
                  <th
                    key={day}
                    className={cx(
                      "w-9 px-0 py-1 text-center text-[11px] font-medium",
                      weekend ? "bg-slate-100" : null,
                      day === todayIso ? "bg-[var(--color-primary)]/10" : null,
                    )}
                  >
                    <span className="block text-[9px] uppercase text-[var(--color-muted-foreground)]">
                      {weekdayLabel.format(date)}
                    </span>
                    <span
                      className={cx(
                        "block tabular",
                        day === todayIso
                          ? "font-bold text-[var(--color-primary)]"
                          : "text-[var(--color-foreground)]",
                      )}
                    >
                      {dayLabel.format(date)}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {overview.products.map((product) => {
              const byDate = new Map(product.days.map((day) => [day.date, day]));
              const bookings = bookingsByProduct.get(product.id) ?? [];

              return (
                <tr key={product.id}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 min-w-[180px] max-w-[220px] bg-[var(--color-surface)] px-4 py-2 text-left font-medium"
                  >
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="block truncate hover:underline"
                    >
                      {product.name}
                    </Link>
                    <span className="block text-[11px] font-normal text-[var(--color-muted-foreground)]">
                      {product.stockQty} in stock
                    </span>
                  </th>

                  {days.map((day) => {
                    const state = byDate.get(day);
                    const booking = bookings.find(
                      (b) => day >= b.startDate && day <= b.endDate,
                    );
                    const date = new Date(`${day}T00:00:00Z`);
                    const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;

                    const title = booking
                      ? `${booking.bookingNo} — ${booking.customerName} (${statusLabel(booking.statusKey)})`
                      : state?.isBlackedOut
                        ? `${day}: blocked`
                        : `${day}: ${state?.availableQuantity ?? 0} of ${product.stockQty} free`;

                    const cell = (
                      <span
                        title={title}
                        className={cx(
                          "flex h-7 items-center justify-center text-[10px] font-medium",
                          booking
                            ? cx(TONE_BAR[statusTone(booking.statusKey)], "text-white")
                            : state?.isBlackedOut
                              ? "bg-[repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9_3px,#e2e8f0_3px,#e2e8f0_6px)]"
                              : (state?.availableQuantity ?? 0) === 0
                                ? "bg-slate-200 text-slate-500"
                                : (state?.availableQuantity ?? 0) < product.stockQty
                                  ? "bg-amber-100 text-amber-800"
                                  : weekend
                                    ? "bg-slate-50"
                                    : null,
                        )}
                      >
                        {booking
                          ? booking.quantity
                          : state && state.availableQuantity < product.stockQty && !state.isBlackedOut
                            ? state.availableQuantity
                            : ""}
                      </span>
                    );

                    return (
                      <td key={day} className="border-l border-[var(--color-border)]/50 p-0">
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

      <ul className="flex flex-wrap gap-4 border-t border-[var(--color-border)] px-4 py-2.5 text-[11px] text-[var(--color-muted-foreground)]">
        <Legend className="bg-teal-500">Paid</Legend>
        <Legend className="bg-amber-500">Awaiting payment</Legend>
        <Legend className="bg-sky-500">Out for delivery</Legend>
        <Legend className="bg-amber-100">Partly booked</Legend>
        <Legend className="bg-slate-200">Fully booked</Legend>
        <Legend className="bg-[repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9_3px,#e2e8f0_3px,#e2e8f0_6px)]">
          Blocked
        </Legend>
      </ul>
    </div>
  );
}

function Legend({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cx("h-3 w-3 rounded border border-[var(--color-border)]", className)}
      />
      {children}
    </li>
  );
}
