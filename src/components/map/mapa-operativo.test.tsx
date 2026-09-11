import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { MapaOperativo } from "./mapa-operativo";

const server = setupServer(...handlers);

const canonicalZones = [
  { id: "zone-bel", code: "Z-BEL", name: "Belgrano", active: true, neighborhoodIds: [] },
  { id: "zone-pal", code: "Z-PAL", name: "Palermo", active: true, neighborhoodIds: [] },
  { id: "zone-rec", code: "Z-REC", name: "Recoleta", active: true, neighborhoodIds: [] },
  { id: "zone-ret", code: "Z-RET", name: "Retiro", active: true, neighborhoodIds: [] },
];

const canonicalZoneResponse = {
  data: canonicalZones,
  meta: { total: canonicalZones.length, page: 1, pageSize: 100, totalPages: 1 },
};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => server.close());

describe("MapaOperativo", () => {
  it("presents every point layer with a synchronized accessible list", async () => {
    const user = userEvent.setup();
    render(<MapaOperativo scenario={scenarios.officeDutyQueue} />);

    expect(screen.getByRole("status", { name: "Cargando mapa operativo" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Elementos visibles" })).toBeInTheDocument();
    expect(screen.getByText("CONT-002")).toBeInTheDocument();
    expect(screen.getByText("Punto verde Plaza Mitre")).toBeInTheDocument();
    expect(screen.getByText("Parque del Bicentenario")).toBeInTheDocument();
    expect(screen.getByText("ARB-00442")).toBeInTheDocument();
    expect(screen.getByText(/Riesgo alto/)).toBeInTheDocument();
    expect(screen.getByText(/Sin relevamiento/)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /OpenStreetMap contributors/ })).toBeVisible();

    await user.click(screen.getByRole("checkbox", { name: /Contenedores/ }));

    expect(screen.queryByText("CONT-002")).not.toBeInTheDocument();
    expect(screen.getByText("Punto verde Plaza Mitre")).toBeInTheDocument();
  });

  it("explains how to recover when territorial data cannot be loaded", async () => {
    server.use(
      http.get("*/api/containers", () =>
        HttpResponse.json(
          {
            statusCode: 503,
            message: "Servicio no disponible.",
            error: "Service Unavailable",
            timestamp: new Date().toISOString(),
            path: "/api/containers",
          },
          { status: 503 },
        ),
      ),
    );

    render(<MapaOperativo scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByText("El mapa no está disponible")).toBeVisible();
    expect(screen.getByText(/Revise la conexión e intente nuevamente/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });

  it("shows the four official operational zones with an accessible list", async () => {
    server.use(
      http.get("*/api/zones", () => HttpResponse.json(canonicalZoneResponse)),
    );

    const user = userEvent.setup();
    render(<MapaOperativo scenario={scenarios.officeDutyQueue} />);

    await user.click(await screen.findByRole("tab", { name: "Zonas" }));

    expect(await screen.findByRole("heading", { name: "Zonas operativas" })).toBeVisible();
    expect(screen.getByText("Z-BEL")).toBeVisible();
    expect(screen.getByText("Belgrano")).toBeVisible();
    expect(screen.getByText("Z-PAL")).toBeVisible();
    expect(screen.getByText("Palermo")).toBeVisible();
    expect(screen.getByText("Z-REC")).toBeVisible();
    expect(screen.getByText("Recoleta")).toBeVisible();
    expect(screen.getByText("Z-RET")).toBeVisible();
    expect(screen.getByText("Retiro")).toBeVisible();
    expect(screen.getByText(/4 zonas operativas/)).toBeVisible();
  });

  it("renders route stops with their nested zone, sequence and estimated duration", async () => {
    const route = {
      id: "route-map",
      code: "R-REC-N",
      name: "Recorrido Norte",
      active: true,
      stops: [
        {
          id: "stop-map-1",
          routeId: "route-map",
          sequence: 1,
          zoneId: "zone-bel",
          estimatedDurationMin: 35,
          zone: { id: "zone-bel", code: "Z-BEL", name: "Belgrano" },
        },
        {
          id: "stop-map-2",
          routeId: "route-map",
          sequence: 2,
          zoneId: "zone-rec",
          estimatedDurationMin: 40,
          zone: { id: "zone-rec", code: "Z-REC", name: "Recoleta" },
        },
        {
          id: "stop-map-3",
          routeId: "route-map",
          sequence: 3,
          zoneId: "zone-pal",
          estimatedDurationMin: 50,
          zone: { id: "zone-pal", code: "Z-PAL", name: "Palermo" },
        },
      ],
    };

    server.use(
      http.get("*/api/zones", () => HttpResponse.json(canonicalZoneResponse)),
      http.get("*/api/routes", () =>
        HttpResponse.json({
          data: [route],
          meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 },
        }),
      ),
      http.get("*/api/routes/route-map", () => HttpResponse.json(route)),
    );

    const user = userEvent.setup();
    render(<MapaOperativo scenario={scenarios.officeDutyQueue} />);

    await user.click(await screen.findByRole("tab", { name: "Recorrido" }));

    expect(await screen.findByRole("heading", { name: "Recorrido Norte" })).toBeVisible();
    expect(screen.getByText("Parada 1")).toBeVisible();
    expect(screen.getByText("Parada 2")).toBeVisible();
    expect(screen.getByText("Parada 3")).toBeVisible();
    expect(screen.getByText("35 min estimados")).toBeVisible();
    expect(screen.getByText("Z-PAL · Palermo")).toBeVisible();
  });

  it("loads each scheduled service detail to paint today's per-zone results", async () => {
    vi.setSystemTime(new Date("2026-09-10T12:00:00-03:00"));
    const service = {
      id: "SVC-TODAY-1",
      serviceTypeId: "st-waste-route",
      serviceTypeName: "Recolección de residuos",
      title: "Recorrido de recolección del día",
      mode: "ROUTE",
      status: "IN_PROGRESS",
      statusReason: null,
      origin: "PLANNED",
      zoneIds: ["zone-bel", "zone-pal"],
      zoneNames: ["Belgrano", "Palermo"],
      routeId: "route-map",
      routeName: "Recorrido Norte",
      scheduledDate: "2026-09-10",
      windowFrom: "09:00",
      windowTo: "13:00",
      coordinates: { x: 40, y: 40 },
      zoneResults: [
        {
          id: "zr-today-1",
          serviceId: "SVC-TODAY-1",
          zoneId: "zone-bel",
          status: "SERVICED",
          reason: null,
          notes: null,
          attachments: [],
          recordedAt: "2026-09-10 09:40",
        },
        {
          id: "zr-today-2",
          serviceId: "SVC-TODAY-1",
          zoneId: "zone-pal",
          status: "PARTIAL",
          reason: "BLOCKED_ACCESS",
          notes: "Acceso bloqueado en una cuadra.",
          attachments: [],
          recordedAt: "2026-09-10 11:20",
        },
      ],
    };

    server.use(
      http.get("*/api/zones", () => HttpResponse.json(canonicalZoneResponse)),
      http.get("*/api/services", () =>
        HttpResponse.json({
          data: [{ ...service, zoneResults: undefined }],
          meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 },
        }),
      ),
      http.get("*/api/services/SVC-TODAY-1", () => HttpResponse.json(service)),
    );

    const user = userEvent.setup();
    render(<MapaOperativo scenario={scenarios.officeDutyQueue} />);

    await user.click(await screen.findByRole("tab", { name: "Atención hoy" }));

    expect(await screen.findByRole("heading", { name: "Zonas atendidas hoy" })).toBeVisible();
    expect(screen.getByText("Belgrano")).toBeVisible();
    expect(screen.getByText("Atendida")).toBeVisible();
    expect(screen.getByText("Palermo")).toBeVisible();
    expect(screen.getByText("Parcial")).toBeVisible();
    expect(screen.getByText(/1 servicio programado hoy/)).toBeVisible();
  });
});
