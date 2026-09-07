import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Nothing behind a login, and no crawling of a shopper's own basket.
      disallow: ["/admin", "/platform", "/account", "/cart", "/checkout", "/confirmation", "/api/"],
    },
    sitemap: `${proto}://${host}/sitemap.xml`,
  };
}
