import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { promises as dns } from "node:dns";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";
import { BillingService } from "../billing/billing.service";

/** Hostnames only: no scheme, no path, no port, at least one dot. */
const HOSTNAME = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

const CHALLENGE_PREFIX = "_rentora-challenge";

@Injectable()
export class DomainsService {
  private readonly logger = new Logger(DomainsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
  ) {}

  /**
   * The DNS records a tenant must create. The TXT challenge proves they control the name; the
   * CNAME/A record is what actually routes traffic.
   */
  private instructionsFor(hostname: string) {
    const target = process.env.CUSTOM_DOMAIN_TARGET ?? "cname.rentora.app";
    const apex = hostname.split(".").length === 2;

    return {
      verification: {
        type: "TXT" as const,
        name: `${CHALLENGE_PREFIX}.${hostname}`,
        value: this.challengeFor(hostname),
      },
      routing: apex
        ? {
            type: "ALIAS" as const,
            name: hostname,
            value: target,
            note: "Apex domains need an ALIAS/ANAME record. If your DNS provider does not support one, use a www subdomain instead.",
          }
        : { type: "CNAME" as const, name: hostname, value: target, note: null },
    };
  }

  /** Deterministic per tenant+host, so the record a tenant added yesterday still verifies. */
  private challengeFor(hostname: string): string {
    const tenantId = requireTenantId();
    const secret = process.env.DOMAIN_CHALLENGE_SECRET ?? "rentora-domain-challenge";
    return createHash("sha256")
      .update(`${secret}:${tenantId}:${hostname}`)
      .digest("hex")
      .slice(0, 32);
  }

  async list() {
    const tenantId = requireTenantId();
    const domains = await this.prisma.customDomain.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });

    return domains.map((domain) => ({
      ...domain,
      instructions: this.instructionsFor(domain.hostname),
    }));
  }

  async add(hostnameInput: string) {
    const tenantId = requireTenantId();
    await this.billing.assertWithinLimit("domains", tenantId);

    const hostname = hostnameInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    if (!HOSTNAME.test(hostname)) {
      throw new BadRequestException("Enter a domain like shop.example.com");
    }

    const platformDomain = (process.env.PLATFORM_DOMAIN ?? "rentora.app").toLowerCase();
    if (hostname === platformDomain || hostname.endsWith(`.${platformDomain}`)) {
      throw new BadRequestException(
        `${platformDomain} subdomains are managed for you and cannot be added here`,
      );
    }

    const existing = await this.prisma.customDomain.findUnique({ where: { hostname } });
    if (existing) {
      throw new ConflictException(
        existing.tenantId === tenantId
          ? "You have already added that domain"
          : "That domain is already connected to another store",
      );
    }

    const domain = await this.prisma.customDomain.create({
      data: { tenantId, hostname, verified: false, sslStatus: "pending" },
    });

    return { ...domain, instructions: this.instructionsFor(hostname) };
  }

  /**
   * Looks up the TXT challenge in real DNS. Verification is never granted on the tenant's word:
   * an unverified hostname is refused by the tenant middleware, so a wrong answer here would let
   * one tenant serve traffic for a name they do not own.
   */
  async verify(id: string) {
    const tenantId = requireTenantId();
    const domain = await this.prisma.customDomain.findFirst({ where: { id, tenantId } });
    if (!domain) throw new NotFoundException("Domain not found");

    const expected = this.challengeFor(domain.hostname);
    const record = `${CHALLENGE_PREFIX}.${domain.hostname}`;

    let records: string[][] = [];
    try {
      records = await dns.resolveTxt(record);
    } catch (err) {
      const code = (err as { code?: string }).code;
      return {
        ...domain,
        verified: false,
        instructions: this.instructionsFor(domain.hostname),
        message:
          code === "ENOTFOUND" || code === "ENODATA"
            ? `No TXT record found at ${record}. DNS changes can take a few minutes to propagate.`
            : `Could not read DNS for ${record} (${code ?? "unknown error"}).`,
      };
    }

    const found = records.some((chunks) => chunks.join("").trim() === expected);

    if (!found) {
      return {
        ...domain,
        verified: false,
        instructions: this.instructionsFor(domain.hostname),
        message: `A TXT record exists at ${record} but its value does not match. Check for a copy-paste error.`,
      };
    }

    const updated = await this.prisma.customDomain.update({
      where: { id },
      data: { verified: true, sslStatus: "provisioning" },
    });

    this.logger.log(`Domain ${domain.hostname} verified for tenant ${tenantId}`);

    return {
      ...updated,
      instructions: this.instructionsFor(domain.hostname),
      message:
        "Verified. Point the routing record at us if you have not already; certificates are issued automatically once traffic arrives.",
    };
  }

  async remove(id: string) {
    const tenantId = requireTenantId();
    const domain = await this.prisma.customDomain.findFirst({ where: { id, tenantId } });
    if (!domain) throw new NotFoundException("Domain not found");

    await this.prisma.customDomain.delete({ where: { id } });
    return { ok: true };
  }
}
