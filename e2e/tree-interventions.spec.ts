import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("TreeIntervention requests #128", () => {
  test("Office can create a multi-tree request, inspect all linked trees, and use the guided survey flow", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/tree-interventions");
    await expect(page.getByRole("heading", { name: "Intervenciones de arbolado" })).toBeVisible();

    const existing = page.getByRole("article", { name: /intervention-1/ });
    await existing.getByRole("button", { name: "Ver detalle" }).click();
    const detail = page.getByRole("dialog", { name: /Detalle de la intervención/ });
    await expect(detail).toContainText("ARB-00443");
    await expect(detail).toContainText("ARB-00445");
    await detail.getByRole("button", { name: "Cerrar detalle" }).click();

    await page.getByRole("button", { name: "Solicitar intervención" }).click();
    const form = page.getByRole("dialog", { name: /Solicitar intervención/ });
    await form.getByLabel(/^Tipo de intervención/).selectOption("SAFETY_PRUNING");
    await form.getByLabel(/^Árboles a intervenir/).selectOption(["tree-2", "tree-4"]);
    await form.getByLabel(/^Prioridad/).selectOption("HIGH");
    await form.getByRole("button", { name: "Crear solicitud de intervención" }).click();
    await expect(form).not.toBeVisible();
    await expect(page.getByText("Solicitud de intervención creada. Estado inicial: solicitada.")).toBeVisible();

    await page.goto("/app/catalog/trees");
    await page.getByLabel("Árbol para relevar").selectOption("tree-4");
    await page.getByRole("button", { name: "Ver historial de relevamientos" }).click();
    await expect(page.getByRole("article", { name: /05\/09\/2026/ })).toBeVisible();
    await page.getByRole("button", { name: "Solicitar intervención sugerida" }).click();
    const guided = page.getByRole("dialog", { name: /Solicitar intervención/ });
    await expect(guided.getByLabel(/^Tipo de intervención/)).toHaveValue("REMOVAL");
    await expect(guided.getByLabel(/^Justificación/)).toHaveValue("Relevamiento 05/09/2026 (survey-4).");
  });

  test("Field can consult intervention requests but cannot create one", async ({ page }) => {
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app/catalog/tree-interventions");
    await expect(page.getByRole("heading", { name: "Intervenciones de arbolado" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Solicitar intervención" })).not.toBeVisible();
    await expect(page.getByText(/puede consultar las solicitudes/i)).toBeVisible();
  });
});
