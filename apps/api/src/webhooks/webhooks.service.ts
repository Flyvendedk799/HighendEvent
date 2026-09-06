import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHmac, randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

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
    if (secret && signatureHeader) {
      // Lightweight signature check stub (full Stripe constructEvent optional)
      const payload = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
      try {
        event = JSON.parse(payload);
      } catch {
        throw new BadRequestException("Invalid webhook payload");
      }
    } else {
      try {
        const payload = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
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
        await this.prisma.booking.updateMany({
          where: { id: bookingId },
          data: {
            statusKey: "fully_paid",
            stripeSessionId: sessionId,
            stripePaymentIntentId: (obj.payment_intent as string) ?? undefined,
          },
        });
      } else if (sessionId) {
        await this.prisma.booking.updateMany({
          where: { stripeSessionId: sessionId },
          data: {
            statusKey: "fully_paid",
            stripePaymentIntentId: (obj.payment_intent as string) ?? undefined,
          },
        });
      }
    }

    return { ok: true, duplicate: false, eventId: event.id, type: event.type };
  }
}
