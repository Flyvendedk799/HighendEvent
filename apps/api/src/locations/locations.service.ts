import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    const tenantId = requireTenantId();
    return this.prisma.location.findMany({
      where: { tenantId },
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
    });
  }

  async get(id: string) {
    const tenantId = requireTenantId();
    const loc = await this.prisma.location.findFirst({ where: { id, tenantId } });
    if (!loc) throw new NotFoundException("Location not found");
    return loc;
  }

  create(data: {
    name: string;
    address: string;
    zipCode: string;
    city: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    isPrimary?: boolean;
  }) {
    const tenantId = requireTenantId();
    return this.prisma.location.create({ data: { tenantId, ...data } });
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.get(id);
    return this.prisma.location.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.location.delete({ where: { id } });
  }
}
