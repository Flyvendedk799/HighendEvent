import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type EmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Exactly one obvious next step. An empty state without a CTA is a dead end. */
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cx("mx-auto max-w-md py-6 text-center", className)}>
      {icon ? (
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-muted,#f1f5f9)] text-[var(--color-muted-foreground,#64748b)]">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-[var(--color-foreground,#0f172a)]">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-[var(--color-muted-foreground,#64748b)]">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cx("animate-pulse rounded-md bg-[var(--color-muted,#e2e8f0)]", className)}
      {...props}
    />
  );
}

/** Skeleton shaped like the table it replaces, so nothing shifts when data lands. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-[var(--color-border,#e2e8f0)]">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              className={cx("h-4", c === 0 ? "w-1/4" : c === columns - 1 ? "w-16" : "flex-1")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export type BannerTone = "info" | "success" | "warning" | "danger";

const bannerTones: Record<BannerTone, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  success: "border-teal-200 bg-teal-50 text-teal-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-900",
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
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cx(
        "flex flex-wrap items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm",
        bannerTones[tone],
        className,
      )}
    >
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? "mt-0.5" : undefined}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export type SpinnerProps = { className?: string; label?: string };

export function Spinner({ className, label = "Loading" }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={cx("inline-flex", className)}>
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
        <path
          d="M22 12a10 10 0 0 0-10-10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
