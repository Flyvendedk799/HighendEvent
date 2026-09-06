import { clientApi } from "@/lib/client-api";

export type MediaAsset = {
  id: string;
  url: string;
  key: string;
  mimeType: string | null;
  alt: string | null;
  createdAt: string;
};

type PresignResponse = {
  mode: "r2" | "stub";
  key: string;
  publicUrl: string;
  mimeType: string;
  uploadUrl: string | null;
  expiresIn: number;
  asset: MediaAsset | null;
  alt?: string;
  width?: number;
  height?: number;
};

/**
 * Upload a browser File via /media/presign → optional PUT → /media/complete.
 * Falls back to stub registration when R2 credentials are not configured.
 */
export async function uploadMediaFile(
  file: File,
  opts?: { alt?: string },
): Promise<{ asset: MediaAsset; mode: "r2" | "stub"; publicUrl: string }> {
  const presign = await clientApi<PresignResponse>("/media/presign", {
    method: "POST",
    body: JSON.stringify({
      filename: file.name || "upload.bin",
      mimeType: file.type || "application/octet-stream",
      alt: opts?.alt,
    }),
  });

  if (presign.mode === "stub") {
    if (!presign.asset) {
      throw new Error("Stub upload did not return a media asset");
    }
    return { asset: presign.asset, mode: "stub", publicUrl: presign.publicUrl };
  }

  if (!presign.uploadUrl) {
    throw new Error("Presign response missing uploadUrl");
  }

  const put = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  if (!put.ok) {
    throw new Error(`Object storage PUT failed (${put.status})`);
  }

  const asset = await clientApi<MediaAsset>("/media/complete", {
    method: "POST",
    body: JSON.stringify({
      key: presign.key,
      mimeType: presign.mimeType,
      alt: opts?.alt ?? presign.alt,
    }),
  });

  return { asset, mode: "r2", publicUrl: asset.url };
}
