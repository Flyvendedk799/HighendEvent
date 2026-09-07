import { BadRequestException } from "@nestjs/common";
import { tryGetTenantContext } from "../tenant/tenant.context";

/**
 * The tenant for the current request, resolved from the host, the X-Tenant-Slug header, or the
 * caller token (see TenantBindingInterceptor). Every tenant-scoped query goes through this.
 */
export function requireTenantId(explicit?: string): string {
  if (explicit) return explicit;
  const ctx = tryGetTenantContext();
  if (ctx?.tenantId) return ctx.tenantId;
  throw new BadRequestException("Tenant context required (X-Tenant-Slug, subdomain, or token)");
}

export function tenantIdOrThrow(): string {
  return requireTenantId();
}

export function currentTenantSlug(): string | undefined {
  return tryGetTenantContext()?.tenantSlug;
}
