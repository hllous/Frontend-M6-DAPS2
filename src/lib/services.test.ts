import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { NetworkFailureError } from "./authenticated-fetch";
import { EMPTY_SERVICES_QUERY } from "./services-fixtures";
import {
  checkAssignmentConflicts,
  checkServiceWindowTiming,
  ServiceContractError,
  ServiceRequestError,
  servicesAdapter,
} from "./services";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("services adapter", () => {
  it("normalizes a successful paginated response into frontend-owned shapes", async () => {
    const page = await servicesAdapter.list();

    expect(page.services.length).toBeGreaterThan(0);
    const first = page.services[0];
    expect(first).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      mode: expect.stringMatching(/ROUTE|POINT/),
      status: expect.stringMatching(/SCHEDULED|RESCHEDULED|IN_PROGRESS|SUSPENDED|COMPLETED|PARTIALLY_COMPLETED|CANCELLED/),
      zoneIds: expect.any(Array),
    });
    expect(page).toMatchObject({
      page: 1,
      pageSize: expect.any(Number),
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });
  });

  it("normalizes the named empty-results scenario", async () => {
    const page = await servicesAdapter.list(EMPTY_SERVICES_QUERY);

    expect(page.services).toEqual([]);
    expect(page.total).toBe(0);
  });

  it("fetches a single service by ID and validates its contract", async () => {
    const service = await servicesAdapter.get("SVC-1042");

    expect(service.id).toBe("SVC-1042");
    expect(service.title).toContain("Recolección");
    expect(service.mode).toBe("ROUTE");
  });

  it("fails explicitly on a malformed success payload instead of returning partial data", async () => {
    server.use(http.get("*/api/services", () => HttpResponse.json({ services: "not-an-envelope" })));

    await expect(servicesAdapter.list()).rejects.toBeInstanceOf(ServiceContractError);
  });

  it("surfaces a documented error response as a typed request error", async () => {
    server.use(
      http.get("*/api/services", () =>
        HttpResponse.json(
          {
            statusCode: 401,
            message: "La sesión no está activa.",
            error: "Unauthorized",
            timestamp: new Date().toISOString(),
            path: "/services",
          },
          { status: 401 },
        ),
      ),
    );

    const error = await servicesAdapter.list().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ServiceRequestError);
    expect((error as ServiceRequestError).status).toBe(401);
  });

  it("fails explicitly when an error response does not respect the documented error contract", async () => {
    server.use(http.get("*/api/services", () => HttpResponse.json({ oops: true }, { status: 500 })));

    await expect(servicesAdapter.list()).rejects.toBeInstanceOf(ServiceContractError);
  });

  it("exposes a transport failure as a retryable network error and records allowlisted telemetry", async () => {
    server.use(http.get("*/api/services", () => HttpResponse.error()));
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(servicesAdapter.list()).rejects.toBeInstanceOf(NetworkFailureError);

    expect(infoSpy).toHaveBeenCalledWith(
      "[m6-telemetry]",
      { name: "request_network_failure", resource: "services" },
    );
  });

  it("creates a new unassigned ROUTE service and validates the response through the contract", async () => {
    server.use(
      http.post("*/api/services", async ({ request }) => {
        const body = (await request.json()) as any;
        return HttpResponse.json(
          {
            id: "SVC-9999",
            serviceTypeId: body.serviceTypeId,
            serviceTypeName: "Recolección de residuos",
            title: "Recolección de residuos — Recorrido 4",
            mode: "ROUTE",
            status: "SCHEDULED",
            origin: body.origin,
            zoneIds: body.zoneIds,
            zoneNames: ["Zona Norte"],
            routeId: body.routeId,
            routeName: "Recorrido 4 Norte",
            scheduledDate: body.scheduledDate,
            windowFrom: body.timeWindow.start,
            windowTo: body.timeWindow.end,
            crewId: null,
            crewName: null,
            vehicleId: null,
            vehiclePlate: null,
          },
          { status: 201 },
        );
      }),
    );

    const created = await servicesAdapter.create({
      serviceTypeId: "st-waste-route",
      origin: "PLANNED",
      routeId: "route-4",
      zoneIds: ["zone-1"],
      scheduledDate: "2026-09-10",
      timeWindow: { start: "08:00", end: "12:00" },
      notes: "Turno mañana",
    });

    expect(created.id).toBe("SVC-9999");
    expect(created.status).toBe("SCHEDULED");
    expect(created.mode).toBe("ROUTE");
    expect(created.crewId).toBeNull();
    expect(created.vehicleId).toBeNull();
    expect(created.zoneIds).toEqual(["zone-1"]);
  });

  it("creates a new unassigned POINT service linked to a ticket", async () => {
    server.use(
      http.post("*/api/services", async ({ request }) => {
        const body = (await request.json()) as any;
        return HttpResponse.json(
          {
            id: "SVC-9998",
            serviceTypeId: body.serviceTypeId,
            serviceTypeName: "Mantenimiento de contenedores",
            title: "Reparación de contenedor CT-0442",
            mode: "POINT",
            status: "SCHEDULED",
            origin: body.origin,
            ticketId: body.ticketId,
            zoneIds: body.zoneIds,
            zoneNames: ["Zona Norte"],
            targetType: body.targetType,
            targetRef: body.targetRef,
            scheduledDate: body.scheduledDate,
            windowFrom: body.timeWindow.start,
            windowTo: body.timeWindow.end,
            crewId: null,
            crewName: null,
            vehicleId: null,
            vehiclePlate: null,
          },
          { status: 201 },
        );
      }),
    );

    const created = await servicesAdapter.create({
      serviceTypeId: "st-container-repair",
      origin: "TICKET",
      ticketId: "TK-9921",
      targetType: "CONTAINER",
      targetRef: "CT-0442",
      zoneIds: ["zone-1"],
      scheduledDate: "2026-09-11",
      timeWindow: { start: "14:00", end: "18:00" },
    });

    expect(created.id).toBe("SVC-9998");
    expect(created.mode).toBe("POINT");
    expect(created.origin).toBe("TICKET");
    expect(created.ticketId).toBe("TK-9921");
    expect(created.crewId).toBeNull();
    expect(created.zoneIds).toEqual(["zone-1"]);
  });

  it("rejects invalid create input with ServiceContractError before sending request", async () => {
    // Missing zoneIds
    await expect(
      servicesAdapter.create({
        serviceTypeId: "st-waste-route",
        origin: "PLANNED",
        zoneIds: [] as unknown as [string, ...string[]],
        scheduledDate: "2026-09-10",
        timeWindow: { start: "08:00", end: "12:00" },
      }),
    ).rejects.toBeInstanceOf(ServiceContractError);

    // Origin TICKET without ticketId
    await expect(
      servicesAdapter.create({
        serviceTypeId: "st-waste-route",
        origin: "TICKET",
        zoneIds: ["zone-1"],
        scheduledDate: "2026-09-10",
        timeWindow: { start: "08:00", end: "12:00" },
      }),
    ).rejects.toBeInstanceOf(ServiceContractError);
  });

  it("fails explicitly when the server response for create is malformed", async () => {
    server.use(
      http.post("*/api/services", () =>
        HttpResponse.json({ broken: true }, { status: 201 }),
      ),
    );

    await expect(
      servicesAdapter.create({
        serviceTypeId: "st-waste-route",
        origin: "PLANNED",
        zoneIds: ["zone-1"],
        scheduledDate: "2026-09-10",
        timeWindow: { start: "08:00", end: "12:00" },
      }),
    ).rejects.toBeInstanceOf(ServiceContractError);
  });

  it("attaches a crew and vehicle to an already-scheduled service via assignCrew", async () => {
    server.use(
      http.post("*/api/services/:serviceId/assign-crew", async ({ params, request }) => {
        const body = (await request.json()) as any;
        return HttpResponse.json({
          id: params.serviceId,
          serviceTypeId: "st-waste-route",
          serviceTypeName: "Recolección de residuos",
          title: "Recolección de residuos — Recorrido 4",
          mode: "ROUTE",
          status: "SCHEDULED",
          origin: "PLANNED",
          zoneIds: ["zone-1"],
          zoneNames: ["Zona Norte"],
          scheduledDate: "2026-09-05",
          windowFrom: "09:00",
          windowTo: "13:00",
          crewId: body.crewId,
          crewName: "Cuadrilla A · López",
          vehicleId: body.vehicleId ?? null,
          vehiclePlate: body.vehicleId ? "AF 123 CD" : null,
          history: [
            { label: "Programado", at: "2026-09-04 18:40", done: true },
            { label: "Asignado", at: "2026-09-05 10:00", done: true },
          ],
        });
      }),
    );

    const updated = await servicesAdapter.assignCrew("SVC-1043", {
      crewId: "crew-a",
      vehicleId: "veh-101",
    });

    expect(updated.id).toBe("SVC-1043");
    expect(updated.crewId).toBe("crew-a");
    expect(updated.crewName).toBe("Cuadrilla A · López");
    expect(updated.vehicleId).toBe("veh-101");
    expect(updated.vehiclePlate).toBe("AF 123 CD");
  });

  it("rejects invalid assignCrew input with ServiceContractError before sending request", async () => {
    await expect(
      servicesAdapter.assignCrew("SVC-1043", {
        crewId: "",
      }),
    ).rejects.toBeInstanceOf(ServiceContractError);
  });

  it("fails explicitly when the server response for assignCrew is malformed", async () => {
    server.use(
      http.post("*/api/services/:serviceId/assign-crew", () =>
        HttpResponse.json({ unexpected: 123 }, { status: 200 }),
      ),
    );

    await expect(
      servicesAdapter.assignCrew("SVC-1043", {
        crewId: "crew-a",
      }),
    ).rejects.toBeInstanceOf(ServiceContractError);
  });

  it("detects non-authoritative double-booking conflicts for overlapping crew and vehicle assignments", () => {
    const targetService = {
      id: "SVC-TARGET",
      serviceTypeId: "st-waste-route",
      title: "Servicio Objetivo",
      mode: "ROUTE" as const,
      status: "SCHEDULED" as const,
      origin: "PLANNED" as const,
      zoneIds: ["zone-1"],
      scheduledDate: "2026-09-05",
      windowFrom: "10:00",
      windowTo: "14:00",
    };

    const overlappingOther = {
      id: "SVC-OTHER",
      serviceTypeId: "st-waste-route",
      title: "Otro servicio en el mismo horario",
      mode: "ROUTE" as const,
      status: "SCHEDULED" as const,
      origin: "PLANNED" as const,
      zoneIds: ["zone-1"],
      scheduledDate: "2026-09-05",
      windowFrom: "11:00",
      windowTo: "13:00",
      crewId: "crew-a",
      crewName: "Cuadrilla A · López",
      vehicleId: "veh-101",
      vehiclePlate: "AF 123 CD",
    };

    const nonOverlappingDifferentDate = {
      id: "SVC-DIFF-DATE",
      serviceTypeId: "st-waste-route",
      title: "Servicio en otra fecha",
      mode: "ROUTE" as const,
      status: "SCHEDULED" as const,
      origin: "PLANNED" as const,
      zoneIds: ["zone-1"],
      scheduledDate: "2026-09-06",
      windowFrom: "10:00",
      windowTo: "14:00",
      crewId: "crew-a",
      vehicleId: "veh-101",
    };

    const cancelledServiceSameTime = {
      id: "SVC-CANCELLED",
      serviceTypeId: "st-waste-route",
      title: "Servicio cancelado",
      mode: "ROUTE" as const,
      status: "CANCELLED" as const,
      origin: "PLANNED" as const,
      zoneIds: ["zone-1"],
      scheduledDate: "2026-09-05",
      windowFrom: "10:00",
      windowTo: "14:00",
      crewId: "crew-a",
      vehicleId: "veh-101",
    };

    const allServices = [
      targetService as any,
      overlappingOther as any,
      nonOverlappingDifferentDate as any,
      cancelledServiceSameTime as any,
    ];

    // Conflict detected when crew-a and veh-101 are selected
    const conflictResult = checkAssignmentConflicts({
      service: targetService as any,
      crewId: "crew-a",
      vehicleId: "veh-101",
      allServices,
    });

    expect(conflictResult.crewConflict).not.toBeNull();
    expect(conflictResult.crewConflict?.id).toBe("SVC-OTHER");
    expect(conflictResult.vehicleConflict).not.toBeNull();
    expect(conflictResult.vehicleConflict?.id).toBe("SVC-OTHER");

    // No conflict when assigning different crew and vehicle
    const noConflictResult = checkAssignmentConflicts({
      service: targetService as any,
      crewId: "crew-b",
      vehicleId: "veh-102",
      allServices,
    });

    expect(noConflictResult.crewConflict).toBeNull();
    expect(noConflictResult.vehicleConflict).toBeNull();
  });

  it("starts a service via servicesAdapter.start and returns updated service in IN_PROGRESS", async () => {
    server.use(
      http.post("*/api/services/:serviceId/start", ({ params }) => {
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
            { label: "Asignado", at: "2026-09-05 06:30", done: true },
            { label: "En curso", at: "2026-09-05 09:15", done: true },
          ],
        });
      }),
    );

    const started = await servicesAdapter.start("SVC-1050");
    expect(started.id).toBe("SVC-1050");
    expect(started.status).toBe("IN_PROGRESS");
    expect(started.history).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "En curso", done: true })]),
    );
  });

  it("surfaces a 409 error response from the backend during start as a ServiceRequestError", async () => {
    server.use(
      http.post("*/api/services/:serviceId/start", () => {
        return HttpResponse.json(
          {
            statusCode: 409,
            message: "El tipo de servicio requiere un vehículo operativo asignado para iniciar.",
            error: "Conflict",
            timestamp: new Date().toISOString(),
            path: "/api/services/SVC-1054/start",
          },
          { status: 409 },
        );
      }),
    );

    await expect(servicesAdapter.start("SVC-1054")).rejects.toThrow(
      "El tipo de servicio requiere un vehículo operativo asignado para iniciar.",
    );
  });

  it("fails explicitly when the server response for start is malformed", async () => {
    server.use(
      http.post("*/api/services/:serviceId/start", () =>
        HttpResponse.json({ unexpected: 123 }, { status: 200 }),
      ),
    );

    await expect(servicesAdapter.start("SVC-1050")).rejects.toBeInstanceOf(
      ServiceContractError,
    );
  });

  describe("servicesAdapter suspend, resume and reschedule", () => {
    it("suspends a service via servicesAdapter.suspend with a required reason and note", async () => {
      server.use(
        http.post("*/api/services/:serviceId/suspend", async ({ params, request }) => {
          const body = (await request.json()) as any;
          return HttpResponse.json({
            id: params.serviceId,
            serviceTypeId: "st-street-cleaning",
            title: "Barrido mecánico",
            mode: "ROUTE",
            status: "SUSPENDED",
            statusReason: `Desperfecto vehicular: ${body.note}`,
            origin: "PLANNED",
            zoneIds: ["zone-3"],
            scheduledDate: "2026-09-05",
            history: [{ label: "Suspendido", at: "2026-09-05 11:00", done: true }],
          });
        }),
      );

      const suspended = await servicesAdapter.suspend("SVC-1050", {
        reason: "VEHICLE_BREAKDOWN",
        note: "El camión no arranca.",
      });

      expect(suspended.status).toBe("SUSPENDED");
      expect(suspended.statusReason).toContain("El camión no arranca.");
    });

    it("rejects invalid suspend input (missing note) with ServiceContractError before sending request", async () => {
      await expect(
        servicesAdapter.suspend("SVC-1050", {
          reason: "VEHICLE_BREAKDOWN",
          note: "",
        }),
      ).rejects.toBeInstanceOf(ServiceContractError);
    });

    it("resumes a service via servicesAdapter.resume with no body and clears the reason", async () => {
      server.use(
        http.post("*/api/services/:serviceId/resume", ({ params }) => {
          return HttpResponse.json({
            id: params.serviceId,
            serviceTypeId: "st-street-cleaning",
            title: "Barrido mecánico",
            mode: "ROUTE",
            status: "IN_PROGRESS",
            statusReason: null,
            origin: "PLANNED",
            zoneIds: ["zone-3"],
            scheduledDate: "2026-09-05",
            history: [{ label: "Reanudado", at: "2026-09-05 12:00", done: true }],
          });
        }),
      );

      const resumed = await servicesAdapter.resume("SVC-1050");
      expect(resumed.status).toBe("IN_PROGRESS");
      expect(resumed.statusReason).toBeNull();
    });

    it("reschedules a service via servicesAdapter.reschedule, moving it to RESCHEDULED with a reason", async () => {
      server.use(
        http.post("*/api/services/:serviceId/reschedule", async ({ params, request }) => {
          const body = (await request.json()) as any;
          return HttpResponse.json({
            id: params.serviceId,
            serviceTypeId: "st-street-cleaning",
            title: "Barrido mecánico",
            mode: "ROUTE",
            status: "RESCHEDULED",
            statusReason: body.reason,
            origin: "PLANNED",
            zoneIds: ["zone-3"],
            scheduledDate: "2026-09-05",
            history: [{ label: "A reprogramar", at: "2026-09-05 08:00", done: true }],
          });
        }),
      );

      const rescheduled = await servicesAdapter.reschedule("SVC-1051", {
        reason: "Alerta meteorológica",
      });

      expect(rescheduled.status).toBe("RESCHEDULED");
      expect(rescheduled.statusReason).toBe("Alerta meteorológica");
    });

    it("rejects invalid reschedule input (missing reason) with ServiceContractError before sending request", async () => {
      await expect(
        servicesAdapter.reschedule("SVC-1051", { reason: "" }),
      ).rejects.toBeInstanceOf(ServiceContractError);
    });

    it("confirms a new date/window via servicesAdapter.confirmReschedule, moving it back to SCHEDULED", async () => {
      server.use(
        http.post("*/api/services/:serviceId/confirm-reschedule", async ({ params, request }) => {
          const body = (await request.json()) as any;
          return HttpResponse.json({
            id: params.serviceId,
            serviceTypeId: "st-street-cleaning",
            title: "Barrido mecánico",
            mode: "ROUTE",
            status: "SCHEDULED",
            statusReason: null,
            origin: "PLANNED",
            zoneIds: ["zone-3"],
            scheduledDate: body.scheduledDate,
            windowFrom: body.timeWindow.start,
            windowTo: body.timeWindow.end,
            history: [{ label: "Programado", at: "2026-09-05 09:00", done: true }],
          });
        }),
      );

      const confirmed = await servicesAdapter.confirmReschedule("SVC-1053", {
        scheduledDate: "2026-09-12",
        timeWindow: { start: "09:00", end: "13:00" },
      });

      expect(confirmed.status).toBe("SCHEDULED");
      expect(confirmed.scheduledDate).toBe("2026-09-12");
      expect(confirmed.windowFrom).toBe("09:00");
    });

    it("rejects invalid confirmReschedule input with ServiceContractError before sending request", async () => {
      await expect(
        servicesAdapter.confirmReschedule("SVC-1053", {
          scheduledDate: "not-a-date",
          timeWindow: { start: "09:00", end: "13:00" },
        }),
      ).rejects.toBeInstanceOf(ServiceContractError);
    });
  });

  describe("checkServiceWindowTiming", () => {
    const testService = {
      id: "SVC-TEST",
      serviceTypeId: "st-street-cleaning",
      title: "Test Service",
      mode: "ROUTE" as const,
      status: "SCHEDULED" as const,
      origin: "PLANNED" as const,
      zoneIds: ["zone-1"],
      scheduledDate: "2026-09-05",
      windowFrom: "10:00",
      windowTo: "14:00",
    };

    it("detects when starting early (before window start on the scheduled date)", () => {
      // 09:00 on 2026-09-05 is before 10:00
      const earlyDate = new Date(2026, 8, 5, 9, 0);
      const result = checkServiceWindowTiming(testService as any, earlyDate);
      expect(result.isOutside).toBe(true);
      expect(result.timing).toBe("early");
      expect(result.message).toMatch(/Inicio fuera de ventana horaria/i);
    });

    it("detects when starting late (after window end on the scheduled date)", () => {
      // 15:00 on 2026-09-05 is after 14:00
      const lateDate = new Date(2026, 8, 5, 15, 0);
      const result = checkServiceWindowTiming(testService as any, lateDate);
      expect(result.isOutside).toBe(true);
      expect(result.timing).toBe("late");
      expect(result.message).toMatch(/Inicio fuera de ventana horaria/i);
    });

    it("detects when within the planned window", () => {
      // 12:00 on 2026-09-05 is between 10:00 and 14:00
      const withinDate = new Date(2026, 8, 5, 12, 0);
      const result = checkServiceWindowTiming(testService as any, withinDate);
      expect(result.isOutside).toBe(false);
      expect(result.timing).toBe("within");
      expect(result.message).toBeNull();
    });

    it("detects when scheduled date is in the past", () => {
      const pastDate = new Date(2026, 8, 6, 12, 0);
      const result = checkServiceWindowTiming(testService as any, pastDate);
      expect(result.isOutside).toBe(true);
      expect(result.timing).toBe("late");
    });
  });

  describe("servicesAdapter zone results and completion", () => {
    it("fetches recorded zone results via servicesAdapter.getZoneResults", async () => {
      server.use(
        http.get("*/api/services/:serviceId/zone-results", () => {
          return HttpResponse.json([
            {
              id: "ZR-1",
              serviceId: "SVC-1050",
              zoneId: "zone-3",
              status: "SERVICED",
              reason: null,
              notes: "Ok",
              attachments: [],
              recordedAt: "2026-09-05 10:00",
            },
          ]);
        }),
      );

      const results = await servicesAdapter.getZoneResults("SVC-1050");
      expect(results).toHaveLength(1);
      expect(results[0].zoneId).toBe("zone-3");
      expect(results[0].status).toBe("SERVICED");
    });

    it("records a zone result via servicesAdapter.recordZoneResult", async () => {
      server.use(
        http.post("*/api/services/:serviceId/zone-results", async ({ request }) => {
          const body = (await request.json()) as any;
          return HttpResponse.json({
            id: "ZR-NEW",
            serviceId: "SVC-1050",
            zoneId: body.zoneId,
            status: body.status,
            reason: body.reason ?? null,
            notes: body.notes ?? null,
            attachments: [],
            recordedAt: "2026-09-05 10:30",
          });
        }),
      );

      const result = await servicesAdapter.recordZoneResult("SVC-1050", {
        zoneId: "zone-3",
        status: "SERVICED",
        notes: "Completado sin problemas",
      });

      expect(result.id).toBe("ZR-NEW");
      expect(result.status).toBe("SERVICED");
      expect(result.notes).toBe("Completado sin problemas");
    });

    it("uploads evidence via servicesAdapter.uploadEvidence", async () => {
      server.use(
        http.post("*/api/evidence", () => {
          return HttpResponse.json({
            id: "att-999",
            url: "/mock/evidence/foto_calle.jpg",
            filename: "foto_calle.jpg",
            contentType: "image/jpeg",
            uploadedAt: "2026-09-05 10:35",
          });
        }),
      );

      const file = new File(["dummy"], "foto calle.jpg", { type: "image/jpeg" });
      const attachment = await servicesAdapter.uploadEvidence({
        file,
        ownerType: "ZONE_RESULT",
        ownerId: "ZR-NEW",
        idempotencyKey: "test-key-123",
      });

      expect(attachment.id).toBe("att-999");
      expect(attachment.filename).toBe("foto_calle.jpg");
    });

    it("completes a service via servicesAdapter.complete with no body and returns updated service", async () => {
      server.use(
        http.post("*/api/services/:serviceId/complete", () => {
          return HttpResponse.json({
            id: "SVC-1050",
            serviceTypeId: "st-street-cleaning",
            title: "Barrido mecánico",
            mode: "ROUTE",
            status: "COMPLETED",
            origin: "PLANNED",
            zoneIds: ["zone-3"],
            scheduledDate: "2026-09-05",
            history: [{ label: "Completado", at: "2026-09-05 11:00", done: true }],
          });
        }),
      );

      const completed = await servicesAdapter.complete("SVC-1050");
      expect(completed.id).toBe("SVC-1050");
      expect(completed.status).toBe("COMPLETED");
    });
  });
});
