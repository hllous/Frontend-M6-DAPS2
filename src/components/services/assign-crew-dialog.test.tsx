import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { HttpResponse, http, type HttpResponseResolver } from "msw";

import { handlers } from "@/mocks/handlers";
import { AssignCrewDialog } from "./assign-crew-dialog";
import type { Service } from "@/lib/services";

// Ids con la forma real del backend (UUID): si el diálogo vuelve a ofrecer ids de fixture
// (crew-a, veh-101…), estos tests no encuentran las opciones y fallan.
const TYPE_ID = "5a0f7c1e-2b3d-4e5f-8a9b-0c1d2e3f4a5b";
const CREW_ID = "d907516e-ddb7-46d4-a7d4-cd235cbb1529";
const OTHER_CREW_ID = "901159c1-3230-440a-ba3d-d7baf55fab24";
const VEHICLE_ID = "8fdf235f-1111-4222-8333-944455556666";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

const service: Service = {
  id: "0b8d3c4e-5f60-4718-9a2b-3c4d5e6f7081",
  serviceTypeId: TYPE_ID,
  serviceTypeName: "Recolección domiciliaria",
  title: "Recolección — Belgrano",
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
  attachments: [],
  history: [],
};

const overlapping: Service = {
  ...service,
  id: "c1a2b3c4-d5e6-4f70-8192-a3b4c5d6e7f8",
  title: "Recolección — Núñez",
  status: "IN_PROGRESS",
  windowFrom: "09:00",
  windowTo: "13:00",
  crewId: CREW_ID,
  crewName: "Cuadrilla Belgrano — Recolección",
};

const meta = { total: 2, page: 1, pageSize: 100, totalPages: 1 };

const serviceTypeBody = (requiresVehicle: boolean) => ({
  id: TYPE_ID,
  code: "REC-DOM",
  name: "Recolección domiciliaria",
  category: "WASTE_COLLECTION",
  mode: "ROUTE",
  requiresVehicle,
  active: true,
});

function realResources({ requiresVehicle = true, serviceType }: { requiresVehicle?: boolean; serviceType?: HttpResponseResolver } = {}) {
  server.use(
    http.get("*/api/crews", () =>
      HttpResponse.json({
        data: [
          { id: CREW_ID, name: "Cuadrilla Belgrano — Recolección", crewType: "MUNICIPAL", leaderUserId: null, defaultShift: "MORNING", active: true },
          { id: OTHER_CREW_ID, name: "Cuadrilla Palermo — Recolección", crewType: "MUNICIPAL", leaderUserId: null, defaultShift: "MORNING", active: true },
        ],
        meta,
      }),
    ),
    http.get("*/api/vehicles", () =>
      HttpResponse.json({
        data: [{ id: VEHICLE_ID, plate: "AC 101 BG", vehicleType: "COMPACTOR_TRUCK", capacity: 16, active: true }],
        meta: { ...meta, total: 1 },
      }),
    ),
    http.get("*/api/service-types/:id", serviceType ?? (() => HttpResponse.json(serviceTypeBody(requiresVehicle)))),
  );
}

function captureAssign(responses: Array<{ status: number; body: Record<string, unknown> }> = []) {
  const bodies: Record<string, unknown>[] = [];
  server.use(
    http.post("*/api/services/:id/assign-crew", async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      bodies.push(body);
      const next = responses.shift();
      if (next) return HttpResponse.json(next.body, { status: next.status });
      return HttpResponse.json({ ...service, crewId: body.crewId, vehicleId: body.vehicleId ?? null });
    }),
  );
  return bodies;
}

function renderDialog(props: { allServices?: Service[]; onAssigned?: (s: Service) => void } = {}) {
  render(
    <AssignCrewDialog
      open
      onOpenChange={vi.fn()}
      service={service}
      allServices={props.allServices ?? []}
      onAssigned={props.onAssigned ?? vi.fn()}
    />,
  );
}

