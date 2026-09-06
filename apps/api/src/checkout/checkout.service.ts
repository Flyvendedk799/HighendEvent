import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { BookingsService } from "../bookings/bookings.service";
import { requireTenantId } from "../common/tenant.util";

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
  ) {}

  async createSession(input: {
    cartId?: string;
    bookingId?: string;
    successUrl: string;
    cancelUrl: string;
    customerName?: string;
    email?: string;
    phone?: string;
    address?: string;
    zipCode?: string;
    city?: string;
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
      if (!input.email || !input.customerName || !input.phone || !input.address) {
        throw new BadRequestException("Customer details required for checkout");
      }
      booking = await this.bookings.create({
        source: "ONLINE",
        customerName: input.customerName,
        email: input.email,
        phone: input.phone,
        address: input.address,
        zipCode: input.zipCode ?? "",
        city: input.city ?? "",
        startDate: first.startDate.toISOString().slice(0, 10),
        endDate: first.endDate.toISOString().slice(0, 10),
        deliveryType: first.deliveryType,
        items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
    }

    if (!booking) throw new BadRequestException("bookingId or cartId required");

    const amount = booking.upfrontMinor;
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeKey) {
      const stubSessionId = `cs_test_stub_${randomUUID()}`;
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { stripeSessionId: stubSessionId },
      });
      return {
        stub: true,
        id: stubSessionId,
        url: `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}session_id=${stubSessionId}`,
        bookingId: booking.id,
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

    // Connect destination-charge shaped Checkout Session
    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set("success_url", input.successUrl);
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
      amountMinor: amount,
      currency: booking.currency,
    };
  }
}
