import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PlanTier, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { planLimits } from "../billing/plan-limits";

/**
 * The platform control plane. Everything here crosses tenant boundaries by design, which is
 * exactly why the routes are locked to the `platform` principal and every cross-tenant action
 * writes an audit log entry naming the operator who did it.
 */
@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  async listTenants(filters: { q?: string; plan?: PlanTier; suspended?: boolean } = {}) {
    const where: Prisma.TenantWhereInput = {
      plan: filters.plan,
      isSuspended: filters.suspended,
      ...(filters.q?.trim()
        ? {
            OR: [
              { name: { contains: filters.q.trim(), mode: "insensitive" } },
              { slug: { contains: filters.q.trim(), mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const tenants = await this.prisma.tenant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { products: true, bookings: true, customers: true, staff: true } },
        stores: { take: 1, select: { name: true, currency: true } },
        domains: { where: { verified: true }, select: { hostname: true } },
      },
    });

    // Revenue per tenant in one grouped query rather than one per row.
    const revenue = await this.prisma.booking.groupBy({
      by: ["tenantId"],
      where: { isDeleted: false, statusKey: { not: "cancelled" } },
      _sum: { totalMinor: true },
      _count: { _all: true },
    });

    const revenueByTenant = new Map(
      revenue.map((row) => [row.tenantId, row._sum.totalMinor ?? 0]),
    );

    return tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      isSuspended: tenant.isSuspended,
      connectOnboarded: tenant.connectOnboarded,
      createdAt: tenant.createdAt,
      storeName: tenant.stores[0]?.name ?? null,
      currency: tenant.stores[0]?.currency ?? "USD",
      primaryDomain: tenant.domains[0]?.hostname ?? null,
      counts: tenant._count,
      gmvMinor: revenueByTenant.get(tenant.id) ?? 0,
      featureFlags: (tenant.featureFlags ?? {}) as Record<string, boolean>,
    }));
  }

  async getTenant(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      include: {
        stores: { take: 1 },
        domains: true,
        staff: {
          where: { isActive: true },
          select: { id: true, email: true, name: true, role: true, lastLoginAt: true },
        },
        _count: { select: { products: true, bookings: true, customers: true } },
      },
    });

    if (!tenant) throw new NotFoundException("Tenant not found");

    const [revenue, recentBookings] = await Promise.all([
      this.prisma.booking.aggregate({
        where: { tenantId: tenant.id, isDeleted: false, statusKey: { not: "cancelled" } },
        _sum: { totalMinor: true },
      }),
      this.prisma.booking.findMany({
        where: { tenantId: tenant.id, isDeleted: false },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          bookingNo: true,
          customerName: true,
          statusKey: true,
          totalMinor: true,
          currency: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      ...tenant,
      limits: planLimits(tenant.plan),
      gmvMinor: revenue._sum.totalMinor ?? 0,
      recentBookings,
    };
  }

  async suspendTenant(actorId: string, id: string, suspended: boolean, reason?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { isSuspended: suspended },
    });

    await this.audit(actorId, id, suspended ? "tenant.suspended" : "tenant.reactivated", {
      reason: reason ?? null,
    });

    return updated;
  }

  async changePlan(actorId: string, id: string, plan: PlanTier) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const limits = planLimits(plan);

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { plan, applicationFeeBps: limits.applicationFeeBps },
    });

    await this.audit(actorId, id, "tenant.plan_changed", { from: tenant.plan, to: plan });

    return updated;
  }

  async setFeatureFlags(actorId: string, id: string, flags: Record<string, boolean>) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const current = (tenant.featureFlags ?? {}) as Record<string, boolean>;
    const next = { ...current, ...flags };

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { featureFlags: next as Prisma.InputJsonObject },
    });

    await this.audit(actorId, id, "tenant.flags_changed", { flags });

    return updated;
  }

  /** Platform-wide numbers, aggregated across every tenant. */
  async metrics() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    const [tenants, suspended, connected, bookings, bookings30d, revenue, customers, byPlan] =
      await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.tenant.count({ where: { isSuspended: true } }),
        this.prisma.tenant.count({ where: { connectOnboarded: true } }),
        this.prisma.booking.count({ where: { isDeleted: false } }),
        this.prisma.booking.count({
          where: { isDeleted: false, createdAt: { gte: thirtyDaysAgo } },
        }),
        this.prisma.booking.aggregate({
          where: { isDeleted: false, statusKey: { not: "cancelled" } },
          _sum: { totalMinor: true },
        }),
        this.prisma.customer.count(),
        this.prisma.tenant.groupBy({ by: ["plan"], _count: { _all: true } }),
      ]);

    // Subscription revenue is derived from the plan each tenant is on, since plans are the
    // only thing Rentora itself bills for.
    const mrrMinor = byPlan.reduce(
      (sum, row) => sum + planLimits(row.plan).priceMinor * row._count._all,
      0,
    );

    return {
      tenants,
      activeTenants: tenants - suspended,
      suspendedTenants: suspended,
      connectedTenants: connected,
      bookings,
      bookingsLast30Days: bookings30d,
      gmvMinor: revenue._sum.totalMinor ?? 0,
      customers,
      mrrMinor,
      mrrCurrency: "USD",
      byPlan: byPlan.map((row) => ({
        plan: row.plan,
        tenants: row._count._all,
        priceMinor: planLimits(row.plan).priceMinor,
      })),
    };
  }

  async auditLog(tenantId?: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 200),
    });
  }

  /**
   * Issues a short-lived staff token for a tenant so support can see exactly what the tenant
   * sees. Every use is audit-logged with the operator id — support access is never silent.
   */
  async impersonationTarget(actorId: string, tenantId: string) {
    const owner = await this.prisma.staffUser.findFirst({
      where: { tenantId, isActive: true, role: "OWNER" },
      orderBy: { createdAt: "asc" },
    });

    if (!owner) {
      throw new BadRequestException("This tenant has no active owner to view as");
    }

    await this.audit(actorId, tenantId, "tenant.impersonated", { staffUserId: owner.id });

    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

    return {
      sub: owner.id,
      email: owner.email,
      name: owner.name ?? undefined,
      role: "staff" as const,
      tenantId,
      tenantSlug: tenant.slug,
      staffRole: owner.role,
    };
  }

  private audit(
    actorId: string,
    tenantId: string,
    action: string,
    meta: Record<string, unknown>,
  ) {
    return this.prisma.auditLog.create({
      data: {
        tenantId,
        actorType: "PLATFORM",
        actorId,
        action,
        entityType: "Tenant",
        entityId: tenantId,
        meta: meta as Prisma.InputJsonObject,
      },
    });
  }
}
