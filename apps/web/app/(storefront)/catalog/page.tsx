import Link from "next/link";
import { Button, EmptyState, cx } from "@rentora/ui";
import { ProductCard } from "@/components/product-card";
import { serverGet } from "@/lib/server-api";
import { getBootstrap } from "@/lib/tenant";
import type { Product } from "@/lib/types";

export const metadata = { title: "Catalog" };
export const dynamic = "force-dynamic";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const bootstrap = await getBootstrap();

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (category) query.set("categorySlug", category);

  const products = await serverGet<Product[]>(
    `/catalog/products${query.toString() ? `?${query}` : ""}`,
    { anonymous: true, cache: "no-store" },
  ).catch(() => [] as Product[]);

  const currency = bootstrap?.store.currency ?? "USD";
  const locale = bootstrap?.store.localeDefault ?? "en";
  const categories = bootstrap?.categories ?? [];
  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {activeCategory ? activeCategory.name : "Everything we rent"}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {products.length} item{products.length === 1 ? "" : "s"} available
          {q ? ` matching “${q}”` : ""}
        </p>
      </header>

      <form method="GET" className="mb-6 flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search the catalog"
          aria-label="Search the catalog"
          className="h-10 min-w-[200px] flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
        />
        {category ? <input type="hidden" name="category" value={category} /> : null}
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {categories.length > 0 ? (
        <nav className="mb-8 flex flex-wrap gap-2">
          <CategoryChip href={buildHref({ q })} active={!category}>
            All
          </CategoryChip>
          {categories.map((c) => (
            <CategoryChip
              key={c.id}
              href={buildHref({ q, category: c.slug })}
              active={category === c.slug}
            >
              {c.name}
            </CategoryChip>
          ))}
        </nav>
      ) : null}

      {products.length === 0 ? (
        <EmptyState
          title={q || category ? "Nothing matches that" : "Nothing listed yet"}
          description={
            q || category
              ? "Try a different search, or browse everything."
              : "This store has not published any items yet."
          }
          action={
            q || category ? (
              <Button variant="secondary" asChild>
                <Link href="/catalog">Browse everything</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              currency={currency}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function buildHref(params: { q?: string; category?: string }): string {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.category) query.set("category", params.category);
  return `/catalog${query.toString() ? `?${query}` : ""}`;
}

function CategoryChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "rounded-full border px-3.5 py-1.5 text-sm transition",
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]",
      )}
    >
      {children}
    </Link>
  );
}
