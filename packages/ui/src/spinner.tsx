import type { HTMLAttributes } from "react";
import { cx } from "./utils";

export type SpinnerProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
};

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-[3px]",
} as const;

export function Spinner({ className, size = "md", label = "Loading", ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cx(
        "inline-block animate-spin rounded-full border-slate-300 border-t-teal-700",
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
