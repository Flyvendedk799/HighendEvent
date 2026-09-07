import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type PageProps = HTMLAttributes<HTMLElement> & { children: ReactNode };

/** Page padding and max width. Every admin and platform route renders inside one of these. */
export function Page({ className, children, ...props }: PageProps) {
  return (
    <main className={cx("mx-auto w-full max-w-[1400px] px-6 py-6 md:px-8 md:py-8", className)} {...props}>
      {children}
    </main>
  );
}

export type BreadcrumbItem = { label: string; href?: string };

export type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** The one primary action for this page, rendered top-right. */
  action?: ReactNode;
  /** Secondary actions (overflow menu, export, etc.) rendered before the primary action. */
  secondaryAction?: ReactNode;
  breadcrumbs?: ReactNode;
  status?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  action,
  secondaryAction,
  breadcrumbs,
  status,
  className,
}: PageHeaderProps) {
  return (
    <header className={cx("mb-6", className)}>
      {breadcrumbs ? <div className="mb-2">{breadcrumbs}</div> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-[22px] font-semibold tracking-[-0.01em] text-[var(--color-foreground,#0f172a)]">
              {title}
            </h1>
            {status}
          </div>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-[var(--color-muted-foreground,#64748b)]">
              {description}
            </p>
          ) : null}
        </div>
        {action || secondaryAction ? (
          <div className="flex shrink-0 items-center gap-2">
            {secondaryAction}
            {action}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export type SectionProps = HTMLAttributes<HTMLElement> & {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
};

export function Section({
  title,
  description,
  action,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cx("mb-8 last:mb-0", className)} {...props}>
      {title || action ? (
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            {title ? (
              <h2 className="text-sm font-semibold text-[var(--color-foreground,#0f172a)]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs text-[var(--color-muted-foreground,#64748b)]">
                {description}
              </p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-muted-foreground,#64748b)]">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {item.href && i < items.length - 1 ? (
              <a
                href={item.href}
                className="rounded hover:text-[var(--color-foreground,#0f172a)] hover:underline"
              >
                {item.label}
              </a>
            ) : (
              <span
                className={i === items.length - 1 ? "text-[var(--color-foreground,#0f172a)]" : undefined}
                aria-current={i === items.length - 1 ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
            {i < items.length - 1 ? <span aria-hidden="true">/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Two-column detail layout: main content plus a sticky aside. */
export function DetailLayout({
  aside,
  className,
  children,
}: {
  aside: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx("grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]", className)}>
      <div className="min-w-0 space-y-6">{children}</div>
      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">{aside}</aside>
    </div>
  );
}
