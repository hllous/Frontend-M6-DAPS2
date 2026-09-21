import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { NetworkFailureError } from "./authenticated-fetch";
import { EMPTY_ROUTES_QUERY, resetRouteFixtures } from "./routes-fixtures";
import { RouteContractError, RouteRequestError, routesAdapter } from "./routes";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetRouteFixtures();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("routes adapter", () => {
  it("normalizes a successful paginated response into frontend-owned shapes", async () => {
    const page = await routesAdapter.list();

    expect(page.routes.length).toBeGreaterThan(0);
    expect(page.routes[0]).toMatchObject({
      code: expect.any(String),
      name: expect.any(String),
      stops: expect.any(Array),
    });
    expect(page).toMatchObject({ page: 1, pageSize: expect.any(Number), total: expect.any(Number) });
  });

  it("filters routes by zoneId", async () => {
    const page = await routesAdapter.list({ zoneId: "zone-1" });

    expect(page.routes.length).toBeGreaterThan(0);
    for (const route of page.routes) {
      expect(route.stops.some((s) => s.zoneId === "zone-1")).toBe(true);
    }
  });

  it("normalizes the named empty-results scenario", async () => {
    const page = await routesAdapter.list(EMPTY_ROUTES_QUERY);

    expect(page.routes).toEqual([]);
    expect(page.total).toBe(0);
  });

  it("fails explicitly on a malformed success payload instead of returning partial data", async () => {
    server.use(http.get("*/api/routes", () => HttpResponse.json({ routes: "not-an-envelope" })));

    await expect(routesAdapter.list()).rejects.toBeInstanceOf(RouteContractError);
  });

  it("surfaces a documented error response as a typed request error", async () => {
    server.use(
      http.get("*/api/routes", () =>
        HttpResponse.json(
          {
            statusCode: 401,
            message: "La sesión no está activa.",
            error: "Unauthorized",
            timestamp: new Date().toISOString(),
            path: "/routes",
          },
          { status: 401 },
        ),
      ),
    );

    const error = await routesAdapter.list().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RouteRequestError);
    expect((error as RouteRequestError).status).toBe(401);
  });

  it("fails explicitly when an error response does not respect the documented error contract", async () => {
    server.use(http.get("*/api/routes", () => HttpResponse.json({ oops: true }, { status: 500 })));

    await expect(routesAdapter.list()).rejects.toBeInstanceOf(RouteContractError);
  });

  it("exposes a transport failure as a retryable network error and records allowlisted telemetry", async () => {
    server.use(http.get("*/api/routes", () => HttpResponse.error()));
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(routesAdapter.list()).rejects.toBeInstanceOf(NetworkFailureError);

    expect(infoSpy).toHaveBeenCalledWith(
      "[m6-telemetry]",
      { name: "request_network_failure", resource: "routes" },
    );
  });

  it("fetches a single route by id with its stops sequence", async () => {
    const route = await routesAdapter.get("route-1");

    expect(route).toMatchObject({
      id: "route-1",
      code: "REC-001",
      name: "Recorrido Casco Histórico",
      active: true,
      stops: expect.arrayContaining([
        expect.objectContaining({ sequence: 1, zoneId: "zone-1" }),
      ]),
    });
  });

  it("creates a new route born with 0 stops", async () => {
    const created = await routesAdapter.create({
      code: "REC-NEW",
      name: "Recorrido Nuevo",
    });

    expect(created).toMatchObject({
      code: "REC-NEW",
      name: "Recorrido Nuevo",
      active: true,
      stops: [],
    });
  });

  it("updates route name and active state while code is immutable", async () => {
    const updated = await routesAdapter.update("route-1", {
      name: "Recorrido Casco Histórico Modificado",
      active: false,
    });

    expect(updated).toMatchObject({
      id: "route-1",
      code: "REC-001", // Code must remain unchanged
      name: "Recorrido Casco Histórico Modificado",
      active: false,
    });
  });

  it("deactivates a route logically via delete", async () => {
    const deactivated = await routesAdapter.delete("route-1");

    expect(deactivated).toMatchObject({
      id: "route-1",
      active: false,
    });
  });

  it("checks references report for active service frequencies", async () => {
    const report = await routesAdapter.checkReferences("route-1");

    expect(report.routeId).toBe("route-1");
    expect(report.totalReferences).toBe(1);
    expect(report.activeServiceFrequencies).toEqual([
      {
        id: "freq-1",
        serviceTypeName: "Recolección Domiciliaria",
        shift: "MAÑANA",
        weekdays: ["LUNES", "MIERCOLES", "VIERNES"],
      },
    ]);
  });

  describe("setStops full-replace PUT", () => {
    it("asserts full-replace PUT semantics: whole array sent atomically in order", async () => {
      let capturedMethod = "";
      let capturedUrl = "";
      let capturedBody: unknown = null;

      server.use(
        http.put("*/api/routes/:id/stops", async ({ request, params }) => {
          capturedMethod = request.method;
          capturedUrl = request.url;
          capturedBody = await request.json();
          return HttpResponse.json({
            id: params.id,
            code: "REC-001",
            name: "Recorrido Casco Histórico",
            active: true,
            stops: [
              {
                id: "stop-new-1",
                sequence: 1,
                zoneId: "zone-2",
                zoneCode: "Z-PAL",
                zoneName: "Palermo",
                estimatedDurationMin: 35,
              },
              {
                id: "stop-new-2",
                sequence: 2,
                zoneId: "zone-1",
                zoneCode: "Z-BEL",
                zoneName: "Belgrano",
                estimatedDurationMin: 55,
              },
            ],
            updatedAt: "2026-09-05T11:00:00.000Z",
          });
        }),
      );

      const result = await routesAdapter.setStops("route-1", {
        stops: [
          { zoneId: "zone-2", estimatedDurationMin: 35 },
          { zoneId: "zone-1", estimatedDurationMin: 55 },
        ],
      });

      expect(capturedMethod).toBe("PUT");
      expect(capturedUrl).toContain("/api/routes/route-1/stops");
      expect(capturedBody).toEqual({
        stops: [
          { zoneId: "zone-2", estimatedDurationMin: 35 },
          { zoneId: "zone-1", estimatedDurationMin: 55 },
        ],
      });
      expect(result.stops).toHaveLength(2);
      expect(result.stops[0]?.zoneId).toBe("zone-2");
      expect(result.stops[1]?.zoneId).toBe("zone-1");
    });

    it("allows replacing with an empty sequence", async () => {
      let capturedBody: unknown = null;
      server.use(
        http.put("*/api/routes/:id/stops", async ({ request, params }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            id: params.id,
            code: "REC-001",
            name: "Recorrido Casco Histórico",
            active: true,
            stops: [],
            updatedAt: "2026-09-05T11:00:00.000Z",
          });
        }),
      );

      const result = await routesAdapter.setStops("route-1", { stops: [] });

      expect(capturedBody).toEqual({ stops: [] });
      expect(result.stops).toEqual([]);
    });

    it("rejects client-side before submit when duplicate zones are in the sequence", async () => {
      const call = routesAdapter.setStops("route-1", {
        stops: [
          { zoneId: "zone-1", estimatedDurationMin: 30 },
          { zoneId: "zone-1", estimatedDurationMin: 45 },
        ],
      });

      await expect(call).rejects.toThrow(/Una zona no puede repetirse en el mismo recorrido/i);
    });

    it("surfaces server 400 Bad Request error as typed RouteRequestError", async () => {
      server.use(
        http.put("*/api/routes/:id/stops", () =>
          HttpResponse.json(
            {
              statusCode: 400,
              message: "Una zona no puede repetirse en el mismo recorrido: zone-1",
              error: "Bad Request",
              timestamp: new Date().toISOString(),
              path: "/api/routes/route-1/stops",
            },
            { status: 400 },
          ),
        ),
      );

      const error = await routesAdapter
        .setStops("route-1", {
          stops: [{ zoneId: "zone-1", estimatedDurationMin: 30 }],
        })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(RouteRequestError);
      expect((error as RouteRequestError).status).toBe(400);
      expect((error as RouteRequestError).message).toContain("Una zona no puede repetirse");
    });
  });
});

