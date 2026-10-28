import { afterEach, describe, expect, it, vi } from "vitest";

import { resetZoneFixtures } from "@/lib/zones-fixtures";
import { ZoneRequestError, zonesAdapter } from "@/lib/zones";
import { GET, POST } from "./route";
import { loginAs } from "@/test/session";

afterEach(() => {
  resetZoneFixtures();
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});



describe("authenticated zones BFF route", () => {
  it("requires an active session and returns the documented error envelope", async () => {
    const response = await GET(new Request("http://localhost/api/zones"));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toMatchObject({
      statusCode: 401,
      message: expect.any(String),
      error: "Unauthorized",
      timestamp: expect.any(String),
      path: "/api/zones",
    });
  });

  it("returns a 401 body the zones adapter parses as a typed request error, not a contract violation", async () => {
    const response = await GET(new Request("http://localhost/api/zones"));
    const body = await response.json();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status: 401 }));

    const error = await zonesAdapter.list().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ZoneRequestError);
    expect((error as ZoneRequestError).status).toBe(401);
  });

  it("serves deterministic fixtures in mock mode without any capability requirement", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/zones", { headers: { cookie } }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta).toMatchObject({ total: expect.any(Number), page: 1 });
  });

  it("filters fixtures down to the named empty-results scenario", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/zones?search=zzz-sin-resultados", { headers: { cookie } }));

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
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });
    const response = await GET(new Request("http://localhost/api/zones?active=true", { headers: { cookie } }));

    expect(response.status).toBe(200);
    expect(backendFetch).toHaveBeenCalledWith(
      new URL("/zones?active=true", "https://backend.internal"),
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    const requestInit = backendFetch.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).get("Authorization")).toMatch(/^Bearer /);
  });

  it("POST requires an active session and returns 401", async () => {
    const response = await POST(
      new Request("http://localhost/api/zones", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "Z-10", name: "Zona Test" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("POST blocks Field actors with 403 Forbidden (Office-only gate)", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/zones", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ code: "Z-10", name: "Zona Test" }),
      }),
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.statusCode).toBe(403);
    expect(body.message).toContain("Oficina");
  });

  it("POST validates request body and returns 400 on invalid input", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/zones", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ code: "", name: "" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("POST rejects duplicate code with 409 Conflict", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/zones", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ code: "belgrano", name: "Zona Duplicada" }),
      }),
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.statusCode).toBe(409);
    expect(body.message).toContain("belgrano");
  });

  it("POST creates a new zone and returns 201 for Office actor", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/zones", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ code: "Z-55", name: "Zona Centro Nueva" }),
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({
      code: "Z-55",
      name: "Zona Centro Nueva",
      active: true,
      neighborhoodIds: [],
    });
  });
});


describe("GET /api/zones communeId filter", () => {
  it("forwards communeId to the backend", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature", backendOrigin: "https://backend.internal" });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 1 } }));

    await GET(new Request("http://localhost/api/zones?communeId=c0a80101-0000-4000-8000-000000000014&pageSize=100", { headers: { cookie } }));

    expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/zones?communeId=c0a80101-0000-4000-8000-000000000014&pageSize=100");
  });

  it("filters the mock fixtures by commune", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });

    const body = await (await GET(new Request("http://localhost/api/zones?communeId=c0a80101-0000-4000-8000-000000000014&pageSize=100", { headers: { cookie } }))).json();

    expect(body.data.map((zone: { code: string }) => zone.code)).toEqual(["palermo"]);
  });
});

describe("zone input validation matches the backend", () => {
  const unknownCommune = "c0a80101-0000-4000-8000-0000000000ff";

  it("POST answers 400 for a commune that does not exist, a non-UUID commune and an over-long code", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    for (const body of [
      { code: "nueva", name: "Nueva", communeId: unknownCommune },
      { code: "nueva", name: "Nueva", communeId: "comuna-14" },
      { code: "x".repeat(21), name: "Nueva" },
    ]) {
      const response = await POST(new Request("http://localhost/api/zones", { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify(body) }));
      expect(response.status, JSON.stringify(body)).toBe(400);
    }
  });

  it("ignores an active filter that is not true or false instead of reading it as false", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });

    const body = await (await GET(new Request("http://localhost/api/zones?active=maybe&pageSize=100", { headers: { cookie } }))).json();

    expect(body.meta.total).toBe(48);
  });
});
