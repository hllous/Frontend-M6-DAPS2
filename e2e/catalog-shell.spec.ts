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

    await sidebar.getByRole("button", { name: "Servicios" }).click();
    await expect(page).toHaveURL(/\/app\?destination=services$/);
    await expect(page.getByRole("heading", { name: "Servicios Urbanos" })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/app\/catalog\/containers$/);
    await expect(page.getByRole("heading", { name: "Contenedores" })).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/\/app\?destination=services$/);
    await expect(page.getByRole("heading", { name: "Servicios Urbanos" })).toBeVisible();
  });
});
