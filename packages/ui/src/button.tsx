import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cx, focusRing, monoLabel } from "./utils";

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

/*
 * Square corners, no shadow, no lift on hover. Primary inverts to paper on hover rather than
 * dimming, because a lime button going darker reads as disabled.
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-signal text-signal-ink font-semibold hover:bg-signal-press disabled:bg-line disabled:text-paper-ghost",
  secondary:
    "border border-line-strong text-paper hover:border-signal hover:text-signal disabled:border-line disabled:text-paper-ghost",
  ghost:
    "text-paper-dim hover:bg-ink-hover hover:text-paper disabled:text-paper-ghost",
  danger:
    "border border-danger-border text-danger hover:bg-danger-tint disabled:border-line disabled:text-paper-ghost",
  link: "text-signal hover:text-paper underline-offset-4 hover:underline px-0 h-auto",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-[10px]",
  md: "h-9 gap-2 px-4 text-[11px]",
  lg: "h-12 gap-2.5 px-6 text-[12px]",
  icon: "h-9 w-9 shrink-0 text-[11px]",
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
        "inline-flex select-none items-center justify-center whitespace-nowrap transition-colors duration-instant",
        "disabled:pointer-events-none",
        variant === "link" ? "font-mono text-[12px]" : monoLabel,
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

/**
 * Drawn in `currentColor` so it is ink on the primary button and paper on the others without a
 * second variant map.
 */
function ButtonSpinner() {
  return (
    <svg
      className="h-3 w-3 shrink-0 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
