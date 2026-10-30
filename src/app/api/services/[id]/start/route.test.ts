import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetServiceFixtures, serviceFixtures } from "@/lib/services-fixtures";
import {
  resetStreetClosureRequestFixtures,
  updateStreetClosureRequestFixture,
} from "@/lib/street-closure-request-fixtures";
import { POST } from "./route";
import { createSessionCookie, loginAs } from "@/test/session";

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
  resetStreetClosureRequestFixtures();
});

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});



describe("POST /api/services/[id]/start BFF route", () => {
  it("requires an active session and returns 401", async () => {
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/start", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.statusCode).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when session lacks service:execute (Crew Member)", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/start", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.statusCode).toBe(403);
    expect(body.message).toMatch(/permisos/i);
  });

  it("returns 404 if the target service does not exist", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-NONEXISTENT/start", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-NONEXISTENT" }) },
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.statusCode).toBe(404);
    expect(body.message).toMatch(/no encontrado/i);
  });

  it("returns 409 when the service is not in SCHEDULED status", async () => {
    // SVC-1042 is already IN_PROGRESS
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1042/start", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-1042" }) },
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.statusCode).toBe(409);
    expect(body.message).toMatch(/SCHEDULED/i);
  });

  it("returns 409 when the service has no assigned crew", async () => {
    // SVC-1043 has crewId: null
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1043/start", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-1043" }) },
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.statusCode).toBe(409);
    expect(body.message).toMatch(/cuadrilla/i);
  });

  it("returns 409 when the service requires a vehicle but none is assigned", async () => {
    // SVC-1054 has serviceTypeId st-container-repair (requiresVehicle: true) and vehicleId: null
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1054/start", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-1054" }) },
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.statusCode).toBe(409);
    expect(body.message).toMatch(/requiere un vehículo/i);
  });

  it("returns 403 when the service is assigned to a different crew", async () => {
    // SVC-1072 is assigned to crew-c, whereas field-crew-leader-route is crew-b
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1072/start", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-1072" }) },
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.statusCode).toBe(403);
    expect(body.message).toMatch(/cuadrilla asignada/i);
  });

  it("successfully starts a scheduled service and transitions status to IN_PROGRESS", async () => {
    // SVC-1050 has the baseline pending request; an approved response permits execution.
    updateStreetClosureRequestFixture("SCR-1001", { status: "APPROVED" });
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/start", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("SVC-1050");
    expect(body.status).toBe("IN_PROGRESS");
    expect(body.history).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "En curso", done: true })]),
    );

    // Verify fixture update
    const updatedFixture = serviceFixtures.find((s) => s.id === "SVC-1050");
    expect(updatedFixture?.status).toBe("IN_PROGRESS");
  });

  it("blocks the entire linked ROUTE while its closure request is pending", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/start", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      message: expect.stringMatching(/corte.*pendiente|pendiente.*corte/i),
    });
    expect(serviceFixtures.find((service) => service.id === "SVC-1050")?.status).toBe("SCHEDULED");
  });

  it.each(["APPROVED", "ENDED"] as const)("allows a linked Service to start after closure status %s", async (status) => {
    updateStreetClosureRequestFixture("SCR-1001", { status });
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });

    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/start", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("IN_PROGRESS");
  });

  it("leaves a rejected closure for Office's explicit reschedule-or-cancel decision", async () => {
    updateStreetClosureRequestFixture("SCR-1001", { status: "REJECTED" });
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });

    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/start", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      message: expect.stringMatching(/rechaz|reprogramar.*cancelar|cancelar.*reprogramar/i),
    });
    expect(serviceFixtures.find((service) => service.id === "SVC-1050")?.status).toBe("SCHEDULED");
  });
});

describe("POST /api/services/[id]/start backend forward path", () => {
  it("forwards an authorized Field start with its path, method, and bearer token", async () => {
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
      new Request(`http://localhost/api/services/${serviceId}/start`, {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: serviceId }) },
    );

    expect(response.status).toBe(200);
    const forwarded = backendFetch.mock.calls.find(([, init]) => init?.method === "POST");
    expect(String(forwarded?.[0])).toBe(`https://backend.internal/services/${serviceId}/start`);
    expect(forwarded?.[1]?.method).toBe("POST");
    expect(new Headers(forwarded?.[1]?.headers).get("authorization")).toBe(`Bearer ${backendDevJwt}`);
  });

  it("checks the Field crew scope before forwarding the start action", async () => {
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
      new Request(`http://localhost/api/services/${serviceId}/start`, { method: "POST", headers: { cookie } }),
      { params: Promise.resolve({ id: serviceId }) },
    );

    expect(response.status).toBe(403);
    expect(backendFetch.mock.calls.map(([url, init]) => [String(url), init?.method ?? "GET"])).toEqual([
      [`${backendOrigin}/services/${serviceId}`, "GET"],
    ]);
  });

  it("denies a Field member without service:execute before making a backend request", async () => {
    const backendFetch = mockFieldBackend();
    const cookie = await loginAs("field-crew-member-route", {
      mode: "backend-development",
      crew: { ...backendCrew, role: "MEMBER" },
      devJwt: backendDevJwt,
      backendOrigin,
    });
    backendFetch.mockClear();

    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/start", { method: "POST", headers: { cookie } }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(403);
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it("fails closed when backend mode has no backend origin", async () => {
    const cookie = createSessionCookie("field-crew-leader-route", {
      mode: "backend-development",
      crew: backendCrew,
      devJwt: backendDevJwt,
      backendOrigin,
    });
    delete process.env.M6_BACKEND_ORIGIN;
    const backendFetch = vi.spyOn(globalThis, "fetch");

    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/start", { method: "POST", headers: { cookie } }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(503);
    expect(backendFetch).not.toHaveBeenCalled();
  });
});
