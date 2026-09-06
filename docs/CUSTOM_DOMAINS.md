# Custom domains

Rentora resolves tenant storefronts from:

1. `x-tenant-slug` header (local / proxy)
2. Subdomain of `PLATFORM_DOMAIN` (e.g. `acme.rentora.app` → slug `acme`)
3. Verified rows in `CustomDomain` (hostname → tenant)

## Add & verify (tenant admin)

1. Open **Admin → Settings → Custom domains**
2. Add `shop.example.com`
3. Create DNS:
   - **CNAME** `shop.example.com` → `PLATFORM_CNAME_TARGET` (default `cname.rentora.app`)
   - **TXT** `_rentora.shop.example.com` → `rentora-verify=<tenantId>`
4. Click **Verify**

By default `DOMAIN_VERIFY_STUB` is enabled (anything other than `"false"`), so verify succeeds without live DNS — useful for local/staging. Set `DOMAIN_VERIFY_STUB=false` to require a real TXT lookup.

After verification, the API enqueues a `domain-ssl` BullMQ job. The worker marks `sslStatus=active` (stub ACME). Wire a real certificate issuer before production.

## Staging checklist

- [ ] Add domain on Growth/Scale tenant
- [ ] Confirm DNS instructions returned by `POST /domains`
- [ ] Stub verify (`DOMAIN_VERIFY_STUB` unset) succeeds and worker job logs
- [ ] Live verify with `DOMAIN_VERIFY_STUB=false` after TXT is live
- [ ] Request with `Host: shop.example.com` resolves to the tenant (API middleware + `GET /public/resolve-host`)
- [ ] Suspended tenant still returns maintenance on storefront (`GET /public/tenant-status`)
