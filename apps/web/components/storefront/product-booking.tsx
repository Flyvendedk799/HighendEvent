"use client";

import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Banner,
  Calendar,
  Checkbox,
  LiveDot,
  Money,
  QuantityStepper,
  Spinner,
  cx,
  useToast,
  type DateRangeValue,
  type DayState,
} from "@rentora/ui";
import { getAvailabilityAction, getQuoteAction } from "@/lib/actions/availability";
import { addToCartAction } from "@/lib/actions/cart";
import type { AvailabilityCalendar, PricingBreakdown, Product } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

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
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
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

function formatDay(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale === "da" ? "da-DK" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

/**
 * The product page's working half.
 *
 * It owns the two-column layout rather than sitting inside one, because the availability board
 * belongs on the wide side — a shopper picks dates before they read a spec sheet — while the
 * quote has to stay in view as they do it. `details` and `gallery` are server-rendered and
 * passed through, so the description, specs and upsells stay off the client bundle.
 */
export function ProductBooking({
  product,
  initialCalendar,
  deliveryEnabled,
  currency,
  locale,
  t,
  gallery,
  details,
  heading,
}: {
  product: Product;
  initialCalendar: AvailabilityCalendar | null;
  deliveryEnabled: boolean;
  currency: string;
  locale: string;
  t: Dictionary;
  gallery: ReactNode;
  details: ReactNode;
  heading: ReactNode;
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
      items: [{ productId: product.id, quantity, startDate: range.start, endDate: range.end }],
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
  const maxDaysExceeded = product.maxRentalDays != null && rentalDays > product.maxRentalDays;

  const upsellTotalMinor = upsells
    .filter((link) => upsellIds.includes(link.upsellProduct.id))
    .reduce((sum, link) => sum + link.upsellProduct.priceMinor, 0);

  const canAdd = Boolean(range.start && range.end) && !minDaysUnmet && !maxDaysExceeded && !quoting;

  /** The smallest count free across every day in the range — what the shopper can actually have. */
  const freeOnRange = useMemo(() => {
    if (!range.start || !range.end) return null;
    let cursor = new Date(`${range.start}T00:00:00Z`).getTime();
    const last = new Date(`${range.end}T00:00:00Z`).getTime();
    let min = Infinity;
    while (cursor <= last) {
      const iso = new Date(cursor).toISOString().slice(0, 10);
      min = Math.min(min, days[iso]?.availableQuantity ?? 0);
      cursor += 86_400_000;
    }
    return Number.isFinite(min) ? min : null;
  }, [days, range.start, range.end]);

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

  const stockChip =
    freeOnRange !== null ? (
      <span
        className={cx(
          "border px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em]",
          freeOnRange <= 0
            ? "border-danger-line bg-danger-tint text-danger"
            : freeOnRange <= 2
              ? "border-warn-line bg-warn-tint text-warn"
              : "border-signal-line bg-signal-tint text-signal",
        )}
      >
        {freeOnRange <= 0 ? "None free on your dates" : `${freeOnRange} free on your dates`}
      </span>
    ) : null;

  return (
    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,1fr)]">
      <div className="min-w-0">
        {gallery}
        {heading}

        {/* Availability board */}
        <section className="mt-9">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-paper-mute">
              <LiveDot />
              {t.product.chooseDates}
            </p>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-paper-faint">
              {product.prepBufferDays || product.cleanupBufferDays
                ? t.product.bufferHelp
                : t.product.chooseDatesHelp}
            </p>
          </div>

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
        </section>

        {minDaysUnmet ? (
          <Banner tone="warning" title="Minimum rental" className="mt-4">
            This item has a minimum rental of {product.minRentalDays} days. Extend your dates to
            continue.
          </Banner>
        ) : null}

        {maxDaysExceeded ? (
          <Banner tone="warning" title="Maximum rental" className="mt-4">
            This item can be rented for at most {product.maxRentalDays} days.
          </Banner>
        ) : null}

        {error ? (
          <Banner tone="danger" title="Cannot book that" className="mt-4">
            {error}
          </Banner>
        ) : null}

        {details}
      </div>

      {/* Sticky quote */}
      <aside className="min-w-0 border border-line-raised bg-ink-raised lg:sticky lg:top-[84px]">
        <div className="px-5 pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper-mute">
              {t.product.liveQuote}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
              {rentalDays > 0
                ? `${rentalDays} ${rentalDays === 1 ? t.common.day : t.common.days}`
                : t.product.noDates}
            </span>
          </div>

          <p className="mt-3.5 font-mono text-[42px] font-medium leading-none tracking-[-0.04em] tabular-nums">
            {quote ? (
              <Money
                amountMinor={quote.totalMinor + upsellTotalMinor}
                currency={currency}
                locale={locale}
              />
            ) : (
              <span className="text-paper-ghost">
                <Money amountMinor={product.dailyPriceMinor} currency={currency} locale={locale} />
              </span>
            )}
          </p>
          <p className="mt-2 text-[12.5px] text-paper-mute">
            {quote ? t.product.quoteIncludes : `${t.common.from} · ${t.common.perDay}`}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-px border-y border-line bg-line">
          <div className="bg-ink-raised px-4 py-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper-mute">
              {t.product.collect}
            </p>
            <p className="mt-1.5 font-mono text-[13.5px]">{formatDay(range.start, locale)}</p>
          </div>
          <div className="bg-ink-raised px-4 py-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper-mute">
              {t.product.return}
            </p>
            <p className="mt-1.5 font-mono text-[13.5px]">{formatDay(range.end, locale)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          {stockChip ? <div>{stockChip}</div> : null}

          <QuantityStepper
            value={quantity}
            min={1}
            max={Math.max(1, Math.min(product.stockQty, 20))}
            onChange={setQuantity}
            label={t.common.quantity}
          />

          {deliveryEnabled ? (
            <div
              role="group"
              aria-label={t.product.fulfilment}
              className="grid grid-cols-2 gap-px border border-line-strong bg-line-strong"
            >
              {(
                [
                  ["PICKUP", t.product.collectFromUs],
                  ["DELIVERY", t.product.deliverToMe],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={deliveryType === mode}
                  onClick={() => setDeliveryType(mode)}
                  className={cx(
                    "px-2 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.13em] transition-colors duration-instant",
                    deliveryType === mode
                      ? "bg-signal text-signal-ink"
                      : "bg-ink-raised text-paper-dim hover:text-paper",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          {upsells.length > 0 ? (
            <div className="border-t border-line-soft pt-4">
              <p className="mb-3 font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper-mute">
                {t.product.addToBooking}
              </p>
              <ul className="space-y-3">
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
                    />
                    <span className="shrink-0 font-mono text-[12.5px] tabular-nums text-signal">
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

          <QuoteLines
            quote={quote}
            quoting={quoting}
            rentalDays={rentalDays}
            upsellTotalMinor={upsellTotalMinor}
            deliveryType={deliveryType}
            currency={currency}
            locale={locale}
            hasDates={Boolean(range.start && range.end)}
            t={t}
          />

          <button
            type="button"
            disabled={!canAdd || adding}
            onClick={addToCart}
            className={cx(
              "flex items-center justify-center gap-2.5 px-5 py-4 font-mono text-[11.5px] font-semibold uppercase tracking-[0.14em] transition-colors duration-instant",
              canAdd && !adding
                ? "bg-signal text-signal-ink hover:bg-signal-press"
                : "cursor-not-allowed bg-line text-paper-ghost",
            )}
          >
            {adding ? <Spinner /> : null}
            {range.start && range.end ? t.product.addToCart : t.product.chooseDatesFirst}
          </button>

          <p className="text-[12px] leading-relaxed text-paper-faint">{t.product.holdNote}</p>
        </div>
      </aside>
    </div>
  );
}

function QuoteLines({
  quote,
  quoting,
  rentalDays,
  upsellTotalMinor,
  deliveryType,
  currency,
  locale,
  hasDates,
  t,
}: {
  quote: PricingBreakdown | null;
  quoting: boolean;
  rentalDays: number;
  upsellTotalMinor: number;
  deliveryType: "PICKUP" | "DELIVERY";
  currency: string;
  locale: string;
  hasDates: boolean;
  t: Dictionary;
}) {
  if (!hasDates) {
    return (
      <p className="border-t border-line-soft pt-4 text-[12.5px] leading-relaxed text-paper-mute">
        {t.product.pricePrompt}
      </p>
    );
  }

  if (quoting || !quote) {
    return (
      <p className="flex items-center gap-2.5 border-t border-line-soft pt-4 text-[12.5px] text-paper-mute">
        <Spinner /> {t.product.pricingYourDates}
      </p>
    );
  }

  const total = quote.totalMinor + upsellTotalMinor;

  return (
    <dl className="flex flex-col gap-2.5 border-t border-line-soft pt-4 text-[13px]">
      <Row
        label={`${t.common.subtotal} · ${rentalDays} ${rentalDays === 1 ? t.common.day : t.common.days}`}
        value={<Money amountMinor={quote.subtotalMinor} currency={currency} locale={locale} />}
      />
      {upsellTotalMinor > 0 ? (
        <Row
          label={t.common.addOns}
          value={<Money amountMinor={upsellTotalMinor} currency={currency} locale={locale} />}
        />
      ) : null}
      <Row
        label={deliveryType === "DELIVERY" ? t.common.delivery : t.common.collection}
        value={
          deliveryType === "DELIVERY" ? (
            <span className="text-paper-faint">{t.common.quotedAtCheckout}</span>
          ) : (
            <span className="text-paper-faint">{t.product.freePickup}</span>
          )
        }
      />
      {quote.depositMinor > 0 ? (
        <Row
          label={t.common.deposit}
          value={<Money amountMinor={quote.depositMinor} currency={currency} locale={locale} />}
        />
      ) : null}
      {quote.taxMinor > 0 ? (
        <Row
          label={`${t.common.tax} (${(quote.taxPercentBps / 100).toFixed(0)}%)`}
          value={<Money amountMinor={quote.taxMinor} currency={currency} locale={locale} />}
        />
      ) : null}

      <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-line-soft pt-3">
        <dt className="text-paper">{t.common.total}</dt>
        <dd className="font-mono text-[15px] tabular-nums text-paper">
          <Money amountMinor={total} currency={currency} locale={locale} />
        </dd>
      </div>

      {quote.remainingMinor > 0 ? (
        <p className="text-[12px] leading-relaxed text-paper-faint">
          {t.product.payNow}{" "}
          <Money amountMinor={quote.upfrontMinor} currency={currency} locale={locale} />{" "}
          {t.product.payNowRest}
        </p>
      ) : null}
    </dl>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-paper-mute">{label}</dt>
      <dd className="font-mono text-[12.5px] tabular-nums text-paper-dim">{value}</dd>
    </div>
  );
}
