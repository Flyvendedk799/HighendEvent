import Link from "next/link";
import { Button, EmptyState, cx } from "@rentora/ui";
import { ProductCard } from "@/components/product-card";
import { serverGet } from "@/lib/server-api";
import { getBootstrap } from "@/lib/tenant";
import { getLocale, getT } from "@/lib/locale";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t.nav.catalog };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const [bootstrap, t, locale] = await Promise.all([getBootstrap(), getT(), getLocale()]);

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (category) query.set("categorySlug", category);

  const products = await serverGet<Product[]>(
    `/catalog/products${query.toString() ? `?${query}` : ""}`,
    { anonymous: true, cache: "no-store" },
  ).catch(() => [] as Product[]);

  const currency = bootstrap?.store.currency ?? "USD";
  const categories = bootstrap?.categories ?? [];
  const activeCategory = categories.find((c) => c.slug === category);
  const isFiltered = Boolean(q || category);

  return (
    <div>
      <header className="border-b border-line pb-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
          {t.nav.catalog} — {products.length}{" "}
          {products.length === 1 ? t.catalog.itemAvailable : t.catalog.itemsAvailable}
        </p>
        <h1 className="mt-4 text-[clamp(34px,5.6vw,64px)] font-semibold leading-[0.94] tracking-[-0.04em]">
          {activeCategory ? activeCategory.name : t.catalog.title}
        </h1>
        <p className="mt-4 max-w-[52ch] text-[15.5px] leading-relaxed text-paper-dim">
          {t.catalog.subtitle}
        </p>

        {/* One search bar, one button, on one hairline row — the same bar the console uses. */}
        <form method="GET" className="mt-8 flex flex-wrap gap-px border border-line bg-line">
          <label className="flex flex-[2_1_240px] flex-col gap-1.5 bg-ink-raised px-4 py-3">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper-mute">
              {t.common.search}
            </span>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t.catalog.searchPlaceholder}
              aria-label={t.catalog.searchPlaceholder}
              className="w-full border-0 bg-transparent p-0 text-[14px] text-paper outline-none placeholder:text-paper-ghost"
            />
          </label>
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <button
            type="submit"
            className="flex-1 bg-signal px-7 py-4 font-mono text-[11.5px] font-semibold uppercase tracking-[0.14em] text-signal-ink transition-colors duration-instant hover:bg-signal-press"
          >
            {t.common.search}
          </button>
        </form>

        {categories.length > 0 ? (
          <nav className="mt-5 flex flex-wrap gap-2">
            <CategoryChip href={buildHref({ q })} active={!category}>
              {t.catalog.all}
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
      </header>

      <div className="flex flex-wrap items-baseline justify-between gap-4 py-5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-paper-mute">
        <span>
          {products.length} {products.length === 1 ? t.catalog.itemAvailable : t.catalog.itemsAvailable}
          {q ? ` · “${q}”` : ""}
        </span>
        {activeCategory ? <span>{activeCategory.name}</span> : null}
      </div>

      {products.length === 0 ? (
        <EmptyState
          title={isFiltered ? t.catalog.noMatchTitle : t.catalog.emptyTitle}
          description={isFiltered ? t.catalog.noMatchBody : t.catalog.emptyBody}
          action={
            isFiltered ? (
              <Button variant="secondary" asChild>
                <Link href="/catalog">{t.catalog.browseEverything}</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-px border border-line bg-line [grid-template-columns:repeat(auto-fill,minmax(268px,1fr))]">
          {products.map((product) => (
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
      aria-current={active ? "page" : undefined}
      className={cx(
        "border px-3.5 py-2 font-mono text-[10.5px] uppercase tracking-[0.13em] transition-colors duration-instant",
        active
          ? "border-signal bg-signal text-signal-ink"
          : "border-line-strong text-paper-dim hover:border-signal hover:text-signal",
      )}
    >
      {children}
    </Link>
  );
}
