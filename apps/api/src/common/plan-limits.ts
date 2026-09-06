import { ForbiddenException } from "@nestjs/common";
import { getPlanLimits, withinLimit } from "@rentora/domain";
import { PrismaService } from "../prisma/prisma.service";

export async function assertProductLimit(prisma: PrismaService, tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new ForbiddenException("Tenant not found");
  const limits = getPlanLimits(tenant.plan);
  const count = await prisma.product.count({ where: { tenantId } });
  if (!withinLimit(count, limits.maxProducts)) {
    throw new ForbiddenException(
      `Plan ${tenant.plan} allows at most ${limits.maxProducts} products`,
    );
  }
}

export async function assertStaffLimit(prisma: PrismaService, tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new ForbiddenException("Tenant not found");
  const limits = getPlanLimits(tenant.plan);
  const count = await prisma.staffUser.count({ where: { tenantId } });
  if (!withinLimit(count, limits.maxStaff)) {
    throw new ForbiddenException(
      `Plan ${tenant.plan} allows at most ${limits.maxStaff} staff seats`,
    );
  }
}

export async function assertDomainLimit(prisma: PrismaService, tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new ForbiddenException("Tenant not found");
  const limits = getPlanLimits(tenant.plan);
  if (!limits.customDomains) {
    throw new ForbiddenException(`Plan ${tenant.plan} does not include custom domains`);
  }
  const count = await prisma.customDomain.count({ where: { tenantId } });
  if (!withinLimit(count, limits.maxCustomDomains)) {
    throw new ForbiddenException(
      `Plan ${tenant.plan} allows at most ${limits.maxCustomDomains} custom domains`,
    );
  }
}
