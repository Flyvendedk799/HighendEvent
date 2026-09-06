import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

@Injectable()
export class ThemesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    const tenantId = requireTenantId();
    return this.prisma.theme.findMany({ where: { tenantId } });
  }

  async getCurrent() {
    const tenantId = requireTenantId();
    const theme = await this.prisma.theme.findFirst({
      where: { tenantId },
      include: { store: true },
    });
    if (!theme) throw new NotFoundException("Theme not found");
    return theme;
  }

  async update(id: string, data: { name?: string; tokens?: unknown }) {
    const tenantId = requireTenantId();
    const theme = await this.prisma.theme.findFirst({ where: { id, tenantId } });
    if (!theme) throw new NotFoundException("Theme not found");
    return this.prisma.theme.update({
      where: { id },
      data: {
        name: data.name,
        ...(data.tokens !== undefined
          ? { tokens: data.tokens as Prisma.InputJsonValue }
          : {}),
      },
    });
  }
}
