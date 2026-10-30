import { crewFixtures, resetCrewFixtures } from "@/lib/crew-fixtures";
import { serviceFixtures } from "@/lib/services-fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ServiceRequestError, servicesAdapter } from "@/lib/services";
import { GET, POST } from "./route";
import { AUTH_COOKIE_NAME, createSession, sealSession } from "@/lib/session";
import { loginAs } from "@/test/session";

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});



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
    // Una Response se lee una sola vez y el adapter ahora pide tambien los catalogos
    // de etiquetas, asi que cada llamada necesita su propio cuerpo.
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify(body), { status: 401 }));

    const error = await servicesAdapter.list().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceRequestError);
    expect((error as ServiceRequestError).status).toBe(401);
  });

  it("serves deterministic fixtures in mock mode", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/services", { headers: { cookie } }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta).toMatchObject({ total: expect.any(Number), page: 1 });
  });

  it("filters fixtures down to the named empty-results scenario", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
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
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });
    const response = await GET(new Request("http://localhost/api/services?mode=ROUTE", { headers: { cookie } }));

    expect(response.status).toBe(200);
    expect(backendFetch).toHaveBeenCalledWith(
      new URL("/services?mode=ROUTE", "https://backend.internal"),
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    const requestInit = backendFetch.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).get("Authorization")).toMatch(/^Bearer /);
  });

  it("tells the client through meta.dropped how many backend records it dropped for an unknown enum (#651)", async () => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const known = serviceFixtures[0];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ data: [known, { ...known, id: "svc-future", status: "FUTURE_STATUS" }], meta: { total: 9, page: 1, pageSize: 2, totalPages: 5 } }),
    );
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });
    const body = await (await GET(new Request("http://localhost/api/services", { headers: { cookie } }))).json();
    expect(body.data).toHaveLength(1);
    expect(body.meta.dropped).toBe(1);
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

  it("POST returns 403 for a Field actor (scheduling is an Office decision)", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          serviceTypeId: "st-waste-route",
          origin: "PLANNED",
          zoneIds: ["zone-1"],
          scheduledDate: "2026-09-10",
          timeWindow: { start: "08:00", end: "12:00" },
        }),
      }),
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toMatch(/oficina/i);
  });

  it("POST returns 403 for an Office actor without the scheduling capability", async () => {
    const cookie = await loginAs("office-limited-intake", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          serviceTypeId: "st-tree-pruning",
          origin: "MANUAL",
          zoneIds: ["zone-1"],
          targetType: "TREE",
          targetId: "tree-1",
          targetRef: "ARB-001",
          scheduledDate: "2026-09-10",
          timeWindow: { start: "08:00", end: "12:00" },
        }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("POST rejects malformed or invalid input with 400", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
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
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
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
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });
    const response = await POST(
      new Request("http://localhost/api/services", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          title: "Etiqueta sólo de presentación",
          serviceTypeId: "st-waste-route",
          origin: "PLANNED",
          zoneIds: ["zone-1"],
          targetRef: "Referencia visible",
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
    const requestInit = backendFetch.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).get("content-type")).toBe("application/json");
    expect(JSON.parse(String(requestInit.body))).toEqual({
      serviceTypeId: "st-waste-route",
      scheduledDate: "2026-09-12",
      origin: "PLANNED",
      zoneId: "zone-1",
      windowFrom: "08:00",
      windowTo: "12:00",
      // targetRef no existe en el DTO: sin targetId se conserva en las notas y no se descarta.
      notes: "Objetivo: Referencia visible",
    });
  });
});

function listRequest(query = "") {
  process.env.M6_AUTH_MODE = "backend-development";
  process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
  process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
  const session = createSession("office-duty-queue", {
    mode: "backend-development",
    devJwt: process.env.M6_DEV_JWT,
    backendOrigin: process.env.M6_BACKEND_ORIGIN,
  });
  return new Request(`http://localhost/api/services${query}`, { headers: { cookie: `${AUTH_COOKIE_NAME}=${sealSession(session)}` } });
}
const envelope = { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
describe("Services list backend contract", () => {
  it.each(["status", "mode", "origin"])("rejects invalid %s before forwarding", async (key) => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(envelope));
    expect((await GET(listRequest(`?${key}=INVALID`))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("forwards supported filters and excludes mock-only filters", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(envelope));
    const response = await GET(listRequest("?serviceTypeId=type-real&vehicleId=vehicle-real&ticketId=ticket-real&search=texto&timeFrom=08:00&timeTo=10:00"));
    expect(response.status).toBe(200);
    expect(String(fetch.mock.calls[0]?.[0])).toBe("https://backend.internal/services?serviceTypeId=type-real&vehicleId=vehicle-real&ticketId=ticket-real");
    expect(await response.json()).toEqual(envelope);
  });
  it("rejects malformed successful backend payloads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ data: [{ id: "real-service" }] }));
    expect((await GET(listRequest())).status).toBe(502);
  });
});

describe("Services list pagination and crew scope", () => {
  it.each([
    ["?page=-9&pageSize=-2", "?page=1&pageSize=1"],
    ["?page=99999999999&pageSize=9999", "?page=10000000&pageSize=100"],
    ["?page=2.8&pageSize=3.8", "?page=2&pageSize=3"],
    ["?page=invalid&pageSize=invalid", ""],
  ])("clamps pagination %s before forwarding", async (query, expected) => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(envelope));
    expect((await GET(listRequest(query))).status).toBe(200);
    expect(String(fetch.mock.calls[0][0])).toBe(`https://backend.internal/services${expected}`);
  });
  it("overrides an arbitrary crewId with the Field session crew", async () => {
    listRequest();
    const session = createSession("field-crew-leader-route", {
      mode: "backend-development", devJwt: process.env.M6_DEV_JWT, backendOrigin: process.env.M6_BACKEND_ORIGIN,
    });
    session.crew = { id: "crew-real", name: "Cuadrilla real" };
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(envelope));
    const response = await GET(new Request("http://localhost/api/services?crewId=crew-other", {
      headers: { cookie: `${AUTH_COOKIE_NAME}=${sealSession(session)}` },
    }));
    expect(response.status).toBe(200);
    expect(String(fetch.mock.calls[0][0])).toBe("https://backend.internal/services?crewId=crew-real");
  });
  it("returns only the Field crew services in mock mode even with another crew filter", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/services?crewId=crew-a", { headers: { cookie } }));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.length).toBeGreaterThan(0);
    expect(payload.data.every((service: { crewId: string }) => service.crewId === "crew-b")).toBe(true);
  });
});


it("exige justificación al programar con zona o especialidad distinta", async () => {
  const cookie = await loginAs("office-duty-queue", { mode: "mock" });
  const crew = crewFixtures.find((item) => item.id === "crew-a")!;
  crew.effectiveZoneId = "zone-2";
  crew.specialty = "COLLECTION";
  const input = { serviceTypeId: "st-tree-pruning", origin: "MANUAL", zoneIds: ["zone-1"], scheduledDate: "2026-09-10", timeWindow: { start: "08:00", end: "12:00" }, crewId: crew.id };
  const send = (body: object) => POST(new Request("http://localhost/api/services", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(body) }));
  try {
    expect((await send(input)).status).toBe(409);
    expect((await send({ ...input, overrideNote: "Refuerzo coordinado para la zona" })).status).toBe(201);
  } finally { resetCrewFixtures(); }
});
