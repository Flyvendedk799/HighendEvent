import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PaymentModel, Prisma, TaxMode } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

export type StoreSettingsInput = {
  name?: string;
  tagline?: string | null;
  localeDefault?: string;
  locales?: string[];
  currency?: string;
  timezone?: string;
  country?: string;
  taxMode?: TaxMode;
  taxPercentBps?: number;
  paymentModel?: PaymentModel;
  depositPercentBps?: number;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  brandColors?: Record<string, string>;
  fonts?: Record<string, string>;
  supportEmail?: string | null;
  supportPhone?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

/** Colours are tenant-supplied and end up in a stylesheet, so only real hex values are stored. */
const HEX = /^#[0-9a-fA-F]{3,8}$/;

/** Fonts are rendered through Google Fonts, so the value must look like a font family name. */
const FONT_NAME = /^[A-Za-z0-9 ]{1,40}$/;

@Injectable()
export class StoreSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const tenantId = requireTenantId();
    const store = await this.prisma.store.findFirst({
      where: { tenantId },
      include: { theme: true },
    });
    if (!store) throw new NotFoundException("Store not found");
    return store;
  }

  async update(input: StoreSettingsInput) {
    const store = await this.get();

    if (input.brandColors) this.assertColors(input.brandColors);
    if (input.fonts) this.assertFonts(input.fonts);

    if (input.taxPercentBps !== undefined && (input.taxPercentBps < 0 || input.taxPercentBps > 10_000)) {
      throw new BadRequestException("Tax must be between 0% and 100%");
    }
    if (
      input.depositPercentBps !== undefined &&
      (input.depositPercentBps < 0 || input.depositPercentBps > 10_000)
    ) {
      throw new BadRequestException("Deposit must be between 0% and 100%");
    }
    if (
      input.paymentModel === PaymentModel.DEPOSIT_REMAINDER &&
      (input.depositPercentBps ?? store.depositPercentBps) === 0
    ) {
      throw new BadRequestException(
        "Set a deposit percentage before switching to deposit-and-balance",
      );
    }

    const { brandColors, fonts, ...rest } = input;

    return this.prisma.store.update({
      where: { id: store.id },
      data: {
        ...rest,
        ...(brandColors ? { brandColors: brandColors as Prisma.InputJsonObject } : {}),
        ...(fonts ? { fonts: fonts as Prisma.InputJsonObject } : {}),
      },
      include: { theme: true },
    });
  }

  async updateTheme(input: { name?: string; tokens?: Record<string, string> }) {
    const tenantId = requireTenantId();
    const store = await this.get();

    if (input.tokens) {
      // Tokens carry both colours and scalar settings like radius; validate the colours.
      const colors = Object.fromEntries(
        Object.entries(input.tokens).filter(([key]) => key !== "radius" && key !== "density"),
      );
      this.assertColors(colors);
    }

    const theme = store.theme;

    if (!theme) {
      return this.prisma.theme.create({
        data: {
          tenantId,
          storeId: store.id,
          name: input.name ?? "Default",
          tokens: (input.tokens ?? {}) as Prisma.InputJsonObject,
        },
      });
    }

    return this.prisma.theme.update({
      where: { id: theme.id },
      data: {
        name: input.name,
        ...(input.tokens ? { tokens: input.tokens as Prisma.InputJsonObject } : {}),
      },
    });
  }

  /**
   * The go-live checklist, read from real state. Every item here is something that actually
   * breaks the shop if it is missing, which is why none of it is hard-coded to true.
   */
  async goLiveChecklist() {
    const tenantId = requireTenantId();

    const [tenant, store, productCount, categoryCount, imageCount, location, delivery, domains] =
      await Promise.all([
        this.prisma.tenant.findUnique({ where: { id: tenantId } }),
        this.prisma.store.findFirst({ where: { tenantId }, include: { theme: true } }),
        this.prisma.product.count({ where: { tenantId, isActive: true } }),
        this.prisma.category.count({ where: { tenantId, isActive: true } }),
        this.prisma.productImage.count({ where: { product: { tenantId } } }),
        this.prisma.location.findFirst({ where: { tenantId, isPrimary: true } }),
        this.prisma.deliverySetting.findFirst({
          where: { tenantId, type: "DELIVERY", isActive: true },
        }),
        this.prisma.customDomain.findMany({ where: { tenantId } }),
      ]);

    if (!tenant || !store) throw new NotFoundException("Store not found");

    const items = [
      {
        key: "store",
        label: "Name your store",
        done: Boolean(store.name && store.name !== "Your store"),
        href: "/admin/settings",
        detail: store.name,
        required: true,
      },
      {
        key: "categories",
        label: "Create at least one category",
        done: categoryCount > 0,
        href: "/admin/categories",
        detail: `${categoryCount} category(s)`,
        required: true,
      },
      {
        key: "products",
        label: "Publish something to rent",
        done: productCount > 0,
        href: "/admin/products",
        detail: `${productCount} published`,
        required: true,
      },
      {
        key: "photos",
        label: "Add photos to your products",
        done: imageCount > 0,
        href: "/admin/products",
        detail: `${imageCount} photo(s)`,
        required: false,
      },
      {
        key: "payouts",
        label: "Connect Stripe so you can be paid",
        done: tenant.connectOnboarded,
        href: "/admin/settings",
        detail: tenant.connectOnboarded ? "Payouts enabled" : "Not connected",
        required: true,
      },
      {
        key: "theme",
        label: "Set your brand colours",
        done: Boolean(store.theme && Object.keys(store.theme.tokens ?? {}).length > 0),
        href: "/admin/theme",
        detail: store.theme?.name ?? "Not set",
        required: false,
      },
      {
        key: "location",
        label: "Add your pickup location",
        done: Boolean(location),
        href: "/admin/locations",
        detail: location?.name ?? "Not set",
        required: delivery ? true : false,
      },
      {
        key: "support",
        label: "Add a contact email",
        done: Boolean(store.supportEmail),
        href: "/admin/settings",
        detail: store.supportEmail ?? "Not set",
        required: true,
      },
      {
        key: "domain",
        label: "Connect your own domain",
        done: domains.some((domain) => domain.verified),
        href: "/admin/settings",
        detail: domains.length
          ? domains.map((d) => `${d.hostname} (${d.verified ? "verified" : "pending"})`).join(", ")
          : `${tenant.slug}.rentora.app`,
        required: false,
      },
    ];

    const required = items.filter((item) => item.required);

    return {
      items,
      readyToLaunch: required.every((item) => item.done),
      completed: items.filter((item) => item.done).length,
      total: items.length,
      storefrontUrl: domains.find((d) => d.verified)?.hostname ?? `${tenant.slug}.rentora.app`,
    };
  }

  private assertColors(colors: Record<string, string>) {
    for (const [key, value] of Object.entries(colors)) {
      if (typeof value !== "string" || !HEX.test(value)) {
        throw new BadRequestException(`${key} must be a hex colour such as #0F766E`);
      }
    }
  }

  private assertFonts(fonts: Record<string, string>) {
    for (const [key, value] of Object.entries(fonts)) {
      if (typeof value !== "string" || !FONT_NAME.test(value)) {
        throw new BadRequestException(`${key} must be a font family name`);
      }
    }
  }
}
