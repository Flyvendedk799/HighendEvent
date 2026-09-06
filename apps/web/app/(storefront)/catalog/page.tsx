import { CatalogClient } from "./catalog-client";
import { api } from "@/lib/api";
import { headers } from "next/headers";
import { mapApiProductToCard, type ApiProduct } from "@/lib/catalog-map";

export default async function CatalogPage() {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "demo";

  let products = [] as ReturnType<typeof mapApiProductToCard>[];
  try {
    const rows = await api.get<ApiProduct[]>("/catalog/products", {
      tenantSlug,
      cache: "no-store",
    });
    products = rows.map((row, index) => mapApiProductToCard(row, index));
  } catch {
    products = [];
  }

  return <CatalogClient products={products} />;
}
