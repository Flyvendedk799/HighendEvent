"use client";

import { useState, useTransition } from "react";
import {
  Badge,
  Banner,
  Button,
  Card,
  CardHeader,
  Input,
  LiveDot,
  cx,
  useToast,
} from "@rentora/ui";
import { updateThemeAction, type StoreSettings } from "@/lib/actions/store";

/**
 * A tenant gets one colour.
 *
 * alarent is a single visual system — near-black ground, hairline grid, one acid signal — and a
 * shop looking like itself means moving the signal, not repainting the board. Ink and paper are
 * not editable: the storefront's availability grid and the warehouse console are the same
 * primitive, and a shop that picked a pale background would break the one screen that has to
 * stay readable at arm's length in a van.
 */
const PRESETS: Array<{ name: string; signal: string }> = [
  { name: "Acid", signal: "#D7FF3E" },
  { name: "Sodium", signal: "#FFB020" },
  { name: "Hazard", signal: "#FF6A52" },
  { name: "Ice", signal: "#7DE2FF" },
  { name: "Mint", signal: "#4BE0A8" },
  { name: "Bone", signal: "#EDEEEA" },
];

function normalise(value: string): string {
  const trimmed = value.trim();
  return (trimmed.startsWith("#") ? trimmed : `#${trimmed}`).toUpperCase();
}

function isHex(value: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(value);
}

function channels(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function luminance(hex: string): number {
  const parts = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2];
}

/** Contrast against the page ground — the number that decides whether a chip is readable. */
function contrastOnInk(hex: string): number {
  const ink = 0.0055;
  const l = luminance(hex);
  return (Math.max(l, ink) + 0.05) / (Math.min(l, ink) + 0.05);
}

function inkOn(hex: string): string {
  return luminance(hex) > 0.45 ? "#0C0D0F" : "#EDEEEA";
}

