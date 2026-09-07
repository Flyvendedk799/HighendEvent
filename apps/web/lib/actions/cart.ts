"use server";

import { revalidatePath } from "next/cache";
import { serverDelete, serverGet, serverPatch, serverPost } from "../server-api";
import { getSession } from "../session";
import { ensureCartSessionId, getCartSessionId } from "../cart-session";
import { toActionState, type ActionState } from "./action-state";
import type { CartSummary } from "../types";

const EMPTY_SUMMARY: CartSummary = {
  cart: { id: "", items: [] },
  currency: "USD",
  paymentModel: "FULL_UPFRONT",
  itemCount: 0,
  upsellTotalMinor: 0,
  pricing: null,
  issues: [],
  checkoutReady: false,
};

function revalidateCart() {
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/", "layout");
}

/**
 * Reads the cart without creating one. A shopper who has never added anything has no cart
 * cookie and no cart row — asking for one on every page render would create empty carts for
 * every crawler that visits.
 */
export async function readCart(): Promise<CartSummary> {
  const session = await getSession();
  const sessionId = await getCartSessionId();

  if (session?.role !== "customer" && !sessionId) {
    return EMPTY_SUMMARY;
  }

  try {
    const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
    return await serverGet<CartSummary>(`/cart/summary${query}`, { cache: "no-store" });
  } catch {
    return EMPTY_SUMMARY;
  }
}

export async function addToCartAction(input: {
  productId: string;
  quantity: number;
  startDate: string;
  endDate: string;
  deliveryType?: "PICKUP" | "DELIVERY";
  upsellIds?: string[];
}): Promise<ActionState> {
  const session = await getSession();
  // A signed-in customer uses their account cart; a guest gets a cookie now.
  const sessionId = session?.role === "customer" ? undefined : await ensureCartSessionId();

  try {
    await serverPost("/cart/items", { ...input, sessionId });
  } catch (err) {
    return toActionState(err);
  }

  revalidateCart();
  return { ok: true };
}

export async function updateCartItemAction(
  itemId: string,
  data: { quantity?: number; startDate?: string; endDate?: string; deliveryType?: string },
): Promise<ActionState> {
  const sessionId = await getCartSessionId();

  try {
    await serverPatch(`/cart/items/${itemId}`, { ...data, sessionId });
  } catch (err) {
    return toActionState(err);
  }

  revalidateCart();
  return { ok: true };
}

export async function removeCartItemAction(itemId: string): Promise<ActionState> {
  const sessionId = await getCartSessionId();
  const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";

  try {
    await serverDelete(`/cart/items/${itemId}${query}`);
  } catch (err) {
    return toActionState(err);
  }

  revalidateCart();
  return { ok: true };
}

export async function setCartItemUpsellsAction(
  itemId: string,
  upsellIds: string[],
): Promise<ActionState> {
  const sessionId = await getCartSessionId();

  try {
    await serverPatch(`/cart/items/${itemId}/upsells`, { upsellIds, sessionId });
  } catch (err) {
    return toActionState(err);
  }

  revalidateCart();
  return { ok: true };
}

export async function clearCartAction(): Promise<ActionState> {
  const sessionId = await getCartSessionId();
  const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";

  try {
    await serverDelete(`/cart${query}`);
  } catch (err) {
    return toActionState(err);
  }

  revalidateCart();
  return { ok: true };
}

/** Called right after a customer signs in, so a guest cart is not silently abandoned. */
export async function mergeGuestCartAction(): Promise<ActionState> {
  const session = await getSession();
  const sessionId = await getCartSessionId();

  if (session?.role !== "customer" || !sessionId) return { ok: true };

  try {
    await serverPost("/cart/merge", { sessionId });
  } catch (err) {
    return toActionState(err);
  }

  revalidateCart();
  return { ok: true };
}
