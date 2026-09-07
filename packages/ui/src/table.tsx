import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cx, monoLabel, tabularNums } from "./utils";

/**
 * Wide tables scroll inside their own container so the page body never scrolls sideways.
 */
export function TableContainer({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("border border-line bg-ink", className)} {...props}>
      <div className="overflow-x-auto [overscroll-behavior-x:contain]">{children}</div>
    </div>
  );
}

export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cx("w-full border-collapse text-left text-[13px]", className)}
      {...props}
    >
      {children}
    </table>
  );
}

export function THead({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cx("border-b border-line bg-ink-sunk", className)} {...props}>
      {children}
    </thead>
  );
}

export function TBody({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cx("divide-y divide-line-soft", className)} {...props}>
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
        interactive ? "cursor-pointer transition-colors duration-instant hover:bg-ink-hover" : null,
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
        "whitespace-nowrap px-4 py-2.5 text-[9px] font-medium text-paper-ghost",
        monoLabel,
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
      {...props}
    >
      {sort ? (
        <span className="inline-flex items-center gap-1.5">
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
  /** Money, counts, and dates get tabular mono figures so columns line up. */
  numeric?: boolean;
  muted?: boolean;
};

export function Td({ className, align, numeric, muted, children, ...props }: TdProps) {
  const resolvedAlign = align ?? (numeric ? "right" : "left");
  return (
    <td
      className={cx(
        "h-[42px] px-4 py-2.5 align-middle text-paper",
        resolvedAlign === "right" ? "text-right" : resolvedAlign === "center" ? "text-center" : null,
        numeric ? cx("font-mono text-[12.5px]", tabularNums) : null,
        muted ? "text-paper-mute" : null,
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
    <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 2 9 5.5H3L6 2Z" fill="currentColor" opacity={direction === "asc" ? 1 : 0.3} />
      <path d="M6 10 3 6.5h6L6 10Z" fill="currentColor" opacity={direction === "desc" ? 1 : 0.3} />
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
    <dl className={cx("divide-y divide-line-soft text-[13px]", className)}>
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
        >
          <dt className="shrink-0 text-paper-mute">{item.label}</dt>
          <dd className={cx("text-right font-mono text-[12.5px] text-paper", tabularNums)}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