// Contract test (#285): exact shape of backend GET /routes (RouteResponseDto /
// RouteStopResponseDto). Stops carry flat zoneCode/zoneName and no routeId.
describe("routes contract with the backend", () => {
  const backendListResponse = {
    data: [
      {
        id: "0b6f1c8e-2f3a-4c5d-9e7f-1a2b3c4d5e6f",
        code: "R-01",
        name: "Recorrido troncal Norte-Centro",
        active: true,
        stops: [
          {
            id: "5e1d2c3b-4a5f-4e6d-8c7b-9a0f1e2d3c4b",
            sequence: 1,
            zoneId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            zoneCode: "Z-BEL",
            zoneName: "Belgrano",
            estimatedDurationMin: 90,
          },
          {
            id: "6f2e3d4c-5b6a-4f7e-9d8c-0b1a2f3e4d5c",
            sequence: 2,
            zoneId: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
            zoneCode: "Z-PAL",
            zoneName: "Palermo",
            estimatedDurationMin: 45,
          },
        ],
        createdAt: "2026-09-02T10:00:00.000Z",
        updatedAt: "2026-09-02T10:00:00.000Z",
      },
      {
        id: "1c7a2d9f-3e4b-4d6c-8f0e-2b3c4d5e6f7a",
        code: "R-02",
        name: "Recorrido sin paradas",
        active: false,
        stops: [],
        createdAt: "2026-09-02T10:00:00.000Z",
        updatedAt: "2026-09-02T10:00:00.000Z",
      },
    ],
    meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
  };

  it("parses a GET /routes response with and without stops", async () => {
    server.use(http.get("*/api/routes", () => HttpResponse.json(backendListResponse)));

    const page = await routesAdapter.list();

    expect(page.routes).toHaveLength(2);
    expect(page.routes[0]?.stops).toEqual(backendListResponse.data[0]?.stops);
    expect(page.routes[1]?.stops).toEqual([]);
  });

  it("parses a GET /routes/:id response whose stops carry no routeId", async () => {
    const [route] = backendListResponse.data;
    server.use(http.get("*/api/routes/:id", () => HttpResponse.json(route)));

    const detail = await routesAdapter.get(route!.id);

    expect(detail.stops.map((s) => s.zoneName)).toEqual(["Belgrano", "Palermo"]);
  });

  it("rejects a stop without the flat zone name", async () => {
    const [route] = backendListResponse.data;
    const { zoneName: _omitted, ...stopWithoutName } = route!.stops[0]!;
    server.use(
      http.get("*/api/routes", () =>
        HttpResponse.json({ ...backendListResponse, data: [{ ...route, stops: [stopWithoutName] }] }),
      ),
    );

    await expect(routesAdapter.list()).rejects.toBeInstanceOf(RouteContractError);
  });
});
