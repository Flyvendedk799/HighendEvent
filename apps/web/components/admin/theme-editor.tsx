"use client";

import { useState, useTransition } from "react";
import {
  Badge,
  Banner,
  Button,
  Card,
  CardHeader,
  Input,
  Select,
  useToast,
} from "@rentora/ui";
import { updateThemeAction, type StoreSettings } from "@/lib/actions/store";

const COLOR_FIELDS = [
  { key: "primary", label: "Primary", hint: "Buttons, links, selected dates." },
  { key: "accent", label: "Accent", hint: "Badges and highlights." },
  { key: "foreground", label: "Text", hint: "Body copy and headings." },
  { key: "background", label: "Page background", hint: "Behind everything." },
  { key: "surface", label: "Cards", hint: "Panels and cards on the page." },
] as const;

const PRESETS: Array<{ name: string; tokens: Record<string, string> }> = [
  {
    name: "Teal (default)",
    tokens: {
      primary: "#0F766E",
      accent: "#F59E0B",
      foreground: "#0F172A",
      background: "#F8FAFC",
      surface: "#FFFFFF",
    },
  },
  {
    name: "Ink",
    tokens: {
      primary: "#1E293B",
      accent: "#D97706",
      foreground: "#0B1220",
      background: "#F5F5F4",
      surface: "#FFFFFF",
    },
  },
  {
    name: "Rose",
    tokens: {
      primary: "#BE123C",
      accent: "#F59E0B",
      foreground: "#1F2937",
      background: "#FFF7F7",
      surface: "#FFFFFF",
    },
  },
  {
    name: "Forest",
    tokens: {
      primary: "#166534",
      accent: "#CA8A04",
      foreground: "#14261A",
      background: "#F6FAF6",
      surface: "#FFFFFF",
    },
  },
];

