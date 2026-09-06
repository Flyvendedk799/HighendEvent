/** ISO date string YYYY-MM-DD or Date */
export type DateInput = string | Date;

export function toDate(value: DateInput): Date {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIsoDate(value: DateInput): string {
  return toDate(value).toISOString().slice(0, 10);
}

export function addDays(value: DateInput, days: number): Date {
  const d = toDate(value);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Inclusive rental day count (legacy parity). */
export function rentalDays(start: DateInput, end: DateInput): number {
  const s = toDate(start).getTime();
  const e = toDate(end).getTime();
  return Math.floor((e - s) / 86_400_000) + 1;
}

export function datesOverlap(
  aStart: DateInput,
  aEnd: DateInput,
  bStart: DateInput,
  bEnd: DateInput,
): boolean {
  return (
    toDate(aStart).getTime() <= toDate(bEnd).getTime() &&
    toDate(aEnd).getTime() >= toDate(bStart).getTime()
  );
}

export function eachDate(start: DateInput, end: DateInput): Date[] {
  const out: Date[] = [];
  let cur = toDate(start);
  const last = toDate(end);
  while (cur.getTime() <= last.getTime()) {
    out.push(new Date(cur));
    cur = addDays(cur, 1);
  }
  return out;
}

export type Money = { amountMinor: number; currency: string };

export function money(amountMinor: number, currency: string): Money {
  return { amountMinor: Math.round(amountMinor), currency };
}

export function formatMoney(m: Money, locale = "en"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: m.currency,
  }).format(m.amountMinor / 100);
}
