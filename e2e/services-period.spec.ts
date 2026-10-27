import { expect, test, type Page } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { chooseServicesPeriod, expectServicesPeriod } from "./support/services-627-controls";

async function openServices(page: Page) {
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app?destination=services");
  await expect(page.getByRole("heading", { name: "Servicios" })).toBeVisible();
}

async function dispatchTouchGesture(
  page: Page,
  x: number,
  startY: number,
  moveYs: number[],
  onMove?: (index: number) => Promise<void>,
) {
  const session = await page.context().newCDPSession(page);
  const touchPoint = (y: number) => ({ x, y, radiusX: 8, radiusY: 8, force: 1 });

  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [touchPoint(startY)],
  });
  for (const [index, y] of moveYs.entries()) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [touchPoint(y)],
    });
    await page.waitForTimeout(60);
    await onMove?.(index);
  }
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await session.detach();
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`Services period selector changes the window and the URL at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=services");
    await expect(page.getByRole("heading", { name: "Servicios" })).toBeVisible();

    if (viewport.width === 390) {
      const period = page.getByRole("combobox", { name: "Período" });
      const categories = page.getByRole("button", { name: "Categorías" });
      const map = page.getByRole("region", { name: "Mapa de servicios" });
      await expect(map).toBeVisible();

      const [periodBox, categoriesBox, mapBox] = await Promise.all([
        period.boundingBox(),
        categories.boundingBox(),
        map.boundingBox(),
      ]);
      expect(periodBox).not.toBeNull();
      expect(categoriesBox).not.toBeNull();
      expect(mapBox).not.toBeNull();
      expect(categoriesBox!.x + categoriesBox!.width).toBeLessThanOrEqual(viewport.width);
      expect(Math.abs(
        periodBox!.y + periodBox!.height / 2 - categoriesBox!.y - categoriesBox!.height / 2,
      )).toBeLessThanOrEqual(1);
      expect(mapBox!.y).toBeLessThan(255);
    }

    await chooseServicesPeriod(page, "Este mes");
    await expectServicesPeriod(page, "Este mes");
    await expect(page).toHaveURL(/periodo=mes/);

    await chooseServicesPeriod(page, "Todo el período");
    await expectServicesPeriod(page, "Todo el período");
  });

  test(`Service detail keeps crew assignment compact and keyboard accessible at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=services");
    await expect(page.getByRole("heading", { name: "Servicios" })).toBeVisible();

    await page.getByRole("button", { name: "Seleccionar servicio Poda de árbol — Av. Rivadavia 2200" }).click();
    await page.getByRole("button", { name: "Ver detalle" }).click();

    const detail = page.getByRole("region", { name: "Detalle completo de Poda de árbol — Av. Rivadavia 2200" });
    const crewLabel = detail.getByText("Cuadrilla", { exact: true }).first();
    await expect(crewLabel).toBeVisible();

    const crewCard = crewLabel.locator("xpath=../..");
    const scheduleCard = detail.getByText("Programación", { exact: true }).locator("xpath=..");
    const assign = crewCard.getByRole("button", { name: "Asignar" });
    const [crewCardBox, scheduleCardBox, assignBox, actionBarBox, contentIntroBox] = await Promise.all([
      crewCard.boundingBox(),
      scheduleCard.boundingBox(),
      assign.boundingBox(),
      detail.locator(":scope > div").first().boundingBox(),
      detail.getByRole("heading", { level: 1 }).boundingBox(),
    ]);
    expect(crewCardBox).not.toBeNull();
    expect(scheduleCardBox).not.toBeNull();
    expect(assignBox).not.toBeNull();
    expect(actionBarBox).not.toBeNull();
    expect(contentIntroBox).not.toBeNull();
    // Side by side the grid stretches both cards; stacked on a phone the crew card is shorter now that its sub-line is gone.
    if (viewport.width > 390) expect(Math.abs(crewCardBox!.height - scheduleCardBox!.height)).toBeLessThanOrEqual(1);
    expect(assignBox!.height).toBeLessThanOrEqual(20);
    expect(contentIntroBox!.y - (actionBarBox!.y + actionBarBox!.height)).toBeGreaterThanOrEqual(16);
    expect(await assign.evaluate((element) => element.tagName)).toBe("BUTTON");
    await assign.focus();
    await expect(assign).toBeFocused();

    if (viewport.width === 390) {
      const period = page.getByRole("combobox", { name: "Período" });
      const categories = page.getByRole("button", { name: "Categorías" });
      await expect(period).toHaveCount(0);
      await expect(categories).toHaveCount(0);

      await page.getByRole("button", { name: "Volver a Servicios" }).click();

      await expect(period).toBeVisible();
      await expect(categories).toBeVisible();
    }
  });
}

