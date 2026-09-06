"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { PageHeader } from "@/components/page-header";
import { Input } from "@rentora/ui";
import { demoProducts } from "@/lib/demo-data";

export function CatalogClient() {
  const categories = useMemo(
    () => [...new Set(demoProducts.map((p) => p.category))],
    [],
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const filtered = demoProducts.filter((product) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      product.name.toLowerCase().includes(q) ||
      product.description.toLowerCase().includes(q) ||
      product.category.toLowerCase().includes(q);
    const matchesCategory = !category || product.category === category;
    return matchesQuery && matchesCategory;
  });

  return (
    <main>
      <PageHeader
        title="Catalog"
        description="Filter by category and reserve gear for your event dates."
      />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            name="q"
            label="Search"
            placeholder="Search products…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={[
              "rounded-lg border px-3 py-2 text-sm transition",
              !category
                ? "border-teal-700 bg-teal-50 font-medium text-teal-900"
                : "border-border bg-surface text-muted-foreground hover:border-teal-600 hover:text-teal-800",
            ].join(" ")}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat === category ? null : cat)}
              className={[
                "rounded-lg border px-3 py-2 text-sm transition",
                category === cat
                  ? "border-teal-700 bg-teal-50 font-medium text-teal-900"
                  : "border-border bg-surface text-muted-foreground hover:border-teal-600 hover:text-teal-800",
              ].join(" ")}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface/70 px-6 py-12 text-center text-muted-foreground">
          No products match that filter.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
