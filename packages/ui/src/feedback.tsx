import type { HTMLAttributes, ReactNode } from "react";
import { cx, monoLabel } from "./utils";

export type EmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Exactly one obvious next step. An empty state without a CTA is a dead end. */
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

/**
 * Empty beats fake. A dashed outline says "this is where something will be", and nothing in
 * here is ever seeded with demo rows to make a screenshot look busy.
 */
export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cx("mx-auto max-w-md border border-dashed border-line-strong p-7 text-center", className)}>
      {icon ? (
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center border border-line text-paper-faint">
          {icon}
        </div>
      ) : null}
      <p className={cx("text-[11px] text-signal", monoLabel)}>{title}</p>
      {description ? (
        <p className="mx-auto mt-3 max-w-[38ch] text-[13px] leading-relaxed text-paper-mute">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cx("animate-pulse bg-ink-hover", className)}
      {...props}
    />
  );
}

/** Skeleton shaped like the table it replaces, so nothing shifts when data lands. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-line-soft">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex h-[42px] items-center gap-4 px-4">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              className={cx("h-3", c === 0 ? "w-1/4" : c === columns - 1 ? "w-16" : "flex-1")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export type BannerTone = "info" | "success" | "warning" | "danger";

const bannerTones: Record<BannerTone, { box: string; eyebrow: string }> = {
  info: { box: "border-line-strong bg-ink-raised", eyebrow: "text-paper-dim" },
  success: { box: "border-signal-line bg-signal-tint", eyebrow: "text-signal" },
  warning: { box: "border-warn-line bg-warn-tint", eyebrow: "text-warn" },
  danger: { box: "border-danger-line bg-danger-tint", eyebrow: "text-danger" },
};

export function Banner({
  tone = "info",
  title,
  action,
  className,
  children,
}: {
  tone?: BannerTone;
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const styles = bannerTones[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cx(
        "flex flex-wrap items-start justify-between gap-4 border px-4 py-3.5 text-[13.5px]",
        styles.box,
        className,
      )}
    >
      <div className="min-w-0">
        {title ? (
          <p className={cx("text-[10px]", monoLabel, styles.eyebrow)}>{title}</p>
        ) : null}
        {children ? (
          <div className={cx("leading-relaxed text-paper-dim", title ? "mt-2" : undefined)}>
            {children}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export type SpinnerProps = { className?: string; label?: string };

export function Spinner({ className, label = "Loading" }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={cx("inline-flex", className)}>
      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" />
      </svg>
    </span>
  );
}

/**
 * A horizontal meter — utilisation, capacity, progress toward a limit. The fill colour carries
 * the reading: red is over-committed, lime is healthy, grey is idle stock nobody is renting.
 */
export function Meter({
  value,
  label,
  caption,
  tone,
  className,
}: {
  /** Percentage, 0–100. */
  value: number;
  label?: ReactNode;
  /** Overrides the right-hand readout; defaults to the percentage. */
  caption?: ReactNode;
  tone?: "signal" | "warn" | "danger" | "quiet";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const resolved =
    tone ?? (pct >= 95 ? "danger" : pct >= 85 ? "warn" : pct >= 40 ? "signal" : "quiet");

  const fills = {
    signal: "bg-signal",
    warn: "bg-warn",
    danger: "bg-danger",
    quiet: "bg-paper-faint",
  } as const;

  return (
    <div className={className}>
      {label || caption ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[12.5px]">
          <span className="min-w-0 truncate text-paper-soft">{label}</span>
          <span className="shrink-0 font-mono text-[11.5px] tabular-nums text-paper-mute">
            {caption ?? `${Math.round(pct)}%`}
          </span>
        </div>
      ) : null}
      <div
        role="meter"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={typeof label === "string" ? label : undefined}
        className="h-1.5 border border-line-soft bg-ink-hover"
      >
        <div
          className={cx("h-full transition-[width] duration-surface ease-out", fills[resolved])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
