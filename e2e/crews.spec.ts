import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { chooseCatalogBOption } from "./support/catalog-612-controls";

test.describe("Crew catalog @smoke", () => {
  test("Office registers and edits a crew with M1 labels and unchanged request values", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/crews");
    const name = `Cuadrilla e2e 612 ${Date.now()}`;
    await page.getByRole("button", { name: "Registrar cuadrilla", exact: true }).click();
    const createDialog = page.getByRole("dialog", { name: "Registrar cuadrilla" });
    await createDialog.getByRole("textbox", { name: "Nombre", exact: true }).fill(name);
    await chooseCatalogBOption(page, createDialog.getByRole("combobox", { name: "Responsable de cuadrilla (M1)" }), "Carlos López");
    await chooseCatalogBOption(page, createDialog.getByRole("combobox", { name: "Organización (M1)" }), "Municipalidad");
    await chooseCatalogBOption(page, createDialog.getByRole("combobox", { name: "Turno predeterminado" }), "Tarde");
    const creation = page.waitForRequest(request => request.url().endsWith("/api/crews") && request.method() === "POST");
    await createDialog.getByRole("button", { name: "Guardar cuadrilla" }).click();
    expect((await creation).postDataJSON()).toEqual({ name, crewType: "MUNICIPAL", leaderUserId: "user-carlos", organizationId: "org-municipal", defaultShift: "AFTERNOON" });
    const row = page.getByRole("row", { name: new RegExp(name) });
    const detailsButton = row.getByRole("button", { name: `Ver detalle de ${name}`, exact: true });
    await detailsButton.click();
    const sheet = page.getByRole("dialog", { name: "Detalle de cuadrilla" });
    await sheet.getByRole("button", { name: "Editar", exact: true }).click();
    const editDialog = page.getByRole("dialog", { name: "Editar cuadrilla" });
    await expect(editDialog.getByRole("combobox", { name: "Tipo de cuadrilla" })).toBeDisabled();
    await editDialog.getByRole("textbox", { name: "Nombre", exact: true }).fill(`${name} editada`);
    await editDialog.getByRole("button", { name: "Guardar cuadrilla" }).click();
    await expect(row).toContainText(`${name} editada`);
    const updatedDetailsButton = page.getByRole("row", { name: new RegExp(`${name} editada`) }).getByRole("button", { name: `Ver detalle de ${name} editada`, exact: true });
    await updatedDetailsButton.click();
    await page.getByRole("dialog", { name: "Detalle de cuadrilla" }).getByRole("button", { name: "Dar de baja", exact: true }).click();
    const deactivateDialog = page.getByRole("dialog", { name: `Confirmar baja de la cuadrilla ${name} editada` });
    await page.keyboard.press("Tab");
    await expect(deactivateDialog).toBeVisible();
    await expect(deactivateDialog.locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(deactivateDialog).toBeHidden();
    await expect(updatedDetailsButton).toBeFocused();
    await updatedDetailsButton.click();
    await page.getByRole("dialog", { name: "Detalle de cuadrilla" }).getByRole("button", { name: "Dar de baja", exact: true }).click();
    await page.getByRole("dialog", { name: `Confirmar baja de la cuadrilla ${name} editada` }).getByRole("button", { name: "Dar de baja", exact: true }).click();
    await expect(row).toContainText("Inactiva");
  });
  test("opens the crew catalog from the landing page", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app");
    await page.getByRole("link", { name: "Catálogo" }).click();
    await page.locator('a[href="/app/catalog/crews"]').click();

    await expect(page).toHaveURL(/\/app\/catalog\/crews$/);
    await expect(page.getByRole("heading", { name: "Cuadrillas" })).toBeVisible();
    await expect(page.getByText("Cuadrilla A · López")).toBeVisible();
    await expect(page.getByRole("row", { name: /Cuadrilla A · López/ }).getByRole("cell", { name: "Carlos López", exact: true })).toBeVisible();
  });

  test("Field sees only its assigned crew detail", async ({ page }) => {
    await loginViaApi(page, "field-crew-member-route");
    await page.goto("/app/catalog/crews");

    await expect(page.getByText("Cuadrilla B · Fernández")).toBeVisible();
    await expect(page.getByText("Cuadrilla A · López")).not.toBeVisible();
    await page.getByRole("button", { name: "Ver detalle de Cuadrilla B · Fernández" }).click();
    await expect(page.getByRole("dialog", { name: "Detalle de cuadrilla" })).toContainText("Integrantes");
  });
});
