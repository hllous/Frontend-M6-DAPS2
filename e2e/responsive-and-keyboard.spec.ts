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

test("keeps the session bar pinned while long content scrolls in Office and Field", async ({ page }) => {
  const assertStickyTopbar = async () => {
    const topbar = page.locator("header").first();
    const main = page.getByRole("main");

    await expect(topbar).toHaveCSS("position", "sticky");
    await expect(topbar).toHaveCSS("top", "0px");

    const initialLayout = await page.evaluate(() => {
      const topbar = document.querySelector("header");
      const main = document.querySelector("main");
      if (!topbar || !main) throw new Error("No se encontro el shell principal.");

      return {
        topbarBottom: Math.round(topbar.getBoundingClientRect().bottom),
        mainTop: Math.round(main.getBoundingClientRect().top),
        scrollHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
      };
    });

    expect(initialLayout.mainTop).toBeGreaterThanOrEqual(initialLayout.topbarBottom);
    expect(initialLayout.scrollHeight).toBeGreaterThan(initialLayout.viewportHeight);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => topbar.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(0);
    await expect(main).toBeVisible();
  };

  await page.setViewportSize(WIDE_VIEWPORT);
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app?destination=services");
  await assertStickyTopbar();

  await page.setViewportSize(NARROW_VIEWPORT);
  await loginViaApi(page, "field-crew-leader-route");
  await page.goto("/app?destination=services");
  await assertStickyTopbar();
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
    await expect(page.getByRole("heading", { name: "Servicios Urbanos" })).toBeVisible();
    await expect(page.locator(":focus")).toHaveAttribute("aria-current", "page");
  });
});
