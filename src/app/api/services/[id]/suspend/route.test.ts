import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetServiceFixtures, serviceFixtures, updateServiceFixture } from "@/lib/services-fixtures";
import { POST } from "./route";
import { loginAs } from "@/test/session";

beforeEach(() => {
  resetServiceFixtures();
});

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});



const suspendBody = { reason: "VEHICLE_BREAKDOWN", note: "El camión no arranca." };

describe("POST /api/services/[id]/suspend BFF route", () => {
  it("requires an active session and returns 401", async () => {
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/suspend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(suspendBody),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when session lacks service:execute (Crew Member)", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1042/suspend", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(suspendBody),
      }),
      { params: Promise.resolve({ id: "SVC-1042" }) },
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toMatch(/permisos/i);
  });

  it("returns 400 when reason is missing", async () => {
    updateServiceFixture("SVC-1050", { status: "IN_PROGRESS" });
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/suspend", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ note: "El camión no arranca." }),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 if the target service does not exist", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-NONEXISTENT/suspend", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(suspendBody),
      }),
      { params: Promise.resolve({ id: "SVC-NONEXISTENT" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 403 when trying to suspend another crew's service", async () => {
    // SVC-1042 belongs to crew-a; field-crew-leader-route is crew-b
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1042/suspend", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(suspendBody),
      }),
      { params: Promise.resolve({ id: "SVC-1042" }) },
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toMatch(/cuadrilla asignada/i);
  });

  it("returns 409 when the service is not IN_PROGRESS", async () => {
    // SVC-1050 is SCHEDULED
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/suspend", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(suspendBody),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.message).toBe("Solo se pueden suspender servicios en curso (estado actual: Programado).");
  });

  it("successfully suspends an in-progress service and records the reason and note", async () => {
    updateServiceFixture("SVC-1050", { status: "IN_PROGRESS" });
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/suspend", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(suspendBody),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("SUSPENDED");
    expect(body.statusReason).toBe("Desperfecto vehicular");
    expect(body.statusNote).toBe("El camión no arranca.");
    expect(body.history).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Suspendido", done: true })]),
    );

    const updatedFixture = serviceFixtures.find((s) => s.id === "SVC-1050");
    expect(updatedFixture?.status).toBe("SUSPENDED");
  });

  it("stores a whitespace-only optional note as null", async () => {
    updateServiceFixture("SVC-1050", { status: "IN_PROGRESS" });
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/suspend", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ reason: "VEHICLE_BREAKDOWN", note: "   " }),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.statusReason).toBe("Desperfecto vehicular");
    expect(body.statusNote).toBeNull();
  });

  it("forwards the reason label and note with JSON content type in backend-development mode", async () => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      if (String(url).includes("/crews")) {
        return Response.json({ data: [{ id: "11111111-1111-4111-8111-111111111111", name: "Cuadrilla Belgrano — Recolección" }] });
      }
      if ((init?.method ?? "GET") === "GET") {
        return Response.json({ id: "SVC-1050", crewId: "11111111-1111-4111-8111-111111111111" });
      }
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    });
    const cookie = await loginAs("field-crew-leader-route", { mode: "backend-development", crew: { id: "11111111-1111-4111-8111-111111111111", name: "Cuadrilla Belgrano — Recolección", role: "LEADER" }, devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });
    backendFetch.mockClear();

    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/suspend", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(suspendBody),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(200);
    const actionCall = backendFetch.mock.calls.find(([, init]) => init?.method === "POST");
    const requestInit = actionCall?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).get("content-type")).toBe("application/json");
    expect(JSON.parse(String(requestInit.body))).toEqual({ reason: "Desperfecto vehicular", note: "El camión no arranca." });
  });

  it("omits a blank note from the backend payload and preserves a null status note", async () => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      if (String(url).includes("/crews")) {
        return Response.json({ data: [{ id: "11111111-1111-4111-8111-111111111111", name: "Cuadrilla Belgrano — Recolección" }] });
      }
      if ((init?.method ?? "GET") === "GET") {
        return Response.json({ id: "SVC-1050", crewId: "11111111-1111-4111-8111-111111111111" });
      }
      return Response.json({ id: "SVC-1050", statusNote: null });
    });
    const cookie = await loginAs("field-crew-leader-route", { mode: "backend-development", crew: { id: "11111111-1111-4111-8111-111111111111", name: "Cuadrilla Belgrano — Recolección", role: "LEADER" }, devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });
    backendFetch.mockClear();

    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/suspend", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ reason: "VEHICLE_BREAKDOWN", note: "  " }),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(200);
    const actionCall = backendFetch.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(String((actionCall?.[1] as RequestInit).body))).toEqual({ reason: "Desperfecto vehicular" });
    expect((await response.json()).statusNote).toBeNull();
  });
});

it("rejects malformed JSON with 400", async () => {
  const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
  const response = await POST(new Request("http://localhost/api/services/real-service/suspend", {
    method: "POST", headers: { cookie, "content-type": "application/json" }, body: "{",
  }), { params: Promise.resolve({ id: "real-service" }) });
  expect(response.status).toBe(400);
  expect((await response.json()).message).toContain("JSON válido");
});

it.each([403, 409, 500, 503])("preserves backend error status and body (%s)", async (status) => {
  process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
  const error = { statusCode: status, message: "El backend rechazó la operación." };
  const backendFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    if (String(url).includes("/crews")) return Response.json({ data: [{ id: "11111111-1111-4111-8111-111111111111", name: "Cuadrilla Belgrano — Recolección" }] });
    if ((init?.method ?? "GET") === "GET") return Response.json({ id: "real-service", crewId: "11111111-1111-4111-8111-111111111111" });
    return Response.json(error, { status });
  });
  const cookie = await loginAs("field-crew-leader-route", { mode: "backend-development", crew: { id: "11111111-1111-4111-8111-111111111111", name: "Cuadrilla Belgrano — Recolección", role: "LEADER" }, devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });
  backendFetch.mockClear();
  const response = await POST(new Request("http://localhost/api/services/real-service/suspend", {
    method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(suspendBody),
  }), { params: Promise.resolve({ id: "real-service" }) });
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual(error);
  const forwards = backendFetch.mock.calls.filter(([, init]) => init?.method === "POST");
  expect(forwards).toHaveLength(1);
  expect(String(forwards[0][0])).toBe("https://backend.internal/services/real-service/suspend");
});
