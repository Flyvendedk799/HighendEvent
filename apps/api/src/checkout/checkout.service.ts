import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DeliveryType } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { BookingsService } from "../bookings/bookings.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CouponsService } from "../coupons/coupons.service";
import { requireTenantId } from "../common/tenant.util";

type CheckoutItem = {
  productId: string;
  quantity: number;
  startDate?: string;
  endDate?: string;
};

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
    private readonly notifications: NotificationsService,
    private readonly coupons: CouponsService,
  ) {}

  async createSession(input: {
    cartId?: string;
    bookingId?: string;
    items?: CheckoutItem[];
    successUrl: string;
    cancelUrl: string;
    customerName?: string;
    email?: string;
    phone?: string;
    address?: string;
    zipCode?: string;
    city?: string;
    deliveryType?: DeliveryType;
    deliveryFeeMinor?: number;
    couponCode?: string;
  }) {
    const tenantId = requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    let booking =
      input.bookingId != null
        ? await this.prisma.booking.findFirst({
            where: { id: input.bookingId, tenantId, isDeleted: false },
            include: { items: true },
          })
        : null;

    if (!booking && input.items?.length) {
      booking = await this.createBookingFromItems(input, input.items);
    }

    if (!booking && input.cartId) {
      const cart = await this.prisma.cart.findFirst({
        where: { id: input.cartId, tenantId },
        include: { items: true },
      });
      if (!cart?.items.length) throw new BadRequestException("Cart is empty");
      const first = cart.items[0]!;
      if (!first.startDate || !first.endDate) {
        throw new BadRequestException("Cart items require startDate and endDate");
      }
      this.requireCustomer(input);
      booking = await this.bookings.create({
        source: "ONLINE",
        customerName: input.customerName!,
        email: input.email!,
        phone: input.phone!,
        address: input.address!,
        zipCode: input.zipCode ?? "",
        city: input.city ?? "",
        startDate: first.startDate.toISOString().slice(0, 10),
        endDate: first.endDate.toISOString().slice(0, 10),
        deliveryType: input.deliveryType ?? first.deliveryType,
        deliveryFeeMinor: input.deliveryFeeMinor,
        items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    if (!booking) throw new BadRequestException("bookingId, cartId, or items required");

    if (input.couponCode?.trim()) {
      const applied = await this.coupons.validate(
        input.couponCode,
        booking.subtotalMinor,
      );
      const newTotal = Math.max(0, booking.totalMinor - applied.discountMinor);
      const newUpfront = Math.max(0, booking.upfrontMinor - applied.discountMinor);
      booking = await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          couponCode: applied.code,
          discountMinor: applied.discountMinor,
          totalMinor: newTotal,
          upfrontMinor: newUpfront,
        },
        include: { items: true },
      });
    }

    const amount = booking.upfrontMinor;
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeKey) {
      const stubSessionId = `cs_test_stub_${randomUUID()}`;
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { stripeSessionId: stubSessionId },
      });
      const sep = input.successUrl.includes("?") ? "&" : "?";
      return {
        stub: true,
        id: stubSessionId,
        url: `${input.successUrl}${sep}session_id=${stubSessionId}&booking_id=${booking.id}`,
        bookingId: booking.id,
        bookingNo: booking.bookingNo,
        amountMinor: amount,
        currency: booking.currency,
        mode: "payment",
        payment_intent_data: tenant.stripeConnectAccountId
          ? {
              application_fee_amount: Math.round(
                (amount * tenant.applicationFeeBps) / 10_000,
              ),
              transfer_data: { destination: tenant.stripeConnectAccountId },
            }
          : undefined,
        message: "Stripe stub session (STRIPE_SECRET_KEY not set)",
      };
    }

    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set("success_url", `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`);
    body.set("cancel_url", input.cancelUrl);
    body.set("client_reference_id", booking.id);
    body.set("metadata[bookingId]", booking.id);
    body.set("metadata[tenantId]", tenantId);
    body.set("line_items[0][quantity]", "1");
    body.set(
      "line_items[0][price_data][currency]",
      booking.currency.toLowerCase(),
    );
    body.set("line_items[0][price_data][unit_amount]", String(amount));
    body.set(
      "line_items[0][price_data][product_data][name]",
      `Booking ${booking.bookingNo}`,
    );

    if (tenant.stripeConnectAccountId) {
      body.set(
        "payment_intent_data[application_fee_amount]",
        String(Math.round((amount * tenant.applicationFeeBps) / 10_000)),
      );
      body.set(
        "payment_intent_data[transfer_data][destination]",
        tenant.stripeConnectAccountId,
      );
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new BadRequestException(`Stripe error: ${err}`);
    }

    const session = (await res.json()) as { id: string; url: string };
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { stripeSessionId: session.id },
    });

    return {
      stub: false,
      id: session.id,
      url: session.url,
      bookingId: booking.id,
      bookingNo: booking.bookingNo,
      amountMinor: amount,
      currency: booking.currency,
    };
  }

  async getBySession(sessionId: string) {
    const tenantId = requireTenantId();
    const booking = await this.prisma.booking.findFirst({
      where: { tenantId, stripeSessionId: sessionId, isDeleted: false },
      include: { items: { include: { product: true } } },
    });
    if (!booking) throw new NotFoundException("Checkout session not found");
    return booking;
  }

  async completeStub(sessionId: string) {
    const tenantId = requireTenantId();
    if (!sessionId.startsWith("cs_test_stub_")) {
      throw new BadRequestException("Not a stub checkout session");
    }
    const booking = await this.prisma.booking.findFirst({
      where: { tenantId, stripeSessionId: sessionId, isDeleted: false },
    });
    if (!booking) throw new NotFoundException("Checkout session not found");

    if (booking.statusKey === "pending" || booking.statusKey === "awaiting_payment") {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { statusKey: "fully_paid" },
      });
      if (booking.couponCode) {
        await this.coupons.redeem(booking.couponCode);
      }
      await this.notifications.enqueueBookingConfirmation({
        tenantId,
        bookingId: booking.id,
        email: booking.email,
        customerName: booking.customerName,
        bookingNo: booking.bookingNo,
      });
    }

    return this.prisma.booking.findFirstOrThrow({
      where: { id: booking.id },
      include: { items: { include: { product: true } } },
    });
  }

  private requireCustomer(input: {
    customerName?: string;
    email?: string;
    phone?: string;
    address?: string;
  }) {
    if (!input.email || !input.customerName || !input.phone || !input.address) {
      throw new BadRequestException("Customer details required for checkout");
    }
  }

  private async createBookingFromItems(
    input: {
      customerName?: string;
      email?: string;
      phone?: string;
      address?: string;
      zipCode?: string;
      city?: string;
      deliveryType?: DeliveryType;
      deliveryFeeMinor?: number;
    },
    items: CheckoutItem[],
  ) {
    this.requireCustomer(input);
    const first = items[0]!;
    const startDate = first.startDate;
    const endDate = first.endDate;
    if (!startDate || !endDate) {
      throw new BadRequestException("Items require startDate and endDate");
    }
    for (const item of items) {
      if (!item.startDate || !item.endDate) {
        throw new BadRequestException("All items require startDate and endDate");
      }
      if (item.startDate !== startDate || item.endDate !== endDate) {
        throw new BadRequestException(
          "Multi-date carts are not supported yet — use matching start/end for all lines",
        );
      }
    }

    return this.bookings.create({
      source: "ONLINE",
      customerName: input.customerName!,
      email: input.email!,
      phone: input.phone!,
      address: input.address!,
      zipCode: input.zipCode ?? "",
      city: input.city ?? "",
      startDate,
      endDate,
      deliveryType: input.deliveryType ?? DeliveryType.PICKUP,
      deliveryFeeMinor: input.deliveryFeeMinor,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    });
  }
}
