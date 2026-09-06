# Heroplan — Rentora to Shopify-grade rental commerce

> **Audience:** Claude (or equivalent coding agent) executing this plan end-to-end.  
> **Product:** Rentora — multi-tenant white-label SaaS for party/event equipment rental (“Shopify for rentals”).  
> **North star:** A tenant can sign up, brand their store, list inventory, take real paid bookings with smart availability, run daily ops from a dense dashboard, and go live on a custom domain — without ever feeling like a demo.

---

## 0. Honest diagnosis (do not skip)

Rentora today is a **route-complete demo shell** sitting on top of a **partially real API** and a **solid domain/schema layer**.

| Layer | Reality |
| --- | --- |
| `@rentora/domain` | Real: pricing, availability buffers, delivery math, booking status |
| `@rentora/db` Prisma schema | Ambitious and mostly right; migrations/deploy incomplete |
| `apps/api` NestJS | Catalog/bookings/cart CRUD backbone exists; Stripe/media/email/domains stubbed |
| `apps/web` | Almost every page reads `lib/demo-data.ts`; `lib/api.ts` is barely used |
| `apps/worker` | Queues exist; processors mostly log stubs |
| `@rentora/ui` | 5 primitives (Button/Input/Badge/Card/Spinner) — not a design system |
| Admin / platform UI | Sidebar IA looks full; content is fake KPIs and dead buttons |
| Storefront | Product calendar is the only “product-like” surface; checkout/account are theater |
| Legacy Flask (`legacy/`) | Feature-complete single-tenant reference — **behavioral oracle**, not code to copy blindly |

**Root cause of “half-assed” feel:** surface area was sketched before the product was wired. Shopify quality is not more pages — it is **truthful data, irreversible money flows, dense ops UI, and obsessive polish on the paths tenants use every day**.

**Non-goals for this plan:** rewriting Nest→something else, inventing a new brand system from scratch every phase, porting Flask templates 1:1, building a marketplace of apps.

**Hard rules for the executing agent:**
1. Delete or quarantine demo-data usage as each surface goes live — no dual sources of truth.
2. Prefer wiring existing API modules before inventing new ones.
3. Every admin screen must create/read/update/delete real tenant-scoped rows.
4. Dashboard UI quality is a first-class deliverable, not a coat of paint at the end.
5. Ship in vertical slices that a human can click: auth → catalog CRUD → availability → checkout → booking ops → theme → go-live.
6. Do not expand marketing pages until the tenant product path is real.
7. Tenant isolation is sacred: every query uses `tenantId`; add tests when touching data paths.
8. Match legacy *behavior* (buffers, deposit/remainder, calendar occupancy, delivery quote) via `@rentora/domain` + API — not by resurrecting Jinja.

---

## 1. Definition of done — “Shopify-level for rentals”

A reviewer who has used Shopify Admin + a serious rental ops tool should agree on all of the following:

### Merchant experience
- Self-serve signup → tenant + store + owner staff user in < 2 minutes
- Stripe Connect Express onboarding with clear “payouts ready” state
- Product CRUD with images, categories, stock, buffers, weekend pricing, blackouts, upsells
- Theme editor that **actually changes** the live storefront (colors, logo, fonts, hero)
- Custom domain attach + DNS instructions + verified host routing
- Go-live checklist that reads **real** state (products > 0, Connect onboarded, theme saved, domain optional)

### Customer experience
- Branded storefront (not “Demo Rentals” forever)
- Catalog search/filter with real inventory
- Product page: gallery, specs, **smart availability calendar**, live quote, add-to-cart
- Cart → checkout → Stripe Checkout → webhook → confirmation with real booking number
- Customer account: login, bookings list, booking detail, cancel rules if configured
- CMS pages (About / FAQ / Terms) rendered publicly
- Delivery vs pickup with live fee quote when delivery is enabled

### Ops dashboard (the bar you called out)
- Feels like an **operations console**, not a marketing template with tables
- Dense information hierarchy: filters, saved views, keyboard-friendly forms, empty states, skeletons, toasts, confirm dialogs
- Booking detail is the “order page”: timeline, line items, payments, delivery, notes, status machine, resend email, ICS
- Calendar is a real resource calendar (occupancy by product / day), not decorative dots
- No dead buttons. No hardcoded “128.4k DKK”. No “Save” that navigates to a fake id.

