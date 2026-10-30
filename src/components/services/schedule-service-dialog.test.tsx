import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { ScheduleServiceDialog } from "./schedule-service-dialog";
import { crewsAdapter } from "@/lib/crews";
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
  await waitFor(() => expect(screen.getByRole("button", { name: "Programar servicio" })).toBeEnabled());
}

type User = ReturnType<typeof userEvent.setup>;

async function choose(user: User, name: RegExp, option: string | RegExp) {
  await user.click(screen.getByRole("combobox", { name }));
  await user.click(await screen.findByRole("option", { name: option }));
}

/** El tipo de servicio ya no viene preseleccionado: los casos que parten de uno lo eligen. */
async function catalogsLoadedWithRouteType() {
  await catalogsLoaded();
  await choose(userEvent.setup(), /Tipo de servicio/, /Recolección domiciliaria/);
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

    await catalogsLoadedWithRouteType();
    expect(screen.getByRole("heading", { name: "Programar servicio" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Tipo de servicio/ })).toHaveAttribute("data-slot", "select-trigger");
    expect(screen.getByText("Recorrido", { exact: true })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Recorrido asignado/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Programar servicio" })).toBeInTheDocument();
  });

  it("starts without a service type, with the optional crew in the first step, and derives the target kind from the type", async () => {
    const user = userEvent.setup();
    render(<ScheduleServiceDialog open={true} onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    await catalogsLoaded();

    expect(screen.getByRole("combobox", { name: /Tipo de servicio/ })).toHaveTextContent("Seleccione un tipo");
    expect(screen.getByRole("combobox", { name: /Cuadrilla/ })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /Tipo de objetivo/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /Recorrido asignado/ })).not.toBeInTheDocument();

    await choose(user, /Tipo de servicio/, /Poda de arbolado/);
    expect(screen.getByRole("combobox", { name: /Tipo de objetivo/ })).toHaveTextContent("Árbol urbano");
  });

  it("marks required fields, announces the mode and warns visibly when the crews list fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(crewsAdapter, "list").mockRejectedValue(new Error("boom"));
    render(<ScheduleServiceDialog open={true} onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    await catalogsLoaded();

    expect(screen.getByText("Los campos con * son obligatorios.")).toBeVisible();
    expect(screen.getByRole("combobox", { name: /Tipo de servicio/ })).toHaveAttribute("aria-required", "true");
    expect(await screen.findByText(/No se pudo cargar el listado de cuadrillas/)).toBeVisible();

    await choose(user, /Tipo de servicio/, /Poda de arbolado/);
    expect(screen.getByText("Modo: puntual.")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Datos de la ubicación" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Zona operativa|Tipo de objetivo/ })).toHaveAttribute("aria-required", "true");
  });

  it("keeps origin and notes inside a collapsed 'Más datos' disclosure", async () => {
    const user = userEvent.setup();
    render(<ScheduleServiceDialog open={true} onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    await catalogsLoadedWithRouteType();

    const trigger = screen.getByRole("button", { name: "Más datos" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("data-slot", "collapsible-trigger");
    expect(screen.queryByRole("combobox", { name: /Origen del servicio/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Notas/)).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Tipo de servicio/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/Fecha programada/)).toBeInTheDocument();

    trigger.focus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("combobox", { name: /Origen del servicio/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Notas/)).toBeInTheDocument();
  });

  it("defaults to today in Argentina, shown as dd/mm/aaaa, and disables earlier days", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-23T01:30:00Z"));
    const user = userEvent.setup();

    try {
      render(<ScheduleServiceDialog open={true} onOpenChange={vi.fn()} onCreated={vi.fn()} />);
      await catalogsLoadedWithRouteType();

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
    await catalogsLoadedWithRouteType();

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

    await catalogsLoadedWithRouteType();
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

    await catalogsLoadedWithRouteType();
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
    await catalogsLoadedWithRouteType();
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
    await catalogsLoadedWithRouteType();
    await choose(user, /Tipo de servicio/, /Poda de arbolado/);
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
    await catalogsLoadedWithRouteType();
    await choose(user, /Tipo de servicio/, /Poda de arbolado/);
    await choose(user, /Elemento/, /ARB-00442/);
    expect(screen.getByRole("combobox", { name: /Elemento/ })).toHaveTextContent(/ARB-00442/);
    expect(screen.getByText("Zona: Belgrano")).toBeInTheDocument();

    // El objetivo lo define el tipo de servicio: cambiar el tipo cambia el objetivo y limpia el elemento.
    expect(screen.getByRole("combobox", { name: /Tipo de objetivo/ })).toBeDisabled();
    await choose(user, /Tipo de servicio/, /Mantenimiento de contenedores/);

    expect(screen.getByRole("combobox", { name: /Tipo de objetivo/ })).toHaveTextContent("Contenedor");
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
    await catalogsLoadedWithRouteType();
    await choose(user, /Tipo de servicio/, /Poda de arbolado/);
    await choose(user, /Elemento/, /ARB-00442/);
    expect(screen.getByRole("combobox", { name: /Elemento/ })).toHaveTextContent(/ARB-00442/);

    rerender(<ScheduleServiceDialog open={false} {...props} />);
    rerender(<ScheduleServiceDialog open={true} {...props} />);
    // Al reabrir no queda ni el tipo, ni el elemento, ni la cuadrilla del servicio anterior.
    expect(await screen.findByRole("combobox", { name: /Tipo de servicio/ })).toHaveTextContent("Seleccione un tipo");
    expect(screen.getByRole("combobox", { name: /Cuadrilla/ })).toHaveTextContent("Sin asignar");
    await choose(user, /Tipo de servicio/, /Mantenimiento de contenedores/);
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
    await catalogsLoadedWithRouteType();
    await choose(user, /Tipo de servicio/, /Inspección ambiental/);
    // La zona ya no se completa sola: sin elegirla no se crea.
    await user.type(screen.getByLabelText(/Dirección o referencia/), "Av. Rivadavia 2200");
    await user.click(screen.getByRole("button", { name: "Programar servicio" }));
    expect(await screen.findByText("Seleccione al menos una zona.")).toBeVisible();
    expect(create).not.toHaveBeenCalled();
    await user.click(screen.getByRole("combobox", { name: /Zona operativa/ }));
    await user.click((await screen.findAllByRole("option"))[0]);
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

    await catalogsLoadedWithRouteType();
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

    await catalogsLoadedWithRouteType();
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
    await catalogsLoadedWithRouteType();
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


it("prioriza cuadrillas de la zona y avisa si la especialidad no corresponde", async () => {
  server.use(http.get("*/api/crews", () => HttpResponse.json({ data: [
    { id: "other", name: "Otra zona", crewType: "MUNICIPAL", leaderUserId: null, defaultShift: "MORNING", active: true, effectiveZoneId: "zone-3", specialty: "TREES" },
    { id: "local", name: "Zona elegida", crewType: "MUNICIPAL", leaderUserId: null, defaultShift: "MORNING", active: true, effectiveZoneId: "zone-1", specialty: "TREES" },
  ], meta: { total: 2, page: 1, pageSize: 100, totalPages: 1 } })));
  const user = userEvent.setup();
  render(<ScheduleServiceDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />);
  await catalogsLoadedWithRouteType();
  await user.click(screen.getByRole("combobox", { name: /Cuadrilla/ }));
  expect((await screen.findAllByRole("option")).map((option) => option.textContent)).toEqual(["Sin asignar", "Zona elegida", "Otra zona"]);
  await user.click(screen.getByRole("option", { name: "Otra zona" }));
  expect(screen.getByText(/zona distinta/i)).toBeVisible();
  expect(screen.getByLabelText(/Justificación de la asignación/i)).toBeVisible();
});


it("un 409 por especialidad abre la justificación", async () => {
  server.use(http.post("*/api/services", () => HttpResponse.json({ statusCode: 409, message: "La especialidad no coincide; hace falta overrideNote", error: "Conflict", timestamp: new Date().toISOString(), path: "/api/services" }, { status: 409 })));
  const user = userEvent.setup();
  render(<ScheduleServiceDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />);
  await catalogsLoadedWithRouteType();
  await user.click(screen.getByRole("button", { name: "Programar servicio" }));
  expect(await screen.findByLabelText(/Justificación de la asignación/i)).toBeVisible();
});
