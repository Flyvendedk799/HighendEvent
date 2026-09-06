"use client";

import Link from "next/link";
import { Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { getDictionary } from "@/lib/i18n";

export default function CheckoutPage() {
  const t = getDictionary("en");

  return (
    <main>
      <PageHeader title={t.checkout.title} description="Guest checkout with delivery or pickup." />
      <form className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="font-display text-xl font-semibold">{t.checkout.contact}</h2>
          <Input name="name" label="Full name" placeholder="Maja Nielsen" required />
          <Input name="email" type="email" label="Email" placeholder="maja@example.com" required />
          <Input name="phone" label="Phone" placeholder="+45 12 34 56 78" />
        </Card>
        <Card className="space-y-4">
          <h2 className="font-display text-xl font-semibold">{t.checkout.delivery}</h2>
          <div className="grid gap-3">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
              <input type="radio" name="fulfillment" defaultChecked className="accent-teal-700" />
              <span>
                <span className="font-medium">Delivery</span>
                <span className="block text-sm text-muted-foreground">Zone-based fee at checkout</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
              <input type="radio" name="fulfillment" className="accent-teal-700" />
              <span>
                <span className="font-medium">Pickup</span>
                <span className="block text-sm text-muted-foreground">Collect from warehouse</span>
              </span>
            </label>
          </div>
          <Input name="address" label="Delivery address" placeholder="Street, city, ZIP" />
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            {t.checkout.payment}: Stripe Checkout (redirect) — demo mode.
          </div>
          <Link href="/confirmation">
            <Button type="button" className="w-full" size="lg">
              {t.checkout.placeOrder}
            </Button>
          </Link>
        </Card>
      </form>
    </main>
  );
}
