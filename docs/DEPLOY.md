# Deploying Rentora

Rentora is three deployables plus two managed services:

| Piece | What it is | Where it runs |
| --- | --- | --- |
| `apps/web` | Next.js storefront, tenant admin, platform console | Vercel |
| `apps/api` | NestJS HTTP API | Any Node host (Fly, Render, Railway, Docker) |
| `apps/worker` | BullMQ consumers (email, PDF, Stripe sync, SSL) | Same host as the API |
| PostgreSQL | System of record | Managed Postgres (Neon, Supabase, RDS) |
| Redis | Job queue | Managed Redis (Upstash, Redis Cloud) |

The web app never talks to Postgres. It only calls the API over HTTP, which is why it can live
on Vercel while the database stays inside a private network.

## 1. Database

Migrations are committed under `packages/db/prisma/migrations`. Deploys apply them; they are
never generated at deploy time.

```bash
DATABASE_URL=postgresql://... pnpm db:deploy   # prisma migrate deploy
DATABASE_URL=postgresql://... pnpm db:seed     # optional demo tenant
```

CI fails if `schema.prisma` has drifted from the committed migrations (`pnpm db:check-migrations`).

## 2. Web on Vercel

Import the repository and keep **Root Directory = the repository root**. The committed
`vercel.json` then drives the build:

- Install: `pnpm install --frozen-lockfile`
- Build: builds `@rentora/domain` and `@rentora/ui`, then `@rentora/web`
- Output: `apps/web/.next`

There is deliberately only one `vercel.json`, at the root. A second one inside `apps/web` would
be a competing source of truth for the same build.

Required environment variables:

| Variable | Example | Why |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.rentora.app` | Where the browser-facing server calls the API |
| `PLATFORM_DOMAIN` | `rentora.app` | Distinguishes apex marketing from `{tenant}.rentora.app` |

### Wildcard domains

Tenant storefronts are subdomains, so add `*.rentora.app` as a wildcard domain on the Vercel
project. Customer domains are added per tenant and resolved through the `CustomDomain` table —
the edge middleware forwards the browser hostname to the API as `x-tenant-host`, and only
`verified` domains resolve.

## 3. API and worker

Both are plain Node processes. Build once, run the compiled output:

```bash
pnpm --filter @rentora/domain --filter @rentora/db build
pnpm --filter @rentora/api build      # -> apps/api/dist
pnpm --filter @rentora/worker build   # -> apps/worker/dist

node apps/api/dist/main.js
node apps/worker/dist/index.js
```

Required environment variables:

| Variable | Used by | Notes |
| --- | --- | --- |
| `DATABASE_URL` | api, worker | Postgres connection string |
| `REDIS_URL` | worker | BullMQ queue |
| `JWT_SECRET` | api | **Must** be set in production; the dev default is not a secret |
| `CORS_ORIGIN` | api | Comma-separated list of allowed web origins |
| `PLATFORM_DOMAIN` | api | Subdomain tenant resolution |
| `STRIPE_SECRET_KEY` | api, worker | Omit to run checkout in clearly-labelled stub mode |
| `STRIPE_WEBHOOK_SECRET` | api | Verifies inbound Stripe events |
| `R2_*` / `S3_*` | api | Object storage for media; uploads are disabled without them |
| `RESEND_API_KEY` | worker | Transactional email; without it mail is logged, not sent |
| `MAPBOX_ACCESS_TOKEN` | api | Delivery distance geocoding |

`docker-compose.yml` at the repository root starts Postgres and Redis for local work.

## 4. Health checks

- API: `GET /health`
- Web: any route; the middleware runs on every request

## 5. Order of operations for a release

1. `pnpm db:deploy` against production Postgres
2. Deploy the API and worker (they share the schema)
3. Deploy the web app

Migrations are additive, so the API can be deployed after the migration without downtime.
