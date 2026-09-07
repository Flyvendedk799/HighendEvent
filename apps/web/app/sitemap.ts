import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { serverGet } from "@/lib/server-api";
import { getBootstrap } from "@/lib/tenant";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Per-tenant sitemap. Each storefront host gets its own, listing only that tenant's live
 * catalog and published pages — the API is tenant-scoped, so there is nothing to filter here.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const bootstrap = await getBootstrap();
  if (!bootstrap) return [];

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = `${proto}://${host}`;

  const products = await serverGet<Product[]>("/catalog/products", {
    anonymous: true,
    next: { revalidate: 3600 },
  }).catch(() => [] as Product[]);

  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/catalog`, changeFrequency: "daily", priority: 0.9 },
    ...bootstrap.categories.map((category) => ({
      url: `${base}/catalog?category=${category.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: `${base}/product/${product.slug}`,
      lastModified: new Date(product.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...bootstrap.pages.map((page) => ({
      url: `${base}/pages/${page.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];
}
