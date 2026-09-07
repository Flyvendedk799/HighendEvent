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

### Guard-level tests

`apps/api/src/auth/roles.guard.spec.ts` asserts the authorization rules directly:

- a tenant-A token is refused on a request resolved to tenant B (the tenant comes from a header
  the caller controls, so the token has to be the authority);
- `READONLY` staff may read but not write on any non-GET route, by default rather than per route;
- explicit `@StaffRoles` seniority is enforced, and platform operators are exempt from it;
- legacy password hashes still verify and are flagged for upgrade.

`apps/api/src/catalog/tenant-isolation.spec.ts` asserts the service layer never returns another
tenant's rows, including when fetched by primary key.

### Integration script

`scripts/check-tenant-isolation.ts` runs against a real database and **fails CI** when any
assertion breaks. It creates two tenants side by side and checks:

1. Listing products for A never returns B's products.
2. `findFirst` by B's id with A's tenantId returns null.
3. `updateMany` and `deleteMany` across tenants affect zero rows.
4. Category slugs and customer emails may collide across tenants but not within one.
5. Bookings are scoped the same way.

Without a reachable database it prints the checklist and exits 0, so local work is not blocked.

```bash
pnpm check:isolation
```

### CI expectations

CI runs Postgres as a service, applies the committed migrations, seeds, and then runs
`pnpm check:isolation` — a failure there fails the build. Domain and API unit tests always run.

### Known cross-tenant surfaces

These are the places that legitimately cross a tenant boundary. Each one is locked to the
`platform` principal and writes an `AuditLog` entry naming the operator:

- `GET /platform/tenants` and the tenant detail view
- `PATCH /platform/tenants/:id/suspend`, `/plan`, `/flags`
- `POST /platform/tenants/:id/view-as` — support impersonation, 30-minute token, audited
  **before** the token is issued

Everything else resolves exactly one tenant. A global `AuditInterceptor` records every
successful mutation by an identified principal, with request bodies redacted.

## Manual QA checklist

- [ ] Log into tenant A admin; confirm no B data in lists.
- [ ] Swap `Host` header / subdomain; session cookies must not authorize the other store.
- [ ] Attempt API call with A’s token and B’s resource UUID → 404/403.
- [ ] Custom domain for A does not serve B’s CMS pages.
- [ ] Stripe webhook handlers key off tenant Connect account ID, not client-supplied tenant.

## Future hardening

- Postgres Row Level Security (`SET app.tenant_id`) as defense in depth.
- Contract tests that fail CI if a new Prisma model with `tenantId` lacks a corresponding scoped repository helper.
