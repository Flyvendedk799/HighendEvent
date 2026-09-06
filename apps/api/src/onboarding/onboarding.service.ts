import { ConflictException, Injectable } from "@nestjs/common";
import {
  DeliveryType,
  PaymentModel,
  PlanTier,
  StaffRole,
  TaxMode,
} from "@prisma/client";
import { DEFAULT_BOOKING_STATUSES } from "@rentora/domain";
import { PrismaService } from "../prisma/prisma.service";
import { hashPassword } from "../auth/password";
import { requireTenantId } from "../common/tenant.util";

export type OnboardInput = {
  tenantName: string;
  slug: string;
  storeName: string;
  ownerEmail: string;
  ownerName: string;
  ownerPassword: string;
  currency?: string;
  country?: string;
  plan?: PlanTier;
};

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async onboard(input: OnboardInput) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: input.slug } });
    if (existing) throw new ConflictException(`Slug '${input.slug}' already taken`);

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: input.tenantName,
          slug: input.slug.toLowerCase(),
          plan: input.plan ?? PlanTier.STARTER,
          featureFlags: {
            customDomains: (input.plan ?? PlanTier.STARTER) !== PlanTier.STARTER,
            upsells: true,
            deliveryZones: true,
          },
        },
      });

      const store = await tx.store.create({
        data: {
          tenantId: tenant.id,
          name: input.storeName,
          currency: input.currency ?? "USD",
          country: input.country ?? "US",
          taxMode: TaxMode.EXCLUSIVE,
          paymentModel: PaymentModel.FULL_UPFRONT,
          supportEmail: input.ownerEmail,
        },
      });

      const theme = await tx.theme.create({
        data: {
          tenantId: tenant.id,
          storeId: store.id,
          name: "Default",
          tokens: {
            primary: "#0F766E",
            secondary: "#134E4A",
            accent: "#F59E0B",
            background: "#F8FAFC",
            foreground: "#0F172A",
          },
        },
      });

      const owner = await tx.staffUser.create({
        data: {
          tenantId: tenant.id,
          email: input.ownerEmail,
          name: input.ownerName,
          role: StaffRole.OWNER,
          passwordHash: hashPassword(input.ownerPassword),
        },
      });

      await tx.bookingStatusDefinition.createMany({
        data: DEFAULT_BOOKING_STATUSES.map((s, i) => ({
          tenantId: tenant.id,
          key: s.key,
          label: s.label,
          isTerminal: s.isTerminal ?? false,
          sortOrder: i,
          color: s.isTerminal ? "#94A3B8" : "#64748B",
        })),
      });

      await tx.deliverySetting.createMany({
        data: [
          {
            tenantId: tenant.id,
            type: DeliveryType.PICKUP,
            baseFeeMinor: 0,
            perKmFeeMinor: 0,
            currency: input.currency ?? "USD",
          },
          {
            tenantId: tenant.id,
            type: DeliveryType.DELIVERY,
            baseFeeMinor: 5000,
            perKmFeeMinor: 150,
            freeDeliveryKm: 5,
            maxDeliveryKm: 50,
            currency: input.currency ?? "USD",
          },
        ],
      });

      await tx.emailTemplate.create({
        data: {
          tenantId: tenant.id,
          key: "booking_confirmation",
          locale: "en",
          subject: "Booking confirmed — {{bookingNo}}",
          bodyHtml: "<p>Thanks for your booking {{bookingNo}}.</p>",
        },
      });

      return {
        tenant,
        store,
        theme,
        owner: { id: owner.id, email: owner.email, role: owner.role },
      };
    });
  }

  async goLiveChecklist(tenantId?: string) {
    const tid = requireTenantId(tenantId);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tid },
      include: {
        _count: {
          select: {
            products: true,
            staff: true,
            themes: true,
            domains: true,
            emailTemplates: true,
          },
        },
        deliverySettings: true,
        domains: true,
        stores: { take: 1 },
      },
    });
    if (!tenant) {
      return { items: [], done: 0, total: 0, ready: false };
    }

    const productsWithImages = await this.prisma.product.count({
      where: {
        tenantId: tid,
        OR: [{ heroImageUrl: { not: null } }, { images: { some: {} } }],
      },
    });

    const items = [
      {
        key: "connect",
        item: "Connect Stripe account",
        done: tenant.connectOnboarded,
        href: "/admin/settings",
      },
      {
        key: "products",
        item: "Add at least 5 products with images",
        done: productsWithImages >= 5,
        href: "/admin/products",
      },
      {
        key: "delivery",
        item: "Configure delivery zones",
        done: tenant.deliverySettings.length > 0,
        href: "/admin/delivery",
      },
      {
        key: "tax",
        item: "Set tax & deposit model",
        done: Boolean(tenant.stores[0]?.taxMode && tenant.stores[0]?.paymentModel),
        href: "/admin/settings",
      },
      {
        key: "domain",
        item: "Verify custom domain DNS (optional)",
        done: tenant.domains.some((d) => d.verified) || tenant.plan === PlanTier.STARTER,
        optional: true,
        href: "/admin/settings",
      },
      {
        key: "email",
        item: "Configure booking confirmation email",
        done: tenant._count.emailTemplates > 0,
        href: "/admin/emails",
      },
      {
        key: "staff",
        item: "Invite a staff member",
        done: tenant._count.staff > 1,
        href: "/admin/staff",
      },
      {
        key: "theme",
        item: "Publish theme & logo",
        done: tenant._count.themes > 0,
        href: "/admin/theme",
      },
    ];

    const required = items.filter((i) => !("optional" in i && i.optional));
    const done = required.filter((i) => i.done).length;
    return {
      items,
      done,
      total: required.length,
      ready: required.every((i) => i.done),
    };
  }
}
