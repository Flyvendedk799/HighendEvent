"use client";

import Link from "next/link";
import { Button, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/demo-data";
import { getDictionary } from "@/lib/i18n";

const tones = {
  teal: "from-teal-700 to-teal-400",
  amber: "from-amber-600 to-amber-300",
  slate: "from-slate-700 to-slate-400",
};

export function CartClient() {
  const t = getDictionary("en");
  const { items, removeItem, clear, subtotalMinor, depositMinor } = useCart();
  const currency = items[0]?.currency ?? "DKK";

  return (
    <main>
      <PageHeader title={t.cart.title} description="Review rental dates before checkout." />

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface/70 px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-semibold">Your cart is empty</h2>
          <p className="mt-2 text-muted-foreground">
            Pick dates on a product calendar to add rentals.
          </p>
          <Link href="/catalog" className="mt-6 inline-block">
            <Button size="lg">Browse catalog</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {items.map((item) => (
              <Card
                key={`${item.productId}-${item.startDate}-${item.endDate}`}
                className="flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`h-16 w-16 shrink-0 rounded-xl bg-gradient-to-br ${tones[item.imageTone]}`}
                  />
                  <div>
                    <Link
                      href={`/product/${item.slug}`}
                      className="font-display text-lg font-semibold hover:text-primary"
                    >
                      {item.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} × {item.days} day{item.days === 1 ? "" : "s"} ·{" "}
                      {item.startDate}
                      {item.endDate !== item.startDate ? ` → ${item.endDate}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(item.unitPriceMinor, item.currency)}/day effective
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-medium">
                    {formatPrice(item.lineTotalMinor, item.currency)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.productId, item.startDate)}
                  >
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
            <button
              type="button"
              onClick={clear}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Clear cart
            </button>
          </div>

          <Card className="h-fit space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t.cart.subtotal}</span>
              <span className="font-semibold">{formatPrice(subtotalMinor, currency)}</span>
            </div>
            {depositMinor > 0 ? (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Deposits</span>
                <span>{formatPrice(depositMinor, currency)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
              <span>Estimated total</span>
              <span>{formatPrice(subtotalMinor + depositMinor, currency)}</span>
            </div>
            <Link href="/checkout" className="block">
              <Button className="w-full">{t.cart.proceed}</Button>
            </Link>
          </Card>
        </div>
      )}
    </main>
  );
}
