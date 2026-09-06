import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { FieldWorkPanel } from "./field-work-panel";
import { scenarios } from "@/lib/scenarios";
import { resetServiceFixtures } from "@/lib/services-fixtures";

const server = setupServer(
  http.get("*/api/services", ({ request }) => {
    const url = new URL(request.url);
    const crewId = url.searchParams.get("crewId");
    if (crewId === "crew-b") {
      return HttpResponse.json({
        data: [
          {
            id: "SVC-1050",
            serviceTypeId: "st-street-cleaning",
            serviceTypeName: "Barrido mecánico",
            title: "Barrido mecánico — Bulevar Costero",
            mode: "ROUTE",
            status: "SCHEDULED",
            origin: "PLANNED",
            zoneIds: ["zone-3"],
            zoneNames: ["Zona Centro"],
            routeId: "route-1",
            routeName: "Recorrido 1 Centro",
            scheduledDate: "2026-09-05",
            windowFrom: "08:00",
            windowTo: "12:00",
            crewId: "crew-b",
            crewName: "Cuadrilla B · Fernández",
            vehicleId: "veh-102",
            vehiclePlate: "AE 456 FG",
            history: [{ label: "Programado", at: "2026-09-05 06:00", done: true }],
          },
          {
            id: "SVC-1054",
            serviceTypeId: "st-container-repair",
            serviceTypeName: "Mantenimiento de contenedores",
            title: "Reparación de contenedor CT-0112",
            mode: "POINT",
            status: "SCHEDULED",
            origin: "MANUAL",
            zoneIds: ["zone-3"],
            zoneNames: ["Zona Centro"],
            scheduledDate: "2026-09-05",
            windowFrom: "15:30",
            windowTo: "18:00",
            crewId: "crew-b",
            crewName: "Cuadrilla B · Fernández",
            vehicleId: null,
            vehiclePlate: null,
            history: [{ label: "Programado", at: "2026-09-05 08:00", done: true }],
          },
          {
            id: "SVC-1060",
            serviceTypeId: "st-street-cleaning",
            serviceTypeName: "Barrido mecánico",
            title: "Barrido mecánico — Recorrido en curso",
            mode: "ROUTE",
            status: "IN_PROGRESS",
            origin: "PLANNED",
            zoneIds: ["zone-3"],
            zoneNames: ["Zona Centro"],
            scheduledDate: "2026-09-05",
            windowFrom: "08:00",
            windowTo: "12:00",
            crewId: "crew-b",
            crewName: "Cuadrilla B · Fernández",
            vehicleId: "veh-102",
            vehiclePlate: "AE 456 FG",
            history: [
              { label: "Programado", at: "2026-09-05 06:00", done: true },
              { label: "En curso", at: "2026-09-05 08:05", done: true },
            ],
          },
        ],
        meta: { total: 3, page: 1, pageSize: 50, totalPages: 1 },
      });
    }
    return HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 50, totalPages: 0 } });
  }),
  http.get("*/api/street-closure-requests", () =>
    HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 1 } }),
  ),
  http.post("*/api/services/:serviceId/start", ({ params }) => {
    if (params.serviceId === "SVC-1054") {
      return HttpResponse.json(
        {
          statusCode: 409,
          message: "El tipo de servicio requiere un vehículo operativo asignado para iniciar.",
          error: "Conflict",
          timestamp: new Date().toISOString(),
          path: `/api/services/${params.serviceId}/start`,
        },
        { status: 409 },
      );
    }
    return HttpResponse.json({
      id: params.serviceId,
      serviceTypeId: "st-street-cleaning",
      serviceTypeName: "Barrido mecánico",
      title: "Barrido mecánico — Bulevar Costero",
      mode: "ROUTE",
      status: "IN_PROGRESS",
      origin: "PLANNED",
      zoneIds: ["zone-3"],
      zoneNames: ["Zona Centro"],
      scheduledDate: "2026-09-05",
      windowFrom: "08:00",
      windowTo: "12:00",
      crewId: "crew-b",
      crewName: "Cuadrilla B · Fernández",
      vehicleId: "veh-102",
      vehiclePlate: "AE 456 FG",
      history: [
        { label: "Programado", at: "2026-09-05 06:00", done: true },
        { label: "En curso", at: "2026-09-05 09:00", done: true },
      ],
    });
  }),
  http.post("*/api/services/:serviceId/suspend", async ({ params, request }) => {
    const body = (await request.json()) as { reason: string; note: string };
    return HttpResponse.json({
      id: params.serviceId,
      serviceTypeId: "st-street-cleaning",
      serviceTypeName: "Barrido mecánico",
      title: "Barrido mecánico — Recorrido en curso",
      mode: "ROUTE",
      status: "SUSPENDED",
      statusReason: `Desperfecto vehicular: ${body.note}`,
      origin: "PLANNED",
      zoneIds: ["zone-3"],
      zoneNames: ["Zona Centro"],
      scheduledDate: "2026-09-05",
      windowFrom: "08:00",
      windowTo: "12:00",
      crewId: "crew-b",
      crewName: "Cuadrilla B · Fernández",
      history: [
        { label: "Programado", at: "2026-09-05 06:00", done: true },
        { label: "En curso", at: "2026-09-05 08:05", done: true },
        { label: "Suspendido", at: "2026-09-05 10:00", done: true },
      ],
    });
  }),
  http.post("*/api/services/:serviceId/resume", ({ params }) => {
    return HttpResponse.json({
      id: params.serviceId,
      serviceTypeId: "st-street-cleaning",
      serviceTypeName: "Barrido mecánico",
      title: "Barrido mecánico — Recorrido en curso",
      mode: "ROUTE",
      status: "IN_PROGRESS",
      statusReason: null,
      origin: "PLANNED",
      zoneIds: ["zone-3"],
      zoneNames: ["Zona Centro"],
      scheduledDate: "2026-09-05",
      windowFrom: "08:00",
      windowTo: "12:00",
      crewId: "crew-b",
      crewName: "Cuadrilla B · Fernández",
      history: [
        { label: "Programado", at: "2026-09-05 06:00", done: true },
        { label: "En curso", at: "2026-09-05 08:05", done: true },
        { label: "Suspendido", at: "2026-09-05 10:00", done: true },
        { label: "Reanudado", at: "2026-09-05 10:30", done: true },
      ],
    });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => resetServiceFixtures());
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

describe("FieldWorkPanel component", () => {
  it("scopes list to actor's own crew and excludes other crews' services", async () => {
    render(<FieldWorkPanel scenario={scenarios.fieldCrewLeader} />);

    expect(screen.getByRole("heading", { name: "Servicios asignados" })).toBeVisible();

    await waitFor(() => {
      expect(screen.getByText("Barrido mecánico — Bulevar Costero")).toBeVisible();
      expect(screen.getByText("Reparación de contenedor CT-0112")).toBeVisible();
    });

    // Does NOT show services assigned to crew-a or unassigned
    expect(screen.queryByText(/Recolección de residuos — Recorrido 4/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Poda de árbol/i)).not.toBeInTheDocument();
  });

  it("renders read-only view for Crew Member with no start action and allows viewing detail", async () => {
    const user = userEvent.setup();
    render(<FieldWorkPanel scenario={scenarios.fieldCrewMember} />);

    // Shows heading and member indicators
    expect(screen.getByRole("heading", { name: "Servicios asignados" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Iniciar servicio" })).not.toBeInTheDocument();
    expect(screen.getByText("La persona responsable de la cuadrilla registra los cambios de estado del servicio.")).toBeVisible();

    // Click "Ver detalle" on the first service
    const detailButtons = await screen.findAllByRole("button", { name: "Ver detalle" });
    await user.click(detailButtons[0]);

    // Detail view opens
    expect(screen.getByRole("region", { name: /Detalle completo de SVC-1050/i })).toBeVisible();
    expect(screen.getByText("Solo consulta")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Iniciar servicio" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /asignar cuadrilla/i })).not.toBeInTheDocument();

    // Return back to assigned list
    await user.click(screen.getByRole("button", { name: "Volver a Servicios asignados" }));
    expect(screen.getByRole("heading", { name: "Servicios asignados" })).toBeVisible();
  });

  it("allows Crew Leader to start an assigned service and shows early/late warning outside window", async () => {
    const user = userEvent.setup();
    render(<FieldWorkPanel scenario={scenarios.fieldCrewLeader} />);

    await waitFor(() => {
      expect(screen.getByText("Barrido mecánico — Bulevar Costero")).toBeVisible();
    });

    // Window for SVC-1050 is 08:00 - 12:00. If current time is outside, warning appears
    const warnings = screen.queryAllByText(/Inicio fuera de ventana horaria/i);
    expect(warnings.length).toBeGreaterThan(0);
    // Start button remains enabled
    const startButtons = screen.getAllByRole("button", { name: "Iniciar servicio" });
    expect(startButtons[0]).toBeEnabled();

    // Crew Leader starts the service
    await user.click(startButtons[0]);

    // Transitions to IN_PROGRESS (SVC-1060 is already IN_PROGRESS in the fixture, so at least 2 now)
    await waitFor(() => {
      expect(screen.getAllByText("En curso").length).toBeGreaterThanOrEqual(2);
    });
  });

  it("saves a start draft on a network failure, then resolves a drift as an explicit conflict rather than applying it", async () => {
    let startAttempts = 0;
    server.use(
      http.post("*/api/services/:serviceId/start", ({ params }) => {
        if (params.serviceId !== "SVC-1050") {
          return HttpResponse.json({
            id: params.serviceId,
            serviceTypeId: "st-street-cleaning",
            title: "Test",
            mode: "ROUTE",
            status: "IN_PROGRESS",
            origin: "PLANNED",
            zoneIds: ["zone-3"],
            scheduledDate: "2026-09-05",
            history: [],
          });
        }
        startAttempts += 1;
        return HttpResponse.error();
      }),
      http.get("*/api/services/:serviceId", ({ params }) => {
        // Service was reassigned server-side while offline.
        return HttpResponse.json({
          id: params.serviceId,
          serviceTypeId: "st-street-cleaning",
          serviceTypeName: "Barrido mecánico",
          title: "Barrido mecánico — Bulevar Costero",
          mode: "ROUTE",
          status: "SCHEDULED",
          origin: "PLANNED",
          zoneIds: ["zone-3"],
          zoneNames: ["Zona Centro"],
          scheduledDate: "2026-09-05",
          windowFrom: "08:00",
          windowTo: "12:00",
          crewId: "crew-c",
          crewName: "Cuadrilla C · Ibáñez",
          history: [],
          updatedAt: "2026-09-05T12:00:00.000Z",
        });
      }),
    );

    const user = userEvent.setup();
    render(<FieldWorkPanel scenario={scenarios.fieldCrewLeader} />);

    await waitFor(() => {
      expect(screen.getByText("Barrido mecánico — Bulevar Costero")).toBeVisible();
    });

    const startButtons = screen.getAllByRole("button", { name: "Iniciar servicio" });
    await user.click(startButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Borrador local pendiente de envío/i)).toBeVisible();
    });
    const retryButton = await screen.findByRole("button", { name: "Reintentar envío" });

    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeVisible();
    });
    const conflictDialog = screen.getByRole("dialog");
    expect(within(conflictDialog).getByText(/cambió mientras/i)).toBeVisible();
    expect(within(conflictDialog).getByText("Cuadrilla C · Ibáñez")).toBeVisible();
    expect(startAttempts).toBe(1);

    await user.click(within(conflictDialog).getByRole("button", { name: "Descartar borrador" }));

    await waitFor(() => {
      expect(screen.queryByText(/Borrador local pendiente de envío/i)).not.toBeInTheDocument();
    });
    expect(screen.getAllByRole("button", { name: "Iniciar servicio" })[0]).toBeVisible();
  });

  it("surfaces Backend error when starting a service missing a required vehicle", async () => {
    const user = userEvent.setup();
    render(<FieldWorkPanel scenario={scenarios.fieldCrewLeader} />);

    await waitFor(() => {
      expect(screen.getByText("Reparación de contenedor CT-0112")).toBeVisible();
    });

    // Find the start button for SVC-1054
    const startButtons = screen.getAllByRole("button", { name: "Iniciar servicio" });
    // Click start on SVC-1054 (second scheduled item)
    await user.click(startButtons[1]);

    // Backend error is surfaced in role="alert"
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("El tipo de servicio requiere un vehículo operativo asignado para iniciar.");
  });

  it("allows Crew Leader to suspend an in-progress service with a reason and note, then resume it clearing the reason", async () => {
    const user = userEvent.setup();
    render(<FieldWorkPanel scenario={scenarios.fieldCrewLeader} />);

    await waitFor(() => {
      expect(screen.getByText("Barrido mecánico — Recorrido en curso")).toBeVisible();
    });

    const detailButtons = screen.getAllByRole("button", { name: "Ver detalle" });
    // SVC-1060 is the third item rendered
    await user.click(detailButtons[2]);

    await user.click(screen.getByRole("button", { name: "Suspender servicio" }));

    expect(screen.getByRole("heading", { name: /Suspender SVC-1060/i })).toBeVisible();

    await user.selectOptions(
      screen.getByLabelText(/Motivo de suspensión/i),
      "VEHICLE_BREAKDOWN",
    );
    await user.type(screen.getByLabelText(/^Nota/i), "El camión no arranca.");
    await user.click(screen.getByRole("button", { name: "Suspender servicio" }));

    await waitFor(() => {
      expect(screen.getByText("Suspendido")).toBeVisible();
    });
    expect(screen.getByText(/desperfecto vehicular/i)).toBeVisible();
    expect(screen.getByText(/el camión no arranca/i)).toBeVisible();

    // Resume clears the prior reason
    await user.click(screen.getByRole("button", { name: "Reanudar servicio" }));

    await waitFor(() => {
      expect(screen.getByText("En curso")).toBeVisible();
    });
    expect(screen.queryByText(/desperfecto vehicular/i)).not.toBeInTheDocument();
  });

  it("preserves a suspend draft across dialog reopen, then shows an explicit conflict on drift instead of silently applying it", async () => {
    let suspendAttempts = 0;
    server.use(
      http.post("*/api/services/:serviceId/suspend", async ({ request }) => {
        suspendAttempts += 1;
        if (suspendAttempts === 1) {
          return HttpResponse.error();
        }
        const body = (await request.json()) as { reason: string; note: string };
        return HttpResponse.json({
          id: "SVC-1060",
          serviceTypeId: "st-street-cleaning",
          serviceTypeName: "Barrido mecánico",
          title: "Barrido mecánico — Recorrido en curso",
          mode: "ROUTE",
          status: "SUSPENDED",
          statusReason: `Desperfecto vehicular: ${body.note}`,
          origin: "PLANNED",
          zoneIds: ["zone-3"],
          zoneNames: ["Zona Centro"],
          scheduledDate: "2026-09-05",
          windowFrom: "08:00",
          windowTo: "12:00",
          crewId: "crew-b",
          crewName: "Cuadrilla B · Fernández",
          history: [],
        });
      }),
      http.get("*/api/services/:serviceId", () =>
        // Service was reassigned server-side while the crew leader was offline.
        HttpResponse.json({
          id: "SVC-1060",
          serviceTypeId: "st-street-cleaning",
          serviceTypeName: "Barrido mecánico",
          title: "Barrido mecánico — Recorrido en curso",
          mode: "ROUTE",
          status: "IN_PROGRESS",
          origin: "PLANNED",
          zoneIds: ["zone-3"],
          zoneNames: ["Zona Centro"],
          scheduledDate: "2026-09-05",
          windowFrom: "08:00",
          windowTo: "12:00",
          crewId: "crew-c",
          crewName: "Cuadrilla C · Ibáñez",
          history: [],
          updatedAt: "2026-09-05T12:00:00.000Z",
        }),
      ),
    );

    const user = userEvent.setup();
    render(<FieldWorkPanel scenario={scenarios.fieldCrewLeader} />);

    await waitFor(() => {
      expect(screen.getByText("Barrido mecánico — Recorrido en curso")).toBeVisible();
    });

    const detailButtons = screen.getAllByRole("button", { name: "Ver detalle" });
    await user.click(detailButtons[2]);

    await user.click(screen.getByRole("button", { name: "Suspender servicio" }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(
      within(dialog).getByLabelText(/Motivo de suspensión/i),
      "VEHICLE_BREAKDOWN",
    );
    await user.type(within(dialog).getByLabelText(/^Nota/i), "El camión no arranca.");
    await user.click(within(dialog).getByRole("button", { name: "Suspender servicio" }));

    // Real network failure: draft saved locally, dialog stays open with a pending-draft banner
    await waitFor(() => {
      expect(within(dialog).getByRole("status")).toHaveTextContent(/borrador local pendiente/i);
    });
    expect(within(dialog).getByRole("button", { name: "Reintentar envío" })).toBeVisible();

    // Close and reopen: the draft's fields are restored from the on-device copy
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Suspender servicio" }));
    const reopenedDialog = await screen.findByRole("dialog");
    expect(within(reopenedDialog).getByLabelText(/Motivo de suspensión/i)).toHaveValue(
      "VEHICLE_BREAKDOWN",
    );
    expect(within(reopenedDialog).getByLabelText(/^Nota/i)).toHaveValue("El camión no arranca.");
    expect(within(reopenedDialog).getByRole("status")).toHaveTextContent(/borrador local pendiente/i);

    // Manual resubmit: the Service drifted server-side (reassigned) -> explicit conflict, never silently applied
    await user.click(within(reopenedDialog).getByRole("button", { name: "Reintentar envío" }));

    await waitFor(() => {
      expect(within(reopenedDialog).getByText(/cambió mientras/i)).toBeVisible();
    });
    expect(within(reopenedDialog).getByText("Cuadrilla C · Ibáñez")).toBeVisible();
    expect(suspendAttempts).toBe(1);

    // Discard clears the on-device draft and resets the form
    await user.click(within(reopenedDialog).getByRole("button", { name: "Descartar borrador" }));
    await waitFor(() => {
      expect(within(reopenedDialog).queryByRole("status")).not.toBeInTheDocument();
    });
    expect(within(reopenedDialog).getByLabelText(/Motivo de suspensión/i)).toHaveValue("");
  });

  it("does not offer suspend/resume actions to a Crew Member", async () => {
    const user = userEvent.setup();
    render(<FieldWorkPanel scenario={scenarios.fieldCrewMember} />);

    await waitFor(() => {
      expect(screen.getByText("Barrido mecánico — Recorrido en curso")).toBeVisible();
    });

    const detailButtons = screen.getAllByRole("button", { name: "Ver detalle" });
    await user.click(detailButtons[2]);

    expect(screen.queryByRole("button", { name: "Suspender servicio" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reanudar servicio" })).not.toBeInTheDocument();
  });
});
