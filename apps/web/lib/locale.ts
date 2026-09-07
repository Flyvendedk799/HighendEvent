import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getBootstrap } from "./tenant";
import { getDictionary, isLocale, type Dictionary, type Locale } from "./i18n";

export const LOCALE_COOKIE = "rentora_locale";

/**
 * The language for this request.
 *
 * A shopper's explicit choice wins, but only if the store actually sells in that language —
 * otherwise a stale cookie from another store would show half-translated copy.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const bootstrap = await getBootstrap();
  const available = (bootstrap?.store.locales ?? ["en"]).filter(isLocale);
  const fallback = (isLocale(bootstrap?.store.localeDefault)
    ? bootstrap!.store.localeDefault
    : "en") as Locale;

  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;

  if (isLocale(chosen) && available.includes(chosen)) return chosen;
  return available.includes(fallback) ? fallback : (available[0] ?? "en");
});

export async function getT(): Promise<Dictionary> {
  return getDictionary(await getLocale());
}

/** The languages this store offers, for the switcher. Empty when there is nothing to switch. */
export async function getAvailableLocales(): Promise<Locale[]> {
  const bootstrap = await getBootstrap();
  const available = (bootstrap?.store.locales ?? []).filter(isLocale);
  return available.length > 1 ? available : [];
}
