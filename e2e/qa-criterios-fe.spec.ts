import { expect, test, type Page } from "@playwright/test";

import { loginViaApi } from "./support/auth";

// Criterios de QA (Backend docs/QA/02-historias-y-criterios.md) que solo tienen test del
// frontend. Cada test nombra el criterio en el título y verifica su ENTONCES.


async function bodyRowNames(page: Page, column: number) {
  const rows = page.locator("table[data-slot='table'] tbody tr");
  return rows.evaluateAll((elements, index) => elements.map((row) => row.querySelectorAll("th,td")[index]?.textContent?.trim() ?? ""), column);
}

test.describe("CA-HU01 catálogos con tabla compartida, esqueleto y error", () => {
  test("CA-HU01-1: un catálogo con varias páginas se ordena y filtra con la misma tabla que Servicios", async ({ page }) => {
    await loginViaApi(page, "office-duty-queue");

    // Servicios: la tabla de referencia. Sus encabezados ordenables son botones "Ordenar por ...".
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/app?destination=services");
    const servicesTable = page.getByRole("region", { name: "Tabla operativa de Servicios" });
    await expect(servicesTable.locator("th[aria-sort]").first()).toBeVisible();
    await expect(servicesTable.getByRole("button", { name: /^Ordenar por .*, actualmente/ }).first()).toBeVisible();

    // Zonas operativas: 48 zonas (más de una página de 20) en el mismo componente de tabla.
    await page.goto("/app/catalog/zones");
    await expect(page.getByRole("heading", { name: "Zonas operativas" })).toBeVisible();
    const rows = page.locator("table[data-slot='table'] tbody tr");
    await expect(rows).toHaveCount(48);
    expect(48).toBeGreaterThan(20);

    const nameHeader = page.locator("th[aria-sort]").first();
    await expect(nameHeader).toHaveAttribute("aria-sort", "none");

    await page.getByRole("button", { name: "Ordenar por Nombre, actualmente sin ordenar" }).click();
    await expect(page.locator("th[aria-sort='ascending']")).toHaveCount(1);
    const ascending = await bodyRowNames(page, 0);
    expect(ascending).toEqual([...ascending].sort((a, b) => a.localeCompare(b, "es")));

    await page.getByRole("button", { name: "Ordenar por Nombre, actualmente ascendente" }).click();
    await expect(page.locator("th[aria-sort='descending']")).toHaveCount(1);
    const descending = await bodyRowNames(page, 0);
    expect(descending).toEqual([...ascending].reverse());

    // Filtrar: la búsqueda reduce el mismo listado y se puede ordenar el resultado.
    await page.getByLabel("Buscar zona").fill("lerm");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Palermo");
    await page.getByLabel("Buscar zona").fill("");
    await expect(rows).toHaveCount(48);
  });

  test("CA-HU01-1: un catálogo paginado de a 20 muestra la página y permite pasar a la siguiente", async ({ page }) => {
    const vehicles = Array.from({ length: 25 }, (_, index) => ({
      id: `vehicle-${index + 1}`,
      plate: `AA ${String(index + 1).padStart(3, "0")} BB`,
      vehicleType: "VAN",
      capacity: 5,
      active: true,
    }));
    await page.route("**/api/vehicles?*", async (route) => {
      const url = new URL(route.request().url());
      const current = Number(url.searchParams.get("page") ?? "1");
      const pageSize = Number(url.searchParams.get("pageSize") ?? "20");
      expect(pageSize).toBe(20);
      await route.fulfill({
        json: {
          data: vehicles.slice((current - 1) * pageSize, current * pageSize),
          meta: { total: vehicles.length, page: current, pageSize, totalPages: Math.ceil(vehicles.length / pageSize) },
        },
      });
    });
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/vehicles");

    const rows = page.locator("table[data-slot='table'] tbody tr");
    await expect(rows).toHaveCount(20);
    await expect(page.getByText("Mostrando 1–20 de 25")).toBeVisible();
    await expect(page.locator("table[data-slot='table'] th[scope='col']").first()).toBeVisible();

    await page.getByRole("navigation", { name: "Paginación de vehículos" }).getByRole("button", { name: /siguiente/i }).click();
    await expect(rows).toHaveCount(5);
    await expect(page.getByText("Mostrando 21–25 de 25")).toBeVisible();
  });

  test("CA-HU01-2: mientras el backend tarda, el catálogo muestra un esqueleto con la forma final y no un spinner ni la tabla vacía", async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/api/vehicles?*", async (route) => {
      await gate;
      await route.continue();
    });
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app/catalog/vehicles");

    const region = page.getByRole("region", { name: "Listado de vehículos" });
    await expect(region).toHaveAttribute("aria-busy", "true");
    await expect(region.getByRole("status")).toHaveText("Cargando");
    // Esqueleto con la forma final: las columnas de la tabla y celdas skeleton, no un spinner suelto.
    await expect(region.locator("table")).toBeVisible();
    await expect(region.locator("th[scope='col']")).toHaveCount(5);
    expect(await region.locator("[data-slot='skeleton']").count()).toBeGreaterThan(0);
    await expect(page.locator("[data-slot='spinner']")).toHaveCount(0);
    await expect(page.getByText(/Cargando\.\.\.|Cargando…/)).toHaveCount(0);
    await expect(page.getByText("No hay vehículos")).toHaveCount(0);

    release();
    await expect(region.locator("[data-slot='skeleton']")).toHaveCount(0);
    await expect(page.getByRole("table", { name: "Vehículos registrados" })).toBeVisible();
  });

  for (const failure of [
    { name: "un 500 del backend", status: 500, message: "Error interno del servidor." },
    { name: "el timeout de 5 s del BFF (503)", status: 503, message: "El sistema no responde. Reintente en unos segundos." },
  ]) {
    for (const catalog of [
      { path: "/app/catalog/vehicles", api: "**/api/vehicles?*", heading: "Vehículos" },
      { path: "/app/catalog/containers", api: "**/api/containers?*", heading: "Contenedores" },
      { path: "/app/catalog/trees", api: "**/api/trees?*", heading: "Árboles" },
    ]) {
      test(`CA-HU01-4: ${catalog.heading} ante ${failure.name} muestra un mensaje con role="alert" y no una tabla vacía`, async ({ page }) => {
        await page.route(catalog.api, (route) => route.fulfill({
          status: failure.status,
          contentType: "application/json",
          body: JSON.stringify({ statusCode: failure.status, message: failure.message, error: "Error", timestamp: new Date().toISOString(), path: new URL(route.request().url()).pathname }),
        }));
        await loginViaApi(page, "office-duty-queue");
        await page.goto(catalog.path);

        const alert = page.getByRole("alert").filter({ hasText: /No se pudieron cargar|no respondió|no responde|Error|No se pudo/i }).first();
        await expect(alert).toBeVisible();
        await expect(page.locator("table[data-slot='table'] tbody tr")).toHaveCount(0);
        await expect(page.getByRole("button", { name: /Reintentar/ }).first()).toBeVisible();
        await expect(page.getByText(/No hay (vehículos|contenedores|árboles)|Sin (vehículos|contenedores|árboles)/i)).toHaveCount(0);
      });
    }
  }
});

