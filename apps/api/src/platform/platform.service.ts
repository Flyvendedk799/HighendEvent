import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  listTenants() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { products: true, bookings: true, customers: true } },
        stores: { take: 1 },
      },
    });
  }

  async suspendTenant(id: string, suspended = true) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException("Tenant not found");
    return this.prisma.tenant.update({
      where: { id },
      data: { isSuspended: suspended },
    });
  }

  async metrics() {
    const [tenants, bookings, revenue] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.booking.count({ where: { isDeleted: false } }),
      this.prisma.booking.aggregate({
        where: { isDeleted: false, statusKey: { not: "cancelled" } },
        _sum: { totalMinor: true },
      }),
    ]);
    return {
      tenants,
      bookings,
      gmvMinor: revenue._sum.totalMinor ?? 0,
      note: "Platform metrics stub",
    };
  }
}
