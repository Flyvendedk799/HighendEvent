import { createHmac } from "node:crypto";
import { BadRequestException } from "@nestjs/common";
import { WebhooksService } from "./webhooks.service";

type BookingRow = {
  id: string;
  tenantId: string;
  bookingNo: string;
  customerId: string | null;
  totalMinor: number;
  remainingMinor: number;
  statusKey: string;
  stripeSessionId: string | null;
  remainingSessionId: string | null;
  stripePaymentIntentId: string | null;
};

function makeBooking(overrides: Partial<BookingRow> = {}): BookingRow {
  return {
    id: "booking_1",
    tenantId: "tenant_1",
    bookingNo: "RNT-1",
    customerId: "cust_1",
    totalMinor: 100_000,
    remainingMinor: 0,
    statusKey: "pending",
    stripeSessionId: "cs_1",
    remainingSessionId: null,
    stripePaymentIntentId: null,
    ...overrides,
  };
}

function buildHarness(booking: BookingRow) {
  const processed = new Map<string, { provider: string; eventId: string }>();
  const updates: Array<Record<string, unknown>> = [];

  const prismaMock = {
    processedWebhook: {
      findUnique: jest.fn(
        async ({
          where,
        }: {
          where: { provider_eventId: { provider: string; eventId: string } };
        }) => processed.get(`${where.provider_eventId.provider}:${where.provider_eventId.eventId}`) ?? null,
      ),
      create: jest.fn(async ({ data }: { data: { provider: string; eventId: string } }) => {
        const key = `${data.provider}:${data.eventId}`;
        if (processed.has(key)) {
          const err = new Error("Unique constraint") as Error & { code: string };
          err.code = "P2002";
          throw err;
        }
        processed.set(key, data);
        return data;
      }),
    },
    booking: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
        where.id === booking.id ? booking : null,
      ),
      findFirst: jest.fn(async () => booking),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        return { ...booking, ...data };
      }),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    cart: { findFirst: jest.fn(async () => null) },
    cartItem: { deleteMany: jest.fn(async () => ({ count: 0 })) },
    tenant: { updateMany: jest.fn(async () => ({ count: 1 })) },
    webhookEndpoint: { findMany: jest.fn(async () => []) },
  };

  return {
    prismaMock,
    updates,
    processed,
    service: new WebhooksService(prismaMock as never),
  };
}

const OLD_ENV = process.env.STRIPE_WEBHOOK_SECRET;

afterEach(() => {
  // Assigning undefined would set the literal string "undefined", which reads as configured.
  if (OLD_ENV === undefined) {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  } else {
    process.env.STRIPE_WEBHOOK_SECRET = OLD_ENV;
  }
});

describe("WebhooksService Stripe idempotency", () => {
  it("processes a Stripe event once and ignores the replay", async () => {
    const { service, prismaMock } = buildHarness(makeBooking());
    const payload = JSON.stringify({
      id: "evt_123",
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", client_reference_id: "booking_1" } },
    });

    const first = await service.handleStripeWebhook(payload);
    expect(first).toMatchObject({ ok: true, duplicate: false, eventId: "evt_123" });
    expect(prismaMock.booking.update).toHaveBeenCalledTimes(1);

    const second = await service.handleStripeWebhook(payload);
    expect(second).toMatchObject({ ok: true, duplicate: true, eventId: "evt_123" });
    // The replay must not touch the booking a second time.
    expect(prismaMock.booking.update).toHaveBeenCalledTimes(1);
  });

  it("marks a fully-paid booking as fully_paid", async () => {
    const { service, updates } = buildHarness(makeBooking({ remainingMinor: 0 }));

    await service.handleStripeWebhook(
      JSON.stringify({
        id: "evt_full",
        type: "checkout.session.completed",
        data: { object: { id: "cs_1", client_reference_id: "booking_1", payment_intent: "pi_1" } },
      }),
    );

    expect(updates[0]).toMatchObject({ statusKey: "fully_paid", stripePaymentIntentId: "pi_1" });
  });

  it("marks a deposit booking as deposit_paid while a balance is outstanding", async () => {
    const { service, updates } = buildHarness(
      makeBooking({ remainingMinor: 70_000, statusKey: "pending" }),
    );

    await service.handleStripeWebhook(
      JSON.stringify({
        id: "evt_deposit",
        type: "checkout.session.completed",
        data: { object: { id: "cs_1", client_reference_id: "booking_1" } },
      }),
    );

    expect(updates[0]).toMatchObject({ statusKey: "deposit_paid" });
  });

  it("settles the balance when the remainder session is paid", async () => {
    const { service, updates } = buildHarness(
      makeBooking({ remainingMinor: 70_000, remainingSessionId: "cs_remainder" }),
    );

    await service.handleStripeWebhook(
      JSON.stringify({
        id: "evt_remainder",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_remainder",
            client_reference_id: "booking_1",
            metadata: { kind: "remainder" },
          },
        },
      }),
    );

    expect(updates[0]).toMatchObject({
      statusKey: "fully_paid",
      remainingMinor: 0,
      upfrontMinor: 100_000,
    });
  });

  it("flags a refunded deposit", async () => {
    const { service, prismaMock } = buildHarness(makeBooking());

    await service.handleStripeWebhook(
      JSON.stringify({
        id: "evt_refund",
        type: "charge.refunded",
        data: { object: { payment_intent: "pi_1" } },
      }),
    );

    expect(prismaMock.booking.updateMany).toHaveBeenCalledWith({
      where: { stripePaymentIntentId: "pi_1" },
      data: { depositRefunded: true },
    });
  });
});

describe("WebhooksService Stripe signature verification", () => {
  const secret = "whsec_test_secret";

  function sign(payload: string, timestamp: number): string {
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.${payload}`)
      .digest("hex");
    return `t=${timestamp},v1=${signature}`;
  }

  it("accepts a correctly signed event", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    const { service } = buildHarness(makeBooking());

    const payload = JSON.stringify({
      id: "evt_signed",
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", client_reference_id: "booking_1" } },
    });

    const result = await service.handleStripeWebhook(
      payload,
      sign(payload, Math.floor(Date.now() / 1000)),
    );
    expect(result).toMatchObject({ ok: true, duplicate: false });
  });

  it("rejects a forged signature", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    const { service, prismaMock } = buildHarness(makeBooking());

    const payload = JSON.stringify({ id: "evt_forged", type: "checkout.session.completed" });
    const forged = `t=${Math.floor(Date.now() / 1000)},v1=${"0".repeat(64)}`;

    await expect(service.handleStripeWebhook(payload, forged)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it("rejects a stale timestamp, so a captured event cannot be replayed later", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    const { service } = buildHarness(makeBooking());

    const payload = JSON.stringify({ id: "evt_old", type: "checkout.session.completed" });
    const staleTimestamp = Math.floor(Date.now() / 1000) - 3600;

    await expect(
      service.handleStripeWebhook(payload, sign(payload, staleTimestamp)),
    ).rejects.toThrow(/outside the allowed window/);
  });

  it("rejects a missing signature when a secret is configured", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    const { service } = buildHarness(makeBooking());

    await expect(
      service.handleStripeWebhook(JSON.stringify({ id: "e", type: "t" })),
    ).rejects.toThrow(/Missing Stripe signature/);
  });
});
