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
});