### Platform
- Platform admin on real tenants/metrics
- Plan limits enforced
- Suspend/reactivate tenant
- Impersonation or “view as tenant” for support (audit-logged)

### Engineering
- Checked-in Prisma migrations
- CI builds web + api + domain tests + at least one tenant-isolation test
- Vercel (or equivalent) deploys `apps/web` correctly in the monorepo; API/worker have a documented deploy path
- Workers send real email and process Stripe/domain jobs
- `demo-data.ts` removed or reduced to Storybook/fixtures only

---

## 2. Current inventory (ground truth)

### Web routes that must stop being fake
**Storefront:** `/home`, `/catalog`, `/product/[slug]`, `/cart`, `/checkout`, `/confirmation`, `/account/*`  
**Tenant admin:** `/admin`, `/admin/products`, `/admin/categories`, `/admin/upsells`, `/admin/bookings`, `/admin/bookings/new`, `/admin/bookings/[id]`, `/admin/customers`, `/admin/calendar`, `/admin/locations`, `/admin/delivery`, `/admin/cms`, `/admin/theme`, `/admin/media`, `/admin/analytics`, `/admin/settings`, `/admin/emails`, `/admin/newsletter`, `/admin/staff`, `/admin/go-live`  
**Platform:** `/platform`, `/platform/tenants`, `/platform/tenants/[slug]`, `/platform/plans`, `/platform/feature-flags`

### API modules already present (wire these first)
Auth, Catalog, Availability, Pricing, Delivery, Bookings, Cart, Checkout, Customers, Cms, Media, Themes, Locations, DeliverySettings, Analytics, Newsletter, EmailTemplates, Webhooks, Gdpr, Billing, Platform, Onboarding

### Schema models underused / unwired
Coupon, ApiKey, CustomDomain, PricingRule, ProductUnit, NotificationRule, AuditLog writers, featureFlags enforcement

### Design system gap
`@rentora/ui` needs: Table, DataList, Modal/Dialog, Drawer, Select, Combobox, Checkbox, Switch, Textarea, Tabs, Toast, DropdownMenu, Pagination, EmptyState, Skeleton, Form field primitives, DateRangePicker, StatCard, PageHeader (promote from web), ConfirmDialog.

---

## 3. Execution phases

Work **in order**. Later phases assume earlier ones are merged and demo-data is gone from those surfaces. Each phase ends with a **Phase exit checklist**.

---

### Phase A — Foundation: truth, auth, tenancy, deploy spine

**Goal:** A logged-in staff user hits admin and sees **their tenant’s DB data**. No product features yet beyond read paths.

#### A1. Data & migrations
- Add Prisma migrate workflow; commit initial migration from current schema
- Ensure seed creates: platform user, demo tenant, store, theme, staff owner, sample categories/products/images/blackouts, one customer, two bookings with line items, delivery settings, email templates
- Document `pnpm db:migrate` / seed in README; fail CI if migrate is dirty

#### A2. Auth that the browser actually uses
- Staff login + customer login against `POST` auth endpoints
- Prefer httpOnly cookie session **or** BFF pattern in Next (do not leave JWTs in localStorage as the long-term design)
- Protect `/admin/**` and `/platform/**` and `/account/**` in Next middleware
- Role guards: OWNER/MANAGER/STAFF/READONLY honored on mutating API routes
- Password hashing: replace SHA256-salt with bcrypt/argon2 if still weak
- Logout, session refresh, “unauthorized → login with return URL”

#### A3. Tenant resolution
- Resolve tenant from: `x-tenant-slug`, subdomain, **and** `CustomDomain` table (even if SSL is later)
- Store branding bootstrap endpoint: `GET /storefront/bootstrap` → store + theme + locales + currency + feature flags
- Web layout fetches bootstrap; kill hardcoded “Demo Rentals” when slug present

#### A4. Web data layer
- Expand `apps/web/lib/api.ts` into typed client (fetch wrappers per resource)
- React Query or server components + `apiFetch` consistently; pick one primary pattern and stick to it
- Add auth header/cookie forwarding from server components

