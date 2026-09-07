/**
 * A tenant gets one colour.
 *
 * Dispatch is a single system — near-black ground, hairline grid, one acid signal — and a shop
 * looking like itself means moving the signal, not repainting the board. Ink and paper stay put
 * because the storefront's availability grid and the warehouse console are the same primitive,
 * and a tenant who picks a pale background would break the one screen that has to stay readable.
 */

/** Only well-formed hex colours reach the stylesheet — theme tokens are tenant-supplied. */
function safeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) || /^#[0-9a-fA-F]{3}$/.test(trimmed) ? trimmed : null;
}

function expandHex(hex: string): [number, number, number] {
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  return [
    parseInt(full.slice(1, 3), 16),
    parseInt(full.slice(3, 5), 16),
    parseInt(full.slice(5, 7), 16),
  ];
}

/** Relative luminance, per WCAG. */
function luminance(hex: string): number {
  const channels = expandHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = expandHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Mixes the signal toward ink to get the hairline that outlines a chip filled with it. Derived
 * rather than asked for: no tenant should have to pick five shades to get a readable status chip.
 */
function towardInk(hex: string, keep: number): string {
  const [r, g, b] = expandHex(hex);
  const mix = (v: number, ink: number) => Math.round(v * keep + ink * (1 - keep));
  return `rgb(${mix(r, 0x0c)}, ${mix(g, 0x0d)}, ${mix(b, 0x0f)})`;
}

export function ThemeTokens({
  brandColors,
  tokens,
}: {
  brandColors?: Record<string, string> | null;
  tokens?: Record<string, string> | null;
}) {
  const merged = { ...(brandColors ?? {}), ...(tokens ?? {}) };
  // `signal` is the token's real name; `primary` is what the older theme editor wrote.
  const signal = safeHex(merged.signal) ?? safeHex(merged.primary);
  if (!signal) return null;

  const declarations = [
    `--signal:${signal};`,
    // Text laid on the signal colour flips to ink or paper on whichever actually reads.
    `--signal-ink:${luminance(signal) > 0.45 ? "#0C0D0F" : "#EDEEEA"};`,
    `--signal-press:#EDEEEA;`,
    `--signal-line:${towardInk(signal, 0.38)};`,
    `--signal-tint:${rgba(signal, 0.12)};`,
    `--signal-tint-strong:${rgba(signal, 0.24)};`,
  ];

  return (
    <style
      // Every value is derived from one validated hex, so this cannot inject arbitrary CSS.
      dangerouslySetInnerHTML={{
        __html: `.alarent-store{${declarations.join("")}}`,
      }}
    />
  );
}
