import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DeliveryType } from "@prisma/client";
import { calculateDeliveryFee, haversineKm } from "@rentora/domain";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  async quote(input: {
    address: string;
    zipCode?: string;
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const tenantId = requireTenantId();
    const setting = await this.prisma.deliverySetting.findUnique({
      where: { tenantId_type: { tenantId, type: DeliveryType.DELIVERY } },
    });
    if (!setting?.isActive) {
      throw new BadRequestException("Delivery is not enabled for this tenant");
    }

    const origin = await this.prisma.location.findFirst({
      where: { tenantId, isPrimary: true, isActive: true },
    });
    if (!origin?.latitude || !origin?.longitude) {
      throw new BadRequestException("Primary location coordinates are required");
    }

    const dest = await this.resolveCoords(input);
    const distanceKm = haversineKm(
      origin.latitude,
      origin.longitude,
      dest.latitude,
      dest.longitude,
    );

    const fee = calculateDeliveryFee({
      distanceKm,
      baseFeeMinor: setting.baseFeeMinor,
      perKmFeeMinor: setting.perKmFeeMinor,
      freeDeliveryKm: setting.freeDeliveryKm,
      maxDeliveryKm: setting.maxDeliveryKm,
      currency: setting.currency,
    });

    return {
      ...fee,
      currency: setting.currency,
      origin: { latitude: origin.latitude, longitude: origin.longitude },
      destination: dest,
      geocodeSource: dest.source,
    };
  }

  private async resolveCoords(input: {
    address: string;
    zipCode?: string;
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  }) {
    if (input.latitude != null && input.longitude != null) {
      return {
        latitude: input.latitude,
        longitude: input.longitude,
        source: "client" as const,
      };
    }

    const token = process.env.MAPBOX_ACCESS_TOKEN;
    if (!token) {
      // Deterministic stub coords derived from address hash so quotes are stable in local/dev.
      const seed = [...(input.address + (input.zipCode ?? ""))].reduce(
        (a, c) => a + c.charCodeAt(0),
        0,
      );
      return {
        latitude: 40.7 + (seed % 100) / 1000,
        longitude: -74.0 - (seed % 80) / 1000,
        source: "stub" as const,
      };
    }

    const query = encodeURIComponent(
      [input.address, input.zipCode, input.city, input.country].filter(Boolean).join(", "),
    );
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${token}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) throw new BadRequestException("Geocoding failed");
    const data = (await res.json()) as {
      features?: Array<{ center: [number, number] }>;
    };
    const feature = data.features?.[0];
    if (!feature) throw new NotFoundException("Address could not be geocoded");
    return {
      longitude: feature.center[0],
      latitude: feature.center[1],
      source: "mapbox" as const,
    };
  }
}
