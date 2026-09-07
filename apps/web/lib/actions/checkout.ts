"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { serverPost } from "../server-api";
import { getSession } from "../session";
import { getCartSessionId } from "../cart-session";
import { getLocale } from "../locale";
import { str, optionalStr, toActionState, type ActionState } from "./action-state";
import type { DeliveryQuote } from "../types";

type CheckoutSession = {
  stub: boolean;
  id: string;
  url: string;
  message: string | null;
  bookingId: string;
  bookingNo: string;
  amountMinor: number;
  currency: string;
};

/** Absolute origin for Stripe return URLs, taken from the request rather than guessed. */
async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function quoteDeliveryAction(input: {
  address: string;
  zipCode?: string;
  city?: string;
}): Promise<{ quote?: DeliveryQuote } & ActionState> {
  if (!input.address.trim()) {
    return { error: "Enter a delivery address first." };
  }

  try {
    const quote = await serverPost<DeliveryQuote>("/checkout/delivery-quote", input);
    return { ok: true, quote };
  } catch (err) {
    return toActionState(err);
  }
}

export async function startCheckoutAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  const sessionId = session?.role === "customer" ? undefined : await getCartSessionId();

  const deliveryType = str(formData, "deliveryType") === "DELIVERY" ? "DELIVERY" : "PICKUP";

  const payload = {
    sessionId,
    customerName: str(formData, "customerName"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    address: str(formData, "address"),
    zipCode: str(formData, "zipCode"),
    city: str(formData, "city"),
    country: optionalStr(formData, "country"),
    // Recorded on the booking so the confirmation comes back in the same language.
    locale: await getLocale(),
    deliveryType,
    notes: optionalStr(formData, "notes"),
  };

  const fieldErrors: Record<string, string> = {};
  if (!payload.customerName) fieldErrors.customerName = "Required";
  if (!payload.email) fieldErrors.email = "Required";
  if (!payload.phone) fieldErrors.phone = "Required";
  if (!payload.address) fieldErrors.address = "Required";
  if (!payload.zipCode) fieldErrors.zipCode = "Required";
  if (!payload.city) fieldErrors.city = "Required";

  if (Object.keys(fieldErrors).length) {
    return { error: "Fill in the highlighted fields.", fieldErrors };
  }

  const base = await origin();

  let result: CheckoutSession;
  try {
    result = await serverPost<CheckoutSession>("/checkout/session", {
      ...payload,
      successUrl: `${base}/confirmation`,
      cancelUrl: `${base}/cart?cancelled=1`,
    });
  } catch (err) {
    return toActionState(err);
  }

  // Stripe hosts the payment page; the stub flow lands straight on the confirmation.
  redirect(result.url);
}
