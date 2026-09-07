import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

/**
 * Guest carts are addressed by an opaque id in the shopper's own cookie. The API never accepts
 * a customer id from the client, so this is the only way a signed-out shopper is identified.
 */
export const CART_COOKIE = "rentora_cart";

const CART_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function getCartSessionId(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value;
}

/**
 * Returns the existing guest cart id, creating one if needed.
 * Only callable from a server action or route handler, because it writes a cookie.
 */
export async function ensureCartSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CART_COOKIE)?.value;
  if (existing) return existing;

  const sessionId = randomUUID();
  store.set(CART_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_MAX_AGE_SECONDS,
  });
  return sessionId;
}

export async function clearCartSession(): Promise<void> {
  const store = await cookies();
  store.delete(CART_COOKIE);
}
