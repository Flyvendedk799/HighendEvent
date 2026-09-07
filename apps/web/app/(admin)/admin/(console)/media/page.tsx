import { Page, PageHeader } from "@rentora/ui";
import { MediaLibrary } from "@/components/admin/media-library";
import { getStorageStatus, type MediaAsset, type StorageStatus } from "@/lib/actions/media";
import { serverGet } from "@/lib/server-api";

export const metadata = { title: "Media" };
export const dynamic = "force-dynamic";

const FALLBACK_STORAGE: StorageStatus = {
  configured: false,
  bucket: null,
  publicBaseUrl: null,
  maxBytes: 15 * 1024 * 1024,
  allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  reason: "Object storage status could not be read.",
};

export default async function AdminMediaPage() {
  const [assets, storage] = await Promise.all([
    serverGet<MediaAsset[]>("/media", { cache: "no-store" }).catch(() => [] as MediaAsset[]),
    getStorageStatus().catch(() => FALLBACK_STORAGE),
  ]);

  return (
    <Page>
      <PageHeader
        title="Media"
        description="Photos used across your products and pages."
      />
      <MediaLibrary assets={assets} storage={storage} />
    </Page>
  );
}
