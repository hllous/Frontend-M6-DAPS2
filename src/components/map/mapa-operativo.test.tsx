import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import * as argentinaDate from "@/lib/argentina-date";
import { scenarios } from "@/lib/scenarios";
import { mockResponseAfter } from "@/mocks/delayed-response";
import { handlers } from "@/mocks/handlers";
import { MapaOperativo } from "./mapa-operativo";

const server = setupServer(...handlers);

const canonicalZones = [
  { id: "zone-bel", code: "Z-BEL", name: "Belgrano", active: true, neighborhoodIds: [] },
  { id: "zone-pal", code: "Z-PAL", name: "Palermo", active: true, neighborhoodIds: [] },
  { id: "zone-rec", code: "Z-REC", name: "Recoleta", active: true, neighborhoodIds: [] },
  { id: "zone-ret", code: "Z-RET", name: "Retiro", active: true, neighborhoodIds: [] },
  { id: "zone-col", code: "Z-COL", name: "Colegiales", active: true, neighborhoodIds: [] },
  { id: "zone-sni", code: "Z-SNI", name: "San Nicolás", active: true, neighborhoodIds: [] },
  { id: "zone-pma", code: "Z-PMA", name: "Puerto Madero", active: true, neighborhoodIds: [] },
  { id: "zone-mon", code: "Z-MON", name: "Montserrat", active: true, neighborhoodIds: [] },
];

const canonicalZoneResponse = {
  data: canonicalZones,
  meta: { total: canonicalZones.length, page: 1, pageSize: 100, totalPages: 1 },
};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
afterAll(() => server.close());

