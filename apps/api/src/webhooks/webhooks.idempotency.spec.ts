import { WebhooksService } from "./webhooks.service";

describe("WebhooksService Stripe idempotency", () => {
  const processed = new Map<string, { provider: string; eventId: string }>();

  const prismaMock = {
    processedWebhook: {
      findUnique: jest.fn(
        async ({ where }: { where: { provider_eventId: { provider: string; eventId: string } } }) => {
          const key = `${where.provider_eventId.provider}:${where.provider_eventId.eventId}`;
          return processed.get(key) ?? null;
        },
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
      updateMany: jest.fn(async () => ({ count: 1 })),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        tenantId: "tenant_1",
        email: "guest@example.com",
        customerName: "Guest",
        bookingNo: "RNT-1",
      })),
      findFirst: jest.fn(async () => null),
      update: jest.fn(),
    },
    webhookEndpoint: {
      findMany: jest.fn(async () => []),
    },
  };

  const service = new WebhooksService(
    prismaMock as never,
    { enqueueBookingConfirmation: jest.fn() } as never,
  );

  beforeEach(() => {
    processed.clear();
    jest.clearAllMocks();
  });

  it("processes a Stripe event once and marks duplicates", async () => {
    const payload = JSON.stringify({
      id: "evt_123",
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", client_reference_id: "booking_1" } },
    });

    const first = await service.handleStripeWebhook(payload);
    expect(first).toMatchObject({ ok: true, duplicate: false, eventId: "evt_123" });
    expect(prismaMock.booking.updateMany).toHaveBeenCalledTimes(1);

    const second = await service.handleStripeWebhook(payload);
    expect(second).toMatchObject({ ok: true, duplicate: true, eventId: "evt_123" });
    expect(prismaMock.booking.updateMany).toHaveBeenCalledTimes(1);
  });
});
