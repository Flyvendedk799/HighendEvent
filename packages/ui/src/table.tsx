import type { HTMLAttributes, ReactNode, TableHTMLAttributes } from "react";
import { cx } from "./utils";

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cx("min-w-full text-left text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cx("border-b border-[var(--color-border,#e2e8f0)] bg-[var(--color-muted,#f1f5f9)]/70 text-[var(--color-muted-foreground,#64748b)]", className)}
      {...props}
    />
  );
}

export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cx(className)} {...props} />;
}

export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cx("border-b border-[var(--color-border,#e2e8f0)] last:border-0", className)}
      {...props}
    />
  );
}

export function TH({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <th className={cx("px-4 py-3 font-medium", className)} {...props} />;
}

export function TD({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={cx("px-4 py-3", className)} {...props} />;
}

export type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border,#e2e8f0)] bg-[var(--color-surface,#fff)] px-6 py-14 text-center",
        className,
      )}
    >
      <h3 className="text-lg font-semibold text-[var(--color-foreground,#0f172a)]">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-[var(--color-muted-foreground,#64748b)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
