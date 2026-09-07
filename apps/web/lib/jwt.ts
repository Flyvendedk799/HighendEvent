export type AuthRole = "platform" | "staff" | "customer";

export type SessionUser = {
  sub: string;
  email: string;
  name?: string;
  role: AuthRole;
  tenantId?: string;
  tenantSlug?: string;
  staffRole?: "OWNER" | "MANAGER" | "STAFF" | "READONLY";
  exp?: number;
  iat?: number;
};

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const withPadding = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  // atob exists in both the Edge runtime (middleware) and Node 18+.
  const binary = atob(withPadding);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Reads the claims out of a token WITHOUT verifying the signature.
 *
 * This is only ever used to decide what to render and where to redirect. The API verifies the
 * signature on every request, so a forged cookie buys nothing beyond a UI that immediately 401s.
 */
export function decodeSessionToken(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as SessionUser;
    if (!payload?.sub || !payload?.role) return null;
    if (payload.exp && payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
