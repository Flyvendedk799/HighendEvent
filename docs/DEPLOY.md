# Deploying Rentora

Rentora is three deployables plus two managed services:

| Piece | What it is | Where it runs |
| --- | --- | --- |
| `apps/web` | Next.js storefront, tenant admin, platform console | ServerHoster (VPS), port 3021 |
| `apps/api` | NestJS HTTP API | ServerHoster (VPS), port 3022 |
| `apps/worker` | BullMQ consumers (email, PDF, Stripe sync, SSL) | Same host as the API |
| PostgreSQL | System of record | ServerHoster-managed Postgres |
| Redis | Job queue | Managed Redis, or a ServerHoster resource |

The web app never talks to Postgres. It only calls the API over HTTP, which is why the API and
the database never need a public hostname: only `apps/web` is published through the tunnel, and
it reaches the API over `localhost`.

## 1. Database

Migrations are committed under `packages/db/prisma/migrations`. Deploys apply them; they are
never generated at deploy time.

```bash
DATABASE_URL=postgresql://... pnpm db:deploy   # prisma migrate deploy
DATABASE_URL=postgresql://... pnpm db:seed     # optional demo tenant
```

CI fails if `schema.prisma` has drifted from the committed migrations (`pnpm db:check-migrations`).

## 2. Web

Required environment variables:

| Variable | Example | Why |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3022` | Where the server calls the API. Server-side only — no client component imports `lib/api` |
| `PLATFORM_DOMAIN` | `alarent.app` | Distinguishes apex marketing from `{tenant}.alarent.app` |

`PLATFORM_DOMAIN` is the single source of truth for every address the product quotes back to a
user. Read it through `apps/web/lib/platform.ts` (and `apps/api/src/common/platform.ts` on the
API side) rather than inlining the domain — the admin console, platform console, signup form and
billing errors all print the same `{slug}.{platform domain}` address and must not disagree.

A Vercel deploy is still possible: the committed root `vercel.json` drives it (root directory =
repository root, output `apps/web/.next`). There is deliberately only one `vercel.json` — a
second inside `apps/web` would be a competing source of truth for the same build.

### Host routing

The edge middleware sorts every request into one of four surfaces by hostname:

| Host | Surface | Serves |
| --- | --- | --- |
| `alarent.app`, `www.alarent.app` | marketing | Public site and signup |
| `admin.alarent.app` | platform | Superadmin console, rewritten under `/platform/*` |
| `{slug}.alarent.app` | tenant | That tenant's storefront, rewritten from `/` to `/home` |
| Anything else | tenant-domain | Resolved against `CustomDomain`; only `verified` rows match |

`www`, `admin`, `app`, `api` and `cdn` are reserved and can never be claimed as a tenant slug.
Only one label deep counts as a tenant subdomain — `a.b.alarent.app` is not a tenant — which is
also exactly what Cloudflare Universal SSL covers.

A custom domain cannot be resolved at the edge, because the mapping lives in the database. The
middleware therefore forwards the browser-facing hostname to the API as `x-tenant-host`, since
the `Host` header on a server-to-server call names the API, not the customer's domain.

### Wildcard domains on ServerHoster

Both the apex and the wildcard are bound to the **web** service through ServerHoster's SaaS
domain API, which writes the Cloudflare DNS record and the tunnel ingress rule together:

```bash
# apex + every tenant subdomain -> the web service
POST /saas/services/<web service id>/domains  {"hostname": "alarent.app"}
POST /saas/services/<web service id>/domains  {"hostname": "*.alarent.app"}
```

Wildcards are only supported inside the operator's own Cloudflare zone; tenant-owned domains are
exact hostnames registered the same way, which routes them through Cloudflare for SaaS (custom
hostnames) instead. That path additionally needs a Cloudflare API token and zone id saved in
ServerHoster settings.

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
