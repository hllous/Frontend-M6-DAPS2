import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import {
  addZoneResultFixture,
  resetServiceFixtures,
  resetZoneResultFixtures,
  serviceFixtures,
  updateServiceFixture,
} from "@/lib/services-fixtures";
import { POST } from "./route";

beforeEach(() => {
  resetServiceFixtures();
  resetZoneResultFixtures();
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

describe("POST /api/services/[id]/complete BFF route", () => {
  it("requires an active session and returns 401", async () => {
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/complete", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 when session lacks service:execute (Crew Member)", async () => {
    const cookie = await authenticatedCookie("field-crew-member-route");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/complete", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );
    expect(response.status).toBe(403);
  });

  it("returns 404 if the target service does not exist", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-NONEXISTENT/complete", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-NONEXISTENT" }) },
    );
    expect(response.status).toBe(404);
  });

  it("returns 409 if the service is not IN_PROGRESS", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
    // SVC-1050 is SCHEDULED
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/complete", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.message).toMatch(/IN_PROGRESS/i);
  });

  it("returns 409 if not all zones have a recorded ZoneResult", async () => {
    // Set SVC-1050 to IN_PROGRESS (has zone-3 and zone-1)
    updateServiceFixture("SVC-1050", { status: "IN_PROGRESS" });
    // Record only zone-3
    addZoneResultFixture({
      id: "ZR-1",
      serviceId: "SVC-1050",
      zoneId: "zone-3",
      status: "SERVICED",
      reason: null,
      notes: null,
      attachments: [],
      recordedAt: "2026-09-05 10:00",
    });

    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/complete", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.message).toMatch(/falta registrar el resultado/i);
  });

  it("computes COMPLETED when every zone is SERVICED", async () => {
    updateServiceFixture("SVC-1050", { status: "IN_PROGRESS" });
    addZoneResultFixture({
      id: "ZR-1",
      serviceId: "SVC-1050",
      zoneId: "zone-3",
      status: "SERVICED",
      reason: null,
      notes: null,
      attachments: [],
      recordedAt: "2026-09-05 10:00",
    });
    addZoneResultFixture({
      id: "ZR-2",
      serviceId: "SVC-1050",
      zoneId: "zone-1",
      status: "SERVICED",
      reason: null,
      notes: null,
      attachments: [],
      recordedAt: "2026-09-05 11:00",
    });

    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/complete", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("SVC-1050");
    expect(body.status).toBe("COMPLETED");
    expect(body.history).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Completado", done: true })]),
    );
  });

  it("computes PARTIALLY_COMPLETED when any zone is PARTIAL or NOT_SERVICED", async () => {
    updateServiceFixture("SVC-1050", { status: "IN_PROGRESS" });
    addZoneResultFixture({
      id: "ZR-1",
      serviceId: "SVC-1050",
      zoneId: "zone-3",
      status: "SERVICED",
      reason: null,
      notes: null,
      attachments: [],
      recordedAt: "2026-09-05 10:00",
    });
    addZoneResultFixture({
      id: "ZR-2",
      serviceId: "SVC-1050",
      zoneId: "zone-1",
      status: "PARTIAL",
      reason: "WEATHER",
      notes: "Zona Norte interrumpida por lluvia torrencial",
      attachments: [],
      recordedAt: "2026-09-05 11:00",
    });

    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/complete", {
        method: "POST",
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("SVC-1050");
    expect(body.status).toBe("PARTIALLY_COMPLETED");
    expect(body.statusReason).toContain("lluvia torrencial");
    expect(body.history).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Parcial", done: true })]),
    );
  });
});
