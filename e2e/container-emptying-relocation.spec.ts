import {
  chooseCatalogAOption,
  clickCatalogRowAction,
  expectCatalogAMutation,
  openCatalogRowDetail,
} from "./support/catalog-a-controls";
import { expect, test } from "@playwright/test";
import { loginViaApi } from "./support/auth";

test.describe("Office emptying and relocation dispatch #123", () => {
  test("Office actor empties an overflowed container without requiring service assignment", async ({
    page,
  }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/containers");

    await expect(page.getByRole("heading", { name: "Contenedores" })).toBeVisible();

    // Register a fresh container to avoid mutating fixtures used by other tests
    await page.getByRole("button", { name: "Registrar contenedor" }).click();
    const createDialog = page.getByRole("dialog");
    await expect(createDialog).toBeVisible();

    const code = `CONT-EMP-${Date.now()}`;
    await createDialog.locator("#container-code").fill(code);
    await chooseCatalogAOption(page, createDialog, "Tipo de contenedor en el formulario", "Residuos domiciliarios");
    await chooseCatalogAOption(page, createDialog, "Zona en el formulario", { index: 0 });
    await createDialog.locator("#container-capacity").fill("1100");
    await createDialog.locator("#container-address").fill("Av. Paseo Colón 950");
    await createDialog.locator("#container-lat").fill("-34.6180");
    await createDialog.locator("#container-lng").fill("-58.3690");

    await createDialog.getByRole("button", { name: "Guardar contenedor" }).click();
    await expect(createDialog).not.toBeVisible();

    // Filter to our test container
    await page.getByLabel("Buscar contenedor").fill(code);
    const row = page.locator("tr", { hasText: code });
    await expect(row).toBeVisible();

    // Report overflow so the container transitions from ACTIVE to OVERFLOWED
    await clickCatalogRowAction(row, "Reportar desborde");

    const overflowDialog = page.getByRole("dialog");
    await expect(overflowDialog).toBeVisible();
    await expectCatalogAMutation(page, /\/report-overflow$/, null, () => overflowDialog.getByRole("button", { name: "Confirmar desborde" }).click());
    await expect(overflowDialog).not.toBeVisible();
    await expect(row.getByText("Desbordado")).toBeVisible();

    // Standalone emptying button is now visible
    await clickCatalogRowAction(row, "Vaciar contenedor");

    const emptyDialog = page.getByRole("dialog");
    await expect(emptyDialog).toBeVisible();
    await expect(
      emptyDialog.getByRole("heading", {
        name: `Registrar vaciado de contenedor ${code}`,
      }),
    ).toBeVisible();

    await expectCatalogAMutation(page, /\/empty$/, null, () => emptyDialog.getByRole("button", { name: "Confirmar vaciado" }).click());

    await expect(
      page.getByText(`Vaciado registrado: ${code}.`),
    ).toBeVisible();
    await expect(emptyDialog).not.toBeVisible();

    // Container returns to ACTIVE and "Vaciar contenedor" button is no longer present
    await expect(row.getByText("Activo")).toBeVisible();
    const activeDetail = await openCatalogRowDetail(row);
    await expect(activeDetail.getByRole("button", { name: "Vaciar contenedor" })).toHaveCount(0);
  });

  test("Office actor executes two-step relocation on an active container", async ({
    page,
  }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/containers");

    await expect(page.getByRole("heading", { name: "Contenedores" })).toBeVisible();

    // Register a fresh container for relocation test
    await page.getByRole("button", { name: "Registrar contenedor" }).click();
    const createDialog = page.getByRole("dialog");
    await expect(createDialog).toBeVisible();

    const code = `CONT-REL-${Date.now()}`;
    await createDialog.locator("#container-code").fill(code);
    await chooseCatalogAOption(page, createDialog, "Tipo de contenedor en el formulario", "Materiales reciclables");
    await chooseCatalogAOption(page, createDialog, "Zona en el formulario", { index: 0 });
    await createDialog.locator("#container-capacity").fill("2400");
    await createDialog.locator("#container-address").fill("Av. San Juan 1500");
    await createDialog.locator("#container-lat").fill("-34.6210");
    await createDialog.locator("#container-lng").fill("-58.3990");

    await createDialog.getByRole("button", { name: "Guardar contenedor" }).click();
    await expect(createDialog).not.toBeVisible();

    // Filter to our test container
    await page.getByLabel("Buscar contenedor").fill(code);
    const row = page.locator("tr", { hasText: code });
    await expect(row).toBeVisible();
    await expect(row.getByText("Activo")).toBeVisible();

    // Step 1: Start relocation (ACTIVE -> RELOCATING)
    await clickCatalogRowAction(row, "Reubicar");

    const startDialog = page.getByRole("dialog");
    await expect(startDialog).toBeVisible();
    await expect(
      startDialog.getByRole("heading", {
        name: `Iniciar reubicación de contenedor ${code}`,
      }),
    ).toBeVisible();

    await expectCatalogAMutation(page, /\/relocate$/, null, () => startDialog.getByRole("button", { name: "Iniciar reubicación" }).click());

    await expect(
      page.getByText(`Proceso de reubicación iniciado para el contenedor ${code}.`),
    ).toBeVisible();
    await expect(startDialog).not.toBeVisible();

    // Container is now in RELOCATING status
    await expect(row.getByText("En reubicación")).toBeVisible();
    const relocatingDetail = await openCatalogRowDetail(row);
    await expect(relocatingDetail.getByRole("button", { name: "Reubicar" })).toHaveCount(0);
    await page.keyboard.press("Escape");

    // Step 2: Confirm relocation (RELOCATING -> ACTIVE with new address and coordinates)
    await clickCatalogRowAction(row, "Confirmar ubicación");

    const confirmDialog = page.getByRole("dialog");
    await expect(confirmDialog).toBeVisible();
    await expect(
      confirmDialog.getByRole("heading", {
        name: `Confirmar nueva ubicación de contenedor ${code}`,
      }),
    ).toBeVisible();

    await confirmDialog.locator("#relocation-address").fill("Av. Cabildo 2200");
    await confirmDialog.locator("#relocation-lat").fill("-34.5620");
    await confirmDialog.locator("#relocation-lng").fill("-58.4560");

    await expectCatalogAMutation(page, /\/confirm-relocation$/, { address: "Av. Cabildo 2200", lat: -34.562, lng: -58.456 }, () => confirmDialog.getByRole("button", { name: "Confirmar ubicación" }).click());

    await expect(
      page.getByText(`Nueva ubicación confirmada: ${code}.`),
    ).toBeVisible();
    await expect(confirmDialog).not.toBeVisible();

    // Container is ACTIVE again with new address
    await expect(row.getByText("Activo")).toBeVisible();
    await expect(row.getByText("Av. Cabildo 2200")).toBeVisible();
    const activeDetail = await openCatalogRowDetail(row);
    await expect(activeDetail.getByRole("button", { name: "Confirmar ubicación" })).toHaveCount(0);
  });

  test("Field actor cannot access emptying or relocation controls", async ({
    page,
  }) => {
    await loginViaApi(page, "field-crew-member-route");
    await page.goto("/app/catalog/containers");

    await expect(page.getByRole("heading", { name: "Contenedores" })).toBeVisible();
    await expect(page.getByText("CONT-001")).toBeVisible();

    // Field actors lack container:manage capability — standalone dispatch buttons are not rendered in detail.
    const activeDetail = await openCatalogRowDetail(page.getByRole("row", { name: /CONT-001/ }));
    await expect(activeDetail.getByRole("button", { name: "Reubicar" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    const overflowDetail = await openCatalogRowDetail(page.getByRole("row", { name: /CONT-002/ }));
    await expect(overflowDetail.getByRole("button", { name: "Vaciar contenedor" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Registrar contenedor" })).not.toBeVisible();
  });

  test("Actor without container:manage capability cannot empty or relocate containers", async ({
    page,
  }) => {
    await loginViaApi(page, "office-limited-intake");
    await page.goto("/app/catalog/containers");

    await expect(page.getByRole("heading", { name: "Contenedores" })).toBeVisible();
    await expect(page.getByText("CONT-001")).toBeVisible();

    // Actors lacking container:manage cannot empty or relocate
    const activeDetail = await openCatalogRowDetail(page.getByRole("row", { name: /CONT-001/ }));
    await expect(activeDetail.getByRole("button", { name: "Reubicar" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    const overflowDetail = await openCatalogRowDetail(page.getByRole("row", { name: /CONT-002/ }));
    await expect(overflowDetail.getByRole("button", { name: "Vaciar contenedor" })).toHaveCount(0);
  });
});
