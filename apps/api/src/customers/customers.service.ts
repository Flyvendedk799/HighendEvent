import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";
import { hashPassword } from "../auth/password";

export type CustomerInput = {
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
};

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  list(filters: { q?: string; includeGuests?: boolean } = {}) {
    const tenantId = requireTenantId();
    const q = filters.q?.trim();

    return this.prisma.customer.findMany({
      where: {
        tenantId,
        ...(filters.includeGuests === false ? { isGuest: false } : {}),
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: "insensitive" as const } },
                { lastName: { contains: q, mode: "insensitive" as const } },
                { email: { contains: q, mode: "insensitive" as const } },
                { phone: { contains: q, mode: "insensitive" as const } },
                { city: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { bookings: true } } },
    });
  }

  async get(id: string) {
    const tenantId = requireTenantId();
    const customer = await this.prisma.customer.findFirst({ where: { id, tenantId } });
    if (!customer) throw new NotFoundException("Customer not found");
    return customer;
  }

  /** Customer plus their booking history and lifetime value, for the admin detail page. */
  async getWithHistory(id: string) {
    const tenantId = requireTenantId();
    const customer = await this.get(id);

    const bookings = await this.prisma.booking.findMany({
      where: { tenantId, customerId: id, isDeleted: false },
      include: { items: true },
      orderBy: { startDate: "desc" },
    });

    // Cancelled bookings are shown but never counted towards what the customer is worth.
    const settled = bookings.filter((booking) => booking.statusKey !== "cancelled");

    return {
      customer,
      bookings,
      stats: {
        bookingCount: settled.length,
        lifetimeValueMinor: settled.reduce((sum, booking) => sum + booking.totalMinor, 0),
        outstandingMinor: settled.reduce((sum, booking) => sum + booking.remainingMinor, 0),
        firstBookingAt: settled.at(-1)?.createdAt ?? null,
        lastBookingAt: settled[0]?.createdAt ?? null,
      },
    };
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

  async update(id: string, data: Partial<CustomerInput>) {
    await this.get(id);
    const { password, ...rest } = data;
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
