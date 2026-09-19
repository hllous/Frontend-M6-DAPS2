import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { resetRouteFixtures, getRouteFixture } from "@/lib/routes-fixtures";
import { resetZoneFixtures } from "@/lib/zones-fixtures";
import { PUT } from "./route";

afterEach(() => {
  resetRouteFixtures();
  resetZoneFixtures();
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

async function authenticatedCookie(scenarioId: string, mode = "mock") {
  process.env.M6_AUTH_MODE = mode;
  if (mode === "backend-development") {
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
  }
  const response = await login(
    new Request("http://localhost/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId }),
    }),
  );
  return response.headers.get("set-cookie") ?? "";
}

describe("authenticated routes [id]/stops BFF route", () => {
  it("requires an active session and returns 401", async () => {
    const response = await PUT(
      new Request("http://localhost/api/routes/route-1/stops", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stops: [] }),
      }),
      { params: Promise.resolve({ id: "route-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("blocks Field actors with 403 Forbidden (Office-only gate regression test)", async () => {
    const cookie = await authenticatedCookie("field-crew-member-route");
    const response = await PUT(
      new Request("http://localhost/api/routes/route-1/stops", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ stops: [] }),
      }),
      { params: Promise.resolve({ id: "route-1" }) },
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toContain("Solo el rol de Oficina puede editar la secuencia de paradas");
  });

  it("returns 400 when body is not valid JSON", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await PUT(
      new Request("http://localhost/api/routes/route-1/stops", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: "{ bad json",
      }),
      { params: Promise.resolve({ id: "route-1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when body contains duplicate zones", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await PUT(
      new Request("http://localhost/api/routes/route-1/stops", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          stops: [
            { zoneId: "zone-1", estimatedDurationMin: 30 },
            { zoneId: "zone-1", estimatedDurationMin: 45 },
          ],
        }),
      }),
      { params: Promise.resolve({ id: "route-1" }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toContain("Una zona no puede repetirse");
  });

  it("returns 404 when route does not exist", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await PUT(
      new Request("http://localhost/api/routes/nonexistent-route/stops", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ stops: [] }),
      }),
      { params: Promise.resolve({ id: "nonexistent-route" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 when a referenced zone does not exist", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await PUT(
      new Request("http://localhost/api/routes/route-1/stops", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          stops: [{ zoneId: "zone-nonexistent", estimatedDurationMin: 30 }],
        }),
      }),
      { params: Promise.resolve({ id: "route-1" }) },
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.message).toContain("Zonas no encontradas");
  });

  it("updates stops sequence atomically and returns 200 with full replaced stops in order", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await PUT(
      new Request("http://localhost/api/routes/route-1/stops", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          stops: [
            { zoneId: "zone-2", estimatedDurationMin: 40 },
            { zoneId: "zone-1", estimatedDurationMin: 60 },
          ],
        }),
      }),
      { params: Promise.resolve({ id: "route-1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("route-1");
    expect(body.stops).toHaveLength(2);
    expect(body.stops[0]).toMatchObject({
      sequence: 1,
      zoneId: "zone-2",
      estimatedDurationMin: 40,
    });
    expect(body.stops[1]).toMatchObject({
      sequence: 2,
      zoneId: "zone-1",
      estimatedDurationMin: 60,
    });

    const updated = getRouteFixture("route-1");
    expect(updated?.stops).toHaveLength(2);
    expect(updated?.stops[0]?.zoneId).toBe("zone-2");
    expect(updated?.updatedAt).toBeDefined();
  });

  it("allows replacing sequence with an empty array", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await PUT(
      new Request("http://localhost/api/routes/route-1/stops", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ stops: [] }),
      }),
      { params: Promise.resolve({ id: "route-1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.stops).toEqual([]);

    const updated = getRouteFixture("route-1");
    expect(updated?.stops).toEqual([]);
  });

  it("proxies request to backend origin in backend-development mode", async () => {
    process.env.M6_BACKEND_ORIGIN = "http://backend-test";
    const cookie = await authenticatedCookie("office-duty-queue", "backend-development");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "route-1",
          code: "REC-001",
          name: "Recorrido Casco Histórico",
          active: true,
          stops: [],
          updatedAt: "2026-09-05T12:00:00.000Z",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const response = await PUT(
      new Request("http://localhost/api/routes/route-1/stops", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ stops: [] }),
      }),
      { params: Promise.resolve({ id: "route-1" }) },
    );

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalled();
    const [targetUrl, init] = fetchSpy.mock.calls[0] as [URL | string, RequestInit];
    expect(String(targetUrl)).toBe("http://backend-test/routes/route-1/stops");
    expect(init?.method).toBe("PUT");
  });
});
