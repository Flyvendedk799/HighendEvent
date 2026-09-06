import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary,#0f766e)] text-white hover:bg-[var(--color-primary-hover,#0d9488)] shadow-sm",
  secondary:
    "bg-[var(--color-surface,#fff)] text-[var(--color-foreground,#0f172a)] border border-[var(--color-border,#e2e8f0)] hover:bg-[var(--color-muted,#f1f5f9)]",
  ghost:
    "bg-transparent text-[var(--color-foreground,#0f172a)] hover:bg-[var(--color-muted,#f1f5f9)]",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
