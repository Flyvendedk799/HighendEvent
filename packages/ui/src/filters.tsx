"use client";

import { useId, type ReactNode } from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cx, focusRing, monoLabel } from "./utils";

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
        "mb-4 flex flex-wrap items-end gap-2 border border-line bg-ink-raised p-3",
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
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-paper-faint"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="m13.5 13.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      </svg>
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cx(
          "h-10 w-full border border-line-strong bg-ink-sunk pl-9 pr-3 font-mono text-[13px] text-paper",
          "placeholder:font-sans placeholder:text-paper-ghost focus:border-signal focus:outline-none",
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

  const linkClasses = cx(
    "inline-flex h-8 items-center border border-line-strong px-3 text-[10px] text-paper transition-colors duration-instant hover:border-signal hover:text-signal",
    monoLabel,
    focusRing,
  );
  const disabledClasses = cx(
    "inline-flex h-8 cursor-not-allowed items-center border border-line px-3 text-[10px] text-paper-ghost",
    monoLabel,
  );

  return (
    <div
      className={cx(
        "flex flex-wrap items-center justify-between gap-3 border-t border-line bg-ink-sunk px-4 py-3 text-[10px] text-paper-mute",
        monoLabel,
      )}
    >
      <p>
        <span className="tabular-nums text-paper-dim">
          {first}–{last}
        </span>{" "}
        of <span className="tabular-nums text-paper-dim">{total}</span>
      </p>
      <div className="flex items-center gap-3">
        {page > 1 ? (
          renderLink({ href: buildHref(page - 1), className: linkClasses, children: "Prev" })
        ) : (
          <span className={disabledClasses}>Prev</span>
        )}
        <span className="tabular-nums">
          {page} / {totalPages}
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
 * checkbox would. Square, like everything else — a pill here would be the only radius in the app.
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
        <label htmlFor={id} className="cursor-pointer text-[13.5px]">
          <span className="text-paper">{label}</span>
          {description ? (
            <span className="mt-1 block text-[12px] leading-snug text-paper-mute">
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
          "relative h-5 w-10 shrink-0 border border-line-strong bg-ink-sunk transition-colors duration-instant",
          "data-[state=checked]:border-signal data-[state=checked]:bg-signal-tint disabled:opacity-40",
          focusRing,
        )}
      >
        <SwitchPrimitive.Thumb className="block h-3.5 w-3.5 translate-x-[2px] bg-paper-mute transition-transform duration-control ease-out data-[state=checked]:translate-x-[21px] data-[state=checked]:bg-signal" />
      </SwitchPrimitive.Root>
    </div>
  );
}

/**
 * A segmented scope switch — day / week / month, all / open / closed. One option is always on,
 * so it is a filter you cannot clear yourself into an empty screen with.
 */
export function ScopeSwitch<T extends string>({
  value,
  options,
  onChange,
  className,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (next: T) => void;
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx("flex gap-px border border-line-strong bg-line-strong", className)}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.value)}
            className={cx(
              "px-3 py-1.5 text-[10px] transition-colors duration-instant",
              monoLabel,
              on ? "bg-signal text-signal-ink" : "bg-ink text-paper-dim hover:text-paper",
              focusRing,
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
