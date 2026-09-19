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

    await page.getByRole("button", { name: "Tabla", exact: true }).click();
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
    await expect(page.getByText("Falta de cuadrilla").first()).toBeVisible();
    await expect(page.getByText(/ZoneResult\.recordedAt/)).toBeVisible();
  });

  test("Office can inspect exact Incidencias and Residuos details", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=dashboards");

    await page.getByRole("button", { name: /Incidencias/ }).click();
    await expect(page.getByRole("heading", { name: "Reportes por estado" })).toBeVisible();
    await expect(page.getByText(/contenedores y arbolado son instantáneas actuales/i)).toBeVisible();
    await expect(page.getByText(/reportes consideran el período y la resolución media usa solo reportes cerrados/i)).toBeVisible();

    await page.getByRole("button", { name: "Ver tabla de datos", exact: true }).click();
    const incidentsTable = page.getByRole("region", { name: "Tabla de datos de Incidencias" });
    await expect(incidentsTable.getByRole("columnheader", { name: "Desbordes" })).toBeVisible();
    await expect(incidentsTable.getByRole("columnheader", { name: "Daños" })).toBeVisible();
    await expect(incidentsTable.getByText("Cerrados")).toBeVisible();

    await page.getByRole("button", { name: /Residuos/ }).click();
    await page.getByRole("button", { name: "Ver tabla de datos", exact: true }).click();
    const wasteTable = page.getByRole("region", { name: "Tabla de datos de Residuos" });
    await expect(wasteTable.getByRole("columnheader", { name: "Kilogramos" }).first()).toBeVisible();
    await expect(wasteTable.getByRole("columnheader", { name: "Metros cúbicos" }).first()).toBeVisible();
    await expect(wasteTable.getByText("62,8 m³").first()).toBeVisible();
  });

  test("an Office actor without indicator:view cannot open the destination", async ({ page }) => {
    await loginViaApi(page, "office-limited-intake");
    await page.goto("/app?destination=dashboards");
    await expect(page.getByRole("heading", { name: "Indicadores no disponibles" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tableros" })).toHaveCount(0);
  });
});
