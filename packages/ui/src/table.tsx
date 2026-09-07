import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cx, tabularNums } from "./utils";

/**
 * Wide tables scroll inside their own container so the page body never scrolls sideways.
 */
export function TableContainer({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "overflow-hidden rounded-xl border border-[var(--color-border,#e2e8f0)] bg-[var(--color-surface,#fff)] shadow-sm",
        className,
      )}
      {...props}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cx("w-full border-collapse text-left text-sm", className)} {...props}>
      {children}
    </table>
  );
}

export function THead({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cx(
        "border-b border-[var(--color-border,#e2e8f0)] bg-[var(--color-muted,#f8fafc)]",
        className,
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TBody({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cx("divide-y divide-[var(--color-border,#e2e8f0)]", className)}
      {...props}
    >
      {children}
    </tbody>
  );
}

export type TrProps = HTMLAttributes<HTMLTableRowElement> & {
  /** Rows that navigate somewhere get a pointer and a hover tint. */
  interactive?: boolean;
};

export function Tr({ className, interactive, children, ...props }: TrProps) {
  return (
    <tr
      className={cx(
        interactive
          ? "cursor-pointer transition-colors hover:bg-[var(--color-muted,#f8fafc)]"
          : null,
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export type ThProps = ThHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "right" | "center";
  /** Renders the sort affordance and marks the column for assistive tech. */
  sort?: "asc" | "desc" | "none";
};

export function Th({ className, align = "left", sort, children, ...props }: ThProps) {
  return (
    <th
      scope="col"
      aria-sort={sort === "asc" ? "ascending" : sort === "desc" ? "descending" : undefined}
      className={cx(
        "whitespace-nowrap px-4 py-2.5 text-[12px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground,#64748b)]",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
      {...props}
    >
      {sort ? (
        <span className="inline-flex items-center gap-1">
          {children}
          <SortGlyph direction={sort} />
        </span>
      ) : (
        children
      )}
    </th>
  );
}

export type TdProps = TdHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "right" | "center";
  /** Money, counts, and dates get tabular figures so columns line up. */
  numeric?: boolean;
  muted?: boolean;
};

export function Td({ className, align, numeric, muted, children, ...props }: TdProps) {
  const resolvedAlign = align ?? (numeric ? "right" : "left");
  return (
    <td
      className={cx(
        "px-4 py-3 align-middle text-[var(--color-foreground,#0f172a)]",
        resolvedAlign === "right" ? "text-right" : resolvedAlign === "center" ? "text-center" : null,
        numeric ? tabularNums : null,
        muted ? "text-[var(--color-muted-foreground,#64748b)]" : null,
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

/** Full-width message row for an empty or errored table body. */
export function TableMessage({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12">
        {children}
      </td>
    </tr>
  );
}

function SortGlyph({ direction }: { direction: "asc" | "desc" | "none" }) {
  return (
    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M6 2.5 8.5 5.5h-5L6 2.5Z"
        fill="currentColor"
        opacity={direction === "asc" ? 1 : 0.3}
      />
      <path
        d="M6 9.5 3.5 6.5h5L6 9.5Z"
        fill="currentColor"
        opacity={direction === "desc" ? 1 : 0.3}
      />
    </svg>
  );
}

/** Label/value pairs — the aside counterpart to a table. */
export function DataList({
  items,
  className,
}: {
  items: Array<{ label: ReactNode; value: ReactNode }>;
  className?: string;
}) {
  return (
    <dl className={cx("divide-y divide-[var(--color-border,#e2e8f0)] text-sm", className)}>
      {items.map((item, i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0">
          <dt className="shrink-0 text-[var(--color-muted-foreground,#64748b)]">{item.label}</dt>
          <dd className={cx("text-right font-medium", tabularNums)}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
