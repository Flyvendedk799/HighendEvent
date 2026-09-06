import { MediaService } from "./media.service";

jest.mock("../common/tenant.util", () => ({
  requireTenantId: () => "tenant_test_1",
}));

describe("MediaService", () => {
  const created: unknown[] = [];
  const prisma = {
    mediaAsset: {
      findMany: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: "media_1", createdAt: new Date(), ...data };
        created.push(row);
        return row;
      }),
    },
  };

  const prev = { ...process.env };

  beforeEach(() => {
    created.length = 0;
    jest.clearAllMocks();
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET;
    process.env.R2_PUBLIC_URL = "https://cdn.test.rentora.app";
  });

  afterAll(() => {
    process.env = prev;
  });

  it("reports stub storage when R2 env is incomplete", () => {
    const svc = new MediaService(prisma as never);
    expect(svc.storageStatus()).toEqual({
      configured: false,
      provider: "stub",
      publicBase: "https://cdn.test.rentora.app",
    });
  });

  it("presign in stub mode creates a MediaAsset immediately", async () => {
    const svc = new MediaService(prisma as never);
    const result = await svc.presign({
      filename: "hero photo.jpg",
      mimeType: "image/jpeg",
      alt: "Hero",
    });

    expect(result.mode).toBe("stub");
    expect(result.uploadUrl).toBeNull();
    expect(result.publicUrl).toMatch(/^https:\/\/cdn\.test\.rentora\.app\/tenants\/tenant_test_1\//);
    expect(result.publicUrl).toContain("hero-photo.jpg");
    expect(result.asset).toMatchObject({
      tenantId: "tenant_test_1",
      mimeType: "image/jpeg",
      alt: "Hero",
    });
    expect(prisma.mediaAsset.create).toHaveBeenCalledTimes(1);
  });

  it("complete rejects keys outside the tenant prefix", async () => {
    const svc = new MediaService(prisma as never);
    await expect(svc.complete({ key: "tenants/other/file.jpg" })).rejects.toThrow(
      /Invalid media key/,
    );
  });

  it("complete creates asset for valid tenant key", async () => {
    const svc = new MediaService(prisma as never);
    const key = "tenants/tenant_test_1/abc-file.jpg";
    const asset = await svc.complete({ key, mimeType: "image/jpeg", alt: "A" });
    expect(asset).toMatchObject({
      tenantId: "tenant_test_1",
      key,
      url: `https://cdn.test.rentora.app/${key}`,
      mimeType: "image/jpeg",
      alt: "A",
    });
  });

  it("upload stub registers CDN URL without R2", async () => {
    const svc = new MediaService(prisma as never);
    const asset = await svc.upload({ filename: "x.png", mimeType: "image/png" });
    expect(asset.url).toContain("tenants/tenant_test_1/");
    expect(asset.url).toContain("x.png");
  });
});
