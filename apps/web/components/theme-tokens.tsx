const COLOR_TOKENS: Record<string, string> = {
  primary: "--color-primary",
  primaryHover: "--color-primary-hover",
  secondary: "--color-secondary",
  accent: "--color-accent",
  background: "--color-background",
  foreground: "--color-foreground",
  surface: "--color-surface",
  muted: "--color-muted",
  border: "--color-border",
};

const RADIUS_SCALE: Record<string, string> = {
  none: "0px",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  full: "9999px",
};

/** Only well-formed hex/rgb colours reach the stylesheet — theme tokens are tenant-supplied. */
function safeColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
  if (/^rgba?\(\s*[\d.\s,%/]+\)$/.test(trimmed)) return trimmed;
  return null;
}

/**
 * Applies the tenant palette by overriding the storefront CSS variables.
 *
 * Changing a colour in the theme editor therefore changes the live storefront without a
 * redeploy, and the admin console is untouched because it scopes its own tokens.
 */
export function ThemeTokens({
  brandColors,
  tokens,
}: {
  brandColors?: Record<string, string> | null;
  tokens?: Record<string, string> | null;
}) {
  const declarations: string[] = [];
  const merged = { ...(brandColors ?? {}), ...(tokens ?? {}) };

  for (const [key, cssVar] of Object.entries(COLOR_TOKENS)) {
    const color = safeColor(merged[key]);
    if (color) declarations.push(`${cssVar}:${color};`);
  }

  const primary = safeColor(merged.primary);
  if (primary && !safeColor(merged.primaryHover)) {
    // A readable hover state without asking every tenant to pick two shades.
    declarations.push(`--color-primary-hover:color-mix(in srgb, ${primary} 85%, #000);`);
  }
  if (primary) declarations.push(`--ring:${primary};`);

  const radius = RADIUS_SCALE[String(merged.radius ?? "")];
  if (radius) declarations.push(`--radius:${radius};`);

  if (declarations.length === 0) return null;

  return (
    <style
      // Values are validated above, so this cannot inject arbitrary CSS.
      dangerouslySetInnerHTML={{
        __html: `.rentora-storefront{${declarations.join("")}}`,
      }}
    />
  );
}
