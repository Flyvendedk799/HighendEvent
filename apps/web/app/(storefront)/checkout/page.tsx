"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { useCart } from "@/lib/cart";
import { clientApi } from "@/lib/client-api";
import { getDictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";

type CheckoutSessionResponse = {
  stub: boolean;
  id: string;
  url: string;
  bookingId: string;
  bookingNo: string;
  amountMinor: number;
  currency: string;
};

export default function CheckoutPage() {
  const t = getDictionary("en");
  const router = useRouter();
  const { items, clear, subtotalMinor, depositMinor } = useCart();
  const currency = items[0]?.currency ?? "DKK";
  const [deliveryType, setDeliveryType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const estimatedTotal = useMemo(
    () => subtotalMinor + depositMinor,
    [subtotalMinor, depositMinor],
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    const first = items[0]!;
    const sameDates = items.every(
      (i) => i.startDate === first.startDate && i.endDate === first.endDate,
    );
    if (!sameDates) {
      setError("All cart lines must share the same rental dates for checkout.");
      return;
    }

    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const origin = window.location.origin;

    try {
      const session = await clientApi<CheckoutSessionResponse>("/checkout/session", {
        method: "POST",
        body: JSON.stringify({
          successUrl: `${origin}/confirmation`,
          cancelUrl: `${origin}/checkout`,
          customerName: String(form.get("name") || ""),
          email: String(form.get("email") || ""),
          phone: String(form.get("phone") || ""),
          address: String(form.get("address") || ""),
          zipCode: String(form.get("zipCode") || ""),
          city: String(form.get("city") || ""),
          deliveryType,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            startDate: i.startDate,
            endDate: i.endDate,
          })),
        }),
      });

      clear();
      if (session.url) {
        window.location.href = session.url;
        return;
      }
      router.push(`/confirmation?booking_id=${session.bookingId}&session_id=${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <main>
        <PageHeader title={t.checkout.title} description="Guest checkout with delivery or pickup." />
        <Card className="space-y-4 p-8 text-center">
          <p className="text-muted-foreground">Add rentals to your cart before checking out.</p>
          <Link href="/catalog" className="inline-block">
            <Button>Browse catalog</Button>
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main>
      <PageHeader title={t.checkout.title} description="Guest checkout with delivery or pickup." />
      <form className="grid gap-6 lg:grid-cols-2" onSubmit={onSubmit}>
        <Card className="space-y-4">
          <h2 className="font-display text-xl font-semibold">{t.checkout.contact}</h2>
          <Input name="name" label="Full name" placeholder="Maja Nielsen" required />
          <Input name="email" type="email" label="Email" placeholder="maja@example.com" required />
          <Input name="phone" label="Phone" placeholder="+45 12 34 56 78" required />
        </Card>
        <Card className="space-y-4">
          <h2 className="font-display text-xl font-semibold">{t.checkout.delivery}</h2>
          <div className="grid gap-3">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
              <input
                type="radio"
                name="fulfillment"
                checked={deliveryType === "DELIVERY"}
                onChange={() => setDeliveryType("DELIVERY")}
                className="accent-teal-700"
              />
              <span>
                <span className="font-medium">Delivery</span>
                <span className="block text-sm text-muted-foreground">
                  Address required · fee calculated when zones are configured
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
              <input
                type="radio"
                name="fulfillment"
                checked={deliveryType === "PICKUP"}
                onChange={() => setDeliveryType("PICKUP")}
                className="accent-teal-700"
              />
              <span>
                <span className="font-medium">Pickup</span>
                <span className="block text-sm text-muted-foreground">Collect from warehouse</span>
              </span>
            </label>
          </div>
          <Input
            name="address"
            label={deliveryType === "DELIVERY" ? "Delivery address" : "Billing address"}
            placeholder="Street"
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="zipCode" label="ZIP" placeholder="2100" required />
            <Input name="city" label="City" placeholder="Copenhagen" required />
          </div>

          <div className="space-y-2 rounded-lg bg-muted p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lines</span>
              <span>{items.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(subtotalMinor, currency)}</span>
            </div>
            {depositMinor > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposits</span>
                <span>{formatMoney(depositMinor, currency)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>Estimated due now</span>
              <span>{formatMoney(estimatedTotal, currency)}</span>
            </div>
            <p className="text-muted-foreground">
              {t.checkout.payment}: Stripe Checkout redirect (stub when no secret key)
            </p>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Starting payment…" : t.checkout.placeOrder}
          </Button>
        </Card>
      </form>
    </main>
  );
}
