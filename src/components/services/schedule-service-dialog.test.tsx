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
  await waitFor(() => expect(screen.getByRole("combobox", { name: /Tipo de servicio/ })).toHaveTextContent(/Recolección domiciliaria/));
}

type User = ReturnType<typeof userEvent.setup>;

async function choose(user: User, name: RegExp, option: string | RegExp) {
  await user.click(screen.getByRole("combobox", { name }));
  await user.click(await screen.findByRole("option", { name: option }));
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
    expect(screen.getByRole("heading", { name: "Programar servicio" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Origen del servicio/ })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Tipo de servicio/ })).toHaveAttribute("data-slot", "select-trigger");
    expect(screen.getByText("Recorrido", { exact: true })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Recorrido asignado/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Programar servicio" })).toBeInTheDocument();
  });

  it("defaults to today in Argentina, shown as dd/mm/aaaa, and disables earlier days", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-23T01:30:00Z"));
    const user = userEvent.setup();

    try {
      render(<ScheduleServiceDialog open={true} onOpenChange={vi.fn()} onCreated={vi.fn()} />);
      await catalogsLoaded();

      const dateButton = screen.getByRole("button", { name: /Fecha programada/ });
      expect(dateButton).toHaveTextContent("22/09/2026");
      await user.click(dateButton);
      const grid = await screen.findByRole("grid");
      expect(within(grid).getByRole("button", { name: /, 21 de septiembre/i })).toBeDisabled();
      expect(within(grid).getByRole("button", { name: /, 22 de septiembre/i })).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the window as two 24-hour time pickers", async () => {
    render(<ScheduleServiceDialog open={true} onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    await catalogsLoaded();

    const from = within(screen.getByRole("group", { name: /Desde/ }));
    const to = within(screen.getByRole("group", { name: /Hasta/ }));
    expect(from.getByRole("combobox", { name: "Hora" })).toHaveTextContent("08");
    expect(to.getByRole("combobox", { name: "Hora" })).toHaveTextContent("12");
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
    expect(screen.getByText("Recorrido", { exact: true })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Recorrido asignado/ })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /Tipo de objetivo/ })).not.toBeInTheDocument();

    // Select POINT type: "st-tree-pruning" (Poda y arbolado)
    await choose(user, /Tipo de servicio/, /Poda de arbolado/);

    // Mode is now POINT
    expect(screen.getByText("Puntual", { exact: true })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /Recorrido asignado/ })).not.toBeInTheDocument();
    // Con un bien del inventario la zona se deriva del bien: no se pide.
    expect(screen.queryByRole("combobox", { name: /Zona operativa/ })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Tipo de objetivo/ })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Elemento/ })).toBeInTheDocument();
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

    expect(screen.getByRole("heading", { name: "Programar servicio" })).toBeInTheDocument();
    expect(screen.getByText("Origen: Denuncia ciudadana")).toBeInTheDocument();
    expect(screen.queryByText(linkedTicketId)).not.toBeInTheDocument();
    // Generic origin select is not rendered in linked mode
    expect(screen.queryByRole("combobox", { name: /Origen del servicio/ })).not.toBeInTheDocument();
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
    await choose(user, /Tipo de servicio/, /Mantenimiento de contenedores/);

    // Busca y elige el contenedor real del inventario (#319)
    const create = vi.spyOn(servicesAdapter, "create");
    await user.type(screen.getByLabelText(/Buscar contenedor/), "CONT-002");
    await choose(user, /Elemento/, "CONT-002 · Av. Santa Fe 3400");

    // Submit
    const submitBtn = screen.getByRole("button", { name: "Programar servicio" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledTimes(1);
    });

    expect(create.mock.calls[0][0]).toMatchObject({ targetType: "CONTAINER", targetId: "cont-2", zoneIds: ["zone-2"] });
    const created = onCreated.mock.calls[0][0];
    expect(created.status).toBe("SCHEDULED");
    expect(created.mode).toBe("POINT");
    expect(created.origin).toBe("TICKET");
    expect(created.ticketId).toBe(linkedTicketId);
    expect(created.targetType).toBe("CONTAINER");
    expect(created.targetId).toBe("cont-2");
    expect(created.targetRef).toBe("CONT-002 · Av. Santa Fe 3400");
    expect(created.crewId).toBeNull();
    expect(created.zoneIds).toEqual(["zone-2"]);
  });

  it("requires picking an inventory asset when the target type is one (#319)", async () => {
    const user = userEvent.setup();
    const create = vi.spyOn(servicesAdapter, "create");

    render(<ScheduleServiceDialog open={true} onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    await catalogsLoaded();
    await choose(user, /Tipo de servicio/, /Poda de arbolado/);
    await choose(user, /Tipo de objetivo/, "Árbol urbano");
    await user.click(screen.getByRole("button", { name: "Programar servicio" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Debe elegir el árbol urbano/);
    const target = screen.getByRole("combobox", { name: /Elemento/ });
    expect(target).toHaveAttribute("aria-invalid", "true");
    const errorId = target.getAttribute("aria-describedby")?.split(" ").at(-1);
    expect(document.getElementById(errorId!)).toHaveTextContent(/Debe elegir el árbol urbano/);
    expect(create).not.toHaveBeenCalled();
  });

  it("clears the chosen asset when the target type changes (#319)", async () => {
    const user = userEvent.setup();

    render(<ScheduleServiceDialog open={true} onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    await catalogsLoaded();
    await choose(user, /Tipo de servicio/, /Poda de arbolado/);
    await choose(user, /Tipo de objetivo/, "Árbol urbano");
    await choose(user, /Elemento/, /ARB-00442/);
    expect(screen.getByRole("combobox", { name: /Elemento/ })).toHaveTextContent(/ARB-00442/);
    expect(screen.getByText("Zona: Belgrano")).toBeInTheDocument();

    await choose(user, /Tipo de objetivo/, "Contenedor");

    expect(screen.getByRole("combobox", { name: /Elemento/ })).toHaveTextContent("Seleccione un elemento");
    await user.click(screen.getByRole("combobox", { name: /Elemento/ }));
    await screen.findByRole("option", { name: /CONT-001/ });
    expect(screen.queryByRole("option", { name: /ARB-00442/ })).not.toBeInTheDocument();
  });

  it("does not carry the chosen asset over when the dialog is reopened (#319)", async () => {
    const user = userEvent.setup();
    const create = vi.spyOn(servicesAdapter, "create");
    const props = { onOpenChange: vi.fn(), onCreated: vi.fn() };

    const { rerender } = render(<ScheduleServiceDialog open={true} {...props} />);
    await catalogsLoaded();
    await choose(user, /Tipo de servicio/, /Poda de arbolado/);
    await choose(user, /Tipo de objetivo/, "Árbol urbano");
    await choose(user, /Elemento/, /ARB-00442/);
    expect(screen.getByRole("combobox", { name: /Elemento/ })).toHaveTextContent(/ARB-00442/);

    rerender(<ScheduleServiceDialog open={false} {...props} />);
    rerender(<ScheduleServiceDialog open={true} {...props} />);
    await screen.findByRole("combobox", { name: /Tipo de objetivo/ });

    expect(screen.getByRole("combobox", { name: /Tipo de objetivo/ })).toHaveTextContent("Contenedor");
    expect(screen.getByRole("combobox", { name: /Elemento/ })).toHaveTextContent("Seleccione un elemento");
    await user.click(screen.getByRole("button", { name: "Programar servicio" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Debe elegir el contenedor/);
    expect(create).not.toHaveBeenCalled();
  });

  it("schedules a loose location by zone, without targetType or targetId", async () => {
    const user = userEvent.setup();
    const create = vi.spyOn(servicesAdapter, "create").mockResolvedValue({ id: "SVC-1" } as never);

    render(<ScheduleServiceDialog open={true} onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    await catalogsLoaded();
    await choose(user, /Tipo de servicio/, /Poda de arbolado/);
    await choose(user, /Tipo de objetivo/, /Otra ubicación/);
    await user.type(screen.getByLabelText(/Dirección o referencia/), "Av. Rivadavia 2200");
    await user.click(screen.getByRole("button", { name: "Programar servicio" }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    const payload = create.mock.calls[0][0];
    expect(payload).toMatchObject({ targetRef: "Av. Rivadavia 2200", zoneIds: [expect.any(String)] });
    expect(payload.targetType).toBeUndefined();
    expect(payload.targetId).toBeUndefined();
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

    expect(await screen.findByRole("alert")).toHaveTextContent(/Nº de reclamo no es válido/i);
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

    expect(await screen.findByRole("alert")).toHaveTextContent(/No se pudo cargar el formulario/);
    expect(screen.getByRole("button", { name: "Programar servicio" })).toBeDisabled();
    expect(create).not.toHaveBeenCalled();
  });
});
