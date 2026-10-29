import { expect, test } from "@playwright/test";

import { loginViaApi, loginViaUi } from "./support/auth";

test.describe("Office and Field mock entry and navigation @smoke", () => {
  test("Office actor enters through the login form and reaches the Configuración destination", async ({ page }) => {
    await loginViaUi(page, "Oficina · cola de decisiones");

    await expect(page.getByRole("heading", { name: "Acciones de la jornada" })).toBeVisible();
    await expect(page.getByText("Lucía Fernández")).toBeVisible();

    await page.getByRole("link", { name: "Configuración" }).click();
    await expect(page.getByRole("heading", { name: "Zonas operativas" })).toBeVisible();
    await expect(page.getByText("Belgrano", { exact: true })).toBeVisible();
    await expect(page.getByText(/^Z-[A-Z]{3}$/)).toHaveCount(0);
  });

  test("Field actor enters through the login form and reaches the Mapa destination", async ({ page }) => {
    await loginViaUi(page, "Campo · responsable de recorrido");

    await expect(page.getByRole("heading", { name: "Servicios asignados" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar servicio" }).first()).toBeVisible();

    await page.getByRole("link", { name: "Mapa" }).click();
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
  });
});

test.describe("M6 roles from GET /me @smoke", () => {
  test("an employee with no M6 role gets an explanation, not an error", async ({ page }) => {
    await loginViaApi(page, "employee-no-role");
    await page.goto("/app");

    await expect(page.getByText("Sin rol asignado")).toBeVisible();
    await expect(page.getByText("Su usuario aún no tiene un rol asignado en Ambiente. Solicite a un administrador que se lo asigne y vuelva a ingresar.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reintentar carga" })).toHaveCount(0);
  });

  test("a citizen token is told the system is for municipal staff only", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.route("**/api/mock/scenarios/office-duty-queue", (route) => route.fulfill({
      status: 403,
      json: { statusCode: 403, message: "Este sistema es solo para personal municipal.", error: "Forbidden", timestamp: new Date().toISOString(), path: "/api/mock/scenarios/office-duty-queue" },
    }));
    await page.goto("/app");

    await expect(page.getByText("Acceso no disponible")).toBeVisible();
    await expect(page.getByText("Este sistema es solo para personal municipal.")).toBeVisible();
  });

  test("an auditor can read environmental reports without write actions and receives ROLE_REQUIRED if it attempts a write", async ({ page }) => {
    await loginViaApi(page, "office-limited-intake");
    await page.goto("/app?destination=environment&detail=ER-1002");
    await expect(page.getByRole("heading", { name: "Expediente TK-2026-091", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Derivar expediente" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Programar inspección" })).toHaveCount(0);
    const denied = await page.request.post("/api/environmental-reports/ER-1002/forward", { data: { reason: "Prueba de acceso" } });
    expect(denied.status()).toBe(403);
    expect(await denied.json()).toMatchObject({ code: "ROLE_REQUIRED" });
  });
});
