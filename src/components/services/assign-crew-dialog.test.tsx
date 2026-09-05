import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { AssignCrewDialog } from "./assign-crew-dialog";
import type { Service } from "@/lib/services";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

const mockServiceRequiringVehicle: Service = {
  id: "SVC-1051",
  serviceTypeId: "st-street-cleaning", // requiresVehicle: true
  serviceTypeName: "Barrido mecánico",
  title: "Barrido mecánico — Recorrido 1",
  mode: "ROUTE",
  status: "SCHEDULED",
  origin: "PLANNED",
  zoneIds: ["zone-3"],
  zoneNames: ["Zona Centro"],
  scheduledDate: "2026-09-05",
  windowFrom: "08:00",
  windowTo: "12:00",
  crewId: null,
  crewName: null,
  vehicleId: null,
  vehiclePlate: null,
  coordinates: { x: 50, y: 50 },
  history: [],
};

const mockServiceNoVehicleRequired: Service = {
  id: "SVC-1043",
  serviceTypeId: "st-tree-pruning", // requiresVehicle: false
  serviceTypeName: "Poda y arbolado",
  title: "Poda de árbol — Av. Rivadavia 2200",
  mode: "POINT",
  status: "SCHEDULED",
  origin: "MANUAL",
  zoneIds: ["zone-1"],
  zoneNames: ["Zona Norte"],
  scheduledDate: "2026-09-05",
  windowFrom: "14:00",
  windowTo: "17:00",
  crewId: null,
  crewName: null,
  vehicleId: null,
  vehiclePlate: null,
  coordinates: { x: 50, y: 50 },
  history: [],
};

const mockOverlappingService: Service = {
  id: "SVC-1042",
  serviceTypeId: "st-waste-route",
  serviceTypeName: "Recolección de residuos",
  title: "Recolección de residuos — Recorrido 4",
  mode: "ROUTE",
  status: "IN_PROGRESS",
  origin: "PLANNED",
  zoneIds: ["zone-1"],
  zoneNames: ["Zona Norte"],
  scheduledDate: "2026-09-05",
  windowFrom: "09:00",
  windowTo: "13:00",
  crewId: "crew-a",
  crewName: "Cuadrilla A · López",
  vehicleId: "veh-101",
  vehiclePlate: "AF 123 CD",
  coordinates: { x: 50, y: 50 },
  history: [],
};

describe("AssignCrewDialog component", () => {
  it("renders dialog with service details, required indicators, and crew/vehicle selectors", () => {
    render(
      <AssignCrewDialog
        open={true}
        onOpenChange={vi.fn()}
        service={mockServiceRequiringVehicle}
        allServices={[]}
        onAssigned={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Asignar cuadrilla y vehículo" })).toBeInTheDocument();
    expect(screen.getByText("SVC-1051")).toBeInTheDocument();
    expect(screen.getByText("Barrido mecánico — Recorrido 1")).toBeInTheDocument();
    expect(screen.getByText(/Vehículo obligatorio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cuadrilla asignada/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Vehículo operativo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar asignación" })).toBeInTheDocument();
  });

  it("rejects submission without a required vehicle when ServiceType requires one", async () => {
    const user = userEvent.setup();
    const onAssigned = vi.fn();

    render(
      <AssignCrewDialog
        open={true}
        onOpenChange={vi.fn()}
        service={mockServiceRequiringVehicle}
        allServices={[]}
        onAssigned={onAssigned}
      />,
    );

    // Select only crew
    const crewSelect = screen.getByLabelText(/Cuadrilla asignada/i);
    await user.selectOptions(crewSelect, "crew-a");

    // Click submit without selecting vehicle
    await user.click(screen.getByRole("button", { name: "Confirmar asignación" }));

    // Rejection error displayed
    expect(
      screen.getByText(/El tipo de servicio requiere la asignación obligatoria de un vehículo/i),
    ).toBeInTheDocument();
    expect(onAssigned).not.toHaveBeenCalled();
  });

  it("submits successfully without vehicle when ServiceType does not require one", async () => {
    const user = userEvent.setup();
    const onAssigned = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <AssignCrewDialog
        open={true}
        onOpenChange={onOpenChange}
        service={mockServiceNoVehicleRequired}
        allServices={[]}
        onAssigned={onAssigned}
      />,
    );

    expect(screen.getByText(/Vehículo opcional/i)).toBeInTheDocument();

    // Select crew only
    const crewSelect = screen.getByLabelText(/Cuadrilla asignada/i);
    await user.selectOptions(crewSelect, "crew-c");

    // Click submit
    await user.click(screen.getByRole("button", { name: "Confirmar asignación" }));

    await waitFor(() => {
      expect(onAssigned).toHaveBeenCalledTimes(1);
    });

    const updated = onAssigned.mock.calls[0][0] as Service;
    expect(updated.id).toBe("SVC-1043");
    expect(updated.crewId).toBe("crew-c");
    expect(updated.vehicleId).toBeNull();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("displays non-authoritative double-booking warning when selecting an overlapping crew or vehicle", async () => {
    const user = userEvent.setup();
    const onAssigned = vi.fn();

    render(
      <AssignCrewDialog
        open={true}
        onOpenChange={vi.fn()}
        service={mockServiceRequiringVehicle}
        allServices={[mockOverlappingService]}
        onAssigned={onAssigned}
      />,
    );

    // Select crew-a (overlapping with SVC-1042: 09:00-13:00 vs 08:00-12:00 on 2026-09-05)
    const crewSelect = screen.getByLabelText(/Cuadrilla asignada/i);
    await user.selectOptions(crewSelect, "crew-a");

    // Select veh-101 (overlapping with SVC-1042)
    const vehicleSelect = screen.getByLabelText(/Vehículo operativo/i);
    await user.selectOptions(vehicleSelect, "veh-101");

    // Warnings rendered inside status banner
    const statusAlert = screen.getByRole("status");
    expect(statusAlert).toBeInTheDocument();
    expect(within(statusAlert).getAllByText("SVC-1042").length).toBeGreaterThanOrEqual(1);
    expect(within(statusAlert).getByText(/Cuadrilla A · López/)).toBeInTheDocument();
    expect(within(statusAlert).getByText(/AF 123 CD/)).toBeInTheDocument();

    // Warning states non-authoritative nature
    expect(screen.getByText(/Aviso no bloqueante/i)).toBeInTheDocument();

    // Does not offer or require an override note input (per Backend#123 gap)
    expect(screen.queryByLabelText(/motivo de anulación/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/justificación/i)).not.toBeInTheDocument();

    // Confirm button remains enabled and can be clicked
    const submitButton = screen.getByRole("button", { name: "Confirmar asignación" });
    expect(submitButton).toBeEnabled();

    await user.click(submitButton);

    await waitFor(() => {
      expect(onAssigned).toHaveBeenCalledTimes(1);
    });

    const assignedService = onAssigned.mock.calls[0][0] as Service;
    expect(assignedService.crewId).toBe("crew-a");
    expect(assignedService.vehicleId).toBe("veh-101");
  });
});
