import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { resetServiceFixtures, serviceFixtures } from "@/lib/services-fixtures";
import { POST } from "./route";

beforeEach(() => {
  resetServiceFixtures();
});

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

async function authenticatedCookie(scenarioId: string, mode = "mock") {
  process.env.M6_AUTH_MODE = mode;
  if (mode === "backend-development") {
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
  }
  const response = await login(
    new Request("http://localhost/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId }),
    }),
  );
  return response.headers.get("set-cookie") ?? "";
}

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
    const cookie = await authenticatedCookie("field-crew-member-route");
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
    const cookie = await authenticatedCookie("field-crew-leader-route");
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
    const cookie = await authenticatedCookie("field-crew-leader-route");
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
    const cookie = await authenticatedCookie("field-crew-leader-route");
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
    const cookie = await authenticatedCookie("field-crew-leader-route");
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
    const cookie = await authenticatedCookie("field-crew-leader-route");
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
    const cookie = await authenticatedCookie("field-crew-leader-route");
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
});
