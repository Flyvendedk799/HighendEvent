import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { serverGet } from "./server-api";
import { isApiError } from "./api";
import type { StorefrontBootstrap } from "./types";

export type Surface = "marketing" | "platform" | "tenant" | "tenant-domain";

export async function getTenantSlug(): Promise<string | null> {
  const h = await headers();
  return h.get("x-tenant-slug");
}

export async function getTenantHost(): Promise<string | null> {
  const h = await headers();
  return h.get("x-rentora-host");
}

export async function getSurface(): Promise<Surface> {
  const h = await headers();
  return (h.get("x-rentora-surface") as Surface) ?? "marketing";
}

/** True when this request is being served for a specific tenant (subdomain or custom domain). */
export async function hasTenant(): Promise<boolean> {
  const surface = await getSurface();
  return surface === "tenant" || surface === "tenant-domain";
}

/**
 * Store identity, branding, and enabled features. Deduped per render by React cache so the
 * layout, the header, and any page can all ask for it without extra round trips.
 *
 * Returns null when the host does not resolve to a live tenant, which is how the storefront
 * knows to show "store not found" instead of a half-branded page.
 */
export const getBootstrap = cache(async (): Promise<StorefrontBootstrap | null> => {
  if (!(await hasTenant())) return null;

  try {
    return await serverGet<StorefrontBootstrap>("/storefront/bootstrap", {
      anonymous: true,
      next: { revalidate: 30, tags: ["storefront-bootstrap"] },
    });
  } catch (err) {
    if (isApiError(err) && (err.status === 404 || err.status === 400)) return null;
    throw err;
  }
});

/** Formats minor units in the store currency and locale. */
export function formatMoney(
  amountMinor: number,
  currency: string,
  locale = "en",
): string {
  return new Intl.NumberFormat(locale === "da" ? "da-DK" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
  }).format(amountMinor / 100);
}
