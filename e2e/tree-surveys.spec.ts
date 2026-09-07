import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("TreeSurvey ambient history #127", () => {
  test("Field can review tree-2 history and record a high-risk survey with the required risk type", async ({ page }) => {
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app/catalog/trees");
    await page.getByLabel("Árbol para relevar").selectOption("tree-2");
    await page.getByRole("button", { name: "Ver historial de relevamientos" }).click();
    await expect(page.getByRole("heading", { name: /Historial de relevamientos/ })).toBeVisible();
    await expect(page.getByRole("article", { name: /06\/09\/2026/ })).toBeVisible();

    await page.getByRole("button", { name: "Registrar relevamiento" }).click();
    const dialog = page.getByRole("dialog", { name: /Registrar relevamiento/ });
    await dialog.getByLabel("Estado sanitario").selectOption("WEAKENED");
    await dialog.getByLabel("Nivel de riesgo").selectOption("HIGH");
    await dialog.getByRole("button", { name: "Guardar relevamiento" }).click();
    await expect(dialog.getByRole("alert")).toContainText("tipo de riesgo");
    await dialog.getByLabel("Tipo de riesgo").selectOption("TRUNK_INSTABILITY");
    await dialog.getByRole("button", { name: "Guardar relevamiento" }).click();
    await expect(page.getByText("Relevamiento registrado con éxito.")).toBeVisible();
  });
});
