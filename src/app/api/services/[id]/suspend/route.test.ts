import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { resetServiceFixtures, serviceFixtures, updateServiceFixture } from "@/lib/services-fixtures";
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
    const cookie = await authenticatedCookie("field-crew-member-route");
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

  it("returns 400 when reason or note are missing", async () => {
    updateServiceFixture("SVC-1050", { status: "IN_PROGRESS" });
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/suspend", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ reason: "VEHICLE_BREAKDOWN" }),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 if the target service does not exist", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
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
    const cookie = await authenticatedCookie("field-crew-leader-route");
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
    const cookie = await authenticatedCookie("field-crew-leader-route");
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
    expect(body.message).toMatch(/IN_PROGRESS/i);
  });

  it("successfully suspends an in-progress service and records the reason and note", async () => {
    updateServiceFixture("SVC-1050", { status: "IN_PROGRESS" });
    const cookie = await authenticatedCookie("field-crew-leader-route");
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
    expect(body.statusReason).toMatch(/desperfecto vehicular/i);
    expect(body.statusReason).toMatch(/no arranca/i);
    expect(body.history).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Suspendido", done: true })]),
    );

    const updatedFixture = serviceFixtures.find((s) => s.id === "SVC-1050");
    expect(updatedFixture?.status).toBe("SUSPENDED");
  });
});
