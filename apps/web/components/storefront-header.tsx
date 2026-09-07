import Link from "next/link";
import { LiveDot } from "@rentora/ui";
import { CartLink } from "@/components/cart-link";
import { LocaleSwitcher } from "@/components/storefront/locale-switcher";
import type { Dictionary, Locale } from "@/lib/i18n";

export type StorefrontHeaderProps = {
  storeName: string;
  logoUrl?: string | null;
  categories: Array<{ id: string; name: string; slug: string }>;
  pages: Array<{ slug: string; title: string }>;
  isLoggedIn: boolean;
  locale: Locale;
  locales: Locale[];
  t: Dictionary;
};

export function StorefrontHeader({
  storeName,
  logoUrl,
  categories,
  pages,
  isLoggedIn,
  locale,
  locales,
  t,
}: StorefrontHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-measure items-center justify-between gap-5 px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.12em] text-paper-mute md:px-gutter">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2.5 text-paper">
          <LiveDot />
          {logoUrl ? (
            // The tenant logo is an arbitrary remote URL, so it stays a plain img rather than
            // forcing every tenant domain into next.config image hosts.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={storeName} className="h-6 w-auto max-w-[150px] object-contain" />
          ) : (
            <span className="truncate font-semibold tracking-[0.22em]">{storeName}</span>
          )}
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/catalog" className="transition-colors duration-instant hover:text-signal">
            {t.nav.catalog}
          </Link>
          {categories.slice(0, 3).map((category) => (
            <Link
              key={category.id}
              href={`/catalog?category=${category.slug}`}
              className="transition-colors duration-instant hover:text-signal"
            >
              {category.name}
            </Link>
          ))}
          {pages.slice(0, 2).map((page) => (
            <Link
              key={page.slug}
              href={`/pages/${page.slug}`}
              className="transition-colors duration-instant hover:text-signal"
            >
              {page.title}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LocaleSwitcher locales={locales} current={locale} />
          <CartLink label={t.nav.cart} />
          <Link
            href={isLoggedIn ? "/account/dashboard" : "/account/login"}
            className="hidden border border-line-strong px-3.5 py-2 transition-colors duration-instant hover:border-signal hover:text-signal sm:block"
          >
            {isLoggedIn ? t.nav.myBookings : t.nav.login}
          </Link>
        </div>
      </div>

      {/* Categories stay reachable on a phone without a menu to open. */}
      <nav className="flex gap-5 overflow-x-auto border-t border-line-soft px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-paper-mute md:hidden">
        <Link href="/catalog" className="whitespace-nowrap">
          {t.nav.catalog}
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/catalog?category=${category.slug}`}
            className="whitespace-nowrap"
          >
            {category.name}
          </Link>
        ))}
        <Link
          href={isLoggedIn ? "/account/dashboard" : "/account/login"}
          className="whitespace-nowrap sm:hidden"
        >
          {isLoggedIn ? t.nav.myBookings : t.nav.login}
        </Link>
      </nav>
    </header>
  );
}
