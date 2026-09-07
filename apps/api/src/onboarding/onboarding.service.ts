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
import { planLimits } from "../billing/plan-limits";

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

  /** Slugs become hostnames, so the reserved list keeps a tenant off our own subdomains. */
  private static readonly RESERVED_SLUGS = new Set([
    "www",
    "admin",
    "api",
    "app",
    "cdn",
    "assets",
    "static",
    "mail",
    "status",
    "docs",
    "blog",
    "support",
    "help",
    "rentora",
  ]);

  async checkSlug(input: string) {
    const slug = input.trim().toLowerCase();

    if (!/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/.test(slug)) {
      return {
        slug,
        available: false,
        reason:
          "Use 3 to 30 characters: lowercase letters, numbers and hyphens, not starting or ending with a hyphen.",
      };
    }

    if (OnboardingService.RESERVED_SLUGS.has(slug)) {
      return { slug, available: false, reason: "That address is reserved." };
    }

    const taken = await this.prisma.tenant.findUnique({ where: { slug } });

    return {
      slug,
      available: !taken,
      reason: taken ? "That address is already taken." : null,
    };
  }

  async onboard(input: OnboardInput) {
    const slug = input.slug.trim().toLowerCase();

    const check = await this.checkSlug(slug);
    if (!check.available) {
      throw new ConflictException(check.reason ?? "That address is not available");
    }

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: input.tenantName,
          slug,
          plan: input.plan ?? PlanTier.STARTER,
          applicationFeeBps: planLimits(input.plan ?? PlanTier.STARTER).applicationFeeBps,
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

      return { tenant, store, theme, owner: { id: owner.id, email: owner.email, role: owner.role } };
    });
  }
}
