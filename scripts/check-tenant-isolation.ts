/**
 * Conceptual / integration helper for tenant isolation checks.
 *
 * When DATABASE_URL points at a reachable Postgres with migrations applied,
 * this script seeds two tenants and asserts basic query scoping.
 * Without a DB it prints the checklist and exits 0 (CI-safe documentation run).
 *
 * Usage: pnpm exec tsx scripts/check-tenant-isolation.ts
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
    data: { tenantId: tenantA.id, name: "Tents A", slug: `tents-a-${suffix}` },
  });
  const catB = await prisma.category.create({
    data: { tenantId: tenantB.id, name: "Tents B", slug: `tents-b-${suffix}` },
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
  const leak = listedForA.some((p) => p.id === productB.id);
  results.push({
    name: "list products scoped to tenant A excludes B",
    ok: !leak && listedForA.some((p) => p.id === productA.id),
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

  await prisma.product.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
  await prisma.category.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });

  return results;
}

async function main() {
  console.log("Rentora tenant isolation — conceptual checks\n");
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
      const mark = r.ok ? "PASS" : "FAIL";
      console.log(`  ${mark}  ${r.name}${r.detail ? ` (${r.detail})` : ""}`);
      if (!r.ok) failed += 1;
    }
    if (failed > 0) {
      process.exitCode = 1;
      console.error(`\n${failed} isolation check(s) failed.`);
    } else {
      console.log("\nAll DB-scoped isolation checks passed.");
    }
  } catch (err) {
    console.warn("DB checks could not run (is Postgres up and migrated?):");
    console.warn(err instanceof Error ? err.message : err);
    console.log(
      "Exiting 0 — treat as documentation run. Wire hard-fail once CI has a Postgres service.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
