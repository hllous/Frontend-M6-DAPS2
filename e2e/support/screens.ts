import { expect, type Page } from "@playwright/test";

import { loginViaApi } from "./auth";
import type { ScenarioId } from "../../src/lib/scenarios";

/** Anchos de la verificación responsive de la cátedra: teléfono, tablet y escritorio. */
export const AUDIT_WIDTHS = [
  { name: "360", width: 360, height: 780 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 900 },
] as const;

const DEMO_TICKET_ID = "550e8400-e29b-41d4-a716-446655440000";
const PUBLIC_GREEN_POINTS_CENTRO_ID = "7b0c4f1e-2d3a-4b5c-8d6e-0a1b2c3d4e5f";

export type AuditScreen = {
  id: string;
  /** Sesión que se siembra antes de entrar; sin ella la pantalla es pública. */
  scenario?: ScenarioId;
  path: string;
  /** Texto de un encabezado que prueba que la pantalla terminó de cargar. */
  heading: RegExp | string;
};

export const AUDIT_SCREENS: AuditScreen[] = [
  { id: "login", path: "/login", heading: "Ingresar" },
  { id: "inicio-oficina", scenario: "office-duty-queue", path: "/app", heading: "Acciones de la jornada" },
  { id: "inicio-campo-responsable", scenario: "field-crew-leader-route", path: "/app", heading: /./ },
  { id: "inicio-campo-integrante", scenario: "field-crew-member-route", path: "/app", heading: /./ },
  { id: "inicio-auditor", scenario: "office-limited-intake", path: "/app", heading: /./ },
  { id: "catalogo", scenario: "office-duty-queue", path: "/app?destination=catalog", heading: "Catálogo" },
  { id: "catalogo-zonas", scenario: "office-duty-queue", path: "/app/catalog/zones", heading: "Zonas operativas" },
  { id: "catalogo-recorridos", scenario: "office-duty-queue", path: "/app/catalog/routes", heading: /Recorridos/ },
  { id: "catalogo-tipos-de-servicio", scenario: "office-duty-queue", path: "/app/catalog/service-types", heading: /Tipos de servicio/ },
  { id: "catalogo-cuadrillas", scenario: "office-duty-queue", path: "/app/catalog/crews", heading: /Cuadrillas/ },
  { id: "catalogo-vehiculos", scenario: "office-duty-queue", path: "/app/catalog/vehicles", heading: "Vehículos" },
  { id: "catalogo-arbolado", scenario: "office-duty-queue", path: "/app/catalog/trees", heading: /Árboles|Arbolado/ },
  { id: "contenedores", scenario: "office-duty-queue", path: "/app/catalog/containers", heading: "Contenedores" },
  { id: "servicios", scenario: "office-duty-queue", path: "/app?destination=services", heading: "Servicios" },
  { id: "servicios-campo", scenario: "field-crew-leader-route", path: "/app?destination=services", heading: "Servicios" },
  { id: "denuncias-expedientes", scenario: "office-duty-queue", path: "/app?destination=environment", heading: "Control ambiental" },
  { id: "mapa", scenario: "office-duty-queue", path: "/app?destination=map", heading: "Mapa operativo" },
  { id: "informes", scenario: "office-duty-queue", path: "/app?destination=dashboards", heading: "Tableros" },
  { id: "portal-publico", path: "/consulta", heading: /./ },
  { id: "portal-seguimiento", path: `/consulta/denuncia?codigo=${DEMO_TICKET_ID}`, heading: /./ },
  { id: "portal-servicios", path: "/consulta/servicios", heading: /./ },
  { id: "portal-puntos-verdes", path: `/consulta/puntos-verdes?zona=${PUBLIC_GREEN_POINTS_CENTRO_ID}`, heading: /./ },
];

/** Entra a la pantalla con el ancho dado y espera a que no quede nada cargando. */
export async function openAuditScreen(page: Page, screen: AuditScreen, size: { width: number; height: number }) {
  await page.setViewportSize({ width: size.width, height: size.height });
  if (screen.scenario) await loginViaApi(page, screen.scenario);
  await page.goto(screen.path);
  await page.locator("h1, h2").filter({ hasText: screen.heading }).first().waitFor({ state: "visible" });
  await page.locator('[aria-busy="true"]').first().waitFor({ state: "detached" }).catch(() => undefined);
  await page.mouse.move(0, 0);
  await expect(page).toHaveTitle(/.+/);
  // Las transiciones de entrada mezclan colores y dan contrastes transitorios a axe.
  await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined))));
}
