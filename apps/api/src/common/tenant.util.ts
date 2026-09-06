import { BadRequestException } from "@nestjs/common";
import { getTenantContext, tryGetTenantContext } from "../tenant/tenant.context";

export function requireTenantId(explicit?: string): string {
  if (explicit) return explicit;
  const ctx = tryGetTenantContext();
  if (ctx?.tenantId) return ctx.tenantId;
  throw new BadRequestException("Tenant context required (X-Tenant-Slug or subdomain)");
}

export function tenantIdOrThrow(): string {
  return getTenantContext().tenantId;
}
