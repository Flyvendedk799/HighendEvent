import { redirect } from "next/navigation";
import { Banner } from "@rentora/ui";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { readCart } from "@/lib/actions/cart";
import { getSession } from "@/lib/session";
import { getBootstrap } from "@/lib/tenant";

export const metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [summary, bootstrap, session] = await Promise.all([
    readCart(),
    getBootstrap(),
    getSession(),
  ]);

  // Nothing to pay for, or something in the cart is no longer bookable.
  if (summary.cart.items.length === 0 || !summary.checkoutReady) {
    redirect("/cart");
  }

  const locale = bootstrap?.store.localeDefault ?? "en";

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Checkout</h1>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {summary.itemCount} item{summary.itemCount === 1 ? "" : "s"} ·{" "}
        {summary.paymentModel === "DEPOSIT_REMAINDER"
          ? "Pay a deposit now, the balance before your dates"
          : "Pay in full to confirm"}
      </p>

      {!bootstrap?.tenant.connectOnboarded ? (
        <Banner tone="info" className="mt-5">
          This store is still finishing its payment setup, so no card will be charged yet. Your
          booking will be held and the team will be in touch.
        </Banner>
      ) : null}

      <div className="mt-6">
        <CheckoutForm
          summary={summary}
          deliveryEnabled={bootstrap?.features.deliveryEnabled ?? false}
          locale={locale}
          prefill={
            session?.role === "customer"
              ? { email: session.email, name: session.name }
              : null
          }
        />
      </div>
    </div>
  );
}
