import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

async function heightOf(locator: import("@playwright/test").Locator) {
  return locator.evaluate((element) => element.getBoundingClientRect().height);
}

test.describe("shared control density", () => {
  test("button, field, and dashboard controls match desktop and mobile targets at 760 px", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");

    for (const { width, height, expected } of [
      { width: 1280, height: 800, expected: 40 },
      { width: 760, height: 844, expected: 48 },
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto("/app?destination=services");
      await expect(page.getByRole("heading", { name: "Servicios", exact: true })).toBeVisible();

      await expect.poll(() => heightOf(page.getByRole("button", { name: "Cerrar sesión" }))).toBe(expected);
      await expect.poll(() => heightOf(page.getByRole("button", { name: "Programar servicio" }))).toBe(expected);
      // On phones the search lives in the «Filtros (n)» sheet; its trigger carries the touch target.
      const searchTarget = width === 760
        ? page.getByRole("button", { name: /^Filtros \(\d+\)$/ })
        : page.getByRole("searchbox", { name: "Buscar servicios" });
      await expect.poll(() => heightOf(searchTarget)).toBe(expected);

      await page.goto("/app?destination=dashboards");
      await expect(page.getByRole("heading", { name: "Tableros" })).toBeVisible();
      const periods = page.getByRole("group", { name: "Período", exact: true });
      await expect.poll(() => heightOf(periods)).toBe(expected);
      for (const name of ["Semana", "Mes", "Trimestre", "Más filtros", "Gráfico", "Tabla", "Ver detalle de Servicios sin realizar", "Cobertura"]) {
        await expect.poll(() => heightOf(page.getByRole("button", { name, exact: true }))).toBe(expected);
      }
      await expect.poll(() => heightOf(page.getByRole("link", { name: "Ver lista de servicios sin realizar" }))).toBe(expected);
      await page.getByRole("button", { name: "Ver detalle de Servicios sin realizar" }).click();
      await expect.poll(() => heightOf(page.getByRole("button", { name: "Volver a Tableros" }))).toBe(expected);
      if (width === 760) {
        await expect.poll(() => heightOf(page.getByRole("tablist", { name: "Secciones del tablero" }))).toBe(expected);
        await expect.poll(() => heightOf(page.getByRole("tab", { name: "Resumen" }))).toBe(expected);
      }
    }
  });
});
