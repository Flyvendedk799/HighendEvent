"use client";

import { useId, type ReactNode } from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cx, focusRing } from "./utils";

/**
 * The filter row above a list. Filters submit as plain GET form data so the resulting URL is
 * shareable, bookmarkable, and survives a reload — no client state to lose.
 */
export function FilterBar({
  action,
  children,
  className,
}: {
  action?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      method="GET"
      action={action}
      className={cx(
        "mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-[var(--color-border,#e2e8f0)] bg-[var(--color-surface,#fff)] p-3 shadow-sm",
        className,
      )}
    >
      {children}
    </form>
  );
}

export function SearchInput({
  name = "q",
  defaultValue,
  placeholder = "Search",
  className,
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cx("relative min-w-[200px] flex-1", className)}>
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground,#94a3b8)]"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="m13.5 13.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cx(
          "h-9 w-full rounded-lg border border-[var(--color-border,#cbd5e1)] bg-[var(--color-surface,#fff)] pl-9 pr-3 text-sm placeholder:text-[var(--color-muted-foreground,#94a3b8)]",
          "focus:border-[var(--color-primary,#0f766e)] focus:ring-2 focus:ring-[var(--color-primary,#0f766e)]/15 focus:outline-none",
        )}
      />
    </div>
  );
}

export type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  /** Builds the href for a page number — the caller owns the query string. */
  buildHref: (page: number) => string;
  renderLink: (props: { href: string; className: string; children: ReactNode }) => ReactNode;
};

export function Pagination({ page, pageSize, total, buildHref, renderLink }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  const linkClasses =
    "inline-flex h-8 items-center rounded-md border border-[var(--color-border,#e2e8f0)] bg-[var(--color-surface,#fff)] px-3 text-[13px] font-medium hover:bg-[var(--color-muted,#f1f5f9)]";
  const disabledClasses =
    "inline-flex h-8 cursor-not-allowed items-center rounded-md border border-[var(--color-border,#e2e8f0)] px-3 text-[13px] font-medium opacity-40";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border,#e2e8f0)] px-4 py-3 text-[13px] text-[var(--color-muted-foreground,#64748b)]">
      <p>
        <span className="tabular-nums">
          {first}–{last}
        </span>{" "}
        of <span className="tabular-nums">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          renderLink({ href: buildHref(page - 1), className: linkClasses, children: "Previous" })
        ) : (
          <span className={disabledClasses}>Previous</span>
        )}
        <span className="tabular-nums">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          renderLink({ href: buildHref(page + 1), className: linkClasses, children: "Next" })
        ) : (
          <span className={disabledClasses}>Next</span>
        )}
      </div>
    </div>
  );
}

export type SwitchProps = {
  name?: string;
  label?: ReactNode;
  description?: ReactNode;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
};

/**
 * Radix switch with a hidden checkbox mirror, so it posts inside a plain form the same way a
 * checkbox would.
 */
export function Switch({
  name,
  label,
  description,
  defaultChecked,
  checked,
  onCheckedChange,
  disabled,
}: SwitchProps) {
  const id = useId();

  return (
    <div className="flex items-start justify-between gap-4">
      {label || description ? (
        <label htmlFor={id} className="cursor-pointer text-sm">
          <span className="font-medium text-[var(--color-foreground,#0f172a)]">{label}</span>
          {description ? (
            <span className="mt-0.5 block text-xs text-[var(--color-muted-foreground,#64748b)]">
              {description}
            </span>
          ) : null}
        </label>
      ) : null}
      <SwitchPrimitive.Root
        id={id}
        name={name}
        value="on"
        defaultChecked={defaultChecked}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cx(
          "relative h-5 w-9 shrink-0 rounded-full bg-slate-300 transition-colors disabled:opacity-50",
          "data-[state=checked]:bg-[var(--color-primary,#0f766e)]",
          focusRing,
        )}
      >
        <SwitchPrimitive.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[1.125rem]" />
      </SwitchPrimitive.Root>
    </div>
  );
}
