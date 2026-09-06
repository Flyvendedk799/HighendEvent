import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PrismaService } from "../prisma/prisma.service";
import { requireTenantId } from "../common/tenant.util";

type UploadMeta = {
  filename: string;
  mimeType?: string;
  alt?: string;
  width?: number;
  height?: number;
};

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

  storageStatus() {
    return {
      configured: this.isR2Configured(),
      provider: this.isR2Configured() ? ("r2" as const) : ("stub" as const),
      publicBase: this.publicBase(),
    };
  }

  /**
   * Presigned PUT flow (Heroplan C4).
   * When R2 is not configured, creates a stub MediaAsset immediately so admin UX still works.
   */
  async presign(input: UploadMeta) {
    const tenantId = requireTenantId();
    const filename = this.sanitizeFilename(input.filename);
    const mimeType = input.mimeType || "application/octet-stream";
    const key = this.buildKey(tenantId, filename);
    const publicUrl = this.publicUrlFor(key);

    if (!this.isR2Configured()) {
      const asset = await this.prisma.mediaAsset.create({
        data: {
          tenantId,
          url: publicUrl,
          key,
          mimeType,
          alt: input.alt,
          width: input.width,
          height: input.height,
        },
      });
      return {
        mode: "stub" as const,
        key,
        publicUrl,
        mimeType,
        uploadUrl: null as string | null,
        expiresIn: 0,
        asset,
      };
    }

    const client = this.createS3Client();
    const bucket = process.env.R2_BUCKET!;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType,
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });

    return {
      mode: "r2" as const,
      key,
      publicUrl,
      mimeType,
      uploadUrl,
      expiresIn: 900,
      asset: null as null,
      alt: input.alt,
      width: input.width,
      height: input.height,
    };
  }

  /**
   * After the browser PUTs to the presigned URL, register the MediaAsset row.
   * Idempotent on key within the tenant.
   */
  async complete(input: {
    key: string;
    mimeType?: string;
    alt?: string;
    width?: number;
    height?: number;
  }) {
    const tenantId = requireTenantId();
    if (!input.key.startsWith(`tenants/${tenantId}/`)) {
      throw new BadRequestException("Invalid media key for tenant");
    }

    const existing = await this.prisma.mediaAsset.findFirst({
      where: { tenantId, key: input.key },
    });
    if (existing) return existing;

    return this.prisma.mediaAsset.create({
      data: {
        tenantId,
        key: input.key,
        url: this.publicUrlFor(input.key),
        mimeType: input.mimeType,
        alt: input.alt,
        width: input.width,
        height: input.height,
      },
    });
  }

  /**
   * Convenience upload: optional base64 body.
   * - R2 configured + contentBase64 → PutObject then create asset
   * - Otherwise → stub CDN URL asset (dev / no credentials)
   */
  async upload(input: UploadMeta & { contentBase64?: string }) {
    const tenantId = requireTenantId();
    const filename = this.sanitizeFilename(input.filename);
    const mimeType = input.mimeType || "application/octet-stream";
    const key = this.buildKey(tenantId, filename);
    const publicUrl = this.publicUrlFor(key);

    if (input.contentBase64 && this.isR2Configured()) {
      const body = Buffer.from(input.contentBase64, "base64");
      if (body.length === 0) {
        throw new BadRequestException("Empty upload body");
      }
      if (body.length > 12 * 1024 * 1024) {
        throw new BadRequestException("Upload exceeds 12MB limit; use presign flow");
      }
      try {
        const client = this.createS3Client();
        await client.send(
          new PutObjectCommand({
            Bucket: process.env.R2_BUCKET!,
            Key: key,
            Body: body,
            ContentType: mimeType,
          }),
        );
      } catch (err) {
        throw new ServiceUnavailableException(
          err instanceof Error ? `R2 upload failed: ${err.message}` : "R2 upload failed",
        );
      }
    }

    return this.prisma.mediaAsset.create({
      data: {
        tenantId,
        url: publicUrl,
        key,
        mimeType,
        alt: input.alt,
        width: input.width,
        height: input.height,
      },
    });
  }

  /** @deprecated alias kept for older callers */
  uploadStub(input: UploadMeta) {
    return this.upload(input);
  }

  isR2Configured(): boolean {
    return Boolean(
      process.env.R2_ACCOUNT_ID &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET &&
        process.env.R2_PUBLIC_URL,
    );
  }

  private createS3Client() {
    const accountId = process.env.R2_ACCOUNT_ID!;
    return new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });
  }

  private publicBase() {
    return (process.env.R2_PUBLIC_URL ?? "https://cdn.rentora.app").replace(/\/$/, "");
  }

  private publicUrlFor(key: string) {
    return `${this.publicBase()}/${key}`;
  }

  private buildKey(tenantId: string, filename: string) {
    return `tenants/${tenantId}/${randomUUID()}-${filename}`;
  }

  private sanitizeFilename(filename: string) {
    const base = filename.trim().replace(/[/\\]/g, "").replace(/\s+/g, "-");
    if (!base) throw new BadRequestException("filename required");
    return base.slice(0, 180);
  }
}
