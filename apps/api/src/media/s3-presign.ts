import { createHash, createHmac } from "node:crypto";

export type S3Config = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
};

/**
 * Reads S3-compatible object storage config from the environment.
 *
 * Cloudflare R2 is the reference target (R2_* vars); any S3-compatible endpoint works via
 * S3_ENDPOINT. Returns null when storage is not configured, which callers must surface honestly
 * rather than pretending an upload succeeded.
 */
export function readS3Config(): S3Config | null {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET ?? process.env.S3_BUCKET;
  const accountId = process.env.R2_ACCOUNT_ID;

  const endpoint =
    process.env.S3_ENDPOINT ??
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  const publicBaseUrl = process.env.R2_PUBLIC_URL ?? process.env.S3_PUBLIC_URL;

  if (!accessKeyId || !secretAccessKey || !bucket || !endpoint || !publicBaseUrl) {
    return null;
  }

  return {
    endpoint: endpoint.replace(/\/$/, ""),
    region: process.env.S3_REGION ?? "auto",
    bucket,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: publicBaseUrl.replace(/\/$/, ""),
  };
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function encodeKey(key: string): string {
  return key.split("/").map(encodeRfc3986).join("/");
}

/**
 * Builds a presigned PUT URL (SigV4, query-string auth) so the browser uploads straight to
 * object storage and file bytes never pass through the API.
 */
export function presignPutUrl(
  config: S3Config,
  key: string,
  options: { expiresInSeconds?: number; contentType?: string } = {},
): string {
  const expiresIn = Math.min(options.expiresInSeconds ?? 900, 604_800);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);

  const host = new URL(config.endpoint).host;
  const canonicalUri = `/${config.bucket}/${encodeKey(key)}`;
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;

  const queryParams: Array<[string, string]> = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${config.accessKeyId}/${credentialScope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(expiresIn)],
    ["X-Amz-SignedHeaders", "host"],
  ];

  const canonicalQueryString = queryParams
    .map(([k, v]) => [encodeRfc3986(k), encodeRfc3986(v)] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${config.secretAccessKey}`, dateStamp), config.region), "s3"),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  return `${config.endpoint}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
};

export const ALLOWED_UPLOAD_MIME = new Set(Object.keys(EXTENSION_BY_MIME));

export function extensionFor(mimeType: string, filename: string): string {
  const known = EXTENSION_BY_MIME[mimeType];
  if (known) return known;
  const fromName = filename.split(".").pop();
  return fromName && /^[a-z0-9]{1,5}$/i.test(fromName) ? fromName.toLowerCase() : "bin";
}
