import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  className?: string;
  children?: ReactNode;
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-red-100 text-red-800",
  info: "bg-sky-100 text-sky-800",
};

export function Badge({ tone = "neutral", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
