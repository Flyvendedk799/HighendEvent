/**
 * Fails when prisma/schema.prisma has drifted from the committed migrations.
 *
 * Applies the migration history to DATABASE_URL, then diffs the resulting database against the
 * datamodel. A non-empty diff means someone edited the schema and forgot to generate a
 * migration, which would break every deploy that runs `prisma migrate deploy`.
 *
 * Skips (exit 0) when no database is reachable, so a developer without Postgres running can
 * still work; CI always has one, and that is where the check has to bite.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const dbDir = path.join(process.cwd(), "packages", "db");
const schema = path.join("prisma", "schema.prisma");
const migrationsDir = path.join(dbDir, "prisma", "migrations");

const databaseUrl = process.env.DATABASE_URL;

function prisma(args: string[]): { ok: boolean; out: string } {
  try {
    const out = execFileSync("pnpm", ["exec", "prisma", ...args], {
      cwd: dbDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });
    return { ok: true, out: out.trim() };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return { ok: false, out: `${e.stdout ?? ""}${e.stderr ?? ""}`.trim() };
  }
}

if (!existsSync(migrationsDir)) {
  console.error("No migrations directory. Run: pnpm db:migrate --name init");
  process.exit(1);
}

const migrations = readdirSync(migrationsDir).filter((entry) =>
  existsSync(path.join(migrationsDir, entry, "migration.sql")),
);

if (migrations.length === 0) {
  console.error("No migrations committed. Run: pnpm db:migrate --name init");
  process.exit(1);
}

if (!databaseUrl) {
  console.log("DATABASE_URL is not set — skipping the drift check.");
  process.exit(0);
}

const deployed = prisma(["migrate", "deploy", `--schema=${schema}`]);
if (!deployed.ok) {
  if (/P1001|Can't reach database|ECONNREFUSED/i.test(deployed.out)) {
    console.log("No database reachable — skipping the drift check.");
    process.exit(0);
  }
  console.error("Applying migrations failed:\n");
  console.error(deployed.out);
  process.exit(1);
}

const diff = prisma([
  "migrate",
  "diff",
  "--from-url",
  databaseUrl,
  "--to-schema-datamodel",
  schema,
  "--exit-code",
  "--script",
]);

// `--exit-code` returns 2 when there is a difference, so a failure here means drift.
if (!diff.ok) {
  console.error("Schema has drifted from the committed migrations:\n");
  console.error(diff.out);
  console.error("\nRun: pnpm db:migrate --name <describe-your-change>");
  process.exit(1);
}

console.log(`Migrations are in sync (${migrations.length} committed).`);
