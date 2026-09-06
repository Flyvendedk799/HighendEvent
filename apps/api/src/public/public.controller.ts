import { Controller, Get, Query } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("public")
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("resolve-host")
  async resolveHost(@Query("host") host?: string) {
    const hostname = (host ?? "")
      .toLowerCase()
      .split(":")[0]
      ?.trim();
    if (!hostname) return { slug: null, status: "missing" as const };

    const domain = await this.prisma.customDomain.findUnique({
      where: { hostname },
      include: { tenant: { select: { slug: true, isSuspended: true, name: true } } },
    });

    if (domain?.verified && domain.tenant) {
      return {
        slug: domain.tenant.slug,
        status: domain.tenant.isSuspended ? ("suspended" as const) : ("ok" as const),
        name: domain.tenant.name,
        hostname,
      };
    }

    const bySlug = await this.prisma.tenant.findUnique({
      where: { slug: hostname.split(".")[0] ?? hostname },
      select: { slug: true, isSuspended: true, name: true },
    });
    if (bySlug) {
      return {
        slug: bySlug.slug,
        status: bySlug.isSuspended ? ("suspended" as const) : ("ok" as const),
        name: bySlug.name,
        hostname,
      };
    }

    return { slug: null, status: "missing" as const, hostname };
  }

  @Get("tenant-status")
  async tenantStatus(@Query("slug") slug?: string) {
    if (!slug) return { status: "missing" as const };
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() },
      select: { slug: true, name: true, isSuspended: true },
    });
    if (!tenant) return { status: "missing" as const };
    return {
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.isSuspended ? ("suspended" as const) : ("ok" as const),
    };
  }
}
