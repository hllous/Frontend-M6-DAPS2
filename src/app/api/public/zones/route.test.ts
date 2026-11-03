import { afterEach, describe, expect, it, vi } from "vitest";

import { backendEnv, loginAs } from "@/test/session";

import { GET } from "./route";

const backendZones = [{ id: "7b0c4f1e-2d3a-4b5c-8d6e-0a1b2c3d4e5f", code: "Z-CENTRO", name: "Centro" }];

function call(headers: HeadersInit = {}) {
  return GET(new Request("http://localhost/api/public/zones", { headers }));
}

let restoreEnv: (() => void) | undefined;
afterEach(() => {
  restoreEnv?.();
  restoreEnv = undefined;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("GET /api/public/zones", () => {
  it("serves the zone fixtures in mock mode, without calling the backend, cached briefly", async () => {
    vi.stubEnv("M6_AUTH_MODE", "mock");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await call();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=60");
    const zones = await response.json();
    expect(zones.length).toBeGreaterThan(1);
    expect(zones[0]).toEqual({ id: expect.any(String), code: expect.any(String), name: expect.any(String) });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never sends Authorization or the session cookie to the backend and forwards the resident IP", async () => {
    restoreEnv = backendEnv();
    const cookie = await loginAs("office-duty-queue");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(backendZones));

    const response = await call({ cookie, authorization: "Bearer staff", "x-forwarded-for": "203.0.113.7, 10.0.0.1" });

    expect(response.status).toBe(200);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(new URL(String(url)).pathname).toBe("/public/zones");
    const sent = new Headers((init as RequestInit).headers);
    expect(sent.has("authorization")).toBe(false);
    expect(sent.has("cookie")).toBe(false);
    expect(sent.get("x-forwarded-for")).toBe("203.0.113.7");
    expect(await response.json()).toEqual(backendZones);
  });

  it("returns only the contract fields, dropping anything extra", async () => {
    restoreEnv = backendEnv();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([{ ...backendZones[0], supervisor: "Ana" }]));
    const [zone] = await (await call()).json();
    expect(zone).not.toHaveProperty("supervisor");
  });

  it("answers 502 when the backend body is not a zone list", async () => {
    restoreEnv = backendEnv();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ data: [] }));
    const response = await call();
    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("passes a 429 through with its Retry-After", async () => {
    restoreEnv = backendEnv();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ statusCode: 429 }, { status: 429, headers: { "retry-after": "30" } }));
    const response = await call();
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("30");
  });
});
