import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

const DEMO_TICKET_ID = "550e8400-e29b-41d4-a716-446655440000";
const PUBLIC_GREEN_POINTS_CENTRO_ID = "7b0c4f1e-2d3a-4b5c-8d6e-0a1b2c3d4e5f";
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectNoViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

async function clickOptionByMouse(
  page: import("@playwright/test").Page,
  optionName: string,
) {
  const option = page.getByRole("option", { name: optionName, exact: true });
  const optionBox = await option.boundingBox();
  expect(optionBox, `${optionName} should be rendered`).not.toBeNull();

  const x = optionBox!.x + optionBox!.width / 2;
  const y = optionBox!.y + optionBox!.height / 2;
  await page.mouse.click(x, y);
}

async function clickOptionOverZoomControl(
  page: import("@playwright/test").Page,
  optionToClick: string,
) {
  const popup = page.locator('[data-slot="select-content"]');
  await popup.evaluate(async (element) => {
    await Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => undefined)));
  });

  const zoomControl = page.locator(".leaflet-control-zoom");
  const zoomBox = await zoomControl.boundingBox();
  expect(zoomBox, "the map zoom control should be visible").not.toBeNull();

  const options = page.getByRole("option");
  const optionCount = await options.count();
  let intersectionCount = 0;
  let selectedIntersection: { x: number; y: number } | undefined;

  for (let index = 0; index < optionCount; index += 1) {
    const option = options.nth(index);
    const optionName = (await option.textContent())?.trim() ?? "";
    const optionBox = await option.boundingBox();
    if (!optionBox) continue;

    const left = Math.max(optionBox.x, zoomBox!.x);
    const right = Math.min(optionBox.x + optionBox.width, zoomBox!.x + zoomBox!.width);
    const top = Math.max(optionBox.y, zoomBox!.y);
    const bottom = Math.min(optionBox.y + optionBox.height, zoomBox!.y + zoomBox!.height);
    if (left >= right || top >= bottom) continue;

    intersectionCount += 1;
    const x = left + (right - left) / 2;
    const y = top + (bottom - top) / 2;
    const hitTarget = await page.evaluate(({ pointX, pointY }) => {
      const hit = document.elementFromPoint(pointX, pointY);
      return {
        optionName: hit?.closest('[role="option"]')?.textContent?.trim(),
        isZoomControl: Boolean(hit?.closest(".leaflet-control-zoom")),
      };
    }, { pointX: x, pointY: y });

    expect(hitTarget.optionName, `${optionName} should receive the pointer where it overlaps the zoom control`).toBe(optionName);
    expect(hitTarget.isZoomControl, `${optionName} should not be covered by the zoom control`).toBe(false);

    if (optionName === optionToClick) selectedIntersection = { x, y };
  }

  expect(intersectionCount, "at least one dropdown option should overlap the map zoom control").toBeGreaterThan(0);
  expect(selectedIntersection, `${optionToClick} should overlap the map zoom control`).toBeDefined();
  await page.mouse.click(selectedIntersection!.x, selectedIntersection!.y);
}

