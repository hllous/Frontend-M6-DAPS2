import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { serviceRouteHandlers } from "@/mocks/service-route-handlers";
import { createSessionCookie } from "@/test/session";
import { scenarios } from "@/lib/scenarios";
import {
  resetStreetClosureRequestFixtures,
  updateStreetClosureRequestFixture,
} from "@/lib/street-closure-request-fixtures";
import { resetServiceFixtures, resetZoneResultFixtures, serviceFixtures, updateServiceFixture } from "@/lib/services-fixtures";
import { servicesAdapter } from "@/lib/services";
import { operationalMapAdapter } from "@/lib/operational-map";
import { operationalZonesAdapter } from "@/lib/operational-zones";
import { resetEnvironmentalInspectionFixtures, updateEnvironmentalInspectionFixture } from "@/lib/environmental-report-fixtures";
import { ServicesWorkspace } from "./services-workspace";
import { expectNoInternalJargon } from "@/test/no-internal-jargon";

const server = setupServer(...handlers);

function startedServiceFixture() {
  const service = serviceFixtures.find((candidate) => candidate.id === "SVC-1096");
  if (!service) throw new Error("SVC-1096 fixture is required for the start-service tests.");
  return { ...service, status: "IN_PROGRESS" as const };
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetStreetClosureRequestFixtures();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/app");
});
afterAll(() => server.close());

