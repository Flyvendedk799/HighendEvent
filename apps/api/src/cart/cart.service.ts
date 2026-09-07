import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DeliveryType } from "@prisma/client";
import { availableQuantity, calculateBookingPricing, rentalDays } from "@rentora/domain";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

/**
 * Who the cart belongs to. `customerId` is only ever taken from a verified token — never from
 * the request body — so one shopper cannot address another shopper's cart.
 */
export type CartOwner = { sessionId?: string; customerId?: string };

const MAX_LINE_QUANTITY = 999;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(owner: CartOwner) {
    const tenantId = requireTenantId();

    if (!owner.customerId && !owner.sessionId) {
      throw new BadRequestException("A cart session or a signed-in customer is required");
    }

    // A signed-in shopper always uses their customer cart; a guest uses their session cart.
    const where = owner.customerId
      ? { tenantId, customerId: owner.customerId }
      : { tenantId, sessionId: owner.sessionId, customerId: null };

    let cart = await this.prisma.cart.findFirst({
      where,
      include: this.cartInclude(),
      orderBy: { updatedAt: "desc" },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          tenantId,
          sessionId: owner.sessionId,
          customerId: owner.customerId,
        },
        include: this.cartInclude(),
      });
    }

    return cart;
  }

  /**
   * Moves a guest cart onto the customer account after login, so items chosen before signing in
   * are not silently lost.
   */
  async merge(owner: { sessionId: string; customerId: string }) {
    const tenantId = requireTenantId();

    const guestCart = await this.prisma.cart.findFirst({
      where: { tenantId, sessionId: owner.sessionId, customerId: null },
      include: { items: true },
    });

    if (!guestCart?.items.length) {
      return this.getOrCreate({ customerId: owner.customerId });
    }

    const customerCart = await this.getOrCreate({ customerId: owner.customerId });

    await this.prisma.$transaction([
      this.prisma.cartItem.updateMany({
        where: { cartId: guestCart.id },
        data: { cartId: customerCart.id },
      }),
      this.prisma.cart.delete({ where: { id: guestCart.id } }),
    ]);

    return this.getOrCreate({ customerId: owner.customerId });
  }

  async addItem(
    owner: CartOwner,
    input: {
      productId: string;
      quantity: number;
      startDate?: string;
      endDate?: string;
      deliveryType?: DeliveryType;
      upsellIds?: string[];
    },
  ) {
    const tenantId = requireTenantId();

    const product = await this.prisma.product.findFirst({
      where: { id: input.productId, tenantId, isActive: true },
    });
    if (!product) throw new NotFoundException("Product not found");

    if (input.startDate && input.endDate) {
      await this.assertAvailable(tenantId, product.id, {
        startDate: input.startDate,
        endDate: input.endDate,
        quantity: input.quantity,
      });
      this.assertRentalLength(product, input.startDate, input.endDate);
    }

    const cart = await this.getOrCreate(owner);

    // Same product on the same dates is one line with a higher quantity, not two lines.
    const existing = cart.items.find(
      (item) =>
        item.productId === product.id &&
        isoOrNull(item.startDate) === (input.startDate ?? null) &&
        isoOrNull(item.endDate) === (input.endDate ?? null) &&
        item.deliveryType === (input.deliveryType ?? DeliveryType.PICKUP),
    );

    if (existing) {
      const quantity = Math.min(existing.quantity + input.quantity, MAX_LINE_QUANTITY);
      if (input.startDate && input.endDate) {
        await this.assertAvailable(tenantId, product.id, {
          startDate: input.startDate,
          endDate: input.endDate,
          quantity,
        });
      }
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity },
      });
    } else {
      const item = await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          quantity: Math.min(input.quantity, MAX_LINE_QUANTITY),
          deliveryType: input.deliveryType ?? DeliveryType.PICKUP,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        },
      });

      if (input.upsellIds?.length) {
        await this.attachUpsells(tenantId, item.id, input.upsellIds);
      }
    }

    await this.touch(cart.id);
    return this.getOrCreate(owner);
  }

  async updateItem(
    owner: CartOwner,
    itemId: string,
    data: {
      quantity?: number;
      startDate?: string;
      endDate?: string;
      deliveryType?: DeliveryType;
    },
  ) {
    const tenantId = requireTenantId();
    const { cart, item } = await this.ownedItem(owner, itemId);

    const startDate = data.startDate ?? isoOrNull(item.startDate) ?? undefined;
    const endDate = data.endDate ?? isoOrNull(item.endDate) ?? undefined;
    const quantity = data.quantity ?? item.quantity;

    if (startDate && endDate) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenantId },
      });
      if (!product) throw new NotFoundException("Product not found");
      this.assertRentalLength(product, startDate, endDate);
      await this.assertAvailable(tenantId, item.productId, { startDate, endDate, quantity });
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: Math.min(quantity, MAX_LINE_QUANTITY),
        deliveryType: data.deliveryType,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });

    await this.touch(cart.id);
    return this.getOrCreate(owner);
  }

  async removeItem(owner: CartOwner, itemId: string) {
    const { cart } = await this.ownedItem(owner, itemId);
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    await this.touch(cart.id);
    return this.getOrCreate(owner);
  }

  async setItemUpsells(owner: CartOwner, itemId: string, upsellIds: string[]) {
    const tenantId = requireTenantId();
    const { cart } = await this.ownedItem(owner, itemId);

    await this.prisma.cartUpsellItem.deleteMany({ where: { cartItemId: itemId } });
    if (upsellIds.length) {
      await this.attachUpsells(tenantId, itemId, upsellIds);
    }

    await this.touch(cart.id);
    return this.getOrCreate(owner);
  }

  async clear(owner: CartOwner) {
    const cart = await this.getOrCreate(owner);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.getOrCreate(owner);
  }

  /**
   * Cart contents priced with the same domain code that prices a booking, plus a per-line
   * availability re-check. Stock can sell out between adding to the cart and checking out, and
   * the cart page is where the shopper should learn that.
   */
  async summary(owner: CartOwner, options: { deliveryFeeMinor?: number } = {}) {
    const tenantId = requireTenantId();
    const cart = await this.getOrCreate(owner);

    const store = await this.prisma.store.findFirst({ where: { tenantId } });
    if (!store) throw new NotFoundException("Store not found");

    const lines = [];
    const issues: Array<{ itemId: string; message: string }> = [];

    for (const item of cart.items) {
      const startDate = isoOrNull(item.startDate);
      const endDate = isoOrNull(item.endDate);

      if (!startDate || !endDate) {
        issues.push({ itemId: item.id, message: `Choose dates for ${item.product.name}` });
        continue;
      }

      const available = await this.availableFor(tenantId, item.productId, startDate, endDate);
      if (available < item.quantity) {
        issues.push({
          itemId: item.id,
          message:
            available === 0
              ? `${item.product.name} is no longer available on those dates`
              : `Only ${available} × ${item.product.name} left on those dates`,
        });
      }

      lines.push({
        item,
        pricingInput: {
          product: {
            id: item.product.id,
            name: item.product.name,
            dailyPriceMinor: item.product.dailyPriceMinor,
            weekendPriceMinor: item.product.weekendPriceMinor,
            weekendPackageMinor: item.product.weekendPackageMinor,
            depositMinor: item.product.depositMinor,
            currency: item.product.currency,
            isActive: item.product.isActive,
          },
          quantity: item.quantity,
          startDate,
          endDate,
        },
      });
    }

    const upsellTotalMinor = cart.items.reduce(
      (sum, item) =>
        sum +
        item.upsells.reduce(
          (inner, link) => inner + link.upsellProduct.priceMinor * link.quantity,
          0,
        ),
      0,
    );

    const pricing =
      lines.length > 0
        ? calculateBookingPricing({
            items: lines.map((line) => line.pricingInput),
            deliveryFeeMinor: options.deliveryFeeMinor ?? 0,
            discountMinor: 0,
            tax: { taxPercentBps: store.taxPercentBps, inclusive: store.taxMode === "INCLUSIVE" },
            paymentModel: store.paymentModel,
            currency: store.currency,
          })
        : null;

    return {
      cart,
      currency: store.currency,
      paymentModel: store.paymentModel,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      upsellTotalMinor,
      pricing,
      issues,
      /** True when every line has dates and enough stock to check out right now. */
      checkoutReady: cart.items.length > 0 && issues.length === 0,
    };
  }

  // ------------------------------------------------------------------ Internals

  private cartInclude() {
    return {
      items: {
        orderBy: { createdAt: "asc" as const },
        include: {
          product: { include: { images: { orderBy: { sortOrder: "asc" as const }, take: 1 } } },
          upsells: { include: { upsellProduct: true } },
        },
      },
    };
  }

  /** Loads a cart item and proves it belongs to the caller, not merely to the tenant. */
  private async ownedItem(owner: CartOwner, itemId: string) {
    const cart = await this.getOrCreate(owner);
    const item = cart.items.find((candidate) => candidate.id === itemId);
    if (!item) {
      // Not "not found on your cart" — an item id from another shopper must look identical.
      throw new NotFoundException("Cart item not found");
    }
    return { cart, item };
  }

  private async attachUpsells(tenantId: string, cartItemId: string, upsellIds: string[]) {
    const upsells = await this.prisma.upsellProduct.findMany({
      where: { id: { in: upsellIds }, tenantId, isActive: true },
    });
    if (upsells.length !== upsellIds.length) {
      throw new ForbiddenException("One or more add-ons are not available");
    }
    await this.prisma.cartUpsellItem.createMany({
      data: upsells.map((upsell) => ({ cartItemId, upsellProductId: upsell.id })),
    });
  }

  private assertRentalLength(
    product: { minRentalDays: number; maxRentalDays: number | null; name: string },
    startDate: string,
    endDate: string,
  ) {
    const days = rentalDays(startDate, endDate);
    if (days < product.minRentalDays) {
      throw new BadRequestException(
        `${product.name} has a minimum rental of ${product.minRentalDays} day(s)`,
      );
    }
    if (product.maxRentalDays && days > product.maxRentalDays) {
      throw new BadRequestException(
        `${product.name} can be rented for at most ${product.maxRentalDays} day(s)`,
      );
    }
  }

  private async assertAvailable(
    tenantId: string,
    productId: string,
    range: { startDate: string; endDate: string; quantity: number },
  ) {
    const available = await this.availableFor(
      tenantId,
      productId,
      range.startDate,
      range.endDate,
    );
    if (available < range.quantity) {
      throw new BadRequestException(
        available === 0
          ? "Those dates are no longer available"
          : `Only ${available} available on those dates`,
      );
    }
  }

  private async availableFor(
    tenantId: string,
    productId: string,
    startDate: string,
    endDate: string,
  ): Promise<number> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product) return 0;

    const [bookingItems, blackouts] = await Promise.all([
      this.prisma.bookingItem.findMany({
        where: { productId, booking: { tenantId, isDeleted: false } },
        include: { booking: true },
      }),
      this.prisma.blackoutDate.findMany({ where: { productId } }),
    ]);

    return availableQuantity({
      product: {
        id: product.id,
        stockQty: product.stockQty,
        prepBufferDays: product.prepBufferDays,
        cleanupBufferDays: product.cleanupBufferDays,
        isActive: product.isActive,
      },
      startDate,
      endDate,
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
    });
  }

  private touch(cartId: string) {
    return this.prisma.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
  }
}

function isoOrNull(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}
