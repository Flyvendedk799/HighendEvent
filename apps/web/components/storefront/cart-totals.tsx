import Link from "next/link";
import { Button, Money } from "@rentora/ui";
import type { CartSummary } from "@/lib/types";

export function CartTotals({
  summary,
  locale,
}: {
  summary: CartSummary;
  locale: string;
}) {
  const { pricing, currency, upsellTotalMinor } = summary;

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="text-sm font-semibold">Order summary</h2>

        {pricing ? (
          <dl className="mt-4 space-y-1.5 text-sm">
            <Row
              label="Rental"
              value={<Money amountMinor={pricing.subtotalMinor} currency={currency} locale={locale} />}
            />
            {upsellTotalMinor > 0 ? (
              <Row
                label="Add-ons"
                value={<Money amountMinor={upsellTotalMinor} currency={currency} locale={locale} />}
              />
            ) : null}
            {pricing.depositMinor > 0 ? (
              <Row
                label="Refundable deposit"
                value={<Money amountMinor={pricing.depositMinor} currency={currency} locale={locale} />}
              />
            ) : null}
            {pricing.taxMinor > 0 ? (
              <Row
                label={`Tax (${(pricing.taxPercentBps / 100).toFixed(0)}%)`}
                value={<Money amountMinor={pricing.taxMinor} currency={currency} locale={locale} />}
              />
            ) : null}
            <Row
              label="Delivery"
              value={
                <span className="text-[var(--color-muted-foreground)]">Quoted at checkout</span>
              }
            />

            <div className="mt-3 flex items-baseline justify-between border-t border-[var(--color-border)] pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="text-lg font-semibold">
                <Money
                  amountMinor={pricing.totalMinor + upsellTotalMinor}
                  currency={currency}
                  locale={locale}
                />
              </dd>
            </div>

            {pricing.remainingMinor > 0 ? (
              <p className="pt-1 text-xs text-[var(--color-muted-foreground)]">
                You pay{" "}
                <Money amountMinor={pricing.upfrontMinor} currency={currency} locale={locale} />{" "}
                now and the balance before your dates.
              </p>
            ) : null}
          </dl>
        ) : (
          <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
            Choose dates on each item to see your total.
          </p>
        )}

        <Button
          size="lg"
          className="mt-5 w-full"
          disabled={!summary.checkoutReady}
          asChild={summary.checkoutReady}
        >
          {summary.checkoutReady ? (
            <Link href="/checkout">Continue to checkout</Link>
          ) : (
            <span>Resolve the items above</span>
          )}
        </Button>

        <p className="mt-3 text-center text-xs text-[var(--color-muted-foreground)]">
          <Link href="/catalog" className="hover:underline">
            Keep browsing
          </Link>
        </p>
      </div>
    </aside>
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