#### A5. Deploy spine
- Fix Vercel monorepo: Root Directory `apps/web`, install from repo root, build domain then web (see existing `vercel.json` intent)
- Document API + worker deploy (Fly/Render/Railway/Docker) — even if staging-only
- CI: `pnpm --filter @rentora/domain test`, typecheck, build web, build api

**Phase A exit checklist**
- [ ] Login as seeded owner works
- [ ] `/admin/products` lists **seed products from API** (read-only OK)
- [ ] Logged-out `/admin` redirects to login
- [ ] Second tenant cannot read first tenant’s products (automated test)
- [ ] Vercel preview builds web successfully

---

### Phase B — Design system & admin shell (dashboard UI bar)

**Goal:** Before filling every CRUD form, make the admin **feel** like Shopify Admin: dense, calm, fast, consistent.

#### B1. Grow `@rentora/ui`
Implement accessible primitives (Radix + Tailwind is fine) with Rentora tokens:
- Layout: `AppShell`, `Sidebar`, `Topbar`, `Page`, `PageHeader`, `Section`
- Data: `Table` (sortable header slots), `Pagination`, `FilterBar`, `StatCard`, `EmptyState`, `Skeleton`
- Input: `Select`, `Combobox`, `Textarea`, `Checkbox`, `Switch`, `DatePicker` / `DateRangePicker`, `FileDropzone`
- Feedback: `ToastProvider`, `Dialog`, `AlertDialog`, `Drawer`, `DropdownMenu`, `Tabs`, `Banner`
- Commerce: `Money`, `StatusBadge` (booking status tones)

#### B2. Admin IA & interaction patterns
- Active nav state, breadcrumbs, command-ish “Create” primary actions
- List pages: search, filters, bulk select (even if bulk actions come later), row click → detail
- Detail pages: two-column layout (main + sticky aside), status pill, action menu
- Forms: zod schemas, inline validation, dirty-state warn on navigate, save toasts
- Empty states with one clear CTA (never a blank table)
- Loading: skeletons matching final layout (no layout jump)
- Motion: subtle only (sidebar active indicator, toast, modal) — no gimmicky dashboards

#### B3. Visual language for ops (not marketing)
- Admin uses a **neutral dense theme** (light gray canvas, white panels, tight 8px rhythm)
- Storefront keeps expressive brand theme from tenant tokens
- Do **not** make admin look like the marketing site
- Typography: readable tabular nums for money/dates; avoid display serif in data tables

**Phase B exit checklist**
- [ ] All admin routes use AppShell + PageHeader + Table/EmptyState patterns
- [ ] UI package exports cover the list above
- [ ] Dark sidebar + content contrast passes WCAG AA for text
- [ ] One reference screen (Products list + Product edit) is pixel-tight and reusable as the template

---

### Phase C — Catalog & media (merchant’s first real job)

**Goal:** Tenant can fully manage rentable inventory.

#### C1. Products
- List (API), create, edit, archive/soft-delete, duplicate
- Fields: name, slug, description, category, stock qty, prep/cleanup buffers, daily/weekend/weekend-package prices, deposit, tax, active flag, sort order
- Validation mirrors domain constraints
- Product detail admin tabs: General · Pricing · Availability · Media · Upsells

#### C2. Categories & upsells
- Category CRUD + reorder
- Upsell products + attach to products (many-to-many)

#### C3. Blackouts & units
- Per-product blackout date ranges with reason
- If `ProductUnit` is in schema: optional unit-level inventory; otherwise keep qty-based stock honest in UI copy

#### C4. Media pipeline (kill color-block placeholders)
- Real upload to R2/S3 (presigned URL flow)
- Image reorder, alt text, set primary
- Worker or API generates variants (at least max-width web + thumb)
- Storefront gallery uses real URLs

**Phase C exit checklist**
- [ ] Create product in admin → appears on storefront catalog after publish
- [ ] Upload 3 images → product page gallery works
- [ ] Blackout dates show as unavailable on storefront calendar
- [ ] No `demoProducts` imports remain on catalog/product/admin product pages

---

### Phase D — Availability calendar & pricing truth

**Goal:** The calendar is the product. It must be unmistakably better than a pair of `<input type="date">`.

