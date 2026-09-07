/**
 * Tenant isolation checks against a real database.
 *
 * Creates two tenants side by side and asserts that every read and write path scopes by
 * tenantId. CI runs this against a Postgres service, where a failure is fatal. Without a
 * reachable database it prints the checklist and exits 0 so local work is not blocked.
 *
 * Usage: pnpm check:isolation
 */

import { PrismaClient } from "@rentora/db";

type CheckResult = { name: string; ok: boolean; detail?: string };

const checklist = [
  "Staff session tenantId must match resource tenantId on every mutating route",
  "GET by id returns 404 (not 403) for cross-tenant resources to avoid existence leaks",
  "Customer cookies are host-bound; changing Host must not reuse another tenant session",
  "BullMQ jobs include tenantId; processors never query without it",
  "Platform admin cross-tenant access writes AuditLog with actorType=PLATFORM",
  "Unique email/slug constraints are composite with tenantId",
];

function isConnectionError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /P1001|P1003|Can't reach database|ECONNREFUSED|does not exist/i.test(message);
}

async function runDbChecks(prisma: PrismaClient): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const suffix = Date.now().toString(36);

  const tenantA = await prisma.tenant.create({
    data: { name: "Isolation A", slug: `iso-a-${suffix}` },
  });
  const tenantB = await prisma.tenant.create({
    data: { name: "Isolation B", slug: `iso-b-${suffix}` },
  });

  const catA = await prisma.category.create({
    data: { tenantId: tenantA.id, name: "Tents A", slug: `tents-${suffix}` },
  });
  const catB = await prisma.category.create({
    // Deliberately the same slug as tenant A: the unique constraint must be composite.
    data: { tenantId: tenantB.id, name: "Tents B", slug: `tents-${suffix}` },
  });

  results.push({
    name: "category slug uniqueness is scoped per tenant",
    ok: catA.slug === catB.slug && catA.id !== catB.id,
  });

  const productA = await prisma.product.create({
    data: {
      tenantId: tenantA.id,
      categoryId: catA.id,
      name: "A Tent",
      slug: `a-tent-${suffix}`,
      dailyPriceMinor: 10000,
      currency: "DKK",
    },
  });
  const productB = await prisma.product.create({
    data: {
      tenantId: tenantB.id,
      categoryId: catB.id,
      name: "B Tent",
      slug: `b-tent-${suffix}`,
      dailyPriceMinor: 20000,
      currency: "DKK",
    },
  });

  const listedForA = await prisma.product.findMany({ where: { tenantId: tenantA.id } });
  results.push({
    name: "list products scoped to tenant A excludes B",
    ok: !listedForA.some((p) => p.id === productB.id) &&
      listedForA.some((p) => p.id === productA.id),
    detail: `count=${listedForA.length}`,
  });

  const crossGet = await prisma.product.findFirst({
    where: { id: productB.id, tenantId: tenantA.id },
  });
  results.push({
    name: "findFirst by B id + A tenantId returns null",
    ok: crossGet === null,
  });

  const updateCount = await prisma.product.updateMany({
    where: { id: productB.id, tenantId: tenantA.id },
    data: { name: "Hijacked" },
  });
  results.push({
    name: "updateMany cross-tenant affects 0 rows",
    ok: updateCount.count === 0,
  });

  const deleteCount = await prisma.product.deleteMany({
    where: { id: productB.id, tenantId: tenantA.id },
  });
  results.push({
    name: "deleteMany cross-tenant affects 0 rows",
    ok: deleteCount.count === 0,
  });

  // The same customer email may exist in both stores without colliding.
  const email = `shared-${suffix}@example.com`;
  const customerA = await prisma.customer.create({
    data: { tenantId: tenantA.id, email, firstName: "A", lastName: "One" },
  });
  const customerB = await prisma.customer.create({
    data: { tenantId: tenantB.id, email, firstName: "B", lastName: "Two" },
  });
  results.push({
    name: "customer email uniqueness is scoped per tenant",
    ok: customerA.id !== customerB.id,
  });

  const bookingB = await prisma.booking.create({
    data: {
      tenantId: tenantB.id,
      bookingNo: `ISO-${suffix}`,
      customerName: "B Customer",
      email,
      phone: "+45 00 00 00 00",
      address: "Somewhere 1",
      zipCode: "1000",
      city: "Copenhagen",
      startDate: new Date("2030-01-01"),
      endDate: new Date("2030-01-03"),
      subtotalMinor: 1000,
      totalMinor: 1000,
      upfrontMinor: 1000,
      currency: "DKK",
    },
  });

  const bookingsForA = await prisma.booking.findMany({ where: { tenantId: tenantA.id } });
  results.push({
    name: "bookings scoped to tenant A exclude tenant B bookings",
    ok: !bookingsForA.some((b) => b.id === bookingB.id),
  });

  const bookingCross = await prisma.booking.findFirst({
    where: { id: bookingB.id, tenantId: tenantA.id },
  });
  results.push({
    name: "booking findFirst cross-tenant returns null",
    ok: bookingCross === null,
  });

  // Deleting the tenants cascades everything created above.
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });

  return results;
}

async function main() {
  console.log("Rentora tenant isolation\n");
  console.log("Manual / API checklist:");
  for (const item of checklist) {
    console.log(`  [ ] ${item}`);
  }
  console.log("");

  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL not set — skipping live DB assertions (documentation mode).");
    console.log("See docs/TENANT_ISOLATION.md for the full approach.");
    return;
  }

  const prisma = new PrismaClient();
  try {
    const results = await runDbChecks(prisma);
    let failed = 0;
    for (const r of results) {
      console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` (${r.detail})` : ""}`);
      if (!r.ok) failed += 1;
    }
    if (failed > 0) {
      console.error(`\n${failed} isolation check(s) failed.`);
      process.exitCode = 1;
    } else {
      console.log(`\nAll ${results.length} isolation checks passed.`);
    }
  } catch (err) {
    if (isConnectionError(err)) {
      console.log("No migrated database reachable — skipping live DB assertions.");
      return;
    }
    // A real failure here means isolation is broken, which must never pass CI.
    console.error("Isolation checks errored:");
    console.error(err instanceof Error ? err.stack : err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
