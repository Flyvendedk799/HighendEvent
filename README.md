# Rentora

Multi-tenant SaaS for party and event equipment rental businesses. Each tenant gets a branded
storefront, a booking engine that understands turnaround time, Stripe Connect payouts, and an
operations console their crew can run a Saturday on.

## Architecture

```
apps/
  web/       Next.js storefront, tenant admin, platform console, marketing
  api/       NestJS HTTP API (auth, catalog, availability, bookings, payments)
  worker/    BullMQ consumers (transactional email, PDF, Stripe sync, SSL)
packages/
  domain/    Pure domain logic (pricing, availability, delivery, booking status)
  db/        Prisma schema, migrations, client (@rentora/db)
  ui/        Shared React + Tailwind design system (@rentora/ui)
docs/        Operator, deploy, and isolation guides
legacy/      Original Flask single-tenant Festudlej app (behavioural reference only)
```

| Layer | Role |
| --- | --- |
| **Tenancy** | Every row is scoped by `tenantId`. Requests resolve a tenant from `X-Tenant-Slug`, a subdomain, a verified custom domain, or the caller token. |
| **Payments** | Platform billing via Stripe Subscriptions; rental payouts via Stripe Connect Express destination charges. |
| **Jobs** | Redis + BullMQ for email, invoices, Connect sync, domain SSL, availability reindex. |
| **Data** | PostgreSQL via Prisma. Migrations are committed and applied on deploy. |

The web app never talks to Postgres. It calls the API over HTTP, which is what lets it live on
Vercel while the database stays private.

## Prerequisites

- Node.js 22+
- [pnpm](https://pnpm.io) 9.15+
- Docker (Postgres + Redis)

## Setup

```bash
docker compose up -d          # Postgres + Redis
cp .env.example .env
pnpm install
pnpm db:generate
pnpm db:deploy                # apply committed migrations
pnpm db:seed                  # demo tenant with real data
pnpm dev                      # web + api + worker
```

Then open:

| Surface | Address |
| --- | --- |
| Marketing | http://localhost:3000 |
| Demo storefront | http://demo.localhost:3000 |
| Tenant admin | http://demo.localhost:3000/admin |
| Platform console | http://admin.localhost:3000 |

### Seeded accounts

| Role | Email | Password |
| --- | --- | --- |
| Platform operator | `admin@alarent.app` | `admin123` |
| Tenant owner | `owner@demo.rentora.local` | `demo1234` |
| Tenant staff | `crew@demo.rentora.local` | `demo1234` |
| Customer | `maja@example.com` | `customer123` |

Override them with `SEED_PLATFORM_PASSWORD`, `SEED_STAFF_PASSWORD` and
`SEED_CUSTOMER_PASSWORD`. The seed is idempotent — running it twice does not duplicate anything.

## What works without third-party keys

Rentora degrades honestly rather than pretending. With no external credentials:

| Missing | What happens |
| --- | --- |
| `STRIPE_SECRET_KEY` | Checkout completes and the booking is created, and both the customer and the admin are told plainly that no card was charged. |
| `STRIPE_WEBHOOK_SECRET` | Webhooks are accepted with a logged warning. **Set it in production** — without it, any POST could mark a booking paid. |
| `RESEND_API_KEY` | Email is rendered and logged; the worker reports `delivered: false` rather than claiming a send. |
| `R2_*` / `S3_*` | The media library says uploads are switched off and offers image URLs instead. |
| `MAPBOX_ACCESS_TOKEN` | Delivery distance falls back to a deterministic estimate, labelled as such. |

## Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Run web, API and worker together |
| `pnpm build` | Build every package and app |
| `pnpm test` | Domain and API unit tests |
| `pnpm typecheck` | Typecheck the workspace |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:migrate` | Create a migration from schema changes (development) |
| `pnpm db:deploy` | Apply committed migrations (deploy) |
| `pnpm db:seed` | Seed the demo tenant |
| `pnpm db:check-migrations` | Fail if the schema has drifted from the migrations |
| `pnpm check:isolation` | Assert two tenants cannot see each other, against a real database |
| `pnpm test:e2e` | Playwright smoke: browse → book → see it in admin |

## Packages

- **`@rentora/domain`** — availability with prep/cleanup buffers, weekday/weekend/package
  pricing, delivery distance fees, booking status transitions. No I/O, fully unit-tested.
- **`@rentora/db`** — Prisma schema, committed migrations, client singleton, seed.
- **`@rentora/ui`** — the design system ("Dispatch"): near-black ground, hairline grid, zero
  radius, IBM Plex Sans for human copy and Plex Mono for machine data, one acid signal colour a
  tenant may re-point. App shell, tables, dialogs, toasts, filters, money and status formatting,
  and the occupancy board and availability calendar shared by storefront and console.
- **`@rentora/worker`** — BullMQ consumers on `REDIS_URL`.

## Tenant isolation

This is the property the whole product rests on, so it is enforced in three places and tested:

1. Every query is scoped by `tenantId` through `requireTenantId()`.
2. `RolesGuard` refuses a token belonging to tenant A on a request resolved to tenant B, and
   treats `READONLY` staff as read-only on every non-GET route by default.
3. `pnpm check:isolation` asserts the behaviour against real Postgres in CI.

See [docs/TENANT_ISOLATION.md](./docs/TENANT_ISOLATION.md).

## Legacy

The previous single-tenant Flask application lives under [`/legacy`](./legacy). It is kept as a
behavioural reference (buffers, deposit/remainder, Danish localisation). Do not add features
there.

## Docs

- [Deploying](./docs/DEPLOY.md) — Vercel, API and worker, environment variables
- [Operator guide](./docs/OPERATOR.md) — tenancy, Stripe Connect, custom domains, GDPR
- [Tenant isolation](./docs/TENANT_ISOLATION.md)
- [heroplan.md](./heroplan.md) — the plan this codebase was built against

## License

MIT
