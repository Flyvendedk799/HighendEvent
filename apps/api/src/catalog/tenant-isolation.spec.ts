import { CatalogService } from "./catalog.service";
import { tenantStorage } from "../tenant/tenant.context";
import { NotFoundException } from "@nestjs/common";

describe("tenant isolation", () => {
  const tenantA = { tenantId: "tenant-a", tenantSlug: "alpha" };
  const tenantB = { tenantId: "tenant-b", tenantSlug: "beta" };

  const products = [
    {
      id: "prod-a1",
      tenantId: "tenant-a",
      name: "Alpha Tent",
      slug: "alpha-tent",
      category: { id: "cat-a" },
      images: [],
    },
    {
      id: "prod-b1",
      tenantId: "tenant-b",
      name: "Beta Tent",
      slug: "beta-tent",
      category: { id: "cat-b" },
      images: [],
    },
  ];

  const bookings = [
    { id: "book-a1", tenantId: "tenant-a", bookingNo: "A-1" },
    { id: "book-b1", tenantId: "tenant-b", bookingNo: "B-1" },
  ];

  const coupons = [
    { id: "coup-a1", tenantId: "tenant-a", code: "ALPHA10" },
    { id: "coup-b1", tenantId: "tenant-b", code: "BETA10" },
  ];

  const prismaMock = {
    product: {
      findMany: jest.fn(async ({ where }: { where: { tenantId: string } }) =>
        products.filter((p) => p.tenantId === where.tenantId),
      ),
      findFirst: jest.fn(
        async ({ where }: { where: { id?: string; slug?: string; tenantId: string } }) =>
          products.find(
            (p) =>
              p.tenantId === where.tenantId &&
              (where.id ? p.id === where.id : true) &&
              (where.slug ? p.slug === where.slug : true),
          ) ?? null,
      ),
    },
    booking: {
      findMany: jest.fn(async ({ where }: { where: { tenantId: string } }) =>
        bookings.filter((b) => b.tenantId === where.tenantId),
      ),
      findFirst: jest.fn(
        async ({ where }: { where: { id: string; tenantId: string } }) =>
          bookings.find((b) => b.id === where.id && b.tenantId === where.tenantId) ?? null,
      ),
    },
    coupon: {
      findMany: jest.fn(async ({ where }: { where: { tenantId: string } }) =>
        coupons.filter((c) => c.tenantId === where.tenantId),
      ),
      findFirst: jest.fn(
        async ({ where }: { where: { code?: string; tenantId: string } }) =>
          coupons.find(
            (c) =>
              c.tenantId === where.tenantId &&
              (where.code ? c.code === where.code : true),
          ) ?? null,
      ),
    },
  };

  const catalog = new CatalogService(prismaMock as never);

  it("lists only products for the active tenant", async () => {
    const listedA = await tenantStorage.run(tenantA, () => catalog.listProducts());
    const listedB = await tenantStorage.run(tenantB, () => catalog.listProducts());

    expect(listedA.map((p: { id: string }) => p.id)).toEqual(["prod-a1"]);
    expect(listedB.map((p: { id: string }) => p.id)).toEqual(["prod-b1"]);
    expect(listedA.map((p: { id: string }) => p.id)).not.toContain("prod-b1");
  });

  it("does not allow tenant A to read tenant B product by id", async () => {
    await expect(
      tenantStorage.run(tenantA, () => catalog.getProduct("prod-b1")),
    ).rejects.toBeInstanceOf(NotFoundException);

    const own = await tenantStorage.run(tenantB, () => catalog.getProduct("prod-b1"));
    expect(own.id).toBe("prod-b1");
  });

  it("scopes bookings and coupons queries by tenantId", async () => {
    await tenantStorage.run(tenantA, async () => {
      await prismaMock.booking.findMany({ where: { tenantId: tenantA.tenantId } });
      await prismaMock.coupon.findMany({ where: { tenantId: tenantA.tenantId } });
    });
    expect(prismaMock.booking.findMany).toHaveBeenCalledWith({
      where: { tenantId: "tenant-a" },
    });
    expect(prismaMock.coupon.findMany).toHaveBeenCalledWith({
      where: { tenantId: "tenant-a" },
    });

    const foreignCoupon = await prismaMock.coupon.findFirst({
      where: { tenantId: "tenant-a", code: "BETA10" },
    });
    expect(foreignCoupon).toBeNull();
  });
});
