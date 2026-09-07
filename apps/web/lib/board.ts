import { statusTone } from "@rentora/ui";
import type { BoardRow, BoardTone } from "@rentora/ui";
import type { AvailabilityOverview } from "@/lib/types";

const MS_DAY = 86_400_000;

export function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  let cursor = new Date(`${start}T00:00:00Z`).getTime();
  const last = new Date(`${end}T00:00:00Z`).getTime();
  while (cursor <= last) {
    out.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += MS_DAY;
  }
  return out;
}

export type BoardWindow = {
  startDate: string;
  endDate: string;
  days: string[];
  labels: string[];
  /** Where today falls across the window, 0–1, or null when today is outside it. */
  nowFraction: number | null;
  label: string;
};

/**
 * The Monday-first week containing `base`. Staff plan in weeks and the whole product is
 * European-first, so the board never starts on a Sunday.
 */
export function weekWindow(base = new Date(), locale = "en"): BoardWindow {
  const today = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()),
  );
  const monday = new Date(today.getTime() - ((today.getUTCDay() + 6) % 7) * MS_DAY);
  const sunday = new Date(monday.getTime() + 6 * MS_DAY);

  const days = eachDay(monday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10));
  const intlLocale = locale === "da" ? "da-DK" : "en-GB";
  const weekday = new Intl.DateTimeFormat(intlLocale, { weekday: "short", timeZone: "UTC" });
  const dayNum = new Intl.DateTimeFormat(intlLocale, { day: "numeric", timeZone: "UTC" });

  const todayIndex = days.indexOf(today.toISOString().slice(0, 10));

  return {
    startDate: days[0]!,
    endDate: days[days.length - 1]!,
    days,
    labels: days.map((day) => {
      const date = new Date(`${day}T00:00:00Z`);
      return `${weekday.format(date).slice(0, 3)} ${dayNum.format(date)}`;
    }),
    // Mid-column, because a booking occupies the whole day rather than starting at midnight.
    nowFraction: todayIndex >= 0 ? (todayIndex + 0.5) / days.length : null,
    label: new Intl.DateTimeFormat(intlLocale, {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }).formatRange(monday, sunday),
  };
}

/** Booking status colours, translated into the board's four tones. */
function toneOf(statusKey: string): BoardTone {
  switch (statusTone(statusKey)) {
    case "warning":
    case "accent":
      return "warn";
    case "danger":
      return "danger";
    case "quiet":
      return "quiet";
    default:
      return "signal";
  }
}

/**
 * Turns the availability engine's overview into board rows.
 *
 * Rows come from products so an item with nothing on it still holds its line — a gap in the
 * board is information, and dropping the empty rows would hide the stock that is sitting idle.
 * Bars are clipped to the window rather than skipped, so a booking that started last week still
 * shows as running through Monday.
 */
export function overviewToBoard(
  overview: AvailabilityOverview,
  window: BoardWindow,
  options: { limit?: number; onlyBusy?: boolean; linkBookings?: boolean } = {},
): BoardRow[] {
  const { limit, onlyBusy = false, linkBookings = true } = options;
  const first = window.days[0]!;
  const last = window.days[window.days.length - 1]!;

  const byProduct = new Map<string, AvailabilityOverview["bookings"]>();
  // Defensive: the API's empty-store path once omitted `bookings` entirely, and
  // iterating undefined here threw during render — which staff saw as "Could
  // not reach the API", pointing every investigation at the network instead of
  // at a response shape. The API is fixed; this keeps a missing list from being
  // able to take the whole console down again.
  for (const booking of overview.bookings ?? []) {
    // Ignore anything that finished before the window or starts after it.
    if (booking.endDate.slice(0, 10) < first || booking.startDate.slice(0, 10) > last) continue;
    const list = byProduct.get(booking.productId) ?? [];
    list.push(booking);
    byProduct.set(booking.productId, list);
  }

  const rows: BoardRow[] = [];

  for (const product of overview.products) {
    const bookings = byProduct.get(product.id) ?? [];
    if (onlyBusy && bookings.length === 0) continue;

    rows.push({
      id: product.id,
      code: `×${product.stockQty}`,
      name: product.name,
      bars: bookings.map((booking) => {
        const start = Math.max(0, window.days.indexOf(clampDay(booking.startDate, first, last)));
        const end = Math.max(start, window.days.indexOf(clampDay(booking.endDate, first, last)));
        return {
          id: `${booking.bookingId}-${product.id}`,
          label:
            booking.quantity > 1
              ? `${booking.customerName} ×${booking.quantity}`
              : booking.customerName,
          title: `${booking.bookingNo} — ${booking.customerName}, ${booking.startDate.slice(0, 10)} → ${booking.endDate.slice(0, 10)}`,
          start,
          span: end - start + 1,
          tone: toneOf(booking.statusKey),
          href: linkBookings ? `/admin/bookings/${booking.bookingId}` : undefined,
        };
      }),
    });
  }

  // Busiest first: an item with three bookings this week is the one that will run short.
  rows.sort((a, b) => b.bars.length - a.bars.length);
  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

function clampDay(value: string, first: string, last: string): string {
  const day = value.slice(0, 10);
  if (day < first) return first;
  if (day > last) return last;
  return day;
}

export type Utilisation = { id: string; name: string; pct: number; free: number; stock: number };

/**
 * Utilisation per item across the window: how much of the fleet's day-capacity is committed,
 * buffers included, because a day held for cleanup is a day nobody can rent.
 */
export function utilisationOf(overview: AvailabilityOverview, window: BoardWindow): Utilisation[] {
  const inWindow = new Set(window.days);

  return overview.products
    .map((product) => {
      const days = product.days.filter((day) => inWindow.has(day.date));
      const capacity = product.stockQty * days.length;
      if (capacity <= 0) return null;

      const free = days.reduce((sum, day) => sum + Math.max(0, day.availableQuantity), 0);
      return {
        id: product.id,
        name: product.name,
        pct: ((capacity - free) / capacity) * 100,
        free,
        stock: product.stockQty,
      };
    })
    .filter((row): row is Utilisation => row !== null)
    .sort((a, b) => b.pct - a.pct);
}
