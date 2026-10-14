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



describe("POST /api/services/[id]/resume BFF route", () => {
  it("requires an active session and returns 401", async () => {
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/resume", { method: "POST" }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when session lacks service:execute (Crew Member)", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1044/resume", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-1044" }) },
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toMatch(/permisos/i);
  });

  it("returns 404 if the target service does not exist", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-NONEXISTENT/resume", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-NONEXISTENT" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 403 when trying to resume another crew's service", async () => {
    // SVC-1044 belongs to crew-a; field-crew-leader-route is crew-b
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1044/resume", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-1044" }) },
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toMatch(/cuadrilla asignada/i);
  });

  it("returns 409 when the service is not SUSPENDED", async () => {
    // SVC-1050 is SCHEDULED
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/resume", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.message).toBe("Solo se pueden reanudar servicios suspendidos (estado actual: Programado).");
  });

  it("successfully resumes a suspended service, transitions to IN_PROGRESS and clears the reason", async () => {
    updateServiceFixture("SVC-1050", {
      status: "SUSPENDED",
      statusReason: "Desperfecto vehicular: El camión no arranca.",
    });
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/resume", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("IN_PROGRESS");
    expect(body.statusReason).toBeNull();
    expect(body.history).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Reanudado", done: true })]),
    );

    const updatedFixture = serviceFixtures.find((s) => s.id === "SVC-1050");
    expect(updatedFixture?.status).toBe("IN_PROGRESS");
    expect(updatedFixture?.statusReason).toBeNull();
  });
});

it.each([403, 409, 500, 503])("preserves backend error status and body (%s)", async (status) => {
  process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
  const error = { statusCode: status, message: "El backend rechazó la operación." };
  const backendFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    if (String(url).includes("/crews")) return Response.json({ data: [{ id: "11111111-1111-4111-8111-111111111111", name: "Cuadrilla Belgrano — Recolección" }] });
    if ((init?.method ?? "GET") === "GET") return Response.json({ id: "real-service", crewId: "11111111-1111-4111-8111-111111111111" });
    return Response.json(error, { status });
  });
  const cookie = await loginAs("field-crew-leader-route", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });
  backendFetch.mockClear();
  const response = await POST(new Request("http://localhost/api/services/real-service/resume", {
    method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(undefined),
  }), { params: Promise.resolve({ id: "real-service" }) });
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual(error);
  const forwards = backendFetch.mock.calls.filter(([, init]) => init?.method === "POST");
  expect(forwards).toHaveLength(1);
  expect(String(forwards[0][0])).toBe("https://backend.internal/services/real-service/resume");
});
