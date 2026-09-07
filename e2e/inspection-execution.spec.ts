import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe.serial("Environmental inspection execution #134", () => {
  test("Crew Member sees the assigned inspection as read-only", async ({ page }) => {
    await loginViaApi(page, "field-crew-member-route");
    await page.goto("/app");

    const serviceCard = page.locator("li").filter({ hasText: "SVC-1112" });
    await expect(serviceCard).toBeVisible();
    await serviceCard.getByRole("button", { name: "Ver detalle" }).click();

    const inspection = page.getByRole("region", { name: /Ejecuci/ });
    await expect(inspection).toBeVisible();
    await expect(inspection.getByText(/solo consulta para integrantes/)).toBeVisible();
    await expect(inspection.getByRole("button", { name: /Completar inspecci/ })).toHaveCount(0);
  });

  test("Crew Leader starts the service, uploads evidence, and records the authoritative result", async ({ page }) => {
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app");

    const serviceCard = page.locator("li").filter({ hasText: "SVC-1112" });
    await expect(serviceCard).toBeVisible();
    await serviceCard.getByRole("button", { name: "Iniciar servicio" }).click();
    await expect(serviceCard.getByText("En curso")).toBeVisible();
    await serviceCard.getByRole("button", { name: "Ver detalle" }).click();

    const inspection = page.getByRole("region", { name: /Ejecuci/ });
    await expect(inspection).toBeVisible();
    await inspection.getByRole("checkbox").all().then(async (checkboxes) => {
      for (const checkbox of checkboxes) await checkbox.check();
    });
    await inspection.getByRole("combobox", { name: /Resultado/ }).selectOption("VIOLATION_FOUND");
    await inspection.getByRole("textbox", { name: /Hallazgos/ }).fill("Emisión visible constatada en la visita.");
    await inspection.getByRole("combobox", { name: /Tipo de infracc/ }).selectOption("AIR_EMISSION");
    await inspection.getByRole("combobox", { name: "Gravedad" }).selectOption("HIGH");
    await inspection.getByRole("combobox", { name: /Acc/ }).selectOption("FORMAL_NOTICE");
    await inspection.getByLabel(/Seleccionar archivos/).setInputFiles({
      name: "evidencia_chimenea.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("inspection-evidence"),
    });
    await inspection.getByRole("button", { name: /Completar inspecci/ }).click();

    await expect(inspection.getByText(/Resultado registrado/)).toBeVisible();
    await expect(inspection.getByText(/Aviso a emitir por Oficina/)).toBeVisible();
  });
});
