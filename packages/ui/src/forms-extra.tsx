import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cx } from "./utils";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
};

export function Select({ label, hint, error, className, id, children, ...props }: SelectProps) {
  const selectId = id ?? (typeof props.name === "string" ? props.name : undefined);
  const field = (
    <select
      id={selectId}
      className={cx(
        "h-10 w-full rounded-lg border border-[var(--color-border,#cbd5e1)] bg-[var(--color-surface,#fff)] px-3 text-sm text-[var(--color-foreground,#0f172a)] outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:opacity-50",
        error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : null,
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );

  if (!label && !hint && !error) return field;

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

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
};

export function Textarea({ label, hint, error, className, id, ...props }: TextareaProps) {
  const areaId = id ?? (typeof props.name === "string" ? props.name : undefined);
  const field = (
    <textarea
      id={areaId}
      className={cx(
        "min-h-[96px] w-full rounded-lg border border-[var(--color-border,#cbd5e1)] bg-[var(--color-surface,#fff)] px-3 py-2 text-sm text-[var(--color-foreground,#0f172a)] outline-none transition placeholder:text-[var(--color-muted-foreground,#94a3b8)] focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:opacity-50",
        error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : null,
        className,
      )}
      {...props}
    />
  );

  if (!label && !hint && !error) return field;

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

export type DialogProps = {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
};

export function Dialog({ open, title, description, children, onClose, footer }: DialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-950/45"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--color-border,#e2e8f0)] bg-[var(--color-surface,#fff)] p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-[var(--color-muted-foreground,#64748b)]">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-[var(--color-muted-foreground,#64748b)] hover:bg-[var(--color-muted,#f1f5f9)]"
          >
            Close
          </button>
        </div>
        <div className="mt-5">{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export function IconButton({ label, className, children, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-surface,#fff)] text-sm hover:bg-[var(--color-muted,#f1f5f9)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
