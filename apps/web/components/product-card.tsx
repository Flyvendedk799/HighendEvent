import Link from "next/link";
import { Money } from "@rentora/ui";
import type { Product } from "@/lib/types";

/**
 * A catalogue tile. The stock state sits on the image as a chip because it is the one thing that
 * decides whether the rest of the card matters: a beautiful tent that is booked out is a dead
 * end, and the shopper should learn that before they read the price.
 */
export function ProductCard({
  product,
  currency,
  locale = "en",
  fromLabel = "From",
  perDayLabel = "/ day",
}: {
  product: Product;
  currency: string;
  locale?: string;
  fromLabel?: string;
  perDayLabel?: string;
  /** Retained for callers that still pass it; the hover affordance is the card itself now. */
  checkDatesLabel?: string;
}) {
  const image = product.heroImageUrl ?? product.images?.[0]?.url;
  const stock = product.stockQty ?? 0;

  /*
   * Fleet size, not availability. The catalogue has no dates yet, so it cannot say "3 free on
   * your dates" without inventing it — the product page computes that once a range is picked.
   */
  const state =
    stock <= 0
      ? { label: "Out of stock", classes: "border-line-strong bg-[rgba(237,238,234,0.05)] text-paper-mute" }
      : stock <= 2
        ? { label: `Only ${stock}`, classes: "border-warn-line bg-warn-tint text-warn" }
        : { label: `${stock} in fleet`, classes: "border-signal-line bg-signal-tint text-signal" };

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col bg-ink-raised transition-colors duration-instant hover:bg-ink-hover"
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b border-line bg-ink-sunk plate">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.images?.[0]?.alt || product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.18em] text-paper-ghost">
            {product.slug}
          </span>
        )}
        <span
          className={`absolute left-2.5 top-2.5 border px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.13em] ${state.classes}`}
        >
          {state.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex justify-between gap-3 font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper-faint">
          <span className="truncate">{product.slug}</span>
          {product.category ? <span className="truncate">{product.category.name}</span> : null}
        </div>

        <h3 className="text-[17px] font-semibold leading-tight tracking-[-0.02em] transition-colors duration-instant group-hover:text-signal">
          {product.name}
        </h3>

        {product.description ? (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-paper-mute">
            {product.description}
          </p>
        ) : null}

        <div className="mt-auto flex items-baseline justify-between gap-3 border-t border-line-soft pt-3">
          <p className="font-mono text-[15px] tabular-nums">
            <Money
              amountMinor={product.dailyPriceMinor}
              currency={product.currency ?? currency}
              locale={locale}
            />
            <span className="text-[10.5px] text-paper-mute"> {perDayLabel}</span>
          </p>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-paper-faint">
            {fromLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
