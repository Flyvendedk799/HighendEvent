import { Injectable, NestMiddleware, NotFoundException } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { tenantStorage, type TenantContextValue } from "./tenant.context";

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const path = req.path ?? "";
    const skip =
      path.startsWith("/health") ||
      path.startsWith("/platform") ||
      path.startsWith("/onboarding") ||
      path.startsWith("/auth") ||
      path.startsWith("/webhooks/stripe") ||
      path.startsWith("/billing/plans");

    if (skip) {
      return next();
    }

    const slug = this.resolveSlug(req);
    if (!slug) {
      return next();
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      include: { stores: { take: 1, orderBy: { createdAt: "asc" } } },
    });

    if (!tenant || tenant.isSuspended) {
      throw new NotFoundException(`Tenant '${slug}' not found`);
    }

    const ctx: TenantContextValue = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      storeId: tenant.stores[0]?.id,
    };

    tenantStorage.run(ctx, () => next());
  }

  private resolveSlug(req: Request): string | undefined {
    const header = req.header("x-tenant-slug");
    if (header?.trim()) return header.trim().toLowerCase();

    const host = (req.header("x-forwarded-host") ?? req.header("host") ?? "")
      .split(",")[0]
      ?.trim()
      .toLowerCase();
    if (!host) return undefined;

    const hostname = host.split(":")[0] ?? host;
    const platformDomain = (process.env.PLATFORM_DOMAIN ?? "localhost").toLowerCase();

    if (hostname === platformDomain || hostname === "localhost" || hostname === "127.0.0.1") {
      return undefined;
    }

    if (hostname.endsWith(`.${platformDomain}`)) {
      const sub = hostname.slice(0, -(platformDomain.length + 1));
      if (sub && !sub.includes(".")) return sub;
    }

    const parts = hostname.split(".");
    if (parts.length >= 3) return parts[0];
    return undefined;
  }
}
