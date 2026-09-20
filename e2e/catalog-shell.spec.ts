import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("Catalog shell navigation regression #231", () => {
  test("keeps the application shell across catalog routes and browser history", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=catalog");

    const sidebar = page.locator("aside[aria-label='Navegación principal']");
    await expect(page.getByRole("heading", { name: "Catálogo" })).toBeVisible();
    await expect(sidebar).toBeVisible();

    await page.getByRole("button", { name: "Contraer navegación" }).click();
    await expect(page.getByRole("button", { name: "Expandir navegación" })).toBeVisible();

    await page.locator('a[href="/app/catalog/containers"]').click();
    await expect(page).toHaveURL(/\/app\/catalog\/containers$/);
    await expect(page.getByRole("heading", { name: "Contenedores" })).toBeVisible();
    await expect(sidebar).toBeVisible();
    await expect(page.getByRole("button", { name: "Expandir navegación" })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/app\?destination=catalog$/);
    await expect(page.getByRole("heading", { name: "Catálogo" })).toBeVisible();
    await expect(sidebar).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/\/app\/catalog\/containers$/);
    await expect(page.getByRole("heading", { name: "Contenedores" })).toBeVisible();
    await expect(sidebar).toBeVisible();
  });

  test("keeps sidebar destinations aligned with URL and browser history", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/containers");

    const sidebar = page.locator("aside[aria-label='Navegación principal']");
    await expect(page.getByRole("heading", { name: "Contenedores" })).toBeVisible();

    await sidebar.getByRole("link", { name: "Servicios" }).click();
    await expect(page).toHaveURL(/\/app\?destination=services$/);
    await expect(page.getByRole("heading", { name: "Servicios Urbanos" })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/app\/catalog\/containers$/);
    await expect(page.getByRole("heading", { name: "Contenedores" })).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/\/app\?destination=services$/);
    await expect(page.getByRole("heading", { name: "Servicios Urbanos" })).toBeVisible();
  });

  test("sidebar destinations are real links that open in a new tab (#243)", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");

    const sidebar = page.locator("aside[aria-label='Navegación principal']");
    const services = sidebar.getByRole("link", { name: "Servicios" });
    await expect(services).toHaveAttribute("href", "/app?destination=services");

    const [newTab] = await Promise.all([
      page.context().waitForEvent("page"),
      services.click({ modifiers: ["ControlOrMeta"] }),
    ]);
    await newTab.waitForLoadState();
    await expect(newTab).toHaveURL(/\/app\?destination=services$/);
    await expect(newTab.getByRole("heading", { name: "Servicios Urbanos" })).toBeVisible();
    await expect(page).toHaveURL(/\/app$/);
  });

  test("the legacy /app/catalog URL redirects to the canonical catalog destination (#243)", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog");

    await expect(page).toHaveURL(/\/app\?destination=catalog$/);
    await expect(page.getByRole("link", { name: "Catálogo" }).first()).toHaveAttribute("aria-current", "page");
  });
});
