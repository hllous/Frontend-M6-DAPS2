import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { chooseTreeSelectOption } from "./support/tree-selects";

test.describe("TreeSurvey ambient history #127", () => {
  test("Field can review tree-2 history and record a high-risk survey with the required risk type", async ({ page }) => {
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app/catalog/trees");
    await chooseTreeSelectOption(page, page, "Árbol para relevar", /^ARB-00443/);
    await page.getByRole("button", { name: "Ver historial de relevamientos" }).click();
    await expect(page.getByRole("heading", { name: /Historial de relevamientos/ })).toBeVisible();
    await expect(page.getByRole("article", { name: /06\/09\/2026/ })).toBeVisible();

    await page.getByRole("button", { name: "Registrar relevamiento" }).click();
    const dialog = page.getByRole("dialog", { name: /Registrar relevamiento/ });
    await chooseTreeSelectOption(page, dialog, "Estado sanitario", "Debilitado");
    await chooseTreeSelectOption(page, dialog, "Nivel de riesgo", "Alto");
    await dialog.getByRole("button", { name: "Guardar relevamiento" }).click();
    await expect(dialog.getByRole("alert")).toContainText("tipo de riesgo");
    await chooseTreeSelectOption(page, dialog, "Tipo de riesgo", "Inestabilidad del tronco");
    const createSurveyRequest = page.waitForRequest((request) => request.url().endsWith("/api/trees/tree-2/surveys") && request.method() === "POST");
    await dialog.getByRole("button", { name: "Guardar relevamiento" }).click();
    await expect(await createSurveyRequest.then((request) => request.postDataJSON())).toEqual({
      surveyedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T12:00:00\.000Z$/),
      healthStatus: "WEAKENED",
      riskLevel: "HIGH",
      riskType: "TRUNK_INSTABILITY",
      requiresStreetClosure: false,
      requiresPublicWorks: false,
    });
    await expect(page.getByText("Relevamiento registrado con éxito.")).toBeVisible();
  });
});