#### D1. Domain-backed availability API
- `GET /availability/calendar?productId&from&to&qty`
- Returns per-day: availableQty, isBlackedOut, isAvailable
- Include prep/cleanup buffer occupancy (already in `@rentora/domain`)
- Admin overview: multi-product month/week occupancy

#### D2. Storefront calendar UX
- Month grid, range selection, blocked days, stock-aware qty
- Live quote via pricing endpoint (weekday/weekend/package/deposit/tax)
- Clear copy for buffers (“blocked for prep/cleanup”)
- Mobile: full-width calendar, sticky booking CTA

#### D3. Admin calendar
- Port legacy intent of overview + product calendars (FullCalendar or custom)
- Drag-select blackout (optional), click through to booking
- Color legend consistent with storefront
- ICS feed link that works with staff JWT or signed feed token

**Phase D exit checklist**
- [ ] Two overlapping bookings reduce available qty correctly
- [ ] Weekend package pricing matches domain tests
- [ ] Admin calendar shows the same occupancy the storefront uses
- [ ] Visual QA screenshots attached for desktop + mobile product page

---

### Phase E — Cart, checkout, Stripe Connect (money path)

**Goal:** Real money or clearly labeled test-mode money. No “demo mode” theater buttons.

#### E1. Cart
- Replace localStorage-only cart with server cart when logged in; guest cart id cookie OK
- Line items store productId, qty, start, end, priced snapshot
- Cart page editable qty/dates with revalidation against availability

#### E2. Checkout
- Contact + fulfillment (pickup/delivery)
- Delivery quote from API (Mapbox when configured; deterministic stub only in dev)
- Create booking in `PENDING_PAYMENT` → Stripe Checkout Session on Connect account
- Success/cancel URLs → confirmation / cart with errors
- Idempotent webhook: mark paid, schedule emails, clear cart

#### E3. Deposits & remainder
- Support `FULL_UPFRONT` and `DEPOSIT_REMAINDER` from store settings
- Admin: collect remainder / send payment link (legacy strength)
- Booking detail shows payment timeline

#### E4. Connect onboarding
- Admin Settings → “Set up payouts” → Stripe Account Link
- `connectOnboarded` reflected in go-live checklist
- Application fee bps from plan

**Phase E exit checklist**
- [ ] Test-mode card completes a booking end-to-end
- [ ] Webhook idempotency test passes
- [ ] Confirmation page shows **real** booking number from DB
- [ ] Failure paths: sold-out between cart and pay, abandoned checkout

---

### Phase F — Booking ops console (dashboard crown jewel)

**Goal:** Staff live in `/admin/bookings` all day. This screen set must feel unfinished until it is better than legacy Flask admin.

#### F1. Bookings list
- Columns: number, customer, dates, status, fulfillment, total, payment state, source
- Filters: status, date range, product, q search
- Quick actions: copy number, open customer, change status (allowed transitions only)

#### F2. Booking detail (order page)
- Header: number, status machine, amounts due
- Sections: line items, customer, schedule, delivery address/map link, payments, notes/timeline, emails sent
- Actions: edit notes, reschedule (recheck availability), cancel, mark returned, charge damage fee if modeled, resend confirmation, download ICS/PDF invoice
- Soft-delete + restore if schema supports

#### F3. Manual booking create
- Staff create flow with availability preview and price preview **before** save
- Attach existing or create customer

#### F4. Customers
- List/detail, booking history, GDPR export/delete triggers

**Phase F exit checklist**
- [ ] Status transitions enforce domain rules
- [ ] Manual booking appears on calendars immediately
- [ ] Staff can run a full day of ops without touching the database
- [ ] Zero hardcoded booking rows in web

---

### Phase G — Storefront CMS, theme, white-label

**Goal:** Each tenant looks like their own shop.

#### G1. Theme runtime
- Load theme tokens into CSS variables on storefront layout
- Logo, favicon, radii, fonts (next/font or CSS import allowlist)
- Theme admin: live preview pane + Save → PATCH themes API

#### G2. CMS pages
- Admin editor (MDX or structured blocks — pick one; blocks closer to Shopify pages)
- Public routes: `/pages/[slug]` or `/p/[slug]`
- Seed About/FAQ/Terms

