import { Injectable } from "@nestjs/common";
import { eachDate, rentalDays, toIsoDate } from "@rentora/domain";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

const CANCELLED = "cancelled";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async kpis() {
    const tenantId = requireTenantId();
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 30);

    const previousStart = new Date(since);
    previousStart.setUTCDate(previousStart.getUTCDate() - 30);

    const [bookingsTotal, bookings30d, bookingsPrev30d, revenue, revenue30d, customers, products] =
      await Promise.all([
        this.prisma.booking.count({
          where: { tenantId, isDeleted: false, statusKey: { not: CANCELLED } },
        }),
        this.prisma.booking.count({
          where: {
            tenantId,
            isDeleted: false,
            statusKey: { not: CANCELLED },
            createdAt: { gte: since },
          },
        }),
        this.prisma.booking.count({
          where: {
            tenantId,
            isDeleted: false,
            statusKey: { not: CANCELLED },
            createdAt: { gte: previousStart, lt: since },
          },
        }),
        this.prisma.booking.aggregate({
          where: { tenantId, isDeleted: false, statusKey: { not: CANCELLED } },
          _sum: { totalMinor: true, depositMinor: true, remainingMinor: true },
        }),
        this.prisma.booking.aggregate({
          where: {
            tenantId,
            isDeleted: false,
            statusKey: { not: CANCELLED },
            createdAt: { gte: since },
          },
          _sum: { totalMinor: true },
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
      bookingsPrevious30Days: bookingsPrev30d,
      revenueMinor: revenue._sum.totalMinor ?? 0,
      revenueLast30DaysMinor: revenue30d._sum.totalMinor ?? 0,
      depositsMinor: revenue._sum.depositMinor ?? 0,
      outstandingMinor: revenue._sum.remainingMinor ?? 0,
      averageBookingMinor:
        bookingsTotal > 0 ? Math.round((revenue._sum.totalMinor ?? 0) / bookingsTotal) : 0,
      activeCustomers: customers,
      activeProducts: products,
      bookingsByStatus: byStatus.map((row) => ({
        statusKey: row.statusKey,
        count: row._count._all,
      })),
    };
  }

  /**
   * Revenue and booking counts bucketed by month, from real bookings.
   *
   * Months with no bookings are emitted as zero rather than skipped, so a chart shows a gap in
   * trade instead of silently compressing the timeline.
   */
  async revenueSeries(months = 12) {
    const tenantId = requireTenantId();

    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCMonth(start.getUTCMonth() - (months - 1));

    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        isDeleted: false,
        statusKey: { not: CANCELLED },
        createdAt: { gte: start },
      },
      select: { createdAt: true, totalMinor: true, currency: true },
    });

    const buckets = new Map<string, { revenueMinor: number; bookings: number }>();
    for (let i = 0; i < months; i += 1) {
      const month = new Date(start);
      month.setUTCMonth(start.getUTCMonth() + i);
      buckets.set(month.toISOString().slice(0, 7), { revenueMinor: 0, bookings: 0 });
    }

    for (const booking of bookings) {
      const key = booking.createdAt.toISOString().slice(0, 7);
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.revenueMinor += booking.totalMinor;
        bucket.bookings += 1;
      }
    }

    return [...buckets.entries()].map(([month, value]) => ({ month, ...value }));
  }

  /**
   * Utilisation per product: what share of available unit-days were actually rented over the
   * window. This is the number that tells a rental business what to buy more of.
   */
  async utilisation(days = 90) {
    const tenantId = requireTenantId();

    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - days + 1);

    const [products, items] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, stockQty: true },
      }),
      this.prisma.bookingItem.findMany({
        where: {
          booking: {
            tenantId,
            isDeleted: false,
            statusKey: { not: CANCELLED },
            startDate: { lte: end },
            endDate: { gte: start },
          },
        },
        select: {
          productId: true,
          quantity: true,
          unitPriceMinor: true,
          booking: { select: { startDate: true, endDate: true } },
        },
      }),
    ]);

    const stats = new Map<string, { rentedUnitDays: number; revenueMinor: number; bookings: number }>();

    for (const item of items) {
      // Only the part of the booking that falls inside the window counts.
      const from = item.booking.startDate < start ? start : item.booking.startDate;
      const to = item.booking.endDate > end ? end : item.booking.endDate;
      const daysInWindow = Math.max(0, rentalDays(toIsoDate(from), toIsoDate(to)));

      const current = stats.get(item.productId) ?? {
        rentedUnitDays: 0,
        revenueMinor: 0,
        bookings: 0,
      };
      current.rentedUnitDays += daysInWindow * item.quantity;
      current.revenueMinor += daysInWindow * item.quantity * item.unitPriceMinor;
      current.bookings += 1;
      stats.set(item.productId, current);
    }

    return products
      .map((product) => {
        const stat = stats.get(product.id) ?? {
          rentedUnitDays: 0,
          revenueMinor: 0,
          bookings: 0,
        };
        const availableUnitDays = product.stockQty * days;
        return {
          productId: product.id,
          name: product.name,
          stockQty: product.stockQty,
          bookings: stat.bookings,
          rentedUnitDays: stat.rentedUnitDays,
          availableUnitDays,
          utilisationBps:
            availableUnitDays > 0
              ? Math.round((stat.rentedUnitDays / availableUnitDays) * 10_000)
              : 0,
          revenueMinor: stat.revenueMinor,
        };
      })
      .sort((a, b) => b.revenueMinor - a.revenueMinor);
  }

  /**
   * How far shoppers get. Carts are the closest thing to a session count Rentora has, so this
   * is described as cart-to-booking rather than dressed up as a full funnel.
   */
  async conversion(days = 30) {
    const tenantId = requireTenantId();
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);

    const [cartsStarted, bookingsCreated, bookingsPaid, bookingsCancelled] = await Promise.all([
      this.prisma.cart.count({ where: { tenantId, createdAt: { gte: since } } }),
      this.prisma.booking.count({
        where: { tenantId, isDeleted: false, createdAt: { gte: since } },
      }),
      this.prisma.booking.count({
        where: {
          tenantId,
          isDeleted: false,
          createdAt: { gte: since },
          statusKey: { in: ["deposit_paid", "fully_paid", "out_for_delivery", "returned_good", "returned_damaged", "deposit_refunded"] },
        },
      }),
      this.prisma.booking.count({
        where: { tenantId, createdAt: { gte: since }, statusKey: CANCELLED },
      }),
    ]);

    return {
      windowDays: days,
      cartsStarted,
      bookingsCreated,
      bookingsPaid,
      bookingsCancelled,
      cartToBookingBps:
        cartsStarted > 0 ? Math.round((bookingsCreated / cartsStarted) * 10_000) : 0,
      bookingToPaidBps:
        bookingsCreated > 0 ? Math.round((bookingsPaid / bookingsCreated) * 10_000) : 0,
    };
  }

  /** Which items get rented together, so tenants know what to bundle. */
  async topPairs(limit = 5) {
    const tenantId = requireTenantId();

    const bookings = await this.prisma.booking.findMany({
      where: { tenantId, isDeleted: false, statusKey: { not: CANCELLED } },
      select: { items: { select: { nameSnapshot: true, productId: true } } },
    });

    const pairs = new Map<string, { names: [string, string]; count: number }>();

    for (const booking of bookings) {
      const unique = [...new Map(booking.items.map((i) => [i.productId, i])).values()];
      for (let i = 0; i < unique.length; i += 1) {
        for (let j = i + 1; j < unique.length; j += 1) {
          const [a, b] = [unique[i]!, unique[j]!].sort((x, y) =>
            x.productId < y.productId ? -1 : 1,
          );
          const key = `${a.productId}:${b.productId}`;
          const entry = pairs.get(key) ?? {
            names: [a.nameSnapshot, b.nameSnapshot] as [string, string],
            count: 0,
          };
          entry.count += 1;
          pairs.set(key, entry);
        }
      }
    }

    return [...pairs.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /** Bookings per weekday over the window, so staff can see when the vans go out. */
  async weekdayLoad(days = 90) {
    const tenantId = requireTenantId();
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);

    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        isDeleted: false,
        statusKey: { not: CANCELLED },
        startDate: { gte: since },
      },
      select: { startDate: true, endDate: true },
    });

    const counts = Array.from({ length: 7 }, () => 0);
    for (const booking of bookings) {
      for (const day of eachDate(booking.startDate, booking.endDate)) {
        counts[day.getUTCDay()] = (counts[day.getUTCDay()] ?? 0) + 1;
      }
    }

    // Monday-first, matching the calendars everywhere else in the product.
    const order = [1, 2, 3, 4, 5, 6, 0];
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return order.map((dayIndex, i) => ({
      label: labels[i]!,
      count: counts[dayIndex] ?? 0,
    }));
  }
}