describe("AssignCrewDialog", () => {
  it("lists real crews and vehicles and sends their UUIDs for a type that requires a vehicle", async () => {
    realResources();
    const bodies = captureAssign();
    const onAssigned = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onAssigned });

    await screen.findByText(/Vehículo obligatorio/i);
    expect(screen.queryByRole("option", { name: /Cuadrilla A · López/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /AF 123 CD/ })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/Cuadrilla asignada/i), CREW_ID);
    await user.click(screen.getByRole("button", { name: "Confirmar asignación" }));
    expect(screen.getByText(/requiere la asignación obligatoria de un vehículo/i)).toBeInTheDocument();
    expect(bodies).toHaveLength(0);

    await user.selectOptions(screen.getByLabelText(/Vehículo operativo/i), VEHICLE_ID);
    await user.click(screen.getByRole("button", { name: "Confirmar asignación" }));

    await waitFor(() => expect(onAssigned).toHaveBeenCalledTimes(1));
    expect(bodies).toEqual([{ crewId: CREW_ID, vehicleId: VEHICLE_ID }]);
  });

  it("cannot confirm while the service type is still loading", async () => {
    realResources({ serviceType: () => new Promise<never>(() => undefined) });
    const bodies = captureAssign();
    const user = userEvent.setup();
    renderDialog();

    expect(await screen.findByText(/Cargando cuadrillas, vehículos y requisitos/i)).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Confirmar asignación" });
    expect(submit).toBeDisabled();
    expect(screen.queryByText(/Vehículo opcional/i)).not.toBeInTheDocument();
    await user.click(submit);
    expect(bodies).toHaveLength(0);
  });

  it("shows an error with Reintentar when the service type fails, instead of assuming the vehicle is optional", async () => {
    let fail = true;
    realResources({
      serviceType: () =>
        fail
          ? HttpResponse.json(
              { statusCode: 500, message: "Falla del backend", error: "Internal Server Error", timestamp: new Date().toISOString(), path: "/api/service-types" },
              { status: 500 },
            )
          : HttpResponse.json(serviceTypeBody(true)),
    });
    const user = userEvent.setup();
    renderDialog();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/No se pudieron cargar los datos para asignar/);
    expect(screen.getByRole("button", { name: "Confirmar asignación" })).toBeDisabled();
    expect(screen.queryByText(/Vehículo opcional/i)).not.toBeInTheDocument();

    fail = false;
    await user.click(within(alert).getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText(/Vehículo obligatorio/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar asignación" })).toBeEnabled();
  });

  it("asks for a justification on overlap and sends it as overrideNote", async () => {
    realResources({ requiresVehicle: false });
    const bodies = captureAssign();
    const onAssigned = vi.fn();
    const user = userEvent.setup();
    renderDialog({ allServices: [overlapping], onAssigned });

    await screen.findByText(/Vehículo opcional/i);
    await user.selectOptions(screen.getByLabelText(/Cuadrilla asignada/i), CREW_ID);

    const warning = screen.getByText(/Aviso de superposición horaria$/i).closest("[role=status]") as HTMLElement;
    expect(within(warning).getByText(overlapping.id)).toBeInTheDocument();
    expect(screen.queryByText(/No se requiere justificación/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmar asignación" }));
    expect(screen.getByText(/justifique la asignación en al menos 10 caracteres/i)).toBeInTheDocument();
    expect(bodies).toHaveLength(0);

    await user.type(screen.getByLabelText(/Justificación del solapamiento/i), "  Núñez termina antes; coordinado por radio.  ");
    await user.click(screen.getByRole("button", { name: "Confirmar asignación" }));

    await waitFor(() => expect(onAssigned).toHaveBeenCalledTimes(1));
    expect(bodies).toEqual([{ crewId: CREW_ID, vehicleId: null, overrideNote: "Núñez termina antes; coordinado por radio." }]);
  });

  it("does not send overrideNote without an overlap", async () => {
    realResources({ requiresVehicle: false });
    const bodies = captureAssign();
    const onAssigned = vi.fn();
    const user = userEvent.setup();
    renderDialog({ allServices: [overlapping], onAssigned });

    await screen.findByText(/Vehículo opcional/i);
    await user.selectOptions(screen.getByLabelText(/Cuadrilla asignada/i), OTHER_CREW_ID);
    expect(screen.queryByLabelText(/Justificación del solapamiento/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar asignación" }));

    await waitFor(() => expect(onAssigned).toHaveBeenCalledTimes(1));
    expect(bodies).toEqual([{ crewId: OTHER_CREW_ID, vehicleId: null }]);
  });

  it("asks for the justification when the backend reports an overlap the screen did not see (409)", async () => {
    realResources({ requiresVehicle: false });
    const bodies = captureAssign([
      {
        status: 409,
        body: { statusCode: 409, message: "La asignacion se solapa con 1 servicio/s ya programado/s.", error: "Conflict", timestamp: new Date().toISOString(), path: "/api/services/x/assign-crew" },
      },
    ]);
    const onAssigned = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onAssigned });

    await screen.findByText(/Vehículo opcional/i);
    await user.selectOptions(screen.getByLabelText(/Cuadrilla asignada/i), CREW_ID);
    await user.click(screen.getByRole("button", { name: "Confirmar asignación" }));

    await user.type(await screen.findByLabelText(/Justificación del solapamiento/i), "Se coordinó con el jefe de cuadrilla.");
    expect(onAssigned).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirmar asignación" }));

    await waitFor(() => expect(onAssigned).toHaveBeenCalledTimes(1));
    expect(bodies[1]).toEqual({ crewId: CREW_ID, vehicleId: null, overrideNote: "Se coordinó con el jefe de cuadrilla." });
  });
});
