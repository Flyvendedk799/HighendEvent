import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cx, monoLabel } from "./utils";
import { Field } from "./field";

/*
 * Controls sit *below* the panel they live on — sunk ink, one hairline — so an input reads as a
 * hole you type into rather than a raised card. Focus moves the border to the signal colour;
 * there is no glow, because a glow on near-black is just noise.
 */
export const controlClasses =
  "w-full border border-line-strong bg-ink-sunk px-3 font-mono text-[13px] text-paper transition-colors duration-instant " +
  "placeholder:font-sans placeholder:text-paper-ghost focus:border-signal focus:outline-none " +
  "disabled:cursor-not-allowed disabled:bg-ink disabled:text-paper-faint";

const invalidClasses = "border-danger-border focus:border-danger";

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
        "h-10",
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
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.12em] text-paper-faint">
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
      className={cx(
        controlClasses,
        // Long-form copy is written by a person, so it is set in the human face.
        "py-2.5 font-sans text-[14px] leading-relaxed",
        error ? invalidClasses : null,
        className,
      )}
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
          "h-10 appearance-none pr-9",
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
        className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-paper-mute"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="m6 8 4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
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
        "h-4 w-4 shrink-0 appearance-none border border-line-strong bg-ink-sunk",
        "checked:border-signal checked:bg-signal",
        // The tick is drawn in ink on the lime fill; a UA tick would come in the UA's blue.
        "checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Cpath d=%22M3.5 8.5l3 3 6-7%22 fill=%22none%22 stroke=%22%230C0D0F%22 stroke-width=%222%22/%3E%3C/svg%3E')] checked:bg-center checked:bg-no-repeat",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-signal",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );

  if (!label && !description) return control;

  return (
    <label className="flex cursor-pointer items-start gap-3 text-[13.5px]" htmlFor={inputId}>
      <span className="mt-0.5">{control}</span>
      <span className="min-w-0">
        <span className="text-paper">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[12px] leading-snug text-paper-mute">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

/**
 * A stepper for small counts. Rental quantities are almost always single digits, and a select
 * of twenty options to pick "2" is a worse control than two buttons.
 */
export function QuantityStepper({
  value,
  min = 1,
  max = 99,
  onChange,
  label = "Quantity",
  className,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  label?: string;
  className?: string;
}) {
  const step = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)));

  return (
    <div className={cx("flex items-center justify-between gap-4", className)}>
      <span className={cx("text-[10px] text-paper-mute", monoLabel)}>{label}</span>
      <div className="flex border border-line-strong">
        <StepButton label={`Decrease ${label.toLowerCase()}`} onClick={() => step(-1)} disabled={value <= min}>
          −
        </StepButton>
        <span
          aria-live="polite"
          className="flex h-8 w-11 items-center justify-center border-x border-line-strong font-mono text-[14px] tabular-nums"
        >
          {value}
        </span>
        <StepButton label={`Increase ${label.toLowerCase()}`} onClick={() => step(1)} disabled={value >= max}>
          +
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="h-8 w-8 text-[16px] leading-none text-paper transition-colors duration-instant hover:bg-ink-hover disabled:text-paper-ghost disabled:hover:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-signal"
    >
      {children}
    </button>
  );
}
