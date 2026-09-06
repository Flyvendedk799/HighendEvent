import { AsyncLocalStorage } from "node:async_hooks";

export type TenantContextValue = {
  tenantId: string;
  tenantSlug: string;
  storeId?: string;
};

export const tenantStorage = new AsyncLocalStorage<TenantContextValue>();

export function getTenantContext(): TenantContextValue {
  const ctx = tenantStorage.getStore();
  if (!ctx) {
    throw new Error("Tenant context is not available");
  }
  return ctx;
}

export function tryGetTenantContext(): TenantContextValue | undefined {
  return tenantStorage.getStore();
}
