import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { requireTenantId } from "../common/tenant.util";

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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
    const ep = await this.prisma.webhookEndpoint.findFirst({ where: { id, tenantId } });
    if (!ep) throw new NotFoundException("Webhook endpoint not found");
    return this.prisma.webhookEndpoint.delete({ where: { id } });
  }

  async dispatchTenantEvent(event: string, payload: unknown) {
    const tenantId = requireTenantId();
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { tenantId, isActive: true, events: { has: event } },
    });

    const results = [];
    for (const ep of endpoints) {
      const body = JSON.stringify({ event, payload, tenantId });
      const signature = createHmac("sha256", ep.secret).update(body).digest("hex");
      try {
        const res = await fetch(ep.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Rentora-Signature": signature,
          },
          body,
        });
        results.push({ id: ep.id, status: res.status, ok: res.ok });
      } catch (err) {
        results.push({
          id: ep.id,
          ok: false,
          error: err instanceof Error ? err.message : "dispatch failed",
        });
      }
    }
    return results;
  }

  async handleStripeWebhook(rawBody: Buffer | string, signatureHeader?: string) {
    const provider = "stripe";
    let event: { id: string; type: string; data?: { object?: Record<string, unknown> } };

    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const payload = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");

    if (secret && signatureHeader) {
      event = this.verifyStripeSignature(payload, signatureHeader, secret);
    } else if (secret && process.env.NODE_ENV === "production") {
      throw new BadRequestException("Missing Stripe-Signature header");
    } else {
      try {
        event = JSON.parse(payload);
      } catch {
        throw new BadRequestException("Invalid webhook payload");
      }
    }

    if (!event?.id || !event?.type) {
      throw new BadRequestException("Missing event id/type");
    }

    const existing = await this.prisma.processedWebhook.findUnique({
      where: { provider_eventId: { provider, eventId: event.id } },
    });
    if (existing) {
      return { ok: true, duplicate: true, eventId: event.id };
    }

    await this.prisma.processedWebhook.create({
      data: { provider, eventId: event.id },
    });

    if (
      event.type === "checkout.session.completed" ||
      event.type === "payment_intent.succeeded"
    ) {
      const obj = event.data?.object ?? {};
      const sessionId = (obj.id as string) ?? undefined;
      const bookingId =
        (obj.client_reference_id as string) ??
        ((obj.metadata as Record<string, string> | undefined)?.bookingId);

      if (bookingId) {
        const paymentKind =
          ((obj.metadata as Record<string, string> | undefined)?.paymentKind as
            | "upfront"
            | "remainder"
            | undefined) ?? "upfront";
        const existingBooking = await this.prisma.booking.findUnique({
          where: { id: bookingId },
        });
        if (!existingBooking) {
          return { ok: true, duplicate: false, eventId: event.id, type: event.type };
        }
        const nextStatus =
          paymentKind === "remainder" || existingBooking.remainingMinor <= 0
            ? "fully_paid"
            : "deposit_paid";
        const updated = await this.prisma.booking.updateMany({
          where: {
            id: bookingId,
            statusKey: { notIn: ["fully_paid", nextStatus] },
          },
          data: {
            statusKey: nextStatus,
            ...(paymentKind === "remainder"
              ? {
                  remainingSessionId: sessionId,
                  remainingPaymentIntentId:
                    (obj.payment_intent as string) ?? undefined,
                  remainingMinor: 0,
                }
              : {
                  stripeSessionId: sessionId,
                  stripePaymentIntentId:
                    (obj.payment_intent as string) ?? undefined,
                }),
          },
        });
        if (updated.count > 0) {
          const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
          if (booking) {
            await this.notifications.enqueueBookingConfirmation({
              tenantId: booking.tenantId,
              bookingId: booking.id,
              email: booking.email,
              customerName: booking.customerName,
              bookingNo: booking.bookingNo,
            });
          }
        }
      } else if (sessionId) {
        const existing = await this.prisma.booking.findFirst({
          where: { stripeSessionId: sessionId },
        });
        if (existing && existing.statusKey !== "fully_paid") {
          await this.prisma.booking.update({
            where: { id: existing.id },
            data: {
              statusKey: "fully_paid",
              stripePaymentIntentId: (obj.payment_intent as string) ?? undefined,
            },
          });
          await this.notifications.enqueueBookingConfirmation({
            tenantId: existing.tenantId,
            bookingId: existing.id,
            email: existing.email,
            customerName: existing.customerName,
            bookingNo: existing.bookingNo,
          });
        }
      }
    }

    return { ok: true, duplicate: false, eventId: event.id, type: event.type };
  }

  private verifyStripeSignature(
    payload: string,
    signatureHeader: string,
    secret: string,
  ): { id: string; type: string; data?: { object?: Record<string, unknown> } } {
    const parts = Object.fromEntries(
      signatureHeader.split(",").map((part) => {
        const [key, value] = part.split("=");
        return [key?.trim() ?? "", value ?? ""];
      }),
    ) as Record<string, string>;
    const timestamp = parts.t;
    const v1 = parts.v1;
    if (!timestamp || !v1) {
      throw new BadRequestException("Invalid Stripe-Signature header");
    }
    const ageSec = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
    if (!Number.isFinite(ageSec) || ageSec > 60 * 5) {
      throw new BadRequestException("Stripe webhook timestamp outside tolerance");
    }
    const signedPayload = `${timestamp}.${payload}`;
    const expected = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(v1, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new BadRequestException("Invalid Stripe webhook signature");
    }
    try {
      return JSON.parse(payload);
    } catch {
      throw new BadRequestException("Invalid webhook payload");
    }
  }
}
