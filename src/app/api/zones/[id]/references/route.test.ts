import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";
import { loginAs } from "@/test/session";

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});



describe("authenticated zones [id]/references BFF route", () => {
  it("counts inventory and active routes across backend pages for a real zone", async () => {
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const id = "ceec08ae-67e7-4739-9677-150f5085bb1a";
    const route = { id: "route-real", code: "R-01", name: "Norte", active: true, stops: [{ zoneId: id }] };
    const backendFetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ id }))
      .mockResolvedValueOnce(Response.json({ data: [route], meta: { totalPages: 2 } }))
      .mockResolvedValueOnce(Response.json({ data: [{ ...route, id: "route-two" }, { ...route, id: "unrelated", stops: [] }, { ...route, id: "inactive", active: false }], meta: { totalPages: 2 } }))
      .mockResolvedValueOnce(Response.json({ data: [], meta: { total: 3 } }))
      .mockResolvedValueOnce(Response.json({ data: [], meta: { total: 12 } }))
      .mockResolvedValueOnce(Response.json({ data: [], meta: { total: 2 } }));
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development" });
    const response = await GET(new Request(`http://localhost/api/zones/${id}/references`, { headers: { cookie } }), { params: { id } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ zoneId: id, activeRoutes: [{ id: "route-real", code: "R-01", name: "Norte" }, { id: "route-two", code: "R-01", name: "Norte" }], containersCount: 3, treesCount: 12, greenSpacesCount: 2, totalReferences: 19 });
    expect(backendFetch.mock.calls.map(([url]) => String(url))).toEqual([
      `https://backend.internal/zones/${id}`,
      "https://backend.internal/routes?active=true&page=1&pageSize=100",
      "https://backend.internal/routes?active=true&page=2&pageSize=100",
      `https://backend.internal/containers?zoneId=${id}&pageSize=1`,
      `https://backend.internal/trees?zoneId=${id}&pageSize=1`,
      `https://backend.internal/green-spaces?zoneId=${id}&pageSize=1`,
    ]);
    expect(backendFetch.mock.calls.every(([, init]) => (init?.method ?? "GET") === "GET")).toBe(true);
    expect(backendFetch.mock.calls.every(([, init]) =>
      new Headers(init?.headers).get("authorization") === `Bearer ${process.env.M6_DEV_JWT}`,
    )).toBe(true);
  });


  it.each([404, 503])("preserves missing records and fails closed on backend detail errors (%s)", async (status) => {
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({}, { status }));
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development" });
    const id = "ceec08ae-67e7-4739-9677-150f5085bb1a";
    const response = await GET(new Request(`http://localhost/api/zones/${id}/references`, { headers: { cookie } }), { params: { id } });
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ statusCode: status });
    expect(backendFetch).toHaveBeenCalledTimes(1);
  });

  it.each(["http", "malformed", "network"])("never returns a zero report when a sub-query fails (%s)", async (failure) => {
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const id = "ceec08ae-67e7-4739-9677-150f5085bb1a";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ id }));
    if (failure === "network") backendFetch.mockRejectedValueOnce(new Error("offline"));
    else backendFetch.mockResolvedValueOnce(Response.json(failure === "malformed" ? { data: [] } : {}, { status: failure === "http" ? 503 : 200 }));
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development" });
    const response = await GET(new Request(`http://localhost/api/zones/${id}/references`, { headers: { cookie } }), { params: { id } });
    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(await response.json()).not.toHaveProperty("totalReferences");
    expect(backendFetch).toHaveBeenCalledTimes(2);
  });


  it.each(["containers", "trees", "green-spaces"])("fails closed when the %s count fails", async (resource) => {
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const id = "ceec08ae-67e7-4739-9677-150f5085bb1a";
    const backendFetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ id }))
      .mockResolvedValueOnce(Response.json({ data: [], meta: { totalPages: 1 } }));
    for (const name of ["containers", "trees", "green-spaces"]) {
      backendFetch.mockResolvedValueOnce(Response.json({ meta: { total: 0 } }, { status: name === resource ? 503 : 200 }));
      if (name === resource) break;
    }
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development" });
    const response = await GET(new Request(`http://localhost/api/zones/${id}/references`, { headers: { cookie } }), { params: { id } });
    expect(response.status).toBe(503);
    expect(await response.json()).not.toHaveProperty("totalReferences");
  });

  it("requires an active session and returns 401", async () => {
    const response = await GET(
      new Request("http://localhost/api/zones/zone-1/references"),
      { params: Promise.resolve({ id: "zone-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when zone is not found", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await GET(
      new Request("http://localhost/api/zones/missing/references", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns reference counts for zone-1", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await GET(
      new Request("http://localhost/api/zones/zone-1/references", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "zone-1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalReferences).toBeGreaterThan(0);
    expect(body.activeRoutes.length).toBeGreaterThan(0);
    expect(body.containersCount).toBe(3);
    expect(body.treesCount).toBe(12);
    expect(body.greenSpacesCount).toBe(2);
  });
});
