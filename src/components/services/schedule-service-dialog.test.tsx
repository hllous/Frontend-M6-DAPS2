import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { ScheduleServiceDialog } from "./schedule-service-dialog";
import { servicesAdapter } from "@/lib/services";

const server = setupServer(...handlers);
const linkedTicketId = "550e8400-e29b-41d4-a716-446655440921";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

/** El formulario arma sus opciones con GET /service-types, /routes y /zones: se espera a que carguen. */
async function catalogsLoaded() {
  await screen.findByRole("option", { name: /Recolección domiciliaria/ });
}

describe("ScheduleServiceDialog component", () => {
  it("renders generic scheduling form with unassigned notice and derived mode", async () => {
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ScheduleServiceDialog
        open={true}
        onOpenChange={onOpenChange}
        onCreated={onCreated}
      />,
    );

    await catalogsLoaded();
    expect(screen.getByRole("heading", { name: "Programar nuevo servicio" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Origen del servicio/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tipo de servicio/)).toBeInTheDocument();
    expect(screen.getByText(/Recorrido \(ROUTE\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Recorrido asignado/)).toBeInTheDocument();
    expect(screen.getAllByText(/sin cuadrilla ni vehículo asignados/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "Programar servicio" })).toBeInTheDocument();
  });

  it("derives mode strictly from ServiceType without allowing operator to override mode", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();

    render(
      <ScheduleServiceDialog
        open={true}
        onOpenChange={vi.fn()}
        onCreated={onCreated}
      />,
    );

    await catalogsLoaded();
    // Initial state: st-waste-route -> ROUTE
    expect(screen.getByText(/Recorrido \(ROUTE\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Recorrido asignado/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Identificador de objetivo/)).not.toBeInTheDocument();

    // Select POINT type: "st-tree-pruning" (Poda y arbolado)
    const serviceTypeSelect = screen.getByLabelText(/Tipo de servicio/);
    await user.selectOptions(serviceTypeSelect, "st-tree-pruning");

    // Mode is now POINT
    expect(screen.getByText(/Punto fijo \(POINT\)/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Recorrido asignado/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Zona operativa/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Identificador de objetivo/)).toBeInTheDocument();
  });

  it("prefills and locks linked context for TICKET origin without retyping", async () => {
    render(
      <ScheduleServiceDialog
        open={true}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        initialOrigin="TICKET"
        initialReferenceId={linkedTicketId}
      />,
    );

    expect(screen.getByRole("heading", { name: "Programar servicio vinculado" })).toBeInTheDocument();
    expect(screen.getByText("Origen vinculado preservado")).toBeInTheDocument();
    expect(screen.getByText("Reclamo ciudadano (TICKET)")).toBeInTheDocument();
    expect(screen.getByText(linkedTicketId)).toBeInTheDocument();
    // Generic origin select is not rendered in linked mode
    expect(screen.queryByLabelText("Origen del servicio *")).not.toBeInTheDocument();
  });

  it("submits a generic ROUTE service successfully and calls onCreated", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ScheduleServiceDialog
        open={true}
        onOpenChange={onOpenChange}
        onCreated={onCreated}
      />,
    );

    await catalogsLoaded();
    const submitBtn = screen.getByRole("button", { name: "Programar servicio" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledTimes(1);
    });

    const created = onCreated.mock.calls[0][0];
    expect(created.id).toMatch(/^SVC-/);
    expect(created.status).toBe("SCHEDULED");
    expect(created.mode).toBe("ROUTE");
    expect(created.crewId).toBeNull();
    expect(created.vehicleId).toBeNull();
    expect(created.zoneIds.length).toBeGreaterThan(0);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("submits a linked POINT service successfully", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ScheduleServiceDialog
        open={true}
        onOpenChange={onOpenChange}
        onCreated={onCreated}
        initialOrigin="TICKET"
        initialReferenceId={linkedTicketId}
      />,
    );

    // Change to a POINT service type
    await catalogsLoaded();
    const serviceTypeSelect = screen.getByLabelText(/Tipo de servicio/);
    await user.selectOptions(serviceTypeSelect, "st-container-point");

    // Enter target ref
    const targetInput = screen.getByLabelText(/Identificador de objetivo/);
    await user.clear(targetInput);
    await user.type(targetInput, "CT-0442");

    // Submit
    const submitBtn = screen.getByRole("button", { name: "Programar servicio" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledTimes(1);
    });

    const created = onCreated.mock.calls[0][0];
    expect(created.status).toBe("SCHEDULED");
    expect(created.mode).toBe("POINT");
    expect(created.origin).toBe("TICKET");
    expect(created.ticketId).toBe(linkedTicketId);
    expect(created.targetRef).toBe("CT-0442");
    expect(created.crewId).toBeNull();
    expect(created.zoneIds).toEqual(["zone-1"]);
  });

  it("rejects a human publicId before creating a linked service", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();

    render(
      <ScheduleServiceDialog
        open={true}
        onOpenChange={vi.fn()}
        onCreated={onCreated}
        initialOrigin="TICKET"
        initialReferenceId="TK-2026-091"
      />,
    );

    await catalogsLoaded();
    await user.click(screen.getByRole("button", { name: "Programar servicio" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/UUID.*TK-/i);
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("surfaces an error alert when the adapter rejects the creation", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/api/services", () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: "Contrato rechazado por validación territorial.",
            error: "Bad Request",
            timestamp: new Date().toISOString(),
            path: "/api/services",
          },
          { status: 400 },
        ),
      ),
    );

    render(
      <ScheduleServiceDialog
        open={true}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
      />,
    );

    await catalogsLoaded();
    const submitBtn = screen.getByRole("button", { name: "Programar servicio" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByText(/Contrato rechazado/i)).toBeInTheDocument();
  });

  it("sends the backend UUIDs of the service type and route, not fixture ids", async () => {
    const user = userEvent.setup();
    const typeId = "02c17693-4fd9-473b-bc38-299dae4d8fcb";
    const routeUuid = "7d0a86c1-6ea5-4a11-9a48-0c9b7f0d55d1";
    const zoneUuid = "1b0f1a52-5d3e-4a0c-8a11-2f5f0e6b7a90";
    server.use(
      http.get("*/api/service-types", () => HttpResponse.json({
        data: [{ id: typeId, code: "REC-DOM", name: "Recolección domiciliaria", category: "WASTE_COLLECTION", mode: "ROUTE", requiresVehicle: true, active: true }],
        meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 },
      })),
      http.get("*/api/routes", () => HttpResponse.json({
        data: [{ id: routeUuid, code: "R-01", name: "Recorrido Centro", active: true, stops: [] }],
        meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 },
      })),
      http.get("*/api/routes/:routeId", () => HttpResponse.json({
        id: routeUuid, code: "R-01", name: "Recorrido Centro", active: true,
        stops: [{ id: "stop-a", sequence: 1, zoneId: zoneUuid, zoneCode: "Z-CEN", zoneName: "Centro", estimatedDurationMin: 30 }],
      })),
    );
    const create = vi.spyOn(servicesAdapter, "create").mockResolvedValue({ id: "SVC-1" } as never);

    render(<ScheduleServiceDialog open={true} onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    await catalogsLoaded();
    await user.click(screen.getByRole("button", { name: "Programar servicio" }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0]).toMatchObject({ serviceTypeId: typeId, routeId: routeUuid, zoneIds: [zoneUuid] });
  });

  it("does not schedule when the catalogs cannot be loaded", async () => {
    server.use(http.get("*/api/service-types", () => HttpResponse.error()));
    const create = vi.spyOn(servicesAdapter, "create");

    render(<ScheduleServiceDialog open={true} onOpenChange={vi.fn()} onCreated={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/No se pudieron cargar los tipos de servicio/);
    expect(screen.getByRole("button", { name: "Programar servicio" })).toBeDisabled();
    expect(create).not.toHaveBeenCalled();
  });
});
