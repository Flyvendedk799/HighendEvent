"use server";

import { revalidatePath } from "next/cache";
import { serverGet, serverPatch, serverPost } from "../server-api";
import { setSession } from "../session";
import { toActionState, type ActionState } from "./action-state";

export type PlatformTenant = {
  id: string;
  name: string;
  slug: string;
  plan: "STARTER" | "GROWTH" | "SCALE";
  isSuspended: boolean;
  connectOnboarded: boolean;
  createdAt: string;
  storeName: string | null;
  currency: string;
  primaryDomain: string | null;
  counts: { products: number; bookings: number; customers: number; staff: number };
  gmvMinor: number;
  featureFlags: Record<string, boolean>;
};

export type PlatformMetrics = {
  tenants: number;
  activeTenants: number;
  suspendedTenants: number;
  connectedTenants: number;
  bookings: number;
  bookingsLast30Days: number;
  gmvMinor: number;
  customers: number;
  mrrMinor: number;
  mrrCurrency: string;
  byPlan: Array<{ plan: string; tenants: number; priceMinor: number }>;
};

export type AuditEntry = {
  id: string;
  tenantId: string | null;
  actorType: string;
  actorId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
};

export async function getPlatformMetrics(): Promise<PlatformMetrics | null> {
  return serverGet<PlatformMetrics>("/platform/metrics", { cache: "no-store" }).catch(
    () => null,
  );
}

export async function getPlatformTenants(query?: {
  q?: string;
  plan?: string;
  suspended?: string;
}): Promise<PlatformTenant[]> {
  const params = new URLSearchParams();
  if (query?.q) params.set("q", query.q);
  if (query?.plan) params.set("plan", query.plan);
  if (query?.suspended) params.set("suspended", query.suspended);

  return serverGet<PlatformTenant[]>(
    `/platform/tenants${params.toString() ? `?${params}` : ""}`,
    { cache: "no-store" },
  ).catch(() => []);
}

export async function getAuditLog(tenantId?: string): Promise<AuditEntry[]> {
  return serverGet<AuditEntry[]>(
    `/platform/audit-log${tenantId ? `?tenantId=${tenantId}` : ""}`,
    { cache: "no-store" },
  ).catch(() => []);
}

export async function suspendTenantAction(
  id: string,
  suspended: boolean,
  reason?: string,
): Promise<ActionState> {
  try {
    await serverPatch(`/platform/tenants/${id}/suspend`, { suspended, reason });
  } catch (err) {
    return toActionState(err);
  }

  revalidatePath("/platform/tenants");
  revalidatePath("/platform");
  return { ok: true };
}

export async function changeTenantPlanAction(id: string, plan: string): Promise<ActionState> {
  try {
    await serverPatch(`/platform/tenants/${id}/plan`, { plan });
  } catch (err) {
    return toActionState(err);
  }

  revalidatePath("/platform/tenants");
  revalidatePath("/platform");
  return { ok: true };
}

export async function setTenantFlagsAction(
  id: string,
  flags: Record<string, boolean>,
): Promise<ActionState> {
  try {
    await serverPatch(`/platform/tenants/${id}/flags`, { flags });
  } catch (err) {
    return toActionState(err);
  }

  revalidatePath("/platform/feature-flags");
  revalidatePath("/platform/tenants");
  return { ok: true };
}

/**
 * Swaps the operator session for a short-lived tenant staff session.
 *
 * The API writes an audit entry before issuing the token, so support access is always
 * attributable. The operator has to log back in afterwards, which is the point.
 */
export async function viewAsTenantAction(
  id: string,
): Promise<{ tenantSlug?: string } & ActionState> {
  try {
    const result = await serverPost<{ accessToken: string; tenantSlug: string }>(
      `/platform/tenants/${id}/view-as`,
    );
    await setSession(result.accessToken);
    return { ok: true, tenantSlug: result.tenantSlug };
  } catch (err) {
    return toActionState(err);
  }
}
