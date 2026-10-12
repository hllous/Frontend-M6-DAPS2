import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { GET } from "./route";

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

async function authenticatedCookie(scenarioId: string, mode = "mock") {
  process.env.M6_AUTH_MODE = mode;
  const response = await login(
    new Request("http://localhost/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId }),
    }),
  );
  return response.headers.get("set-cookie") ?? "";
}

describe("authenticated routes [id]/references BFF route", () => {
  it("reads active frequencies for a real route from every backend page", async () => {
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const id = "ceec08ae-67e7-4739-9677-150f5085bb1a";
    const frequency = { id: "frequency-real", serviceTypeId: "type-real", routeId: id, weekdays: [1, 3], shift: "MORNING", validFrom: "2026-01-01", validTo: null, serviceType: { name: "Recolección" } };
    const backendFetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ id }))
      .mockResolvedValueOnce(Response.json({ data: [frequency], meta: { total: 2, page: 1, pageSize: 100, totalPages: 2 } }))
      .mockResolvedValueOnce(Response.json({ data: [{ ...frequency, id: "frequency-two" }], meta: { total: 2, page: 2, pageSize: 100, totalPages: 2 } }));
    const cookie = await authenticatedCookie("office-duty-queue", "backend-development");
    const response = await GET(new Request(`http://localhost/api/routes/${id}/references`, { headers: { cookie } }), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ routeId: id, totalReferences: 2, activeServiceFrequencies: [
      { id: "frequency-real", serviceTypeName: "Recolección", weekdays: ["LUNES", "MIERCOLES"] },
      { id: "frequency-two" },
    ] });
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe(`https://backend.internal/routes/${id}`);
    const url = new URL(String(backendFetch.mock.calls[1]?.[0]));
    expect(url.pathname).toBe("/service-frequencies");
    expect(url.searchParams.get("routeId")).toBe(id);
    expect(url.searchParams.get("validOn")).toBe(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
    expect(new URL(String(backendFetch.mock.calls[2]?.[0])).searchParams.get("page")).toBe("2");
    expect(backendFetch).toHaveBeenCalledTimes(3);
    expect(backendFetch.mock.calls.every(([, init]) => (init?.method ?? "GET") === "GET")).toBe(true);
  });


  it.each([404, 503])("preserves missing records and fails closed on backend detail errors (%s)", async (status) => {
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({}, { status }));
    const cookie = await authenticatedCookie("office-duty-queue", "backend-development");
    const id = "ceec08ae-67e7-4739-9677-150f5085bb1a";
    const response = await GET(new Request(`http://localhost/api/routes/${id}/references`, { headers: { cookie } }), { params: Promise.resolve({ id }) });
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
    const cookie = await authenticatedCookie("office-duty-queue", "backend-development");
    const response = await GET(new Request(`http://localhost/api/routes/${id}/references`, { headers: { cookie } }), { params: Promise.resolve({ id }) });
    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(await response.json()).not.toHaveProperty("totalReferences");
    expect(backendFetch).toHaveBeenCalledTimes(2);
  });

  it("requires an active session and returns 401", async () => {
    const response = await GET(
      new Request("http://localhost/api/routes/route-1/references"),
      { params: Promise.resolve({ id: "route-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when route is not found", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await GET(
      new Request("http://localhost/api/routes/missing/references", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns reference frequencies for route-1", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await GET(
      new Request("http://localhost/api/routes/route-1/references", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "route-1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalReferences).toBe(1);
    expect(body.activeServiceFrequencies.length).toBe(1);
    expect(body.activeServiceFrequencies[0]).toMatchObject({
      id: "freq-1",
      serviceTypeName: "Recolección Domiciliaria",
    });
  });

  it("returns empty reference report for route-3", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await GET(
      new Request("http://localhost/api/routes/route-3/references", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "route-3" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalReferences).toBe(0);
    expect(body.activeServiceFrequencies).toEqual([]);
  });
});
