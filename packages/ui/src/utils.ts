export type ClassValue = string | false | null | undefined;

export function cx(...parts: ClassValue[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Focus ring used by every interactive primitive, so focus looks the same everywhere. */
export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring,#0f766e)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface,#fff)]";

/** Money and dates line up in tables only if the digits are tabular. */
export const tabularNums = "[font-variant-numeric:tabular-nums]";
