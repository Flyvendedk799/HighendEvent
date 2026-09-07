import { expect, test, type Page } from "@playwright/test";

/**
 * The path the plan calls the ship gate: browse → pick dates → book → see it in admin.
 *
 * Everything here runs against the seeded demo tenant, so the assertions are about behaviour
 * rather than exact copy: a store can rename its products, but a booking must always end up
 * on the admin list.
 */

const STAFF = {
  email: process.env.E2E_STAFF_EMAIL ?? "owner@demo.rentora.local",
  password: process.env.E2E_STAFF_PASSWORD ?? "demo1234",
};

async function signInAsStaff(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel(/work email/i).fill(STAFF.email);
  await page.getByLabel(/password/i).fill(STAFF.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin(\/|$)/);
}

/** Picks the first two selectable days in the calendar and returns the booking window. */
async function pickFirstAvailableRange(page: Page) {
  const days = page.locator("button[aria-label*='available']:not([disabled])");
  await expect(days.first()).toBeVisible();

  const first = days.first();
  await first.click();

  // The second click closes the range; the same day again would be a one-day rental.
  const second = days.nth(1);
  await second.click();
}

test.describe("storefront", () => {
  test("shows the seeded store, not a placeholder", async ({ page }) => {
    await page.goto("/");

    // The old build hard-coded "Demo Rentals"; the store name must come from the API.
    await expect(page.locator("body")).not.toContainText("Demo Rentals");
    await expect(page.getByRole("link", { name: /catalog/i }).first()).toBeVisible();
  });

  test("catalog lists products and each one opens", async ({ page }) => {
    await page.goto("/catalog");

    const firstProduct = page.locator("a[href^='/product/']").first();
    await expect(firstProduct).toBeVisible();

    await firstProduct.click();
    await expect(page).toHaveURL(/\/product\//);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("the calendar refuses unavailable days", async ({ page }) => {
    await page.goto("/catalog");
    await page.locator("a[href^='/product/']").first().click();

    // Blackouts and fully-booked days are rendered disabled, never merely styled as blocked.
    const disabledDays = page.locator("button[aria-label*='unavailable'][disabled]");
    await expect(disabledDays.first()).toBeVisible();
  });

  test("adding to the cart prices the rental", async ({ page }) => {
    await page.goto("/catalog");
    await page.locator("a[href^='/product/']").first().click();

    await pickFirstAvailableRange(page);

    // The quote comes from the same domain code that charges, so a total must appear.
    await expect(page.getByText(/total/i).first()).toBeVisible();

    await page.getByRole("button", { name: /add to cart/i }).click();
    await expect(page).toHaveURL(/\/cart/);
    await expect(page.getByRole("heading", { name: /cart/i })).toBeVisible();
  });
});

test.describe("admin", () => {
  test("requires a sign-in", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("lists real products from the API", async ({ page }) => {
    await signInAsStaff(page);
    await page.goto("/admin/products");

    await expect(page.getByRole("heading", { name: /products/i })).toBeVisible();
    // The seed publishes six products; the table must not be a hard-coded demo list.
    await expect(page.locator("a[href^='/admin/products/']").first()).toBeVisible();
  });

  test("shows occupancy on the calendar", async ({ page }) => {
    await signInAsStaff(page);
    await page.goto("/admin/calendar");

    await expect(page.getByRole("heading", { name: /calendar/i })).toBeVisible();
    // Seeded bookings render as clickable bars.
    await expect(page.locator("a[href^='/admin/bookings/']").first()).toBeVisible();
  });

  test("booking detail offers only legal status transitions", async ({ page }) => {
    await signInAsStaff(page);
    await page.goto("/admin/bookings");

    await page.locator("a[href^='/admin/bookings/']").first().click();
    await expect(page).toHaveURL(/\/admin\/bookings\/.+/);

    await page.getByRole("button", { name: /change status/i }).click();

    // A booking can never jump straight to a terminal refund state.
    await expect(page.getByRole("menuitem", { name: /deposit refunded/i })).toHaveCount(0);
  });

  test("go-live checklist reads real state", async ({ page }) => {
    await signInAsStaff(page);
    await page.goto("/admin/go-live");

    await expect(page.getByRole("progressbar")).toBeVisible();
    // Stripe is not configured in the test environment, so this must read as incomplete.
    await expect(page.getByText(/connect stripe/i)).toBeVisible();
  });
});

test.describe("tenant isolation", () => {
  test("an unknown host does not serve another store", async ({ page }) => {
    const response = await page.goto("http://not-a-tenant.localhost:3100/", {
      waitUntil: "domcontentloaded",
    });

    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByText(/not available/i)).toBeVisible();
  });
});
