import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

const closureInput = (sourceId: string) => ({
  reason: "El Servicio necesita reducir la circulación durante el operativo.",
  sourceType: "SERVICE",
  sourceId,
  sourceModule: "M6",
  closureType: "PARTIAL",
  requestedFrom: "2026-09-05T08:00",
  requestedTo: "2026-09-05T12:00",
  affectedSections: [
    { streetName: "Bulevar Costero", fromCross: "Av. Belgrano", toCross: "Calle 12" },
  ],
});

// The session cookie is Secure; page.request is a Node-side client that (unlike the
// actual Chromium engine) does not apply the browser's localhost/127.0.0.1
// "potentially trustworthy origin" exception, so it silently drops the cookie over
// plain http and every call below would 401. Issuing the fetch from inside the page
// itself uses the real browser network stack, which does apply that exception.
async function createClosure(page: import("@playwright/test").Page, sourceId: string) {
  await loginViaApi(page, "office-duty-queue");
  await page.goto("/app");
  const result = await page.evaluate(async (input) => {
    const res = await fetch("/api/street-closure-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    return { ok: res.ok, status: res.status, body: await res.json() };
  }, closureInput(sourceId));
  expect(result.ok).toBeTruthy();
  return result.body as { id: string };
}

test.describe("StreetClosure dependency gate", () => {
  test("blocks a Field start for the entire linked ROUTE while the request is pending", async ({ page }) => {
    await createClosure(page, "SVC-1097");
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app?destination=work");

    const card = page.locator("li").filter({ hasText: "SVC-1097" });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Iniciar servicio" }).click();

    await expect(card.getByRole("alert")).toContainText(/corte de calle.*pendiente/i);
    await expect(card.getByText("Programado")).toBeVisible();
  });

  test("does not choose an outcome automatically after M7 rejects the request", async ({ page }) => {
    const request = await createClosure(page, "SVC-1054");
    const rejectionOk = await page.evaluate(async (id) => {
      const res = await fetch(`/api/street-closure-requests/${id}/reject`, { method: "POST" });
      return res.ok;
    }, request.id);
    expect(rejectionOk).toBeTruthy();

    await page.goto("/app?destination=services");
    const table = page.getByRole("region", { name: "Tabla operativa de Servicios" });
    await expect(table.getByRole("row", { name: /SVC-1054/ })).toBeVisible();
    await table.getByRole("row", { name: /SVC-1054/ }).click();
    await page.getByRole("button", { name: "Ver detalle completo" }).click();

    const gate = page.getByRole("status", { name: "Corte de calle rechazado" });
    await expect(gate).toContainText(/decidir explícitamente si reprogramar o cancelar/i);
    await expect(gate.getByRole("button", { name: "Reprogramar servicio por rechazo de corte" })).toBeVisible();
    await expect(gate.getByRole("button", { name: "Cancelar servicio por rechazo de corte" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await gate.getByRole("button", { name: "Reprogramar servicio por rechazo de corte" }).click();
    await expect(page.getByRole("dialog")).toContainText(/Paso 1 de 2/i);
  });
});
