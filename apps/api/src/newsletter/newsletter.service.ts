import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    const tenantId = requireTenantId();
    return this.prisma.newsletterSubscription.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  subscribe(email: string) {
    const tenantId = requireTenantId();
    return this.prisma.newsletterSubscription.upsert({
      where: { tenantId_email: { tenantId, email } },
      create: { tenantId, email, isActive: true, confirmedAt: new Date() },
      update: { isActive: true, confirmedAt: new Date(), unsubscribedAt: null },
    });
  }

  async unsubscribe(email: string) {
    const tenantId = requireTenantId();
    const sub = await this.prisma.newsletterSubscription.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });
    if (!sub) throw new NotFoundException("Subscription not found");
    return this.prisma.newsletterSubscription.update({
      where: { id: sub.id },
      data: { isActive: false, unsubscribedAt: new Date() },
    });
  }
}
