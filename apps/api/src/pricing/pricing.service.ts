import { Injectable, NotFoundException } from "@nestjs/common";
import { calculateBookingPricing } from "@rentora/domain";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async quote(input: {
    items: Array<{
      productId: string;
      quantity: number;
      startDate: string;
      endDate: string;
    }>;
    deliveryFeeMinor?: number;
    discountMinor?: number;
  }) {
    const tenantId = requireTenantId();
    const store = await this.prisma.store.findFirst({ where: { tenantId } });
    if (!store) throw new NotFoundException("Store not found");

    const items = [];
    for (const item of input.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenantId },
      });
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
      items.push({
        product: {
          id: product.id,
          name: product.name,
          dailyPriceMinor: product.dailyPriceMinor,
          weekendPriceMinor: product.weekendPriceMinor,
          weekendPackageMinor: product.weekendPackageMinor,
          depositMinor: product.depositMinor,
          currency: product.currency,
          isActive: product.isActive,
        },
        quantity: item.quantity,
        startDate: item.startDate,
        endDate: item.endDate,
      });
    }

    return calculateBookingPricing({
      items,
      deliveryFeeMinor: input.deliveryFeeMinor ?? 0,
      discountMinor: input.discountMinor ?? 0,
      tax: {
        taxPercentBps: store.taxPercentBps,
        inclusive: store.taxMode === "INCLUSIVE",
      },
      paymentModel: store.paymentModel,
      currency: store.currency,
    });
  }
}
