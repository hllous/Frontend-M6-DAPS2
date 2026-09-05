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

const rescheduleBody = { reason: "Alerta meteorológica: vientos fuertes previstos." };

describe("POST /api/services/[id]/reschedule BFF route", () => {
  it("requires an active session and returns 401", async () => {
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/reschedule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(rescheduleBody),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 for a Field actor (reschedule is an Office decision)", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/reschedule", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(rescheduleBody),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toMatch(/oficina/i);
  });

  it("returns 400 when reason is missing", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/reschedule", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 if the target service does not exist", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-NONEXISTENT/reschedule", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(rescheduleBody),
      }),
      { params: Promise.resolve({ id: "SVC-NONEXISTENT" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 409 when the service is not SCHEDULED", async () => {
    // SVC-1042 is IN_PROGRESS
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1042/reschedule", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(rescheduleBody),
      }),
      { params: Promise.resolve({ id: "SVC-1042" }) },
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.message).toMatch(/SCHEDULED/i);
  });

  it("moves a scheduled service to RESCHEDULED, preserving its zoneIds snapshot verbatim", async () => {
    const before = serviceFixtures.find((s) => s.id === "SVC-1050");
    const originalZoneIds = [...(before?.zoneIds ?? [])];

    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/reschedule", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(rescheduleBody),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("RESCHEDULED");
    expect(body.statusReason).toBe(rescheduleBody.reason);
    expect(body.zoneIds).toEqual(originalZoneIds);
    expect(body.history).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "A reprogramar", done: true })]),
    );

    const updatedFixture = serviceFixtures.find((s) => s.id === "SVC-1050");
    expect(updatedFixture?.status).toBe("RESCHEDULED");
  });
});
