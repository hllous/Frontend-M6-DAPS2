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

const confirmBody = {
  scheduledDate: "2026-09-10",
  timeWindow: { start: "09:00", end: "13:00" },
};

describe("POST /api/services/[id]/confirm-reschedule BFF route", () => {
  it("requires an active session and returns 401", async () => {
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1053/confirm-reschedule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(confirmBody),
      }),
      { params: Promise.resolve({ id: "SVC-1053" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 for a Field actor (reschedule is an Office decision)", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1053/confirm-reschedule", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(confirmBody),
      }),
      { params: Promise.resolve({ id: "SVC-1053" }) },
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 when the new date/window is invalid", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1053/confirm-reschedule", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ scheduledDate: "not-a-date", timeWindow: { start: "09:00", end: "13:00" } }),
      }),
      { params: Promise.resolve({ id: "SVC-1053" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 if the target service does not exist", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-NONEXISTENT/confirm-reschedule", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(confirmBody),
      }),
      { params: Promise.resolve({ id: "SVC-NONEXISTENT" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 409 when the service is not RESCHEDULED", async () => {
    // SVC-1050 is SCHEDULED
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/confirm-reschedule", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(confirmBody),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.message).toMatch(/RESCHEDULED/i);
  });

  it("moves a rescheduled service back to SCHEDULED with the new date/window, preserving zoneIds verbatim", async () => {
    // SVC-1053 is RESCHEDULED
    const before = serviceFixtures.find((s) => s.id === "SVC-1053");
    const originalZoneIds = [...(before?.zoneIds ?? [])];

    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1053/confirm-reschedule", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(confirmBody),
      }),
      { params: Promise.resolve({ id: "SVC-1053" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("SCHEDULED");
    expect(body.statusReason).toBeNull();
    expect(body.scheduledDate).toBe(confirmBody.scheduledDate);
    expect(body.windowFrom).toBe(confirmBody.timeWindow.start);
    expect(body.windowTo).toBe(confirmBody.timeWindow.end);
    expect(body.zoneIds).toEqual(originalZoneIds);
    expect(body.history).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Programado", done: true })]),
    );

    const updatedFixture = serviceFixtures.find((s) => s.id === "SVC-1053");
    expect(updatedFixture?.status).toBe("SCHEDULED");
  });
});
