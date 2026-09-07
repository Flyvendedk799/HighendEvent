import Link from "next/link";
import { Badge, Money } from "@rentora/ui";
import type { Product } from "@/lib/types";

export function ProductCard({
  product,
  currency,
  locale = "en",
  fromLabel = "From",
  perDayLabel = "/ day",
  checkDatesLabel = "Check dates",
}: {
  product: Product;
  currency: string;
  locale?: string;
  fromLabel?: string;
  perDayLabel?: string;
  checkDatesLabel?: string;
}) {
  const image = product.heroImageUrl ?? product.images?.[0]?.url;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-muted)]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.images?.[0]?.alt || product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted-foreground)]">
            {product.name}
          </div>
        )}
        {product.category ? (
          <Badge tone="accent" className="absolute left-3 top-3">
            {product.category.name}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-lg font-semibold leading-tight group-hover:text-[var(--color-primary)]">
          {product.name}
        </h3>
        {product.description ? (
          <p className="line-clamp-2 text-sm text-[var(--color-muted-foreground)]">
            {product.description}
          </p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <p className="text-sm">
            <span className="text-[var(--color-muted-foreground)]">{fromLabel} </span>
            <span className="font-semibold">
              <Money
                amountMinor={product.dailyPriceMinor}
                currency={product.currency ?? currency}
                locale={locale}
              />
            </span>
            <span className="text-[var(--color-muted-foreground)]"> {perDayLabel}</span>
          </p>
          <span className="text-xs font-medium text-[var(--color-primary)] opacity-0 transition group-hover:opacity-100">
            {checkDatesLabel} →
          </span>
        </div>
      </div>
    </Link>
  );
}
