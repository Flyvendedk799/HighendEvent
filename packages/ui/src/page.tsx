import type { HTMLAttributes, ReactNode } from "react";
import { cx, monoLabel } from "./utils";

export type PageProps = HTMLAttributes<HTMLElement> & {
  /**
   * The storefront breathes at the 28px gutter; the console runs tighter because staff read a
   * hundred rows an hour. Same tokens either way — this is density, not a second theme.
   */
  density?: "store" | "console";
  children: ReactNode;
};

/** Page padding and max width. Every admin and platform route renders inside one of these. */
export function Page({ className, density = "console", children, ...props }: PageProps) {
  return (
    <main
      className={cx(
        "mx-auto w-full",
        density === "console"
          ? "max-w-[1600px] px-4 py-5 md:px-5 md:py-6"
          : "max-w-measure px-5 py-8 md:px-7 md:py-10",
        className,
      )}
      {...props}
    >
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
  /** A mono eyebrow above the title — the section this page belongs to, or a live count. */
  eyebrow?: ReactNode;
  status?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  action,
  secondaryAction,
  breadcrumbs,
  eyebrow,
  status,
  className,
}: PageHeaderProps) {
  return (
    <header className={cx("mb-6 border-b border-line pb-5", className)}>
      {breadcrumbs ? <div className="mb-3">{breadcrumbs}</div> : null}
      {eyebrow ? (
        <div className={cx("mb-2.5 text-[10px] text-signal", monoLabel)}>{eyebrow}</div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-[22px] font-semibold tracking-[-0.03em] text-paper">
              {title}
            </h1>
            {status}
          </div>
          {description ? (
            <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-paper-mute">
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

export type SectionProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
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
        <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            {title ? (
              <h2 className={cx("text-[10px] text-paper-mute", monoLabel)}>{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1.5 text-[12.5px] leading-snug text-paper-faint">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol
        className={cx(
          "flex flex-wrap items-center gap-2 text-[10px] text-paper-faint",
          monoLabel,
        )}
      >
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-2">
            {item.href && i < items.length - 1 ? (
              <a href={item.href} className="transition-colors duration-instant hover:text-signal">
                {item.label}
              </a>
            ) : (
              <span
                className={i === items.length - 1 ? "text-paper-dim" : undefined}
                aria-current={i === items.length - 1 ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
            {i < items.length - 1 ? (
              <span aria-hidden="true" className="text-paper-ghost">
                /
              </span>
            ) : null}
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
    <div className={cx("grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]", className)}>
      <div className="min-w-0 space-y-6">{children}</div>
      <aside className="space-y-4 lg:sticky lg:top-[76px] lg:self-start">{aside}</aside>
    </div>
  );
}
