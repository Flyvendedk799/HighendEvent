import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

type StripeEvent = {
  id: string;
  type: string;
  data?: { object?: Record<string, unknown> };
};

/** Stripe rejects timestamps outside this window, and so do we, to blunt replay attacks. */
const SIGNATURE_TOLERANCE_SECONDS = 300;

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------- outbound hooks

  listEndpoints() {
    const tenantId = requireTenantId();
    return this.prisma.webhookEndpoint.findMany({ where: { tenantId } });
  }

  createEndpoint(data: { url: string; events: string[] }) {
    const tenantId = requireTenantId();
    return this.prisma.webhookEndpoint.create({
      data: {
        tenantId,
        url: data.url,
        events: data.events,
        secret: randomBytes(24).toString("hex"),
      },
    });
  }

  async deleteEndpoint(id: string) {
    const tenantId = requireTenantId();
    const endpoint = await this.prisma.webhookEndpoint.findFirst({ where: { id, tenantId } });
    if (!endpoint) throw new NotFoundException("Webhook endpoint not found");
    return this.prisma.webhookEndpoint.delete({ where: { id } });
  }

  async dispatchTenantEvent(event: string, payload: unknown, explicitTenantId?: string) {
    const tenantId = explicitTenantId ?? requireTenantId();
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { tenantId, isActive: true, events: { has: event } },
    });

    const results = [];
    for (const endpoint of endpoints) {
      const body = JSON.stringify({ event, payload, tenantId, sentAt: new Date().toISOString() });
      const signature = createHmac("sha256", endpoint.secret).update(body).digest("hex");
      try {
        const res = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Rentora-Signature": signature,
            "X-Rentora-Event": event,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        results.push({ id: endpoint.id, status: res.status, ok: res.ok });
      } catch (err) {
        results.push({
          id: endpoint.id,
          ok: false,
          error: err instanceof Error ? err.message : "dispatch failed",
        });
      }
    }
    return results;
  }

  // -------------------------------------------------------------- inbound Stripe

  /**
   * Verifies the Stripe signature over the raw body.
   *
   * When STRIPE_WEBHOOK_SECRET is set the signature must check out — an unverified event could
   * mark any booking paid. Without the secret (local development) events are accepted with a
   * warning so the flow can be exercised.
   */
  private verifySignature(rawBody: Buffer | string, signatureHeader?: string): void {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret || secret.startsWith("whsec_xxx")) {
      this.logger.warn(
        "STRIPE_WEBHOOK_SECRET is not set — accepting webhook without verifying its signature",
      );
      return;
    }

    if (!signatureHeader) {
      throw new BadRequestException("Missing Stripe signature");
    }

    const parts = Object.fromEntries(
      signatureHeader.split(",").map((part) => {
        const [key, ...value] = part.split("=");
        return [key?.trim() ?? "", value.join("=")];
      }),
    );

    const timestamp = Number(parts.t);
    const provided = parts.v1;

    if (!timestamp || !provided) {
      throw new BadRequestException("Malformed Stripe signature");
    }

    const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
    if (age > SIGNATURE_TOLERANCE_SECONDS) {
      throw new BadRequestException("Stripe signature timestamp is outside the allowed window");
    }

    const payload = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    const expected = createHmac("sha256", secret)
      .update(`${timestamp}.${payload}`)
      .digest("hex");

    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");

    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new BadRequestException("Stripe signature does not match");
    }
  }

  async handleStripeWebhook(rawBody: Buffer | string, signatureHeader?: string) {
    this.verifySignature(rawBody, signatureHeader);

    let event: StripeEvent;
    try {
      event = JSON.parse(typeof rawBody === "string" ? rawBody : rawBody.toString("utf8"));
    } catch {
      throw new BadRequestException("Invalid webhook payload");
    }

    if (!event?.id || !event?.type) {
      throw new BadRequestException("Missing event id/type");
    }

    // Stripe retries aggressively. The unique (provider, eventId) row is what makes replaying
    // an event a no-op rather than a double state change.
    const existing = await this.prisma.processedWebhook.findUnique({
      where: { provider_eventId: { provider: "stripe", eventId: event.id } },
    });
    if (existing) {
      return { ok: true, duplicate: true, eventId: event.id };
    }

    await this.prisma.processedWebhook.create({
      data: { provider: "stripe", eventId: event.id },
    });

    switch (event.type) {
      case "checkout.session.completed":
      case "payment_intent.succeeded":
        await this.markPaid(event);
        break;
      case "checkout.session.expired":
        await this.markAbandoned(event);
        break;
      case "charge.refunded":
        await this.markRefunded(event);
        break;
      case "account.updated":
        await this.syncConnectAccount(event);
        break;
      default:
        break;
    }

    return { ok: true, duplicate: false, eventId: event.id, type: event.type };
  }

  private async markPaid(event: StripeEvent) {
    const object = event.data?.object ?? {};
    const metadata = (object.metadata ?? {}) as Record<string, string>;
    const sessionId = typeof object.id === "string" ? object.id : undefined;
    const bookingId =
      (typeof object.client_reference_id === "string" ? object.client_reference_id : undefined) ??
      metadata.bookingId;

    const booking = bookingId
      ? await this.prisma.booking.findUnique({ where: { id: bookingId } })
      : sessionId
        ? await this.prisma.booking.findFirst({
            where: {
              OR: [{ stripeSessionId: sessionId }, { remainingSessionId: sessionId }],
            },
          })
        : null;

    if (!booking) {
      this.logger.warn(`Stripe event ${event.id} did not match a booking`);
      return;
    }

    const isRemainder =
      metadata.kind === "remainder" || booking.remainingSessionId === sessionId;

    const paymentIntentId =
      typeof object.payment_intent === "string"
        ? object.payment_intent
        : typeof object.id === "string" && event.type === "payment_intent.succeeded"
          ? object.id
          : undefined;

    if (isRemainder) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          statusKey: "fully_paid",
          upfrontMinor: booking.totalMinor,
          remainingMinor: 0,
          remainingPaymentIntentId: paymentIntentId,
        },
      });
    } else {
      // A deposit booking is only "fully paid" when nothing is outstanding.
      const settled = booking.remainingMinor === 0;
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          statusKey: settled ? "fully_paid" : "deposit_paid",
          stripeSessionId: sessionId ?? booking.stripeSessionId,
          stripePaymentIntentId: paymentIntentId,
        },
      });

      // The basket has become a booking, so it must not linger and be checked out twice.
      await this.clearCartFor(booking.tenantId, booking.customerId);
    }

    await this.dispatchTenantEvent(
      "booking.paid",
      { bookingId: booking.id, bookingNo: booking.bookingNo },
      booking.tenantId,
    ).catch(() => undefined);
  }

  private async markAbandoned(event: StripeEvent) {
    const object = event.data?.object ?? {};
    const sessionId = typeof object.id === "string" ? object.id : undefined;
    if (!sessionId) return;

    // The booking stays pending and keeps holding stock until staff cancel it, which is the
    // safe default — silently releasing a slot could double-book a customer who is still paying.
    this.logger.log(`Checkout session ${sessionId} expired`);
  }

  private async markRefunded(event: StripeEvent) {
    const object = event.data?.object ?? {};
    const paymentIntentId =
      typeof object.payment_intent === "string" ? object.payment_intent : undefined;
    if (!paymentIntentId) return;

    await this.prisma.booking.updateMany({
      where: { stripePaymentIntentId: paymentIntentId },
      data: { depositRefunded: true },
    });
  }

  private async syncConnectAccount(event: StripeEvent) {
    const object = event.data?.object ?? {};
    const accountId = typeof object.id === "string" ? object.id : undefined;
    if (!accountId) return;

    const chargesEnabled = object.charges_enabled === true;
    const detailsSubmitted = object.details_submitted === true;

    await this.prisma.tenant.updateMany({
      where: { stripeConnectAccountId: accountId },
      data: { connectOnboarded: chargesEnabled && detailsSubmitted },
    });
  }

  private async clearCartFor(tenantId: string, customerId: string | null) {
    if (!customerId) return;
    const cart = await this.prisma.cart.findFirst({ where: { tenantId, customerId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  }
}
