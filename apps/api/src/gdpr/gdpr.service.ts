import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

@Injectable()
export class GdprService {
  constructor(private readonly prisma: PrismaService) {}

  async exportCustomer(customerId: string) {
    const tenantId = requireTenantId();
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: {
        bookings: { include: { items: true } },
        carts: { include: { items: true } },
      },
    });
    if (!customer) throw new NotFoundException("Customer not found");

    const newsletters = await this.prisma.newsletterSubscription.findMany({
      where: { tenantId, email: customer.email },
    });

    await this.prisma.consentLog.create({
      data: {
        tenantId,
        subject: customer.email,
        kind: "gdpr_export",
        granted: true,
        meta: { customerId },
      },
    });

    return {
      exportedAt: new Date().toISOString(),
      customer,
      newsletters,
    };
  }

  async deleteCustomer(customerId: string) {
    const tenantId = requireTenantId();
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException("Customer not found");

    await this.prisma.$transaction(async (tx) => {
      await tx.cart.deleteMany({ where: { tenantId, customerId } });
      await tx.booking.updateMany({
        where: { tenantId, customerId },
        data: {
          customerId: null,
          customerName: "Redacted",
          email: `redacted+${customerId}@deleted.local`,
          phone: "redacted",
          address: "redacted",
          zipCode: "0000",
          city: "redacted",
          iban: null,
          bankLocalRef: null,
        },
      });
      await tx.newsletterSubscription.deleteMany({
        where: { tenantId, email: customer.email },
      });
      await tx.customer.delete({ where: { id: customerId } });
      await tx.consentLog.create({
        data: {
          tenantId,
          subject: customer.email,
          kind: "gdpr_delete",
          granted: true,
          meta: { customerId },
        },
      });
    });

    return { ok: true, customerId };
  }
}
