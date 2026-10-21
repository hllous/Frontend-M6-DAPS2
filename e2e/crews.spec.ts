import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { chooseCatalogBOption } from "./support/catalog-612-controls";

test.describe("Crew catalog @smoke", () => {
  test("Office registers and edits a crew with M1 labels and unchanged request values", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/crews");
    const name = `Cuadrilla e2e 612 ${Date.now()}`;
    await page.getByRole("button", { name: "Registrar cuadrilla", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Nombre", exact: true }).fill(name);
    await chooseCatalogBOption(page, dialog.getByRole("combobox", { name: "Responsable de cuadrilla (M1)" }), "Carlos López");
    await chooseCatalogBOption(page, dialog.getByRole("combobox", { name: "Organización (M1)" }), "Municipalidad");
    await chooseCatalogBOption(page, dialog.getByRole("combobox", { name: "Turno predeterminado" }), "Tarde");
    const creation = page.waitForRequest(request => request.url().endsWith("/api/crews") && request.method() === "POST");
    await dialog.getByRole("button", { name: "Guardar cuadrilla" }).click();
    expect((await creation).postDataJSON()).toEqual({ name, crewType: "MUNICIPAL", leaderUserId: "user-carlos", organizationId: "org-municipal", defaultShift: "AFTERNOON" });
    const row = page.getByRole("row", { name: new RegExp(name) });
    await row.getByRole("button", { name: "Editar", exact: true }).click();
    await expect(dialog.getByRole("combobox", { name: "Tipo de cuadrilla" })).toBeDisabled();
    await dialog.getByRole("textbox", { name: "Nombre", exact: true }).fill(`${name} editada`);
    await dialog.getByRole("button", { name: "Guardar cuadrilla" }).click();
    await expect(row).toContainText(`${name} editada`);
    const deactivate = row.getByRole("button", { name: "Dar de baja", exact: true });
    await deactivate.click();
    await page.keyboard.press("Tab");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(deactivate).toBeFocused();
    await deactivate.click();
    await dialog.getByRole("button", { name: `Dar de baja la cuadrilla ${name} editada`, exact: true }).click();
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
    await page.getByRole("button", { name: "Ver detalle" }).click();
    await expect(page.getByRole("dialog")).toContainText("Integrantes");
  });
});
