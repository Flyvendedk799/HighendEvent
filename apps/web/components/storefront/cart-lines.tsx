"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Banner, Button, DateRange, Money, Select, useToast } from "@rentora/ui";
import { removeCartItemAction, updateCartItemAction } from "@/lib/actions/cart";
import type { CartItem } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

export function CartLines({
  items,
  issues,
  currency,
  locale,
  t,
}: {
  items: CartItem[];
  issues: Array<{ itemId: string; message: string }>;
  currency: string;
  locale: string;
  t: Dictionary;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const issueFor = (itemId: string) => issues.find((issue) => issue.itemId === itemId);

  function update(itemId: string, quantity: number) {
    startTransition(async () => {
      const result = await updateCartItemAction(itemId, { quantity });
      if (result.error) {
        toast({ title: "Could not update", description: result.error, tone: "error" });
      }
    });
  }

  function remove(itemId: string, name: string) {
    startTransition(async () => {
      const result = await removeCartItemAction(itemId);
      toast(
        result.error
          ? { title: "Could not remove", description: result.error, tone: "error" }
          : { title: `${name} removed` },
      );
    });
  }

  return (
    <ul className="grid gap-px border border-line bg-line">
      {items.map((item) => {
        const image = item.product.heroImageUrl ?? item.product.images?.[0]?.url;
        const issue = issueFor(item.id);

        return (
          <li
            key={item.id}
            className="bg-ink-raised p-4"
          >
            <div className="flex gap-4">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt=""
                  className="h-24 w-28 shrink-0 border border-line object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-24 w-28 shrink-0 border border-line bg-ink-sunk plate" />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/product/${item.product.slug}`}
                      className="text-[17px] font-semibold tracking-[-0.02em] transition-colors duration-instant hover:text-signal"
                    >
                      {item.product.name}
                    </Link>
                    {item.startDate && item.endDate ? (
                      <p className="mt-1.5 text-paper-mute">
                        <DateRange
                          start={item.startDate}
                          end={item.endDate}
                          locale={locale}
                        />
                      </p>
                    ) : (
                      <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-warn">
                        {t.cart.noDates}
                      </p>
                    )}
                    <p className="mt-0.5 font-mono text-[11px] text-paper-faint">
                      {item.deliveryType === "DELIVERY" ? t.common.delivery : t.common.collection}
                    </p>
                  </div>

                  <p className="shrink-0 text-right font-mono text-[14px] tabular-nums">
                    <Money
                      amountMinor={item.product.dailyPriceMinor}
                      currency={currency}
                      locale={locale}
                    />
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-paper-faint">
                      {t.common.perDay}
                    </span>
                  </p>
                </div>

                {item.upsells.length > 0 ? (
                  <ul className="mt-3 space-y-1 border-t border-line-soft pt-3 text-[12px] text-paper-mute">
                    {item.upsells.map((link) => (
                      <li key={link.id} className="flex justify-between gap-3">
                        <span>+ {link.upsellProduct.name}</span>
                        <Money
                          amountMinor={link.upsellProduct.priceMinor * link.quantity}
                          currency={currency}
                          locale={locale}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-4 flex flex-wrap items-end gap-2.5">
                  <Select
                    aria-label={`${t.common.quantity}: ${item.product.name}`}
                    value={String(item.quantity)}
                    disabled={pending}
                    onChange={(e) => update(item.id, Number(e.target.value))}
                    className="w-20"
                    options={Array.from(
                      { length: Math.max(item.quantity, Math.min(item.product.stockQty, 20)) },
                      (_, i) => ({ value: String(i + 1), label: String(i + 1) }),
                    )}
                  />
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/product/${item.product.slug}`}>{t.cart.changeDates}</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger"
                    disabled={pending}
                    onClick={() => remove(item.id, item.product.name)}
                  >
                    {t.common.remove}
                  </Button>
                </div>
              </div>
            </div>

            {issue ? (
              <Banner tone="warning" className="mt-3">
                {issue.message}
              </Banner>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
