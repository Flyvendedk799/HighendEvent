"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  Banner,
  Button,
  Card,
  CardHeader,
  Input,
  Money,
  Select,
  Textarea,
} from "@rentora/ui";
import { startCheckoutAction, quoteDeliveryAction } from "@/lib/actions/checkout";
import type { CartSummary, DeliveryQuote } from "@/lib/types";

export type SessionShapeLite = {
  email?: string;
  name?: string;
} | null;

export function CheckoutForm({
  summary,
  deliveryEnabled,
  locale,
  prefill,
}: {
  summary: CartSummary;
  deliveryEnabled: boolean;
  locale: string;
  prefill: SessionShapeLite;
}) {
  const [state, formAction] = useActionState(startCheckoutAction, {});
  const [deliveryType, setDeliveryType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoting, startQuoting] = useTransition();

  const err = state.fieldErrors ?? {};

  function requestQuote() {
    setQuoteError(null);
    startQuoting(async () => {
      const result = await quoteDeliveryAction({ address, zipCode, city });
      if (result.quote) {
        setQuote(result.quote);
        if (!result.quote.allowed) setQuoteError(result.quote.explanation);
      } else {
        setQuote(null);
        setQuoteError(result.error ?? "Could not quote delivery for that address.");
      }
    });
  }

  const deliveryFeeMinor = deliveryType === "DELIVERY" ? (quote?.feeMinor ?? 0) : 0;
  const total = (summary.pricing?.totalMinor ?? 0) + summary.upsellTotalMinor + deliveryFeeMinor;

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        {state.error ? <Banner tone="danger">{state.error}</Banner> : null}

        <Card>
          <CardHeader title="Your details" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                name="customerName"
                label="Full name"
                required
                autoComplete="name"
                defaultValue={prefill?.name ?? ""}
                error={err.customerName}
              />
            </div>
            <Input
              name="email"
              type="email"
              label="Email"
              required
              autoComplete="email"
              defaultValue={prefill?.email ?? ""}
              error={err.email}
            />
            <Input
              name="phone"
              type="tel"
              label="Phone"
              required
              autoComplete="tel"
              error={err.phone}
              hint="For the crew on the day."
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Delivery or collection" />
          <Select
            name="deliveryType"
            label="How would you like it?"
            value={deliveryType}
            onChange={(e) => {
              setDeliveryType(e.target.value as "PICKUP" | "DELIVERY");
              setQuote(null);
              setQuoteError(null);
            }}
            options={[
              { value: "PICKUP", label: "I will collect it" },
              ...(deliveryEnabled ? [{ value: "DELIVERY", label: "Deliver to my address" }] : []),
            ]}
          />

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                name="address"
                label={deliveryType === "DELIVERY" ? "Delivery address" : "Billing address"}
                required
                autoComplete="street-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                error={err.address}
              />
            </div>
            <Input
              name="zipCode"
              label="Postcode"
              required
              autoComplete="postal-code"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              error={err.zipCode}
            />
            <Input
              name="city"
              label="City"
              required
              autoComplete="address-level2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              error={err.city}
            />
          </div>

          {deliveryType === "DELIVERY" ? (
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                loading={quoting}
                disabled={!address.trim()}
                onClick={requestQuote}
              >
                Quote delivery
              </Button>

              {quote?.allowed ? (
                <Banner tone="success" className="mt-3">
                  {quote.distanceKm} km from our depot —{" "}
                  <strong>
                    <Money
                      amountMinor={quote.feeMinor}
                      currency={quote.currency ?? summary.currency}
                      locale={locale}
                    />
                  </strong>{" "}
                  delivery. {quote.explanation}
                </Banner>
              ) : null}

              {quoteError ? (
                <Banner tone="warning" className="mt-3">
                  {quoteError}
                </Banner>
              ) : null}

              {!quote && !quoteError ? (
                <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                  We quote delivery from your address before you pay.
                </p>
              ) : null}
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Anything we should know?" />
          <Textarea
            name="notes"
            rows={3}
            placeholder="Access, gate codes, where to set up…"
          />
        </Card>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader title="Order summary" />
          <ul className="space-y-2 text-sm">
            {summary.cart.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate">{item.product.name}</span>
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    × {item.quantity}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {summary.pricing ? (
            <dl className="mt-4 space-y-1.5 border-t border-[var(--color-border)] pt-4 text-sm">
              <Row
                label="Rental"
                value={
                  <Money
                    amountMinor={summary.pricing.subtotalMinor}
                    currency={summary.currency}
                    locale={locale}
                  />
                }
              />
              {summary.upsellTotalMinor > 0 ? (
                <Row
                  label="Add-ons"
                  value={
                    <Money
                      amountMinor={summary.upsellTotalMinor}
                      currency={summary.currency}
                      locale={locale}
                    />
                  }
                />
              ) : null}
              {summary.pricing.depositMinor > 0 ? (
                <Row
                  label="Deposit"
                  value={
                    <Money
                      amountMinor={summary.pricing.depositMinor}
                      currency={summary.currency}
                      locale={locale}
                    />
                  }
                />
              ) : null}
              <Row
                label="Delivery"
                value={
                  deliveryType === "DELIVERY" ? (
                    quote?.allowed ? (
                      <Money
                        amountMinor={deliveryFeeMinor}
                        currency={summary.currency}
                        locale={locale}
                      />
                    ) : (
                      <span className="text-[var(--color-muted-foreground)]">Not quoted yet</span>
                    )
                  ) : (
                    <span className="text-[var(--color-muted-foreground)]">Collection</span>
                  )
                }
              />

              <div className="mt-3 flex items-baseline justify-between border-t border-[var(--color-border)] pt-3">
                <dt className="font-semibold">Total</dt>
                <dd className="text-lg font-semibold">
                  <Money amountMinor={total} currency={summary.currency} locale={locale} />
                </dd>
              </div>

              {summary.pricing.remainingMinor > 0 ? (
                <p className="pt-1 text-xs text-[var(--color-muted-foreground)]">
                  You pay{" "}
                  <Money
                    amountMinor={summary.pricing.upfrontMinor + deliveryFeeMinor}
                    currency={summary.currency}
                    locale={locale}
                  />{" "}
                  now. The balance is due before your dates.
                </p>
              ) : null}
            </dl>
          ) : null}

          <PayButton
            disabled={deliveryType === "DELIVERY" && !quote?.allowed}
            deliveryPending={deliveryType === "DELIVERY" && !quote?.allowed}
          />
        </Card>
      </aside>
    </form>
  );
}

function PayButton({
  disabled,
  deliveryPending,
}: {
  disabled: boolean;
  deliveryPending: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <>
      <Button type="submit" size="lg" className="mt-5 w-full" loading={pending} disabled={disabled}>
        Continue to payment
      </Button>
      {deliveryPending ? (
        <p className="mt-2 text-center text-xs text-[var(--color-muted-foreground)]">
          Quote delivery for your address to continue.
        </p>
      ) : null}
    </>
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
