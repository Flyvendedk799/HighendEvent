import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

@Injectable()
export class EmailTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    const tenantId = requireTenantId();
    return this.prisma.emailTemplate.findMany({
      where: { tenantId },
      orderBy: [{ key: "asc" }, { locale: "asc" }],
    });
  }

  async get(id: string) {
    const tenantId = requireTenantId();
    const tpl = await this.prisma.emailTemplate.findFirst({ where: { id, tenantId } });
    if (!tpl) throw new NotFoundException("Template not found");
    return tpl;
  }

  create(data: {
    key: string;
    subject: string;
    bodyHtml: string;
    locale?: string;
    isActive?: boolean;
  }) {
    const tenantId = requireTenantId();
    return this.prisma.emailTemplate.create({
      data: {
        tenantId,
        key: data.key,
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        locale: data.locale ?? "en",
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.get(id);
    return this.prisma.emailTemplate.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.emailTemplate.delete({ where: { id } });
  }
}
