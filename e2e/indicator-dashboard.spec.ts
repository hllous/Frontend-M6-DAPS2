import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { chooseOption } from "./support/reports-indicators";

test.describe("operational indicator dashboard #138", () => {
  test("keeps each family summary inside its selectable card at desktop and mobile widths", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=dashboards");

    const coverageCard = page.getByRole("button", { name: "Cobertura: seleccionar familia" });
    await expect(coverageCard).toContainText("82,2 %");
    await expect(coverageCard).toContainText("Cobertura de objetivos");
    await expect(coverageCard).toContainText(/Detalle seleccionado|Ver detalle/);

    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      const geometry = await coverageCard.evaluate((card) => {
        const cardRect = card.getBoundingClientRect();
        const childrenFit = Array.from(card.children).every((child) => {
          const childRect = child.getBoundingClientRect();
          return childRect.top >= cardRect.top && childRect.bottom <= cardRect.bottom;
        });
        return { height: cardRect.height, childrenFit };
      });

      expect(geometry.height).toBeGreaterThan(100);
      expect(geometry.childrenFit).toBe(true);
    }
  });

  test("Field can open the semantic indicator table on a narrow screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=dashboards");

    const viewToggle = page.getByRole("group", { name: "Visualización de indicadores" });
    await expect(viewToggle.getByRole("button", { name: "Barras" })).toHaveAttribute("aria-pressed", "true");
    await viewToggle.getByRole("button", { name: "Tabla" }).click();
    await page.getByRole("tab", { name: "Territorio" }).click();

    const territory = page.getByRole("region", { name: "Detalle territorial" });
    await expect(territory.getByRole("table").first()).toBeVisible();
  });

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
    await chooseOption(page, "Zona operativa", "Palermo");
    await page.getByRole("button", { name: "Actualizar" }).click();
    await expect(detail.getByText("Costera").first()).toBeVisible();

    await page.getByRole("button", { name: "Tabla", exact: true }).click();
    await expect(page.getByRole("table").first()).toBeVisible();
    await expect(page.getByText("Valores exactos de cobertura por zona")).toBeVisible();
  });

  test("the dashboard alias opens the same gated Office surface", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/app\?destination=dashboards(&|$)/);
    await expect(page.getByRole("heading", { name: "Indicadores operativos" })).toBeVisible();
  });

  test("Office can inspect exact Cobertura and Cumplimiento details", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=dashboards");

    await expect(page.getByText(/Unidad de análisis:/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Centro.*89,7.*140.*156/i })).toBeVisible();

    await page.getByRole("button", { name: "Tabla" }).click();
    const coverageTable = page.getByRole("region", { name: "Tabla de datos de Cobertura" });
    await expect(coverageTable).toBeVisible();
    await expect(coverageTable.getByRole("columnheader", { name: "Atendidos" }).first()).toBeVisible();
    await expect(coverageTable.getByText("140 objetivos").first()).toBeVisible();

    await page.getByRole("button", { name: /Cumplimiento/ }).click();
    await expect(page.getByText("Cuadrilla no disponible").first()).toBeVisible();
    await expect(page.getByText(/ZoneResult\.recordedAt/)).toBeVisible();
  });

  test("Office can inspect exact Incidencias and Residuos details", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=dashboards");

    await page.getByRole("button", { name: /Incidencias/ }).click();
    await expect(page.getByRole("heading", { name: "Reportes por estado" })).toBeVisible();
    await expect(page.getByText(/contenedores y arbolado son instantáneas actuales/i)).toBeVisible();
    await expect(page.getByText(/reportes consideran el período y la resolución media usa solo reportes cerrados/i)).toBeVisible();

    await page.getByRole("button", { name: "Tabla", exact: true }).click();
    const incidentsTable = page.getByRole("region", { name: "Tabla de datos de Incidencias" });
    await expect(incidentsTable.getByRole("columnheader", { name: "Desbordes" })).toBeVisible();
    await expect(incidentsTable.getByRole("columnheader", { name: "Daños" })).toBeVisible();
    await expect(incidentsTable.getByText("Cerrado")).toBeVisible();

    await page.getByRole("button", { name: /Residuos/ }).click();
    await page.getByRole("button", { name: "Tabla", exact: true }).click();
    const wasteTable = page.getByRole("region", { name: "Tabla de datos de Residuos" });
    await expect(wasteTable.getByRole("columnheader", { name: "Kilogramos" }).first()).toBeVisible();
    await expect(wasteTable.getByRole("columnheader", { name: "Metros cúbicos" }).first()).toBeVisible();
    await expect(wasteTable.getByText("62,8 m³").first()).toBeVisible();
  });

  test("an Office actor without indicator:view cannot open the destination", async ({ page }) => {
    await loginViaApi(page, "office-limited-intake");
    await page.goto("/app?destination=dashboards");
    await expect(page.getByRole("heading", { name: "Indicadores no disponibles" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tableros" })).toHaveCount(0);
  });
});
