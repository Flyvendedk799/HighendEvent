import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ProductDetailClient } from "./product-detail-client";
import { api } from "@/lib/api";
import { mapApiProductToCard, type ApiProduct } from "@/lib/catalog-map";

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

  const product = mapApiProductToCard(apiProduct);
  const blackouts = (apiProduct.blackouts ?? []).map((b) => ({
    productId: apiProduct!.id,
    startDate: String(b.startDate).slice(0, 10),
    endDate: String(b.endDate).slice(0, 10),
    reason: b.reason ?? undefined,
  }));

  return (
    <ProductDetailClient
      product={product}
      blackouts={blackouts}
      occupancy={[]}
    />
  );
}
