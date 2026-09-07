import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cx, focusRing } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: ReactNode;
  /** Render the child element instead of a <button> — for links that look like buttons. */
  asChild?: boolean;
  loading?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary,#0f766e)] text-white shadow-sm hover:bg-[var(--color-primary-hover,#0d9488)] active:translate-y-px",
  secondary:
    "border border-[var(--color-border,#e2e8f0)] bg-[var(--color-surface,#fff)] text-[var(--color-foreground,#0f172a)] shadow-sm hover:bg-[var(--color-muted,#f1f5f9)]",
  ghost:
    "bg-transparent text-[var(--color-foreground,#0f172a)] hover:bg-[var(--color-muted,#f1f5f9)]",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 active:translate-y-px",
  link: "bg-transparent text-[var(--color-primary,#0f766e)] underline-offset-4 hover:underline px-0 h-auto",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-2.5 text-[13px]",
  md: "h-9 gap-2 px-3.5 text-sm",
  lg: "h-11 gap-2 px-5 text-[15px]",
  icon: "h-9 w-9 shrink-0",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      {...(asChild ? {} : { type })}
      aria-busy={loading || undefined}
      disabled={asChild ? undefined : disabled || loading}
      className={cx(
        "inline-flex select-none items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        focusRing,
        variantClasses[variant],
        variant === "link" ? null : sizeClasses[size],
        className,
      )}
      {...props}
    >
      {/*
        Slot merges this button's props onto exactly one child element, so it must receive exactly
        one. Rendering the spinner slot alongside `children` hands it an array — `[null, <Link/>]`
        even when not loading — and Radix throws "Slot failed to slot onto its children", turning
        every page with a link-styled button into a 500. When `asChild` is set the caller owns the
        content, so pass it through untouched; `loading` is a button-only affordance.
      */}
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <ButtonSpinner /> : null}
          {children}
        </>
      )}
    </Component>
  );
}

function ButtonSpinner() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
