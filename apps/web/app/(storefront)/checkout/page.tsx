import { redirect } from "next/navigation";
import { Banner } from "@rentora/ui";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { readCart } from "@/lib/actions/cart";
import { getSession } from "@/lib/session";
import { getBootstrap } from "@/lib/tenant";
import { getLocale, getT } from "@/lib/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t.checkout.title };
}
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [summary, bootstrap, session, t, locale] = await Promise.all([
    readCart(),
    getBootstrap(),
    getSession(),
    getT(),
    getLocale(),
  ]);

  // Nothing to pay for, or something in the cart is no longer bookable.
  if (summary.cart.items.length === 0 || !summary.checkoutReady) {
    redirect("/cart");
  }


  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
          {summary.itemCount} item{summary.itemCount === 1 ? "" : "s"} ·{" "}
          {summary.paymentModel === "DEPOSIT_REMAINDER"
            ? t.checkout.payDeposit
            : t.checkout.payInFull}
        </p>
        <h1 className="mt-4 text-[clamp(30px,4.4vw,50px)] font-semibold leading-[0.98] tracking-[-0.04em]">
          {t.checkout.title}
        </h1>
      </header>

      {!bootstrap?.tenant.connectOnboarded ? (
        <Banner tone="info" title="Payments not connected yet" className="mt-6">
          This store is still finishing its payment setup, so no card will be charged yet. Your
          booking will be held and the team will be in touch.
        </Banner>
      ) : null}

      <div className="mt-7">
        <CheckoutForm
          summary={summary}
          deliveryEnabled={bootstrap?.features.deliveryEnabled ?? false}
          locale={locale}
          t={t}
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
