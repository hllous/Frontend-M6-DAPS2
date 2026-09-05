import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { resetServiceFixtures } from "@/lib/services-fixtures";
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

describe("POST /api/services/[id]/assign-crew BFF route", () => {
  it("requires an active session and returns 401", async () => {
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1043/assign-crew", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ crewId: "crew-a" }),
      }),
      { params: Promise.resolve({ id: "SVC-1043" }) },
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.statusCode).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 if the request body is invalid JSON or missing crewId", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1043/assign-crew", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ crewId: "" }),
      }),
      { params: Promise.resolve({ id: "SVC-1043" }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.statusCode).toBe(400);
    expect(body.message).toMatch(/cuadrilla/i);
  });

  it("returns 404 if the target service does not exist", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-NONEXISTENT/assign-crew", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ crewId: "crew-a" }),
      }),
      { params: Promise.resolve({ id: "SVC-NONEXISTENT" }) },
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.statusCode).toBe(404);
    expect(body.message).toMatch(/no encontrado/i);
  });

  it("rejects assignment without vehicle when ServiceType requires a vehicle", async () => {
    // SVC-1051 is st-street-cleaning which has requiresVehicle: true
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1051/assign-crew", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ crewId: "crew-a" }),
      }),
      { params: Promise.resolve({ id: "SVC-1051" }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.statusCode).toBe(400);
    expect(body.message).toMatch(/requiere.*vehículo/i);
  });

  it("successfully assigns crew and vehicle to a scheduled service requiring vehicle", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1051/assign-crew", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ crewId: "crew-a", vehicleId: "veh-102" }),
      }),
      { params: Promise.resolve({ id: "SVC-1051" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("SVC-1051");
    expect(body.crewId).toBe("crew-a");
    expect(body.crewName).toBe("Cuadrilla A · López");
    expect(body.vehicleId).toBe("veh-102");
    expect(body.vehiclePlate).toBe("AE 456 FG");
  });

  it("successfully assigns crew without vehicle when ServiceType does not require vehicle", async () => {
    // SVC-1043 is st-tree-pruning which has requiresVehicle: false
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1043/assign-crew", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ crewId: "crew-c" }),
      }),
      { params: Promise.resolve({ id: "SVC-1043" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("SVC-1043");
    expect(body.crewId).toBe("crew-c");
    expect(body.crewName).toBe("Cuadrilla C · Ibáñez");
    expect(body.vehicleId).toBeNull();
  });
});
