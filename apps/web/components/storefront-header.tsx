import Link from "next/link";
import { CartLink } from "@/components/cart-link";
import { getDictionary } from "@/lib/i18n";

export function StorefrontHeader({ storeName = "Demo Rentals" }: { storeName?: string }) {
  const t = getDictionary("en");

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/home" className="font-display text-xl font-semibold tracking-tight text-foreground">
          {storeName}
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground sm:gap-6">
          <Link href="/catalog" className="hover:text-foreground">
            {t.nav.catalog}
          </Link>
          <CartLink label={t.nav.cart} />
          <Link href="/account/login" className="hover:text-foreground">
            {t.nav.login}
          </Link>
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
