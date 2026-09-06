import { Injectable, NotFoundException } from "@nestjs/common";
import { DeliveryType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

@Injectable()
export class DeliverySettingsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    const tenantId = requireTenantId();
    return this.prisma.deliverySetting.findMany({ where: { tenantId } });
  }

  async upsert(data: {
    type: DeliveryType;
    baseFeeMinor: number;
    perKmFeeMinor?: number;
    freeDeliveryKm?: number;
    maxDeliveryKm?: number | null;
    currency?: string;
    notes?: string;
    isActive?: boolean;
  }) {
    const tenantId = requireTenantId();
    return this.prisma.deliverySetting.upsert({
      where: { tenantId_type: { tenantId, type: data.type } },
      create: { tenantId, ...data },
      update: {
        baseFeeMinor: data.baseFeeMinor,
        perKmFeeMinor: data.perKmFeeMinor,
        freeDeliveryKm: data.freeDeliveryKm,
        maxDeliveryKm: data.maxDeliveryKm,
        currency: data.currency,
        notes: data.notes,
        isActive: data.isActive,
      },
    });
  }

  listZones() {
    const tenantId = requireTenantId();
    return this.prisma.deliveryZone.findMany({ where: { tenantId } });
  }

  createZone(data: {
    name: string;
    feeMinor: number;
    currency?: string;
    polygonGeoJson?: unknown;
    isActive?: boolean;
  }) {
    const tenantId = requireTenantId();
    return this.prisma.deliveryZone.create({
      data: {
        tenantId,
        name: data.name,
        feeMinor: data.feeMinor,
        currency: data.currency,
        polygonGeoJson: data.polygonGeoJson as object | undefined,
        isActive: data.isActive,
      },
    });
  }

  async deleteZone(id: string) {
    const tenantId = requireTenantId();
    const zone = await this.prisma.deliveryZone.findFirst({ where: { id, tenantId } });
    if (!zone) throw new NotFoundException("Zone not found");
    return this.prisma.deliveryZone.delete({ where: { id } });
  }
}
