import { Injectable, NotFoundException } from "@nestjs/common";
import { DeliveryType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(opts: { sessionId?: string; customerId?: string }) {
    const tenantId = requireTenantId();
    let cart = await this.prisma.cart.findFirst({
      where: {
        tenantId,
        OR: [
          opts.customerId ? { customerId: opts.customerId } : undefined,
          opts.sessionId ? { sessionId: opts.sessionId } : undefined,
        ].filter(Boolean) as Array<{ customerId?: string; sessionId?: string }>,
      },
      include: {
        items: { include: { product: true, upsells: { include: { upsellProduct: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          tenantId,
          sessionId: opts.sessionId,
          customerId: opts.customerId,
        },
        include: {
          items: { include: { product: true, upsells: { include: { upsellProduct: true } } } },
        },
      });
    }
    return cart;
  }

  async addItem(input: {
    sessionId?: string;
    customerId?: string;
    productId: string;
    quantity: number;
    startDate?: string;
    endDate?: string;
    deliveryType?: DeliveryType;
  }) {
    const tenantId = requireTenantId();
    const product = await this.prisma.product.findFirst({
      where: { id: input.productId, tenantId },
    });
    if (!product) throw new NotFoundException("Product not found");

    const cart = await this.getOrCreate({
      sessionId: input.sessionId,
      customerId: input.customerId,
    });

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: input.productId,
        quantity: input.quantity,
        deliveryType: input.deliveryType ?? DeliveryType.PICKUP,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      },
      include: { product: true, upsells: true },
    });
  }

  async updateItem(
    itemId: string,
    data: { quantity?: number; startDate?: string; endDate?: string; deliveryType?: DeliveryType },
  ) {
    const tenantId = requireTenantId();
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { tenantId } },
    });
    if (!item) throw new NotFoundException("Cart item not found");
    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: data.quantity,
        deliveryType: data.deliveryType,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  async removeItem(itemId: string) {
    const tenantId = requireTenantId();
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { tenantId } },
    });
    if (!item) throw new NotFoundException("Cart item not found");
    return this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  async clear(opts: { sessionId?: string; customerId?: string }) {
    const cart = await this.getOrCreate(opts);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.getOrCreate(opts);
  }
}
