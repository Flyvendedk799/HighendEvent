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

  /* Only string and number attributes make a spec row; a nested object has no honest rendering. */
  const specs = Object.entries(product.attributes ?? {}).filter(
    ([, value]) => typeof value === "string" || typeof value === "number",
  );

  const soldOut = (calendar?.days ?? []).every((day) => !day.isAvailable);

  return (
    <article>
      <nav
        aria-label="Breadcrumb"
        className="mb-5 flex flex-wrap items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-paper-faint"
      >
        <Link href="/catalog" className="transition-colors duration-instant hover:text-signal">
          {t.nav.catalog}
        </Link>
        {product.category ? (
          <>
            <span aria-hidden="true" className="text-paper-ghost">
              /
            </span>
            <Link
              href={`/catalog?category=${product.category.slug}`}
              className="transition-colors duration-instant hover:text-signal"
            >
              {product.category.name}
            </Link>
          </>
        ) : null}
        <span aria-hidden="true" className="text-paper-ghost">
          /
        </span>
        <span className="text-paper-dim">{product.slug}</span>
      </nav>

      {soldOut ? (
        <Banner tone="warning" title={t.product.soldOutTitle} className="mb-6">
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
        gallery={<ProductGallery images={product.images ?? []} name={product.name} />}
        heading={
          <header className="mt-8">
            <h1 className="text-[clamp(30px,4.4vw,50px)] font-semibold leading-[0.98] tracking-[-0.04em]">
              {product.name}
            </h1>
            <p className="mt-4 flex flex-wrap items-baseline gap-3 text-[13.5px]">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-mute">
                {t.common.from}
              </span>
              <span className="font-mono text-[19px] tabular-nums">
                <Money amountMinor={product.dailyPriceMinor} currency={currency} locale={locale} />
              </span>
              <span className="text-paper-mute">{t.common.perDay}</span>
              {product.weekendPackageMinor ? (
                <Badge tone="accent">
                  Fri–Sun{" "}
                  <Money
                    amountMinor={product.weekendPackageMinor}
                    currency={currency}
                    locale={locale}
                    className="ml-1.5"
                  />
                </Badge>
              ) : null}
            </p>
            {product.description ? (
              <p className="mt-5 max-w-[60ch] whitespace-pre-line text-[16px] leading-relaxed text-paper-dim">
                {product.description}
              </p>
            ) : null}
          </header>
        }
        details={
          <>
            {specs.length > 0 ? (
              <section className="mt-8 border border-line">
                <h2 className="border-b border-line px-4 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-paper-mute">
                  {t.product.specifications}
                </h2>
                <dl>
                  {specs.map(([key, value]) => (
                    <div
                      key={key}
                      className="grid gap-4 border-b border-line-soft bg-ink px-4 py-3 text-[13.5px] last:border-b-0 sm:grid-cols-[minmax(140px,220px)_1fr]"
                    >
                      <dt className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-paper-faint">
                        {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                      </dt>
                      <dd className="text-paper-soft">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {product.prepBufferDays || product.cleanupBufferDays ? (
              <section className="mt-8 border border-line">
                <h2 className="border-b border-line px-4 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-paper-mute">
                  Turnaround
                </h2>
                <div className="grid gap-4 bg-ink px-4 py-3 text-[13.5px] sm:grid-cols-[minmax(140px,220px)_1fr]">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-paper-faint">
                    Buffer
                  </span>
                  <span className="text-paper-soft">
                    {product.prepBufferDays} day
                    {product.prepBufferDays === 1 ? "" : "s"} before ·{" "}
                    {product.cleanupBufferDays} day
                    {product.cleanupBufferDays === 1 ? "" : "s"} cleanup after. Those days show as
                    blocked on the board — the buffer is set per item, not guessed.
                  </span>
                </div>
              </section>
            ) : null}

            {(product.upsells ?? []).length > 0 ? (
              <section className="mt-8">
                <h2 className="mb-3.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-paper-mute">
                  {t.product.addToBooking}
                </h2>
                <div className="grid gap-px border border-line bg-line [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
                  {(product.upsells ?? []).map((link) => (
                    <Link
                      key={link.upsellProduct.id}
                      href={`/product/${link.upsellProduct.slug}`}
                      className="flex flex-col gap-2 bg-ink-raised p-4 transition-colors duration-instant hover:bg-ink-hover"
                    >
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper-faint">
                        {link.upsellProduct.slug}
                      </span>
                      <span className="text-[15px] font-semibold tracking-[-0.015em]">
                        {link.upsellProduct.name}
                      </span>
                      <span className="font-mono text-[13px] text-signal">
                        <Money
                          amountMinor={link.upsellProduct.priceMinor}
                          currency={link.upsellProduct.currency ?? currency}
                          locale={locale}
                        />
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        }
      />
    </article>
  );
}
