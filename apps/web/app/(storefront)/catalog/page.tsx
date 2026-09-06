import { ProductCard } from "@/components/product-card";
import { PageHeader } from "@/components/page-header";
import { Input } from "@rentora/ui";
import { demoProducts } from "@/lib/demo-data";

export default function CatalogPage() {
  const categories = [...new Set(demoProducts.map((p) => p.category))];

  return (
    <main>
      <PageHeader
        title="Catalog"
        description="Filter by category and reserve gear for your event dates."
      />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input name="q" label="Search" placeholder="Search products…" />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted-foreground hover:border-teal-600 hover:text-teal-800"
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {demoProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </main>
  );
}
