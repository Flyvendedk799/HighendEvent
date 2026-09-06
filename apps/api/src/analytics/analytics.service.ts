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

    const avgOrderMinor =
      bookingsTotal > 0 ? Math.round((revenue._sum.totalMinor ?? 0) / bookingsTotal) : 0;

    return {
      bookingsTotal,
      bookingsLast30Days: bookings30d,
      revenueMinor: revenue._sum.totalMinor ?? 0,
      depositsMinor: revenue._sum.depositMinor ?? 0,
      activeCustomers: customers,
      activeProducts: products,
      avgOrderMinor,
      bookingsByStatus: byStatus.map((row) => ({
        statusKey: row.statusKey,
        count: row._count._all,
      })),
      note: "KPI aggregates from tenant-scoped bookings",
    };
  }

  async revenueSeries() {
    const tenantId = requireTenantId();
    const weeks = 12;
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - weeks * 7);
    start.setUTCHours(0, 0, 0, 0);

    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        isDeleted: false,
        statusKey: { not: "cancelled" },
        createdAt: { gte: start },
      },
      select: { createdAt: true, totalMinor: true },
      orderBy: { createdAt: "asc" },
    });

    const buckets: Array<{ weekStart: string; revenueMinor: number; bookings: number }> = [];
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(start);
      weekStart.setUTCDate(start.getUTCDate() + i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekStart.getUTCDate() + 7);
      const inWeek = bookings.filter((b) => b.createdAt >= weekStart && b.createdAt < weekEnd);
      buckets.push({
        weekStart: weekStart.toISOString().slice(0, 10),
        revenueMinor: inWeek.reduce((sum, b) => sum + b.totalMinor, 0),
        bookings: inWeek.length,
      });
    }
    return { weeks: buckets };
  }

  async utilization() {
    const tenantId = requireTenantId();
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 30);

    const items = await this.prisma.bookingItem.findMany({
      where: {
        booking: {
          tenantId,
          isDeleted: false,
          statusKey: { not: "cancelled" },
          createdAt: { gte: since },
        },
      },
      select: {
        productId: true,
        quantity: true,
        unitPriceMinor: true,
      },
    });

    const byProduct = new Map<
      string,
      { bookingLines: number; quantityRented: number; revenueMinor: number }
    >();
    for (const row of items) {
      const cur = byProduct.get(row.productId) ?? {
        bookingLines: 0,
        quantityRented: 0,
        revenueMinor: 0,
      };
      cur.bookingLines += 1;
      cur.quantityRented += row.quantity;
      cur.revenueMinor += row.unitPriceMinor * row.quantity;
      byProduct.set(row.productId, cur);
    }

    const ranked = [...byProduct.entries()]
      .sort((a, b) => b[1].revenueMinor - a[1].revenueMinor)
      .slice(0, 10);

    const products = await this.prisma.product.findMany({
      where: { tenantId, id: { in: ranked.map(([id]) => id) } },
      select: { id: true, name: true, slug: true, stockQty: true },
    });
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));

    return {
      products: ranked.map(([productId, stats]) => ({
        productId,
        name: byId[productId]?.name ?? productId,
        slug: byId[productId]?.slug,
        stockQty: byId[productId]?.stockQty ?? 0,
        bookingLines: stats.bookingLines,
        quantityRented: stats.quantityRented,
        revenueMinor: stats.revenueMinor,
      })),
    };
  }
}
