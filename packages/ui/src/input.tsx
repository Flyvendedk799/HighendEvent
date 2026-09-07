import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cx, focusRing } from "./utils";
import { Field } from "./field";

export const controlClasses =
  "w-full rounded-lg border border-[var(--color-border,#cbd5e1)] bg-[var(--color-surface,#fff)] px-3 text-sm text-[var(--color-foreground,#0f172a)] transition placeholder:text-[var(--color-muted-foreground,#94a3b8)] focus:border-[var(--color-primary,#0f766e)] focus:ring-2 focus:ring-[var(--color-primary,#0f766e)]/15 focus:outline-none disabled:cursor-not-allowed disabled:bg-[var(--color-muted,#f1f5f9)] disabled:opacity-70";

const invalidClasses = "border-red-500 focus:border-red-500 focus:ring-red-500/20";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Short trailing unit, e.g. "kr" or "days". */
  suffix?: ReactNode;
};

export function Input({
  className,
  type = "text",
  label,
  hint,
  error,
  suffix,
  id,
  required,
  ...props
}: InputProps) {
  const inputId = id ?? (typeof props.name === "string" ? props.name : undefined);

  const field = (
    <input
      id={inputId}
      type={type}
      aria-invalid={error ? true : undefined}
      className={cx(
        controlClasses,
        "h-9",
        suffix ? "pr-12" : null,
        error ? invalidClasses : null,
        className,
      )}
      required={required}
      {...props}
    />
  );

  const control = suffix ? (
    <div className="relative">
      {field}
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-muted-foreground,#64748b)]">
        {suffix}
      </span>
    </div>
  ) : (
    field
  );

  if (!label && !hint && !error) return control;

  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} required={required}>
      {control}
    </Field>
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

export function Textarea({
  className,
  label,
  hint,
  error,
  id,
  rows = 4,
  required,
  ...props
}: TextareaProps) {
  const inputId = id ?? (typeof props.name === "string" ? props.name : undefined);

  const control = (
    <textarea
      id={inputId}
      rows={rows}
      aria-invalid={error ? true : undefined}
      className={cx(controlClasses, "py-2 leading-relaxed", error ? invalidClasses : null, className)}
      required={required}
      {...props}
    />
  );

  if (!label && !hint && !error) return control;

  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} required={required}>
      {control}
    </Field>
  );
}

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options?: SelectOption[];
  placeholder?: string;
};

/**
 * A native select. Server actions post plain form data, and the native control is keyboard- and
 * screen-reader-correct on every platform without shipping a listbox implementation.
 */
export function Select({
  className,
  label,
  hint,
  error,
  options,
  placeholder,
  id,
  required,
  children,
  ...props
}: SelectProps) {
  const inputId = id ?? (typeof props.name === "string" ? props.name : undefined);

  const control = (
    <div className="relative">
      <select
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cx(
          controlClasses,
          focusRing,
          "h-9 appearance-none pr-9",
          error ? invalidClasses : null,
          className,
        )}
        required={required}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        ) : null}
        {options?.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground,#64748b)]"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="m6 8 4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );

  if (!label && !hint && !error) return control;

  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} required={required}>
      {control}
    </Field>
  );
}

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: ReactNode;
  description?: ReactNode;
};

export function Checkbox({ className, label, description, id, ...props }: CheckboxProps) {
  const inputId = id ?? (typeof props.name === "string" ? props.name : undefined);

  const control = (
    <input
      id={inputId}
      type="checkbox"
      className={cx(
        "h-4 w-4 shrink-0 rounded border-[var(--color-border,#cbd5e1)] text-[var(--color-primary,#0f766e)] accent-[var(--color-primary,#0f766e)]",
        focusRing,
        className,
      )}
      {...props}
    />
  );

  if (!label && !description) return control;

  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm" htmlFor={inputId}>
      <span className="mt-0.5">{control}</span>
      <span>
        <span className="font-medium text-[var(--color-foreground,#0f172a)]">{label}</span>
        {description ? (
          <span className="block text-xs text-[var(--color-muted-foreground,#64748b)]">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
