import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

export function Input({
  className,
  type = "text",
  label,
  hint,
  error,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? (typeof props.name === "string" ? props.name : undefined);
  const field = (
    <input
      id={inputId}
      type={type}
      className={cx(
        "h-10 w-full rounded-lg border border-[var(--color-border,#cbd5e1)] bg-[var(--color-surface,#fff)] px-3 text-sm text-[var(--color-foreground,#0f172a)] outline-none transition placeholder:text-[var(--color-muted-foreground,#94a3b8)] focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:opacity-50",
        error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : null,
        className,
      )}
      {...props}
    />
  );

  if (!label && !hint && !error) {
    return field;
  }

  return (
    <label className="flex w-full flex-col gap-1.5 text-sm">
      {label ? (
        <span className="font-medium text-[var(--color-foreground,#0f172a)]">{label}</span>
      ) : null}
      {field}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      {!error && hint ? (
        <span className="text-xs text-[var(--color-muted-foreground,#64748b)]">{hint}</span>
      ) : null}
    </label>
  );
}