describe("MapaOperativo", () => {
  it("keeps the map heading concise and exposes an accessible refresh action", async () => {
    render(<MapaOperativo scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Mapa operativo" })).toBeVisible();
    expect(await screen.findByRole("heading", { name: "Elementos" })).toBeVisible();
    expect(screen.queryByText(/Supervise el inventario urbano/)).not.toBeInTheDocument();
    const refresh = screen.getByRole("button", { name: "Actualizar datos" });
    expect(refresh).toBeEnabled();
    expect(refresh).toHaveAttribute("aria-label", "Actualizar datos");
  });

  it("holds the inventory layout with a busy skeleton region while the map data is delayed", async () => {
    server.use(http.all("*/api/*", () => mockResponseAfter(350, () => undefined)));
    const { container } = render(<MapaOperativo scenario={scenarios.officeDutyQueue} />);

    const region = screen.getByRole("region", { name: "Datos del mapa operativo" });
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(within(region).getByRole("status")).toHaveTextContent("Cargando");
    expect(container.querySelector("[data-slot=map-pane-skeleton]")).not.toBeNull();
    expect(screen.queryByText(/Cargando\.\.\./)).not.toBeInTheDocument();

    expect(await screen.findByRole("heading", { name: "Elementos" }, { timeout: 3000 })).toBeVisible();
    expect(screen.getByRole("region", { name: "Datos del mapa operativo" })).toHaveAttribute("aria-busy", "false");
    expect(container.querySelector("[data-slot=map-pane-skeleton]")).toBeNull();
  });

  it.each([
    ["Cobertura", "Carga de cobertura"],
    ["Recorrido", "Carga de recorridos"],
    ["Atención hoy", "Carga de atención de hoy"],
  ])("shows a busy skeleton in the %s side panel while its data is delayed", async (tab, label) => {
    const user = userEvent.setup();
    render(<MapaOperativo scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("heading", { name: "Elementos" });

    server.use(http.all("*/api/*", () => mockResponseAfter(350, () => undefined)));
    await user.click(screen.getByRole("tab", { name: tab }));

    const region = screen.getByRole("region", { name: label });
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(within(region).getByRole("status")).toHaveTextContent("Cargando");
    expect(region.querySelector("[data-skeleton=list]")).not.toBeNull();
    expect(screen.queryByText(/Cargando\.\.\./)).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByRole("region", { name: label })).toHaveAttribute("aria-busy", "false"), { timeout: 3000 });
    expect(screen.getByRole("region", { name: label }).querySelector("[data-skeleton=list]")).toBeNull();
  });

  it("changes map views with keyboard-operable tabs", async () => {
    const user = userEvent.setup();
    render(<MapaOperativo scenario={scenarios.officeDutyQueue} />);

    const inventoryTab = await screen.findByRole("tab", { name: "Inventario" });
    inventoryTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Zonas" })).toHaveAttribute("aria-selected", "true");
  });

  it("presents every point layer with a synchronized accessible list", async () => {
    const user = userEvent.setup();
    render(<MapaOperativo scenario={scenarios.officeDutyQueue} />);

    expect(screen.getByRole("region", { name: "Datos del mapa operativo" })).toHaveAttribute("aria-busy", "true");
    expect(await screen.findByRole("heading", { name: "Elementos" })).toBeInTheDocument();
    const inventoryList = screen.getByRole("list", { name: "Elementos visibles" });
    expect(within(inventoryList).getAllByRole("listitem").length).toBeGreaterThan(0);
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

  it("selects containers, green points, and green spaces from the inventory list", async () => {
    const user = userEvent.setup();
    render(<MapaOperativo scenario={scenarios.officeDutyQueue} />);

    for (const label of [/CONT-002/, /Punto verde Plaza Mitre/, /^Parque del Bicentenario/]) {
      const item = await screen.findByRole("button", { name: label });
      await user.click(item);

      expect(item).toHaveAttribute("aria-pressed", "true");
    }
  });

  it("shows the last consultation time in each operational map view", async () => {
    const user = userEvent.setup();
    render(<MapaOperativo scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("heading", { name: "Elementos" });
    expect(screen.getByText(/Consultado/)).toBeVisible();

    for (const view of ["Zonas", "Cobertura", "Recorrido", "Atención hoy"]) {
      await user.click(screen.getByRole("tab", { name: view }));
      expect(await screen.findByText(/Consultado/)).toBeVisible();
    }
  });

  it("keeps the selected tree in the URL and links its catalog detail", async () => {
    window.history.replaceState(null, "", "/app?destination=map&tree=tree-1");
    const user = userEvent.setup();
    render(<MapaOperativo scenario={scenarios.officeDutyQueue} />);

    const list = within(await screen.findByRole("region", { name: "Elementos" }));
    const selected = list.getByRole("button", { name: /ARB-00442/ });
    expect(selected).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: "Ver ficha del árbol ARB-00442" })).toHaveAttribute("href", "/app/catalog/trees?tree=tree-1&detail=tree-1");

    await user.click(list.getByRole("button", { name: /ARB-00443/ }));
    const params = new URLSearchParams(window.location.search);
    expect(params.get("tree")).toBe("tree-2");
    expect(params.get("destination")).toBe("map");
    expect(list.getByRole("button", { name: /ARB-00442/ })).toHaveAttribute("aria-pressed", "false");

    await user.click(list.getByRole("button", { name: /ARB-00443/ }));
    expect(new URLSearchParams(window.location.search).has("tree")).toBe(false);
    window.history.replaceState(null, "", "/");
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

  it("shows the eight official operational zones with an accessible list", async () => {
    server.use(
      http.get("*/api/zones", () => HttpResponse.json(canonicalZoneResponse)),
    );

    const user = userEvent.setup();
    render(<MapaOperativo scenario={scenarios.officeDutyQueue} />);

    await user.click(await screen.findByRole("tab", { name: "Zonas" }));

    expect(await screen.findByRole("heading", { name: "Zonas operativas" })).toBeVisible();
    expect(screen.getByRole("list", { name: "Zonas operativas" })).toBeVisible();
    expect(screen.getByText("Z-BEL")).toBeVisible();
    expect(screen.getByText("Belgrano")).toBeVisible();
    expect(screen.getByText("Z-PAL")).toBeVisible();
    expect(screen.getByText("Palermo")).toBeVisible();
    expect(screen.getByText("Z-REC")).toBeVisible();
    expect(screen.getByText("Recoleta")).toBeVisible();
    expect(screen.getByText("Z-RET")).toBeVisible();
    expect(screen.getByText("Retiro")).toBeVisible();
    for (const code of ["Z-COL", "Z-SNI", "Z-PMA", "Z-MON"]) expect(screen.getByText(code)).toBeVisible();
    expect(screen.getByText(/8 zonas operativas/)).toBeVisible();
  });

  it("shows coverage rates with a semantic legend and exact zone values", async () => {
    server.use(
      http.get("*/api/zones", () => HttpResponse.json(canonicalZoneResponse)),
      http.get("*/api/indicators/coverage", () =>
        HttpResponse.json({
          period: { from: "2026-08-10", to: "2026-09-10" },
          totals: { scheduled: 382, served: 334, partial: 0, notServiced: 24, pending: 24, coveragePct: 87.4 },
          byZone: [
            { id: "zone-bel", code: "Z-BEL", name: "Belgrano", scheduled: 160, served: 148, partial: 0, notServiced: 6, pending: 6, coveragePct: 92.5 },
            { id: "zone-pal", code: "Z-PAL", name: "Palermo", scheduled: 100, served: 88, partial: 0, notServiced: 6, pending: 6, coveragePct: 88 },
            { id: "zone-rec", code: "Z-REC", name: "Recoleta", scheduled: 80, served: 58, partial: 0, notServiced: 12, pending: 10, coveragePct: 72.5 },
            { id: "zone-ret", code: "Z-RET", name: "Retiro", scheduled: 42, served: 40, partial: 0, notServiced: 0, pending: 2, coveragePct: 95.2 },
          ],
          byServiceType: [],
        }),
      ),
    );

    const user = userEvent.setup();
    render(<MapaOperativo scenario={scenarios.officeDutyQueue} />);

    await user.click(await screen.findByRole("tab", { name: "Cobertura" }));

    expect(await screen.findByRole("heading", { name: "Cobertura por zona" })).toBeVisible();
    expect(screen.getByRole("list", { name: "Cobertura por zona" })).toBeVisible();
    expect(screen.getByText(/92,5/)).toBeVisible();
    expect(screen.getByText(/148 de 160 objetivos/)).toBeVisible();
    expect(screen.getByText("Cobertura alta")).toBeVisible();
    expect(screen.getByText("4 de 8 zonas con datos")).toBeVisible();
    expect(screen.getByText("Recoleta")).toBeVisible();
    expect(screen.getByText("Cobertura parcial")).toBeVisible();
  });

  it("renders route stops with their zone, sequence and estimated duration", async () => {
    const route = {
      id: "route-map",
      code: "R-REC-N",
      name: "Recorrido Norte",
      active: true,
      stops: [
        {
          id: "stop-map-1",
          sequence: 1,
          zoneId: "zone-bel",
          estimatedDurationMin: 35,
          zoneCode: "Z-BEL",
          zoneName: "Belgrano",
        },
        {
          id: "stop-map-2",
          sequence: 2,
          zoneId: "zone-rec",
          estimatedDurationMin: 40,
          zoneCode: "Z-REC",
          zoneName: "Recoleta",
        },
        {
          id: "stop-map-3",
          sequence: 3,
          zoneId: "zone-pal",
          estimatedDurationMin: 50,
          zoneCode: "Z-PAL",
          zoneName: "Palermo",
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
    expect(screen.getByRole("list", { name: "Paradas del recorrido" })).toBeVisible();
    expect(screen.getByText("Parada 1")).toBeVisible();
    expect(screen.getByText("Parada 2")).toBeVisible();
    expect(screen.getByText("Parada 3")).toBeVisible();
    expect(screen.getByText("35 min estimados")).toBeVisible();
    expect(screen.getByText("Z-PAL · Palermo")).toBeVisible();
  });

  it("offers active routes from every paginated result in the picker", async () => {
    const requestedPages: number[] = [];
    const createRoute = (id: string, code: string, name: string) => ({ id, code, name, active: true, stops: [] });
    server.use(
      http.get("*/api/routes", ({ request }) => {
        const url = new URL(request.url);
        requestedPages.push(Number(url.searchParams.get("page")));
        const page = Number(url.searchParams.get("page"));
        const route = page === 1
          ? createRoute("route-first-page", "R-001", "Primer recorrido")
          : createRoute("route-later-page", "R-101", "Recorrido posterior");
        return HttpResponse.json({
          data: [route],
          meta: { total: 101, page, pageSize: 100, totalPages: 2 },
        });
      }),
      http.get("*/api/routes/:id", ({ params }) => HttpResponse.json(
        params.id === "route-later-page"
          ? createRoute("route-later-page", "R-101", "Recorrido posterior")
          : createRoute("route-first-page", "R-001", "Primer recorrido"),
      )),
    );

    const user = userEvent.setup();
    render(<MapaOperativo scenario={scenarios.officeDutyQueue} />);
    await user.click(await screen.findByRole("tab", { name: "Recorrido" }));

    const picker = await screen.findByLabelText("Recorrido a visualizar");
    expect(within(picker).getByRole("option", { name: "R-101 · Recorrido posterior" })).toBeInTheDocument();
    expect(requestedPages.sort()).toEqual([1, 2]);
  });

  it("loads each scheduled service detail to paint today's per-zone results", async () => {
    vi.setSystemTime(new Date("2026-09-11T02:30:00.000Z"));
    const todaySpy = vi.spyOn(argentinaDate, "todayInArgentina").mockReturnValue("2026-09-10");
    const serviceListUrls: URL[] = [];
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
      http.get("*/api/services", ({ request }) => {
        serviceListUrls.push(new URL(request.url));
        return HttpResponse.json({
          data: [{ ...service, zoneResults: undefined }],
          meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 },
        });
      }),
      http.get("*/api/services/SVC-TODAY-1", () => HttpResponse.json(service)),
    );

    const user = userEvent.setup();
    render(<MapaOperativo scenario={scenarios.officeDutyQueue} />);

    await user.click(await screen.findByRole("tab", { name: "Atención hoy" }));

    expect(await screen.findByRole("heading", { name: "Zonas atendidas hoy" })).toBeVisible();
    expect(screen.getByRole("list", { name: "Zonas atendidas hoy" })).toBeVisible();
    const serviceList = screen.getByRole("list", { name: "Servicios incluidos" });
    expect(within(serviceList).getByRole("listitem")).toBeVisible();
    expect(screen.getByText("Belgrano")).toBeVisible();
    expect(screen.getByText("Atendida")).toBeVisible();
    expect(screen.getByText("Palermo")).toBeVisible();
    expect(screen.getByText("Parcial")).toBeVisible();
    expect(screen.getByText(/1 servicio programado hoy/)).toBeVisible();
    expect(todaySpy).toHaveBeenCalled();
    expect(serviceListUrls.at(-1)?.searchParams.get("scheduledFrom")).toBe("2026-09-10");
    expect(serviceListUrls.at(-1)?.searchParams.get("scheduledTo")).toBe("2026-09-10");
  });
});
