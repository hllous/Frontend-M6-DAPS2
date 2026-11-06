import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("indicator dashboard stage 2 #790", () => {
  test("Office sees incident history and scheduling deviation", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=dashboards");

    await page.getByRole("button", { name: "Detalle por familia" }).click();
    await page.getByRole("menuitem", { name: "Incidencias" }).click();
    const incidents = page.locator("section[aria-labelledby='indicator-detail-title']");
    await expect(incidents.getByRole("group", { name: "Reportes resueltos en plazo" })).toContainText("88,9 %");
    await expect(incidents.getByRole("group", { name: "Reportes vencidos hoy" })).toContainText("14,3 %");
    await expect(incidents.getByRole("group", { name: "Reportes vencidos hoy" })).not.toContainText(/Mejor|Peor|Sin datos del período anterior/);
    await expect(incidents.getByRole("group", { name: "Desbordes de contenedores" })).toContainText("7 incidentes");
    await expect(incidents.getByRole("group", { name: "Desbordes de contenedores" })).toContainText("Meta: tendencia descendente");
    const pendingDamage = incidents.getByRole("group", { name: "Contenedores con daños pendientes" });
    await expect(pendingDamage).toContainText("Sin dato");
    await expect(pendingDamage).toContainText("Historial disponible desde 30/10/2026.");
    await expect(pendingDamage).not.toContainText("0 contenedores");

    await page.getByRole("button", { name: "Volver a Tableros" }).click();
    await page.getByRole("button", { name: "Detalle por familia" }).click();
    await page.getByRole("menuitem", { name: "Cumplimiento" }).click();
    const compliance = page.locator("section[aria-labelledby='indicator-detail-title']");
    await expect(compliance.getByRole("group", { name: "Desvío de programación" })).toContainText("8,8 %");
    await expect(compliance.getByRole("group", { name: "Desvío de programación" })).toContainText("Meta ≤ 10 %");
  });
});
