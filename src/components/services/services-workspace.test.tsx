import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import {
  resetStreetClosureRequestFixtures,
  updateStreetClosureRequestFixture,
} from "@/lib/street-closure-request-fixtures";
import { resetServiceFixtures, resetZoneResultFixtures, serviceFixtures, updateServiceFixture } from "@/lib/services-fixtures";
import { resetEnvironmentalInspectionFixtures, updateEnvironmentalInspectionFixture } from "@/lib/environmental-report-fixtures";
import { ServicesWorkspace } from "./services-workspace";

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

    expect(screen.getByRole("heading", { name: "Servicios Urbanos" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Buscar servicio, zona o cuadrilla…")).toBeInTheDocument();

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    expect(table).toBeInTheDocument();
    expect(within(table).getByText("Recolección de residuos — Recorrido 4")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Mapa territorial de Servicios" })).toBeInTheDocument();
  });

  it("hides planning mutation actions for office-limited intake", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeLimited} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    const row = within(table).getByText("Poda de árbol — Av. Rivadavia 2200").closest("tr")!;
    await user.click(row);

    const preview = await screen.findByRole("complementary");
    expect(within(preview).queryByRole("button", { name: "Asignar cuadrilla" })).not.toBeInTheDocument();

    await user.click(within(preview).getByRole("button", { name: /Ver detalle completo/ }));
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
    expect(within(preview).getByRole("button", { name: /Ver detalle completo/ })).toBeInTheDocument();

    // Map marker is highlighted
    const marker = await screen.findByRole("button", { name: /Parada 1: Recolección de residuos — Recorrido 4/ });
    expect(marker).toHaveAttribute("aria-pressed", "true");
  });

  it("synchronizes map marker selection with table and opens preview", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    const marker = await screen.findByRole("button", { name: /Poda de árbol — Av\. Rivadavia 2200/ });
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

    // Click explicit button "Ver detalle completo"
    const detailBtn = screen.getByRole("button", { name: /Ver detalle completo/ });
    await user.click(detailBtn);

    // Now full detail is rendered
    let detail!: HTMLElement;
    await waitFor(() => {
      detail = screen.getByRole("region", { name: "Detalle completo de Recolección de residuos — Recorrido 4" });
      expect(detail).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Volver a Servicios" })).toBeInTheDocument();
    expect(within(detail).getByText("Asignación vigente")).toBeInTheDocument();
    expect(screen.queryByText("ID: crew-a")).not.toBeInTheDocument();
    expect(within(detail).getByText("Origen: Planificación")).toBeInTheDocument();
    expect(within(detail).queryByText("PLANNED")).not.toBeInTheDocument();
    expect(within(detail).queryByText("Seguridad operativa")).not.toBeInTheDocument();
    expect(within(detail).queryByText("Validación Zod activa")).not.toBeInTheDocument();

    // Go back to workspace
    await user.click(screen.getByRole("button", { name: "Volver a Servicios" }));
    expect(screen.getByRole("region", { name: "Tabla operativa de Servicios" })).toBeInTheDocument();
  });

  it("operates map markers using keyboard Enter and Space", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    const marker = await screen.findByRole("button", { name: /Parada 1: Recolección de residuos — Recorrido 4/ });
    marker.focus();
    expect(marker).toHaveFocus();

    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(screen.getByRole("complementary")).toBeInTheDocument();
    });
    expect(marker).toHaveAttribute("aria-pressed", "true");

    const marker2 = await screen.findByRole("button", { name: /Poda de árbol — Av\. Rivadavia 2200/ });
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
      await user.click(screen.getByRole("button", { name: "Filtrar por cuadrilla" }));

      let crewFilter = screen.getByRole("dialog", { name: "Filtro de cuadrilla" });
      await user.click(within(crewFilter).getByRole("checkbox", { name: "Cuadrilla A" }));
      crewFilter = screen.getByRole("dialog", { name: "Filtro de cuadrilla" });
      expect(within(crewFilter).getByRole("checkbox", { name: "Cuadrilla B" })).toBeInTheDocument();
      expect(within(crewFilter).getByRole("checkbox", { name: "Cuadrilla C" })).toBeInTheDocument();
      await user.click(within(crewFilter).getByRole("button", { name: "Limpiar" }));
      await user.keyboard("{Escape}");

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
      await user.click(within(preview).getByRole("button", { name: /Ver detalle completo/ }));
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
    expect(await within(table).findByText("No hay servicios para mostrar en este período.")).toBeInTheDocument();
  });

  it("shows the no-matches empty state and offers to clear filters", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    fireEvent.change(screen.getByPlaceholderText("Buscar servicio, zona o cuadrilla…"), {
      target: { value: "servicio inexistente" },
    });
    expect(await within(table).findByText("No hay servicios que coincidan con los filtros aplicados.")).toBeInTheDocument();
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
    expect(screen.getByText(/La tabla de servicios permanece completamente disponible/)).toBeInTheDocument();
  });

  it("swaps sides between map and table in wide split-pane mode", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    const swapBtn = screen.getByRole("button", { name: /Intercambiar paneles: colocar mapa a la izquierda/ });
    await user.click(swapBtn);

    expect(screen.getByRole("button", { name: /Intercambiar paneles: colocar mapa a la derecha/ })).toBeInTheDocument();
  });

  it("opens scheduling dialog, creates a new service, and appears immediately in the table without reload", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("region", { name: "Tabla operativa de Servicios" });

    // Click "Programar servicio" button
    const openBtn = screen.getByRole("button", { name: "Programar nuevo servicio" });
    await user.click(openBtn);

    // Dialog opens
    expect(await screen.findByRole("heading", { name: "Programar nuevo servicio" })).toBeInTheDocument();

    // Select Route 1
    const routeSelect = screen.getByLabelText(/Recorrido asignado/);
    await user.selectOptions(routeSelect, "route-1");

    // Submit form
    const submitBtn = screen.getByRole("button", { name: "Programar servicio" });
    await user.click(submitBtn);

    // Dialog closes and new service appears in table
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Programar nuevo servicio" })).not.toBeInTheDocument();
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

    expect(await screen.findByRole("heading", { name: "Programar servicio vinculado" })).toBeInTheDocument();
    expect(screen.getByText("Origen vinculado preservado")).toBeInTheDocument();
    expect(screen.getByText("Denuncia ciudadana", { exact: true })).toBeInTheDocument();
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
    expect(within(dialog).getAllByText("Poda de árbol — Av. Rivadavia 2200")).toHaveLength(2);

    // Select crew-c (loaded from the crews adapter)
    const crewSelect = within(dialog).getByLabelText(/Cuadrilla asignada/i);
    await within(dialog).findByRole("option", { name: "Cuadrilla C · Ibáñez" });
    await user.selectOptions(crewSelect, "crew-c");

    // crew-c already holds SVC-1072 (13:00–16:00) that day: the backend requires a justification
    await user.type(
      within(dialog).getByLabelText(/Justificación del solapamiento/i),
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

    // Table row also displays the assigned crew
    expect(within(row).getByText("Cuadrilla C · Ibáñez")).toBeInTheDocument();
  });

  it("opens assign crew dialog via URL parameters and updates the service", async () => {
    window.history.replaceState(null, "", "/app?destination=services&action=assign&serviceId=SVC-1043");
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    // Dialog opens automatically based on URL params
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Asignar cuadrilla y vehículo" })).toBeInTheDocument();
    expect(within(dialog).getAllByText("Poda de árbol — Av. Rivadavia 2200")).toHaveLength(2);
  });

  it("reschedules a scheduled service through the two-step Office flow, preserving its zones", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    const row = within(table).getByText("Barrido mecánico — Bulevar Costero").closest("tr")!;
    await user.click(row);

    const detailBtn = await screen.findByRole("button", { name: /Ver detalle completo/ });
    await user.click(detailBtn);

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Detalle completo de Barrido mecánico — Bulevar Costero" })).toBeInTheDocument();
    });
    // #321: Oficina no ejecuta el servicio, pero tiene acciones: no es sólo consulta.
    expect(screen.queryByText("Solo consulta")).not.toBeInTheDocument();

    // Step 1: reason moves SCHEDULED -> RESCHEDULED
    await user.click(screen.getByRole("button", { name: "Reprogramar" }));
    const reasonDialog = await screen.findByRole("dialog");
    expect(within(reasonDialog).getByText(/Paso 1 de 2/i)).toBeInTheDocument();
    await user.type(
      within(reasonDialog).getByLabelText(/^Motivo/i),
      "Alerta meteorológica: vientos fuertes previstos.",
    );
    await user.click(within(reasonDialog).getByRole("button", { name: "Mover a reprogramar" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Intermediate RESCHEDULED state is visible in the detail view
    await waitFor(() => {
      expect(screen.getByText("A reprogramar")).toBeVisible();
    });
    expect(screen.getByText(/vientos fuertes previstos/i)).toBeVisible();

    // Step 2: new date/window moves RESCHEDULED -> SCHEDULED
    await user.click(screen.getByRole("button", { name: "Confirmar nueva fecha" }));
    const confirmDialog = await screen.findByRole("dialog");
    expect(within(confirmDialog).getByText(/Paso 2 de 2/i)).toBeInTheDocument();
    // zoneIds snapshot is shown untouched
    expect(within(confirmDialog).getByText("Zona Centro")).toBeInTheDocument();

    const dateInput = within(confirmDialog).getByLabelText(/Nueva fecha/i);
    fireEvent.change(dateInput, { target: { value: "2099-09-12" } });
    await user.click(within(confirmDialog).getByRole("button", { name: "Confirmar nueva fecha" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("Programado")).toBeVisible();
    });
    expect(screen.getByText("12 sept 2099")).toBeVisible();
    // zoneIds preserved verbatim
    expect(screen.getByText("Zona Centro")).toBeVisible();
  });

  it("cancels a SUSPENDED service from its detail view with a required reason", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    const row = within(table).getByText("Retiro de contenedor dañado CT-0442").closest("tr")!;
    await user.click(row);

    const detailBtn = await screen.findByRole("button", { name: /Ver detalle completo/ });
    await user.click(detailBtn);

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Detalle completo de Retiro de contenedor dañado CT-0442" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Cancelar servicio" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Cancelar Retiro de contenedor dañado CT-0442" })).toBeInTheDocument();

    // Empty reason is rejected
    await user.click(within(dialog).getByRole("button", { name: "Cancelar servicio" }));
    expect(within(dialog).getByText(/motivo de la cancelación/i)).toBeVisible();

    await user.type(
      within(dialog).getByLabelText(/^Motivo/i),
      "Solicitud del cliente: ya no requiere el servicio.",
    );
    await user.click(within(dialog).getByRole("button", { name: "Cancelar servicio" }));

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
    await user.click(await screen.findByRole("button", { name: /Ver detalle completo/ }));

    expect(await screen.findByRole("heading", { name: "Ejecución de inspección ambiental" })).toBeInTheDocument();
  });

  it("reflects the closed POINT service in the detail after the crew completes it from the inspection guide (#295)", async () => {
    updateServiceFixture("SVC-1112", { status: "IN_PROGRESS" });
    updateEnvironmentalInspectionFixture("INS-1012", { outcome: "NO_VIOLATION", nextStep: "CASE_CLOSED", conclusion: "Sin emisiones.", inspectedAt: "2026-09-07T11:00:00.000Z" });
    window.history.replaceState(null, "", "/app?detail=SVC-1112");
    const user = userEvent.setup();
    try {
      render(<ServicesWorkspace scenario={scenarios.fieldCrewLeader} />);

      expect(await screen.findByRole("status", { name: "El servicio sigue abierto" })).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Guardar resultado de zona" }));
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

    const detailBtn = await screen.findByRole("button", { name: /Ver detalle completo/ });
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
    await user.click(await screen.findByRole("button", { name: /Ver detalle completo/ }));

    expect(await screen.findByRole("status", { name: /corte de calle pendiente/i })).toHaveTextContent(
      /todo el Servicio/i,
    );
    expect(screen.getByText(/el inicio.*bloqueado/i)).toBeInTheDocument();
  });

  it("offers Office an explicit reschedule-or-cancel branch after rejection", async () => {
    updateStreetClosureRequestFixture("SCR-1001", { status: "REJECTED" });
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    await user.click(within(table).getByRole("row", { name: /Barrido mecánico — Bulevar Costero/ }));
    await user.click(await screen.findByRole("button", { name: /Ver detalle completo/ }));

    expect(await screen.findByRole("status", { name: /corte de calle rechazado/i })).toHaveTextContent(
      /decidir.*reprogramar.*cancelar/i,
    );
    expect(screen.getByRole("button", { name: "Reprogramar servicio por rechazo de corte" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar servicio por rechazo de corte" })).toBeInTheDocument();
  });
});
