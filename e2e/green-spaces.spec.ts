import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("Green Spaces catalog management @smoke", () => {
  test("Office can filter, create, edit, and deactivate a GreenSpace without action controls", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=catalog");

    const panel = page.locator('section[aria-labelledby="green-spaces-title"]');
    await expect(panel.getByRole("heading", { name: "Espacios verdes" })).toBeVisible();
    await expect(panel.getByText("Parque del Bicentenario")).toBeVisible();

    await panel.getByLabel("Tipo de espacio").selectOption("PARK");
    await expect(panel.getByText("Parque del Bicentenario")).toBeVisible();
    await expect(panel.getByText("Cantero Central")).not.toBeVisible();
    await panel.getByLabel("Tipo de espacio").selectOption("all");

    const name = "Espacio E2E #108";
    await panel.getByRole("button", { name: "Registrar espacio verde" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nombre").fill(name);
    await dialog.getByLabel("Tipo de espacio en el formulario").selectOption("SQUARE");
    await dialog.getByLabel("Superficie (m²)").fill("275");
    await dialog.getByLabel("Zona en el formulario").selectOption("zone-1");
    await dialog.getByRole("button", { name: "Guardar espacio verde" }).click();
    await expect(dialog).not.toBeVisible();

    const createdRow = panel.getByRole("row", { name: new RegExp(name) });
    await expect(createdRow).toBeVisible();
    await createdRow.getByRole("button", { name: "Editar" }).click();
    await page.getByRole("dialog").getByLabel("Nombre").fill("Espacio E2E editado #108");
    await page.getByRole("dialog").getByRole("button", { name: "Guardar espacio verde" }).click();
    const editedRow = panel.getByRole("row", { name: /Espacio E2E editado #108/ });
    await expect(editedRow).toBeVisible();

    page.once("dialog", (browserDialog) => browserDialog.accept());
    await editedRow.getByRole("button", { name: "Dar de baja" }).click();
    await expect(editedRow.getByText("Inactivo")).toBeVisible();
    await expect(panel.getByRole("button", { name: /regar|regar|cortar|riego|corte/i })).toHaveCount(0);
  });

  test("Field can consult GreenSpaces but cannot manage them", async ({ page }) => {
    await loginViaApi(page, "field-crew-member-route");
    await page.goto("/app?destination=catalog");

    const panel = page.locator('section[aria-labelledby="green-spaces-title"]');
    await expect(panel.getByText("Parque del Bicentenario")).toBeVisible();
    await expect(panel.getByRole("button", { name: "Registrar espacio verde" })).toHaveCount(0);
    await expect(panel.getByRole("button", { name: "Editar" })).toHaveCount(0);
    await expect(panel.getByRole("button", { name: "Dar de baja" })).toHaveCount(0);
  });
});

