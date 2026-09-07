export type ClassValue = string | false | null | undefined;

export function cx(...parts: ClassValue[]): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Focus ring used by every interactive primitive, so focus looks the same everywhere.
 * On near-black there is no room for a soft halo — it is the signal colour, square, offset by
 * one pixel so it reads against both a panel and a page.
 */
export const focusRing =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--signal,#D7FF3E)]";

/** Money and dates line up in tables only if the digits are tabular. */
export const tabularNums = "[font-variant-numeric:tabular-nums]";

/**
 * The label voice: uppercase mono, wide tracking. Eyebrows, column heads, chips, status words,
 * button text. Anything a machine produced rather than a person wrote.
 */
export const monoLabel = "font-mono uppercase tracking-[0.14em]";

/** A raised panel: one hairline, no radius, no shadow. */
export const panel = "border border-line bg-ink-raised";

/**
 * A 1px grid drawn as gaps over a rule-coloured ground. Cheaper and more exact than borders on
 * each cell, which double up and misalign at the seams.
 */
export const hairlineGrid = "grid gap-px bg-line border border-line [&>*]:bg-ink-raised";

/** Row heights are fixed by surface: the storefront breathes, the console does not. */
export const rowHeights = { store: "h-[42px]", console: "h-9" } as const;
