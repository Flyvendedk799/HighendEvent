"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Banner, Button, DateRange, Money, Select, useToast } from "@rentora/ui";
import { removeCartItemAction, updateCartItemAction } from "@/lib/actions/cart";
import type { CartItem } from "@/lib/types";

export function CartLines({
  items,
  issues,
  currency,
  locale,
}: {
  items: CartItem[];
  issues: Array<{ itemId: string; message: string }>;
  currency: string;
  locale: string;
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
    <ul className="space-y-4">
      {items.map((item) => {
        const image = item.product.heroImageUrl ?? item.product.images?.[0]?.url;
        const issue = issueFor(item.id);
        const upsellTotal = item.upsells.reduce(
          (sum, link) => sum + link.upsellProduct.priceMinor * link.quantity,
          0,
        );

        return (
          <li
            key={item.id}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <div className="flex gap-4">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt=""
                  className="h-24 w-28 shrink-0 rounded-lg object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-24 w-28 shrink-0 rounded-lg bg-[var(--color-muted)]" />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/product/${item.product.slug}`}
                      className="font-display text-lg font-semibold hover:underline"
                    >
                      {item.product.name}
                    </Link>
                    {item.startDate && item.endDate ? (
                      <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
                        <DateRange
                          start={item.startDate}
                          end={item.endDate}
                          locale={locale}
                        />
                      </p>
                    ) : (
                      <p className="mt-0.5 text-sm text-amber-700">No dates chosen</p>
                    )}
                    <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                      {item.deliveryType === "DELIVERY" ? "Delivery" : "Collection"}
                    </p>
                  </div>

                  <p className="shrink-0 text-right text-sm font-semibold">
                    <Money
                      amountMinor={item.product.dailyPriceMinor}
                      currency={currency}
                      locale={locale}
                    />
                    <span className="block text-xs font-normal text-[var(--color-muted-foreground)]">
                      / day
                    </span>
                  </p>
                </div>

                {item.upsells.length > 0 ? (
                  <ul className="mt-2 space-y-0.5 text-xs text-[var(--color-muted-foreground)]">
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
                    {upsellTotal > 0 ? null : null}
                  </ul>
                ) : null}

                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <Select
                    aria-label={`Quantity of ${item.product.name}`}
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
                    <Link href={`/product/${item.product.slug}`}>Change dates</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    disabled={pending}
                    onClick={() => remove(item.id, item.product.name)}
                  >
                    Remove
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
