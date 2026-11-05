import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { chooseOption } from "./support/reports-indicators";

test.describe("operational indicator dashboard #138", () => {
  test("abre cada familia desde el tablero y vuelve con el navegador", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=dashboards");
    for (const family of ["Cobertura", "Cumplimiento", "Incidencias", "Residuos"]) {
      await page.getByRole("button", { name: "Detalle por familia" }).click();
    await page.getByRole("menuitem", { name: family }).click();
      await expect(page.getByRole("heading", { name: `Detalle de ${family}` })).toBeFocused();
      await page.goBack();
      await expect(page.getByRole("button", { name: "Detalle por familia" })).toBeVisible();
    }
  });

  test("Field can open the semantic indicator table on a narrow screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=dashboards");
    await page.getByRole("button", { name: "Detalle por familia" }).click();
    await page.getByRole("menuitem", { name: "Cobertura" }).click();

    const viewToggle = page.getByRole("group", { name: "Vista" });
    await expect(viewToggle.getByRole("button", { name: "Ver gráfico" })).toHaveAttribute("aria-pressed", "true");
    await viewToggle.getByRole("button", { name: "Ver tabla" }).click();
    await page.getByRole("tab", { name: "Territorio" }).click();

    const territory = page.getByRole("region", { name: "Detalle territorial" });
    await expect(territory.getByRole("table").first()).toBeVisible();
  });

  test("Coverage distinguishes upcoming work and flags low samples", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=dashboards");
    await page.getByRole("button", { name: "Detalle por familia" }).click();
    await page.getByRole("menuitem", { name: "Cobertura" }).click();
    const detail = page.locator("section[aria-labelledby='indicator-detail-title']");
    await expect(detail.getByText("Programado a futuro").first()).toBeVisible();
    const small = detail.getByRole("row").filter({ hasText: "Intervención puntual" });
    await expect(small).toContainText("Muestra baja");
    await expect(small).toContainText("1");
  });

  test("Office sees the four families, filters, and the visual table companion", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=dashboards");

    await expect(page.getByRole("heading", { name: "Tableros" })).toBeVisible();
    await page.getByRole("button", { name: "Detalle por familia" }).click();
    await expect(page.getByRole("menuitem", { name: "Cobertura" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Cumplimiento" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Incidencias" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Residuos" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("Actualizado")).toBeVisible();

    const detail = page.locator("section[aria-labelledby='indicator-detail-title']");
    await page.getByRole("button", { name: "Más filtros" }).click();
    await chooseOption(page, "Zona operativa", "Palermo");
    await page.getByRole("button", { name: "Actualizar" }).click();
    await page.getByRole("button", { name: "Detalle por familia" }).click();
    await page.getByRole("menuitem", { name: "Cobertura" }).click();
    await expect(detail.getByText("Costera").first()).toBeVisible();

    await page.getByRole("button", { name: "Ver tabla", exact: true }).click();
    await expect(page.getByRole("table").first()).toBeVisible();
    await expect(page.getByText("Objetivos atendidos sobre objetivos programados.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Exportar CSV" }).last()).toBeVisible();
  });

  test("the dashboard alias opens the same gated Office surface", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/dashboard");
    await expect(page.getByRole("heading", { name: "Tableros" })).toBeVisible();
    await expect(page).toHaveURL(/\/app\?destination=dashboards(&|$)/, { timeout: 15_000 });
  });

  test("Office can inspect exact Cobertura and Cumplimiento details", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=dashboards");

    await expect(page.getByText(/Unidad de análisis/)).toHaveCount(0);
    await page.getByRole("button", { name: "Detalle por familia" }).click();
    await page.getByRole("menuitem", { name: "Cobertura" }).click();
    // La cobertura por zona es una tabla: el nombre es el encabezado de la fila y los conteos están en sus celdas.
    const centroRow = page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Centro" }) });
    await expect(centroRow).toBeVisible();
    await expect(centroRow).toContainText("156");
    await expect(centroRow).toContainText("140");
    await expect(centroRow).toContainText("89,7 %");

    await page.getByRole("button", { name: "Ver tabla" }).click();
    const coverageTable = page.getByRole("region", { name: "Tabla de datos de Cobertura" });
    await expect(coverageTable).toBeVisible();
    await expect(coverageTable.getByRole("columnheader", { name: "Atendidos" }).first()).toBeVisible();
    const zoneTable = coverageTable.getByRole("table", { name: /Cobertura por zona/ });
    const centroCoverageRow = zoneTable.getByRole("row", { name: /Centro/ });
    await expect(centroCoverageRow).toContainText("156");
    await expect(centroCoverageRow).toContainText("140");
    await expect(centroCoverageRow).toContainText("89,7 %");

    await page.getByRole("button", { name: "Volver a Tableros" }).click();
    await page.getByRole("button", { name: "Detalle por familia" }).click();
    await page.getByRole("menuitem", { name: "Cumplimiento" }).click();
    await expect(page.getByText("Cuadrilla no disponible").first()).toBeVisible();
    await expect(page.getByText(/ZoneResult\.recordedAt/)).toHaveCount(0);
  });

  test("Office can inspect exact Incidencias and Residuos details", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=dashboards");

    await page.getByRole("button", { name: "Detalle por familia" }).click();
    await page.getByRole("menuitem", { name: "Incidencias" }).click();
    await expect(page.getByRole("heading", { name: "Reportes por estado" })).toBeVisible();
    await expect(page.getByText(/Estados de contenedores y riesgo de arbolado: situación actual/)).toBeVisible();
    await expect(page.getByText(/reportes consideran el período/i)).toHaveCount(0);

    await page.getByRole("button", { name: "Ver tabla", exact: true }).click();
    const incidentsTable = page.getByRole("region", { name: "Tabla de datos de Incidencias" });
    await expect(incidentsTable.getByRole("columnheader", { name: "Desbordes" })).toBeVisible();
    await expect(incidentsTable.getByRole("columnheader", { name: "Daños" })).toBeVisible();
    await expect(incidentsTable.getByText("Cerrado")).toBeVisible();

    await page.getByRole("button", { name: "Volver a Tableros" }).click();
    await page.getByRole("button", { name: "Detalle por familia" }).click();
    await page.getByRole("menuitem", { name: "Residuos" }).click();
    await page.getByRole("button", { name: "Ver tabla", exact: true }).click();
    const wasteTable = page.getByRole("region", { name: "Tabla de datos de Residuos" });
    await expect(wasteTable.getByRole("columnheader", { name: "Kilogramos" }).first()).toBeVisible();
    await expect(wasteTable.getByRole("columnheader", { name: "Metros cúbicos" }).first()).toBeVisible();
    await expect(wasteTable.getByText("62,8 m³").first()).toBeVisible();
  });
});

 test("restaura el dato seleccionado al volver con el navegador", async ({ page }) => {
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app?destination=dashboards");
  await page.getByRole("button", { name: "Detalle por familia" }).click();
    await page.getByRole("menuitem", { name: "Cobertura" }).click();
  await page.getByRole("button", { name: "Centro", exact: true }).click();
  await expect(page.getByText(/Seleccionado: Centro/)).toBeVisible();
  await page.getByRole("button", { name: "Volver a Tableros" }).click();
  await page.getByRole("button", { name: "Detalle por familia" }).click();
    await page.getByRole("menuitem", { name: "Incidencias" }).click();
  await page.goBack();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Detalle de Cobertura" })).toBeVisible();
  await expect(page.getByText(/Seleccionado: Centro/)).toBeVisible();
});
