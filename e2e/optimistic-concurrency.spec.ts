import { expect, test, type Page } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { clickCatalogRowAction } from "./support/catalog-a-controls";

/**
 * Concurrencia optimista (ADR-012 del backend, #973): dos sesiones de Oficina editan el mismo contenedor. La que
 * guarda segunda lleva el ETag de lo que leyó; el BFF (emulación mock, misma semántica que el backend) responde 412,
 * la interfaz avisa y no pisa el cambio de la primera. CONT-004 no lo usa ningún otro spec.
 */
const STALE_MESSAGE = "Otra persona modificó este registro. Recargue para ver los cambios.";

async function openEditForm(page: Page) {
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app/catalog/containers");
  await expect(page.getByRole("heading", { name: "Contenedores", exact: true })).toBeVisible();
  const row = page.locator("tr", { hasText: "CONT-004" });
  await expect(row).toBeVisible();
  await clickCatalogRowAction(row, "Editar");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Editar contenedor" })).toBeVisible();
  return dialog;
}

test("a second session saving with a stale ETag gets 412, sees the notice and keeps its input", async ({ browser }) => {
  // Dos sesiones completas, cada una con login, catálogo y formulario: el doble de lo que recorre un test de catálogo.
  test.slow();
  const first = await browser.newContext();
  const second = await browser.newContext();
  try {
    const pageA = await first.newPage();
    const pageB = await second.newPage();
    // Las dos sesiones leen la misma versión antes de que alguna guarde.
    const dialogA = await openEditForm(pageA);
    const dialogB = await openEditForm(pageB);

    await dialogA.locator("#container-address").fill("Av. Directorio 1500");
    const saveA = pageA.waitForResponse((response) => response.request().method() === "PATCH" && new URL(response.url()).pathname.endsWith("/api/containers/cont-4"));
    await dialogA.getByRole("button", { name: "Guardar contenedor" }).click();
    const responseA = await saveA;
    expect(responseA.status()).toBe(200);
    expect(responseA.request().headers()["if-match"]).toMatch(/^W\/"\d+"$/);
    await expect(pageA.getByText("Contenedor actualizado.")).toBeVisible();

    await dialogB.locator("#container-address").fill("Av. Juan B. Alberdi 900");
    const saveB = pageB.waitForResponse((response) => response.request().method() === "PATCH" && new URL(response.url()).pathname.endsWith("/api/containers/cont-4"));
    await dialogB.getByRole("button", { name: "Guardar contenedor" }).click();
    const responseB = await saveB;
    expect(responseB.status()).toBe(412);
    expect(responseB.request().headers()["if-match"]).toBe(responseA.request().headers()["if-match"]);

    // Aviso global con acción de recargar; el formulario sigue abierto con lo que la persona escribió.
    const notice = pageB.getByRole("region", { name: "Notificaciones" }).getByText(STALE_MESSAGE);
    await expect(notice).toBeVisible();
    await expect(dialogB).toBeVisible();
    await expect(dialogB.locator("#container-address")).toHaveValue("Av. Juan B. Alberdi 900");

    await pageB.getByRole("button", { name: "Recargar" }).click();
    await expect(pageB.getByRole("heading", { name: "Contenedores", exact: true })).toBeVisible();
    const rowB = pageB.locator("tr", { hasText: "CONT-004" });
    await expect(rowB.getByText("Av. Directorio 1500")).toBeVisible();
    await expect(pageB.getByText("Av. Juan B. Alberdi 900")).toHaveCount(0);
  } finally {
    await first.close();
    await second.close();
  }
});
