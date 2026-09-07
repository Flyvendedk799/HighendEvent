/**
 * The platform's own domain, and the addresses derived from it.
 *
 * Every tenant gets a free `<slug>.<platform domain>` address the moment it is created, and keeps
 * it whether or not it ever connects a domain of its own. That address is quoted back to users in
 * the admin console, the platform console, onboarding and billing copy, so it has to come from one
 * place — a literal copied into each of those screens silently rots the day the platform is
 * rebranded, and the tenant is told to visit a host that no longer resolves.
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

/**
 * Where a tenant points the CNAME for a domain they own. Distinct from the platform domain because
 * it resolves to the edge rather than to any one tenant.
 */
export function customDomainTarget(): string {
  return (
    process.env.CUSTOM_DOMAIN_TARGET ?? `cname.${platformDomain()}`
  ).trim().toLowerCase();
}