export function ThemeEditor({ store }: { store: StoreSettings }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const stored = { ...(store.brandColors ?? {}), ...(store.theme?.tokens ?? {}) };
  const initialSignal = normalise(stored.signal ?? stored.primary ?? PRESETS[0]!.signal);

  const [signal, setSignal] = useState(initialSignal);
  const [logoUrl, setLogoUrl] = useState(store.logoUrl ?? "");
  const [faviconUrl, setFaviconUrl] = useState(store.faviconUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  const valid = isHex(signal);
  const contrast = valid ? contrastOnInk(signal) : 0;
  const dirty =
    signal !== initialSignal ||
    logoUrl !== (store.logoUrl ?? "") ||
    faviconUrl !== (store.faviconUrl ?? "");

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateThemeAction({
        // `primary` is written alongside `signal` so an older storefront build still reads it.
        tokens: { signal, primary: signal },
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
    <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <div className="space-y-5">
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <Card>
          <CardHeader
            title="Your signal colour"
            description="Lime by default. It marks anything live, selected or actionable — buttons, the selected dates on the calendar, a confirmed booking on the board."
          />
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => setSignal(preset.signal)}
                aria-pressed={signal === preset.signal}
                className={cx(
                  "flex items-center gap-2.5 border px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-instant",
                  signal === preset.signal
                    ? "border-signal text-paper"
                    : "border-line-strong text-paper-mute hover:border-paper-ghost",
                )}
              >
                <span
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 border border-line-strong"
                  style={{ background: preset.signal }}
                />
                <span className="truncate">{preset.name}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-end gap-3">
            <input
              type="color"
              aria-label="Signal colour"
              value={valid ? signal : "#D7FF3E"}
              onChange={(e) => setSignal(e.target.value.toUpperCase())}
              className="h-10 w-14 shrink-0 cursor-pointer border border-line-strong bg-transparent p-1"
            />
            <Input
              label="Hex"
              aria-label="Signal colour hex"
              value={signal}
              onChange={(e) => setSignal(normalise(e.target.value))}
              error={valid ? undefined : "Six-digit hex, e.g. #D7FF3E"}
            />
          </div>

          {valid ? (
            <p
              className={cx(
                "mt-3 font-mono text-[11px]",
                contrast >= 4.5 ? "text-paper-mute" : "text-warn",
              )}
            >
              {contrast.toFixed(1)}:1 against the page.{" "}
              {contrast >= 4.5
                ? "Readable as text and as a chip."
                : "Too dark to read as text on the page — it will still work as a button fill, but status words in this colour will be hard to read."}
            </p>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Brand marks" />
          <div className="space-y-4">
            <Input
              label="Logo URL"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
              hint="Shown instead of your store name in the header. A light mark on a dark ground."
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
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-faint">
            {dirty ? "Unsaved changes" : "Everything saved"}
          </p>
          <Button onClick={save} loading={pending} disabled={!dirty || !valid}>
            Save theme
          </Button>
        </div>
      </div>

      <ThemePreview
        signal={valid ? signal : "#D7FF3E"}
        storeName={store.name}
        logoUrl={logoUrl}
        currency={store.currency}
      />
    </div>
  );
}

/**
 * A miniature of the real storefront chrome, driven by the same variables the storefront reads,
 * so what is previewed here is what shoppers get — including the calendar, which is the screen
 * the colour choice actually matters on.
 */
function ThemePreview({
  signal,
  storeName,
  logoUrl,
  currency,
}: {
  signal: string;
  storeName: string;
  logoUrl: string;
  currency: string;
}) {
  const ink = inkOn(signal);
  const style = { "--signal": signal, "--signal-ink": ink } as React.CSSProperties;

  return (
    <div className="lg:sticky lg:top-[76px] lg:self-start">
      <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-paper-mute">
        Storefront preview
      </p>

      <div style={style} className="border border-line bg-ink">
        <div className="flex items-center justify-between border-b border-line px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-paper-mute">
          <span className="flex items-center gap-2.5 text-paper">
            <LiveDot />
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-5 w-auto max-w-[110px] object-contain" />
            ) : (
              <span className="font-semibold tracking-[0.2em]">{storeName}</span>
            )}
          </span>
          <span className="flex gap-4">
            <span>Catalogue</span>
            <span>Cart · 2</span>
          </span>
        </div>

        <div className="p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal">
            {storeName}
          </p>
          <p className="mt-2.5 text-[22px] font-semibold leading-none tracking-[-0.03em]">
            Everything your event needs
          </p>
          <span className="mt-4 inline-block bg-signal px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-signal-ink">
            Browse the catalogue
          </span>

          <div className="mt-5 grid grid-cols-2 gap-px border border-line bg-line">
            {[1, 2].map((i) => (
              <div key={i} className="bg-ink-raised">
                <div className="flex aspect-[4/3] items-center justify-center border-b border-line bg-ink-sunk plate">
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper-ghost">
                    photo
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-[13px] font-semibold tracking-[-0.015em]">Marquee {i}</p>
                  <p className="mt-1.5 font-mono text-[11px] tabular-nums text-paper-mute">
                    2.500 {currency} <span className="text-paper-faint">/ day</span>
                  </p>
                  <span className="mt-2 inline-block border border-signal-line bg-signal-tint px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-signal">
                    4 in fleet
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border border-line bg-ink-raised">
            <p className="border-b border-line px-3 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper-mute">
              Choose your dates
            </p>
            <div className="grid grid-cols-7">
              {Array.from({ length: 21 }, (_, i) => (
                <span
                  key={i}
                  className={cx(
                    "flex aspect-[1/0.86] items-start border-b border-l border-line-soft px-1.5 py-1 font-mono text-[10px] tabular-nums",
                    i >= 8 && i <= 10
                      ? "bg-signal text-signal-ink"
                      : i === 3 || i === 15
                        ? "bg-danger-tint text-[#FF8A72]"
                        : "text-paper-soft",
                  )}
                >
                  {i + 1}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3.5 flex items-center gap-2.5 text-[12.5px] text-paper-mute">
        <Badge tone="success">Live</Badge>
        Saving applies this colour to your storefront immediately.
      </p>
    </div>
  );
}
