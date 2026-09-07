import type { Metadata } from "next";
import { StorefrontHeader } from "@/components/storefront-header";
import { StorefrontFooter } from "@/components/storefront-footer";

import { ThemeTokens } from "@/components/theme-tokens";
import { StoreNotFound } from "@/components/store-not-found";
import { getBootstrap } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { getAvailableLocales, getLocale, getT } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const bootstrap = await getBootstrap();
  if (!bootstrap) return { title: "Store not found" };

  const { store } = bootstrap;
  return {
    title: {
      default: store.seoTitle ?? store.name,
      template: `%s · ${store.name}`,
    },
    description: store.seoDescription ?? store.tagline ?? undefined,
    icons: store.faviconUrl ? { icon: store.faviconUrl } : undefined,
    openGraph: {
      siteName: store.name,
      title: store.seoTitle ?? store.name,
      description: store.seoDescription ?? store.tagline ?? undefined,
    },
  };
}

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const bootstrap = await getBootstrap();

  // A host that resolves to no live tenant must say so rather than render half a shop.
  if (!bootstrap) {
    return <StoreNotFound />;
  }

  const [session, locale, locales, t] = await Promise.all([
    getSession(),
    getLocale(),
    getAvailableLocales(),
    getT(),
  ]);

  return (
    <>
      <ThemeTokens brandColors={bootstrap.store.brandColors} tokens={bootstrap.theme.tokens} />
      <div className="rentora-storefront flex min-h-screen flex-col">
        <StorefrontHeader
          storeName={bootstrap.store.name}
          logoUrl={bootstrap.store.logoUrl}
          categories={bootstrap.categories}
          pages={bootstrap.pages}
          isLoggedIn={session?.role === "customer"}
          locale={locale}
          locales={locales}
          t={t}
        />
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</div>
        <StorefrontFooter
          storeName={bootstrap.store.name}
          tagline={bootstrap.store.tagline}
          supportEmail={bootstrap.store.supportEmail}
          supportPhone={bootstrap.store.supportPhone}
          pages={bootstrap.pages}
          t={t}
        />
      </div>
    </>
  );
}
