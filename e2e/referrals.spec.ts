import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

test.describe("Referral workspace", () => {
  test("Office lists both referral kinds, opens detail, and navigates to the source Service", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=referrals");

    const list = page.getByRole("region", { name: "Lista de derivaciones" });
    await expect(list).toBeVisible();
    await expect(list.getByRole("button", { name: /RR-1001/ })).toBeVisible();
    await expect(list.getByRole("button", { name: /SCR-1001/ })).toBeVisible();
    await expect(list.getByText("M3 · Reparaciones")).toBeVisible();
    await expect(list.getByText("M7 · Cortes de calle")).toBeVisible();

    await list.getByRole("button", { name: /SCR-1001/ }).click();
    const detail = page.getByRole("region", { name: "Detalle de SCR-1001" });
    await expect(detail).toBeVisible();
    await expect(detail.getByRole("status", { name: "Estado: Solicitada" })).toBeVisible();
    await expect(detail.getByRole("link", { name: /Ver Servicio de origen/ })).toHaveAttribute(
      "href",
      /destination=services&detail=SVC-1050/,
    );
  });

  test("Field only discovers referrals attached to assigned Services", async ({ page }) => {
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app?destination=referrals");

    const list = page.getByRole("region", { name: "Lista de derivaciones" });
    await expect(list).toBeVisible();
    await expect(list.getByText("SVC-1050", { exact: false }).first()).toBeVisible();
    await expect(list.getByRole("button", { name: /RR-1001/ })).toBeVisible();
    await expect(list.getByRole("button", { name: /SCR-1001/ })).toBeVisible();

    await list.getByRole("button", { name: /RR-1001/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: "Detalle de RR-1001" })).toBeVisible();
  });

  test("keeps the workspace usable on a narrow viewport and reports an empty result", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/referrals", async (route) => {
      await route.fulfill({ json: { data: [], meta: { total: 0 } } });
    });
    await page.goto("/app?destination=referrals");
    await expect(page.getByText("No hay derivaciones para esta sesión")).toBeVisible();

    await page.unroute("**/api/referrals");
    await page.route("**/api/referrals", async (route) => route.abort());
    await page.reload();
    const alert = page.getByRole("alert").filter({ hasText: "No se pudieron cargar las derivaciones" });
    await expect(alert).toBeVisible();
  });
});
