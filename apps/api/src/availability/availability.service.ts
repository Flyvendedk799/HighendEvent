import { Injectable, NotFoundException } from "@nestjs/common";
import {
  availableQuantity,
  getAvailabilityCalendar,
  assertValidRange,
  toIsoDate,
} from "@rentora/domain";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async check(input: {
    productId: string;
    startDate: string;
    endDate: string;
    quantity?: number;
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
    });

    return {
      productId: product.id,
      startDate: input.startDate,
      endDate: input.endDate,
      availableQuantity: qty,
      isAvailable: qty >= (input.quantity ?? 1),
      requestedQuantity: input.quantity ?? 1,
    };
  }

  async calendar(input: { productId: string; startDate: string; endDate: string }) {
    const tenantId = requireTenantId();
    assertValidRange(input.startDate, input.endDate);
    const { product, bookings, blackouts } = await this.load(tenantId, input.productId);
    return getAvailabilityCalendar({
      product,
      startDate: input.startDate,
      endDate: input.endDate,
      bookings,
      blackouts,
    });
  }

  async occupancy(productId: string) {
    const tenantId = requireTenantId();
    const { bookings } = await this.load(tenantId, productId);
    return bookings.map((b) => ({
      id: b.id,
      bookingNo: b.bookingNo,
      productId: b.productId,
      quantity: b.quantity,
      startDate: toIsoDate(b.startDate),
      endDate: toIsoDate(b.endDate),
      statusKey: b.statusKey,
    }));
  }

  private async load(tenantId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product) throw new NotFoundException("Product not found");

    const bookingItems = await this.prisma.bookingItem.findMany({
      where: {
        productId,
        booking: { tenantId, isDeleted: false },
      },
      include: { booking: true },
    });

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

    const blackouts = await this.prisma.blackoutDate.findMany({
      where: { productId },
    });

    return {
      product: {
        id: product.id,
        stockQty: product.stockQty,
        prepBufferDays: product.prepBufferDays,
        cleanupBufferDays: product.cleanupBufferDays,
        isActive: product.isActive,
      },
      bookings,
      blackouts: blackouts.map((b) => ({
        productId,
        startDate: b.startDate,
        endDate: b.endDate,
      })),
    };
  }
}
