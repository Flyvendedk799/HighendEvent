"use client";

import { useEffect, useState, useTransition } from "react";
import { Banner, Button, Input, Select, Spinner, cx } from "@rentora/ui";
import { Check, X } from "lucide-react";
import { checkSlugAction, signUpAction } from "@/lib/actions/onboarding";

const CURRENCIES = ["DKK", "EUR", "GBP", "USD", "SEK", "NOK"];

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

export function SignupForm({ platformDomain }: { platformDomain: string }) {
  const [pending, startTransition] = useTransition();

  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currency, setCurrency] = useState("DKK");
  const [country, setCountry] = useState("DK");

  const [slugState, setSlugState] = useState<{
    checking: boolean;
    available: boolean | null;
    reason: string | null;
  }>({ checking: false, available: null, reason: null });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(businessName));
  }, [businessName, slugTouched]);

  // Availability is checked against the API as they type, so nobody fills in the whole form
  // only to be told the address is taken.
  useEffect(() => {
    if (slug.length < 3) {
      setSlugState({ checking: false, available: null, reason: null });
      return;
    }

    setSlugState((current) => ({ ...current, checking: true }));
    const timer = setTimeout(async () => {
      const result = await checkSlugAction(slug);
      setSlugState({
        checking: false,
        available: result.available ?? null,
        reason: result.reason ?? null,
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [slug]);

  const passwordTooShort = password.length > 0 && password.length < 8;

  const canSubmit =
    businessName.trim().length >= 2 &&
    slugState.available === true &&
    ownerName.trim().length > 0 &&
    email.includes("@") &&
    password.length >= 8 &&
    !pending;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await signUpAction({
        tenantName: businessName.trim(),
        storeName: businessName.trim(),
        slug,
        ownerName: ownerName.trim(),
        ownerEmail: email.trim(),
        ownerPassword: password,
        currency,
        country: country.toUpperCase(),
      });

      if (result.error) setError(result.error);
    });
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) submit();
      }}
    >
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <Input
        label="Business name"
        required
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        placeholder="Copenhagen Party Hire"
        className="h-10"
      />

      <div>
        <Input
          label="Your storefront address"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          suffix={`.${platformDomain}`}
          className="h-10 pr-32"
        />
        <p
          className={cx(
            "mt-1 flex items-center gap-1.5 text-xs",
            slugState.available === true
              ? "text-teal-700"
              : slugState.available === false
                ? "text-red-600"
                : "text-[var(--color-muted-foreground)]",
          )}
        >
          {slugState.checking ? (
            <>
              <Spinner /> Checking…
            </>
          ) : slugState.available === true ? (
            <>
              <Check size={13} /> {slug}.{platformDomain} is available
            </>
          ) : slugState.available === false ? (
            <>
              <X size={13} /> {slugState.reason}
            </>
          ) : (
            "You can connect your own domain later."
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Your name"
          required
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          autoComplete="name"
          className="h-10"
        />
        <Input
          label="Work email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="h-10"
        />
      </div>

      <Input
        label="Password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        className="h-10"
        error={passwordTooShort ? "At least 8 characters." : undefined}
        hint={passwordTooShort ? undefined : "At least 8 characters."}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          options={CURRENCIES.map((c) => ({ value: c, label: c }))}
        />
        <Input
          label="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
          maxLength={2}
          className="h-10"
          hint="Two-letter code."
        />
      </div>

      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!canSubmit}>
        Create my store
      </Button>

      <p className="text-center text-xs text-[var(--color-muted-foreground)]">
        No card needed. You can add products and see how it looks before you take a booking.
      </p>
    </form>
  );
}
