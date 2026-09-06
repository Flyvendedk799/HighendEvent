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
