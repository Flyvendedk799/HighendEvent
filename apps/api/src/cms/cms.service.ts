import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

export type CmsPageInput = {
  slug: string;
  title: string;
  locale?: string;
  sections?: unknown;
  seoTitle?: string;
  seoDescription?: string;
  isPublished?: boolean;
};

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Drafts are only ever returned to staff. A public read that leaked unpublished pages would
   * put half-finished copy on the open web.
   */
  list(options: { locale?: string; includeDrafts?: boolean } = {}) {
    const tenantId = requireTenantId();
    return this.prisma.cmsPage.findMany({
      where: {
        tenantId,
        ...(options.locale ? { locale: options.locale } : {}),
        ...(options.includeDrafts ? {} : { isPublished: true }),
      },
      orderBy: { slug: "asc" },
    });
  }

  async get(id: string) {
    const tenantId = requireTenantId();
    const page = await this.prisma.cmsPage.findFirst({ where: { id, tenantId } });
    if (!page) throw new NotFoundException("Page not found");
    return page;
  }

  async getBySlug(slug: string, options: { locale?: string; includeDrafts?: boolean } = {}) {
    const tenantId = requireTenantId();
    const locale = options.locale ?? "en";

    const page =
      (await this.prisma.cmsPage.findUnique({
        where: { tenantId_slug_locale: { tenantId, slug, locale } },
      })) ??
      // Fall back to the store default language rather than 404ing a translated page.
      (await this.prisma.cmsPage.findFirst({ where: { tenantId, slug } }));

    if (!page) throw new NotFoundException("Page not found");

    // An unpublished page is indistinguishable from a missing one to the public.
    if (!page.isPublished && !options.includeDrafts) {
      throw new NotFoundException("Page not found");
    }

    return page;
  }

  create(data: CmsPageInput) {
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

  async update(id: string, data: Partial<CmsPageInput>) {
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
