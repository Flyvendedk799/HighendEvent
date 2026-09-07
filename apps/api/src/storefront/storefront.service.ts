import { Injectable, NotFoundException } from "@nestjs/common";
import { DeliveryType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

export type StorefrontBootstrap = Awaited<ReturnType<StorefrontService["bootstrap"]>>;

@Injectable()
export class StorefrontService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Everything the storefront chrome needs in one round trip: identity, branding, locale,
   * money formatting, enabled features. Called from the storefront layout on every render, so
   * it stays a single indexed query set.
   */
  async bootstrap() {
    const tenantId = requireTenantId();

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        stores: { take: 1, orderBy: { createdAt: "asc" }, include: { theme: true } },
        domains: { where: { verified: true } },
      },
    });

    if (!tenant) throw new NotFoundException("Tenant not found");
    const store = tenant.stores[0];
    if (!store) throw new NotFoundException("Store not configured for this tenant");

    const [categories, delivery, productCount, cmsPages] = await Promise.all([
      this.prisma.category.findMany({
        where: { tenantId, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, slug: true, imageUrl: true },
      }),
      this.prisma.deliverySetting.findUnique({
        where: { tenantId_type: { tenantId, type: DeliveryType.DELIVERY } },
      }),
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
      this.prisma.cmsPage.findMany({
        where: { tenantId, isPublished: true },
        orderBy: { title: "asc" },
        select: { slug: true, title: true, locale: true },
      }),
    ]);

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        featureFlags: (tenant.featureFlags ?? {}) as Record<string, boolean>,
        connectOnboarded: tenant.connectOnboarded,
        primaryDomain: tenant.domains[0]?.hostname ?? null,
      },
      store: {
        id: store.id,
        name: store.name,
        tagline: store.tagline,
        localeDefault: store.localeDefault,
        locales: store.locales,
        currency: store.currency,
        timezone: store.timezone,
        country: store.country,
        taxMode: store.taxMode,
        taxPercentBps: store.taxPercentBps,
        paymentModel: store.paymentModel,
        depositPercentBps: store.depositPercentBps,
        logoUrl: store.logoUrl,
        faviconUrl: store.faviconUrl,
        brandColors: store.brandColors as Record<string, string>,
        fonts: store.fonts as Record<string, string>,
        supportEmail: store.supportEmail,
        supportPhone: store.supportPhone,
        seoTitle: store.seoTitle,
        seoDescription: store.seoDescription,
      },
      theme: {
        id: store.theme?.id ?? null,
        name: store.theme?.name ?? "Default",
        tokens: (store.theme?.tokens ?? {}) as Record<string, string>,
      },
      categories,
      pages: cmsPages,
      features: {
        deliveryEnabled: Boolean(delivery?.isActive),
        hasProducts: productCount > 0,
      },
    };
  }
}
