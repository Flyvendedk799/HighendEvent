# HighendEvent Messenger Bot — Implementation Plan

> **Goal:** Build a Facebook Messenger bot (with Instagram DM + WhatsApp parity later) that lets customers browse the catalog, check availability, get price estimates, place bookings, and follow up on existing orders 24/7 in Danish, backed by a hardened public REST API and an MCP server that exposes the same capabilities to AI agents (Claude, etc.).
>
> **Service under integration:** [https://www.highendevent.dk](https://www.highendevent.dk) — Flask 3 + SQLAlchemy 2 rental platform on PythonAnywhere (MySQL). Existing API surface lives at `app/blueprints/api.py` and is **session-auth only** today, so it cannot be safely consumed by a third-party bot as-is.
>
> **Architecture in one diagram:**
>
> ```
>  Facebook / Instagram / WhatsApp
>           │  (webhook events)
>           ▼
>  ┌──────────────────────┐    ┌───────────────────┐
>  │  Bot Gateway (new)   │◄──►│  Claude (NLU/LLM) │
>  │  app/blueprints/bot  │    └───────────────────┘
>  └──────────┬───────────┘             ▲
>             │ HTTPS + Bearer token    │ MCP (stdio/SSE)
>             ▼                         │
>  ┌──────────────────────┐    ┌───────────────────┐
>  │  Public REST API v1  │◄──►│   MCP Server      │
>  │  app/blueprints/api_ │    │  app/mcp/         │
>  │  v1 (new)            │    │  (new)            │
>  └──────────┬───────────┘    └───────────────────┘
>             │
>             ▼
>      Existing services
>  (Pricing, Availability,
>   Distance, Email, Stripe)
> ```
>
> **Why three layers?** The Bot Gateway speaks the messenger protocols, the v1 REST API is the contract every external consumer (bot, mobile, MCP) shares, and the MCP server is a thin adapter so the same tools work for Claude Desktop, Claude Code, and any other LLM client. This keeps business logic in `app/services/*` and prevents three near-duplicate implementations from drifting apart.

---

## Phase 0 — Discovery & Decisions (½ day, do this first)

Before writing any code, lock down the answers below — every later phase depends on them.

| # | Decision | Recommended default | Owner |
|---|----------|---------------------|-------|
| 0.1 | Primary messenger channel | **Facebook Messenger** (largest Danish reach, simplest webhook); Instagram DM piggybacks on the same Page; WhatsApp Business adds in Phase 8. | Product |
| 0.2 | NLU engine | **Claude Sonnet 4.6** via the Anthropic SDK with prompt caching + tool-use loop. Cheaper/lower-latency than building intents in Rasa/Dialogflow, and the same toolset can be reused via MCP. | Tech |
| 0.3 | Languages | **Danish primary, English fallback**. Detect once per session from the first user message. | Product |
| 0.4 | Hosting for the bot | Same PythonAnywhere instance under `/bot/*`. Promote to a dedicated worker (Render, Fly.io) only if webhook latency >2 s. | Tech |
| 0.5 | Conversation store | New `bot_session` + `bot_message` SQLAlchemy tables (MySQL). No Redis dependency yet. | Tech |
| 0.6 | Authentication for bot→API | Per-bot **service token** (HMAC of `bot_id`+`secret`) in `Authorization: Bearer …`. Customer-scoped actions use a short-lived **link token** sent over Messenger via account-linking. | Security |
| 0.7 | Compliance | GDPR notice on first interaction, persisted opt-in flag, `/glemmig` ("forget me") command, 30-day retention on chat logs. | Legal |
| 0.8 | Out-of-scope (v1) | Live agent handoff, payments inside Messenger (Pay-by-Stripe-Link only), voice messages, file uploads. | Product |

**Exit criteria for Phase 0:** the eight rows above are signed off and pasted into `docs/bot/decisions.md`.

---

## Phase 1 — Public REST API v1 (1.5 days)

The existing `app/blueprints/api.py` is mounted at `/api/*` and relies on Flask-Login session cookies. The bot cannot use cookies, and we don't want to expose admin-only endpoints to it. Build a parallel, **versioned, token-authenticated** API.

### 1.1 Scaffold the blueprint

1. Create `app/blueprints/api_v1/__init__.py` and register it at `/api/v1` in `app/__init__.py` (next to the existing api blueprint).
2. Add `app/blueprints/api_v1/auth.py`:
   - `@require_bot_token` decorator → validates `Authorization: Bearer <token>` against a new `ApiClient` model (`id`, `name`, `token_hash`, `scopes`, `is_active`, `last_used_at`).
   - `@require_link_token` decorator → validates short-lived JWT bound to a `customer_id` (HS256, 15-min TTL, JTI stored in `bot_link_token` to allow revocation).
3. Add request-id middleware (`X-Request-Id`) and structured JSON logging.
4. Add per-token rate limiting via `Flask-Limiter` (default 60 req/min, 1 000 req/day).

### 1.2 Endpoints (all return JSON, all errors follow RFC 7807)

| Method & Path | Auth | Wraps |
|---|---|---|
| `GET /api/v1/health` | none | self |
| `GET /api/v1/categories` | bot | `Category.query` |
| `GET /api/v1/products?q=&category=&limit=&cursor=` | bot | `public.search` |
| `GET /api/v1/products/{slug}` | bot | `Product` + images + upsells |
| `GET /api/v1/products/{id}/availability?start=&end=&qty=` | bot | `AvailabilityService.available_quantity` |
| `GET /api/v1/products/{id}/calendar?from=&to=` | bot | `AvailabilityService.get_availability_calendar` |
| `POST /api/v1/quotes` (body: items[], delivery_type, zip) | bot | `PricingService.calculate_booking_pricing` |
| `POST /api/v1/leads` (body: name, phone, email, message) | bot | new `Lead` model + email to admin |
| `POST /api/v1/customers/lookup` (body: email **or** phone) | bot | returns `customer_exists: bool` only — no PII leak |
| `POST /api/v1/auth/link-request` (body: customer email) | bot | sends magic link via email — converts to `link token` once clicked |
| `GET /api/v1/me/bookings` | link | `Booking.query.filter_by(customer_id=…)` |
| `GET /api/v1/me/bookings/{booking_no}` | link | single booking detail |
| `POST /api/v1/me/bookings/{booking_no}/cancel` | link | only if `status == PENDING` |
| `POST /api/v1/checkout-sessions` | link | calls existing Stripe checkout helper, returns `{checkout_url}` for the bot to send as a button |

### 1.3 Tests & contract

1. Add `tests/api_v1/test_*.py` for each endpoint (happy path + 401 + 403 + 422 + 429).
2. Generate an OpenAPI 3.1 spec with `apispec` + `marshmallow` and serve it at `/api/v1/openapi.json`.
3. Add a Postman/Bruno collection committed at `docs/bot/api_v1.bru` for manual smoke tests.

**Exit criteria for Phase 1:** `pytest tests/api_v1` green; `curl https://www.highendevent.dk/api/v1/health` returns 200; OpenAPI spec validates with `redocly lint`.

---

## Phase 2 — Domain Hardening for Bot Use (1 day)

Tighten the services the API now exposes so the bot can't accidentally over-book or mis-quote.

1. **Concurrency on availability** — wrap `AvailabilityService.available_quantity` in a `SELECT … FOR UPDATE` over the relevant `BookingItem` rows whenever called from `POST /quotes` or `POST /checkout-sessions`. Today two simultaneous requests can both see "stock_qty available".
2. **Idempotency keys** — accept `Idempotency-Key` header on all `POST /api/v1/*` endpoints; dedupe via a new `idempotency_record` table with 24-h TTL. Critical for retried Messenger webhooks.
3. **Lead model** — `Lead(id, name, phone, email, source='messenger', message, created_at, converted_booking_id)` so we can measure bot conversion later.
4. **Bot-aware booking source** — add `Booking.source` enum (`web`, `messenger`, `instagram`, `whatsapp`, `admin`); default `web`. Update admin list view to show a small icon per source.
5. **Feature flag** — `FEATURE_BOT_API=true|false` in `app/config.py` so we can dark-launch.

---

## Phase 3 — MCP Server (1 day)

Expose the same v1 capabilities over the **Model Context Protocol** so Claude (Desktop, Code, API clients) can drive the rental flow without any HTTP plumbing in the prompt. This is also what powers the bot's NLU layer in Phase 5.

### 3.1 Layout

```
app/mcp/
├── __init__.py
├── server.py          # FastMCP entrypoint
├── tools/
│   ├── catalog.py     # search_products, get_product
│   ├── availability.py # check_availability, get_calendar
│   ├── pricing.py     # quote_booking
│   ├── booking.py     # create_lead, start_checkout (returns Stripe URL)
│   └── customer.py    # lookup_customer, list_my_bookings (link-token gated)
├── resources/
│   └── policy.py      # static markdown — rental terms, opening hours, FAQ
└── prompts/
    └── concierge.py   # the system prompt the bot uses
```

### 3.2 Tooling

1. Use `mcp` Python SDK (`pip install mcp`). Run it both as **stdio** (for Claude Desktop) and **SSE on `/mcp/sse`** (for the bot gateway and remote Claude clients).
2. Each tool is a thin wrapper around the v1 REST client — **never reach into SQLAlchemy directly from MCP**. This keeps a single source of truth.
3. Tools return structured JSON, not prose. Dates as ISO 8601, money as integer DKK øre, never floats.
4. `policy` resource ships the rental terms and FAQ in Danish so Claude can quote them verbatim.

### 3.3 Local install for Claude Desktop

Document in `docs/bot/mcp.md`:

```jsonc
// ~/.claude/claude_desktop_config.json
{
  "mcpServers": {
    "highendevent": {
      "command": "python",
      "args": ["-m", "app.mcp.server"],
      "env": { "HIGHENDEVENT_API_TOKEN": "…" }
    }
  }
}
```

### 3.4 Tests

`tests/mcp/test_tools.py` — boot the server in-process and call each tool through the MCP client; assert JSON shape and idempotency behavior.

**Exit criteria for Phase 3:** Claude Desktop lists all tools under "highendevent"; invoking `quote_booking` for a known product returns a numeric breakdown matching the website's price.

---

## Phase 4 — Messenger Platform Setup (½ day, mostly clicking)

1. **Meta Business Suite**
   - Create / claim the HighendEvent Facebook Page if not already owned.
   - In *Meta for Developers* → create a new App, type **Business** → add **Messenger** + **Instagram** + **Webhooks** products.
   - Subscribe the Page to events: `messages`, `messaging_postbacks`, `message_deliveries`, `message_reads`, `messaging_referrals`.
2. **Persistent menu** (Danish):
   - 🛒 Se udstyr → triggers `MENU_BROWSE`
   - 📅 Tjek dato → triggers `MENU_AVAILABILITY`
   - 📦 Mine bookinger → triggers `MENU_MY_BOOKINGS`
   - ❓ Hjælp / kontakt → triggers `MENU_HELP`
3. **Get Started button** + greeting text in DA & EN.
4. **App review** items to request (takes 1–3 business days):
   - `pages_messaging`
   - `pages_messaging_subscriptions` (only if we send proactive reminders, see Phase 8)
5. **Secrets**: store `FB_APP_SECRET`, `FB_VERIFY_TOKEN`, `FB_PAGE_ACCESS_TOKEN` in PythonAnywhere environment, mirrored into `.env.production.template`.
6. **WhatsApp Cloud API** (deferred to Phase 8) — register phone, verify business, set up message templates.

**Exit criteria for Phase 4:** sending "ping" to the Page DM returns the canned greeting via Meta's test tool.

---

## Phase 5 — Bot Gateway Implementation (2 days)

This is the new `app/blueprints/bot/` blueprint that receives webhooks from Meta, runs the conversation, and calls the v1 API or MCP server.

### 5.1 Routes

| Method & Path | Purpose |
|---|---|
| `GET /bot/webhook` | Meta verification handshake (echo `hub.challenge`). |
| `POST /bot/webhook` | Receive messaging events. Verify `X-Hub-Signature-256` HMAC against `FB_APP_SECRET`. Push the event onto an in-process queue and return **200 within 1 second** (Meta retries otherwise). |
| `GET /bot/healthz` | Liveness probe. |

### 5.2 Worker pipeline

```
on_event(payload):
    sender_psid = payload.sender.id
    session     = BotSession.get_or_create(channel='messenger', psid=sender_psid)
    BotMessage.record(session, direction='in', body=payload.message.text)

    if payload.is_postback:        handle_postback(session, payload.postback.payload)
    elif payload.message.quick_reply: handle_quick_reply(session, …)
    else:                          handle_text(session, payload.message.text)
```

`handle_text` is the main path: it forwards to a **Claude Sonnet 4.6 tool-use loop** seeded with the `concierge` system prompt and the MCP-equivalent tool definitions (defined once in `app/mcp/tools/*` and re-exported as Anthropic tool schemas — single source of truth).

### 5.3 Conversation state

New tables:

```python
class BotSession(db.Model):
    id, channel, psid, customer_id (nullable, FK), language,
    consent_at, last_seen_at, link_token_hash, link_token_expires_at,
    state_json (current cart, pending booking draft)

class BotMessage(db.Model):
    id, session_id (FK), direction (in/out), body, payload_json,
    tool_calls_json, latency_ms, created_at
```

Retention: `BotMessage` rows older than 30 days are pruned by a daily scheduled task; sessions become anonymous (clear `customer_id`, `state_json`) but stay for analytics.

### 5.4 Outbound message helpers

`app/blueprints/bot/messenger_client.py` wraps Meta's Send API:

- `send_text(psid, text)`
- `send_quick_replies(psid, text, options)`
- `send_generic_template(psid, cards)` — used for the catalog carousel
- `send_button_template(psid, text, buttons)` — used for the "Pay now" Stripe link
- All calls obey the 24-hour messaging window; outside it we queue the message for the next inbound interaction.

### 5.5 Account linking (customer self-service)

1. Customer types "se mine bookinger" → bot asks for email.
2. Bot calls `POST /api/v1/auth/link-request` → email contains a magic link `https://www.highendevent.dk/bot/link?token=…&psid=…`.
3. Customer clicks → backend verifies the token, stores `customer_id` on `BotSession`, sends "Tak! Du er nu logget ind" back via Messenger.
4. Subsequent calls to `/api/v1/me/*` use the link token stored in the session.

### 5.6 Tests

- `tests/bot/test_webhook_signature.py` — reject bad HMAC.
- `tests/bot/test_dialog_flows.py` — record/replay conversation transcripts (use `vcr.py` for the Anthropic API + a fake Send API).
- `tests/bot/test_account_linking.py` — full magic-link round trip.

**Exit criteria for Phase 5:** end-to-end "Hej, hvad koster en popcornmaskine fredag-lørdag?" → bot replies with quote in <3 s on test Page.

---

## Phase 6 — Conversation Flows (1.5 days)

Each flow is implemented as a **prompt + tool set**, not a hand-coded state machine. The state machine is only a thin guardrail (e.g., "user must consent before continuing"). Flows live in `docs/bot/flows/`.

### 6.1 Catalog browsing

> User: "Har I candyfloss-maskiner?"

1. Tool call: `search_products(q="candyfloss")`
2. Render top-3 as a generic-template carousel (image, title, "fra X kr/dag", buttons: *Tjek dato* / *Se mere*).
3. Quick reply: *Vis flere* / *Filter på kategori*.

### 6.2 Availability + quote

> User: "Kan jeg leje den til 14.-15. juni for 2 stk?"

1. Tool: `check_availability(product_id, start, end, qty=2)`
2. If yes → tool: `quote_booking([{product_id, qty, start, end}], delivery_type='pickup')`
3. Reply with itemised price (rental + VAT + deposit) and quick replies *Tilføj levering* / *Bestil nu* / *Andre datoer*.
4. If "Tilføj levering" → ask for ZIP, re-quote with `delivery_type='delivery'`.

### 6.3 Booking handoff

> User: "Bestil nu"

1. Tool: `create_lead` (always, captures intent even if checkout abandoned).
2. Bot asks for name, email, phone (one at a time, validated).
3. Tool: `start_checkout` → returns Stripe URL.
4. Send button template: "Betal sikkert med Stripe →".
5. On Stripe webhook (`checkout.session.completed`), reuse the existing handler in `app/blueprints/stripe_webhooks.py` and **fan out** a "Tak for din bestilling!" Messenger message via the bot client (look up `BotSession` by `customer.email`).

### 6.4 My bookings

> User: "Hvor er min levering?"

1. Require linked session (Phase 5.5 magic link).
2. Tool: `list_my_bookings` → show next upcoming booking with status emoji.
3. Quick replies: *Adresse* / *Annuller* (only if PENDING) / *Kontakt support*.

### 6.5 Help / fallback

- Three consecutive unknown intents → escalate: "Skal jeg sende dig videre til en medarbejder? Skriv din besked og vi vender tilbage inden for 24 t." → creates a `Lead` with the conversation tail attached.

### 6.6 Edge cases to script and test

1. Ambiguous date phrases ("næste weekend", "i morgen") — resolve in Europe/Copenhagen TZ.
2. Out-of-stock for requested dates — propose nearest available range.
3. Outside 24-h messaging window — queue and send on next interaction.
4. User sends an image or sticker — friendly nudge to type the question.
5. User sends `/glemmig` or "slet mine data" — purge `BotSession` + `BotMessage` rows, confirm.

---

## Phase 7 — Admin & Observability (½ day)

1. **Admin chat viewer** at `/admin/bot/sessions` — list recent sessions, drill down to transcript, manually add internal notes, mark "needs follow-up".
2. **Bot KPI tile** on the existing admin dashboard: 24-h sessions, 7-day conversion (sessions → bookings), avg response latency, fallback rate.
3. **Logs** — JSON to stdout (PythonAnywhere captures these); add a `/admin/bot/errors` page that surfaces the last 100 4xx/5xx from the gateway.
4. **Alerting** — daily digest email if fallback rate >25 % or webhook 5xx >1 %.
5. **Cost tracking** — log Claude input/output tokens per turn into `BotMessage.payload_json.tokens` and aggregate weekly.

---

## Phase 8 — Multi-Channel & Proactive Messaging (1 day)

Once Phase 5–7 are stable for ≥2 weeks:

1. **Instagram DM** — same Page, just enable IG inbox; the same webhook fires with `message.is_instagram=true`. Tweak greetings only.
2. **WhatsApp Cloud API** — add `app/blueprints/bot/whatsapp.py`, reuse the conversation engine; differences are templated messages and the 24-h session model.
3. **Proactive reminders** (requires `pages_messaging_subscriptions` approval):
   - T-3 days before delivery: "Hej, vi leverer din popcornmaskine fredag — er adressen stadig …?"
   - T+1 day after return-due: "Husk at returnere udstyret i dag for fuld depositum-refusion."
4. **Re-engagement** — 14 days after an abandoned cart, send a single nudge with a fresh quote.
5. Honour Meta's [Messaging Tags](https://developers.facebook.com/docs/messenger-platform/send-messages/message-tags) (`POST_PURCHASE_UPDATE`, `CONFIRMED_EVENT_UPDATE`) — never abuse them, or the Page is rate-limited.

---

## Phase 9 — Testing & QA (1 day, in parallel with Phase 5–7)

1. **Unit** — services and tools (Phases 1–3) at ≥80 % line coverage.
2. **Integration** — end-to-end Stripe sandbox booking from a scripted Messenger transcript via `httpx` against a local server.
3. **Conversational regression** — golden-transcript suite under `tests/bot/transcripts/*.yaml`; CI replays them and diff-checks tool calls + reply text (templated, not exact).
4. **Load** — `locust` script: 100 concurrent sessions, p95 webhook ack <1 s.
5. **Security**
   - Run the existing `/security-review` skill on every PR touching `app/blueprints/bot` or `app/blueprints/api_v1`.
   - Verify HMAC on every webhook event.
   - Confirm link tokens cannot escalate to admin scope.
   - Pen-test rate limits and idempotency.
6. **GDPR walkthrough** — DPO signs off on consent flow, retention, and `/glemmig` purge.
7. **Manual UAT** — run the script in `docs/bot/uat_script.md` against the staging Page (Danish + English), three real test users.

---

## Phase 10 — Deployment & Rollout (½ day)

1. **Staging Page** on a separate Facebook App pointing at `https://staging.highendevent.dk/bot/webhook`. Run UAT here.
2. **Production cut-over**
   1. Merge `claude/messenger-bot-plan-Jacxg` → `main` after review.
   2. Apply Alembic migration (`flask db upgrade`) — adds `api_client`, `bot_session`, `bot_message`, `idempotency_record`, `lead`, `booking.source`.
   3. Update PythonAnywhere env vars (Section 4.5 + `ANTHROPIC_API_KEY`, `BOT_SERVICE_TOKEN`).
   4. Reload web app, hit `/api/v1/health`.
   5. Switch the production Facebook App's webhook URL to `https://www.highendevent.dk/bot/webhook`, verify.
   6. Flip `FEATURE_BOT_API=true`.
3. **Soft launch** — enable Get Started button only for Page admins (Meta has a "Beta access" feature) for 48 h.
4. **Public launch** — announce on the website footer ("Skriv til os på Messenger 💬"), in the order-confirmation email, and on Instagram.
5. **Post-launch watch** — first 72 h, monitor `/admin/bot/errors` and KPI tile every few hours; have a rollback toggle (`FEATURE_BOT_API=false`) ready.

---

## Phase 11 — Post-launch Iteration (ongoing)

- Weekly: review fallback transcripts → add prompt examples or new tool affordances.
- Monthly: retrain/refresh the `concierge` system prompt with the latest FAQ tweaks.
- Quarterly: re-evaluate model (Sonnet → Haiku for cost, Opus for hard months).
- Track north-star metric: **% of Messenger sessions that end in a paid booking**. Target >8 % within 3 months.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Meta App review rejects `pages_messaging` | Med | High | Apply early in Phase 4; have a screen-cast of the bot ready; fall back to *standard messaging* (24-h window) only. |
| LLM hallucinates a price | Low | High | Prices **only** come from `quote_booking` tool output; system prompt forbids inventing numbers; unit test asserts no DKK figure appears in replies unless preceded by a tool call. |
| Double-booking under load | Med | High | `SELECT … FOR UPDATE` in Phase 2.1 + idempotency keys in 2.2. |
| Stripe link expires before user pays | Med | Med | Generate fresh link on every "Bestil nu"; expire chat draft after 30 min. |
| GDPR complaint over chat retention | Low | High | 30-day purge + `/glemmig` + DPO sign-off in 9.6. |
| PythonAnywhere webhook latency | Med | Med | Move bot blueprint to a dedicated Fly.io worker if p95 >1.5 s for a week. |

---

## Deliverables Checklist

By the end of this plan the repo should contain:

- [ ] `app/blueprints/api_v1/` with OpenAPI spec at `/api/v1/openapi.json`.
- [ ] `app/mcp/` runnable as `python -m app.mcp.server`.
- [ ] `app/blueprints/bot/` handling Messenger + (Phase 8) Instagram + WhatsApp.
- [ ] New models: `ApiClient`, `BotSession`, `BotMessage`, `Lead`, `IdempotencyRecord`, plus `Booking.source`.
- [ ] Migration scripts under `migrations/versions/`.
- [ ] Test suites under `tests/api_v1/`, `tests/mcp/`, `tests/bot/` — green in CI.
- [ ] `docs/bot/decisions.md`, `docs/bot/flows/*.md`, `docs/bot/mcp.md`, `docs/bot/uat_script.md`.
- [ ] Updated `README.md` and `DEPLOYMENT_GUIDE.md` with bot setup steps.
- [ ] Admin pages `/admin/bot/sessions` and `/admin/bot/errors`.
- [ ] Feature flag `FEATURE_BOT_API` wired through `app/config.py`.

---

## Indicative Timeline (single engineer)

| Week | Phases | Outcome |
|---|---|---|
| 1 | 0, 1, 2 | Public REST API v1 live behind feature flag, hardened. |
| 2 | 3, 4, 5 | MCP server + Messenger gateway echo-replying on staging. |
| 3 | 6, 7, 9 | All five conversation flows green; admin viewer + KPIs done. |
| 4 | 10 | Production launch; first paid Messenger booking. |
| 5+ | 8, 11 | Instagram/WhatsApp + iteration. |

Total ≈ 8–10 working days for a single full-stack engineer; halve the calendar with a dedicated frontend/admin contributor for Phase 7.
