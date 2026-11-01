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
    await expect(page.getByRole("button", { name: "Cobertura: seleccionar familia" })).toContainText("82,2 %", { timeout: 15_000 });

    const viewToggle = page.getByRole("group", { name: "Vista" });
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
    await expect(page.getByText("Objetivos atendidos sobre objetivos programados.")).toBeVisible();
    await expect(page.getByText("Bajo la meta").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Exportar CSV" }).last()).toBeVisible();
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

    await expect(page.getByText(/Unidad de análisis/)).toHaveCount(0);
    // La cobertura por zona es una tabla: el nombre es el encabezado de la fila y los conteos están en sus celdas.
    const centroRow = page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Centro" }) });
    await expect(centroRow).toBeVisible();
    await expect(centroRow).toContainText("156");
    await expect(centroRow).toContainText("140");
    await expect(centroRow).toContainText("89,7 %");

    await page.getByRole("button", { name: "Tabla" }).click();
    const coverageTable = page.getByRole("region", { name: "Tabla de datos de Cobertura" });
    await expect(coverageTable).toBeVisible();
    await expect(coverageTable.getByRole("columnheader", { name: "Atendidos" }).first()).toBeVisible();
    const zoneTable = coverageTable.getByRole("table", { name: /Cobertura por zona/ });
    const centroCoverageRow = zoneTable.getByRole("row", { name: /Centro/ });
    await expect(centroCoverageRow).toContainText("156");
    await expect(centroCoverageRow).toContainText("140");
    await expect(centroCoverageRow).toContainText("89,7 %");

    await page.getByRole("button", { name: /Cumplimiento/ }).click();
    await expect(page.getByText("Cuadrilla no disponible").first()).toBeVisible();
    await expect(page.getByText(/ZoneResult\.recordedAt/)).toHaveCount(0);
  });

  test("Office can inspect exact Incidencias and Residuos details", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=dashboards");

    await page.getByRole("button", { name: /Incidencias/ }).click();
    await expect(page.getByRole("heading", { name: "Reportes por estado" })).toBeVisible();
    await expect(page.getByText("Contenedores y arbolado: situación actual.")).toBeVisible();
    await expect(page.getByText(/reportes consideran el período/i)).toHaveCount(0);

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
});
