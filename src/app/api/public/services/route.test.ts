import { afterEach, describe, expect, it, vi } from "vitest";

import { publicZoneFixtures } from "@/lib/public-service-fixtures";
import { backendEnv, loginAs } from "@/test/session";

import { GET } from "./route";

const backendService = {
  id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  serviceTypeName: "Recolección domiciliaria",
  category: "WASTE_COLLECTION",
  scheduledDate: "2026-11-02T00:00:00.000Z",
  windowFrom: "06:00",
  windowTo: "10:00",
  stage: "PROGRAMADO",
  zones: ["Centro"],
};
const backendPage = { data: [backendService], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } };

function call(query = "", headers: HeadersInit = {}) {
  return GET(new Request(`http://localhost/api/public/services${query}`, { headers }));
}

let restoreEnv: (() => void) | undefined;
afterEach(() => {
  restoreEnv?.();
  restoreEnv = undefined;
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("GET /api/public/services", () => {
  it("serves only the chosen zone's fixtures in mock mode, uncached, over the next 30 days", async () => {
    vi.stubEnv("M6_AUTH_MODE", "mock");
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-02T15:00:00Z") });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const [centro, otra] = publicZoneFixtures;

    const response = await call(`?zoneId=${centro.id}`);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const { data, meta } = await response.json();
    expect(data.length).toBeGreaterThan(0);
    expect(meta.total).toBe(data.length);
    for (const service of data) {
      expect(service.zones).toContain(centro.name);
      const day = service.scheduledDate.slice(0, 10);
      expect(day >= "2026-11-02" && day <= "2026-12-02").toBe(true);
    }
    const other = await (await call(`?zoneId=${otra.id}`)).json();
    expect(other.data.map((s: { id: string }) => s.id)).not.toEqual(data.map((s: { id: string }) => s.id));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("forwards only the allowed query keys, with no session and the resident IP", async () => {
    restoreEnv = backendEnv();
    const cookie = await loginAs("office-duty-queue");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(backendPage));
    const zoneId = publicZoneFixtures[0].id;

    const response = await call(
      `?zoneId=${zoneId}&from=2026-11-01&to=2026-11-30&page=2&pageSize=10&serviceTypeId=abc&sort=name&status=ALL`,
      { cookie, authorization: "Bearer staff", "x-forwarded-for": "203.0.113.7" },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const [url, init] = fetchSpy.mock.calls[0];
    const sent = new URL(String(url));
    expect(sent.pathname).toBe("/public/services");
    expect([...sent.searchParams.keys()].sort()).toEqual(["from", "page", "pageSize", "to", "zoneId"]);
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.has("authorization")).toBe(false);
    expect(headers.has("cookie")).toBe(false);
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.7");
    expect(await response.json()).toEqual(backendPage);
  });

  it("returns only the contract fields", async () => {
    restoreEnv = backendEnv();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ ...backendPage, data: [{ ...backendService, crewName: "Cuadrilla 4", internalReason: "rotura" }] }),
    );
    const { data } = await (await call()).json();
    expect(data[0]).not.toHaveProperty("crewName");
    expect(data[0]).not.toHaveProperty("internalReason");
  });

  it("answers 502 when the backend body does not match the contract", async () => {
    restoreEnv = backendEnv();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ data: [{ id: 1 }], meta: {} }));
    const response = await call();
    expect(response.status).toBe(502);
    expect((await response.json()).message).toBe("El servicio no responde en este momento.");
  });

  it("passes a 429 through with its Retry-After", async () => {
    restoreEnv = backendEnv();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ statusCode: 429 }, { status: 429, headers: { "retry-after": "42" } }));
    const response = await call();
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers 503 when the backend is unreachable", async () => {
    restoreEnv = backendEnv();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    expect((await call()).status).toBe(503);
  });
});
