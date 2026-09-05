import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { NetworkFailureError } from "./authenticated-fetch";
import { EMPTY_SERVICES_QUERY } from "./services-fixtures";
import { ServiceContractError, ServiceRequestError, servicesAdapter } from "./services";

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
});
