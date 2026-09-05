import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { ServicesWorkspace } from "./services-workspace";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
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
    const marker = screen.getByRole("button", { name: /Parada 1: SVC-1042/ });
    expect(marker).toHaveAttribute("aria-pressed", "true");
  });

  it("synchronizes map marker selection with table and opens preview", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    const marker = screen.getByRole("button", { name: /SVC-1043/ });
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
    expect(screen.queryByRole("region", { name: /Detalle completo de SVC-1042/ })).not.toBeInTheDocument();

    // Click explicit button "Ver detalle completo"
    const detailBtn = screen.getByRole("button", { name: /Ver detalle completo/ });
    await user.click(detailBtn);

    // Now full detail is rendered
    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Detalle completo de SVC-1042" })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Volver a Servicios" })).toBeInTheDocument();
    expect(screen.getByText("ID: crew-a")).toBeInTheDocument();

    // Go back to workspace
    await user.click(screen.getByRole("button", { name: "Volver a Servicios" }));
    expect(screen.getByRole("region", { name: "Tabla operativa de Servicios" })).toBeInTheDocument();
  });

  it("operates map markers using keyboard Enter and Space", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    const marker = screen.getByRole("button", { name: /Parada 1: SVC-1042/ });
    marker.focus();
    expect(marker).toHaveFocus();

    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(screen.getByRole("complementary")).toBeInTheDocument();
    });
    expect(marker).toHaveAttribute("aria-pressed", "true");

    const marker2 = screen.getByRole("button", { name: /SVC-1043/ });
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

  it("sorts by lifecycle-aware status and service columns", async () => {
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    expect(within(table).getByText("Recolección de residuos — Recorrido 4")).toBeInTheDocument();

    // Status sort button
    const statusSortBtn = within(table).getByRole("button", { name: /Ordenar por Estado/ });
    await user.click(statusSortBtn); // toggles to desc

    const rowsDesc = within(table).getAllByRole("row");
    expect(rowsDesc.length).toBeGreaterThan(1);

    // Sort by service name
    const serviceSortBtn = within(table).getByRole("button", { name: /Ordenar por Servicio/ });
    await user.click(serviceSortBtn);
    expect(serviceSortBtn).toHaveAttribute("aria-label", expect.stringContaining("ascending"));
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

  it("opens scheduling dialog via linked URL parameters prefilling origin and reference ID", async () => {
    window.history.replaceState(null, "", "/app?destination=services&action=schedule&origin=TICKET&referenceId=TK-9921");
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Programar servicio vinculado" })).toBeInTheDocument();
    expect(screen.getByText("Origen vinculado preservado")).toBeInTheDocument();
    expect(screen.getByText("TK-9921")).toBeInTheDocument();
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
    expect(preview).toHaveTextContent("SVC-1043");
    expect(preview).toHaveTextContent("Sin asignar");

    // Click "Asignar cuadrilla" button in preview
    const assignBtn = within(preview).getByRole("button", { name: "Asignar cuadrilla" });
    await user.click(assignBtn);

    // AssignCrewDialog opens
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Asignar cuadrilla y vehículo" })).toBeInTheDocument();
    expect(within(dialog).getByText("SVC-1043")).toBeInTheDocument();

    // Select crew-c
    const crewSelect = within(dialog).getByLabelText(/Cuadrilla asignada/i);
    await user.selectOptions(crewSelect, "crew-c");

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
    expect(within(dialog).getByText("SVC-1043")).toBeInTheDocument();
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
      expect(screen.getByRole("region", { name: "Detalle completo de SVC-1050" })).toBeInTheDocument();
    });

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
    fireEvent.change(dateInput, { target: { value: "2026-09-12" } });
    await user.click(within(confirmDialog).getByRole("button", { name: "Confirmar nueva fecha" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("Programado")).toBeVisible();
    });
    expect(screen.getByText("2026-09-12")).toBeVisible();
    // zoneIds preserved verbatim
    expect(screen.getByText("Zona Centro")).toBeVisible();
  });
});
