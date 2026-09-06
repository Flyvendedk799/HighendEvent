# Tenant isolation testing

Rentora is a shared-database multi-tenant system. Isolation is enforced in application code (and optionally Postgres RLS later). This document describes how we verify that one tenant cannot read or mutate another tenant’s data.

## Threat model (abbreviated)

- Authenticated staff of tenant A must not see bookings/products/customers of tenant B.
- Customer sessions are bound to a single tenant (resolved from host).
- Platform admins may cross tenants only through explicit platform routes with audit logging.
- Background jobs must carry `tenantId` and never broaden scope accidentally.

## Layers under test

1. **Query scoping** — every Prisma call for tenant resources includes `where: { tenantId }`.
2. **Authz** — session / JWT claims include `tenantId` (staff) or are derived from host (customer).
3. **IDOR resistance** — fetching by primary key alone is insufficient; tenant must match.
4. **Unique constraints** — emails and slugs are unique *per tenant*, not globally (except platform users / hostnames).
5. **Jobs** — queue payloads always include `tenantId`; processors filter by it.

## Automated approach

### Unit / domain

Domain package tests do not touch tenancy (pure functions). Isolation lives at API + DB integration layers.

### Integration script

`scripts/check-tenant-isolation.ts` documents and (when `DATABASE_URL` is available) can run conceptual checks:

1. Create two demo tenants (`iso-a`, `iso-b`) with one product each.
2. Assert listing products for A never returns B’s product IDs.
3. Assert updating a product of B while authenticated as A fails / affects 0 rows.
4. Assert booking numbers unique per tenant but can collide across tenants.
5. Print a checklist for API-level IDOR tests to implement against Nest routes.

Run:

```bash
pnpm exec tsx scripts/check-tenant-isolation.ts
```

### CI expectations

- Domain tests always run in CI.
- Full isolation script may require Postgres service; keep it conceptual/skippable when DB is down.
- Add Nest e2e cases that hit `/products/:id` with cross-tenant IDs expecting `404`.

## Manual QA checklist

- [ ] Log into tenant A admin; confirm no B data in lists.
- [ ] Swap `Host` header / subdomain; session cookies must not authorize the other store.
- [ ] Attempt API call with A’s token and B’s resource UUID → 404/403.
- [ ] Custom domain for A does not serve B’s CMS pages.
- [ ] Stripe webhook handlers key off tenant Connect account ID, not client-supplied tenant.

## Future hardening

- Postgres Row Level Security (`SET app.tenant_id`) as defense in depth.
- Contract tests that fail CI if a new Prisma model with `tenantId` lacks a corresponding scoped repository helper.
