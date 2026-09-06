import { StorefrontHeader } from "@/components/storefront-header";
import { getTenantSlug } from "@/lib/tenant";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const slug = await getTenantSlug();
  const storeName = slug
    ? `${slug.charAt(0).toUpperCase()}${slug.slice(1)} Rentals`
    : "Demo Rentals";

  return (
    <div className="min-h-screen bg-mesh-light">
      <StorefrontHeader storeName={storeName} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
