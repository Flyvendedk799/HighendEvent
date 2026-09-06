import { headers } from "next/headers";

export async function getTenantSlug(): Promise<string | null> {
  const h = await headers();
  return h.get("x-tenant-slug");
}

export async function getSurface(): Promise<string | null> {
  const h = await headers();
  return h.get("x-rentora-surface");
}
