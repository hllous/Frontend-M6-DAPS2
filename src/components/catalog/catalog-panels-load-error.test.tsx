import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";

import { ContainerCatalogPanel } from "./container-catalog-panel";
import { CrewCatalogPanel } from "./crew-catalog-panel";
import { DisposalSitesPanel } from "./disposal-sites-panel";
import { GreenPointCatalogPanel } from "./green-point-catalog-panel";
import { GreenSpacesPanel } from "./green-spaces-panel";
import { ServiceFrequenciesPanel } from "./service-frequencies-panel";
import { ServiceTypesPanel } from "./service-types-panel";
import { TreeCatalogPanel } from "./tree-catalog-panel";
import { TreeInterventionsPanel } from "./tree-interventions-panel";
import { VehicleCatalogPanel } from "./vehicle-catalog-panel";
import { ZoneCatalogPanel } from "./zone-catalog-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks(); });
afterAll(() => server.close());

type Panel = ComponentType<{ scenario: typeof scenarios.officeDutyQueue }>;
const panels: Array<[string, Panel, string]> = [
  ["contenedores", ContainerCatalogPanel as Panel, "*/api/containers"],
  ["cuadrillas", CrewCatalogPanel as Panel, "*/api/crews"],
  ["sitios de disposición", DisposalSitesPanel as Panel, "*/api/disposal-sites"],
  ["puntos verdes", GreenPointCatalogPanel as Panel, "*/api/green-points"],
  ["espacios verdes", GreenSpacesPanel as Panel, "*/api/green-spaces"],
  ["frecuencias de servicio", ServiceFrequenciesPanel as Panel, "*/api/service-frequencies"],
  ["tipos de servicio", ServiceTypesPanel as Panel, "*/api/service-types"],
  ["árboles", TreeCatalogPanel as Panel, "*/api/trees"],
  ["intervenciones de arbolado", TreeInterventionsPanel as Panel, "*/api/tree-interventions"],
  ["vehículos", VehicleCatalogPanel as Panel, "*/api/vehicles"],
  ["zonas", ZoneCatalogPanel as Panel, "*/api/zones"],
];

describe("paneles de catálogo: la lista no carga", () => {
  it.each(panels)("%s muestra el mensaje de error del servidor y no una tabla vacía", async (_name, Panel, pattern) => {
    server.use(http.get(pattern, ({ request }) => HttpResponse.json(
      { statusCode: 503, error: "Service Unavailable", message: "Catálogo caído para la prueba.", timestamp: new Date().toISOString(), path: new URL(request.url).pathname },
      { status: 503 },
    )));
    render(<Panel scenario={scenarios.officeDutyQueue} />);

    expect((await screen.findAllByText(/Catálogo caído para la prueba\./)).length).toBeGreaterThan(0);
  });
});
