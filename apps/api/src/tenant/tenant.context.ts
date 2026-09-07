import { AsyncLocalStorage } from "node:async_hooks";

export type TenantContextValue = {
  /** Empty until a tenant is resolved from the host/header or from the caller token. */
  tenantId?: string;
  tenantSlug?: string;
  storeId?: string;
  /** How the tenant was resolved — useful for debugging and audit logs. */
  source?: "header" | "subdomain" | "custom-domain" | "token";
};

export const tenantStorage = new AsyncLocalStorage<TenantContextValue>();

export function getTenantContext(): TenantContextValue {
  const ctx = tenantStorage.getStore();
  if (!ctx?.tenantId) {
    throw new Error("Tenant context is not available");
  }
  return ctx;
}

export function tryGetTenantContext(): TenantContextValue | undefined {
  const ctx = tenantStorage.getStore();
  return ctx?.tenantId ? ctx : undefined;
}

/**
 * Fills in the tenant for requests that carry a tenant-bound token but no host/header hint
 * (the admin console is served from a platform host, not a tenant subdomain).
 * Never overwrites a tenant that was already resolved from the request itself.
 */
export function bindTenantFromToken(tenantId: string, tenantSlug?: string): void {
  const ctx = tenantStorage.getStore();
  if (!ctx || ctx.tenantId) return;
  ctx.tenantId = tenantId;
  ctx.tenantSlug = tenantSlug;
  ctx.source = "token";
}
