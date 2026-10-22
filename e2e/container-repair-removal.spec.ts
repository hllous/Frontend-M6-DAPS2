import {
  chooseCatalogAOption,
  clickCatalogRowAction,
  expectCatalogAMutation,
  openCatalogRowDetail,
} from "./support/catalog-a-controls";
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
    await chooseCatalogAOption(page, createDialog, "Tipo de contenedor en el formulario", "Residuos domiciliarios");
    await chooseCatalogAOption(page, createDialog, "Zona en el formulario", { index: 0 });
    await createDialog.locator("#container-capacity").fill("1100");
    await createDialog.locator("#container-address").fill("Av. de Mayo 900");
    await createDialog.locator("#container-lat").fill("-34.608");
    await createDialog.locator("#container-lng").fill("-58.382");
    await createDialog.getByRole("button", { name: "Guardar contenedor" }).click();

    // The catalog's default page only shows the first page of results, and other
    // e2e specs permanently add containers of their own — search to make sure the
    // new row is found regardless of how many containers now precede it.
    await page.getByLabel("Buscar contenedor").fill("CONT-E2E-REPAIR");
    const row = page.locator("tr", { hasText: "CONT-E2E-REPAIR" });
    await expect(row).toBeVisible();
    await clickCatalogRowAction(row, "Reportar daño");
    const damageDialog = page.getByRole("dialog");
    await chooseCatalogAOption(page, damageDialog, "Tipo de daño", "Estructural");
    await chooseCatalogAOption(page, damageDialog, "Severidad", "Alta");
    await expectCatalogAMutation(page, /\/report-damage$/, { damageType: "STRUCTURAL", severity: "HIGH", requiresPublicWorks: false }, () => damageDialog.getByRole("button", { name: "Confirmar daño" }).click());
    await expect(row.getByText("Dañado")).toBeVisible();

    await clickCatalogRowAction(row, "Iniciar reparación independiente");

    const startDialog = page.getByRole("dialog");
    await expect(startDialog.getByRole("heading", { name: /Iniciar reparación independiente/ })).toBeVisible();
    await expectCatalogAMutation(page, /\/start-repair$/, null, () => startDialog.getByRole("button", { name: "Iniciar reparación" }).click());
    await expect(row.getByText("En reparación")).toBeVisible();

    await clickCatalogRowAction(row, "Completar reparación independiente");
    const completeDialog = page.getByRole("dialog");
    await expect(completeDialog.getByText(/no corresponde al completado de un Servicio/i)).toBeVisible();
    await completeDialog.locator('input[type="file"]').setInputFiles({
      name: "repair-report.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake-png-content-for-repair"),
    });
    await expect(completeDialog.getByText("repair-report.png")).toBeVisible();
    await expectCatalogAMutation(page, /\/complete-repair$/, null, () => completeDialog.getByRole("button", { name: "Confirmar reparación completa" }).click());

    await expect(page.getByText("Reparación completada con éxito para el contenedor CONT-E2E-REPAIR.")).toBeVisible();
    await expect(completeDialog).not.toBeVisible();
    await expect(row.getByText("Activo")).toBeVisible();
    const activeDetail = await openCatalogRowDetail(row);
    await expect(activeDetail.getByRole("button", { name: /reparación independiente|Retirar contenedor/i })).toHaveCount(0);
  });

  test("Office removes a damaged container with evidence and keeps removal terminal", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/containers");

    await page.getByRole("button", { name: "Registrar contenedor" }).click();
    const createDialog = page.getByRole("dialog");
    await createDialog.locator("#container-code").fill("CONT-E2E-122");
    await chooseCatalogAOption(page, createDialog, "Tipo de contenedor en el formulario", "Residuos domiciliarios");
    await chooseCatalogAOption(page, createDialog, "Zona en el formulario", { index: 0 });
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
    await clickCatalogRowAction(row, "Reportar daño");
    const damageDialog = page.getByRole("dialog");
    await chooseCatalogAOption(page, damageDialog, "Tipo de daño", "Estructural");
    await chooseCatalogAOption(page, damageDialog, "Severidad", "Alta");
    await expectCatalogAMutation(page, /\/report-damage$/, { damageType: "STRUCTURAL", severity: "HIGH", requiresPublicWorks: false }, () => damageDialog.getByRole("button", { name: "Confirmar daño" }).click());
    await expect(row.getByText("Dañado")).toBeVisible();

    await clickCatalogRowAction(row, "Retirar contenedor");
    const removeDialog = page.getByRole("dialog");
    await expect(removeDialog.getByRole("heading", { name: /Retirar contenedor CONT-E2E-122/ })).toBeVisible();
    await removeDialog.locator('input[type="file"]').setInputFiles({
      name: "removal-report.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("fake-pdf-content-for-removal"),
    });
    await expectCatalogAMutation(page, /\/remove$/, null, () => removeDialog.getByRole("button", { name: "Confirmar retiro" }).click());

    await expect(page.getByText("Contenedor CONT-E2E-122 retirado con éxito.")).toBeVisible();
    await expect(removeDialog).not.toBeVisible();
    await expect(row.getByText("Retirado")).toBeVisible();
    const removedDetail = await openCatalogRowDetail(row);
    await expect(removedDetail.getByRole("button", { name: /reparación independiente|Retirar contenedor/i })).toHaveCount(0);
  });

  test("Field cannot access Office lifecycle dispatch controls", async ({ page }) => {
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app/catalog/containers");

    await expect(page.getByRole("heading", { name: "Contenedores" })).toBeVisible();
    const damagedDetail = await openCatalogRowDetail(page.getByRole("row", { name: /CONT-003/ }));
    await expect(damagedDetail.getByRole("button", { name: /reparación independiente/i })).toHaveCount(0);
    await expect(damagedDetail.getByRole("button", { name: "Retirar contenedor" })).toHaveCount(0);
  });
});
