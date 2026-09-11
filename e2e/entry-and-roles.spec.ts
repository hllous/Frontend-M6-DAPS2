import { expect, test } from "@playwright/test";

import { loginViaApi, loginViaUi } from "./support/auth";

test.describe("Office and Field mock entry and navigation @smoke", () => {
  test("Office actor enters through the login form and reaches the Catálogo destination", async ({ page }) => {
    await loginViaUi(page, "Oficina · cola de decisiones");

    await expect(page.getByRole("heading", { name: "Acciones de la jornada" })).toBeVisible();
    await expect(page.getByText("Lucía Fernández")).toBeVisible();

    await page.getByRole("button", { name: "Catálogo" }).click();
    await expect(page.getByRole("heading", { name: "Zonas operativas" })).toBeVisible();
    await expect(page.getByText("Z-01")).toBeVisible();
  });

  test("Field actor enters through the login form and reaches the Mapa destination", async ({ page }) => {
    await loginViaUi(page, "Campo · responsable de recorrido");

    await expect(page.getByRole("heading", { name: "Servicios asignados" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar servicio" }).first()).toBeVisible();

    await page.getByRole("button", { name: "Mapa" }).click();
    await expect(page.getByRole("heading", { name: "Mapa operativo" })).toBeVisible();
  });
});

test.describe("Crew Leader versus Crew Member presentation @smoke", () => {
  test("Crew Leader may start a service", async ({ page }) => {
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app");

    await expect(page.getByText("Responsable de cuadrilla")).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar servicio" }).first()).toBeVisible();
  });

  test("Crew Member is presented a read-only turn with no state-changing action", async ({ page }) => {
    await loginViaApi(page, "field-crew-member-route");
    await page.goto("/app");

    await expect(page.getByText("Integrante de cuadrilla")).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar servicio" })).toHaveCount(0);
    await expect(page.getByText("Solo consulta").first()).toBeVisible();
    await expect(
      page.getByText("La persona responsable de la cuadrilla registra los cambios de estado del servicio."),
    ).toBeVisible();
  });
});
