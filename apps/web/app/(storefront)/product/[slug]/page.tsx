import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge, Banner, Money } from "@rentora/ui";
import { ProductBooking } from "@/components/storefront/product-booking";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { serverGet } from "@/lib/server-api";
import { isApiError } from "@/lib/api";
import { getBootstrap } from "@/lib/tenant";
import { getLocale, getT } from "@/lib/locale";
import type { AvailabilityCalendar, Product } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadProduct(slug: string): Promise<Product | null> {
  try {
    return await serverGet<Product>(`/catalog/products/by-slug/${encodeURIComponent(slug)}`, {
      anonymous: true,
      next: { revalidate: 30 },
    });
  } catch (err) {
    if (isApiError(err) && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return { title: "Not found" };

  return {
    title: product.name,
    description: product.description ?? undefined,
    openGraph: {
      title: product.name,
      description: product.description ?? undefined,
      images: product.heroImageUrl ? [{ url: product.heroImageUrl }] : undefined,
    },
  };
}

function windowFromToday(months: number) {
  const now = new Date();
  const startDate = now.toISOString().slice(0, 10);
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + months + 1, 0));
  return { startDate, endDate: end.toISOString().slice(0, 10) };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [product, bootstrap, t, locale] = await Promise.all([
    loadProduct(slug),
    getBootstrap(),
    getT(),
    getLocale(),
  ]);
  if (!product || !product.isActive) notFound();

  const { startDate, endDate } = windowFromToday(2);

  const calendar = await serverGet<AvailabilityCalendar>(
    `/availability/calendar?productId=${product.id}&startDate=${startDate}&endDate=${endDate}`,
    { anonymous: true, cache: "no-store" },
  ).catch(() => null);

  const currency = product.currency ?? bootstrap?.store.currency ?? "USD";
  const specs = Object.entries(product.attributes ?? {}).filter(
    ([, value]) => typeof value === "string" || typeof value === "number",
  );

  const soldOut = (calendar?.days ?? []).every((day) => !day.isAvailable);

  return (
    <article className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0">
        <nav className="mb-3 text-xs text-[var(--color-muted-foreground)]">
          <Link href="/catalog" className="hover:underline">
            {t.nav.catalog}
          </Link>
          {product.category ? (
            <>
              {" / "}
              <Link
                href={`/catalog?category=${product.category.slug}`}
                className="hover:underline"
              >
                {product.category.name}
              </Link>
            </>
          ) : null}
        </nav>

        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {product.name}
        </h1>

        <p className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-[var(--color-muted-foreground)]">{t.common.from}</span>
          <span className="text-lg font-semibold">
            <Money amountMinor={product.dailyPriceMinor} currency={currency} locale={locale} />
          </span>
          <span className="text-[var(--color-muted-foreground)]">{t.common.perDay}</span>
          {product.weekendPackageMinor ? (
            <Badge tone="accent">
              Fri–Sun package{" "}
              <Money
                amountMinor={product.weekendPackageMinor}
                currency={currency}
                locale={locale}
              />
            </Badge>
          ) : null}
        </p>

        <div className="mt-6">
          <ProductGallery images={product.images ?? []} name={product.name} />
        </div>

        {product.description ? (
          <div className="mt-8 max-w-2xl">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {t.product.about}
            </h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed">{product.description}</p>
          </div>
        ) : null}

        {specs.length > 0 ? (
          <div className="mt-8 max-w-2xl">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {t.product.specifications}
            </h2>
            <dl className="mt-3 divide-y divide-[var(--color-border)] text-sm">
              {specs.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 py-2">
                  <dt className="capitalize text-[var(--color-muted-foreground)]">
                    {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                  </dt>
                  <dd className="font-medium">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {product.prepBufferDays || product.cleanupBufferDays ? (
          <p className="mt-8 max-w-2xl text-xs text-[var(--color-muted-foreground)]">
            We reserve {product.prepBufferDays} day(s) before and {product.cleanupBufferDays}{" "}
            day(s) after each booking to prepare and clean this item, so those days show as
            unavailable in the calendar.
          </p>
        ) : null}
      </div>

      {/* On mobile the panel sits below the detail; on desktop it stays alongside it. */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        {soldOut ? (
          <Banner tone="warning" title={t.product.soldOutTitle} className="mb-4">
            {t.product.soldOutBody}
          </Banner>
        ) : null}
        <ProductBooking
          product={product}
          initialCalendar={calendar}
          deliveryEnabled={bootstrap?.features.deliveryEnabled ?? false}
          currency={currency}
          locale={locale}
          t={t}
        />
      </aside>
    </article>
  );
}
