import Link from "next/link";
import { Button } from "@rentora/ui";
import { ProductCard, type ProductCardModel } from "@/components/product-card";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { api } from "@/lib/api";
import { getTenantSlug } from "@/lib/tenant";

type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  dailyPriceMinor: number;
  currency: string;
  stockQty: number;
  heroImageUrl?: string | null;
  category?: { name?: string | null } | null;
  images?: Array<{ url: string }>;
};

export default async function StorefrontHomePage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const slug = await getTenantSlug();

  let products: ProductCardModel[] = [];
  try {
    const rows = await api.get<CatalogProduct[]>("/catalog/products", {
      tenantSlug: slug,
      cache: "no-store",
    });
    products = rows.slice(0, 3).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description ?? "",
      dailyPriceMinor: p.dailyPriceMinor,
      currency: p.currency,
      stockQty: p.stockQty,
      category: p.category?.name ?? "Rental",
      imageUrl: p.heroImageUrl ?? p.images?.[0]?.url ?? null,
    }));
  } catch {
    products = [];
  }

  return (
    <main className="space-y-16">
      <section className="relative overflow-hidden rounded-3xl bg-hero-glow px-6 py-16 text-white sm:px-10">
        <div className="absolute -right-10 top-8 h-40 w-40 animate-float rounded-full bg-amber-300/20 blur-2xl" />
        <div className="relative max-w-xl animate-fade-up">
          <p className="font-display text-4xl font-semibold sm:text-5xl">
            {slug ? `${slug}` : "Your"} event gear, ready to rent
          </p>
          <p className="mt-4 text-teal-50/80">
            Browse availability, reserve dates, and check out online — delivery or pickup.
          </p>
          <Link href="/catalog" className="mt-8 inline-block">
            <Button size="lg" className="bg-amber-400 text-slate-950 hover:bg-amber-300">
              {t.storefront.heroCta}
            </Button>
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-semibold">{t.storefront.featured}</h2>
          <Link href="/catalog" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {products.length === 0 ? (
          <p className="text-muted-foreground">No products published yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-surface p-8">
        <h2 className="font-display text-2xl font-semibold">{t.storefront.howItWorks}</h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {[t.storefront.pickDates, t.storefront.delivery, t.storefront.enjoy].map(
            (step, index) => (
              <li
                key={step}
                className="animate-fade-up"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-800">
                  {index + 1}
                </span>
                <p className="mt-3 font-medium text-foreground">{step}</p>
              </li>
            ),
          )}
        </ol>
      </section>
    </main>
  );
}
