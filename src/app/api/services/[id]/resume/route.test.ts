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

describe("POST /api/services/[id]/resume BFF route", () => {
  it("requires an active session and returns 401", async () => {
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/resume", { method: "POST" }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when session lacks service:execute (Crew Member)", async () => {
    const cookie = await authenticatedCookie("field-crew-member-route");
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
    const cookie = await authenticatedCookie("field-crew-leader-route");
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
    const cookie = await authenticatedCookie("field-crew-leader-route");
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
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/resume", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.message).toMatch(/SUSPENDED/i);
  });

  it("successfully resumes a suspended service, transitions to IN_PROGRESS and clears the reason", async () => {
    updateServiceFixture("SVC-1050", {
      status: "SUSPENDED",
      statusReason: "Desperfecto vehicular: El camión no arranca.",
    });
    const cookie = await authenticatedCookie("field-crew-leader-route");
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
