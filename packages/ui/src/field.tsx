import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

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
        <Label htmlFor={htmlFor}>
          {label}
          {required ? <span className="ml-0.5 text-red-600">*</span> : null}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[var(--color-muted-foreground,#64748b)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function Label({
  className,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cx(
        "text-[13px] font-medium text-[var(--color-foreground,#0f172a)]",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

/** Groups related fields under a heading inside a card. */
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
            <h3 className="text-sm font-semibold text-[var(--color-foreground,#0f172a)]">
              {title}
            </h3>
          ) : null}
          {description ? (
            <p className="mt-0.5 text-xs text-[var(--color-muted-foreground,#64748b)]">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
