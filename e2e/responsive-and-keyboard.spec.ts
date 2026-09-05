import { expect, test, type Page } from "@playwright/test";

import { loginViaApi } from "./support/auth";

const NARROW_VIEWPORT = { width: 390, height: 844 };
const WIDE_VIEWPORT = { width: 1280, height: 900 };

async function tabUntilFocused(page: Page, accessibleName: string, maxTries = 8) {
  for (let attempt = 0; attempt < maxTries; attempt += 1) {
    await page.keyboard.press("Tab");
    const name = await page.evaluate(() => document.activeElement?.textContent?.trim());
    if (name === accessibleName) return;
  }
  throw new Error(`Never reached a focusable element named "${accessibleName}" within ${maxTries} tabs`);
}

test.describe("responsive shell navigation @smoke", () => {
  test("narrow viewport hides the sidebar and exposes the mobile navigation", async ({ page }) => {
    await page.setViewportSize(NARROW_VIEWPORT);
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");

    await expect(page.getByRole("navigation", { name: "Módulos" })).not.toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegación móvil" })).toBeVisible();

    await page.getByRole("button", { name: "Más módulos" }).click();
    await expect(page.getByRole("dialog", { name: "Más módulos" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Catálogo" })).toBeVisible();
  });

  test("wide viewport shows the full sidebar and supports collapsing it", async ({ page }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");

    await expect(page.getByRole("navigation", { name: "Módulos" })).toBeVisible();
    await expect(page.getByText("Ambiente")).toBeVisible();

    await page.getByRole("button", { name: "Contraer navegación" }).click();
    await expect(page.getByText("Ambiente")).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Expandir navegación" })).toBeVisible();
  });
});

test.describe("keyboard-only shell operation @smoke", () => {
  test("a keyboard-only actor can reach and switch to another destination", async ({ page }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Acciones de la jornada" })).toBeVisible();

    await tabUntilFocused(page, "Saltar al contenido principal");
    await tabUntilFocused(page, "Servicios");
    await expect(page.locator(":focus")).not.toHaveAttribute("aria-current", "page");

    await page.keyboard.press("Enter");
    await expect(page.getByText("Este destino estará disponible")).toBeVisible();
    await expect(page.locator(":focus")).toHaveAttribute("aria-current", "page");
  });
});
