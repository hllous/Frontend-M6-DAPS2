import {
  chooseCatalogAOption,
  clickCatalogRowAction,
  expectCatalogAMutation,
  openCatalogRowDetail,
} from "./support/catalog-a-controls";
import { expect, test } from "@playwright/test";
import { loginViaApi } from "./support/auth";

test.describe("Ambient Container overflow and damage reporting #121", () => {
  test("Field actor reports overflow on an active Container without service assignment", async ({
    page,
  }) => {
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app/catalog/containers");

    await expect(page.getByRole("heading", { name: "Contenedores" })).toBeVisible();

    // CONT-008 is a dedicated ACTIVE fixture for this test — CONT-001 is relied on by
    // containers-catalog.spec.ts to stay un-overflowed across the same CI run.
    const row = page.locator("tr", { hasText: "CONT-008" });
    await expect(row).toBeVisible();

    // Reporting remains available from the row detail without an assigned Service.
    await clickCatalogRowAction(row, "Reportar desborde");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Reportar desborde de contenedor CONT-008" }),
    ).toBeVisible();

    await expectCatalogAMutation(page, /\/report-overflow$/, null, () => dialog.getByRole("button", { name: "Confirmar desborde" }).click());

    await expect(
      page.getByText("Desborde reportado: CONT-008."),
    ).toBeVisible();
    await expect(dialog).not.toBeVisible();

    // Row now shows OVERFLOWED status and report buttons are removed
    await expect(row.getByText("Desbordado")).toBeVisible();
    const detail = await openCatalogRowDetail(row);
    await expect(detail.getByRole("button", { name: "Reportar desborde" })).toHaveCount(0);
    await expect(detail.getByRole("button", { name: "Reportar daño" })).toHaveCount(0);
  });

  test("Field actor reports damage with type, severity, public works flag, and evidence", async ({
    page,
  }) => {
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app/catalog/containers");

    await expect(page.getByRole("heading", { name: "Contenedores" })).toBeVisible();

    const row = page.locator("tr", { hasText: "CONT-007" });
    await expect(row).toBeVisible();

    await clickCatalogRowAction(row, "Reportar daño");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Reportar daño en contenedor CONT-007" }),
    ).toBeVisible();

    await chooseCatalogAOption(page, dialog, "Tipo de daño", "Vandalizado");
    await chooseCatalogAOption(page, dialog, "Severidad", "Alta");
    await dialog.getByRole("checkbox", { name: /Requiere intervención de Obras Públicas/ }).check();

    // Attach sample evidence image
    await dialog.locator('input[type="file"]').setInputFiles({
      name: "container-graffiti.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake-png-content-for-e2e-evidence"),
    });

    await expect(dialog.getByText("container-graffiti.png")).toBeVisible();

    await expectCatalogAMutation(page, /\/report-damage$/, { damageType: "VANDALIZED", severity: "HIGH", requiresPublicWorks: true }, () => dialog.getByRole("button", { name: "Confirmar daño" }).click());

    await expect(
      page.getByText("Daño registrado: CONT-007."),
    ).toBeVisible();
    await expect(dialog).not.toBeVisible();

    // Row now shows DAMAGED status
    await expect(row.getByText("Dañado")).toBeVisible();

    // Open detail dialog to inspect damage diagnostic and attached evidence
    const detailDialog = await openCatalogRowDetail(row);
    await expect(detailDialog).toBeVisible();
    await expect(
      detailDialog.getByRole("heading", { name: "Detalle del contenedor CONT-007" }),
    ).toBeVisible();

    await expect(detailDialog.getByText("Vandalizado")).toBeVisible();
    await expect(detailDialog.getByText("Alta")).toBeVisible();
    await expect(detailDialog.getByText(/Sí \(avisa a Obras Públicas\)/)).toBeVisible();
    await expect(detailDialog.getByText("container-graffiti.png")).toBeVisible();
  });

  test("Actor without container:report capability cannot report overflow or damage", async ({
    page,
  }) => {
    await loginViaApi(page, "office-limited-intake");
    await page.goto("/app/catalog/containers");

    await expect(page.getByRole("heading", { name: "Contenedores" })).toBeVisible();
    await expect(page.getByText("CONT-001")).toBeVisible();

    // Report buttons must be completely absent for actors lacking container:report
    const detail = await openCatalogRowDetail(page.getByRole("row", { name: /CONT-001/ }));
    await expect(detail.getByRole("button", { name: "Reportar desborde" })).toHaveCount(0);
    await expect(detail.getByRole("button", { name: "Reportar daño" })).toHaveCount(0);
  });

  test("Validates file constraints as defense in depth on the client", async ({ page }) => {
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app/catalog/containers");

    // The dialog is abandoned without confirming, so the ACTIVE fixture is not mutated.
    const row = page.locator("tr", { hasText: "CONT-001" });
    await expect(row).toBeVisible();

    await clickCatalogRowAction(row, "Reportar desborde");
    const overflowDialog = page.getByRole("dialog");
    await expect(overflowDialog).toBeVisible();

    // Upload an invalid file type (e.g. executable/text)
    await overflowDialog.locator('input[type="file"]').setInputFiles({
      name: "forbidden.exe",
      mimeType: "application/x-msdownload",
      buffer: Buffer.from("bad binary"),
    });

    await expect(
      overflowDialog.getByText(/"forbidden.exe" no es una foto ni un PDF/),
    ).toBeVisible();
    // The forbidden file is not queued
    await expect(overflowDialog.getByText("Pendiente")).not.toBeVisible();
  });
});
