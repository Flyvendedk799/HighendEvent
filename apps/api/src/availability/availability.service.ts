import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  availableQuantity,
  getAvailabilityCalendar,
  getConflictingBookings,
  assertValidRange,
  toIsoDate,
} from "@rentora/domain";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

/** Guards against a client asking for a decade of days in one request. */
const MAX_CALENDAR_DAYS = 400;

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async check(input: {
    productId: string;
    startDate: string;
    endDate: string;
    quantity?: number;
    excludeBookingId?: string;
  }) {
    const tenantId = requireTenantId();
    assertValidRange(input.startDate, input.endDate);
    const { product, bookings, blackouts } = await this.load(tenantId, input.productId);

    const qty = availableQuantity({
      product,
      startDate: input.startDate,
      endDate: input.endDate,
      bookings,
      blackouts,
      excludeBookingId: input.excludeBookingId,
    });

    const requested = input.quantity ?? 1;

    return {
      productId: product.id,
      startDate: input.startDate,
      endDate: input.endDate,
      availableQuantity: qty,
      isAvailable: qty >= requested,
      requestedQuantity: requested,
      // Staff need to know *what* is in the way, not just that something is.
      conflicts: getConflictingBookings({
        product,
        startDate: input.startDate,
        endDate: input.endDate,
        bookings,
        excludeBookingId: input.excludeBookingId,
      }),
    };
  }

  async calendar(input: { productId: string; startDate: string; endDate: string }) {
    const tenantId = requireTenantId();
    this.assertWindow(input.startDate, input.endDate);
    const { product, bookings, blackouts } = await this.load(tenantId, input.productId);

    return {
      productId: product.id,
      stockQty: product.stockQty,
      prepBufferDays: product.prepBufferDays,
      cleanupBufferDays: product.cleanupBufferDays,
      days: getAvailabilityCalendar({
        product,
        startDate: input.startDate,
        endDate: input.endDate,
        bookings,
        blackouts,
      }),
    };
  }

  /**
   * Occupancy for every active product over a window, in one pass.
   *
   * The admin calendar renders a whole month across the catalog, so doing this per product
   * would be one query set per row. Here it is two queries total.
   */
  async overview(input: { startDate: string; endDate: string; productIds?: string[] }) {
    const tenantId = requireTenantId();
    this.assertWindow(input.startDate, input.endDate);

    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        id: input.productIds?.length ? { in: input.productIds } : undefined,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        stockQty: true,
        prepBufferDays: true,
        cleanupBufferDays: true,
        isActive: true,
      },
    });

    if (products.length === 0) {
      return { startDate: input.startDate, endDate: input.endDate, products: [] };
    }

    const productIds = products.map((p) => p.id);

    const [bookingItems, blackoutRows] = await Promise.all([
      this.prisma.bookingItem.findMany({
        where: {
          productId: { in: productIds },
          booking: { tenantId, isDeleted: false },
        },
        include: {
          booking: {
            select: {
              id: true,
              bookingNo: true,
              startDate: true,
              endDate: true,
              statusKey: true,
              isDeleted: true,
              customerName: true,
            },
          },
        },
      }),
      this.prisma.blackoutDate.findMany({ where: { productId: { in: productIds } } }),
    ]);

    const bookings = bookingItems.map((item) => ({
      id: item.booking.id,
      bookingNo: item.booking.bookingNo,
      productId: item.productId,
      quantity: item.quantity,
      startDate: item.booking.startDate,
      endDate: item.booking.endDate,
      statusKey: item.booking.statusKey,
      isDeleted: item.booking.isDeleted,
    }));

    const blackouts = blackoutRows.map((b) => ({
      productId: b.productId,
      startDate: b.startDate,
      endDate: b.endDate,
    }));

    return {
      startDate: input.startDate,
      endDate: input.endDate,
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        stockQty: product.stockQty,
        days: getAvailabilityCalendar({
          product,
          startDate: input.startDate,
          endDate: input.endDate,
          bookings,
          blackouts,
        }),
      })),
      // Rendered as bars over the grid, so staff can click through to the booking.
      bookings: bookingItems.map((item) => ({
        bookingId: item.booking.id,
        bookingNo: item.booking.bookingNo,
        customerName: item.booking.customerName,
        productId: item.productId,
        quantity: item.quantity,
        statusKey: item.booking.statusKey,
        startDate: toIsoDate(item.booking.startDate),
        endDate: toIsoDate(item.booking.endDate),
      })),
    };
  }

  private assertWindow(startDate: string, endDate: string) {
    assertValidRange(startDate, endDate);
    const days =
      Math.round(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000,
      ) + 1;
    if (days > MAX_CALENDAR_DAYS) {
      throw new BadRequestException(`Request at most ${MAX_CALENDAR_DAYS} days at a time`);
    }
  }

  private async load(tenantId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product) throw new NotFoundException("Product not found");

    const [bookingItems, blackouts] = await Promise.all([
      this.prisma.bookingItem.findMany({
        where: { productId, booking: { tenantId, isDeleted: false } },
        include: { booking: true },
      }),
      this.prisma.blackoutDate.findMany({ where: { productId } }),
    ]);

    return {
      product: {
        id: product.id,
        stockQty: product.stockQty,
        prepBufferDays: product.prepBufferDays,
        cleanupBufferDays: product.cleanupBufferDays,
        isActive: product.isActive,
      },
      bookings: bookingItems.map((item) => ({
        id: item.booking.id,
        bookingNo: item.booking.bookingNo,
        productId: item.productId,
        quantity: item.quantity,
        startDate: item.booking.startDate,
        endDate: item.booking.endDate,
        statusKey: item.booking.statusKey,
        isDeleted: item.booking.isDeleted,
      })),
      blackouts: blackouts.map((b) => ({
        productId,
        startDate: b.startDate,
        endDate: b.endDate,
      })),
    };
  }
}
