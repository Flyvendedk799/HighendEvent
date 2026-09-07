"use server";

import { revalidatePath } from "next/cache";
import { serverDelete, serverGet, serverPatch, serverPost } from "../server-api";
import { assertCanWrite, toActionState, type ActionState } from "./action-state";

export type Coupon = {
  id: string;
  code: string;
  percentOffBps: number | null;
  amountOffMinor: number | null;
  currency: string | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
};

export type CouponQuote =
  | { valid: true; code: string; discountMinor: number; description: string; reason: null }
  | { valid: false; discountMinor: 0; reason: string };

export async function getCoupons(): Promise<Coupon[]> {
  return serverGet<Coupon[]>("/coupons", { cache: "no-store" }).catch(() => []);
}

export async function saveCouponAction(input: {
  id: string | null;
  code: string;
  kind: "percent" | "amount";
  value: string;
  currency: string;
  maxRedemptions?: string;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
}): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  const numeric = Number(input.value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return { error: "Enter a discount above zero." };
  }
  if (input.kind === "percent" && numeric > 100) {
    return { error: "A percentage discount cannot be more than 100." };
  }
  if (input.startsAt && input.endsAt && input.endsAt < input.startsAt) {
    return { error: "The end date must be after the start date." };
  }

  const payload = {
    code: input.code,
    percentOffBps: input.kind === "percent" ? Math.round(numeric * 100) : undefined,
    amountOffMinor: input.kind === "amount" ? Math.round(numeric * 100) : undefined,
    currency: input.kind === "amount" ? input.currency : undefined,
    maxRedemptions: input.maxRedemptions ? Number(input.maxRedemptions) : undefined,
    startsAt: input.startsAt || undefined,
    endsAt: input.endsAt || undefined,
    isActive: input.isActive,
  };

  try {
    if (input.id) {
      await serverPatch(`/coupons/${input.id}`, payload);
    } else {
      await serverPost("/coupons", payload);
    }
  } catch (err) {
    return toActionState(err);
  }

  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function deleteCouponAction(id: string): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverDelete(`/coupons/${id}`);
  } catch (err) {
    return toActionState(err);
  }

  revalidatePath("/admin/coupons");
  return { ok: true };
}

/** Used by the cart while the shopper is still deciding — nothing is redeemed. */
export async function quoteCouponAction(input: {
  code: string;
  subtotalMinor: number;
  currency: string;
}): Promise<{ quote?: CouponQuote } & ActionState> {
  try {
    const quote = await serverPost<CouponQuote>("/coupons/quote", input);
    return { ok: true, quote };
  } catch (err) {
    return toActionState(err);
  }
}
