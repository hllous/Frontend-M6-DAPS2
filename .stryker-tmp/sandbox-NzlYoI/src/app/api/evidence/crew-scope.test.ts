// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { backendEnv, createSessionCookie, loginAs } from "@/test/session";
import { GET } from "./route";

/**
 * Con backend real, Campo solo lee la evidencia de lo que su cuadrilla tiene asignado: el BFF consulta al
 * backend a quién pertenece el dueño antes de pedir la evidencia. Se prueba el comportamiento HTTP.
 */
const CREW = "crew-b";

let restoreEnv: () => void;
beforeEach(() => {
  restoreEnv = backendEnv();
});
afterEach(() => {
  restoreEnv();
  vi.restoreAllMocks();
});

type Route = Record<string, unknown | (() => unknown)>;

/** Backend simulado: responde por ruta y falla el test ante una ruta que no esperaba. */
function mockBackend(routes: Route) {
  const calls: string[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = new URL(String(input));
    const key = `${url.pathname}${url.search}`;
    calls.push(key);
    if (!(key in routes)) throw new Error(`Ruta inesperada del backend: ${key}`);
    const value = routes[key];
    const resolved = typeof value === "function" ? (value as () => unknown)() : value;
    return resolved instanceof Response ? resolved : Response.json(resolved);
  });
  return calls;
}

const field = () => loginAs("field-crew-leader-route", { mode: "real-m1", backendOrigin: "https://backend.internal" });
const get = (cookie: string, query: string) => GET(new Request(`http://localhost/api/evidence?${query}`, { headers: { cookie } }));
const evidence = [{ id: "att-1", url: "https://e.example/a.jpg", filename: "a.jpg", contentType: "image/jpeg", uploadedAt: "2026-09-01T10:00:00Z" }];

