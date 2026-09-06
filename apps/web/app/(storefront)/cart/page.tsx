import Link from "next/link";
import { Button, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { demoProducts, formatPrice } from "@/lib/demo-data";
import { getDictionary } from "@/lib/i18n";

export default function CartPage() {
  const t = getDictionary("en");
  const items = demoProducts.slice(0, 2).map((product) => ({
    ...product,
    qty: 1,
    days: 2,
  }));
  const subtotal = items.reduce((sum, item) => sum + item.priceFrom * item.qty * item.days, 0);

  return (
    <main>
      <PageHeader title={t.cart.title} description="Review rental dates before checkout." />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold">{item.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {item.qty} × {item.days} days · {formatPrice(item.priceFrom, item.currency)}/day
                </p>
              </div>
              <p className="font-medium">
                {formatPrice(item.priceFrom * item.qty * item.days, item.currency)}
              </p>
            </Card>
          ))}
        </div>
        <Card className="h-fit space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.cart.subtotal}</span>
            <span className="font-semibold">{formatPrice(subtotal, "DKK")}</span>
          </div>
          <Link href="/checkout" className="block">
            <Button className="w-full">{t.cart.proceed}</Button>
          </Link>
        </Card>
      </div>
    </main>
  );
}
