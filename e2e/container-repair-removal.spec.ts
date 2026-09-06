import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("Office container repair and removal dispatch #122", () => {
  test("Office completes a standalone repair with Container evidence", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/containers");

    // Uses a throwaway container (not a shared fixture ID like CONT-003) so this
    // test's transitions can't collide with containers-catalog.spec.ts, which
    // depends on CONT-003 staying DAMAGED.
    await page.getByRole("button", { name: "Registrar contenedor" }).click();
    const createDialog = page.getByRole("dialog");
    await createDialog.locator("#container-code").fill("CONT-E2E-REPAIR");
    await createDialog.locator("#container-type-form").selectOption("HOUSEHOLD");
    await createDialog.locator("#container-zone-form").selectOption({ index: 0 });
    await createDialog.locator("#container-capacity").fill("1100");
    await createDialog.locator("#container-address").fill("Av. de Mayo 900");
    await createDialog.locator("#container-lat").fill("-34.608");
    await createDialog.locator("#container-lng").fill("-58.382");
    await createDialog.getByRole("button", { name: "Guardar contenedor" }).click();

    const row = page.locator("tr", { hasText: "CONT-E2E-REPAIR" });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Reportar daño" }).click();
    const damageDialog = page.getByRole("dialog");
    await damageDialog.locator("#damage-type").selectOption("STRUCTURAL");
    await damageDialog.locator("#damage-severity").selectOption("HIGH");
    await damageDialog.getByRole("button", { name: "Confirmar daño" }).click();
    await expect(row.getByText("Dañado")).toBeVisible();

    await row.getByRole("button", { name: "Iniciar reparación independiente" }).click();

    const startDialog = page.getByRole("dialog");
    await expect(startDialog.getByRole("heading", { name: /Iniciar reparación independiente/ })).toBeVisible();
    await startDialog.getByRole("button", { name: "Iniciar reparación" }).click();
    await expect(row.getByText("En reparación")).toBeVisible();

    await row.getByRole("button", { name: "Completar reparación independiente" }).click();
    const completeDialog = page.getByRole("dialog");
    await expect(completeDialog.getByText(/no corresponde al completado de un Servicio/i)).toBeVisible();
    await completeDialog.locator('input[type="file"]').setInputFiles({
      name: "repair-report.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake-png-content-for-repair"),
    });
    await expect(completeDialog.getByText("repair-report.png")).toBeVisible();
    await completeDialog.getByRole("button", { name: "Confirmar reparación completa" }).click();

    await expect(page.getByText("Reparación completada con éxito para el contenedor CONT-E2E-REPAIR.")).toBeVisible();
    await expect(completeDialog).not.toBeVisible();
    await expect(row.getByText("Activo")).toBeVisible();
    await expect(row.getByRole("button", { name: /reparación independiente|Retirar contenedor/i })).not.toBeVisible();
  });

  test("Office removes a damaged container with evidence and keeps removal terminal", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/containers");

    await page.getByRole("button", { name: "Registrar contenedor" }).click();
    const createDialog = page.getByRole("dialog");
    await createDialog.locator("#container-code").fill("CONT-E2E-122");
    await createDialog.locator("#container-type-form").selectOption("HOUSEHOLD");
    await createDialog.locator("#container-zone-form").selectOption({ index: 0 });
    await createDialog.locator("#container-capacity").fill("1100");
    await createDialog.locator("#container-address").fill("Av. de Mayo 122");
    await createDialog.locator("#container-lat").fill("-34.608");
    await createDialog.locator("#container-lng").fill("-58.382");
    await createDialog.getByRole("button", { name: "Guardar contenedor" }).click();

    // The catalog's default page only shows the first page of results, and other
    // e2e specs (including this file's own prior test) permanently add containers
    // of their own — search to make sure the new row is found regardless of how
    // many containers now precede it.
    await page.getByLabel("Buscar contenedor").fill("CONT-E2E-122");
    const row = page.locator("tr", { hasText: "CONT-E2E-122" });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Reportar daño" }).click();
    const damageDialog = page.getByRole("dialog");
    await damageDialog.locator("#damage-type").selectOption("STRUCTURAL");
    await damageDialog.locator("#damage-severity").selectOption("HIGH");
    await damageDialog.getByRole("button", { name: "Confirmar daño" }).click();
    await expect(row.getByText("Dañado")).toBeVisible();

    await row.getByRole("button", { name: "Retirar contenedor" }).click();
    const removeDialog = page.getByRole("dialog");
    await expect(removeDialog.getByRole("heading", { name: /Retirar contenedor CONT-E2E-122/ })).toBeVisible();
    await removeDialog.locator('input[type="file"]').setInputFiles({
      name: "removal-report.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("fake-pdf-content-for-removal"),
    });
    await removeDialog.getByRole("button", { name: "Confirmar retiro" }).click();

    await expect(page.getByText("Contenedor CONT-E2E-122 retirado con éxito.")).toBeVisible();
    await expect(removeDialog).not.toBeVisible();
    await expect(row.getByText("Retirado")).toBeVisible();
    await expect(row.getByRole("button", { name: /reparación independiente|Retirar contenedor/i })).not.toBeVisible();
  });

  test("Field cannot access Office lifecycle dispatch controls", async ({ page }) => {
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app/catalog/containers");

    await expect(page.getByRole("heading", { name: "Contenedores" })).toBeVisible();
    await expect(page.getByRole("button", { name: /reparación independiente/i })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Retirar contenedor" })).not.toBeVisible();
  });
});
