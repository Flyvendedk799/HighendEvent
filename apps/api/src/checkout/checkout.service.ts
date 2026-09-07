import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DeliveryType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { BookingsService } from "../bookings/bookings.service";
import { CartService, type CartOwner } from "../cart/cart.service";
import { DeliveryService } from "../delivery/delivery.service";
import { requireTenantId } from "../common/tenant.util";
import { hashPassword } from "../auth/password";

export type CheckoutInput = {
  owner: CartOwner;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  zipCode: string;
  city: string;
  country?: string;
  deliveryType: DeliveryType;
  notes?: string;
  successUrl: string;
  cancelUrl: string;
};

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
    private readonly cart: CartService,
    private readonly delivery: DeliveryService,
  ) {}

  /**
   * Quotes delivery for an address without committing to anything, so the checkout form can
   * show the real fee before the shopper pays.
   */
  async quoteDelivery(input: {
    address: string;
    zipCode?: string;
    city?: string;
    country?: string;
  }) {
    return this.delivery.quote(input);
  }

  /**
   * Turns the caller's cart into a booking and a payment session.
   *
   * The cart is resolved from the caller identity, never from an id in the request body — a
   * cart id in a payload would let anyone check out with someone else's basket.
   */
  async createSession(input: CheckoutInput) {
    const tenantId = requireTenantId();

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException("Tenant not found");
    if (tenant.isSuspended) throw new BadRequestException("This store is not taking bookings");

    const summary = await this.cart.summary(input.owner);

    if (summary.cart.items.length === 0) {
      throw new BadRequestException("Your cart is empty");
    }
    if (summary.issues.length > 0) {
      throw new BadRequestException(summary.issues[0]!.message);
    }

    const first = summary.cart.items[0]!;
    if (!first.startDate || !first.endDate) {
      throw new BadRequestException("Choose dates for every item before checking out");
    }

    // Every line in one booking shares the booking window; the cart guarantees dates exist.
    const startDate = isoOf(
      summary.cart.items.reduce(
        (min, item) => (item.startDate! < min ? item.startDate! : min),
        first.startDate,
      ),
    );
    const endDate = isoOf(
      summary.cart.items.reduce(
        (max, item) => (item.endDate! > max ? item.endDate! : max),
        first.endDate,
      ),
    );

    let deliveryFeeMinor = 0;
    let deliveryBreakdown: Record<string, unknown> | undefined;

    if (input.deliveryType === DeliveryType.DELIVERY) {
      const quote = await this.delivery.quote({
        address: input.address,
        zipCode: input.zipCode,
        city: input.city,
        country: input.country,
      });
      if (!quote.allowed) {
        throw new BadRequestException(quote.explanation);
      }
      deliveryFeeMinor = quote.feeMinor;
      deliveryBreakdown = { ...quote };
    }

    const customer = await this.upsertCustomer(tenantId, input);

    const booking = await this.bookings.create({
      source: "ONLINE",
      customerId: customer.id,
      customerName: input.customerName,
      email: input.email,
      phone: input.phone,
      address: input.address,
      zipCode: input.zipCode,
      city: input.city,
      country: input.country,
      startDate,
      endDate,
      deliveryType: input.deliveryType,
      deliveryFeeMinor,
      deliveryBreakdown,
      notes: input.notes,
      items: summary.cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        upsells: item.upsells.map((link) => ({
          upsellProductId: link.upsellProductId,
          quantity: link.quantity,
        })),
      })),
    });

    const session = await this.startPayment(tenant, booking, input);

    return {
      ...session,
      bookingId: booking.id,
      bookingNo: booking.bookingNo,
      amountMinor: booking.upfrontMinor,
      currency: booking.currency,
    };
  }

  /** Payment link for the outstanding balance on a deposit booking. */
  async createRemainderSession(input: {
    bookingId: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    const tenantId = requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const booking = await this.prisma.booking.findFirst({
      where: { id: input.bookingId, tenantId, isDeleted: false },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.remainingMinor <= 0) {
      throw new BadRequestException("This booking has no outstanding balance");
    }

    const session = await this.stripeSession({
      tenant,
      amountMinor: booking.remainingMinor,
      currency: booking.currency,
      description: `Balance for booking ${booking.bookingNo}`,
      bookingId: booking.id,
      kind: "remainder",
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { remainingSessionId: session.id },
    });

    return { ...session, bookingId: booking.id, amountMinor: booking.remainingMinor };
  }

  /**
   * Confirmation details for a completed checkout.
   *
   * Keyed by the Stripe session id, which is unguessable and only ever handed to the person who
   * checked out — the same capability pattern Stripe uses for its own success pages. Only the
   * fields that person already knows are returned.
   */
  async confirmation(sessionId: string) {
    const tenantId = requireTenantId();

    const booking = await this.prisma.booking.findFirst({
      where: {
        tenantId,
        isDeleted: false,
        OR: [{ stripeSessionId: sessionId }, { remainingSessionId: sessionId }],
      },
      include: {
        items: { include: { upsells: { include: { upsellProduct: true } } } },
      },
    });

    if (!booking) throw new NotFoundException("We could not find that booking");

    return {
      bookingNo: booking.bookingNo,
      customerName: booking.customerName,
      email: booking.email,
      startDate: booking.startDate,
      endDate: booking.endDate,
      statusKey: booking.statusKey,
      deliveryType: booking.deliveryType,
      address: booking.address,
      zipCode: booking.zipCode,
      city: booking.city,
      currency: booking.currency,
      subtotalMinor: booking.subtotalMinor,
      taxMinor: booking.taxMinor,
      depositMinor: booking.depositMinor,
      deliveryFeeMinor: booking.deliveryFeeMinor,
      totalMinor: booking.totalMinor,
      upfrontMinor: booking.upfrontMinor,
      remainingMinor: booking.remainingMinor,
      items: booking.items.map((item) => ({
        name: item.nameSnapshot,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        upsells: item.upsells.map((link) => ({
          name: link.nameSnapshot,
          quantity: link.quantity,
          unitPriceMinor: link.unitPriceMinor,
        })),
      })),
    };
  }

  // ------------------------------------------------------------------ Internals

  private async startPayment(
    tenant: { id: string; stripeConnectAccountId: string | null; applicationFeeBps: number },
    booking: { id: string; bookingNo: string; upfrontMinor: number; currency: string },
    input: CheckoutInput,
  ) {
    const session = await this.stripeSession({
      tenant,
      amountMinor: booking.upfrontMinor,
      currency: booking.currency,
      description: `Booking ${booking.bookingNo}`,
      bookingId: booking.id,
      kind: "initial",
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { stripeSessionId: session.id },
    });

    return session;
  }

  private async stripeSession(params: {
    tenant: { id: string; stripeConnectAccountId: string | null; applicationFeeBps: number };
    amountMinor: number;
    currency: string;
    description: string;
    bookingId: string;
    kind: "initial" | "remainder";
    successUrl: string;
    cancelUrl: string;
  }) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    // Without Stripe credentials the flow still completes end to end, but it says so plainly
    // rather than presenting itself as a real payment.
    if (!stripeKey || stripeKey.startsWith("sk_test_xxx")) {
      const id = `cs_stub_${randomUUID()}`;
      const separator = params.successUrl.includes("?") ? "&" : "?";
      return {
        stub: true as const,
        id,
        url: `${params.successUrl}${separator}session_id=${id}&stub=1`,
        message:
          "Stripe is not configured, so no payment was taken. Set STRIPE_SECRET_KEY to charge for real.",
      };
    }

    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set("success_url", params.successUrl);
    body.set("cancel_url", params.cancelUrl);
    body.set("client_reference_id", params.bookingId);
    body.set("metadata[bookingId]", params.bookingId);
    body.set("metadata[tenantId]", params.tenant.id);
    body.set("metadata[kind]", params.kind);
    body.set("line_items[0][quantity]", "1");
    body.set("line_items[0][price_data][currency]", params.currency.toLowerCase());
    body.set("line_items[0][price_data][unit_amount]", String(params.amountMinor));
    body.set("line_items[0][price_data][product_data][name]", params.description);

    // Destination charge: funds settle to the tenant, the platform keeps its fee.
    if (params.tenant.stripeConnectAccountId) {
      body.set(
        "payment_intent_data[application_fee_amount]",
        String(Math.round((params.amountMinor * params.tenant.applicationFeeBps) / 10_000)),
      );
      body.set(
        "payment_intent_data[transfer_data][destination]",
        params.tenant.stripeConnectAccountId,
      );
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        // Stripe deduplicates retries of the same booking payment.
        "Idempotency-Key": `${params.bookingId}:${params.kind}`,
      },
      body,
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new BadRequestException(`Payment could not be started: ${detail.slice(0, 300)}`);
    }

    const session = (await res.json()) as { id: string; url: string };
    return { stub: false as const, id: session.id, url: session.url, message: null };
  }

  /**
   * Attaches the booking to a customer record. A guest checkout creates a guest customer, which
   * later upgrades in place if that person registers with the same email.
   */
  private async upsertCustomer(tenantId: string, input: CheckoutInput) {
    const email = input.email.trim().toLowerCase();

    if (input.owner.customerId) {
      const existing = await this.prisma.customer.findFirst({
        where: { id: input.owner.customerId, tenantId },
      });
      if (existing) {
        return this.prisma.customer.update({
          where: { id: existing.id },
          data: {
            phone: input.phone || existing.phone,
            address: input.address || existing.address,
            zipCode: input.zipCode || existing.zipCode,
            city: input.city || existing.city,
            country: input.country ?? existing.country,
          },
        });
      }
    }

    const [firstName, ...rest] = input.customerName.trim().split(/\s+/);

    return this.prisma.customer.upsert({
      where: { tenantId_email: { tenantId, email } },
      update: {
        phone: input.phone,
        address: input.address,
        zipCode: input.zipCode,
        city: input.city,
        country: input.country,
      },
      create: {
        tenantId,
        email,
        firstName: firstName ?? input.customerName,
        lastName: rest.join(" "),
        phone: input.phone,
        address: input.address,
        zipCode: input.zipCode,
        city: input.city,
        country: input.country,
        isGuest: true,
        // A guest has no usable password; registering later replaces this hash.
        passwordHash: hashPassword(randomUUID()),
      },
    });
  }
}

function isoOf(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}
