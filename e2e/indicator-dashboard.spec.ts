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

    const detail = page.locator("section[aria-labelledby='indicator-detail-title']");
    await page.getByLabel("Zona operativa").selectOption("zone-2");
    await page.getByRole("button", { name: "Actualizar" }).click();
    await expect(detail.getByText("Costera").first()).toBeVisible();

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

  test("Office can inspect exact Cobertura and Cumplimiento details", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=dashboards");

    await expect(page.getByText(/Unidad de análisis:/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Centro.*93,6.*146.*156/i })).toBeVisible();

    await page.getByRole("button", { name: "Ver tabla de datos" }).click();
    const coverageTable = page.getByRole("region", { name: "Tabla de datos de Cobertura" });
    await expect(coverageTable).toBeVisible();
    await expect(coverageTable.getByRole("columnheader", { name: "Atendidos" }).first()).toBeVisible();
    await expect(coverageTable.getByText("146 objetivos").first()).toBeVisible();

    await page.getByRole("button", { name: /Cumplimiento/ }).click();
    await expect(page.getByText("Falta de cuadrilla")).toBeVisible();
    await expect(page.getByText(/ZoneResult\.recordedAt/)).toBeVisible();
  });

  test("an Office actor without indicator:view cannot open the destination", async ({ page }) => {
    await loginViaApi(page, "office-limited-intake");
    await page.goto("/app?destination=dashboards");
    await expect(page.getByRole("heading", { name: "Indicadores no disponibles" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tableros" })).toHaveCount(0);
  });
});