describe("ServicesWorkspace component", () => {
  it("renders the services workspace with heading, search, table and map", async () => {
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    expect(screen.getByRole("heading", { name: "Servicios" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Buscar servicio, zona o cuadrilla…")).toBeInTheDocument();

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    expect(table).toBeInTheDocument();
    expect(within(table).getByText("Recolección de residuos — Recorrido 4")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Mapa de servicios" })).toBeInTheDocument();
  });

  it("shows a table skeleton while the services load and lands the table where it was", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    // Resolving with nothing hands the request on to the default handler once released.
    server.use(http.get("*/api/services", async () => { await gate; }));
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const region = await screen.findByRole("region", { name: "Listado de servicios" });
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(within(region).getByRole("status")).toHaveTextContent("Cargando");
    expect(screen.queryByText(/Cargando\.\.\.|Cargando…/)).not.toBeInTheDocument();
    release();
    await waitFor(() => expect(region).toHaveAttribute("aria-busy", "false"));
    expect(await within(region).findByRole("region", { name: "Tabla operativa de Servicios" })).toBeInTheDocument();
    // The map inside keeps its own loading message; only this region's own message must be gone.
    expect(region.querySelector(":scope > [role=status]")).toBeNull();
  });

  it("keeps the real toolbar and the loaded column headers while the services load", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    server.use(http.get("*/api/services", async () => { await gate; }));
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const region = await screen.findByRole("region", { name: "Listado de servicios" });
    expect(within(region).getByLabelText("Período")).toBeInTheDocument();
    expect(within(region).getByRole("button", { name: /Categorías/, hidden: true })).toBeInTheDocument();
    const loadingHeaders = within(region).getAllByRole("columnheader", { hidden: true }).map((header) => header.textContent?.trim());
    expect(loadingHeaders).toEqual(["#", "Servicio", "Estado", "Zona", "Equipo", "Fecha"]);
    release();
    const table = await within(region).findByRole("region", { name: "Tabla operativa de Servicios" });
    const loadedHeaders = within(table).getAllByRole("columnheader").map((header) => header.textContent?.trim());
    expect(loadedHeaders.slice(0, 6)).toEqual(loadingHeaders);
  });

  it("hides planning mutation actions for office-limited intake", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeLimited} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    const row = within(table).getByText("Poda de árbol — Av. Rivadavia 2200").closest("tr")!;
    await user.click(row);

    const preview = await screen.findByRole("complementary");
    expect(within(preview).queryByRole("button", { name: "Asignar cuadrilla" })).not.toBeInTheDocument();

    await user.click(within(preview).getByRole("button", { name: /Ver detalle/ }));
    expect(await screen.findByRole("region", { name: /^Detalle completo de Poda de árbol/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Asignar cuadrilla" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reprogramar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar servicio" })).not.toBeInTheDocument();
  });

  it("synchronizes table selection with map marker and opens live preview", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    const row = within(table).getByText("Recolección de residuos — Recorrido 4").closest("tr")!;
    await user.click(row);

    // Live preview opens
    await waitFor(() => {
      expect(screen.getByRole("complementary")).toBeInTheDocument();
    });
    const preview = screen.getByRole("complementary");
    expect(within(preview).getByText("Recolección de residuos — Recorrido 4")).toBeInTheDocument();
    expect(preview).toHaveClass("select-text");
    const map = screen.getByRole("region", { name: "Mapa de servicios" });
    expect(map.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(table.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(preview).getByRole("button", { name: /Ver detalle/ })).toBeInTheDocument();

    // Map marker is highlighted
    const marker = await screen.findByRole("button", { name: /Parada \d+: Recolección de residuos — Recorrido 4/ });
    expect(marker).toHaveAttribute("aria-pressed", "true");

    const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>("tr[data-service-id]"));
    rows.forEach((serviceRow) => expect(serviceRow).toHaveClass("select-none"));
    const markers = Array.from(document.querySelectorAll<HTMLElement>("[data-service-id][aria-label^='Parada']"));
    rows.forEach((serviceRow, rowIndex) => {
      const rowOrdinal = Number(serviceRow.dataset.serviceOrdinal);
      expect(rowOrdinal, `row ${rowIndex + 1} must expose its map ordinal`).toBe(rowIndex + 1);
      const serviceMarker = markers.find((candidate) => candidate.dataset.serviceId === serviceRow.dataset.serviceId);
      if (!serviceMarker) return;
      const markerRank = Number(serviceMarker.getAttribute("aria-label")?.match(/^Parada (\d+)/)?.[1]);
      expect(markerRank).toBe(rowOrdinal);
    });
  });

  it("keeps native table semantics and one selection button per service row", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    expect(within(table).getByRole("table")).toBeInTheDocument();
    expect(within(table).queryByRole("grid")).not.toBeInTheDocument();
    const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>("tr[data-service-id]"));
    const rowActions = rows.map((row) => within(row).getByRole("button"));
    expect(rowActions).toHaveLength(rows.length);
    rowActions[0].focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(rowActions[0]).toHaveAttribute("aria-pressed", "true"));
  });

  it("closes the live preview on Escape and restores focus to its table row", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    const row = within(table).getByText("Recolección de residuos — Recorrido 4").closest("tr")!;
    await user.click(row);
    expect(await screen.findByRole("complementary")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("complementary")).not.toBeInTheDocument());
    expect(within(row).getByRole("button")).toHaveFocus();
  });

  it("keeps the map-backed mobile drawer at 760px and an accessible resizer from 761px", async () => {
    const originalWidth = window.innerWidth;
    try {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 760 });
      render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);
      expect(await screen.findByRole("region", { name: "Mapa de servicios" })).toBeInTheDocument();
      expect(screen.getByRole("slider", { name: "Altura de la lista" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Lista" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Mapa" })).not.toBeInTheDocument();

      Object.defineProperty(window, "innerWidth", { configurable: true, value: 761 });
      fireEvent(window, new Event("resize"));
      expect(await screen.findByRole("separator", { name: "Ajustar ancho del mapa" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Lista \(/ })).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
      fireEvent(window, new Event("resize"));
    }
  });

  it("keeps one mobile map mounted while list selection, search, and sorting change", async () => {
    const originalWidth = window.innerWidth;
    const user = userEvent.setup();
    const mapLoad = vi.spyOn(operationalMapAdapter, "load");
    const zoneLoad = vi.spyOn(operationalZonesAdapter, "list");
    const serviceList = vi.spyOn(servicesAdapter, "list");

    try {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
      render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

      const map = await screen.findByRole("region", { name: "Mapa de servicios" });
      const mapLoadCount = mapLoad.mock.calls.length;
      const zoneLoadCount = zoneLoad.mock.calls.length;
      const serviceListCount = serviceList.mock.calls.length;

      await user.type(screen.getByRole("searchbox", { name: "Buscar servicios" }), "Poda");
      await user.click(screen.getByRole("button", { name: /Ordenar por Servicio/ }));
      await user.click(screen.getByRole("row", { name: /Poda de árbol — Av\. Rivadavia 2200/ }));
      expect(document.querySelector('[role="region"][aria-label="Mapa de servicios"]')).toBe(map);

      expect(mapLoad).toHaveBeenCalledTimes(mapLoadCount);
      expect(zoneLoad).toHaveBeenCalledTimes(zoneLoadCount);
      expect(serviceList).toHaveBeenCalledTimes(serviceListCount);
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
      fireEvent(window, new Event("resize"));
    }
  });

  it("opens a full-frame preview over the phone map and three-state drawer", async () => {
    const originalWidth = window.innerWidth;
    const user = userEvent.setup();
    try {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
      render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

      const map = await screen.findByRole("region", { name: "Mapa de servicios" });
      const drawer = await screen.findByRole("complementary", { name: "Lista de servicios" });
      expect(map).toBeVisible();
      expect(document.querySelector("[data-slot='drawer-popup']")).toBeInTheDocument();
      const marker = await within(map).findByRole("button", { name: /Poda de árbol — Av\. Rivadavia 2200/ });
      await user.click(marker);

      const suspendedDrawer = document.querySelector("[data-slot='drawer-popup']");
      expect(suspendedDrawer).toBeInTheDocument();
      await waitFor(() => expect(suspendedDrawer).toHaveAttribute("hidden"));
      expect(suspendedDrawer).not.toBeVisible();
      const preview = await screen.findByRole("complementary", { name: "Poda de árbol — Av. Rivadavia 2200" });
      expect(preview).toHaveTextContent("Poda de árbol — Av. Rivadavia 2200");
      const closePreview = within(preview).getByRole("button", { name: "Cerrar" });
      expect(closePreview).toHaveFocus();
      await user.click(closePreview);
      await waitFor(() => expect(document.querySelector("[data-slot='drawer-popup']")).toBeInTheDocument());
      expect(screen.getByRole("slider", { name: "Altura de la lista" })).toHaveAttribute(
        "aria-valuetext",
        "media",
      );
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
      fireEvent(window, new Event("resize"));
    }
  });

  it("hides the period and category filters while a phone service preview is open", async () => {
    const originalWidth = window.innerWidth;
    const user = userEvent.setup();
    try {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
      render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);
      await screen.findByRole("region", { name: "Mapa de servicios" });
      expect(screen.getByRole("combobox", { name: "Período" })).toBeVisible();
      expect(screen.getByRole("button", { name: "Categorías" })).toBeVisible();

      await user.click(screen.getByRole("row", { name: /Poda de árbol — Av\. Rivadavia 2200/ }));
      const preview = await screen.findByRole("complementary", { name: "Poda de árbol — Av. Rivadavia 2200" });
      expect(screen.queryByRole("combobox", { name: "Período" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Categorías" })).not.toBeInTheDocument();
      expect(screen.getByRole("searchbox", { name: "Buscar servicios" })).toBeVisible();

      await user.click(within(preview).getByRole("button", { name: "Cerrar" }));
      expect(await screen.findByRole("combobox", { name: "Período" })).toBeVisible();
      expect(screen.getByRole("button", { name: "Categorías" })).toBeVisible();
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
      fireEvent(window, new Event("resize"));
    }
  });

  it("synchronizes map marker selection with table and opens preview", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    const map = screen.getByRole("region", { name: "Mapa de servicios" });
    const marker = await within(map).findByRole("button", { name: /Poda de árbol — Av\. Rivadavia 2200/ });
    await user.click(marker);

    // Preview opened
    await waitFor(() => {
      expect(screen.getByRole("complementary")).toBeInTheDocument();
    });
    const preview = screen.getByRole("complementary");
    expect(within(preview).getByText("Poda de árbol — Av. Rivadavia 2200")).toBeInTheDocument();

    // Corresponding table row is selected
    const table = screen.getByRole("region", { name: "Tabla operativa de Servicios" });
    const row = within(table).getByText("Poda de árbol — Av. Rivadavia 2200").closest("tr")!;
    expect(row).toHaveAttribute("aria-selected", "true");
  });

  it("navigates to full detail only on explicit action, never automatically", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    const row = within(table).getByText("Recolección de residuos — Recorrido 4").closest("tr")!;
    await user.click(row);

    // Live preview is visible, but NOT full detail yet
    expect(screen.queryByRole("region", { name: /Detalle completo de Recolección de residuos — Recorrido 4/ })).not.toBeInTheDocument();

    // Click explicit button "Ver detalle"
    const detailBtn = screen.getByRole("button", { name: /Ver detalle/ });
    await user.click(detailBtn);

    // Now full detail is rendered
    let detail!: HTMLElement;
    await waitFor(() => {
      detail = screen.getByRole("region", { name: "Detalle completo de Recolección de residuos — Recorrido 4" });
      expect(detail).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Volver a Servicios" })).toBeInTheDocument();
    expect(within(detail).getAllByText("Cuadrilla").length).toBeGreaterThan(0);
    expect(screen.queryByText("ID: crew-a")).not.toBeInTheDocument();
    expect(within(detail).getByText("Origen: Planificación")).toBeInTheDocument();
    expect(within(detail).queryByText("PLANNED")).not.toBeInTheDocument();
    expect(within(detail).queryByText("Seguridad operativa")).not.toBeInTheDocument();
    expect(within(detail).queryByText("Validación Zod activa")).not.toBeInTheDocument();

    // Go back to workspace
    await user.click(screen.getByRole("button", { name: "Volver a Servicios" }));
    const returnedTable = screen.getByRole("region", { name: "Tabla operativa de Servicios" });
    const returnedRow = within(returnedTable).getByText("Recolección de residuos — Recorrido 4").closest("tr")!;
    await waitFor(() => expect(within(returnedRow).getByRole("button")).toHaveFocus());
  });

  it("operates map markers using keyboard Enter and Space", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    const marker = await screen.findByRole("button", { name: /Parada \d+: Recolección de residuos — Recorrido 4/ });
    marker.focus();
    expect(marker).toHaveFocus();

    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(screen.getByRole("complementary")).toBeInTheDocument();
    });
    expect(marker).toHaveAttribute("aria-pressed", "true");

    const map = screen.getByRole("region", { name: "Mapa de servicios" });
    const marker2 = await within(map).findByRole("button", { name: /Poda de árbol — Av\. Rivadavia 2200/ });
    marker2.focus();
    await user.keyboard(" ");
    await waitFor(() => {
      const preview = screen.getByRole("complementary");
      expect(within(preview).getByText("Poda de árbol — Av. Rivadavia 2200")).toBeInTheDocument();
    });
    expect(marker2).toHaveAttribute("aria-pressed", "true");
  });

  it("filters services by global search query", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    expect(within(table).getByText("Recolección de residuos — Recorrido 4")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText("Buscar servicio, zona o cuadrilla…");
    fireEvent.change(searchInput, { target: { value: "microbasural" } });

    await waitFor(() => {
      expect(within(table).getByText("Denuncia — acumulación de residuos en microbasural")).toBeInTheDocument();
      expect(within(table).queryByText("Recolección de residuos — Recorrido 4")).not.toBeInTheDocument();
    });

    // Clear search with the clear button
    const clearBtn = screen.getByRole("button", { name: "Borrar búsqueda" });
    await user.click(clearBtn);

    await waitFor(() => {
      expect(within(table).getByText("Recolección de residuos — Recorrido 4")).toBeInTheDocument();
    });
  });

  it("keeps loaded zones available while column filters narrow the service list", async () => {
    resetServiceFixtures();
    updateServiceFixture("SVC-1042", { zoneNames: ["Zona A"], status: "SCHEDULED", crewName: "Cuadrilla A" });
    updateServiceFixture("SVC-1043", { zoneNames: ["Zona B"], crewName: "Cuadrilla B" });
    updateServiceFixture("SVC-1044", { zoneNames: ["Zona C"], crewName: "Cuadrilla C" });

    const user = userEvent.setup();
    try {
      render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

      await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
      await user.click(screen.getByRole("button", { name: "Filtrar por equipo" }));

      let crewFilter = screen.getByRole("dialog", { name: "Filtro de equipo" });
      await user.click(within(crewFilter).getByRole("checkbox", { name: "Cuadrilla A" }));
      crewFilter = screen.getByRole("dialog", { name: "Filtro de equipo" });
      expect(within(crewFilter).getByRole("checkbox", { name: "Cuadrilla B" })).toBeInTheDocument();
      expect(within(crewFilter).getByRole("checkbox", { name: "Cuadrilla C" })).toBeInTheDocument();
      await user.click(within(crewFilter).getByRole("button", { name: "Limpiar" }));
      await user.keyboard("{Escape}");
      expect(screen.getByRole("button", { name: "Filtrar por equipo" })).toHaveFocus();

      await user.click(screen.getByRole("button", { name: "Filtrar por zona" }));

      let zoneFilter = screen.getByRole("dialog", { name: "Filtro de zona" });
      await user.click(within(zoneFilter).getByRole("checkbox", { name: "Zona A" }));

      zoneFilter = screen.getByRole("dialog", { name: "Filtro de zona" });
      expect(within(zoneFilter).getByRole("checkbox", { name: "Zona B" })).toBeInTheDocument();
      expect(within(zoneFilter).getByRole("checkbox", { name: "Zona C" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Filtrar por estado" }));
      const statusFilter = screen.getByRole("dialog", { name: "Filtro de estado" });
      await user.click(within(statusFilter).getByRole("checkbox", { name: "Completado" }));
      await user.keyboard("{Escape}");

      await user.click(screen.getByRole("button", { name: "Filtrar por zona" }));
      zoneFilter = screen.getByRole("dialog", { name: "Filtro de zona" });
      expect(within(zoneFilter).getByRole("checkbox", { name: "Zona A" })).toBeChecked();
      expect(within(zoneFilter).getByRole("checkbox", { name: "Zona B" })).toBeInTheDocument();
      expect(within(zoneFilter).getByRole("checkbox", { name: "Zona C" })).toBeInTheDocument();
    } finally {
      resetServiceFixtures();
    }
  });

  it("disables service start while pending and only sends one request on a double click", async () => {
    resetServiceFixtures();
    let startCalls = 0;
    let releaseStart!: () => void;
    const responseGate = new Promise<void>((resolve) => {
      releaseStart = resolve;
    });
    server.use(http.post("*/api/services/SVC-1096/start", async () => {
      startCalls += 1;
      await responseGate;
      return HttpResponse.json(startedServiceFixture());
    }));

    window.history.replaceState(null, "", "/app?detail=SVC-1096");
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.fieldCrewLeader} />);

    const detail = await screen.findByRole("region", { name: "Detalle completo de Barrido mecánico — Recorrido 11" });
    const startButton = within(detail).getByRole("button", { name: "Iniciar servicio" });
    try {
      await user.dblClick(startButton);
      await waitFor(() => expect(startCalls).toBe(1));
      expect(startButton).toBeDisabled();
      expect(startButton).toHaveTextContent("Iniciando...");
    } finally {
      releaseStart();
    }

    await waitFor(() => {
      expect(within(detail).queryByRole("button", { name: "Iniciar servicio" })).not.toBeInTheDocument();
      expect(within(detail).queryByRole("button", { name: "Iniciando..." })).not.toBeInTheDocument();
    });
    expect(startCalls).toBe(1);
  });

  it("shows a backend start error and clears it after a successful retry", async () => {
    resetServiceFixtures();
    let startCalls = 0;
    const errorMessage = "No se puede iniciar el servicio: falta asignar una cuadrilla.";
    server.use(http.post("*/api/services/SVC-1096/start", () => {
      startCalls += 1;
      if (startCalls === 1) {
        return HttpResponse.json(
          {
            statusCode: 409,
            message: errorMessage,
            error: "Conflict",
            timestamp: "2026-10-12T15:00:00.000Z",
            path: "/api/services/SVC-1096/start",
          },
          { status: 409 },
        );
      }
      return HttpResponse.json(startedServiceFixture());
    }));

    window.history.replaceState(null, "", "/app?detail=SVC-1096");
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.fieldCrewLeader} />);

    const detail = await screen.findByRole("region", { name: "Detalle completo de Barrido mecánico — Recorrido 11" });
    await user.click(within(detail).getByRole("button", { name: "Iniciar servicio" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(errorMessage);

    await user.click(within(detail).getByRole("button", { name: "Iniciar servicio" }));
    await waitFor(() => expect(startCalls).toBe(2));
    await waitFor(() => expect(screen.queryByText(errorMessage)).not.toBeInTheDocument());
    expect(within(detail).queryByRole("button", { name: "Iniciar servicio" })).not.toBeInTheDocument();
  });

  it("clears the previous service start error when a different service is opened", async () => {
    resetServiceFixtures();
    const errorMessage = "No se puede iniciar el servicio: falta asignar una cuadrilla.";
    server.use(http.post("*/api/services/SVC-1096/start", () => HttpResponse.json(
      {
        statusCode: 409,
        message: errorMessage,
        error: "Conflict",
        timestamp: "2026-10-12T15:00:00.000Z",
        path: "/api/services/SVC-1096/start",
      },
      { status: 409 },
    )));

    window.history.replaceState(null, "", "/app?detail=SVC-1096");
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.fieldCrewLeader} />);

    let detail = await screen.findByRole("region", { name: "Detalle completo de Barrido mecánico — Recorrido 11" });
    await user.click(within(detail).getByRole("button", { name: "Iniciar servicio" }));
    expect(await within(detail).findByRole("alert")).toHaveTextContent(errorMessage);

    await user.click(within(detail).getByRole("button", { name: "Volver a Servicios" }));
    const openServiceDetail = async (id: string, title: string) => {
      const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
      const row = within(table).getByText(title).closest("tr");
      if (!row) throw new Error(`Service ${id} must be listed for this test.`);
      await user.click(row);
      const preview = await screen.findByRole("complementary");
      await user.click(within(preview).getByRole("button", { name: /Ver detalle/ }));
      return screen.findByRole("region", { name: `Detalle completo de ${title}` });
    };

    detail = await openServiceDetail("SVC-1095", "Barrido mecánico — Recorrido 10");
    expect(within(detail).queryByRole("alert")).not.toBeInTheDocument();

    await user.click(within(detail).getByRole("button", { name: "Volver a Servicios" }));
    detail = await openServiceDetail("SVC-1096", "Barrido mecánico — Recorrido 11");
    expect(within(detail).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("sorts rows by lifecycle-aware status and by service title", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    expect(within(table).getByText("Recolección de residuos — Recorrido 4")).toBeInTheDocument();

    // Status sort button
    const statusSortBtn = within(table).getByRole("button", { name: /Ordenar por Estado/ });
    await user.click(statusSortBtn); // the list starts in chronological order: first click sorts ascending
    await user.click(statusSortBtn); // toggles to desc

    const rowsDesc = within(table).getAllByRole("row").slice(1);
    expect(rowsDesc.length).toBeGreaterThan(1);
    const cancelledRow = rowsDesc.findIndex((row) => row.textContent?.includes("Cancelado"));
    const completedRow = rowsDesc.findIndex((row) => row.textContent?.includes("Completado"));
    const scheduledRow = rowsDesc.findIndex((row) => row.textContent?.includes("Programado"));
    expect(cancelledRow).toBeGreaterThanOrEqual(0);
    expect(cancelledRow).toBeLessThan(completedRow);
    expect(completedRow).toBeLessThan(scheduledRow);

    // Sort by service name
    const serviceSortBtn = within(table).getByRole("button", { name: /Ordenar por Servicio/ });
    await user.click(serviceSortBtn);
    expect(serviceSortBtn).toHaveAttribute("aria-label", expect.stringContaining("ascendente"));
    const rowsByService = within(table).getAllByRole("row").slice(1);
    const titles = rowsByService.map((row) => row.textContent ?? "");
    expect(titles.findIndex((title) => title.includes("Barrido mecánico — Bulevar Costero"))).toBeLessThan(
      titles.findIndex((title) => title.includes("Recolección de residuos — Recorrido 4")),
    );
  });

  it("shows the no-services empty state when the period has no services", async () => {
    server.use(http.get("*/api/services", () => HttpResponse.json({
      data: [],
      meta: { total: 0, page: 1, pageSize: 50, totalPages: 1 },
    })));
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    expect(await within(table).findByText("Sin servicios en este período.")).toBeInTheDocument();
  });

  it("shows the no-matches empty state and offers to clear filters", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    fireEvent.change(screen.getByPlaceholderText("Buscar servicio, zona o cuadrilla…"), {
      target: { value: "servicio inexistente" },
    });
    expect(await within(table).findByText("Sin servicios con esos filtros.")).toBeInTheDocument();
    await user.click(within(table).getByRole("button", { name: "Limpiar filtros" }));
    expect(await within(table).findByText("Recolección de residuos — Recorrido 4")).toBeInTheDocument();
  });

  it("remains fully usable and functional when the map encounters an outage", async () => {
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} initialMapError={true} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    expect(within(table).getByText("Recolección de residuos — Recorrido 4")).toBeInTheDocument();

    // Map shows error fallback
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("No se pudo cargar el mapa")).toBeInTheDocument();
  });

  it("provides a keyboard-accessible split handle on desktop", async () => {
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    const handle = screen.getByRole("separator", { name: "Ajustar ancho del mapa" });
    expect(handle).toHaveAttribute("tabindex", "0");
  });

  it("cycles sort aria state from ascending to descending", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    const serviceHeader = within(table).getByRole("columnheader", { name: /Servicio/ });
    const sortButton = within(serviceHeader).getByRole("button", { name: /Ordenar por Servicio/ });
    expect(serviceHeader).toHaveAttribute("aria-sort", "none");

    await user.click(sortButton);
    expect(serviceHeader).toHaveAttribute("aria-sort", "ascending");
    await user.click(sortButton);
    expect(serviceHeader).toHaveAttribute("aria-sort", "descending");
  });

  it("opens scheduling dialog, creates a new service, and appears immediately in the table without reload", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("region", { name: "Tabla operativa de Servicios" });

    // Click "Programar servicio" button
    const openBtn = screen.getByRole("button", { name: "Programar servicio" });
    await user.click(openBtn);

    // Dialog opens
    expect(await screen.findByRole("heading", { name: "Programar servicio" })).toBeInTheDocument();

    // El tipo de servicio ya no viene preseleccionado.
    await waitFor(() => expect(screen.getByRole("button", { name: "Programar servicio" })).toBeEnabled());
    await user.click(screen.getByRole("combobox", { name: /Tipo de servicio/ }));
    await user.click(await screen.findByRole("option", { name: /Recolección domiciliaria/ }));

    // Select Route 1
    await waitFor(() => expect(screen.getByRole("combobox", { name: /Recorrido asignado/ })).toHaveTextContent(/\(.+\)/));
    await user.click(screen.getByRole("combobox", { name: /Recorrido asignado/ }));
    await user.click(await screen.findByRole("option", { name: /REC-001/ }));

    // Submit form
    const submitBtn = screen.getByRole("button", { name: "Programar servicio" });
    await user.click(submitBtn);

    // Dialog closes and new service appears in table
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Programar servicio" })).not.toBeInTheDocument();
    });

    const table = screen.getByRole("region", { name: "Tabla operativa de Servicios" });
    expect(table).toBeInTheDocument();
    // Preview opens for the newly scheduled service
    expect(await screen.findByRole("complementary")).toBeInTheDocument();
    expect(screen.getByRole("complementary")).toHaveTextContent("Sin asignar");
  });

  it("opens linked scheduling dialog with a localized origin and hides the technical reference ID", async () => {
    const linkedTicketId = "550e8400-e29b-41d4-a716-446655440921";
    window.history.replaceState(null, "", `/app?destination=services&action=schedule&origin=TICKET&referenceId=${linkedTicketId}`);
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Programar servicio" })).toBeInTheDocument();
    expect(screen.getByText(/^Origen: /)).toBeInTheDocument();
    expect(screen.getByText("Origen: Denuncia ciudadana")).toBeInTheDocument();
    expect(screen.queryByText(linkedTicketId)).not.toBeInTheDocument();
  });

  it("opens assign crew dialog from live preview, attaches crew, and reflects immediately in table and preview", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });

    // Find and select unassigned service SVC-1043
    const row = within(table).getByText("Poda de árbol — Av. Rivadavia 2200").closest("tr")!;
    await user.click(row);

    // Live preview opens
    const preview = await screen.findByRole("complementary");
    expect(preview).toHaveTextContent("Poda de árbol — Av. Rivadavia 2200");
    expect(preview).toHaveTextContent("Sin asignar");

    // Click "Asignar cuadrilla" button in preview
    const assignBtn = within(preview).getByRole("button", { name: "Asignar cuadrilla" });
    await user.click(assignBtn);

    // AssignCrewDialog opens
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Asignar cuadrilla y vehículo" })).toBeInTheDocument();
    expect(within(dialog).getByText("Poda de árbol — Av. Rivadavia 2200")).toBeInTheDocument();

    // Select crew-c (loaded from the crews adapter)
    await waitFor(() => expect(within(dialog).getByRole("combobox", { name: /Cuadrilla asignada/i })).toBeEnabled());
    await user.click(within(dialog).getByRole("combobox", { name: /Cuadrilla asignada/i }));
    await user.click(await screen.findByRole("option", { name: "Cuadrilla C · Ibáñez" }));

    // La cuadrilla está reubicada y también tiene un servicio en esa franja.
    expect(within(dialog).getByText(/zona distinta/i)).toBeVisible();
    await user.type(
      within(dialog).getByLabelText(/Justificación de la asignación/i),
      "La poda termina antes de la inspección de las 16.",
    );

    // Submit assignment
    const submitBtn = within(dialog).getByRole("button", { name: "Confirmar asignación" });
    await user.click(submitBtn);

    // Dialog closes
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Preview immediately reflects the assigned crew
    await waitFor(() => {
      expect(screen.getByRole("complementary")).toHaveTextContent("Cuadrilla C · Ibáñez");
    });

    // The selected-row table keeps the user's visible columns while the preview is open.
    expect(within(row).getByText("Cuadrilla C · Ibáñez")).toBeInTheDocument();
  });

  it("opens assignment for a service outside the loaded window", async () => {
    window.history.replaceState(null, "", "/app?destination=services&action=assign&serviceId=SVC-1043");
    server.use(http.get("*/api/services", () => HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 50, totalPages: 1 } })));
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Poda de árbol — Av. Rivadavia 2200")).toBeVisible();
  });
  it("opens assign crew dialog via URL parameters and updates the service", async () => {
    window.history.replaceState(null, "", "/app?destination=services&action=assign&serviceId=SVC-1043");
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    // Dialog opens automatically based on URL params
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Asignar cuadrilla y vehículo" })).toBeInTheDocument();
    expect(within(dialog).getByText("Poda de árbol — Av. Rivadavia 2200")).toBeInTheDocument();
  });

  it("reschedules a scheduled service through the two-step Office flow, preserving its zones", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    const row = within(table).getByText("Barrido mecánico — Bulevar Costero").closest("tr")!;
    await user.click(row);

    const detailBtn = await screen.findByRole("button", { name: /Ver detalle/ });
    await user.click(detailBtn);

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Detalle completo de Barrido mecánico — Bulevar Costero" })).toBeInTheDocument();
    });
    // #321: Oficina no ejecuta el servicio, pero tiene acciones: no es sólo consulta.
    expect(screen.queryByText("Solo consulta")).not.toBeInTheDocument();

    // One dialog: reason and new date together move SCHEDULED -> RESCHEDULED -> SCHEDULED
    await user.click(screen.getByRole("button", { name: "Reprogramar" }));
    const reasonDialog = await screen.findByRole("dialog");
    expect(within(reasonDialog).queryByText(/Paso \d de 2/i)).not.toBeInTheDocument();
    await user.type(
      within(reasonDialog).getByLabelText(/^Motivo/i),
      "Alerta meteorológica: vientos fuertes previstos.",
    );
    await user.click(within(reasonDialog).getByRole("button", { name: /^Nueva fecha/i }));
    await user.click(await screen.findByRole("button", { name: "Mes siguiente" }));
    await user.click(within(await screen.findByRole("grid")).getByRole("button", { name: /, 12 de /i }));
    await user.click(within(reasonDialog).getByRole("button", { name: "Reprogramar" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("Programado")).toBeVisible();
    });
    expect(screen.getByText(/^12 [a-záéíóú]{3,5}\.? \d{4}$/i)).toBeVisible();
    // zoneIds preserved verbatim
    expect(screen.getByText("Zona Centro")).toBeVisible();
  });

  it("cancels a SUSPENDED service from its detail view with a required reason", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    const row = within(table).getByText("Retiro de contenedor dañado CT-0442").closest("tr")!;
    await user.click(row);

    const detailBtn = await screen.findByRole("button", { name: /Ver detalle/ });
    await user.click(detailBtn);

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Detalle completo de Retiro de contenedor dañado CT-0442" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Cancelar servicio" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Cancelar Retiro de contenedor dañado CT-0442" })).toBeInTheDocument();

    // Empty reason is rejected
    await user.click(within(dialog).getByRole("button", { name: "Confirmar cancelación" }));
    expect(within(dialog).getByText("Indique el motivo.")).toBeVisible();

    await user.type(
      within(dialog).getByLabelText(/^Motivo/i),
      "Solicitud del cliente: ya no requiere el servicio.",
    );
    await user.click(within(dialog).getByRole("button", { name: "Confirmar cancelación" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("Cancelado")).toBeVisible();
    });
    expect(screen.getByText(/ya no requiere el servicio/i)).toBeVisible();
  });

  it("shows the inspection execution panel for an INSPECTION service, resolved by type category", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    const row = within(table).getByText(/Inspección ambiental — Establecimiento Costanera km 3/).closest("tr")!;
    await user.click(row);
    await user.click(await screen.findByRole("button", { name: /Ver detalle/ }));

    expect(await screen.findByRole("heading", { name: "Inspección ambiental" })).toBeInTheDocument();
  });

  it("reflects the closed POINT service in the detail after the crew completes it from the inspection guide (#295)", async () => {
    // Zone results and completion are Field crew actions on the crew's own service.
    server.use(...serviceRouteHandlers(createSessionCookie("field-crew-leader-route", { mode: "mock" })));
    updateServiceFixture("SVC-1112", { status: "IN_PROGRESS" });
    updateEnvironmentalInspectionFixture("INS-1012", { outcome: "NO_VIOLATION", nextStep: "CASE_CLOSED", conclusion: "Sin emisiones.", inspectedAt: "2026-09-07T11:00:00.000Z" });
    window.history.replaceState(null, "", "/app?detail=SVC-1112");
    const user = userEvent.setup();
    try {
      render(<ServicesWorkspace scenario={scenarios.fieldCrewLeader} />);

      expect(await screen.findByRole("status", { name: "El servicio sigue abierto" })).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Guardar zona" }));
      const completeButton = screen.getByRole("button", { name: "Completar servicio" });
      await waitFor(() => expect(completeButton).toBeEnabled());
      await user.click(completeButton);

      expect(await screen.findByRole("status", { name: "Servicio cerrado" })).toBeVisible();
      expect(screen.queryByRole("button", { name: "Suspender servicio" })).not.toBeInTheDocument();
    } finally {
      resetServiceFixtures();
      resetZoneResultFixtures();
      resetEnvironmentalInspectionFixtures();
    }
  });

  it("does not offer a cancel action for an IN_PROGRESS service", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    const row = within(table).getByText("Recolección de residuos — Recorrido 4").closest("tr")!;
    await user.click(row);

    const detailBtn = await screen.findByRole("button", { name: /Ver detalle/ });
    await user.click(detailBtn);

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Detalle completo de Recolección de residuos — Recorrido 4" })).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Cancelar servicio" })).not.toBeInTheDocument();
  });

  it("shows a pending closure gate for the whole linked ROUTE Service", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    await user.click(within(table).getByRole("row", { name: /Barrido mecánico — Bulevar Costero/ }));
    await user.click(await screen.findByRole("button", { name: /Ver detalle/ }));

    expect(await screen.findByRole("status", { name: /corte de calle pendiente/i })).toHaveTextContent(
      /Tránsito/i,
    );
    
  });

  it("offers Office an explicit reschedule-or-cancel branch after rejection", async () => {
    updateStreetClosureRequestFixture("SCR-1001", { status: "REJECTED" });
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    await user.click(within(table).getByRole("row", { name: /Barrido mecánico — Bulevar Costero/ }));
    await user.click(await screen.findByRole("button", { name: /Ver detalle/ }));

    expect(await screen.findByRole("status", { name: /corte de calle rechazado/i })).toHaveTextContent(
      /Tránsito rechazó el corte/i,
    );
    const rejected = screen.getByRole("status", { name: /corte de calle rechazado/i });
    expect(within(rejected).getByRole("button", { name: "Reprogramar" })).toBeInTheDocument();
    expect(within(rejected).getByRole("button", { name: "Cancelar servicio" })).toBeInTheDocument();
  });
});

describe("internal jargon guard", () => {
  it("keeps module codes, backend and API field names out of the rendered copy", async () => {
    const { container } = render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("region", { name: "Tabla operativa de Servicios" });

    expectNoInternalJargon(container);
  });
});
