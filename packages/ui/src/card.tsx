import type { HTMLAttributes, ReactNode } from "react";
import { cx, monoLabel } from "./utils";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
  children?: ReactNode;
  /** Sits the panel on the sunk ground instead of the raised one — for code, logs, totals. */
  sunk?: boolean;
};

/** A panel: one hairline, square, flat. Depth is for things that float, and a card does not. */
export function Card({ className, sunk, children, ...props }: CardProps) {
  return (
    <div
      className={cx(
        "border border-line p-5",
        sunk ? "bg-ink-sunk" : "bg-ink-raised",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type CardHeaderProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  className?: string;
  children?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

export function CardHeader({
  className,
  children,
  title,
  description,
  action,
  ...props
}: CardHeaderProps) {
  if (title !== undefined || description !== undefined || action !== undefined) {
    return (
      <div className={cx("mb-4 flex items-start justify-between gap-3", className)} {...props}>
        <div className="min-w-0">
          {title ? <CardTitle>{title}</CardTitle> : null}
          {description ? (
            <p className="mt-1.5 text-[13px] leading-relaxed text-paper-mute">{description}</p>
          ) : null}
          {children}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    );
  }

  return (
    <div className={cx("mb-4", className)} {...props}>
      {children}
    </div>
  );
}

export type CardTitleProps = HTMLAttributes<HTMLHeadingElement> & {
  className?: string;
  children?: ReactNode;
};

export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h3
      className={cx("text-[17px] font-semibold tracking-[-0.02em] text-paper", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export type CardContentProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
  children?: ReactNode;
};

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div className={cx("text-[13.5px] leading-relaxed text-paper-dim", className)} {...props}>
      {children}
    </div>
  );
}

export type PanelProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  /** Mono eyebrow in the header bar — what this panel is showing. */
  title?: ReactNode;
  /** Right-hand side of the header bar: a scope switch, a link out, a count. */
  action?: ReactNode;
  /** Tints the eyebrow — amber for a queue that needs work, red for one that is late. */
  tone?: "default" | "warn" | "danger" | "signal";
  footer?: ReactNode;
  children: ReactNode;
};

const eyebrowTones = {
  default: "text-paper-mute",
  signal: "text-signal",
  warn: "text-warn",
  danger: "text-danger",
} as const;

/**
 * The console's unit of composition: a titled bar over flush content. Unlike `Card` it does not
 * pad its body, because what goes inside is usually a table or a board that owns its own rhythm.
 */
export function Panel({
  title,
  action,
  tone = "default",
  footer,
  className,
  children,
  ...props
}: PanelProps) {
  return (
    <section className={cx("border border-line bg-ink", className)} {...props}>
      {title || action ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <span className={cx("text-[10px]", monoLabel, eyebrowTones[tone])}>{title}</span>
          {action ? <div className="flex items-center gap-2">{action}</div> : null}
        </div>
      ) : null}
      {children}
      {footer ? (
        <div className="border-t border-line-soft px-4 py-3 text-[12px] leading-relaxed text-paper-faint">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
