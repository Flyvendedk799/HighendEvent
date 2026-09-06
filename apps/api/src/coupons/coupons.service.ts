import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    const tenantId = requireTenantId();
    return this.prisma.coupon.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: {
    code: string;
    percentOffBps?: number;
    amountOffMinor?: number;
    currency?: string;
    maxRedemptions?: number;
    startsAt?: string;
    endsAt?: string;
    isActive?: boolean;
  }) {
    const tenantId = requireTenantId();
    if (!data.percentOffBps && !data.amountOffMinor) {
      throw new BadRequestException("Provide percentOffBps or amountOffMinor");
    }
    return this.prisma.coupon.create({
      data: {
        tenantId,
        code: data.code.trim().toUpperCase(),
        percentOffBps: data.percentOffBps,
        amountOffMinor: data.amountOffMinor,
        currency: data.currency,
        maxRedemptions: data.maxRedemptions,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      percentOffBps: number | null;
      amountOffMinor: number | null;
      currency: string | null;
      maxRedemptions: number | null;
      startsAt: string | null;
      endsAt: string | null;
      isActive: boolean;
    }>,
  ) {
    const tenantId = requireTenantId();
    const existing = await this.prisma.coupon.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException("Coupon not found");
    return this.prisma.coupon.update({
      where: { id },
      data: {
        percentOffBps: data.percentOffBps,
        amountOffMinor: data.amountOffMinor,
        currency: data.currency,
        maxRedemptions: data.maxRedemptions,
        startsAt:
          data.startsAt === undefined
            ? undefined
            : data.startsAt
              ? new Date(data.startsAt)
              : null,
        endsAt:
          data.endsAt === undefined ? undefined : data.endsAt ? new Date(data.endsAt) : null,
        isActive: data.isActive,
      },
    });
  }

  async remove(id: string) {
    const tenantId = requireTenantId();
    const existing = await this.prisma.coupon.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException("Coupon not found");
    await this.prisma.coupon.delete({ where: { id } });
    return { ok: true };
  }

  async validate(code: string, subtotalMinor: number) {
    const tenantId = requireTenantId();
    const coupon = await this.prisma.coupon.findFirst({
      where: { tenantId, code: code.trim().toUpperCase(), isActive: true },
    });
    if (!coupon) throw new NotFoundException("Coupon not found");

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      throw new BadRequestException("Coupon is not active yet");
    }
    if (coupon.endsAt && coupon.endsAt < now) {
      throw new BadRequestException("Coupon has expired");
    }
    if (
      coupon.maxRedemptions != null &&
      coupon.redeemedCount >= coupon.maxRedemptions
    ) {
      throw new BadRequestException("Coupon redemption limit reached");
    }

    let discountMinor = 0;
    if (coupon.percentOffBps) {
      discountMinor = Math.round((subtotalMinor * coupon.percentOffBps) / 10_000);
    } else if (coupon.amountOffMinor) {
      discountMinor = coupon.amountOffMinor;
    }
    discountMinor = Math.min(discountMinor, subtotalMinor);

    return {
      couponId: coupon.id,
      code: coupon.code,
      discountMinor,
      percentOffBps: coupon.percentOffBps,
      amountOffMinor: coupon.amountOffMinor,
    };
  }

  async redeem(code: string) {
    const tenantId = requireTenantId();
    const coupon = await this.prisma.coupon.findFirst({
      where: { tenantId, code: code.trim().toUpperCase() },
    });
    if (!coupon) return;
    await this.prisma.coupon.update({
      where: { id: coupon.id },
      data: { redeemedCount: { increment: 1 } },
    });
  }
}
