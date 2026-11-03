import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetServiceFixtures, serviceFixtures, updateServiceFixture } from "@/lib/services-fixtures";
import { POST } from "./route";
import { loginAs } from "@/test/session";

const backendOrigin = "https://backend.internal";
const backendDevJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
const backendCrew = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Cuadrilla Belgrano — Recolección",
};

function mockFieldBackend(serviceCrewId = backendCrew.id) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    if (url.pathname === "/crews") return Response.json({ data: [backendCrew] });
    if (url.pathname.startsWith("/services/") && method === "GET") {
      return Response.json({ id: url.pathname.split("/")[2], crewId: serviceCrewId });
    }
    return Response.json({ id: url.pathname, status: "IN_PROGRESS" });
  });
}

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
      statusReason: "Desperfecto vehicular",
      statusNote: "El camión no arranca.",
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
    expect(body.statusNote).toBeNull();
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
  const cookie = await loginAs("field-crew-leader-route", { mode: "backend-development", crew: { ...backendCrew, role: "LEADER" }, devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });
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

describe("POST /api/services/[id]/resume backend forward path", () => {
  it("forwards an authorized Field resume with its path, method, and bearer token", async () => {
    const serviceId = "field-service_42.3~";
    const backendFetch = mockFieldBackend();
    const cookie = await loginAs("field-crew-leader-route", {
      mode: "backend-development",
      crew: { ...backendCrew, role: "LEADER" },
      devJwt: backendDevJwt,
      backendOrigin,
    });
    backendFetch.mockClear();

    const response = await POST(
      new Request(`http://localhost/api/services/${serviceId}/resume`, {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: serviceId }) },
    );

    expect(response.status).toBe(200);
    const forwarded = backendFetch.mock.calls.find(([, init]) => init?.method === "POST");
    expect(String(forwarded?.[0])).toBe(`https://backend.internal/services/${serviceId}/resume`);
    expect(forwarded?.[1]?.method).toBe("POST");
    expect(new Headers(forwarded?.[1]?.headers).get("authorization")).toBe(`Bearer ${backendDevJwt}`);
  });

  it("checks the Field crew scope before forwarding the resume action", async () => {
    const serviceId = "field-service-out-of-scope";
    const backendFetch = mockFieldBackend("22222222-2222-4222-8222-222222222222");
    const cookie = await loginAs("field-crew-leader-route", {
      mode: "backend-development",
      crew: { ...backendCrew, role: "LEADER" },
      devJwt: backendDevJwt,
      backendOrigin,
    });
    backendFetch.mockClear();

    const response = await POST(
      new Request(`http://localhost/api/services/${serviceId}/resume`, { method: "POST", headers: { cookie } }),
      { params: Promise.resolve({ id: serviceId }) },
    );

    expect(response.status).toBe(403);
    expect(backendFetch.mock.calls.map(([url, init]) => [String(url), init?.method ?? "GET"])).toEqual([
      [`${backendOrigin}/services/${serviceId}`, "GET"],
    ]);
  });
});
