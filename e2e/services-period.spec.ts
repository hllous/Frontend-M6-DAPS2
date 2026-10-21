import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { chooseServicesPeriod, expectServicesPeriod } from "./support/services-627-controls";

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`Services period selector changes the window and the URL at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=services");
    await expect(page.getByRole("heading", { name: "Servicios Urbanos" })).toBeVisible();

    if (viewport.width === 390) {
      const period = page.getByRole("combobox", { name: "Período" });
      const categories = page.getByRole("button", { name: "Categorías" });
      const map = page.getByRole("region", { name: "Mapa territorial de Servicios" });
      await expect(map).toBeVisible();

      const [periodBox, categoriesBox, mapBox] = await Promise.all([
        period.boundingBox(),
        categories.boundingBox(),
        map.boundingBox(),
      ]);
      expect(periodBox).not.toBeNull();
      expect(categoriesBox).not.toBeNull();
      expect(mapBox).not.toBeNull();
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
    await expect(page.getByRole("heading", { name: "Servicios Urbanos" })).toBeVisible();

    await page.getByRole("button", { name: "Seleccionar servicio Poda de árbol — Av. Rivadavia 2200" }).click();
    await page.getByRole("button", { name: "Ver detalle completo" }).click();

    const detail = page.getByRole("region", { name: "Detalle completo de Poda de árbol — Av. Rivadavia 2200" });
    const crewLabel = detail.getByText("Cuadrilla asignada", { exact: true });
    await expect(crewLabel).toBeVisible();

    const crewCard = crewLabel.locator("xpath=../..");
    const scheduleCard = detail.getByText("Programación", { exact: true }).locator("xpath=..");
    const assign = crewCard.getByRole("button", { name: "Asignar" });
    const [crewCardBox, scheduleCardBox, assignBox, actionBarBox, contentIntroBox] = await Promise.all([
      crewCard.boundingBox(),
      scheduleCard.boundingBox(),
      assign.boundingBox(),
      detail.locator(":scope > div").first().boundingBox(),
      detail.getByText("Servicio en Punto", { exact: true }).boundingBox(),
    ]);
    expect(crewCardBox).not.toBeNull();
    expect(scheduleCardBox).not.toBeNull();
    expect(assignBox).not.toBeNull();
    expect(actionBarBox).not.toBeNull();
    expect(contentIntroBox).not.toBeNull();
    expect(crewCardBox!.height).toBeLessThan(110);
    expect(Math.abs(crewCardBox!.height - scheduleCardBox!.height)).toBeLessThanOrEqual(1);
    expect(assignBox!.height).toBeLessThanOrEqual(20);
    expect(contentIntroBox!.y - (actionBarBox!.y + actionBarBox!.height)).toBeGreaterThanOrEqual(16);
    expect(await assign.evaluate((element) => element.tagName)).toBe("BUTTON");
    await assign.focus();
    await expect(assign).toBeFocused();
  });
}
