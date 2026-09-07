"use server";

import { serverGet, serverPost } from "../server-api";
import { toActionState, type ActionState } from "./action-state";
import type {
  AvailabilityCalendar,
  AvailabilityCheck,
  DeliveryQuote,
  PricingBreakdown,
} from "../types";

/** Availability for one product over a window, used by the storefront calendar. */
export async function getAvailabilityAction(
  productId: string,
  startDate: string,
  endDate: string,
): Promise<{ calendar?: AvailabilityCalendar } & ActionState> {
  try {
    const calendar = await serverGet<AvailabilityCalendar>(
      `/availability/calendar?productId=${encodeURIComponent(productId)}` +
        `&startDate=${startDate}&endDate=${endDate}`,
      { anonymous: true, cache: "no-store" },
    );
    return { ok: true, calendar };
  } catch (err) {
    return toActionState(err);
  }
}

export async function checkAvailabilityAction(input: {
  productId: string;
  startDate: string;
  endDate: string;
  quantity: number;
  excludeBookingId?: string;
}): Promise<{ check?: AvailabilityCheck } & ActionState> {
  try {
    const check = await serverPost<AvailabilityCheck>("/availability/check", input);
    return { ok: true, check };
  } catch (err) {
    return toActionState(err);
  }
}

/**
 * Live price for a prospective booking, computed by the same domain code that prices the real
 * one — so the number the shopper sees is the number they are charged.
 */
export async function getQuoteAction(input: {
  items: Array<{ productId: string; quantity: number; startDate: string; endDate: string }>;
  deliveryFeeMinor?: number;
  discountMinor?: number;
}): Promise<{ quote?: PricingBreakdown } & ActionState> {
  try {
    const quote = await serverPost<PricingBreakdown>("/pricing/quote", input);
    return { ok: true, quote };
  } catch (err) {
    return toActionState(err);
  }
}

export async function getDeliveryQuoteAction(input: {
  address: string;
  zipCode?: string;
  city?: string;
  country?: string;
}): Promise<{ quote?: DeliveryQuote } & ActionState> {
  try {
    const quote = await serverPost<DeliveryQuote>("/delivery/quote", input);
    return { ok: true, quote };
  } catch (err) {
    return toActionState(err);
  }
}