function normalise(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith("#") ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`;
}

export function ThemeEditor({ store }: { store: StoreSettings }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const initial: Record<string, string> = {
    ...PRESETS[0]!.tokens,
    ...(store.brandColors ?? {}),
    ...(store.theme?.tokens ?? {}),
  };

  const [tokens, setTokens] = useState<Record<string, string>>(initial);
  const [radius, setRadius] = useState(initial.radius ?? "lg");
  const [logoUrl, setLogoUrl] = useState(store.logoUrl ?? "");
  const [faviconUrl, setFaviconUrl] = useState(store.faviconUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  const dirty =
    JSON.stringify({ ...tokens, radius }) !== JSON.stringify({ ...initial, radius: initial.radius ?? "lg" }) ||
    logoUrl !== (store.logoUrl ?? "") ||
    faviconUrl !== (store.faviconUrl ?? "");

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateThemeAction({
        tokens: { ...tokens, radius },
        logoUrl: logoUrl || null,
        faviconUrl: faviconUrl || null,
      });
      if (result.error) {
        setError(result.error);
        toast({ title: "Could not save the theme", description: result.error, tone: "error" });
      } else {
        toast({ title: "Theme saved", description: "Your storefront is already using it." });
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <div className="space-y-6">
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <Card>
          <CardHeader title="Start from a palette" />
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => setTokens({ ...tokens, ...preset.tokens })}
                className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-left text-sm hover:border-[var(--color-primary)]"
              >
                <span className="flex gap-0.5">
                  {["primary", "accent", "foreground"].map((key) => (
                    <span
                      key={key}
                      className="h-4 w-4 rounded-full border border-black/10"
                      style={{ background: preset.tokens[key] }}
                    />
                  ))}
                </span>
                <span className="truncate">{preset.name}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Colours" />
          <div className="space-y-3">
            {COLOR_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label={field.label}
                  value={tokens[field.key] ?? "#000000"}
                  onChange={(e) =>
                    setTokens((current) => ({ ...current, [field.key]: e.target.value.toUpperCase() }))
                  }
                  className="h-9 w-12 shrink-0 cursor-pointer rounded border border-[var(--color-border)] bg-transparent p-0.5"
                />
                <div className="min-w-0 flex-1">
                  <Input
                    aria-label={`${field.label} hex`}
                    value={tokens[field.key] ?? ""}
                    onChange={(e) =>
                      setTokens((current) => ({
                        ...current,
                        [field.key]: normalise(e.target.value),
                      }))
                    }
                    className="h-8 font-mono text-xs"
                  />
                  <p className="mt-0.5 text-[11px] text-[var(--color-muted-foreground)]">
                    {field.label} — {field.hint}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Shape and brand marks" />
          <div className="space-y-4">
            <Select
              label="Corner rounding"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              options={[
                { value: "none", label: "Square" },
                { value: "sm", label: "Subtle" },
                { value: "md", label: "Rounded" },
                { value: "lg", label: "Soft (default)" },
                { value: "xl", label: "Very soft" },
              ]}
            />
            <Input
              label="Logo URL"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
              hint="Shown instead of your store name in the header."
            />
            <Input
              label="Favicon URL"
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {dirty ? "Unsaved changes" : "Everything saved"}
          </p>
          <Button onClick={save} loading={pending} disabled={!dirty}>
            Save theme
          </Button>
        </div>
      </div>

      <ThemePreview
        tokens={tokens}
        radius={radius}
        storeName={store.name}
        logoUrl={logoUrl}
        currency={store.currency}
      />
    </div>
  );
}

const RADIUS_SCALE: Record<string, string> = {
  none: "0px",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
};

/**
 * A miniature of the real storefront chrome. It uses the same tokens the storefront reads, so
 * what is previewed here is what shoppers get.
 */
function ThemePreview({
  tokens,
  radius,
  storeName,
  logoUrl,
  currency,
}: {
  tokens: Record<string, string>;
  radius: string;
  storeName: string;
  logoUrl: string;
  currency: string;
}) {
  const style = {
    "--p": tokens.primary ?? "#0F766E",
    "--a": tokens.accent ?? "#F59E0B",
    "--fg": tokens.foreground ?? "#0F172A",
    "--bg": tokens.background ?? "#F8FAFC",
    "--sf": tokens.surface ?? "#FFFFFF",
    "--r": RADIUS_SCALE[radius] ?? "0.75rem",
  } as React.CSSProperties;

  return (
    <div className="lg:sticky lg:top-20 lg:self-start">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
        Storefront preview
      </p>
      <div
        style={style}
        className="overflow-hidden rounded-xl border border-[var(--color-border)] shadow-sm"
      >
        <div
          style={{ background: "var(--sf)", color: "var(--fg)" }}
          className="flex items-center justify-between border-b border-black/5 px-4 py-3"
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-6 w-auto max-w-[120px] object-contain" />
          ) : (
            <span className="font-display text-base font-semibold">{storeName}</span>
          )}
          <span className="flex items-center gap-3 text-xs opacity-70">
            <span>Catalog</span>
            <span>Cart</span>
          </span>
        </div>

        <div style={{ background: "var(--bg)", color: "var(--fg)" }} className="p-4">
          <div
            style={{ background: "var(--fg)", borderRadius: "var(--r)" }}
            className="p-5 text-white"
          >
            <p className="text-[10px] uppercase tracking-widest opacity-60">{storeName}</p>
            <p className="mt-1 font-display text-lg font-semibold">
              Everything your event needs
            </p>
            <span
              style={{ background: "var(--p)", borderRadius: "var(--r)" }}
              className="mt-3 inline-block px-3 py-1.5 text-xs font-medium text-white"
            >
              Browse the catalog
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                style={{ background: "var(--sf)", borderRadius: "var(--r)" }}
                className="overflow-hidden border border-black/5"
              >
                <div
                  style={{ background: "var(--bg)" }}
                  className="flex aspect-[4/3] items-center justify-center text-[10px] opacity-40"
                >
                  Photo
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold">Marquee {i}</p>
                  <p className="mt-1 text-[11px] opacity-60">
                    From 2,500 {currency} / day
                  </p>
                  <span
                    style={{ background: "var(--a)", borderRadius: "var(--r)" }}
                    className="mt-2 inline-block px-1.5 py-0.5 text-[9px] font-semibold text-slate-900"
                  >
                    Tents
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{ background: "var(--sf)", borderRadius: "var(--r)" }}
            className="mt-4 border border-black/5 p-3"
          >
            <p className="text-[11px] font-semibold">Choose your dates</p>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {Array.from({ length: 21 }, (_, i) => (
                <span
                  key={i}
                  style={{
                    background: i >= 8 && i <= 10 ? "var(--p)" : "transparent",
                    color: i >= 8 && i <= 10 ? "#fff" : undefined,
                    borderRadius: "calc(var(--r) / 2)",
                  }}
                  className={
                    i === 3 || i === 15
                      ? "flex h-6 items-center justify-center text-[9px] opacity-25"
                      : "flex h-6 items-center justify-center text-[9px]"
                  }
                >
                  {i + 1}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
        <Badge tone="neutral">Live</Badge>
        Saving applies these colours to your storefront immediately.
      </p>
    </div>
  );
}
