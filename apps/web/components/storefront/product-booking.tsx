"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Banner,
  Button,
  Calendar,
  Checkbox,
  Money,
  Select,
  Spinner,
  useToast,
  type DateRangeValue,
  type DayState,
} from "@rentora/ui";
import { getAvailabilityAction, getQuoteAction } from "@/lib/actions/availability";
import { addToCartAction } from "@/lib/actions/cart";
import type { AvailabilityCalendar, PricingBreakdown, Product } from "@/lib/types";

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function addMonthsIso(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1))
    .toISOString()
    .slice(0, 10);
}

function endOfMonthIso(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);
}

function toDayMap(calendar: AvailabilityCalendar | null): Record<string, DayState> {
  const map: Record<string, DayState> = {};
  for (const day of calendar?.days ?? []) {
    map[day.date] = {
      availableQuantity: day.availableQuantity,
      isAvailable: day.isAvailable,
      isBlackedOut: day.isBlackedOut,
    };
  }
  return map;
}

export function ProductBooking({
  product,
  initialCalendar,
  deliveryEnabled,
  currency,
  locale,
}: {
  product: Product;
  initialCalendar: AvailabilityCalendar | null;
  deliveryEnabled: boolean;
  currency: string;
  locale: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [days, setDays] = useState<Record<string, DayState>>(() => toDayMap(initialCalendar));
  const [range, setRange] = useState<DateRangeValue>({ start: null, end: null });
  const [quantity, setQuantity] = useState(1);
  const [deliveryType, setDeliveryType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [upsellIds, setUpsellIds] = useState<string[]>([]);

  const [quote, setQuote] = useState<PricingBreakdown | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, startAdding] = useTransition();

  const upsells = product.upsells ?? [];

  const loadMonths = useCallback(
    async (firstMonthIso: string) => {
      // Fetch the visible month plus the next two, so paging forward is instant.
      const startDate = firstMonthIso;
      const endDate = endOfMonthIso(addMonthsIso(firstMonthIso, 2));
      const result = await getAvailabilityAction(product.id, startDate, endDate);
      if (result.calendar) {
        setDays((current) => ({ ...current, ...toDayMap(result.calendar!) }));
      }
    },
    [product.id],
  );

  // Re-price whenever the shopper changes anything that affects the total.
  useEffect(() => {
    if (!range.start || !range.end) {
      setQuote(null);
      return;
    }

    let cancelled = false;
    setQuoting(true);

    void getQuoteAction({
      items: [
        {
          productId: product.id,
          quantity,
          startDate: range.start,
          endDate: range.end,
        },
      ],
    }).then((result) => {
      if (cancelled) return;
      setQuoting(false);
      if (result.quote) {
        setQuote(result.quote);
        setError(null);
      } else if (result.error) {
        setQuote(null);
        setError(result.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [product.id, quantity, range.start, range.end]);

  const rentalDays = useMemo(() => {
    if (!range.start || !range.end) return 0;
    const start = new Date(`${range.start}T00:00:00Z`).getTime();
    const end = new Date(`${range.end}T00:00:00Z`).getTime();
    return Math.round((end - start) / 86_400_000) + 1;
  }, [range.start, range.end]);

  const minDaysUnmet = rentalDays > 0 && rentalDays < product.minRentalDays;
  const maxDaysExceeded =
    product.maxRentalDays != null && rentalDays > product.maxRentalDays;

  const upsellTotalMinor = upsells
    .filter((link) => upsellIds.includes(link.upsellProduct.id))
    .reduce((sum, link) => sum + link.upsellProduct.priceMinor, 0);

  const canAdd =
    Boolean(range.start && range.end) && !minDaysUnmet && !maxDaysExceeded && !quoting;

  function addToCart() {
    if (!range.start || !range.end) return;

    startAdding(async () => {
      const result = await addToCartAction({
        productId: product.id,
        quantity,
        startDate: range.start!,
        endDate: range.end!,
        deliveryType,
        upsellIds,
      });

      if (result.error) {
        setError(result.error);
        toast({ title: "Could not add to cart", description: result.error, tone: "error" });
        // Stock may have moved; refresh the calendar so the shopper sees why.
        void loadMonths(range.start!.slice(0, 8) + "01");
        return;
      }

      setError(null);
      toast({ title: `${product.name} added to your cart` });
      router.push("/cart");
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="mb-1 text-sm font-semibold">Choose your dates</h2>
        <p className="mb-3 text-xs text-[var(--color-muted-foreground)]">
          {product.prepBufferDays || product.cleanupBufferDays
            ? `Days either side of an existing booking are blocked for prep and cleanup.`
            : `Pick the first and last day of your rental.`}
        </p>

        <Calendar
          days={days}
          value={range}
          onChange={setRange}
          quantity={quantity}
          minDate={isoToday()}
          months={1}
          locale={locale}
          onMonthChange={(month) => void loadMonths(month)}
        />
      </div>

      {minDaysUnmet ? (
        <Banner tone="warning">
          This item has a minimum rental of {product.minRentalDays} days. Extend your dates to
          continue.
        </Banner>
      ) : null}

      {maxDaysExceeded ? (
        <Banner tone="warning">
          This item can be rented for at most {product.maxRentalDays} days.
        </Banner>
      ) : null}

      {error ? <Banner tone="danger">{error}</Banner> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Quantity"
          value={String(quantity)}
          onChange={(e) => setQuantity(Number(e.target.value))}
          options={Array.from({ length: Math.min(product.stockQty, 20) }, (_, i) => ({
            value: String(i + 1),
            label: String(i + 1),
          }))}
        />
        {deliveryEnabled ? (
          <Select
            label="Fulfilment"
            value={deliveryType}
            onChange={(e) => setDeliveryType(e.target.value as "PICKUP" | "DELIVERY")}
            options={[
              { value: "PICKUP", label: "Collect from us" },
              { value: "DELIVERY", label: "Delivery (quoted at checkout)" },
            ]}
          />
        ) : null}
      </div>

      {upsells.length > 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h2 className="mb-2 text-sm font-semibold">Add to your booking</h2>
          <ul className="space-y-2.5">
            {upsells.map((link) => (
              <li key={link.upsellProduct.id} className="flex items-start justify-between gap-3">
                <Checkbox
                  checked={upsellIds.includes(link.upsellProduct.id)}
                  onChange={(e) =>
                    setUpsellIds((current) =>
                      e.target.checked
                        ? [...current, link.upsellProduct.id]
                        : current.filter((id) => id !== link.upsellProduct.id),
                    )
                  }
                  label={link.upsellProduct.name}
                  description={link.upsellProduct.description ?? undefined}
                />
                <span className="shrink-0 text-sm font-medium">
                  <Money
                    amountMinor={link.upsellProduct.priceMinor}
                    currency={link.upsellProduct.currency ?? currency}
                    locale={locale}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <QuotePanel
        quote={quote}
        quoting={quoting}
        rentalDays={rentalDays}
        upsellTotalMinor={upsellTotalMinor}
        currency={currency}
        locale={locale}
        hasDates={Boolean(range.start && range.end)}
      />

      <Button size="lg" className="w-full" disabled={!canAdd} loading={adding} onClick={addToCart}>
        {range.start && range.end ? "Add to cart" : "Choose dates to continue"}
      </Button>
    </div>
  );
}

function QuotePanel({
  quote,
  quoting,
  rentalDays,
  upsellTotalMinor,
  currency,
  locale,
  hasDates,
}: {
  quote: PricingBreakdown | null;
  quoting: boolean;
  rentalDays: number;
  upsellTotalMinor: number;
  currency: string;
  locale: string;
  hasDates: boolean;
}) {
  if (!hasDates) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Pick your dates and we will price the rental exactly, including weekend rates.
      </p>
    );
  }

  if (quoting || !quote) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
        <Spinner /> Pricing your dates…
      </div>
    );
  }

  const total = quote.totalMinor + upsellTotalMinor;

  return (
    <dl className="space-y-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
      <Row
        label={`Rental · ${rentalDays} ${rentalDays === 1 ? "day" : "days"}`}
        value={<Money amountMinor={quote.subtotalMinor} currency={currency} locale={locale} />}
      />
      {upsellTotalMinor > 0 ? (
        <Row
          label="Add-ons"
          value={<Money amountMinor={upsellTotalMinor} currency={currency} locale={locale} />}
        />
      ) : null}
      {quote.depositMinor > 0 ? (
        <Row
          label="Refundable deposit"
          value={<Money amountMinor={quote.depositMinor} currency={currency} locale={locale} />}
        />
      ) : null}
      {quote.taxMinor > 0 ? (
        <Row
          label={`Tax (${(quote.taxPercentBps / 100).toFixed(0)}%)`}
          value={<Money amountMinor={quote.taxMinor} currency={currency} locale={locale} />}
        />
      ) : null}

      <div className="mt-2 flex items-baseline justify-between border-t border-[var(--color-border)] pt-2">
        <dt className="font-semibold">Total</dt>
        <dd className="text-lg font-semibold">
          <Money amountMinor={total} currency={currency} locale={locale} />
        </dd>
      </div>

      {quote.remainingMinor > 0 ? (
        <p className="pt-1 text-xs text-[var(--color-muted-foreground)]">
          Pay <Money amountMinor={quote.upfrontMinor} currency={currency} locale={locale} /> now,
          the rest before delivery.
        </p>
      ) : null}
    </dl>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[var(--color-muted-foreground)]">{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}
