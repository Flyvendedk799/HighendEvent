import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
  children?: ReactNode;
};

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cx("rounded-xl border border-slate-200 bg-white p-6 shadow-sm", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export type CardHeaderProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
  children?: ReactNode;
};

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
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
    <h3 className={cx("text-lg font-semibold text-slate-900", className)} {...props}>
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
    <div className={cx("text-sm text-slate-600", className)} {...props}>
      {children}
    </div>
  );
}
