import { NotFoundException } from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import { tenantStorage } from "../tenant/tenant.context";

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

  const prismaMock = {
    product: {
      findMany: jest.fn(async ({ where }: { where: { tenantId: string } }) =>
        products.filter((p) => p.tenantId === where.tenantId),
      ),
      findFirst: jest.fn(
        async ({ where }: { where: { id: string; tenantId: string } }) =>
          products.find((p) => p.id === where.id && p.tenantId === where.tenantId) ?? null,
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
    expect(listedB.map((p: { id: string }) => p.id)).not.toContain("prod-a1");
  });

  it("does not allow tenant A to read tenant B product by id", async () => {
    await expect(
      tenantStorage.run(tenantA, () => catalog.getProduct("prod-b1")),
    ).rejects.toBeInstanceOf(NotFoundException);

    const own = await tenantStorage.run(tenantB, () => catalog.getProduct("prod-b1"));
    expect(own.id).toBe("prod-b1");
  });
});
