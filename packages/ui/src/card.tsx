import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
  children?: ReactNode;
};

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cx(
        "rounded-xl border border-[var(--color-border,#e2e8f0)] bg-[var(--color-surface,#fff)] p-5 shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type CardHeaderProps = HTMLAttributes<HTMLDivElement> & {
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
        <div>
          {title ? (
            <h3 className="font-display text-lg font-semibold text-[var(--color-foreground,#0f172a)]">
              {title}
            </h3>
          ) : null}
          {description ? (
            <p className="mt-1 text-sm text-[var(--color-muted-foreground,#64748b)]">
              {description}
            </p>
          ) : null}
          {children}
        </div>
        {action}
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
      className={cx(
        "text-lg font-semibold text-[var(--color-foreground,#0f172a)]",
        className,
      )}
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
    <div
      className={cx("text-sm text-[var(--color-muted-foreground,#64748b)]", className)}
      {...props}
    >
      {children}
    </div>
  );
}
