import Link from "next/link";
import { EmptyState, LiveDot } from "@rentora/ui";
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
      {/* The shop's own claim, on the blueprint ground rather than a photograph nobody supplied. */}
      <section className="relative overflow-hidden border border-line-raised px-6 py-16 sm:px-12 sm:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-blueprint bg-[length:64px_64px]"
        />
        <div className="relative">
          <p className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
            <LiveDot />
            {bootstrap?.store.name}
          </p>
          <h1 className="mt-6 max-w-[20ch] text-balance text-[clamp(34px,5.6vw,64px)] font-semibold leading-[0.94] tracking-[-0.04em]">
            {bootstrap?.store.tagline ?? t.home.heroFallback}
          </h1>
          <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-paper-dim">
            {t.home.heroBody}
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            <Link
              href="/catalog"
              className="bg-signal px-6 py-4 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-signal-ink transition-colors duration-instant hover:bg-signal-press"
            >
              {t.home.browseCatalog} →
            </Link>
            {bootstrap?.store.supportPhone ? (
              <a
                href={`tel:${bootstrap.store.supportPhone.replace(/\s/g, "")}`}
                className="border border-line-strong px-6 py-4 font-mono text-[12px] uppercase tracking-[0.14em] text-paper transition-colors duration-instant hover:border-signal hover:text-signal"
              >
                {bootstrap.store.supportPhone}
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {categories.length > 0 ? (
        <section>
          <h2 className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-paper-mute">
            {t.home.browseByType}
          </h2>
          <div className="mt-4 grid gap-px border border-line bg-line [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/catalog?category=${category.slug}`}
                className="group bg-ink-raised p-6 transition-colors duration-instant hover:bg-ink-hover"
              >
                <p className="text-[19px] font-semibold tracking-[-0.02em] transition-colors duration-instant group-hover:text-signal">
                  {category.name}
                </p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-paper-faint">
                  {t.home.seeWhatIsAvailable} →
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-paper-mute">
            {t.home.popular}
          </h2>
          <Link
            href="/catalog"
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-signal transition-colors duration-instant hover:text-paper"
          >
            {t.home.viewAll} →
          </Link>
        </div>

        {featured.length === 0 ? (
          <div className="mt-4 border border-line bg-ink-raised p-8">
            <EmptyState title={t.catalog.emptyTitle} description={t.catalog.emptyBody} />
          </div>
        ) : (
          <div className="mt-4 grid gap-px border border-line bg-line [grid-template-columns:repeat(auto-fill,minmax(268px,1fr))]">
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
        <h2 className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-paper-mute">
          {t.home.howItWorks}
        </h2>
        <ol className="mt-4 grid gap-px border border-line bg-line [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {steps.map((step, i) => (
            <li key={step.title} className="bg-ink-raised p-6">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-signal">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3.5 text-[17px] font-semibold tracking-[-0.02em]">{step.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-paper-mute">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
