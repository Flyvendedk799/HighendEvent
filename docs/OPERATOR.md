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

- [ ] `STRIPE_WEBHOOK_SECRET` set. Without it the API accepts unverified webhooks and logs a
      warning on every one — any POST could mark a booking paid. This is the single most
      important production setting.
- [ ] Platform Stripe keys set
- [ ] Connect webhook events: `account.updated`, `capability.updated`
- [ ] Application fee bps matches plan
- [ ] Test mode vs live mode consistent across web + worker

## Custom domains

1. The tenant adds a hostname in **Settings → Domains**. Growth and Scale only, and the plan
   check is enforced in the service that creates the row, not just hidden in the UI.
2. Rentora shows two DNS records: a TXT challenge proving ownership, and the routing record
   (CNAME, or ALIAS for an apex domain).
3. The tenant clicks **Check DNS**. The API resolves the TXT record for real and only then sets
   `verified = true`. Verification is never granted on the tenant's word — an unverified
   hostname that resolved would let one tenant serve traffic for a name they do not own.
4. The edge middleware forwards the browser-facing hostname to the API as `x-tenant-host`; the
   API resolves it against `CustomDomain` and **only matches verified rows**.
5. Point `CUSTOM_DOMAIN_TARGET` at your edge so the instructions show the right value.

A hostname is globally unique. A domain already connected to another store is refused with a
message that does not reveal which store holds it.

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
| `email` | Load the tenant template, interpolate, wrap in tenant branding, send via Resend |
| `pdf` | Invoice / receipt generation |
| `stripe-sync` | Refresh Connect / subscription state |
| `domain-ssl` | DNS verify + cert provision |
| `availability-reindex` | Rebuild availability projections |

Ensure `REDIS_URL` is set and workers restart cleanly on deploy (SIGINT/SIGTERM handled).

## Incident notes

- Prefer tenant-scoped queries always (`tenantWhere(tenantId)`).
- If isolation is suspected broken, run `pnpm check:isolation` and see
  [TENANT_ISOLATION.md](./TENANT_ISOLATION.md).
- Every mutation by an identified principal is written to `AuditLog` with the request body
  redacted. Read recent entries from the platform console, or query by `tenantId`.
- Support impersonation (**View as owner**) issues a 30-minute staff token and is audited before
  the token exists. The operator has to sign in again afterwards.
