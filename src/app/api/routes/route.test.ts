import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { resetRouteFixtures } from "@/lib/routes-fixtures";
import { RouteRequestError, routesAdapter } from "@/lib/routes";
import { GET, POST } from "./route";

afterEach(() => {
  resetRouteFixtures();
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

describe("authenticated routes BFF route", () => {
  it("requires an active session and returns the documented error envelope", async () => {
    const response = await GET(new Request("http://localhost/api/routes"));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toMatchObject({
      statusCode: 401,
      message: expect.any(String),
      error: "Unauthorized",
      timestamp: expect.any(String),
      path: "/api/routes",
    });
  });

  it("returns a 401 body the routes adapter parses as a typed request error, not a contract violation", async () => {
    const response = await GET(new Request("http://localhost/api/routes"));
    const body = await response.json();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status: 401 }));

    const error = await routesAdapter.list().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(RouteRequestError);
    expect((error as RouteRequestError).status).toBe(401);
  });

  it("serves deterministic fixtures in mock mode without any capability requirement", async () => {
    const cookie = await authenticatedCookie("field-crew-member-route");
    const response = await GET(new Request("http://localhost/api/routes", { headers: { cookie } }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta).toMatchObject({ total: expect.any(Number), page: 1 });
  });

  it("filters fixtures by zoneId", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await GET(new Request("http://localhost/api/routes?zoneId=zone-1", { headers: { cookie } }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBeGreaterThan(0);
    for (const route of body.data) {
      expect(route.stops.some((s: { zoneId: string }) => s.zoneId === "zone-1")).toBe(true);
    }
  });

  it("filters fixtures down to the named empty-results scenario", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await GET(new Request("http://localhost/api/routes?search=zzz-sin-resultados", { headers: { cookie } }));

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
    const response = await GET(new Request("http://localhost/api/routes?active=true", { headers: { cookie } }));

    expect(response.status).toBe(200);
    expect(backendFetch).toHaveBeenCalledWith(
      new URL("/routes?active=true", "https://backend.internal"),
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    const requestInit = backendFetch.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).get("Authorization")).toMatch(/^Bearer /);
  });

  it("POST requires an active session and returns 401", async () => {
    const response = await POST(
      new Request("http://localhost/api/routes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "REC-10", name: "Recorrido Test" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("POST blocks Field actors with 403 Forbidden (Office-only gate)", async () => {
    const cookie = await authenticatedCookie("field-crew-member-route");
    const response = await POST(
      new Request("http://localhost/api/routes", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ code: "REC-10", name: "Recorrido Test" }),
      }),
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.statusCode).toBe(403);
    expect(body.message).toContain("Oficina");
  });

  it("POST validates request body and returns 400 on invalid input", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/routes", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ code: "", name: "" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("POST rejects duplicate code with 409 Conflict", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/routes", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ code: "REC-001", name: "Recorrido Duplicado" }),
      }),
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.statusCode).toBe(409);
    expect(body.message).toContain("REC-001");
  });

  it("POST creates a new route born without stops and returns 201 for Office actor", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/routes", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ code: "REC-99", name: "Recorrido Nuevo 99" }),
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({
      code: "REC-99",
      name: "Recorrido Nuevo 99",
      active: true,
      stops: [],
    });
  });
});