test.describe("public complaint tracking @smoke", () => {
  test("a resident goes from the staff login to tracking the demo code and then mistypes one", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Consultar una denuncia" }).click();

    await expect(page).toHaveURL(/\/consulta$/);
    await expect(page.getByText(/Entorno de demostración/)).toBeVisible();
    await expectNoViolations(page);

    await page.getByRole("link", { name: /Seguir mi denuncia/ }).click();
    await expect(page).toHaveURL(/\/consulta\/denuncia$/);
    await expectNoViolations(page);

    await page.getByRole("link", { name: "Volver a consultas", exact: true }).click();
    await expect(page).toHaveURL(/\/consulta$/);
    await page.getByRole("link", { name: /Seguir mi denuncia/ }).click();
    await expect(page).toHaveURL(/\/consulta\/denuncia$/);

    await page.getByLabel("Código de seguimiento").fill(DEMO_TICKET_ID);
    await page.getByRole("button", { name: "Consultar" }).click();

    const result = page.getByRole("region", { name: /TK-2026-000123/ });
    await expect(result).toBeVisible();
    await expect(result).toBeFocused();
    await expect(result).toContainText("Un inspector ya visitó el lugar");
    await expect(result).toContainText("01/10/2026");
    await expectNoViolations(page);

    await page.getByLabel("Código de seguimiento").fill("123");
    await page.getByRole("button", { name: "Consultar" }).click();
    await expect(page.getByText("Ese código no tiene el formato correcto.")).toBeVisible();
    await expect(result).toHaveCount(0);
  });

  test("a link with the code looks it up on load, also with a staff session", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto(`/consulta/denuncia?codigo=${DEMO_TICKET_ID}`);

    await expect(page).toHaveURL(/\/consulta\/denuncia/);
    await expect(page.getByRole("region", { name: /TK-2026-000123/ })).toBeVisible();
  });

  test("the services page has no accessibility violations before and after choosing a zone", async ({ page }) => {
    await page.goto("/consulta");
    await page.getByRole("link", { name: /Servicios/ }).click();
    await expect(page).toHaveURL(/\/consulta\/servicios$/);
    await expectNoViolations(page);

    await page.getByRole("combobox", { name: "Tu zona" }).click();
    await page.getByRole("option", { name: "Centro" }).click();
    await expect(page.getByText("Recolección domiciliaria").first()).toBeVisible();
    await expect(page).toHaveURL(/\?zona=/);
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expectNoViolations(page);

    await page.getByRole("link", { name: "Volver a consultas", exact: true }).click();
    await expect(page).toHaveURL(/\/consulta$/);
  });

  test("a resident filters green points and opens a map marker", async ({ page }) => {
    await page.goto("/consulta");
    await page.getByRole("link", { name: /Puntos verdes/ }).click();

    await expect(page).toHaveURL(/\/consulta\/puntos-verdes$/);
    await expect(page.getByRole("heading", { name: "Puntos verdes" })).toBeVisible();
    await expectNoViolations(page);

    await page.getByRole("combobox", { name: "Tu zona" }).click();
    await page.getByRole("option", { name: "Centro" }).click();

    const pointsList = page.getByRole("list", { name: "Puntos verdes" });
    await expect(pointsList.getByText("Punto verde Estación Centro")).toBeVisible();
    await expect(pointsList.getByText("Punto verde Plaza Mitre")).toBeVisible();
    await expect(page.getByTitle("Punto verde Estación Centro · Av. de Mayo 1200")).toHaveCount(0);

    const marker = page.getByTitle("Punto verde Plaza Mitre · Av. Cabildo 2100");
    await expect(marker).toBeVisible();
    await expect(page.getByRole("button", { name: "Acercar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Alejar" })).toBeVisible();
    await marker.click();
    await expect(page.getByText("Reciclables, Verdes", { exact: true })).toBeVisible();
    const closePopup = page.getByRole("button", { name: "Cerrar información de Punto verde Plaza Mitre" });
    await expect(closePopup).toBeVisible();
    await expectNoViolations(page);
    await closePopup.click();
    await expect(page.getByText("Reciclables, Verdes", { exact: true })).toHaveCount(0);

    await page.getByRole("combobox", { name: "Tipo de residuo" }).click();
    await page.getByRole("option", { name: "Domiciliarios" }).click();
    await expect(pointsList.getByText("Punto verde Estación Centro")).toBeVisible();
    await expect(pointsList.getByText("Punto verde Plaza Mitre")).toHaveCount(0);
    await expect(page.getByText("No hay puntos con ubicación disponible para mostrar en el mapa.")).toBeVisible();

    await page.getByRole("link", { name: "Volver a consultas", exact: true }).click();
    await expect(page).toHaveURL(/\/consulta$/);
  });

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    test(`green-points filters stay clickable above the map at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/consulta/puntos-verdes?zona=${PUBLIC_GREEN_POINTS_CENTRO_ID}`);

      const pointsList = page.getByRole("list", { name: "Puntos verdes" });
      await expect(pointsList.getByText("Punto verde Plaza Mitre")).toBeVisible();
      await expect(page.locator(".leaflet-container")).toBeVisible();

      await page.getByRole("combobox", { name: "Tipo de residuo" }).click();
      if (viewport.width === 1440) {
        await clickOptionOverZoomControl(page, "Verdes");
      } else {
        await clickOptionByMouse(page, "Verdes");
      }
      await expect(pointsList.locator("li")).toHaveCount(1);

      await page.getByRole("combobox", { name: "Tu zona" }).click();
      await clickOptionByMouse(page, "Norte");
      await expect(pointsList.getByText("Punto verde Parque del Bicentenario")).toBeVisible();
      await expect(pointsList.getByText("Punto verde Plaza Mitre")).toHaveCount(0);
    });
  }
});
