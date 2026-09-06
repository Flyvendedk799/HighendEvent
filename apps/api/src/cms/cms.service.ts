import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService) {}

  list(locale?: string) {
    const tenantId = requireTenantId();
    return this.prisma.cmsPage.findMany({
      where: { tenantId, ...(locale ? { locale } : {}) },
      orderBy: { slug: "asc" },
    });
  }

  async get(id: string) {
    const tenantId = requireTenantId();
    const page = await this.prisma.cmsPage.findFirst({ where: { id, tenantId } });
    if (!page) throw new NotFoundException("Page not found");
    return page;
  }

  async getBySlug(slug: string, locale = "en") {
    const tenantId = requireTenantId();
    const page = await this.prisma.cmsPage.findUnique({
      where: { tenantId_slug_locale: { tenantId, slug, locale } },
    });
    if (!page || !page.isPublished) throw new NotFoundException("Page not found");
    return page;
  }

  create(data: {
    slug: string;
    title: string;
    locale?: string;
    sections?: unknown;
    seoTitle?: string;
    seoDescription?: string;
    isPublished?: boolean;
  }) {
    const tenantId = requireTenantId();
    return this.prisma.cmsPage.create({
      data: {
        tenantId,
        slug: data.slug,
        title: data.title,
        locale: data.locale ?? "en",
        sections: (data.sections ?? []) as Prisma.InputJsonValue,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        isPublished: data.isPublished ?? false,
      },
    });
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.get(id);
    const { sections, ...rest } = data;
    return this.prisma.cmsPage.update({
      where: { id },
      data: {
        ...rest,
        ...(sections !== undefined
          ? { sections: sections as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.cmsPage.delete({ where: { id } });
  }
}
