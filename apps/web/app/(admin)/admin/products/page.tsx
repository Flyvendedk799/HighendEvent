import Link from "next/link";
import { headers } from "next/headers";
import { Badge, Button, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";

type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  dailyPriceMinor: number;
  currency: string;
  stockQty: number;
  isActive: boolean;
  category?: { name: string } | null;
};

function formatPrice(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

async function loadProducts(): Promise<CatalogProduct[]> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "demo";
  try {
    return await api.get<CatalogProduct[]>("/catalog/products", {
      tenantSlug,
      cache: "no-store",
    });
  } catch {
    return [];
  }
}

export default async function AdminProductsPage() {
  const products = await loadProducts();

  return (
    <main>
      <PageHeader
        title="Products"
        description="Live inventory from the Rentora API — no demo fixtures."
        action={
          <Link href="/admin/products/new">
            <Button>Add product</Button>
          </Link>
        }
      />
      {products.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No products returned from the API. Confirm the API is running and tenant slug resolves.
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/product/${p.slug}`} className="hover:text-primary">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{p.category?.name ?? "—"}</td>
                  <td className="px-4 py-3">{formatPrice(p.dailyPriceMinor, p.currency)}</td>
                  <td className="px-4 py-3">{p.stockQty}</td>
                  <td className="px-4 py-3">
                    <Badge tone={p.isActive ? (p.stockQty > 3 ? "success" : "warning") : "neutral"}>
                      {!p.isActive ? "Inactive" : p.stockQty > 3 ? "In stock" : "Low"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  );
}
