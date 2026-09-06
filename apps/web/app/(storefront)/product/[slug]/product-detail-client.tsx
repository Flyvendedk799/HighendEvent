"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  availableQuantity,
  calculateBookingPricing,
  rentalDays,
} from "@rentora/domain";
import { Badge, Button } from "@rentora/ui";
import {
  AvailabilityCalendar,
  type DateRange,
} from "@/components/availability-calendar";
import { useCart } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import {
  productAvailabilityInput,
  productPricingInput,
  type StoreBlackout,
  type StoreOccupancy,
  type StoreProduct,
} from "@/lib/product-model";

const tones = {
  teal: "from-teal-800 via-teal-600 to-teal-400",
  amber: "from-amber-800 via-amber-600 to-amber-300",
  slate: "from-slate-800 via-slate-600 to-slate-400",
};

export function ProductDetailClient({
  product,
  blackouts = [],
  occupancy = [],
}: {
  product: StoreProduct;
  blackouts?: StoreBlackout[];
  occupancy?: StoreOccupancy[];
}) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const [addedFlash, setAddedFlash] = useState(false);

  const startDate = range.start;
  const endDate = range.end ?? range.start;

  const freeQty = useMemo(() => {
    if (!startDate || !endDate) return product.stock;
    return availableQuantity({
      product: productAvailabilityInput(product),
      startDate,
      endDate,
      bookings: occupancy,
      blackouts,
    });
  }, [product, startDate, endDate, occupancy, blackouts]);

  const quote = useMemo(() => {
    if (!startDate || !endDate) return null;
    if (freeQty < qty) return null;
    return calculateBookingPricing({
      items: [
        {
          product: productPricingInput(product),
          quantity: qty,
          startDate,
          endDate,
        },
      ],
      tax: { taxPercentBps: 2500, inclusive: true },
      paymentModel: product.deposit ? "DEPOSIT_REMAINDER" : "FULL_UPFRONT",
      currency: product.currency,
    });
  }, [product, qty, startDate, endDate, freeQty]);

  const days = startDate && endDate ? rentalDays(startDate, endDate) : 0;
  const canAdd = Boolean(quote && startDate && endDate && freeQty >= qty);

  function handleAdd() {
    if (!quote || !startDate || !endDate) return;
    const line = quote.lineItems[0];
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageTone: product.imageTone,
      currency: product.currency,
      unitPriceMinor: line?.unitPriceMinor ?? product.priceFrom,
      quantity: qty,
      startDate,
      endDate,
      days,
      lineTotalMinor: quote.subtotalMinor,
      depositMinor: quote.depositMinor,
    });
    setAddedFlash(true);
    window.setTimeout(() => setAddedFlash(false), 2200);
  }

  return (
    <main className="space-y-10 animate-fade-up">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/home" className="hover:text-foreground">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/catalog" className="hover:text-foreground">
              Catalog
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/catalog" className="hover:text-foreground">
              {product.category}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="font-medium text-foreground">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-10 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
            <div
              className={`relative aspect-[16/11] bg-gradient-to-br ${tones[product.imageTone]}`}
            >
              <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_70%_25%,white,transparent_42%),radial-gradient(circle_at_20%_80%,rgba(15,23,42,0.35),transparent_50%)]" />
              <div className="absolute left-4 top-4 flex flex-col gap-2">
                <Badge tone="success">In stock · {product.stock}</Badge>
                {product.weekendPrice ? <Badge tone="accent">Weekend rate</Badge> : null}
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                <p className="rounded-xl bg-black/35 px-3 py-2 text-sm font-medium text-white backdrop-blur">
                  {product.galleryLabels[galleryIndex] ?? "Gallery"}
                </p>
                <p className="font-display text-3xl font-semibold text-white/90 drop-shadow">
                  {product.name}
                </p>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto p-4">
              {product.galleryLabels.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setGalleryIndex(index)}
                  className={[
                    "relative h-20 w-24 shrink-0 overflow-hidden rounded-xl border-2 bg-gradient-to-br transition",
                    tones[product.imageTone],
                    galleryIndex === index
                      ? "border-teal-600 shadow-md"
                      : "border-transparent opacity-80 hover:opacity-100",
                  ].join(" ")}
                  aria-label={`Show ${label}`}
                >
                  <span className="absolute inset-x-0 bottom-0 bg-black/45 px-1 py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-white">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="font-display text-2xl font-semibold">About this rental</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{product.longDescription}</p>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="font-display text-2xl font-semibold">Specifications</h2>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              {product.specs.map((spec) => (
                <div
                  key={spec.label}
                  className="rounded-2xl border border-border/80 bg-muted/50 px-4 py-3"
                >
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {spec.label}
                  </dt>
                  <dd className="mt-1 font-medium text-foreground">{spec.value}</dd>
                </div>
              ))}
              <div className="rounded-2xl border border-border/80 bg-muted/50 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Prep / cleanup
                </dt>
                <dd className="mt-1 font-medium text-foreground">
                  {product.prepBufferDays}d prep · {product.cleanupBufferDays}d cleanup
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <Badge tone="accent">{product.category}</Badge>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {product.name}
            </h1>
            <p className="mt-3 text-muted-foreground">{product.description}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <PriceTile
                label="Weekday"
                value={formatMoney(product.priceFrom, product.currency)}
                hint="per day"
              />
              {product.weekendPrice ? (
                <PriceTile
                  label="Weekend"
                  value={formatMoney(product.weekendPrice, product.currency)}
                  hint="Sat–Sun day rate"
                />
              ) : null}
              {product.weekendPackage ? (
                <PriceTile
                  label="Fri–Sun package"
                  value={formatMoney(product.weekendPackage, product.currency)}
                  hint="3-day bundle"
                />
              ) : null}
              {product.deposit ? (
                <PriceTile
                  label="Deposit"
                  value={formatMoney(product.deposit, product.currency)}
                  hint="refundable hold"
                />
              ) : null}
            </div>

            <div className="mt-6 space-y-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Quantity</span>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, freeQty || product.stock)}
                    value={qty}
                    onChange={(e) =>
                      setQty(Math.max(1, Math.min(product.stock, Number(e.target.value) || 1)))
                    }
                    className="h-10 w-24 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                  />
                  <p className="text-sm text-muted-foreground">
                    {startDate
                      ? `${freeQty} free for selected dates`
                      : `${product.stock} in inventory`}
                  </p>
                </div>
              </label>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-4">
              {!startDate ? (
                <p className="text-sm text-muted-foreground">
                  Select dates on the calendar below to see a live quote.
                </p>
              ) : freeQty < qty ? (
                <p className="text-sm font-medium text-red-700">
                  Not enough stock for these dates. Try fewer units or another range.
                </p>
              ) : quote ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      {days} day{days === 1 ? "" : "s"} · {qty} unit{qty === 1 ? "" : "s"}
                    </span>
                    <span className="font-semibold">
                      {formatMoney(quote.subtotalMinor, product.currency)}
                    </span>
                  </div>
                  {quote.depositMinor > 0 ? (
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Deposit hold</span>
                      <span>{formatMoney(quote.depositMinor, product.currency)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-3 border-t border-border pt-2 text-base">
                    <span className="font-medium">Due now</span>
                    <span className="font-semibold text-teal-800">
                      {formatMoney(quote.upfrontMinor, product.currency)}
                    </span>
                  </div>
                  {quote.remainingMinor > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Remainder {formatMoney(quote.remainingMinor, product.currency)} before
                      delivery
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="flex-1" disabled={!canAdd} onClick={handleAdd}>
                {addedFlash ? "Added to cart" : "Add to cart"}
              </Button>
              <Link href="/cart" className="sm:w-auto">
                <Button size="lg" variant="secondary" className="w-full">
                  View cart
                </Button>
              </Link>
            </div>
            <Link
              href="/catalog"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              ← Back to catalog
            </Link>
          </div>
        </aside>
      </div>

      <AvailabilityCalendar
        product={product}
        value={range}
        onChange={setRange}
        quantity={qty}
        bookings={occupancy}
        blackouts={blackouts}
      />
    </main>
  );
}

function PriceTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-white to-muted/60 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
