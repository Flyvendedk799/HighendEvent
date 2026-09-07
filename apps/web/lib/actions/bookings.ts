"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { serverDelete, serverGet, serverPatch, serverPost } from "../server-api";
import {
  assertCanWrite,
  moneyMinor,
  optionalStr,
  str,
  toActionState,
  type ActionState,
} from "./action-state";
import type { Booking } from "../types";

function revalidateBooking(bookingId?: string) {
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin");
  if (bookingId) revalidatePath(`/admin/bookings/${bookingId}`);
}

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function transitionBookingAction(
  bookingId: string,
  statusKey: string,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverPatch(`/bookings/${bookingId}/status`, { statusKey });
  } catch (err) {
    return toActionState(err);
  }

  revalidateBooking(bookingId);
  return { ok: true };
}

export async function updateBookingNotesAction(
  bookingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverPatch(`/bookings/${bookingId}/notes`, {
      notes: str(formData, "notes"),
      internalNotes: str(formData, "internalNotes"),
    });
  } catch (err) {
    return toActionState(err);
  }

  revalidateBooking(bookingId);
  return { ok: true };
}

export async function rescheduleBookingAction(
  bookingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  const startDate = str(formData, "startDate");
  const endDate = str(formData, "endDate");

  if (!startDate || !endDate) return { error: "Pick both dates." };
  if (endDate < startDate) return { error: "The end date must be on or after the start date." };

  try {
    await serverPatch(`/bookings/${bookingId}/reschedule`, { startDate, endDate });
  } catch (err) {
    return toActionState(err);
  }

  revalidateBooking(bookingId);
  return { ok: true };
}

export async function recordReturnAction(
  bookingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverPatch(`/bookings/${bookingId}/return`, {
      returnCondition: optionalStr(formData, "returnCondition"),
      damageFeeMinor: moneyMinor(formData, "damageFee", 0),
      internalNotes: optionalStr(formData, "internalNotes"),
    });
  } catch (err) {
    return toActionState(err);
  }

  revalidateBooking(bookingId);
  return { ok: true };
}

export async function deleteBookingAction(
  bookingId: string,
  reason?: string,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverDelete(`/bookings/${bookingId}`, { body: { reason } });
  } catch (err) {
    return toActionState(err);
  }

  revalidateBooking(bookingId);
  redirect("/admin/bookings");
}

export async function restoreBookingAction(bookingId: string): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverPost(`/bookings/${bookingId}/restore`);
  } catch (err) {
    return toActionState(err);
  }

  revalidateBooking(bookingId);
  return { ok: true };
}

/** Creates a Stripe session for the outstanding balance and hands back the payment link. */
export async function collectRemainderAction(
  bookingId: string,
): Promise<{ url?: string; stub?: boolean; message?: string | null } & ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  const base = await origin();

  try {
    const session = await serverPost<{ url: string; stub: boolean; message: string | null }>(
      "/checkout/remainder",
      {
        bookingId,
        successUrl: `${base}/admin/bookings/${bookingId}?paid=1`,
        cancelUrl: `${base}/admin/bookings/${bookingId}`,
      },
    );
    revalidateBooking(bookingId);
    return { ok: true, url: session.url, stub: session.stub, message: session.message };
  } catch (err) {
    return toActionState(err);
  }
}

export async function createManualBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  const items = JSON.parse(str(formData, "items") || "[]") as Array<{
    productId: string;
    quantity: number;
  }>;

  if (items.length === 0) {
    return { error: "Add at least one product to the booking." };
  }

  const payload = {
    customerName: str(formData, "customerName"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    address: str(formData, "address"),
    zipCode: str(formData, "zipCode"),
    city: str(formData, "city"),
    startDate: str(formData, "startDate"),
    endDate: str(formData, "endDate"),
    deliveryType: str(formData, "deliveryType") === "DELIVERY" ? "DELIVERY" : "PICKUP",
    deliveryFeeMinor: moneyMinor(formData, "deliveryFee", 0),
    notes: optionalStr(formData, "notes"),
    internalNotes: optionalStr(formData, "internalNotes"),
    items: items.map((item) => ({
      productId: item.productId,
      quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
    })),
  };

  const fieldErrors: Record<string, string> = {};
  if (!payload.customerName) fieldErrors.customerName = "Required";
  if (!payload.email) fieldErrors.email = "Required";
  if (!payload.phone) fieldErrors.phone = "Required";
  if (!payload.startDate) fieldErrors.startDate = "Required";
  if (!payload.endDate) fieldErrors.endDate = "Required";
  if (payload.endDate && payload.startDate && payload.endDate < payload.startDate) {
    fieldErrors.endDate = "Must be on or after the start date";
  }

  if (Object.keys(fieldErrors).length) {
    return { error: "Fill in the highlighted fields.", fieldErrors };
  }

  let booking: Booking;
  try {
    booking = await serverPost<Booking>("/bookings/manual", {
      ...payload,
      address: payload.address || "—",
      zipCode: payload.zipCode || "—",
      city: payload.city || "—",
      items: payload.items,
    });
  } catch (err) {
    return toActionState(err);
  }

  revalidateBooking();
  redirect(`/admin/bookings/${booking.id}?created=1`);
}

/** Price and availability preview for the manual booking form, before anything is saved. */
export async function previewManualBookingAction(input: {
  items: Array<{ productId: string; quantity: number }>;
  startDate: string;
  endDate: string;
  deliveryFeeMinor?: number;
}): Promise<{
  quote?: unknown;
  conflicts?: Array<{ productId: string; message: string }>;
} & ActionState> {
  if (!input.items.length || !input.startDate || !input.endDate) {
    return { error: "Choose products and dates first." };
  }

  try {
    const conflicts: Array<{ productId: string; message: string }> = [];

    for (const item of input.items) {
      const check = await serverPost<{ availableQuantity: number; isAvailable: boolean }>(
        "/availability/check",
        {
          productId: item.productId,
          startDate: input.startDate,
          endDate: input.endDate,
          quantity: item.quantity,
        },
      );
      if (!check.isAvailable) {
        conflicts.push({
          productId: item.productId,
          message: `Only ${check.availableQuantity} available on those dates`,
        });
      }
    }

    const quote = await serverPost("/pricing/quote", {
      items: input.items.map((item) => ({
        ...item,
        startDate: input.startDate,
        endDate: input.endDate,
      })),
      deliveryFeeMinor: input.deliveryFeeMinor ?? 0,
    });

    return { ok: true, quote, conflicts };
  } catch (err) {
    return toActionState(err);
  }
}

export async function getAllowedTransitionsAction(
  bookingId: string,
): Promise<Array<{ key: string; label: string }>> {
  try {
    return await serverGet<Array<{ key: string; label: string }>>(
      `/bookings/${bookingId}/transitions`,
      { cache: "no-store" },
    );
  } catch {
    return [];
  }
}
