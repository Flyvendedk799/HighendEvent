import Link from "next/link";
import { Button, Money } from "@rentora/ui";
import type { CartSummary } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

export function CartTotals({
  summary,
  locale,
  t,
}: {
  summary: CartSummary;
  locale: string;
  t: Dictionary;
}) {
  const { pricing, currency, upsellTotalMinor } = summary;

  return (
    <aside className="lg:sticky lg:top-[84px] lg:self-start">
      <div className="border border-line-raised bg-ink-raised">
        <h2 className="border-b border-line px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.16em] text-paper-mute">
          {t.cart.summary}
        </h2>

        <div className="p-5">
          {pricing ? (
            <dl className="flex flex-col gap-2.5 text-[13px]">
              <Row
                label={t.common.subtotal}
                value={
                  <Money amountMinor={pricing.subtotalMinor} currency={currency} locale={locale} />
                }
              />
              {upsellTotalMinor > 0 ? (
                <Row
                  label={t.common.addOns}
                  value={
                    <Money amountMinor={upsellTotalMinor} currency={currency} locale={locale} />
                  }
                />
              ) : null}
              {pricing.depositMinor > 0 ? (
                <Row
                  label={t.common.deposit}
                  value={
                    <Money amountMinor={pricing.depositMinor} currency={currency} locale={locale} />
                  }
                />
              ) : null}
              {pricing.taxMinor > 0 ? (
                <Row
                  label={`${t.common.tax} (${(pricing.taxPercentBps / 100).toFixed(0)}%)`}
                  value={<Money amountMinor={pricing.taxMinor} currency={currency} locale={locale} />}
                />
              ) : null}
              <Row
                label={t.common.delivery}
                value={<span className="text-paper-faint">{t.common.quotedAtCheckout}</span>}
              />

              <div className="mt-1 flex items-baseline justify-between border-t border-line-soft pt-3">
                <dt className="text-paper">{t.common.total}</dt>
                <dd className="font-mono text-[19px] tabular-nums text-paper">
                  <Money
                    amountMinor={pricing.totalMinor + upsellTotalMinor}
                    currency={currency}
                    locale={locale}
                  />
                </dd>
              </div>

              {pricing.remainingMinor > 0 ? (
                <p className="text-[12px] leading-relaxed text-paper-faint">
                  You pay{" "}
                  <Money amountMinor={pricing.upfrontMinor} currency={currency} locale={locale} />{" "}
                  now and the balance before your dates.
                </p>
              ) : null}
            </dl>
          ) : (
            <p className="text-[13px] leading-relaxed text-paper-mute">{t.cart.choosePrompt}</p>
          )}

          <Button
            size="lg"
            className="mt-6 w-full"
            disabled={!summary.checkoutReady}
            asChild={summary.checkoutReady}
          >
            {summary.checkoutReady ? (
              <Link href="/checkout">{t.cart.checkout}</Link>
            ) : (
              <span>{t.cart.resolveItems}</span>
            )}
          </Button>

          <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-paper-faint">
            <Link href="/catalog" className="transition-colors duration-instant hover:text-signal">
              {t.nav.keepBrowsing}
            </Link>
          </p>
        </div>
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-paper-mute">{label}</dt>
      <dd className="font-mono text-[12.5px] tabular-nums text-paper-dim">{value}</dd>
    </div>
  );
}
