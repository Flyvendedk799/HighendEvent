# Rentora

Multi-tenant SaaS for party / event equipment rental businesses. Tenants get a branded storefront, booking engine, Stripe Connect payouts, and optional custom domains.

## Architecture

```
apps/
  web/       Next.js storefront + tenant/admin consoles
  api/       NestJS HTTP API (auth, bookings, Stripe webhooks)
  worker/    BullMQ background jobs (email, PDF, Stripe sync, SSL, availability)
packages/
  domain/    Pure domain logic (pricing, availability, delivery, booking status)
  db/        Prisma schema + client (@rentora/db)
  ui/        Shared React + Tailwind primitives (@rentora/ui)
docs/        Operator and isolation guides
legacy/      Original Flask single-tenant Festudlej app (reference only)
```

| Layer | Role |
| --- | --- |
| **Tenancy** | Every business row is scoped by `tenantId`. Requests resolve tenant from subdomain or custom domain. |
| **Payments** | Platform billing via Stripe Customer/Subscription; rental payouts via Stripe Connect Express. |
| **Jobs** | Redis + BullMQ workers for email HTML, invoice PDFs, Connect sync, domain SSL, availability reindex. |
| **Data** | PostgreSQL via Prisma (`packages/db`). |

## Prerequisites

- Node.js 22+
- [pnpm](https://pnpm.io) 9.15+
- Docker (Postgres + Redis)

## Setup

```bash
# Infrastructure
docker compose up -d

# Env
cp .env.example .env

# Install
pnpm install

# Database
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# Develop (web + api + worker via turbo)
pnpm dev
```

Demo seed creates:

| Surface | Credentials |
| --- | --- |
| Platform admin | `admin@rentora.app` / `admin123` → `/platform/login` |
| Tenant staff | `owner@demo.rentora.local` / `demo1234` (tenant slug `demo`) → `/admin/login` |

Storefront on `demo.localhost:3000` (or `x-tenant-slug: demo`).

Phase A progress: checked-in Prisma migration, cookie session auth for admin/platform, admin products list reads live `/catalog/products`.

Useful scripts:

| Script | Description |
| --- | --- |
| `pnpm build` | Build all packages/apps |
| `pnpm test` | Run package tests (domain unit tests, etc.) |
| `pnpm typecheck` | Typecheck workspace packages |
| `pnpm db:generate` / `db:migrate` / `db:seed` | Prisma generate, migrate, seed |

## Packages

- **`@rentora/domain`** — availability, pricing, delivery fee, booking status helpers (no I/O).
- **`@rentora/db`** — Prisma schema, client singleton, `tenantWhere()` helper, seed.
- **`@rentora/ui`** — `Button`, `Input`, `Badge`, `Card`, `Spinner` with Tailwind `className` props.
- **`@rentora/worker`** — BullMQ consumers on `REDIS_URL`.

## Legacy

The previous single-tenant Flask application lives under [`/legacy`](./legacy). It is kept for behavioral reference (pricing, availability buffers, Danish localization) while Rentora is the active codebase. Do not add new features there.

## Docs

- [Operator guide](./docs/OPERATOR.md) — tenancy, Stripe Connect, custom domains, GDPR
- [Tenant isolation testing](./docs/TENANT_ISOLATION.md)
- Isolation check script: `pnpm exec tsx scripts/check-tenant-isolation.ts`

## License

MIT
