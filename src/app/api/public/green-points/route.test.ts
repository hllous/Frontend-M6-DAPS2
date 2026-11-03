import { afterEach, describe, expect, it, vi } from "vitest";

import { publicZoneFixtures } from "@/lib/public-service-fixtures";
import { backendEnv, loginAs } from "@/test/session";

import { GET } from "./route";

const backendPoint = {
  id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  code: "PV-001",
  name: "Punto verde del Centro",
  address: "Av. de Mayo 1200",
  lat: -34.6083,
  lng: -58.3731,
  zoneName: "Centro",
  wasteTypes: ["RECYCLABLE"],
};
const backendPage = {
  data: [{ ...backendPoint, inspectorName: "Ana", internalNote: "Revisar mañana" }],
  meta: { total: 1, page: 2, pageSize: 10, totalPages: 1 },
};

function call(query = "", headers: HeadersInit = {}) {
  return GET(new Request(`http://localhost/api/public/green-points${query}`, { headers }));
}

let restoreEnv: (() => void) | undefined;
afterEach(() => {
  restoreEnv?.();
  restoreEnv = undefined;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("GET /api/public/green-points", () => {
  it("serves active zone fixtures in mock mode, paginated and briefly cached", async () => {
    vi.stubEnv("M6_AUTH_MODE", "mock");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const centro = publicZoneFixtures[0];

    const response = await call(`?zoneId=${centro.id}&page=1&pageSize=100`);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=60");
    const body = await response.json();
    expect(body.meta).toEqual({ total: body.data.length, page: 1, pageSize: 100, totalPages: 1 });
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((point: { zoneName: string }) => point.zoneName === centro.name)).toBe(true);
    expect(body.data.some((point: { lat?: number; lng?: number }) => point.lat == null && point.lng == null)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("forwards only zoneId, page and pageSize without credentials, keeps the visitor IP, and strips private fields", async () => {
    restoreEnv = backendEnv();
    const cookie = await loginAs("office-duty-queue");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(backendPage));
    const centro = publicZoneFixtures[0];

    const response = await call(
      `?zoneId=${centro.id}&page=2&pageSize=10&wasteType=RECYCLABLE&active=true&search=centro`,
      { cookie, authorization: "Bearer staff", "x-forwarded-for": "203.0.113.7" },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=60");
    const [url, init] = fetchSpy.mock.calls[0];
    const sent = new URL(String(url));
    expect(sent.pathname).toBe("/public/green-points");
    expect([...sent.searchParams.keys()].sort()).toEqual(["page", "pageSize", "zoneId"]);
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.has("authorization")).toBe(false);
    expect(headers.has("cookie")).toBe(false);
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.7");
    const body = await response.json();
    expect(body).toEqual({
      data: [backendPoint],
      meta: backendPage.meta,
    });
  });

  it("returns the unavailable response when the backend does not match the public contract", async () => {
    restoreEnv = backendEnv();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ data: [{ id: "internal-only" }], meta: {} }));

    const response = await call();

    expect(response.status).toBe(502);
    expect((await response.json()).message).toBe("El servicio no responde en este momento.");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("passes a rate limit response through with Retry-After", async () => {
    restoreEnv = backendEnv();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ statusCode: 429 }, { status: 429, headers: { "retry-after": "42" } }),
    );

    const response = await call();

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
