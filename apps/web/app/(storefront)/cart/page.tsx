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
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t.cart.title}</h1>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {summary.itemCount} item{summary.itemCount === 1 ? "" : "s"}
      </p>

      {summary.issues.length > 0 ? (
        <Banner tone="warning" title={t.cart.needsAttention} className="mt-5">
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {summary.issues.map((issue) => (
              <li key={issue.itemId}>{issue.message}</li>
            ))}
          </ul>
        </Banner>
      ) : null}

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
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
