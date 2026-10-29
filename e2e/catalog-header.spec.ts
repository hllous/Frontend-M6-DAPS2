import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";

const CATALOG_SCREENS = [
  ["containers", "Contenedores"],
  ["crews", "Cuadrillas"],
  ["disposal-sites", "Sitios de disposición"],
  ["green-points", "Puntos verdes"],
  ["green-spaces", "Espacios verdes"],
  ["routes", "Recorridos"],
  ["service-frequencies", "Frecuencias de servicio"],
  ["service-types", "Tipos de servicio"],
  ["tree-interventions", "Intervenciones de arbolado"],
  ["trees", "Árboles"],
  ["vehicles", "Vehículos"],
  ["zones", "Zonas operativas"],
] as const;

const INVENTORY_ROUTES = ["containers", "green-points", "green-spaces", "trees", "tree-interventions"];

test.describe("catalog screens share one header (#245)", () => {
  for (const [route, title] of CATALOG_SCREENS) {
    test(`/app/catalog/${route}`, async ({ page }) => {
      await loginViaApi(page, "office-duty-queue");
      await page.goto(`/app/catalog/${route}`);

      const main = page.getByRole("main");
      await expect(main.getByRole("heading", { level: 1, name: title })).toBeVisible();
      const breadcrumb = main.getByRole("navigation", { name: "Ruta de navegación" });
      await expect(breadcrumb.getByRole("link", { name: INVENTORY_ROUTES.includes(route) ? "Inventario urbano" : "Configuración" })).toHaveAttribute(
        "href",
        INVENTORY_ROUTES.includes(route) ? "/app?destination=inventory" : "/app?destination=catalog",
      );
      await expect(breadcrumb.getByText(title)).toHaveAttribute("aria-current", "page");
    });
  }
});
