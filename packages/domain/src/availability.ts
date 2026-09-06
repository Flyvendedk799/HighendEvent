import {
  addDays,
  datesOverlap,
  eachDate,
  toDate,
  toIsoDate,
  type DateInput,
} from "./types.js";

export type ProductAvailabilityInput = {
  id: string;
  stockQty: number;
  prepBufferDays: number;
  cleanupBufferDays: number;
  isActive: boolean;
};

export type BookingOccupancy = {
  id: string;
  bookingNo: string;
  productId: string;
  quantity: number;
  startDate: DateInput;
  endDate: DateInput;
  statusKey: string;
  isDeleted?: boolean;
};

export type Blackout = {
  productId: string;
  startDate: DateInput;
  endDate: DateInput;
};

export type DayAvailability = {
  date: string;
  availableQuantity: number;
  isAvailable: boolean;
  isBlackedOut: boolean;
};

const INACTIVE = new Set(["cancelled", "canceled"]);

function occupies(statusKey: string, isDeleted?: boolean): boolean {
  if (isDeleted) return false;
  return !INACTIVE.has(statusKey.toLowerCase());
}

export function hasBlackoutOverlap(
  blackouts: Blackout[],
  productId: string,
  startDate: DateInput,
  endDate: DateInput,
): boolean {
  return blackouts.some(
    (b) =>
      b.productId === productId && datesOverlap(b.startDate, b.endDate, startDate, endDate),
  );
}

export function availableQuantity(params: {
  product: ProductAvailabilityInput;
  startDate: DateInput;
  endDate: DateInput;
  bookings: BookingOccupancy[];
  blackouts: Blackout[];
  excludeBookingId?: string;
}): number {
  const { product, startDate, endDate, bookings, blackouts, excludeBookingId } = params;
  if (!product.isActive) return 0;
  if (hasBlackoutOverlap(blackouts, product.id, startDate, endDate)) return 0;

  const effectiveStart = addDays(startDate, -product.prepBufferDays);
  const effectiveEnd = addDays(endDate, product.cleanupBufferDays);

  const booked = bookings
    .filter(
      (b) =>
        b.productId === product.id &&
        occupies(b.statusKey, b.isDeleted) &&
        b.id !== excludeBookingId &&
        datesOverlap(b.startDate, b.endDate, effectiveStart, effectiveEnd),
    )
    .reduce((sum, b) => sum + b.quantity, 0);

  return Math.max(0, product.stockQty - booked);
}

export function isAvailable(params: {
  product: ProductAvailabilityInput;
  startDate: DateInput;
  endDate: DateInput;
  quantity: number;
  bookings: BookingOccupancy[];
  blackouts: Blackout[];
  excludeBookingId?: string;
}): boolean {
  return availableQuantity(params) >= params.quantity;
}

export function getAvailabilityCalendar(params: {
  product: ProductAvailabilityInput;
  startDate: DateInput;
  endDate: DateInput;
  bookings: BookingOccupancy[];
  blackouts: Blackout[];
}): DayAvailability[] {
  return eachDate(params.startDate, params.endDate).map((day) => {
    const qty = availableQuantity({
      product: params.product,
      startDate: day,
      endDate: day,
      bookings: params.bookings,
      blackouts: params.blackouts,
    });
    const isBlackedOut = hasBlackoutOverlap(params.blackouts, params.product.id, day, day);
    return {
      date: toIsoDate(day),
      availableQuantity: qty,
      isAvailable: qty > 0 && !isBlackedOut,
      isBlackedOut,
    };
  });
}

export function getConflictingBookings(params: {
  product: ProductAvailabilityInput;
  startDate: DateInput;
  endDate: DateInput;
  bookings: BookingOccupancy[];
  excludeBookingId?: string;
}) {
  const effectiveStart = addDays(params.startDate, -params.product.prepBufferDays);
  const effectiveEnd = addDays(params.endDate, params.product.cleanupBufferDays);
  const map = new Map<
    string,
    {
      bookingId: string;
      bookingNo: string;
      startDate: string;
      endDate: string;
      statusKey: string;
      quantity: number;
    }
  >();

  for (const b of params.bookings) {
    if (b.productId !== params.product.id) continue;
    if (!occupies(b.statusKey, b.isDeleted)) continue;
    if (params.excludeBookingId && b.id === params.excludeBookingId) continue;
    if (!datesOverlap(b.startDate, b.endDate, effectiveStart, effectiveEnd)) continue;
    const existing = map.get(b.id);
    if (existing) existing.quantity += b.quantity;
    else {
      map.set(b.id, {
        bookingId: b.id,
        bookingNo: b.bookingNo,
        startDate: toIsoDate(b.startDate),
        endDate: toIsoDate(b.endDate),
        statusKey: b.statusKey,
        quantity: b.quantity,
      });
    }
  }
  return [...map.values()];
}

export function assertValidRange(startDate: DateInput, endDate: DateInput): void {
  if (toDate(endDate).getTime() < toDate(startDate).getTime()) {
    throw new Error("endDate must be on or after startDate");
  }
}