test.describe("Services mobile drawer touch", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("a touch drag follows the handle between snap points", async ({ page }) => {
    await openServices(page);

    const handle = page.getByRole("slider", { name: "Altura de la lista" });
    const popup = page.locator('[data-slot="drawer-popup"]');
    await expect(handle).toHaveAttribute("aria-valuetext", "media");
    await page.waitForTimeout(500);

    const initialPopup = await popup.boundingBox();
    const initialHandle = await handle.boundingBox();
    expect(initialPopup).not.toBeNull();
    expect(initialHandle).not.toBeNull();

    const x = initialHandle!.x + initialHandle!.width / 2;
    const y = initialHandle!.y + initialHandle!.height / 2;
    await dispatchTouchGesture(page, x, y, Array.from({ length: 9 }, (_, index) => y - (index + 1) * 40), async (index) => {
      if (index !== 2) return;
      const movingPopup = await popup.boundingBox();
      expect(movingPopup).not.toBeNull();
      expect(movingPopup!.y).toBeLessThan(initialPopup!.y - 20);
    });
    const followingPointer = await popup.boundingBox();
    expect(followingPointer).not.toBeNull();
    expect(followingPointer!.y).toBeLessThan(initialPopup!.y - 30);
    await page.waitForTimeout(250);
    await expect(handle).toHaveAttribute("aria-valuetext", "completa");

    const fullHandle = await handle.boundingBox();
    const fullPopup = await popup.boundingBox();
    expect(fullHandle).not.toBeNull();
    expect(fullPopup).not.toBeNull();
    const fullX = fullHandle!.x + fullHandle!.width / 2;
    const fullY = fullHandle!.y + fullHandle!.height / 2;
    await dispatchTouchGesture(page, fullX, fullY, Array.from({ length: 9 }, (_, index) => fullY + (index + 1) * 20), async (index) => {
      if (index !== 2) return;
      const movingPopup = await popup.boundingBox();
      expect(movingPopup).not.toBeNull();
      expect(movingPopup!.y).toBeGreaterThan(fullPopup!.y + 10);
    });
    await page.waitForTimeout(250);
    await expect(handle).toHaveAttribute("aria-valuetext", "media");
  });

  test("a touch tap leaves the snap unchanged and keyboard can resize it", async ({ page }) => {
    await openServices(page);

    const handle = page.getByRole("slider", { name: "Altura de la lista" });
    await expect(handle).toHaveAttribute("aria-valuetext", "media");
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();
    await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect(handle).toHaveAttribute("aria-valuetext", "media");

    await handle.focus();
    await page.keyboard.press("ArrowUp");
    await expect(handle).toHaveAttribute("aria-valuetext", "completa");
    await page.keyboard.press("ArrowDown");
    await expect(handle).toHaveAttribute("aria-valuetext", "media");
  });
});

test.describe("Services phone preview replaces the list filters", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("a touch tap on a service hides the period and category filters until the preview closes", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=services");
    await expect(page.getByRole("heading", { name: "Servicios" })).toBeVisible();

    const period = page.getByRole("combobox", { name: "Período" });
    const categories = page.getByRole("button", { name: "Categorías" });
    await expect(period).toBeVisible();
    await expect(categories).toBeVisible();

    const serviceCell = page.locator('tr[data-service-id="SVC-1043"]').getByRole("cell").nth(1);
    await serviceCell.scrollIntoViewIfNeeded();
    const box = await serviceCell.boundingBox();
    expect(box).not.toBeNull();
    const tapX = box!.x + box!.width / 2;
    const tapY = box!.y + box!.height / 2;
    await expect
      .poll(() => page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("tr")?.dataset.serviceId, [tapX, tapY]))
      .toBe("SVC-1043");
    await page.touchscreen.tap(tapX, tapY);

    await expect(page).toHaveURL(/selected=SVC-1043/);
    await expect(period).toBeHidden();
    await expect(categories).toBeHidden();

    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    await expect(period).toBeVisible();
    await expect(categories).toBeVisible();
  });
});