describe("GET /api/evidence for a Field crew against the real backend", () => {
  it("lets the assigned crew read the evidence of its Service and returns the backend list", async () => {
    const calls = mockBackend({
      "/services/SVC-1": { id: "SVC-1", crewId: CREW },
      "/evidence?ownerType=SERVICE&ownerId=SVC-1": evidence,
    });

    const response = await get(await field(), "ownerType=SERVICE&ownerId=SVC-1");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(evidence);
    expect(calls).toEqual(["/services/SVC-1", "/evidence?ownerType=SERVICE&ownerId=SVC-1"]);
  });

  it("denies a Service that belongs to another crew and never asks the backend for its evidence", async () => {
    const calls = mockBackend({ "/services/SVC-2": { id: "SVC-2", crewId: "crew-z" } });

    const response = await get(await field(), "ownerType=SERVICE&ownerId=SVC-2");

    expect(response.status).toBe(403);
    expect((await response.json()).message).toBe("Solo la cuadrilla asignada puede subir evidencia de este registro.");
    expect(calls).toEqual(["/services/SVC-2"]);
  });

  it("denies a Service with no crew assigned yet", async () => {
    mockBackend({ "/services/SVC-3": { id: "SVC-3", crewId: null } });

    expect((await get(await field(), "ownerType=SERVICE&ownerId=SVC-3")).status).toBe(403);
  });

  it("denies a session without a crew before calling the backend", async () => {
    const calls = mockBackend({});
    const cookie = createSessionCookie("field-crew-leader-route", { mode: "real-m1", backendOrigin: "https://backend.internal" });

    const response = await get(cookie, "ownerType=SERVICE&ownerId=SVC-1");

    expect(response.status).toBe(403);
    expect(calls).toEqual([]);
  });

  it("resolves an inspection through its Service and checks the crew of that Service", async () => {
    const calls = mockBackend({
      "/environmental-inspections/INS-1": { id: "INS-1", serviceId: "SVC-9" },
      "/services/SVC-9": { id: "SVC-9", crewId: CREW },
      "/evidence?ownerType=INSPECTION&ownerId=INS-1": evidence,
    });

    const response = await get(await field(), "ownerType=INSPECTION&ownerId=INS-1");

    expect(response.status).toBe(200);
    expect(calls).toEqual(["/environmental-inspections/INS-1", "/services/SVC-9", "/evidence?ownerType=INSPECTION&ownerId=INS-1"]);
  });

  it("denies an inspection that has no Service or whose id does not match", async () => {
    mockBackend({ "/environmental-inspections/INS-2": { id: "INS-2", serviceId: null } });
    expect((await get(await field(), "ownerType=INSPECTION&ownerId=INS-2")).status).toBe(403);

    vi.restoreAllMocks();
    mockBackend({ "/environmental-inspections/INS-3": { id: "OTRA", serviceId: "SVC-9" } });
    expect((await get(await field(), "ownerType=INSPECTION&ownerId=INS-3")).status).toBe(403);
  });

  it("checks a zone result through the given Service and its zone results", async () => {
    mockBackend({
      "/services/SVC-1": { id: "SVC-1", crewId: CREW },
      "/services/SVC-1/zone-results": [{ id: "ZR-1" }, { id: "ZR-2" }],
      "/evidence?ownerType=ZONE_RESULT&ownerId=ZR-2": evidence,
    });
    const cookie = await field();

    const allowed = await get(cookie, "ownerType=ZONE_RESULT&ownerId=ZR-2&serviceId=SVC-1");
    const denied = await get(cookie, "ownerType=ZONE_RESULT&ownerId=ZR-9&serviceId=SVC-1");

    expect(allowed.status).toBe(200);
    expect(denied.status).toBe(403);
  });

  it("denies a zone result whose Service belongs to another crew", async () => {
    mockBackend({ "/services/SVC-5": { id: "SVC-5", crewId: "crew-z" } });

    expect((await get(await field(), "ownerType=ZONE_RESULT&ownerId=ZR-1&serviceId=SVC-5")).status).toBe(403);
  });

  it("finds a zone result without a serviceId by walking the crew's Services page by page", async () => {
    const calls = mockBackend({
      [`/services?crewId=${CREW}&pageSize=100&page=1`]: {
        data: [{ id: "SVC-A", crewId: CREW }, { id: "SVC-OTRO", crewId: "crew-z" }],
        meta: { totalPages: 2 },
      },
      "/services/SVC-A/zone-results": [{ id: "ZR-1" }],
      [`/services?crewId=${CREW}&pageSize=100&page=2`]: { data: [{ id: "SVC-B", crewId: CREW }], meta: { totalPages: 2 } },
      "/services/SVC-B/zone-results": [{ id: "ZR-7" }],
      "/evidence?ownerType=ZONE_RESULT&ownerId=ZR-7": evidence,
    });

    const response = await get(await field(), "ownerType=ZONE_RESULT&ownerId=ZR-7");

    expect(response.status).toBe(200);
    expect(calls).not.toContain("/services/SVC-OTRO/zone-results");
    expect(calls).toContain(`/services?crewId=${CREW}&pageSize=100&page=2`);
  });

  it("denies a zone result that is not in any of the crew's Services", async () => {
    mockBackend({
      [`/services?crewId=${CREW}&pageSize=100&page=1`]: { data: [{ id: "SVC-A", crewId: CREW }], meta: { totalPages: 1 } },
      "/services/SVC-A/zone-results": [{ id: "ZR-1" }],
    });

    expect((await get(await field(), "ownerType=ZONE_RESULT&ownerId=ZR-404")).status).toBe(403);
  });

  it("passes a backend failure while resolving the owner through to the client", async () => {
    mockBackend({
      "/services/SVC-1": () =>
        Response.json({ statusCode: 404, message: "Servicio inexistente.", error: "Not Found" }, { status: 404 }),
    });

    const response = await get(await field(), "ownerType=SERVICE&ownerId=SVC-1");

    expect(response.status).toBe(404);
    expect((await response.json()).message).toBe("Servicio inexistente.");
  });

  it("answers 502 when the owner lookup breaks the contract", async () => {
    mockBackend({ "/services/SVC-1": { inesperado: true } });

    const response = await get(await field(), "ownerType=SERVICE&ownerId=SVC-1");

    expect(response.status).toBe(502);
    expect((await response.json()).message).toBe("La respuesta del propietario de evidencia es inválida.");
  });

  it("rejects a malformed serviceId and ownerId before calling the backend", async () => {
    const calls = mockBackend({});
    const cookie = await field();

    const badService = await get(cookie, "ownerType=ZONE_RESULT&ownerId=ZR-1&serviceId=../x");
    const badOwner = await get(cookie, "ownerType=SERVICE&ownerId=a%2Fb");

    expect(badService.status).toBe(400);
    expect(badOwner.status).toBe(400);
    expect(calls).toEqual([]);
  });

  it("does not crew-check container evidence, which any Field user may read from the backend", async () => {
    const calls = mockBackend({ "/evidence?ownerType=CONTAINER&ownerId=CNT-1": evidence });

    const response = await get(await field(), "ownerType=CONTAINER&ownerId=CNT-1");

    expect(response.status).toBe(200);
    expect(calls).toEqual(["/evidence?ownerType=CONTAINER&ownerId=CNT-1"]);
  });
});
