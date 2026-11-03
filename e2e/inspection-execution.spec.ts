import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { chooseCalendarDay, chooseFieldOption, setFieldTime } from "./support/services-608-controls";

test.describe.serial("Environmental inspection execution #134", () => {
  test("Crew Member sees the assigned inspection as read-only", async ({ page }) => {
    await loginViaApi(page, "field-crew-member-route");
    await page.goto("/app");

    const serviceCard = page.locator('[data-service-id="SVC-1112"]');
    await expect(serviceCard).toBeVisible();
    await serviceCard.getByRole("button", { name: "Abrir" }).click();

    const inspection = page.getByRole("region", { name: /^Detalle completo de Inspección ambiental/ });
    await expect(inspection).toBeVisible();
    await expect(inspection.getByText("Solo consulta")).toBeVisible();
    await expect(inspection.getByRole("button", { name: /Completar inspecci/ })).toHaveCount(0);
  });

  test("Crew Leader starts the service, uploads evidence, and records the authoritative result", async ({ page }) => {
    await loginViaApi(page, "field-crew-leader-route");
    await page.goto("/app");

    const serviceCard = page.locator('[data-service-id="SVC-1112"]');
    await expect(serviceCard).toBeVisible();
    await serviceCard.getByRole("button", { name: "Iniciar servicio" }).click();
    await expect(serviceCard.getByText("En curso")).toBeVisible();
    await serviceCard.getByRole("button", { name: "Abrir" }).click();

    const inspection = page.getByRole("region", { name: "Inspección ambiental", exact: true });
    await expect(inspection).toBeVisible();
    await expect(inspection.getByRole("checkbox").first()).toBeVisible();
    await inspection.getByRole("checkbox").all().then(async (checkboxes) => {
      for (const checkbox of checkboxes) await checkbox.check();
    });
    const inspectedAt = await page.evaluate(() => {
      const now = new Date();
      return {
        day: now.getDate(),
        monthName: new Intl.DateTimeFormat("es-AR", { month: "long" }).format(now),
        year: now.getFullYear(),
        time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      };
    });
    await chooseCalendarDay(inspection, /Fecha y hora de inspección/, {
      monthsAhead: 0,
      day: inspectedAt.day,
      monthName: inspectedAt.monthName,
      year: inspectedAt.year,
    });
    await setFieldTime(inspection, /Fecha y hora de inspección/, inspectedAt.time);
    await chooseFieldOption(inspection, /Resultado de la inspección/, "Infracción constatada");
    await inspection.getByRole("textbox", { name: /Hallazgos/ }).fill("Emisión visible constatada en la visita.");
    await chooseFieldOption(inspection, /Tipo de infracción/, "Emisión al aire");
    await chooseFieldOption(inspection, "Gravedad", "Alta");
    await chooseFieldOption(inspection, /Acción sugerida/, "Aviso formal");
    await inspection.getByLabel(/Seleccionar archivos/).setInputFiles({
      name: "evidencia_chimenea.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("inspection-evidence"),
    });
    await inspection.getByRole("button", { name: /Completar inspecci/ }).click();

    await expect(inspection.getByText(/Resultado registrado/)).toBeVisible();
    await expect(inspection.getByText(/Aviso a emitir por Oficina/).first()).toBeVisible();
  });
});
