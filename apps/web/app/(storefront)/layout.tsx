import { StorefrontHeader } from "@/components/storefront-header";
import { StorefrontProviders } from "@/components/storefront-providers";
import { api } from "@/lib/api";
import { getTenantSlug } from "@/lib/tenant";

type ThemeTokens = {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  foreground?: string;
};

type ThemeCurrent = {
  name: string;
  tokens?: ThemeTokens | null;
  store?: { name?: string | null; logoUrl?: string | null } | null;
};

function cssVars(tokens?: ThemeTokens | null): React.CSSProperties {
  if (!tokens) return {};
  return {
    ...(tokens.primary ? { ["--color-primary" as string]: tokens.primary } : {}),
    ...(tokens.accent ? { ["--color-accent" as string]: tokens.accent } : {}),
    ...(tokens.background ? { ["--color-background" as string]: tokens.background } : {}),
    ...(tokens.foreground ? { ["--color-foreground" as string]: tokens.foreground } : {}),
  };
}

async function loadTheme(tenantSlug: string | null): Promise<ThemeCurrent | null> {
  if (!tenantSlug) return null;
  try {
    return await api.get<ThemeCurrent>("/themes/current", {
      tenantSlug,
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const slug = await getTenantSlug();
  const theme = await loadTheme(slug ?? "demo");
  const storeName =
    theme?.store?.name ??
    (slug ? `${slug.charAt(0).toUpperCase()}${slug.slice(1)} Rentals` : "Demo Rentals");

  return (
    <StorefrontProviders>
      <div className="min-h-screen bg-mesh-light" style={cssVars(theme?.tokens)}>
        <StorefrontHeader storeName={storeName} />
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
      </div>
    </StorefrontProviders>
  );
}
