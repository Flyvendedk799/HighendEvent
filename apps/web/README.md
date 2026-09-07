# @rentora/web

Next.js 15 (App Router) TypeScript frontend for the Rentora multi-tenant rental CMS.

## Surfaces

| Host | Surface | Routes |
|------|---------|--------|
| `localhost:3000` / apex | Marketing | `/` |
| `{slug}.localhost:3000` | Storefront + tenant admin | `/` → rewritten to `/home`, `/catalog`, `/product/[slug]`, `/cart`, `/checkout`, `/confirmation`, `/account/*`, `/admin/*` |
| `admin.localhost` / `admin.<PLATFORM_DOMAIN>` | Platform admin | rewritten under `/platform/*` |

Middleware sets `x-tenant-slug` for tenant hosts and `x-rentora-surface` for routing context.

## Local development

From the monorepo root:

```bash
pnpm install
pnpm --filter @rentora/web dev
```

Optional env (see `.env.example`):

- `NEXT_PUBLIC_API_URL` — defaults to `http://localhost:4000`
- `PLATFORM_DOMAIN` — defaults to `localhost:3000`

Useful hosts for `/etc/hosts` or browser:

- `http://localhost:3000` — alarent marketing
- `http://demo.localhost:3000` — tenant storefront
- `http://demo.localhost:3000/admin` — tenant admin
- `http://admin.localhost:3000` — platform admin

## Stack

- Next.js 15 App Router + React 19
- Tailwind CSS over the Dispatch tokens in `app/globals.css` (`--ink`, `--line`, `--paper`,
  `--signal`). Ink, line and paper are the system and are not themeable; a tenant may move
  `--signal` and nothing else.
- Fonts: IBM Plex Sans (human copy) + IBM Plex Mono (machine data) via `next/font`. No serif.
- Shared UI: `@rentora/ui` — the design system. `/proof-sheet` renders every primitive together
  in development so a change can be seen against the rest before it ships.
- API helper: `lib/api.ts`
- i18n stub: `lib/i18n.ts` (`en` / `da`)

## Route map

### Marketing — `app/(marketing)/`

- `/` — SaaS landing

### Storefront — `app/(storefront)/`

- `/home` (tenant `/`) — shop home
- `/catalog` — product catalog
- `/product/[slug]` — product detail + date picker
- `/cart`, `/checkout`, `/confirmation`
- `/account/login`, `/register`, `/dashboard`, `/bookings`

### Tenant admin — `app/(admin)/admin/`

- `/admin` dashboard
- `/admin/products`, `/categories`, `/upsells`
- `/admin/bookings`, `/bookings/new`, `/bookings/[id]`
- `/admin/customers`, `/calendar`, `/locations`, `/delivery`
- `/admin/cms`, `/theme`, `/media`, `/analytics`, `/settings`
- `/admin/emails`, `/newsletter`, `/staff`, `/go-live`

### Platform — `app/(platform)/platform/`

- `/platform` overview
- `/platform/tenants`, `/tenants/[slug]`
- `/platform/plans`, `/feature-flags`
