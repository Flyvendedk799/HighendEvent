import Link from "next/link";
import { Badge, Button, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { demoProducts, formatPrice } from "@/lib/demo-data";

export default function AdminProductsPage() {
  return (
    <main>
      <PageHeader
        title="Products"
        description="Manage rental inventory, pricing, and stock buffers."
        action={<Button>Add product</Button>}
      />
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
            {demoProducts.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/product/${p.slug}`} className="hover:text-primary">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{p.category}</td>
                <td className="px-4 py-3">{formatPrice(p.priceFrom, p.currency)}</td>
                <td className="px-4 py-3">{p.stock}</td>
                <td className="px-4 py-3">
                  <Badge tone={p.stock > 3 ? "success" : "warning"}>
                    {p.stock > 3 ? "In stock" : "Low"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
