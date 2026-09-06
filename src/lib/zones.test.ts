import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { NetworkFailureError } from "./authenticated-fetch";
import { EMPTY_ZONES_QUERY } from "./zones-fixtures";
import { ZoneContractError, ZoneRequestError, zonesAdapter } from "./zones";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("zones adapter", () => {
  it("normalizes a successful paginated response into frontend-owned shapes", async () => {
    const page = await zonesAdapter.list();

    expect(page.zones.length).toBeGreaterThan(0);
    expect(page.zones[0]).toMatchObject({ code: expect.any(String), name: expect.any(String) });
    expect(page).toMatchObject({ page: 1, pageSize: expect.any(Number), total: expect.any(Number) });
  });

  it("normalizes the named empty-results scenario", async () => {
    const page = await zonesAdapter.list(EMPTY_ZONES_QUERY);

    expect(page.zones).toEqual([]);
    expect(page.total).toBe(0);
  });

  it("fails explicitly on a malformed success payload instead of returning partial data", async () => {
    server.use(http.get("*/api/zones", () => HttpResponse.json({ zones: "not-an-envelope" })));

    await expect(zonesAdapter.list()).rejects.toBeInstanceOf(ZoneContractError);
  });

  it("surfaces a documented error response as a typed request error", async () => {
    server.use(
      http.get("*/api/zones", () =>
        HttpResponse.json(
          {
            statusCode: 401,
            message: "La sesión no está activa.",
            error: "Unauthorized",
            timestamp: new Date().toISOString(),
            path: "/zones",
          },
          { status: 401 },
        ),
      ),
    );

    const error = await zonesAdapter.list().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ZoneRequestError);
    expect((error as ZoneRequestError).status).toBe(401);
  });

  it("fails explicitly when an error response does not respect the documented error contract", async () => {
    server.use(http.get("*/api/zones", () => HttpResponse.json({ oops: true }, { status: 500 })));

    await expect(zonesAdapter.list()).rejects.toBeInstanceOf(ZoneContractError);
  });

  it("exposes a transport failure as a retryable network error and records allowlisted telemetry", async () => {
    server.use(http.get("*/api/zones", () => HttpResponse.error()));
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(zonesAdapter.list()).rejects.toBeInstanceOf(NetworkFailureError);

    expect(infoSpy).toHaveBeenCalledWith(
      "[m6-telemetry]",
      { name: "request_network_failure", resource: "zones" },
    );
  });

  it("fetches a single zone by id", async () => {
    server.use(
      http.get("*/api/zones/zone-1", () =>
        HttpResponse.json({
          id: "zone-1",
          code: "Z-01",
          name: "Zona Norte",
          active: true,
          neighborhoodIds: ["barrio-1"],
        }),
      ),
    );

    const zone = await zonesAdapter.get("zone-1");
    expect(zone).toEqual({
      id: "zone-1",
      code: "Z-01",
      name: "Zona Norte",
      active: true,
      neighborhoodIds: ["barrio-1"],
    });
  });

  it("creates a zone and validates the confirmed contract shape", async () => {
    server.use(
      http.post("*/api/zones", async ({ request }) => {
        const body = (await request.json()) as { code: string; name: string };
        return HttpResponse.json(
          {
            id: "zone-new",
            code: body.code,
            name: body.name,
            active: true,
            neighborhoodIds: [],
          },
          { status: 201 },
        );
      }),
    );

    const created = await zonesAdapter.create({ code: "Z-99", name: "Zona Nueva" });
    expect(created).toMatchObject({
      id: "zone-new",
      code: "Z-99",
      name: "Zona Nueva",
      active: true,
      neighborhoodIds: [],
    });
  });

  it("updates zone name and active status without sending immutable code", async () => {
    server.use(
      http.patch("*/api/zones/zone-1", async ({ request }) => {
        const body = (await request.json()) as { name?: string; active?: boolean };
        return HttpResponse.json({
          id: "zone-1",
          code: "Z-01",
          name: body.name ?? "Zona Norte",
          active: body.active ?? true,
          neighborhoodIds: ["barrio-1"],
        });
      }),
    );

    const updated = await zonesAdapter.update("zone-1", { name: "Zona Norte Actualizada" });
    expect(updated.name).toBe("Zona Norte Actualizada");
  });

  it("deletes (deactivates) a zone logically", async () => {
    server.use(
      http.delete("*/api/zones/zone-1", () =>
        HttpResponse.json({
          id: "zone-1",
          code: "Z-01",
          name: "Zona Norte",
          active: false,
          neighborhoodIds: ["barrio-1"],
        }),
      ),
    );

    const result = await zonesAdapter.delete("zone-1");
    expect(result.active).toBe(false);
  });

  it("checks references before deactivation and returns reference counts", async () => {
    server.use(
      http.get("*/api/zones/zone-1/references", () =>
        HttpResponse.json({
          zoneId: "zone-1",
          activeRoutes: [{ id: "route-1", code: "R-01", name: "Recorrido Norte" }],
          containersCount: 3,
          treesCount: 12,
          greenSpacesCount: 2,
          totalReferences: 18,
        }),
      ),
    );

    const report = await zonesAdapter.checkReferences("zone-1");
    expect(report.totalReferences).toBe(18);
    expect(report.activeRoutes).toHaveLength(1);
    expect(report.containersCount).toBe(3);
  });

  it("surfaces 404 error as ZoneRequestError", async () => {
    server.use(
      http.get("*/api/zones/missing", () =>
        HttpResponse.json(
          {
            statusCode: 404,
            message: "Zona no encontrada",
            error: "Not Found",
            timestamp: new Date().toISOString(),
            path: "/api/zones/missing",
          },
          { status: 404 },
        ),
      ),
    );

    await expect(zonesAdapter.get("missing")).rejects.toThrow(ZoneRequestError);
  });
});