#### G3. Homepage builder (keep constrained)
- Hero, featured products, how-it-works — driven by store + CMS settings, not code edits
- Do not build a full page builder in v1; constrain to 3–5 sections

#### G4. SEO
- Per-page title/description, OpenGraph image, sitemap.xml, robots.txt

**Phase G exit checklist**
- [ ] Change primary color in admin → storefront updates without redeploy
- [ ] CMS page reachable publicly
- [ ] Tenant A branding never leaks onto Tenant B

---

### Phase H — Comms, workers, notifications

**Goal:** The product talks to humans.

#### H1. Email
- Resend (or SES) provider in worker
- Templates from DB with variable interpolation
- Triggers: booking confirmed, payment reminder, status change, refund, staff invite
- Admin: preview template, send test

#### H2. Newsletter
- Subscribe endpoint + admin list export
- Campaigns can be v2; list + export is enough for v1

#### H3. In-app notification rules
- Wire `NotificationRule` or delete from schema until used — **no zombie models**

**Phase H exit checklist**
- [ ] Completing a test booking sends a real email in staging
- [ ] Worker retries failed jobs; dead-letter visible in logs
- [ ] Email content includes correct tenant branding/name

---

### Phase I — Platform, plans, limits, domains

**Goal:** Rentora the SaaS, not just a single demo shop.

#### I1. Platform admin on real data
- Tenant list, detail, suspend, plan change, feature flags persisted
- Metrics from DB aggregates (MRR stub OK until Billing is live)

#### I2. Billing
- Stripe Customer + Subscription for tenant plans
- Enforce limits: product count, staff seats, custom domain allowed

#### I3. Custom domains
- Add domain, show DNS records, verify, provision SSL (worker job)
- Middleware resolves verified domains only

#### I4. Onboarding funnel
- Marketing CTA → create account → create tenant → empty-state admin with guided checklist
- Kill “coming soon” CTAs

**Phase I exit checklist**
- [ ] New tenant signup works without seed intervention
- [ ] Suspended tenant storefront shows maintenance/unavailable
- [ ] Custom domain verification path documented and tested on staging

---

### Phase J — Analytics, coupons, API, polish pass

**Goal:** Close the gap from “works” to “would pay for”.

#### J1. Analytics
- Real charts from bookings/payments (Recharts/visx)
- Utilization by product, revenue, conversion funnel basics

#### J2. Coupons
- Wire Coupon model: % or fixed, date window, usage limits
- Checkout applies + admin CRUD

#### J3. Staff invites
- Invite by email, accept link, role assignment UI

#### J4. Developer features (Scale plan)
- API keys, webhook endpoints outbound on booking events

#### J5. i18n
- Make `en`/`da` switch real (storefront + email); admin can stay English-first initially
- Currency/locale formatting everywhere via store settings

#### J6. Quality bar pass
- Lighthouse: storefront LCP/CLS targets
- Accessibility audit on admin tables/modals
- Delete `demo-data.ts` or move to `apps/web/fixtures` used only in tests
- Error boundaries + Sentry (or equivalent)
- Audit log writes on admin mutations

**Phase J exit checklist**
- [ ] `rg demo-data apps/web` returns no production imports
- [ ] Coupon happy-path test
- [ ] DA locale storefront smoke test
- [ ] Performance budget documented

---

## 4. Dashboard UI specification (explicit)

Treat this as a product spec, not vibes.

### Principles
1. **Density with breath** — Shopify-like: tight tables, but 24–32px page padding, clear section gaps
2. **One primary action** per page (top-right)
3. **Objects over dashboards** — products, bookings, customers are the nouns; KPIs serve them
4. **Status is sacred** — color + label + allowed transitions; never free-text status edits
5. **Money is tabular** — right-aligned, consistent currency, show tax/deposit breakdown
6. **Dates are ranges** — always show timezone from store settings
7. **Empty > fake** — empty states beat demo numbers every time

### Required admin screens fidelity
| Screen | Must include |
| --- | --- |
| Home | Real KPIs, today’s agenda from bookings, attention list ( unpaid / departing today ) |
| Products | Filterable table + product editor tabs |
| Bookings | Filterable table + full order detail |
| Calendar | Month/week resource view tied to API |
| Customers | Search + detail with history |
| Theme | Preview that mirrors storefront chrome |
| Settings | Store, tax, payments, domains, danger zone |
| Go-live | Checklist bound to real boolean/API checks |

