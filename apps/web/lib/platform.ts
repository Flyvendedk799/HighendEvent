/**
 * The platform's own domain, shared by every surface that quotes a tenant's free address.
 *
 * Mirrors `apps/api/src/common/platform.ts`. Read through these helpers rather than inlining the
 * domain: the admin console, platform console, marketing page and signup form all show the same
 * `<slug>.<platform domain>` address, and they must not be able to disagree.
 */

const DEFAULT_PLATFORM_DOMAIN = "alarent.app";

/** Bare hostname, no port, no scheme. */
export function platformDomain(): string {
  return (process.env.PLATFORM_DOMAIN ?? DEFAULT_PLATFORM_DOMAIN)
    .trim()
    .toLowerCase()
    .split(":")[0]!;
}

/** The free address a tenant is reachable on before it connects its own domain. */
export function tenantSubdomain(slug: string): string {
  return `${slug}.${platformDomain()}`;
}
