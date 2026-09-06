import Link from "next/link";
import { getDictionary } from "@/lib/i18n";

export function StorefrontHeader({ storeName = "Demo Rentals" }: { storeName?: string }) {
  const t = getDictionary("en");

  return (
    <header className="border-b border-border/80 bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/home" className="font-display text-xl font-semibold text-foreground">
          {storeName}
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground sm:gap-6">
          <Link href="/catalog" className="hover:text-foreground">
            {t.nav.catalog}
          </Link>
          <Link href="/cart" className="hover:text-foreground">
            {t.nav.cart}
          </Link>
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
