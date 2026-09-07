import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

export type CouponInput = {
  code: string;
  percentOffBps?: number | null;
  amountOffMinor?: number | null;
  currency?: string | null;
  maxRedemptions?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
};

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    const tenantId = requireTenantId();
    return this.prisma.coupon.findMany({
      where: { tenantId },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
  }

  async create(input: CouponInput) {
    const tenantId = requireTenantId();
    const code = this.normaliseCode(input.code);
    this.assertOneDiscountKind(input);

    const existing = await this.prisma.coupon.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    if (existing) throw new ConflictException(`A coupon with code ${code} already exists`);

    return this.prisma.coupon.create({
      data: {
        tenantId,
        code,
        percentOffBps: input.percentOffBps ?? null,
        amountOffMinor: input.amountOffMinor ?? null,
        currency: input.currency ?? null,
        maxRedemptions: input.maxRedemptions ?? null,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        isActive: input.isActive ?? true,
      },
    });
  }

  async update(id: string, input: Partial<CouponInput>) {
    const tenantId = requireTenantId();
    const coupon = await this.prisma.coupon.findFirst({ where: { id, tenantId } });
    if (!coupon) throw new NotFoundException("Coupon not found");

    if (input.percentOffBps !== undefined || input.amountOffMinor !== undefined) {
      this.assertOneDiscountKind({
        percentOffBps: input.percentOffBps ?? coupon.percentOffBps,
        amountOffMinor: input.amountOffMinor ?? coupon.amountOffMinor,
      });
    }

    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...(input.code !== undefined ? { code: this.normaliseCode(input.code) } : {}),
        ...(input.percentOffBps !== undefined ? { percentOffBps: input.percentOffBps } : {}),
        ...(input.amountOffMinor !== undefined ? { amountOffMinor: input.amountOffMinor } : {}),
        ...(input.maxRedemptions !== undefined
          ? { maxRedemptions: input.maxRedemptions }
          : {}),
        ...(input.startsAt !== undefined
          ? { startsAt: input.startsAt ? new Date(input.startsAt) : null }
          : {}),
        ...(input.endsAt !== undefined
          ? { endsAt: input.endsAt ? new Date(input.endsAt) : null }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  }

  async remove(id: string) {
    const tenantId = requireTenantId();
    const coupon = await this.prisma.coupon.findFirst({ where: { id, tenantId } });
    if (!coupon) throw new NotFoundException("Coupon not found");

    // A redeemed coupon is deactivated, so the bookings that used it keep making sense.
    if (coupon.redeemedCount > 0) {
      return this.prisma.coupon.update({ where: { id }, data: { isActive: false } });
    }
    return this.prisma.coupon.delete({ where: { id } });
  }

  /**
   * Validates a code against a cart subtotal and returns the discount it would apply.
   *
   * Nothing is redeemed here — this is what the cart calls while the shopper is still deciding.
   */
  async quote(code: string, subtotalMinor: number, currency: string) {
    const tenantId = requireTenantId();
    const coupon = await this.prisma.coupon.findUnique({
      where: { tenantId_code: { tenantId, code: this.normaliseCode(code) } },
    });

    if (!coupon || !coupon.isActive) {
      return { valid: false as const, discountMinor: 0, reason: "That code is not valid." };
    }

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      return { valid: false as const, discountMinor: 0, reason: "That code is not active yet." };
    }
    if (coupon.endsAt && coupon.endsAt < now) {
      return { valid: false as const, discountMinor: 0, reason: "That code has expired." };
    }
    if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) {
      return {
        valid: false as const,
        discountMinor: 0,
        reason: "That code has been fully redeemed.",
      };
    }
    if (coupon.currency && coupon.currency !== currency) {
      return {
        valid: false as const,
        discountMinor: 0,
        reason: "That code cannot be used in this currency.",
      };
    }

    const discountMinor = coupon.percentOffBps
      ? Math.round((subtotalMinor * coupon.percentOffBps) / 10_000)
      : Math.min(coupon.amountOffMinor ?? 0, subtotalMinor);

    return {
      valid: true as const,
      code: coupon.code,
      discountMinor,
      // Never let a coupon make a booking free by accident.
      description: coupon.percentOffBps
        ? `${(coupon.percentOffBps / 100).toFixed(0)}% off`
        : "Fixed discount",
      reason: null,
    };
  }

  /**
   * Called once the booking is actually created, so the count reflects real redemptions.
   *
   * The update is conditional on the count we read, which is an optimistic lock: two shoppers
   * racing for the last redemption cannot both win it.
   */
  async redeem(code: string) {
    const tenantId = requireTenantId();

    const coupon = await this.prisma.coupon.findUnique({
      where: { tenantId_code: { tenantId, code: this.normaliseCode(code) } },
    });

    if (!coupon?.isActive) return { redeemed: false };
    if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) {
      return { redeemed: false };
    }

    const result = await this.prisma.coupon.updateMany({
      where: { id: coupon.id, redeemedCount: coupon.redeemedCount },
      data: { redeemedCount: coupon.redeemedCount + 1 },
    });

    return { redeemed: result.count === 1 };
  }

  private normaliseCode(code: string): string {
    const normalised = code.trim().toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9_-]{3,32}$/.test(normalised)) {
      throw new BadRequestException(
        "Codes are 3 to 32 characters: letters, numbers, hyphens and underscores.",
      );
    }
    return normalised;
  }

  private assertOneDiscountKind(input: {
    percentOffBps?: number | null;
    amountOffMinor?: number | null;
  }) {
    const hasPercent = Boolean(input.percentOffBps);
    const hasAmount = Boolean(input.amountOffMinor);

    if (hasPercent && hasAmount) {
      throw new BadRequestException("A coupon is either a percentage or a fixed amount, not both");
    }
    if (!hasPercent && !hasAmount) {
      throw new BadRequestException("Set either a percentage or a fixed amount");
    }
    if (input.percentOffBps && (input.percentOffBps <= 0 || input.percentOffBps > 10_000)) {
      throw new BadRequestException("The percentage must be between 0 and 100");
    }
    if (input.amountOffMinor && input.amountOffMinor <= 0) {
      throw new BadRequestException("The discount amount must be above zero");
    }
  }
}
