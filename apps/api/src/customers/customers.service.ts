import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";
import { hashPassword } from "../auth/password";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    const tenantId = requireTenantId();
    return this.prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(id: string) {
    const tenantId = requireTenantId();
    const customer = await this.prisma.customer.findFirst({ where: { id, tenantId } });
    if (!customer) throw new NotFoundException("Customer not found");
    return customer;
  }

  create(data: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    address?: string;
    zipCode?: string;
    city?: string;
    country?: string;
    password?: string;
    isGuest?: boolean;
  }) {
    const tenantId = requireTenantId();
    return this.prisma.customer.create({
      data: {
        tenantId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        address: data.address,
        zipCode: data.zipCode,
        city: data.city,
        country: data.country,
        isGuest: data.isGuest ?? !data.password,
        passwordHash: data.password ? hashPassword(data.password) : undefined,
      },
    });
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.get(id);
    const { password, ...rest } = data as { password?: string } & Record<string, unknown>;
    return this.prisma.customer.update({
      where: { id },
      data: {
        ...rest,
        ...(password ? { passwordHash: hashPassword(password) } : {}),
      },
    });
  }

  async deactivate(id: string) {
    await this.get(id);
    return this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
