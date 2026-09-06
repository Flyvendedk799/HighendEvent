# Operator guide — Rentora

Operational reference for running the multi-tenant platform.

## Tenancy

- Each customer business is a **Tenant** (`slug`, plan, Stripe IDs, feature flags).
- Public storefronts resolve tenant by:
  1. Custom domain (`CustomDomain.hostname`, `verified = true`), or
  2. Subdomain `{slug}.{PLATFORM_DOMAIN}`.
- Staff and customers are unique per tenant (`@@unique([tenantId, email])`).
- Suspend a tenant with `isSuspended = true` to block checkout and admin writes.

### Plans

| Plan | Typical use |
| --- | --- |
| `STARTER` | Single store, platform fee higher |
| `GROWTH` | Custom domains, more staff seats |
| `SCALE` | Higher limits, lower application fee |

Platform subscription prices are configured via `STRIPE_PLATFORM_PRICE_*` env vars.

## Stripe Connect

1. Tenant starts Connect onboarding from admin → creates Express account (`stripeConnectAccountId`).
2. When onboarding completes, set `connectOnboarded = true` (webhook / `stripe-sync` job).
3. Checkout PaymentIntents use destination charges (or separate charges + transfer) with `applicationFeeBps`.
4. Platform subscription is billed to `stripeCustomerId` / `stripeSubscriptionId` independently of Connect.

### Operator checklist

- [ ] Platform Stripe keys and webhook secret set
- [ ] Connect webhook events: `account.updated`, `capability.updated`
- [ ] Application fee bps matches plan
- [ ] Test mode vs live mode consistent across web + worker

## Custom domains

1. Tenant adds hostname in admin → `CustomDomain` row (`sslStatus = pending`).
2. They create DNS: CNAME → platform edge / load balancer.
3. Enqueue `domain-ssl` job to verify DNS and issue TLS.
4. Mark `verified = true` and `sslStatus = active` when ready.
5. Middleware maps `Host` header → tenant before auth.

## GDPR / data subject requests

| Request | Operator action |
| --- | --- |
| **Access** | Export customer + bookings for `(tenantId, email)` including carts, consents, newsletter. |
| **Erasure** | Soft-delete bookings (`isDeleted`), scrub PII fields, deactivate customer, remove newsletter row. Retain anonymized financial aggregates where legally required. |
| **Consent** | Record in `ConsentLog` (`kind`, `granted`, `subject`). |
| **Portability** | JSON export of customer profile, bookings, and invoices metadata. |

Platform operators (no tenant) use `PlatformUser` and must never read tenant PII without an audited reason (`AuditLog` with `actorType = PLATFORM`).

## Background jobs

Workers (`apps/worker`) consume Redis queues:

| Queue | Purpose |
| --- | --- |
| `email` | Render HTML + send (stub → Resend) |
| `pdf` | Invoice / receipt generation |
| `stripe-sync` | Refresh Connect / subscription state |
| `domain-ssl` | DNS verify + cert provision |
| `availability-reindex` | Rebuild availability projections |

Ensure `REDIS_URL` is set and workers restart cleanly on deploy (SIGINT/SIGTERM handled).

## Web deploy (Vercel)

In the Vercel project **Settings → General → Root Directory**, set **`apps/web`** (this cannot be set via `vercel.json`).

With that root:

- `apps/web/vercel.json` installs/builds from the monorepo root so `@rentora/domain` and `@rentora/ui` resolve.
- Set `NEXT_PUBLIC_API_URL` to the public API base URL for the environment.
- API and worker deploy separately (Fly/Render/Railway/etc.); Vercel only hosts Next.js.

If Root Directory is left at the repository root instead, root `vercel.json` builds the web app with `outputDirectory: apps/web/.next`.

## Incident notes

- Prefer tenant-scoped queries always (`tenantWhere(tenantId)`).
- If isolation is suspected broken, run `pnpm exec tsx scripts/check-tenant-isolation.ts` and see [TENANT_ISOLATION.md](./TENANT_ISOLATION.md).
