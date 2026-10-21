import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.use({ viewport: { width: 390, height: 844 } });

test("container edit keeps title and save action visible while the form scrolls", async ({ page }) => {
  await loginViaApi(page, "office-duty-queue");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/app/catalog/containers");
  await page.getByRole("button", { name: "Editar", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Editar contenedor" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog.getByRole("heading")).toBeInViewport({ ratio: 1 });
  await expect(dialog.getByRole("button", { name: "Guardar contenedor", exact: true })).toBeInViewport({ ratio: 1 });
  const form = dialog.locator("form");
  await expect.poll(() => form.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await form.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await expect(dialog.getByRole("heading")).toBeInViewport({ ratio: 1 });
  await expect(dialog.getByRole("button", { name: "Guardar contenedor", exact: true })).toBeInViewport({ ratio: 1 });
});

test("catalog confirmation actions fit on mobile with the primary action first", async ({ page }) => {
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app/catalog/vehicles");
  await page.getByRole("button", { name: "Dar de baja", exact: true }).first().click();
  const footer = page.locator('[data-slot="dialog-footer"]');
  const actions = footer.getByRole("button");
  await expect(actions).toHaveCount(2);
  const secondary = await actions.nth(0).boundingBox();
  const primary = await actions.nth(1).boundingBox();
  expect(primary!.y).toBeLessThan(secondary!.y);
  for (const action of [secondary!, primary!]) {
    expect(action.x).toBeGreaterThanOrEqual(16);
    expect(action.x + action.width).toBeLessThanOrEqual(374);
    expect(action.width).toBeGreaterThan(280);
  }
});

test("sheet preserves its slide while software and reduced-motion preferences independently disable it", async ({ page }) => {
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app?destination=services");
  await page.getByRole("button", { name: "Más módulos" }).click();
  const sheet = page.getByRole("dialog", { name: "Más módulos" });
  await expect(sheet).toBeVisible();
  await page.evaluate(() => document.documentElement.removeAttribute("data-overlay-motion"));
  await expect.poll(() => sheet.evaluate((el) => getComputedStyle(el).transitionProperty)).toContain("translate");
  const backdrop = page.locator('[data-slot="sheet-overlay"]');
  expect(await backdrop.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
  expect(await backdrop.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");

  await page.evaluate(() => { document.documentElement.dataset.overlayMotion = "off"; });
  await expect.poll(() => sheet.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
  await page.evaluate(() => document.documentElement.removeAttribute("data-overlay-motion"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => sheet.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
  await page.keyboard.press("Escape");
  await expect(sheet).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Más módulos" })).toBeFocused();
});
