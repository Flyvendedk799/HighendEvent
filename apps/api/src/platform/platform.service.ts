import { Injectable, NotFoundException } from "@nestjs/common";
import { PlanTier, Prisma } from "@prisma/client";
import { getPlanLimits } from "@rentora/domain";
import { PrismaService } from "../prisma/prisma.service";

const PLAN_PRICE_MINOR: Record<PlanTier, number> = {
  STARTER: 4900,
  GROWTH: 14900,
  SCALE: 39900,
};

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  listTenants() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { products: true, bookings: true, customers: true, staff: true } },
        stores: { take: 1 },
        domains: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async getTenantBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        _count: { select: { products: true, bookings: true, customers: true, staff: true } },
        stores: { take: 1 },
        domains: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!tenant) throw new NotFoundException("Tenant not found");
    return {
      ...tenant,
      limits: getPlanLimits(tenant.plan),
    };
  }

  async suspendTenant(id: string, suspended = true) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException("Tenant not found");
    return this.prisma.tenant.update({
      where: { id },
      data: { isSuspended: suspended },
    });
  }

  async updateTenant(
    id: string,
    data: {
      plan?: PlanTier;
      featureFlags?: Record<string, unknown>;
      applicationFeeBps?: number;
    },
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const update: Prisma.TenantUpdateInput = {};
    if (data.plan) update.plan = data.plan;
    if (data.applicationFeeBps !== undefined) update.applicationFeeBps = data.applicationFeeBps;
    if (data.featureFlags) {
      const current =
        tenant.featureFlags && typeof tenant.featureFlags === "object"
          ? (tenant.featureFlags as Record<string, unknown>)
          : {};
      update.featureFlags = {
        ...current,
        ...data.featureFlags,
      } as Prisma.InputJsonValue;
    }

    return this.prisma.tenant.update({ where: { id }, data: update });
  }

  async metrics() {
    const [tenants, suspended, bookings, revenue, byPlan] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { isSuspended: true } }),
      this.prisma.booking.count({ where: { isDeleted: false } }),
      this.prisma.booking.aggregate({
        where: { isDeleted: false, statusKey: { not: "cancelled" } },
        _sum: { totalMinor: true },
      }),
      this.prisma.tenant.groupBy({
        by: ["plan"],
        _count: { _all: true },
      }),
    ]);

    const planCounts = Object.fromEntries(
      byPlan.map((row) => [row.plan, row._count._all]),
    ) as Partial<Record<PlanTier, number>>;

    const mrrMinor = (Object.keys(PLAN_PRICE_MINOR) as PlanTier[]).reduce((sum, plan) => {
      return sum + (planCounts[plan] ?? 0) * PLAN_PRICE_MINOR[plan];
    }, 0);

    const attention = await this.prisma.tenant.findMany({
      where: {
        OR: [
          { isSuspended: true },
          { connectOnboarded: false },
          { domains: { some: { verified: false } } },
        ],
      },
      take: 10,
      orderBy: { updatedAt: "desc" },
      include: {
        domains: { where: { verified: false }, take: 1 },
      },
    });

    return {
      tenants,
      activeTenants: tenants - suspended,
      suspended,
      bookings,
      gmvMinor: revenue._sum.totalMinor ?? 0,
      mrrMinor,
      planCounts,
      attention: attention.map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        reason: t.isSuspended
          ? "Suspended"
          : !t.connectOnboarded
            ? "Connect incomplete"
            : t.domains[0]
              ? "Domain pending verification"
              : "Needs attention",
        tone: t.isSuspended ? "danger" : !t.connectOnboarded ? "warning" : "accent",
      })),
    };
  }
}
