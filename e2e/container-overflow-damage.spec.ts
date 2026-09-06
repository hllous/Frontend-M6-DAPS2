import { expect, test } from "@playwright/test";
import { loginViaApi } from "./support/auth";

test.describe("Ambient Container overflow and damage reporting #121", () => {
  test("Field actor reports overflow on an active Container without service assignment", async ({
    page,
  }) => {
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app/catalog/containers");

    await expect(page.getByRole("heading", { name: "Contenedores" })).toBeVisible();

    const row = page.locator("tr", { hasText: "CONT-001" });
    await expect(row).toBeVisible();

    // Report buttons are available directly from catalog without an assigned Service
    const overflowBtn = row.getByRole("button", { name: "Reportar desborde" });
    await expect(overflowBtn).toBeVisible();

    await overflowBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Reportar desborde de contenedor CONT-001" }),
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Confirmar desborde" }).click();

    await expect(
      page.getByText("Desborde reportado con éxito para el contenedor CONT-001."),
    ).toBeVisible();
    await expect(dialog).not.toBeVisible();

    // Row now shows OVERFLOWED status and report buttons are removed
    await expect(row.getByText("Desbordado")).toBeVisible();
    await expect(row.getByRole("button", { name: "Reportar desborde" })).not.toBeVisible();
    await expect(row.getByRole("button", { name: "Reportar daño" })).not.toBeVisible();
  });

  test("Office actor reports damage with type, severity, public works flag, and evidence", async ({
    page,
  }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/containers");

    await expect(page.getByRole("heading", { name: "Contenedores" })).toBeVisible();

    const row = page.locator("tr", { hasText: "CONT-007" });
    await expect(row).toBeVisible();

    const damageBtn = row.getByRole("button", { name: "Reportar daño" });
    await expect(damageBtn).toBeVisible();
    await damageBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Reportar daño en contenedor CONT-007" }),
    ).toBeVisible();

    await dialog.locator("#damage-type").selectOption("VANDALIZED");
    await dialog.locator("#damage-severity").selectOption("HIGH");
    await dialog.locator("#damage-public-works").check();

    // Attach sample evidence image
    await dialog.locator('input[type="file"]').setInputFiles({
      name: "container-graffiti.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake-png-content-for-e2e-evidence"),
    });

    await expect(dialog.getByText("container-graffiti.png")).toBeVisible();

    await dialog.getByRole("button", { name: "Confirmar daño" }).click();

    await expect(
      page.getByText("Reporte de daño registrado con éxito para el contenedor CONT-007."),
    ).toBeVisible();
    await expect(dialog).not.toBeVisible();

    // Row now shows DAMAGED status
    await expect(row.getByText("Dañado")).toBeVisible();

    // Open detail dialog to inspect damage diagnostic and attached evidence
    await row.getByRole("button", { name: "Ver detalle" }).click();
    const detailDialog = page.getByRole("dialog");
    await expect(detailDialog).toBeVisible();
    await expect(
      detailDialog.getByRole("heading", { name: "Detalle del contenedor CONT-007" }),
    ).toBeVisible();

    await expect(detailDialog.getByText("Vandalizado")).toBeVisible();
    await expect(detailDialog.getByText("Alta")).toBeVisible();
    await expect(detailDialog.getByText(/Sí \(notificación a M3\)/)).toBeVisible();
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
    await expect(page.getByRole("button", { name: "Reportar desborde" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Reportar daño" })).not.toBeVisible();
  });

  test("Validates file constraints as defense in depth on the client", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/containers");

    // First register a fresh container to test validation on an active container
    await page.getByRole("button", { name: "Registrar contenedor" }).click();
    const createDialog = page.getByRole("dialog");
    await createDialog.locator("#container-code").fill("CONT-VAL-01");
    await createDialog.locator("#container-type-form").selectOption("HOUSEHOLD");
    await createDialog.locator("#container-zone-form").selectOption({ index: 0 });
    await createDialog.locator("#container-capacity").fill("1100");
    await createDialog.locator("#container-address").fill("Av. Corrientes 1000");
    await createDialog.locator("#container-lat").fill("-34.603");
    await createDialog.locator("#container-lng").fill("-58.381");
    await createDialog.getByRole("button", { name: "Guardar contenedor" }).click();
    await expect(createDialog).not.toBeVisible();

    const row = page.locator("tr", { hasText: "CONT-VAL-01" });
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Reportar desborde" }).click();
    const overflowDialog = page.getByRole("dialog");
    await expect(overflowDialog).toBeVisible();

    // Upload an invalid file type (e.g. executable/text)
    await overflowDialog.locator('input[type="file"]').setInputFiles({
      name: "forbidden.exe",
      mimeType: "application/x-msdownload",
      buffer: Buffer.from("bad binary"),
    });

    await expect(
      overflowDialog.getByText(/"forbidden.exe" tiene un formato no permitido/),
    ).toBeVisible();
    // The forbidden file is not queued
    await expect(overflowDialog.getByText("Pendiente")).not.toBeVisible();
  });
});
