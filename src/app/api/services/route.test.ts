import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { ServiceRequestError, servicesAdapter } from "@/lib/services";
import { GET, POST } from "./route";

afterEach(() => {
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
  const response = await login(new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId }),
  }));
  return response.headers.get("set-cookie") ?? "";
}

describe("authenticated services BFF route", () => {
  it("requires an active session and returns the documented error envelope", async () => {
    const response = await GET(new Request("http://localhost/api/services"));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toMatchObject({
      statusCode: 401,
      message: expect.any(String),
      error: "Unauthorized",
      timestamp: expect.any(String),
      path: "/api/services",
    });
  });

  it("returns a 401 body the services adapter parses as a typed request error, not a contract violation", async () => {
    const response = await GET(new Request("http://localhost/api/services"));
    const body = await response.json();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status: 401 }));

    const error = await servicesAdapter.list().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceRequestError);
    expect((error as ServiceRequestError).status).toBe(401);
  });

  it("serves deterministic fixtures in mock mode", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await GET(new Request("http://localhost/api/services", { headers: { cookie } }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta).toMatchObject({ total: expect.any(Number), page: 1 });
  });

  it("filters fixtures down to the named empty-results scenario", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await GET(new Request("http://localhost/api/services?search=zzz-sin-servicios", { headers: { cookie } }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
  });

  it("forwards a backend-development session through the BFF before serving real backend data", async () => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const cookie = await authenticatedCookie("office-duty-queue", "backend-development");
    const response = await GET(new Request("http://localhost/api/services?mode=ROUTE", { headers: { cookie } }));

    expect(response.status).toBe(200);
    expect(backendFetch).toHaveBeenCalledWith(
      new URL("/services?mode=ROUTE", "https://backend.internal"),
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    const requestInit = backendFetch.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).get("Authorization")).toMatch(/^Bearer /);
  });

  it("POST requires an active session", async () => {
    const response = await POST(
      new Request("http://localhost/api/services", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceTypeId: "st-waste-route",
          origin: "PLANNED",
          zoneIds: ["zone-1"],
          scheduledDate: "2026-09-10",
          timeWindow: { start: "08:00", end: "12:00" },
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("POST rejects malformed or invalid input with 400", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/services", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          serviceTypeId: "st-waste-route",
          origin: "PLANNED",
          zoneIds: [], // invalid: min 1
          scheduledDate: "invalid-date",
          timeWindow: { start: "08:00", end: "12:00" },
        }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Bad Request");
  });

  it("POST schedules a new unassigned service in mock mode and returns 201", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/services", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          serviceTypeId: "st-waste-route",
          origin: "PLANNED",
          routeId: "route-4",
          zoneIds: ["zone-1"],
          scheduledDate: "2026-09-12",
          timeWindow: { start: "09:00", end: "13:00" },
          notes: "Recolección matutina",
        }),
      }),
    );

    expect(response.status).toBe(201);
    const created = await response.json();
    expect(created.id).toMatch(/^SVC-/);
    expect(created.status).toBe("SCHEDULED");
    expect(created.mode).toBe("ROUTE");
    expect(created.crewId).toBeNull();
    expect(created.vehicleId).toBeNull();
    expect(created.zoneIds).toEqual(["zone-1"]);
    expect(created.notes).toBe("Recolección matutina");
  });

  it("POST forwards to backend in backend-development mode", async () => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "SVC-8888",
          serviceTypeId: "st-waste-route",
          serviceTypeName: "Recolección",
          title: "Recolección",
          mode: "ROUTE",
          status: "SCHEDULED",
          origin: "PLANNED",
          zoneIds: ["zone-1"],
          scheduledDate: "2026-09-12",
          windowFrom: "08:00",
          windowTo: "12:00",
          crewId: null,
          vehicleId: null,
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );
    const cookie = await authenticatedCookie("office-duty-queue", "backend-development");
    const response = await POST(
      new Request("http://localhost/api/services", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          serviceTypeId: "st-waste-route",
          origin: "PLANNED",
          zoneIds: ["zone-1"],
          scheduledDate: "2026-09-12",
          timeWindow: { start: "08:00", end: "12:00" },
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(backendFetch).toHaveBeenCalledWith(
      new URL("/services", "https://backend.internal"),
      expect.objectContaining({
        method: "POST",
        headers: expect.any(Headers),
      }),
    );
  });
});
