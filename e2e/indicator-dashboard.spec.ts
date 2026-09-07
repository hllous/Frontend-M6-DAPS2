import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("operational indicator dashboard #138", () => {
  test("Office sees the four families, filters, and the visual table companion", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=dashboards");

    await expect(page.getByRole("heading", { name: "Indicadores operativos" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Cobertura/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Cumplimiento/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Incidencias/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Residuos/ })).toBeVisible();
    await expect(page.getByText("Actualizado")).toBeVisible();

    await page.getByLabel("Zona operativa").selectOption("zone-2");
    await page.getByRole("button", { name: "Actualizar" }).click();
    await expect(page.getByText("Costera").first()).toBeVisible();

    await page.getByRole("button", { name: "Tabla" }).click();
    await expect(page.getByRole("table").first()).toBeVisible();
    await expect(page.getByText("Valores exactos de cobertura por zona")).toBeVisible();
  });

  test("the dashboard alias opens the same gated Office surface", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/app\?destination=dashboards$/);
    await expect(page.getByRole("heading", { name: "Indicadores operativos" })).toBeVisible();
  });

  test("an Office actor without indicator:view cannot open the destination", async ({ page }) => {
    await loginViaApi(page, "office-limited-intake");
    await page.goto("/app?destination=dashboards");
    await expect(page.getByRole("heading", { name: "Acciones de la jornada" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tableros" })).toHaveCount(0);
  });
});
