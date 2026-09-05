import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { ScheduleServiceDialog } from "./schedule-service-dialog";
import { servicesAdapter } from "@/lib/services";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

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
        initialReferenceId="TK-9921"
      />,
    );

    expect(screen.getByRole("heading", { name: "Programar servicio vinculado" })).toBeInTheDocument();
    expect(screen.getByText("Origen vinculado preservado")).toBeInTheDocument();
    expect(screen.getByText("Reclamo ciudadano (TICKET)")).toBeInTheDocument();
    expect(screen.getByText("TK-9921")).toBeInTheDocument();
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
        initialReferenceId="TK-9921"
      />,
    );

    // Change to a POINT service type
    const serviceTypeSelect = screen.getByLabelText(/Tipo de servicio/);
    await user.selectOptions(serviceTypeSelect, "st-container-repair");

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
    expect(created.ticketId).toBe("TK-9921");
    expect(created.targetRef).toBe("CT-0442");
    expect(created.crewId).toBeNull();
    expect(created.zoneIds).toEqual(["zone-1"]);
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

    const submitBtn = screen.getByRole("button", { name: "Programar servicio" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByText(/Contrato rechazado/i)).toBeInTheDocument();
  });
});
