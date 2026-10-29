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

    await page.getByRole("button", { name: "Más" }).click();
    const selectedNavigationItem = page
      .getByRole("dialog", { name: "Más" })
      .getByRole("link", { name: "Mi trabajo", exact: true });
    await selectedNavigationItem.hover();
    await expect.poll(() => selectedNavigationItem.evaluate((element) =>
      element.getAnimations({ subtree: true }).every((animation) => animation.playState === "finished"),
    )).toBe(true);

    await expectNoViolations(page);
  });

  test("the live app shell with the Zones success state has no axe violations", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");
    await page.getByRole("link", { name: "Configuración" }).click();
    await expect(page.getByRole("heading", { name: "Zonas operativas" })).toBeVisible();

    await expectNoViolations(page);
  });

  test("the Services workspace has no axe violations at desktop and mobile sizes", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=services");
    await expect(page.getByRole("heading", { name: "Servicios" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Tabla operativa de Servicios" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Mapa de servicios" })).toBeVisible();
    await expectNoViolations(page);

    await page.setViewportSize({ width: 390, height: 844 });
    const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
    const map = page.getByRole("region", { name: "Mapa de servicios" });
    await expect(page.getByRole("slider", { name: "Altura de la lista" })).toBeVisible();
    await expect(table).toBeVisible();
    await expect(map).toBeVisible();
    await expect(page.getByRole("button", { name: "Lista", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Mapa", exact: true })).toHaveCount(0);
    await expectNoViolations(page);

    await page.getByRole("slider", { name: "Altura de la lista" }).press("End");
    await expect(page.getByRole("complementary", { name: "Lista de servicios" })).toHaveAttribute("data-snap", "full");
    await expectNoViolations(page);
  });

  test("the mobile navigation sheet has no axe violations", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");
    await page.getByRole("button", { name: "Más" }).click();
    const mobileNavigationSheet = page.getByRole("dialog", { name: "Más" });
    await expect(mobileNavigationSheet).toBeVisible();
    // Otherwise the cursor stays over the trigger's screen position, which the sheet's
    // first pill now renders under — a spurious :hover state, not the steady-state page.
    await page.mouse.move(0, 0);
    // Visibility is reached while the opening opacity transition is still blending every
    // sheet colour with the page below, which gives axe transient contrast ratios.
    await expect(mobileNavigationSheet).toHaveCSS("opacity", "1");

    await expectNoViolations(page);
  });

  test("the portaled mobile sheet honors reduced motion and has a Spanish close name", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");
    await page.getByRole("button", { name: "Más" }).click();

    const sheet = page.getByRole("dialog", { name: "Más" });
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveCSS("transition-duration", "0s");
    await expect(sheet).toHaveCSS("animation-name", "none");
    await expect(page.locator('[data-slot="sheet-overlay"]')).toHaveCSS("background-color", "oklab(0 0 0 / 0.1)");
    await expect(sheet.getByRole("button", { name: "Cerrar" })).toBeVisible();
  });
});
