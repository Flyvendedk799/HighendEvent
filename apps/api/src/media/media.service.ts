import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";
import {
  ALLOWED_UPLOAD_MIME,
  extensionFor,
  presignPutUrl,
  readS3Config,
} from "./s3-presign";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  list(options: { limit?: number } = {}) {
    const tenantId = requireTenantId();
    return this.prisma.mediaAsset.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: Math.min(options.limit ?? 100, 500),
    });
  }

  /** Whether the admin can offer file uploads at all, and why not when it cannot. */
  storageStatus() {
    const config = readS3Config();
    return {
      configured: config !== null,
      bucket: config?.bucket ?? null,
      publicBaseUrl: config?.publicBaseUrl ?? null,
      maxBytes: MAX_UPLOAD_BYTES,
      allowedTypes: [...ALLOWED_UPLOAD_MIME],
      reason: config
        ? null
        : "Object storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_URL to enable uploads.",
    };
  }

  /**
   * Hands the browser a short-lived presigned PUT so file bytes go straight to object storage.
   * The MediaAsset row is written now so an abandoned upload is visible and can be cleaned up.
   */
  createUploadUrl(input: { filename: string; mimeType: string; sizeBytes?: number; alt?: string }) {
    const tenantId = requireTenantId();
    const config = readS3Config();

    if (!config) {
      throw new BadRequestException(this.storageStatus().reason!);
    }
    if (!ALLOWED_UPLOAD_MIME.has(input.mimeType)) {
      throw new BadRequestException(`Unsupported file type: ${input.mimeType}`);
    }
    if (input.sizeBytes && input.sizeBytes > MAX_UPLOAD_BYTES) {
      throw new BadRequestException(
        `Files must be under ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB`,
      );
    }

    const key = `tenants/${tenantId}/${randomUUID()}.${extensionFor(input.mimeType, input.filename)}`;
    const uploadUrl = presignPutUrl(config, key, { contentType: input.mimeType });
    const url = `${config.publicBaseUrl}/${key}`;

    return this.prisma.mediaAsset
      .create({
        data: {
          tenantId,
          url,
          key,
          mimeType: input.mimeType,
          alt: input.alt ?? input.filename,
        },
      })
      .then((asset) => ({
        assetId: asset.id,
        uploadUrl,
        url,
        key,
        method: "PUT" as const,
        headers: { "Content-Type": input.mimeType },
      }));
  }

  /**
   * Records an image the tenant already hosts somewhere else. This is the path that keeps the
   * product editor usable before object storage is wired up.
   */
  async registerExternal(input: { url: string; alt?: string; mimeType?: string }) {
    const tenantId = requireTenantId();

    let parsed: URL;
    try {
      parsed = new URL(input.url);
    } catch {
      throw new BadRequestException("Enter a full image URL, including https://");
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new BadRequestException("Image URLs must be http or https");
    }

    return this.prisma.mediaAsset.create({
      data: {
        tenantId,
        url: parsed.toString(),
        key: `external/${parsed.host}${parsed.pathname}`,
        mimeType: input.mimeType,
        alt: input.alt,
      },
    });
  }

  async update(id: string, data: { alt?: string }) {
    const tenantId = requireTenantId();
    const asset = await this.prisma.mediaAsset.findFirst({ where: { id, tenantId } });
    if (!asset) throw new NotFoundException("Media asset not found");
    return this.prisma.mediaAsset.update({ where: { id }, data });
  }

  async remove(id: string) {
    const tenantId = requireTenantId();
    const asset = await this.prisma.mediaAsset.findFirst({ where: { id, tenantId } });
    if (!asset) throw new NotFoundException("Media asset not found");

    const inUse = await this.prisma.productImage.count({ where: { url: asset.url } });
    if (inUse > 0) {
      throw new BadRequestException(
        `This image is used by ${inUse} product image(s). Remove it there first.`,
      );
    }

    await this.prisma.mediaAsset.delete({ where: { id } });
    return { ok: true };
  }
}
