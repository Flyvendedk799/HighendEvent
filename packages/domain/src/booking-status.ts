export type StatusDefinition = {
  key: string;
  label: string;
  isTerminal?: boolean;
  allowedNext?: string[];
};

export const DEFAULT_BOOKING_STATUSES: StatusDefinition[] = [
  {
    key: "pending",
    label: "Pending payment",
    allowedNext: ["deposit_paid", "fully_paid", "cancelled"],
  },
  {
    key: "deposit_paid",
    label: "Deposit paid",
    allowedNext: ["fully_paid", "out_for_delivery", "cancelled"],
  },
  {
    key: "fully_paid",
    label: "Fully paid",
    allowedNext: ["out_for_delivery", "cancelled"],
  },
  {
    key: "out_for_delivery",
    label: "Out for delivery",
    allowedNext: ["returned_good", "returned_damaged"],
  },
  {
    key: "returned_good",
    label: "Returned (good)",
    allowedNext: ["deposit_refunded"],
  },
  {
    key: "returned_damaged",
    label: "Returned (damaged)",
    allowedNext: ["deposit_refunded"],
  },
  { key: "deposit_refunded", label: "Deposit refunded", isTerminal: true, allowedNext: [] },
  { key: "cancelled", label: "Cancelled", isTerminal: true, allowedNext: [] },
];

export function canTransition(
  fromKey: string,
  toKey: string,
  definitions: StatusDefinition[] = DEFAULT_BOOKING_STATUSES,
): boolean {
  if (fromKey === toKey) return true;
  const from = definitions.find((d) => d.key === fromKey);
  if (!from || from.isTerminal) return false;
  return (from.allowedNext ?? []).includes(toKey);
}

export function assertTransition(
  fromKey: string,
  toKey: string,
  definitions: StatusDefinition[] = DEFAULT_BOOKING_STATUSES,
): void {
  if (!canTransition(fromKey, toKey, definitions)) {
    throw new Error(`Invalid booking status transition: ${fromKey} → ${toKey}`);
  }
}

export function isActiveBookingStatus(statusKey: string): boolean {
  return !["cancelled", "deposit_refunded"].includes(statusKey);
}

export function generateBookingNo(prefix = "RNT"): string {
  const now = new Date();
  const stamp = now.toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}
