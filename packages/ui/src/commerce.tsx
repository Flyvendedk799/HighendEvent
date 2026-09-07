import type { ReactNode } from "react";
import { cx, monoLabel, tabularNums } from "./utils";
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

/** Money is machine data: mono and tabular wherever it appears. */
export function Money({
  amountMinor,
  currency,
  locale,
  className,
  dashWhenZero,
}: MoneyProps) {
  if (dashWhenZero && amountMinor === 0) {
    return <span className={cx("font-mono text-paper-faint", className)}>—</span>;
  }
  return (
    <span className={cx("font-mono", tabularNums, className)}>
      {formatMoneyMinor(amountMinor, currency, locale)}
    </span>
  );
}

/**
 * Booking status tones. Keys match @rentora/domain DEFAULT_BOOKING_STATUSES, so a status the
 * server invents still renders (as neutral) instead of crashing.
 *
 * Lime is done or live, amber is money outstanding, red is risk, paper is in flight, grey is
 * over. Transitions are enforced server-side — the chip is a readout, never an editable field.
 */
const STATUS_TONES: Record<string, { tone: BadgeTone; label: string }> = {
  pending: { tone: "warning", label: "Unpaid" },
  deposit_paid: { tone: "warning", label: "Deposit paid" },
  fully_paid: { tone: "success", label: "Confirmed" },
  out_for_delivery: { tone: "info", label: "Out" },
  returned_good: { tone: "success", label: "Returned" },
  returned_damaged: { tone: "danger", label: "Damaged" },
  deposit_refunded: { tone: "quiet", label: "Refunded" },
  cancelled: { tone: "quiet", label: "Cancelled" },
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

/**
 * Status as bare text rather than a chip — for dense table columns where six chips in a row
 * turn into a colour chart. Same vocabulary, same colours, no box.
 */
const statusTextTones: Record<BadgeTone, string> = {
  success: "text-signal",
  accent: "text-signal",
  warning: "text-warn",
  danger: "text-danger",
  info: "text-paper",
  neutral: "text-paper-dim",
  quiet: "text-paper-faint",
};

export function StatusText({
  statusKey,
  label,
  className,
}: {
  statusKey: string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "text-[9.5px] font-medium",
        monoLabel,
        statusTextTones[statusTone(statusKey)],
        className,
      )}
    >
      {label ?? statusLabel(statusKey)}
    </span>
  );
}

export type StatCardProps = {
  label: ReactNode;
  value: ReactNode;
  /** Short supporting line — a comparison, a count, a caveat. Never invent one. */
  hint?: ReactNode;
  action?: ReactNode;
  /** Tints the number: amber for money owed, red for late, lime for a figure that is winning. */
  tone?: "default" | "signal" | "warn" | "danger";
  /** The console runs the same tile smaller; the storefront and platform run it full size. */
  density?: "store" | "console";
  className?: string;
};

const valueTones = {
  default: "text-paper",
  signal: "text-signal",
  warn: "text-warn",
  danger: "text-danger",
} as const;

/**
 * A metric shows a comparison or it does not ship — `hint` is where that comparison goes. The
 * number itself is always mono and tabular so a row of tiles lines up on the decimal.
 */
export function StatCard({
  label,
  value,
  hint,
  action,
  tone = "default",
  density = "store",
  className,
}: StatCardProps) {
  return (
    <div
      className={cx(
        "border border-line bg-ink-raised",
        density === "console" ? "p-4" : "p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cx("text-[9.5px] text-paper-faint", monoLabel)}>{label}</p>
        {action}
      </div>
      <p
        className={cx(
          "mt-2.5 font-mono font-medium leading-none tracking-[-0.035em]",
          density === "console" ? "text-[26px]" : "text-[38px]",
          valueTones[tone],
          tabularNums,
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-[12px] leading-snug text-paper-mute">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * The console's KPI strip: tiles butted together over a rule-coloured ground so the whole row
 * reads as one instrument rather than five cards.
 */
export function StatStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "grid gap-px border-y border-line bg-line [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]",
        className,
      )}
    >
      {children}
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

  const days = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;

  return (
    <span className={cx("font-mono text-[12.5px]", tabularNums, className)}>
      {fmt.format(startDate)} – {fmt.format(endDate)}
      {showDays ? (
        <span className="ml-1.5 text-paper-faint">
          ({days} {days === 1 ? "day" : "days"})
        </span>
      ) : null}
    </span>
  );
}
