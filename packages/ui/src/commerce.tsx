import type { ReactNode } from "react";
import { cx, tabularNums } from "./utils";
import { Badge, type BadgeTone } from "./badge";

export function formatMoneyMinor(
  amountMinor: number,
  currency: string,
  locale = "en",
): string {
  return new Intl.NumberFormat(locale === "da" ? "da-DK" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
  }).format(amountMinor / 100);
}

export type MoneyProps = {
  amountMinor: number;
  currency: string;
  locale?: string;
  className?: string;
  /** Renders a zero amount as a dash so tables read as "nothing" rather than "0.00". */
  dashWhenZero?: boolean;
};

export function Money({
  amountMinor,
  currency,
  locale,
  className,
  dashWhenZero,
}: MoneyProps) {
  if (dashWhenZero && amountMinor === 0) {
    return <span className={cx("text-[var(--color-muted-foreground,#64748b)]", className)}>—</span>;
  }
  return (
    <span className={cx(tabularNums, className)}>
      {formatMoneyMinor(amountMinor, currency, locale)}
    </span>
  );
}

/**
 * Booking status tones. Keys match @rentora/domain DEFAULT_BOOKING_STATUSES, so a status the
 * server invents still renders (as neutral) instead of crashing.
 */
const STATUS_TONES: Record<string, { tone: BadgeTone; label: string }> = {
  pending: { tone: "warning", label: "Pending payment" },
  deposit_paid: { tone: "info", label: "Deposit paid" },
  fully_paid: { tone: "success", label: "Fully paid" },
  out_for_delivery: { tone: "info", label: "Out for delivery" },
  returned_good: { tone: "success", label: "Returned" },
  returned_damaged: { tone: "danger", label: "Returned damaged" },
  deposit_refunded: { tone: "neutral", label: "Deposit refunded" },
  cancelled: { tone: "danger", label: "Cancelled" },
};

export function statusLabel(statusKey: string): string {
  return (
    STATUS_TONES[statusKey]?.label ??
    statusKey.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

export function statusTone(statusKey: string): BadgeTone {
  return STATUS_TONES[statusKey]?.tone ?? "neutral";
}

export function StatusBadge({
  statusKey,
  label,
  className,
}: {
  statusKey: string;
  label?: string;
  className?: string;
}) {
  return (
    <Badge tone={statusTone(statusKey)} className={className}>
      {label ?? statusLabel(statusKey)}
    </Badge>
  );
}

export type StatCardProps = {
  label: ReactNode;
  value: ReactNode;
  /** Short supporting line — a comparison, a count, a caveat. Never invent one. */
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function StatCard({ label, value, hint, action, className }: StatCardProps) {
  return (
    <div
      className={cx(
        "rounded-xl border border-[var(--color-border,#e2e8f0)] bg-[var(--color-surface,#fff)] p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] text-[var(--color-muted-foreground,#64748b)]">{label}</p>
        {action}
      </div>
      <p className={cx("mt-2 text-2xl font-semibold tracking-tight", tabularNums)}>{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--color-muted-foreground,#64748b)]">{hint}</p>
      ) : null}
    </div>
  );
}

/** Renders a date range the way ops staff read it: "Fri 12 Sep – Sun 14 Sep (3 days)". */
export function DateRange({
  start,
  end,
  locale = "en",
  showDays = true,
  className,
}: {
  start: string | Date;
  end: string | Date;
  locale?: string;
  showDays?: boolean;
  className?: string;
}) {
  const startDate = typeof start === "string" ? new Date(start) : start;
  const endDate = typeof end === "string" ? new Date(end) : end;
  const intlLocale = locale === "da" ? "da-DK" : "en-GB";

  const fmt = new Intl.DateTimeFormat(intlLocale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  const days =
    Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;

  return (
    <span className={cx(tabularNums, className)}>
      {fmt.format(startDate)} – {fmt.format(endDate)}
      {showDays ? (
        <span className="ml-1.5 text-[var(--color-muted-foreground,#64748b)]">
          ({days} {days === 1 ? "day" : "days"})
        </span>
      ) : null}
    </span>
  );
}
