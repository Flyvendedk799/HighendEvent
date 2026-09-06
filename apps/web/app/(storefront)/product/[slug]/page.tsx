import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ProductDetailClient } from "./product-detail-client";
import { api } from "@/lib/api";
import { mapApiProductToDetail, type ApiProduct } from "@/lib/catalog-map";
import type { StoreOccupancy } from "@/lib/product-model";

type ApiProductDetail = ApiProduct & {
  blackouts?: Array<{
    id: string;
    startDate: string;
    endDate: string;
    reason?: string | null;
  }>;
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "demo";

  let apiProduct: ApiProductDetail | null = null;
  try {
    apiProduct = await api.get<ApiProductDetail>(`/catalog/products/by-slug/${slug}`, {
      tenantSlug,
      cache: "no-store",
    });
  } catch {
    apiProduct = null;
  }

  if (!apiProduct) notFound();

  const product = mapApiProductToDetail(apiProduct);
  const blackouts = (apiProduct.blackouts ?? []).map((b) => ({
    productId: apiProduct!.id,
    startDate: String(b.startDate).slice(0, 10),
    endDate: String(b.endDate).slice(0, 10),
    reason: b.reason ?? undefined,
  }));

  let occupancy: StoreOccupancy[] = [];
  try {
    occupancy = await api.get<StoreOccupancy[]>(
      `/availability/occupancy?productId=${encodeURIComponent(apiProduct.id)}`,
      { tenantSlug, cache: "no-store" },
    );
  } catch {
    occupancy = [];
  }

  return (
    <ProductDetailClient product={product} blackouts={blackouts} occupancy={occupancy} />
  );
}
