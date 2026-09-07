"use client";

import { useTransition } from "react";
import { cx } from "@rentora/ui";
import { LOCALE_NAMES, type Locale } from "@/lib/i18n";
import { setLocaleAction } from "@/lib/actions/locale";

export function LocaleSwitcher({
  locales,
  current,
}: {
  locales: Locale[];
  current: Locale;
}) {
  const [pending, startTransition] = useTransition();

  if (locales.length < 2) return null;

  return (
    <div className="flex items-center" role="group" aria-label="Language">
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          disabled={pending}
          aria-current={locale === current}
          onClick={() => startTransition(() => setLocaleAction(locale))}
          className={cx(
            "px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-instant",
            locale === current ? "text-signal" : "text-paper-faint hover:text-paper",
          )}
          title={LOCALE_NAMES[locale]}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
