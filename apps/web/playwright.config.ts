import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end smoke coverage.
 *
 * These run against a real API and database — the point is to catch the things unit tests
 * cannot: that a booking taken on the storefront shows up in the admin console.
 *
 * Run them with:
 *   docker compose up -d && pnpm db:deploy && pnpm db:seed
 *   pnpm --filter @rentora/api start &
 *   pnpm --filter @rentora/web test:e2e
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);

/** The seeded demo tenant is reached on a subdomain, which resolves on *.localhost. */
const BASE_URL = process.env.E2E_BASE_URL ?? `http://demo.localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm start --port ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          PLATFORM_DOMAIN: `localhost:${PORT}`,
          NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
        },
      },
});
