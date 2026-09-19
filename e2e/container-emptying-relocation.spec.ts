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
    await createDialog.locator("#container-type-form").selectOption("HOUSEHOLD");
    await createDialog.locator("#container-zone-form").selectOption({ index: 0 });
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
    const overflowBtn = row.getByRole("button", { name: "Reportar desborde" });
    await expect(overflowBtn).toBeVisible();
    await overflowBtn.click();

    const overflowDialog = page.getByRole("dialog");
    await expect(overflowDialog).toBeVisible();
    await overflowDialog.getByRole("button", { name: "Confirmar desborde" }).click();
    await expect(overflowDialog).not.toBeVisible();
    await expect(row.getByText("Desbordado")).toBeVisible();

    // Standalone emptying button is now visible
    const emptyBtn = row.getByRole("button", { name: "Vaciar contenedor" });
    await expect(emptyBtn).toBeVisible();
    await emptyBtn.click();

    const emptyDialog = page.getByRole("dialog");
    await expect(emptyDialog).toBeVisible();
    await expect(
      emptyDialog.getByRole("heading", {
        name: `Registrar vaciado de contenedor ${code}`,
      }),
    ).toBeVisible();

    await emptyDialog.getByRole("button", { name: "Confirmar vaciado" }).click();

    await expect(
      page.getByText(`Vaciado registrado con éxito para el contenedor ${code}.`),
    ).toBeVisible();
    await expect(emptyDialog).not.toBeVisible();

    // Container returns to ACTIVE and "Vaciar contenedor" button is no longer present
    await expect(row.getByText("Activo")).toBeVisible();
    await expect(row.getByRole("button", { name: "Vaciar contenedor" })).not.toBeVisible();
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
    await createDialog.locator("#container-type-form").selectOption("RECYCLABLE");
    await createDialog.locator("#container-zone-form").selectOption({ index: 0 });
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
    const relocateBtn = row.getByRole("button", { name: "Reubicar" });
    await expect(relocateBtn).toBeVisible();
    await relocateBtn.click();

    const startDialog = page.getByRole("dialog");
    await expect(startDialog).toBeVisible();
    await expect(
      startDialog.getByRole("heading", {
        name: `Iniciar reubicación de contenedor ${code}`,
      }),
    ).toBeVisible();

    await startDialog.getByRole("button", { name: "Iniciar reubicación" }).click();

    await expect(
      page.getByText(`Proceso de reubicación iniciado para el contenedor ${code}.`),
    ).toBeVisible();
    await expect(startDialog).not.toBeVisible();

    // Container is now in RELOCATING status
    await expect(row.getByText("En reubicación")).toBeVisible();
    await expect(row.getByRole("button", { name: "Reubicar" })).not.toBeVisible();

    // Step 2: Confirm relocation (RELOCATING -> ACTIVE with new address and coordinates)
    const confirmBtn = row.getByRole("button", { name: "Confirmar ubicación" });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

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

    await confirmDialog.getByRole("button", { name: "Confirmar ubicación" }).click();

    await expect(
      page.getByText(`Nueva ubicación confirmada con éxito para el contenedor ${code}.`),
    ).toBeVisible();
    await expect(confirmDialog).not.toBeVisible();

    // Container is ACTIVE again with new address
    await expect(row.getByText("Activo")).toBeVisible();
    await expect(row.getByText("Av. Cabildo 2200")).toBeVisible();
    await expect(row.getByRole("button", { name: "Confirmar ubicación" })).not.toBeVisible();
  });

  test("Field actor cannot access emptying or relocation controls", async ({
    page,
  }) => {
    await loginViaApi(page, "field-crew-member-route");
    await page.goto("/app/catalog/containers");

    await expect(page.getByRole("heading", { name: "Contenedores" })).toBeVisible();
    await expect(page.getByText("CONT-001")).toBeVisible();

    // Field actors lack container:manage capability — standalone dispatch buttons are not rendered
    await expect(page.getByRole("button", { name: "Vaciar contenedor" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Reubicar" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmar ubicación" })).not.toBeVisible();
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
    await expect(page.getByRole("button", { name: "Vaciar contenedor" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Reubicar" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmar ubicación" })).not.toBeVisible();
  });
});
