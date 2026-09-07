import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";
import { cx, monoLabel } from "./utils";

export type FieldProps = HTMLAttributes<HTMLDivElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
};

/**
 * Label + control + one message slot. Hint and error occupy the same line so a form does not
 * jump when validation appears.
 */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
  ...props
}: FieldProps) {
  return (
    <div className={cx("flex w-full flex-col gap-1.5", className)} {...props}>
      {label ? (
        <Label htmlFor={htmlFor} tone={error ? "error" : "default"}>
          {label}
          {required ? <span className="ml-1 text-danger">*</span> : null}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p className="font-mono text-[11px] leading-snug text-danger">{error}</p>
      ) : hint ? (
        <p className="text-[12px] leading-snug text-paper-mute">{hint}</p>
      ) : null}
    </div>
  );
}

/** Field labels are machine voice: they name a column of data, not a sentence. */
export function Label({
  className,
  tone = "default",
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { tone?: "default" | "error" }) {
  return (
    <label
      className={cx(
        "text-[10px] font-medium leading-none",
        monoLabel,
        tone === "error" ? "text-danger" : "text-paper-dim",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

/** Groups related fields under a heading inside a panel. */
export function FieldGroup({
  title,
  description,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { title?: ReactNode; description?: ReactNode }) {
  return (
    <div className={cx("space-y-4", className)} {...props}>
      {title || description ? (
        <div>
          {title ? (
            <h3 className="text-[15px] font-semibold tracking-[-0.015em] text-paper">{title}</h3>
          ) : null}
          {description ? (
            <p className="mt-1 text-[12.5px] leading-relaxed text-paper-mute">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