test.describe("CA-HU26 fechas y etiquetas legibles", () => {
  async function openReportWithCreatedAt(page: Page, createdAt: string) {
    await page.route("**/api/environmental-reports*", async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      const response = await route.fetch();
      const body = await response.json();
      const patch = (report: { id: string; createdAt: string }) => (report.id === "ER-1001" ? { ...report, createdAt } : report);
      await route.fulfill({ response, json: Array.isArray(body.data) ? { ...body, data: body.data.map(patch) } : patch(body) });
    });
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/app?destination=environment");
    await page.getByRole("region", { name: "Cola de expedientes ambientales" }).getByRole("button", { name: /EXP-2026-001001/ }).click();
    await expect(page.getByRole("heading", { name: /Expediente/ })).toBeVisible();
    return page.locator("dt", { hasText: /^Creado$/ }).locator("xpath=following-sibling::dd[1]");
  }

  test("CA-HU26-1: una fecha se muestra en formato dd/mm/aaaa hh:mm de 24 horas", async ({ page }) => {
    const created = await openReportWithCreatedAt(page, "2026-09-06T17:05:00.000Z");
    await expect(created).toHaveText(/^06\/09\/2026,? 14:05$/);
  });

  test("CA-HU26-3: un instante cercano a medianoche UTC se muestra con el día de Argentina (UTC-3), no el de UTC", async ({ page }) => {
    // 01:30 UTC del 22/09 son las 22:30 del 21/09 en Argentina.
    const created = await openReportWithCreatedAt(page, "2026-09-22T01:30:00.000Z");
    await expect(created).toHaveText(/^21\/09\/2026,? 22:30$/);
    await expect(created).not.toContainText("22/09/2026");
  });
});
