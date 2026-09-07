import Link from "next/link";
import { Banner, Button, EmptyState } from "@rentora/ui";
import { CartLines } from "@/components/storefront/cart-lines";
import { CartTotals } from "@/components/storefront/cart-totals";
import { readCart } from "@/lib/actions/cart";
import { getBootstrap } from "@/lib/tenant";
import { getLocale, getT } from "@/lib/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t.cart.title };
}
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const [summary, t, locale] = await Promise.all([readCart(), getT(), getLocale()]);

  if (summary.cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <EmptyState
          title={t.cart.emptyTitle}
          description={t.cart.emptyBody}
          action={
            <Button asChild>
              <Link href="/catalog">{t.cart.browse}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <header className="border-b border-line pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
          {summary.itemCount} item{summary.itemCount === 1 ? "" : "s"} held
        </p>
        <h1 className="mt-4 text-[clamp(30px,4.4vw,50px)] font-semibold leading-[0.98] tracking-[-0.04em]">
          {t.cart.title}
        </h1>
      </header>

      {summary.issues.length > 0 ? (
        <Banner tone="warning" title={t.cart.needsAttention} className="mt-6">
          <ul className="space-y-1">
            {summary.issues.map((issue) => (
              <li key={issue.itemId} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 bg-warn" />
                {issue.message}
              </li>
            ))}
          </ul>
        </Banner>
      ) : null}

      <div className="mt-7 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
        <CartLines
          items={summary.cart.items}
          issues={summary.issues}
          currency={summary.currency}
          locale={locale}
          t={t}
        />
        <CartTotals summary={summary} locale={locale} t={t} />
      </div>
    </div>
  );
}
