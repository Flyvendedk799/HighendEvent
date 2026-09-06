"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LocaleSwitcher({ locale }: { locale: "en" | "da" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(next: "en" | "da") {
    document.cookie = `rentora_locale=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5 text-xs">
      {(["en", "da"] as const).map((code) => (
        <button
          key={code}
          type="button"
          disabled={pending}
          onClick={() => setLocale(code)}
          className={`rounded-md px-2 py-1 font-medium uppercase transition ${
            locale === code ? "bg-teal-700 text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
