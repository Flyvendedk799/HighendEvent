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
    <div className="flex items-center gap-0.5" role="group" aria-label="Language">
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          disabled={pending}
          aria-current={locale === current}
          onClick={() => startTransition(() => setLocaleAction(locale))}
          className={cx(
            "rounded px-1.5 py-1 text-xs font-medium uppercase transition",
            locale === current
              ? "bg-[var(--color-muted)] text-[var(--color-foreground)]"
              : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
          )}
          title={LOCALE_NAMES[locale]}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
