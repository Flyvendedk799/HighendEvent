import Link from "next/link";
import { Button } from "@rentora/ui";
import { ProductCard } from "@/components/product-card";
import { demoProducts } from "@/lib/demo-data";
import { getDictionary } from "@/lib/i18n";
import { getTenantSlug } from "@/lib/tenant";

export default async function StorefrontHomePage() {
  const t = getDictionary("en");
  const slug = await getTenantSlug();

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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {demoProducts.slice(0, 3).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-8">
        <h2 className="font-display text-2xl font-semibold">{t.storefront.howItWorks}</h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            t.storefront.pickDates,
            t.storefront.delivery,
            t.storefront.enjoy,
          ].map((step, index) => (
            <li key={step} className="animate-fade-up" style={{ animationDelay: `${index * 120}ms` }}>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-800">
                {index + 1}
              </span>
              <p className="mt-3 font-medium text-foreground">{step}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
