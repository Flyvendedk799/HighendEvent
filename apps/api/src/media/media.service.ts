import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    const tenantId = requireTenantId();
    return this.prisma.mediaAsset.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  async uploadStub(input: {
    filename: string;
    mimeType?: string;
    alt?: string;
    width?: number;
    height?: number;
  }) {
    const tenantId = requireTenantId();
    const key = `tenants/${tenantId}/${randomUUID()}-${input.filename}`;
    const base = process.env.R2_PUBLIC_URL ?? "https://cdn.rentora.app";
    const url = `${base.replace(/\/$/, "")}/${key}`;

    return this.prisma.mediaAsset.create({
      data: {
        tenantId,
        url,
        key,
        mimeType: input.mimeType,
        alt: input.alt,
        width: input.width,
        height: input.height,
      },
    });
  }
}
