import type { HTMLAttributes, ReactNode } from "react";
import { cx, monoLabel } from "./utils";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "quiet";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  className?: string;
  children?: ReactNode;
};

/*
 * There is no blue and no green here. Lime means live or done, amber means money, red means
 * risk, paper means in-flight, grey means over. Status is colour *and* word — a chip never
 * carries its meaning in the tint alone, because a third of a warehouse crew cannot read it.
 */
const toneClasses: Record<BadgeTone, string> = {
  success: "bg-signal-tint border-signal-line text-signal",
  accent: "bg-signal-tint border-signal-line text-signal",
  warning: "bg-warn-tint border-warn-line text-warn",
  danger: "bg-danger-tint border-danger-line text-danger",
  info: "bg-[rgba(237,238,234,0.06)] border-line-strong text-paper",
  neutral: "bg-[rgba(237,238,234,0.06)] border-line-strong text-paper-dim",
  quiet: "bg-transparent border-line text-paper-faint",
};

export function Badge({ tone = "neutral", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap border px-2.5 py-1 text-[10px] font-medium leading-none",
        monoLabel,
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * The live dot. A square, not a circle — radius is 0 — blinking on a step so it reads as a
 * status lamp rather than a pulse animation.
 */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("inline-block h-[7px] w-[7px] shrink-0 bg-signal animate-blink", className)}
    />
  );
}
