import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { chooseTreeSelectOption, chooseTreeSelectOptions } from "./support/tree-selects";

test.describe("TreeIntervention requests #128", () => {
  test("filters tree interventions by Prioridad #621", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/tree-interventions");
    await expect(page.getByRole("article", { name: /Poda de seguridad/ }).first()).toBeVisible();
    const filtered = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/tree-interventions" && url.searchParams.get("priority") === "CRITICAL";
    });
    await chooseTreeSelectOption(page, page, "Filtrar por prioridad", "Crítica");
    const response = await filtered;
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.every((item: { priority: string }) => item.priority === "CRITICAL")).toBeTruthy();
    await expect(page.getByRole("article", { name: /Extracción/ }).first()).toBeVisible();
    await expect(page.getByRole("article", { name: /Poda de seguridad/ })).toHaveCount(0);
    await chooseTreeSelectOption(page, page, "Filtrar por estado", "Autorizada");
    await expect(page.getByText("Sin solicitudes de intervención", { exact: true })).toBeVisible();
    await chooseTreeSelectOption(page, page, "Filtrar por estado", "Todos");
    const unfiltered = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/tree-interventions" && !url.searchParams.has("priority");
    });
    await chooseTreeSelectOption(page, page, "Filtrar por prioridad", "Todas");
    expect((await unfiltered).ok()).toBeTruthy();
    await expect(page.getByRole("article", { name: /Poda de seguridad/ }).first()).toBeVisible();
  });

  test("Office can create a multi-tree request, inspect all linked trees, and use the guided survey flow", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/tree-interventions");
    await expect(page.getByRole("heading", { name: "Intervenciones de arbolado" })).toBeVisible();

    // La tarjeta se nombra por sus árboles: la solicitud no tiene código propio (#321).
    const existing = page.getByRole("article", { name: "Poda de seguridad · ARB-00443, ARB-00445" }).first();
    await existing.getByRole("button", { name: "Ver detalle" }).click();
    const detail = page.getByRole("dialog", { name: /Detalle de la intervención/ });
    await expect(detail).toContainText("ARB-00443");
    await expect(detail).toContainText("ARB-00445");
    await detail.getByRole("button", { name: "Cerrar detalle" }).click();

    await page.getByRole("button", { name: "Solicitar intervención" }).click();
    const form = page.getByRole("dialog", { name: /Solicitar intervención/ });
    await chooseTreeSelectOption(page, form, "Tipo de intervención", "Poda de seguridad");
    await chooseTreeSelectOptions(page, form, "Árboles a intervenir", [/^ARB-00443/, /^ARB-00445/]);
    await chooseTreeSelectOption(page, form, "Prioridad", "Alta");
    const createInterventionRequest = page.waitForRequest((request) => request.url().endsWith("/api/tree-interventions") && request.method() === "POST");
    await form.getByRole("button", { name: "Crear solicitud de intervención" }).click();
    await expect(await createInterventionRequest.then((request) => request.postDataJSON())).toEqual({
      interventionType: "SAFETY_PRUNING",
      treeIds: ["tree-2", "tree-4"],
      address: "Parque del Bicentenario, sector norte",
      requiresStreetClosure: false,
      priority: "HIGH",
    });
    await expect(form).not.toBeVisible();
    await expect(page.getByText("Solicitud de intervención creada. Estado inicial: solicitada.")).toBeVisible();

    await page.goto("/app/catalog/trees");
    await chooseTreeSelectOption(page, page, "Árbol para relevar", /^ARB-00445/);
    await page.getByRole("button", { name: "Ver historial de relevamientos" }).click();
    await expect(page.getByRole("article", { name: /05\/09\/2026/ })).toBeVisible();
    await page.getByRole("button", { name: "Solicitar intervención sugerida" }).click();
    const guided = page.getByRole("dialog", { name: /Solicitar intervención/ });
    await expect(guided.getByRole("combobox", { name: "Tipo de intervención" })).toContainText("Extracción");
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
