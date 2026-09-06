import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async kpis() {
    const tenantId = requireTenantId();
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 30);

    const [bookingsTotal, bookings30d, revenue, customers, products] = await Promise.all([
      this.prisma.booking.count({
        where: { tenantId, isDeleted: false, statusKey: { not: "cancelled" } },
      }),
      this.prisma.booking.count({
        where: {
          tenantId,
          isDeleted: false,
          statusKey: { not: "cancelled" },
          createdAt: { gte: since },
        },
      }),
      this.prisma.booking.aggregate({
        where: { tenantId, isDeleted: false, statusKey: { not: "cancelled" } },
        _sum: { totalMinor: true, depositMinor: true },
      }),
      this.prisma.customer.count({ where: { tenantId, isActive: true } }),
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
    ]);

    const byStatus = await this.prisma.booking.groupBy({
      by: ["statusKey"],
      where: { tenantId, isDeleted: false },
      _count: { _all: true },
    });

    return {
      bookingsTotal,
      bookingsLast30Days: bookings30d,
      revenueMinor: revenue._sum.totalMinor ?? 0,
      depositsMinor: revenue._sum.depositMinor ?? 0,
      activeCustomers: customers,
      activeProducts: products,
      bookingsByStatus: byStatus.map((row) => ({
        statusKey: row.statusKey,
        count: row._count._all,
      })),
      note: "KPI aggregates from tenant-scoped bookings",
    };
  }
}
