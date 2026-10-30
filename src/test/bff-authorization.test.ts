import { afterEach, describe, expect, it, vi } from "vitest";

import { authorize, requireCrewScope } from "@/lib/bff-route";
import { getRequiredSession } from "@/lib/session";
import { backendEnv, loginAs } from "./session";

let restoreEnv: (() => void) | undefined;
afterEach(() => {
  restoreEnv?.();
  restoreEnv = undefined;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function requestAs(scenarioId: string) {
  return new Request("http://localhost/api/test", { headers: { cookie: await loginAs(scenarioId, scenarioId.startsWith("field") ? { crew: { id: "c1ba1a57-6f23-4871-b6b3-1d7ce231a516", name: "Cuadrilla Belgrano — Recolección", role: "LEADER" } } : {}) } });
}

describe("authorize", () => {
  it("returns the authenticated session and its authorized Office scenario", async () => {
    vi.stubEnv("M6_AUTH_MODE", "mock");
    const request = await requestAs("office-duty-queue");
    const result = authorize(request, { office: true, capability: "service:view" });

    expect(result).toMatchObject({
      session: { scenarioId: "office-duty-queue" }, scenario: { actor: { kind: "OFFICE" } },
    });
  });

  it.each([
    ["field-crew-leader-route", { office: true as const, capability: "service:view" as const }],
    ["field-crew-member-route", { capability: "service:execute" as const }],
  ])("returns 403 for the denied actor or capability of %s", async (scenarioId, options) => {
    vi.stubEnv("M6_AUTH_MODE", "mock");
    const result = authorize(await requestAs(scenarioId), options);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });

  it("returns the standard 401 envelope when no session exists", async () => {
    const result = authorize(new Request("http://localhost/api/test"), { capability: "service:view" });
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
    expect(await (result as Response).json()).toMatchObject({ statusCode: 401, path: "/api/test" });
  });
});

describe("requireCrewScope", () => {
  const serviceId = "73f53d2d-d090-4a4e-aefc-15d945e14474";
  const crewId = "c1ba1a57-6f23-4871-b6b3-1d7ce231a516";

  it("reads and returns the backend Service assigned to the real Field crew", async () => {
    restoreEnv = backendEnv();
    const backendFetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ id: serviceId, crewId, status: "SCHEDULED", zones: [] }));
    const request = await requestAs("field-crew-leader-route");
    backendFetch.mockClear();
    const service = await requireCrewScope(request, getRequiredSession(request), { serviceId });

    expect(service).toEqual({ id: serviceId, crewId, status: "SCHEDULED", zones: [] });
    expect(backendFetch).toHaveBeenCalledTimes(1);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe(`https://backend.internal/services/${serviceId}`);
    const init = backendFetch.mock.calls[0]?.[1];
    expect(init?.method ?? "GET").toBe("GET");
    expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${process.env.M6_DEV_JWT}`);
    expect(new Headers(init?.headers).has("cookie")).toBe(false);
  });

  it.each(["another-crew", null, undefined])("rejects backend Service ownership %s", async (owner) => {
    restoreEnv = backendEnv();
    const backendFetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ id: serviceId, crewId: owner }));
    const request = await requestAs("field-crew-leader-route");
    backendFetch.mockClear();
    const result = await requireCrewScope(request, getRequiredSession(request), { serviceId });
    expect((result as Response).status).toBe(403);
    expect(backendFetch).toHaveBeenCalledTimes(1);
  });

  it("does not read a Service for Office", async () => {
    restoreEnv = backendEnv();
    const backendFetch = vi.spyOn(globalThis, "fetch");
    const request = await requestAs("office-duty-queue");
    expect(await requireCrewScope(request, getRequiredSession(request), { serviceId })).toBeUndefined();
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it.each([401, 403, 404, 503])("preserves upstream %s without authorizing a write", async (status) => {
    restoreEnv = backendEnv();
    const error = { statusCode: status, message: "Servicio no disponible." };
    const backendFetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(error, { status }));
    const request = await requestAs("field-crew-leader-route");
    backendFetch.mockClear();
    const result = await requireCrewScope(request, getRequiredSession(request), { serviceId });
    expect((result as Response).status).toBe(status);
    expect(await (result as Response).json()).toEqual(error);
    expect(backendFetch).toHaveBeenCalledTimes(1);
  });

  it("returns 503 without fixture fallback when backend origin disappears", async () => {
    restoreEnv = backendEnv();
    const backendFetch = vi.spyOn(globalThis, "fetch");
    const request = await requestAs("field-crew-leader-route");
    delete process.env.M6_BACKEND_ORIGIN;
    backendFetch.mockClear();
    const result = await requireCrewScope(request, getRequiredSession(request), { serviceId });
    expect((result as Response).status).toBe(503);
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it("rejects a Field session missing its resolved backend crew before any read", async () => {
    restoreEnv = backendEnv();
    vi.spyOn(globalThis, "fetch");
    const request = await requestAs("field-crew-leader-route");
    const session = { ...getRequiredSession(request), crew: undefined };
    vi.mocked(globalThis.fetch).mockClear();
    expect((await requireCrewScope(request, session, { serviceId }) as Response).status).toBe(403);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each([{ id: serviceId, crewId: 42 }, { crewId }, null])("rejects malformed scope payload %j", async (payload) => {
    restoreEnv = backendEnv();
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(payload));
    const request = await requestAs("field-crew-leader-route");
    expect((await requireCrewScope(request, getRequiredSession(request), { serviceId }) as Response).status).toBe(502);
  });

  it("returns 502 for a non-JSON success body", async () => {
    restoreEnv = backendEnv();
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("<html>upstream</html>"));
    const request = await requestAs("field-crew-leader-route");
    expect((await requireCrewScope(request, getRequiredSession(request), { serviceId }) as Response).status).toBe(502);
  });

  it("returns 503 when the backend cannot be reached", async () => {
    restoreEnv = backendEnv();
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("fetch failed"));
    const request = await requestAs("field-crew-leader-route");
    expect((await requireCrewScope(request, getRequiredSession(request), { serviceId }) as Response).status).toBe(503);
  });

  it("uses fixture ownership in mock mode without any backend traffic", async () => {
    vi.stubEnv("M6_AUTH_MODE", "mock");
    const backendFetch = vi.spyOn(globalThis, "fetch");
    const request = await requestAs("field-crew-leader-route");
    const session = getRequiredSession(request);
    expect(await requireCrewScope(request, session, { serviceId: "SVC-1050" })).toMatchObject({ crewId: "crew-b" });
    expect((await requireCrewScope(request, session, { serviceId: "SVC-1042" }) as Response).status).toBe(403);
    expect((await requireCrewScope(request, session, { serviceId: "unknown-service" }) as Response).status).toBe(404);
    expect(backendFetch).not.toHaveBeenCalled();
  });
});
