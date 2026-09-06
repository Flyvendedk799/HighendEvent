import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

function hashApiKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

@Injectable()
export class DeveloperService {
  constructor(private readonly prisma: PrismaService) {}

  listKeys() {
    const tenantId = requireTenantId();
    return this.prisma.apiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
  }

  async createKey(name: string) {
    const tenantId = requireTenantId();
    const raw = `rk_live_${randomBytes(24).toString("hex")}`;
    const row = await this.prisma.apiKey.create({
      data: {
        tenantId,
        name: name.trim() || "Default",
        keyHash: hashApiKey(raw),
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorType: "STAFF",
        action: "api_key.create",
        entityType: "ApiKey",
        entityId: row.id,
        meta: { name: row.name },
      },
    });
    return { ...row, apiKey: raw, note: "Copy now — the raw key is shown once." };
  }

  async revokeKey(id: string) {
    const tenantId = requireTenantId();
    const existing = await this.prisma.apiKey.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException("API key not found");
    await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorType: "STAFF",
        action: "api_key.revoke",
        entityType: "ApiKey",
        entityId: id,
        meta: {},
      },
    });
    return { ok: true };
  }
}
