import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";
import { assertDomainLimit } from "../common/plan-limits";

export const DOMAIN_SSL_QUEUE = "domain-ssl";

@Injectable()
export class DomainsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject("DOMAIN_SSL_QUEUE") private readonly domainSslQueue: Queue,
  ) {}

  list(tenantId?: string) {
    const tid = requireTenantId(tenantId);
    return this.prisma.customDomain.findMany({
      where: { tenantId: tid },
      orderBy: { createdAt: "desc" },
    });
  }

  async add(hostname: string, tenantId?: string) {
    const tid = requireTenantId(tenantId);
    await assertDomainLimit(this.prisma, tid);

    const normalized = hostname.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
    if (!normalized || !normalized.includes(".")) {
      throw new BadRequestException("Enter a valid hostname (e.g. shop.example.com)");
    }

    const existing = await this.prisma.customDomain.findUnique({
      where: { hostname: normalized },
    });
    if (existing) throw new BadRequestException("Hostname already registered");

    const domain = await this.prisma.customDomain.create({
      data: {
        tenantId: tid,
        hostname: normalized,
        verified: false,
        sslStatus: "pending",
      },
    });

    return {
      ...domain,
      dns: this.dnsInstructions(domain.hostname, tid),
    };
  }

  async remove(id: string, tenantId?: string) {
    const tid = requireTenantId(tenantId);
    const domain = await this.prisma.customDomain.findFirst({ where: { id, tenantId: tid } });
    if (!domain) throw new NotFoundException("Domain not found");
    await this.prisma.customDomain.delete({ where: { id } });
    return { ok: true };
  }

  async verify(id: string, tenantId?: string) {
    const tid = requireTenantId(tenantId);
    const domain = await this.prisma.customDomain.findFirst({ where: { id, tenantId: tid } });
    if (!domain) throw new NotFoundException("Domain not found");

    const stubMode = process.env.DOMAIN_VERIFY_STUB !== "false";
    let verified = stubMode;

    if (!stubMode) {
      // Real TXT lookup: rentora-verify=<tenantId>
      try {
        const dns = await import("node:dns/promises");
        const records = await dns.resolveTxt(`_rentora.${domain.hostname}`);
        const flat = records.flat().join("");
        verified = flat.includes(`rentora-verify=${tid}`);
      } catch {
        verified = false;
      }
    }

    if (!verified) {
      return {
        verified: false,
        sslStatus: domain.sslStatus,
        dns: this.dnsInstructions(domain.hostname, tid),
        message: "TXT record not found yet. Add the DNS record and try again.",
      };
    }

    const updated = await this.prisma.customDomain.update({
      where: { id },
      data: { verified: true, sslStatus: stubMode ? "active" : "provisioning" },
    });

    try {
      await this.domainSslQueue.add("provision", {
        domainId: updated.id,
        hostname: updated.hostname,
        tenantId: tid,
      });
    } catch {
      // Queue optional in local/dev without Redis
    }

    return {
      ...updated,
      dns: this.dnsInstructions(updated.hostname, tid),
      message: stubMode
        ? "Domain verified (stub mode). Set DOMAIN_VERIFY_STUB=false for live DNS checks."
        : "Domain verified. SSL provisioning queued.",
    };
  }

  dnsInstructions(hostname: string, tenantId: string) {
    return [
      {
        type: "CNAME",
        host: hostname,
        value: process.env.PLATFORM_CNAME_TARGET ?? "cname.rentora.app",
      },
      {
        type: "TXT",
        host: `_rentora.${hostname}`,
        value: `rentora-verify=${tenantId}`,
      },
    ];
  }

  async close() {
    await this.domainSslQueue.close();
  }
}
