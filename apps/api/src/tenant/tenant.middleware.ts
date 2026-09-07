import { Injectable, NestMiddleware, NotFoundException } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { tenantStorage, type TenantContextValue } from "./tenant.context";

type SlugHint = { slug: string; source: "header" | "subdomain" } | { hostname: string };

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const ctx: TenantContextValue = {};

    // Every request runs inside a context object so that a tenant-bound token can fill it in
    // later (see bindTenantFromToken) even when the host carries no tenant hint.
    const hint = this.resolveHint(req);

    if (hint) {
      const tenant =
        "slug" in hint
          ? await this.prisma.tenant.findUnique({
              where: { slug: hint.slug },
              include: { stores: { take: 1, orderBy: { createdAt: "asc" } } },
            })
          : await this.resolveByCustomDomain(hint.hostname);

      if (tenant) {
        if (tenant.isSuspended) {
          throw new NotFoundException("This store is not available");
        }
        ctx.tenantId = tenant.id;
        ctx.tenantSlug = tenant.slug;
        ctx.storeId = tenant.stores[0]?.id;
        ctx.source = "slug" in hint ? hint.source : "custom-domain";
      } else if ("slug" in hint && hint.source === "header") {
        // An explicit header naming a tenant that does not exist is a client error, not a
        // silent fall-through to "no tenant".
        throw new NotFoundException(`Tenant ${hint.slug} not found`);
      }
    }

    tenantStorage.run(ctx, () => next());
  }

  private async resolveByCustomDomain(hostname: string) {
    const domain = await this.prisma.customDomain.findUnique({
      where: { hostname },
      include: {
        tenant: { include: { stores: { take: 1, orderBy: { createdAt: "asc" } } } },
      },
    });
    if (!domain?.verified) return null;
    return domain.tenant;
  }

  private resolveHint(req: Request): SlugHint | undefined {
    const header = req.header("x-tenant-slug");
    if (header?.trim()) {
      return { slug: header.trim().toLowerCase(), source: "header" };
    }

    // The web BFF forwards the browser-facing hostname here, because the Host header on a
    // server-to-server call names the API, not the customer domain.
    const forwardedHost = req.header("x-tenant-host")?.trim().toLowerCase();
    if (forwardedHost) {
      return { hostname: forwardedHost.split(":")[0]! };
    }

    const host = (req.header("x-forwarded-host") ?? req.header("host") ?? "")
      .split(",")[0]
      ?.trim()
      .toLowerCase();
    if (!host) return undefined;

    const hostname = host.split(":")[0] ?? host;
    const platformDomain = (process.env.PLATFORM_DOMAIN ?? "localhost")
      .toLowerCase()
      .split(":")[0]!;

    if (hostname === platformDomain || hostname === "localhost" || hostname === "127.0.0.1") {
      return undefined;
    }

    if (hostname.endsWith(`.${platformDomain}`)) {
      const sub = hostname.slice(0, -(platformDomain.length + 1));
      if (sub && !sub.includes(".") && sub !== "www" && sub !== "admin" && sub !== "api") {
        return { slug: sub, source: "subdomain" };
      }
      return undefined;
    }

    // Anything else is a candidate custom domain, resolved against the CustomDomain table.
    return { hostname };
  }
}
