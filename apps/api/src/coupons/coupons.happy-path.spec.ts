import { CouponsService } from "./coupons.service";
import { tenantStorage } from "../tenant/tenant.context";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("coupons happy path", () => {
  const tenantA = { tenantId: "tenant-a", tenantSlug: "alpha" };

  const coupon = {
    id: "coup-1",
    tenantId: "tenant-a",
    code: "SAVE10",
    percentOffBps: 1000,
    amountOffMinor: null as number | null,
    startsAt: null as Date | null,
    endsAt: null as Date | null,
    maxRedemptions: 5,
    redeemedCount: 0,
    isActive: true,
  };

  const prismaMock = {
    coupon: {
      findFirst: jest.fn(
        async ({
          where,
        }: {
          where: { tenantId: string; code?: string; isActive?: boolean };
        }) => {
          if (where.tenantId !== coupon.tenantId) return null;
          if (where.code && where.code !== coupon.code) return null;
          if (where.isActive != null && where.isActive !== coupon.isActive) {
            return null;
          }
          return { ...coupon };
        },
      ),
      update: jest.fn(
        async ({
          data,
        }: {
          data: { redeemedCount?: { increment: number } };
        }) => {
          if (data.redeemedCount?.increment) {
            coupon.redeemedCount += data.redeemedCount.increment;
          }
          return { ...coupon };
        },
      ),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "coup-new",
        ...data,
        redeemedCount: 0,
        createdAt: new Date(),
      })),
      findMany: jest.fn(async () => [{ ...coupon }]),
    },
  };

  const service = new CouponsService(prismaMock as never);

  it("validates percent-off discount against subtotal", async () => {
    const result = await tenantStorage.run(tenantA, () =>
      service.validate("save10", 100_000),
    );
    expect(result.code).toBe("SAVE10");
    expect(result.discountMinor).toBe(10_000);
  });

  it("rejects unknown coupons", async () => {
    await expect(
      tenantStorage.run(tenantA, () => service.validate("NOPE", 100_000)),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("redeems and increments usage", async () => {
    await tenantStorage.run(tenantA, () => service.redeem("SAVE10"));
    expect(coupon.redeemedCount).toBe(1);
  });

  it("requires percent or fixed amount on create", async () => {
    await expect(
      tenantStorage.run(tenantA, () => service.create({ code: "EMPTY" })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
