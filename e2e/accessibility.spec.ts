import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

// Scoped to actual WCAG success criteria rather than axe's opinionated "best-practice"
// rule set (e.g. page-has-heading-one, region), which the acceptance criterion's
// "automated WCAG checks" doesn't require.
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectNoViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test.describe("automated WCAG checks @smoke", () => {
  test("the login page has no axe violations", async ({ page }) => {
    await page.goto("/login");
    await expectNoViolations(page);
  });

  test("the shell example catalog has no axe violations", async ({ page }) => {
    // Covers every scenario variant and shared shell state (loading, unauthenticated,
    // forbidden, retryable error) in one deterministic, session-free page.
    await page.goto("/prototype/shell-examples");
    await expectNoViolations(page);
  });

  test("the selected mobile sheet navigation item has no axe violations when hovered", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");

    await page.getByRole("button", { name: "Más módulos" }).click();
    const selectedNavigationItem = page
      .getByRole("dialog", { name: "Más módulos" })
      .getByRole("button", { name: "Mi trabajo", exact: true });
    await selectedNavigationItem.hover();
    await page.waitForTimeout(200);

    await expectNoViolations(page);
  });

  test("the live app shell with the Zones success state has no axe violations", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");
    await page.getByRole("button", { name: "Catálogo" }).click();
    await expect(page.getByRole("heading", { name: "Zonas operativas" })).toBeVisible();

    await expectNoViolations(page);
  });

  test("the mobile navigation sheet has no axe violations", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");
    await page.getByRole("button", { name: "Más módulos" }).click();
    await expect(page.getByRole("dialog", { name: "Más módulos" })).toBeVisible();
    // Otherwise the cursor stays over the trigger's screen position, which the sheet's
    // first pill now renders under — a spurious :hover state, not the steady-state page.
    await page.mouse.move(0, 0);

    await expectNoViolations(page);
  });
});
