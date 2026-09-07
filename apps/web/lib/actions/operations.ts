"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { serverDelete, serverGet, serverPatch, serverPost, serverPut } from "../server-api";
import {
  assertCanWrite,
  bool,
  int,
  moneyMinor,
  optionalStr,
  str,
  toActionState,
  type ActionState,
} from "./action-state";

// ----------------------------------------------------------------- Locations

export type Location = {
  id: string;
  name: string;
  address: string;
  zipCode: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
  isActive: boolean;
};

export async function getLocations(): Promise<Location[]> {
  return serverGet<Location[]>("/locations", { cache: "no-store" }).catch(() => []);
}

export async function saveLocationAction(
  locationId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  const payload = {
    name: str(formData, "name"),
    address: str(formData, "address"),
    zipCode: str(formData, "zipCode"),
    city: str(formData, "city"),
    country: str(formData, "country") || "DK",
    latitude: formData.get("latitude") ? Number(str(formData, "latitude")) : undefined,
    longitude: formData.get("longitude") ? Number(str(formData, "longitude")) : undefined,
    isPrimary: bool(formData, "isPrimary"),
    isActive: bool(formData, "isActive"),
  };

  const fieldErrors: Record<string, string> = {};
  if (!payload.name) fieldErrors.name = "Required";
  if (!payload.address) fieldErrors.address = "Required";
  if (!payload.city) fieldErrors.city = "Required";

  // Delivery pricing measures from these coordinates, so a primary location without them
  // silently breaks every delivery quote.
  if (payload.isPrimary && (payload.latitude === undefined || payload.longitude === undefined)) {
    return {
      error:
        "Your main location needs latitude and longitude — delivery distances are measured from it.",
      fieldErrors,
    };
  }

  if (Object.keys(fieldErrors).length) {
    return { error: "Fill in the highlighted fields.", fieldErrors };
  }

  try {
    if (locationId) {
      await serverPatch(`/locations/${locationId}`, payload);
    } else {
      await serverPost("/locations", payload);
    }
  } catch (err) {
    return toActionState(err);
  }

  revalidatePath("/admin/locations");
  revalidatePath("/admin/go-live");
  return { ok: true };
}

export async function deleteLocationAction(id: string): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverDelete(`/locations/${id}`);
  } catch (err) {
    return toActionState(err);
  }

  revalidatePath("/admin/locations");
  return { ok: true };
}

// ------------------------------------------------------------------ Delivery

export type DeliverySetting = {
  id: string;
  type: "PICKUP" | "DELIVERY";
  baseFeeMinor: number;
  perKmFeeMinor: number;
  freeDeliveryKm: number;
  maxDeliveryKm: number | null;
  currency: string;
  notes: string | null;
  isActive: boolean;
};

export async function getDeliverySettings(): Promise<DeliverySetting[]> {
  return serverGet<DeliverySetting[]>("/delivery-settings", { cache: "no-store" }).catch(
    () => [],
  );
}

export async function saveDeliverySettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  const enabled = bool(formData, "deliveryEnabled");
  const freeKm = int(formData, "freeDeliveryKm", 0);
  const maxKm = int(formData, "maxDeliveryKm", 0);

  if (enabled && maxKm > 0 && freeKm > maxKm) {
    return { error: "The free radius cannot be larger than the maximum radius." };
  }

  try {
    await serverPut("/delivery-settings", {
      type: "DELIVERY",
      baseFeeMinor: moneyMinor(formData, "baseFee", 0),
      perKmFeeMinor: moneyMinor(formData, "perKmFee", 0),
      freeDeliveryKm: freeKm,
      maxDeliveryKm: maxKm > 0 ? maxKm : null,
      notes: optionalStr(formData, "deliveryNotes"),
      isActive: enabled,
    });

    await serverPut("/delivery-settings", {
      type: "PICKUP",
      baseFeeMinor: moneyMinor(formData, "pickupFee", 0),
      notes: optionalStr(formData, "pickupNotes"),
      isActive: bool(formData, "pickupEnabled"),
    });
  } catch (err) {
    return toActionState(err);
  }

  revalidateTag("storefront-bootstrap");
  revalidatePath("/admin/delivery");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------- Newsletter

export type NewsletterSubscription = {
  id: string;
  email: string;
  isActive: boolean;
  confirmedAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
};

export async function getNewsletterSubscribers(): Promise<NewsletterSubscription[]> {
  return serverGet<NewsletterSubscription[]>("/newsletter", { cache: "no-store" }).catch(
    () => [],
  );
}

export async function unsubscribeAction(email: string): Promise<ActionState> {
  const denied = await assertCanWrite();
  if (denied) return denied;

  try {
    await serverPost("/newsletter/unsubscribe", { email });
  } catch (err) {
    return toActionState(err);
  }

  revalidatePath("/admin/newsletter");
  return { ok: true };
}
