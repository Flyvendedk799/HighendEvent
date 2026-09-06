/**
 * API-level E2E smoke: signup → login → create product → checkout stub → booking.
 * Usage: pnpm smoke:e2e
 */
const API = process.env.API_URL ?? "http://localhost:4000";

async function req(
  path: string,
  init: RequestInit & { token?: string; tenant?: string } = {},
) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.tenant) headers.set("x-tenant-slug", init.tenant);
  const res = await fetch(`${API}${path}`, { ...init, headers });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${text}`);
  }
  return data as Record<string, unknown>;
}

async function main() {
  const stamp = Date.now();
  const slug = `e2e-${stamp}`;
  const email = `owner@${slug}.test`;

  console.log("1) Signup", slug);
  await req("/onboarding", {
    method: "POST",
    body: JSON.stringify({
      tenantName: `E2E ${stamp}`,
      slug,
      storeName: `E2E Store ${stamp}`,
      ownerName: "E2E Owner",
      ownerEmail: email,
      ownerPassword: "e2e-pass-123",
      plan: "GROWTH",
      currency: "DKK",
      country: "DK",
    }),
  });

  console.log("2) Staff login");
  const login = await req("/auth/login", {
    method: "POST",
    tenant: slug,
    body: JSON.stringify({
      email,
      password: "e2e-pass-123",
      role: "staff",
      tenantSlug: slug,
    }),
  });
  const token = String(login.accessToken ?? login.token ?? "");
  if (!token) throw new Error("No access token from login");

  console.log("3) Create category + product");
  const category = await req("/catalog/categories", {
    method: "POST",
    token,
    tenant: slug,
    body: JSON.stringify({ name: "Tents", slug: "tents" }),
  });
  const product = await req("/catalog/products", {
    method: "POST",
    token,
    tenant: slug,
    body: JSON.stringify({
      categoryId: category.id,
      name: "E2E Marquee",
      slug: "e2e-marquee",
      description: "Smoke product",
      dailyPriceMinor: 100000,
      weekendPriceMinor: 120000,
      depositMinor: 20000,
      currency: "DKK",
      stockQty: 2,
      prepBufferDays: 0,
      cleanupBufferDays: 0,
    }),
  });

  console.log("4) Checkout stub with dates");
  const session = await req("/checkout/session", {
    method: "POST",
    tenant: slug,
    body: JSON.stringify({
      successUrl: "http://localhost:3000/confirmation",
      cancelUrl: "http://localhost:3000/cart",
      customerName: "E2E Buyer",
      email: `buyer@${slug}.test`,
      phone: "+4511111111",
      address: "Testvej 1",
      zipCode: "2100",
      city: "Copenhagen",
      deliveryType: "PICKUP",
      items: [
        {
          productId: product.id,
          quantity: 1,
          startDate: "2026-12-01",
          endDate: "2026-12-03",
        },
      ],
    }),
  });
  const sessionId = String(session.id ?? session.sessionId ?? "");
  if (!sessionId) throw new Error(`No checkout session id: ${JSON.stringify(session)}`);

  console.log("5) Complete stub payment");
  const booking = await req("/checkout/complete-stub", {
    method: "POST",
    tenant: slug,
    body: JSON.stringify({ sessionId }),
  });

  console.log("6) Admin sees booking");
  const bookings = (await req("/bookings", { token, tenant: slug })) as unknown;
  const list = Array.isArray(bookings)
    ? bookings
    : ((bookings as { items?: unknown[] }).items ?? []);
  if (!list.length) throw new Error("Expected at least one booking");

  console.log("OK", {
    slug,
    productId: product.id,
    bookingId: booking.id ?? booking.bookingId,
    bookingNo: booking.bookingNo ?? booking.number,
    bookings: list.length,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
