import Link from "next/link";
import { CartLink } from "@/components/cart-link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export async function StorefrontHeader({ storeName = "Demo Rentals" }: { storeName?: string }) {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/home" className="font-display text-xl font-semibold tracking-tight text-foreground">
          {storeName}
        </Link>
        <nav className="flex items-center gap-3 text-sm text-muted-foreground sm:gap-5">
          <Link href="/catalog" className="hover:text-foreground">
            {t.nav.catalog}
          </Link>
          <CartLink label={t.nav.cart} />
          <Link href="/account" className="hover:text-foreground">
            {t.nav.account}
          </Link>
          <LocaleSwitcher locale={locale} />
          <Link
            href="/admin"
            className="rounded-lg bg-primary px-3 py-1.5 text-white hover:bg-primary-hover"
          >
            {t.nav.admin}
          </Link>
        </nav>
      </div>
    </header>
  );
}