### Anti-patterns to remove
- Decorative charts with invented series
- Buttons with no `onClick` / no link target
- “Save” that `router.push` to a random id
- Marketing gradients inside ops tables
- Mixing storefront display fonts into admin data UI

---

## 5. Legacy parity map (use as acceptance tests)

For each row, implement behavior in Rentora and add a test or scripted QA note:

| Legacy capability | Rentora target |
| --- | --- |
| Product buffers prep/cleanup | Domain + calendar |
| Weekend day rate + Fri–Sun package | Domain pricing |
| FullCalendar availability colors | Storefront + admin calendar |
| Stripe checkout + webhooks | Checkout + worker |
| Deposit / remainder | Store payment model + booking payments |
| Delivery distance fee | Delivery settings + quote API |
| CMS pages | CmsPage public render |
| Email templates on status | Worker + templates |
| Manual booking + price preview | Admin booking create |
| Soft delete bookings | API + admin UI |
| Return / damage notes | Booking detail fields |
| ICS feed | Signed URL feed |
| Staff roles | RBAC |
| Customer portal | Account area |
| Image bulk upload | Media module |
| Newsletter list | Newsletter module |

---

## 6. Suggested implementation order for a strong coding agent

If executing continuously, follow this sequence of PRs (small enough to review, large enough to matter):

1. `chore`: Prisma migration + seed hardening + CI/Vercel spine  
2. `feat`: Auth cookies + middleware guards + admin products **read** from API  
3. `feat`: `@rentora/ui` primitives + admin shell redesign  
4. `feat`: Product/category CRUD + media uploads  
5. `feat`: Availability API + storefront calendar wired to API  
6. `feat`: Cart/checkout/Stripe webhook E2E  
7. `feat`: Booking ops list/detail/manual create  
8. `feat`: Theme runtime + CMS public pages  
9. `feat`: Email worker + templates  
10. `feat`: Platform admin + Connect + domains + go-live  
11. `feat`: Analytics/coupons/i18n/polish + delete demo-data  

Do not open parallel PRs that both edit `demo-data` and API wiring for the same screen.

---

## 7. Testing strategy

- **Domain:** keep vitest green; extend for every pricing/availability edge found in legacy
- **API:** tenant isolation tests on catalog/bookings; webhook idempotency; authz negative tests
- **Web:** Playwright smoke — login → create product → view storefront → book → admin sees booking
- **Visual:** screenshot storefront product + admin booking detail in CI or PR artifacts
- **Manual:** Stripe test mode card `4242…`, Connect test onboarding

---

## 8. Explicit out-of-scope (v1 Heroplan)

- Native mobile apps
- Multi-warehouse complexity beyond locations already modeled
- Full drag-and-drop page builder
- Marketplace / plugin ecosystem
- AI chatbot support
- Rebuilding marketing site endlessly
- Feature flags for every button before CRUD exists

---

## 9. Working agreements while executing

- Prefer deleting fake UI over adding another placeholder page
- When API is missing an endpoint needed by a screen, add the endpoint in the same PR as the UI
- When schema is missing a field required by legacy parity, migrate schema — don’t store JSON blobs as a permanent escape hatch
- Keep README accurate after each phase (auth users, env vars, deploy)
- Update `docs/OPERATOR.md` and `docs/TENANT_ISOLATION.md` when behavior changes
- Every PR description must state which Heroplan phase items it closes

---

## 10. Final acceptance (ship gate)

Rentora may be called “not half-assed” when:

1. A stranger can sign up, connect Stripe test mode, add 5 products with photos, theme the shop, and receive a paid test booking  
2. Admin booking detail is good enough that a warehouse staffer could run a Saturday on it  
3. Storefront product calendar is trusted (stock + blackouts + buffers)  
4. Two tenants on one platform have zero data bleed  
5. Demo data is gone from production paths  
6. Deployed preview/staging proves checkout + email + admin CRUD  

Until then, keep executing this plan in order — **depth over new surface area**.
