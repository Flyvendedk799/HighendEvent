import Link from "next/link";
import { CartLink } from "@/components/cart-link";

export type StorefrontHeaderProps = {
  storeName: string;
  logoUrl?: string | null;
  categories: Array<{ id: string; name: string; slug: string }>;
  pages: Array<{ slug: string; title: string }>;
  isLoggedIn: boolean;
};

export function StorefrontHeader({
  storeName,
  logoUrl,
  categories,
  pages,
  isLoggedIn,
}: StorefrontHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)]/80 bg-[var(--color-surface)]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3.5 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          {logoUrl ? (
            // The tenant logo is an arbitrary remote URL, so it stays a plain img rather than
            // forcing every tenant domain into next.config image hosts.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={storeName} className="h-8 w-auto max-w-[160px] object-contain" />
          ) : (
            <span className="font-display text-xl font-semibold tracking-tight">{storeName}</span>
          )}
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-[var(--color-muted-foreground)] md:flex">
          <Link href="/catalog" className="hover:text-[var(--color-foreground)]">
            Catalog
          </Link>
          {categories.slice(0, 3).map((category) => (
            <Link
              key={category.id}
              href={`/catalog?category=${category.slug}`}
              className="hover:text-[var(--color-foreground)]"
            >
              {category.name}
            </Link>
          ))}
          {pages.slice(0, 2).map((page) => (
            <Link
              key={page.slug}
              href={`/pages/${page.slug}`}
              className="hover:text-[var(--color-foreground)]"
            >
              {page.title}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 text-sm text-[var(--color-muted-foreground)]">
          <CartLink label="Cart" />
          <Link
            href={isLoggedIn ? "/account/dashboard" : "/account/login"}
            className="rounded-lg px-3 py-1.5 hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          >
            {isLoggedIn ? "My bookings" : "Log in"}
          </Link>
        </div>
      </div>

      <nav className="flex gap-4 overflow-x-auto border-t border-[var(--color-border)]/60 px-4 py-2 text-sm text-[var(--color-muted-foreground)] md:hidden">
        <Link href="/catalog" className="whitespace-nowrap">
          Catalog
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
      </nav>
    </header>
  );
}
