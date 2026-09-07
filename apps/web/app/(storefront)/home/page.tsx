import Link from "next/link";
import { Button, EmptyState } from "@rentora/ui";
import { ProductCard } from "@/components/product-card";
import { serverGet } from "@/lib/server-api";
import { getBootstrap } from "@/lib/tenant";
import { getLocale, getT } from "@/lib/locale";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StorefrontHomePage() {
  const [bootstrap, t, locale] = await Promise.all([getBootstrap(), getT(), getLocale()]);

  const products = await serverGet<Product[]>("/catalog/products", {
    anonymous: true,
    next: { revalidate: 60 },
  }).catch(() => [] as Product[]);

  const currency = bootstrap?.store.currency ?? "USD";
  const featured = products.slice(0, 6);
  const categories = bootstrap?.categories ?? [];

  const steps = [
    { title: t.home.step1Title, body: t.home.step1Body },
    {
      title: t.home.step2Title,
      body: bootstrap?.features.deliveryEnabled ? t.home.step2Delivery : t.home.step2Pickup,
    },
    { title: t.home.step3Title, body: t.home.step3Body },
  ];

  return (
    <div className="space-y-16">
      <section className="rounded-3xl bg-[var(--color-foreground)] px-6 py-14 text-white sm:px-12 sm:py-20">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
          {bootstrap?.store.name}
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
          {bootstrap?.store.tagline ?? t.home.heroFallback}
        </h1>
        <p className="mt-4 max-w-xl text-white/70">{t.home.heroBody}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/catalog">{t.home.browseCatalog}</Link>
          </Button>
          {bootstrap?.store.supportPhone ? (
            <Button size="lg" variant="secondary" asChild>
              <a href={`tel:${bootstrap.store.supportPhone.replace(/\s/g, "")}`}>
                {bootstrap.store.supportPhone}
              </a>
            </Button>
          ) : null}
        </div>
      </section>

      {categories.length > 0 ? (
        <section>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {t.home.browseByType}
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/catalog?category=${category.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition hover:border-[var(--color-primary)]"
              >
                <p className="font-display text-lg font-semibold group-hover:text-[var(--color-primary)]">
                  {category.name}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {t.home.seeWhatIsAvailable} →
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold tracking-tight">{t.home.popular}</h2>
          <Link
            href="/catalog"
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            {t.home.viewAll}
          </Link>
        </div>

        {featured.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
            <EmptyState title={t.catalog.emptyTitle} description={t.catalog.emptyBody} />
          </div>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={currency}
                locale={locale}
                fromLabel={t.common.from}
                perDayLabel={t.common.perDay}
                checkDatesLabel={t.catalog.checkDates}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold tracking-tight">{t.home.howItWorks}</h2>
        <ol className="mt-5 grid gap-5 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
