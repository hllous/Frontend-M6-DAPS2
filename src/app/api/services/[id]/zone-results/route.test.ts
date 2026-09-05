import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { resetServiceFixtures, resetZoneResultFixtures, serviceFixtures, updateServiceFixture } from "@/lib/services-fixtures";
import { GET, POST } from "./route";

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

describe("zone-results BFF route", () => {
  it("GET requires an active session and returns 401", async () => {
    const response = await GET(
      new Request("http://localhost/api/services/SVC-1050/zone-results"),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );
    expect(response.status).toBe(401);
  });

  it("POST requires an active session and returns 401", async () => {
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/zone-results", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ zoneId: "zone-3", status: "SERVICED" }),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );
    expect(response.status).toBe(401);
  });

  it("POST returns 403 when session lacks service:execute (Crew Member)", async () => {
    const cookie = await authenticatedCookie("field-crew-member-route");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/zone-results", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ zoneId: "zone-3", status: "SERVICED" }),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toMatch(/permisos/i);
  });

  it("POST returns 404 if the target service does not exist", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-NONEXISTENT/zone-results", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ zoneId: "zone-3", status: "SERVICED" }),
      }),
      { params: Promise.resolve({ id: "SVC-NONEXISTENT" }) },
    );
    expect(response.status).toBe(404);
  });

  it("POST returns 403 when trying to record results for another crew's service", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
    // SVC-1042 belongs to crew-a
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1042/zone-results", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ zoneId: "zone-1", status: "SERVICED" }),
      }),
      { params: Promise.resolve({ id: "SVC-1042" }) },
    );
    expect(response.status).toBe(403);
  });

  it("POST returns 409 if service is not IN_PROGRESS", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
    // SVC-1050 is in SCHEDULED
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/zone-results", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ zoneId: "zone-3", status: "SERVICED" }),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.message).toMatch(/IN_PROGRESS/i);
  });

  it("POST returns 400 if zoneId is not in service.zoneIds", async () => {
    updateServiceFixture("SVC-1050", { status: "IN_PROGRESS" });
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/zone-results", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ zoneId: "zone-999", status: "SERVICED" }),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toMatch(/no pertenece/i);
  });

  it("POST returns 400 when status is PARTIAL or NOT_SERVICED but reason is missing", async () => {
    updateServiceFixture("SVC-1050", { status: "IN_PROGRESS" });
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/zone-results", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ zoneId: "zone-3", status: "PARTIAL" }),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toMatch(/motivo es obligatorio/i);
  });

  it("POST returns 400 when status is SERVICED but a reason is provided", async () => {
    updateServiceFixture("SVC-1050", { status: "IN_PROGRESS" });
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/zone-results", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ zoneId: "zone-3", status: "SERVICED", reason: "WEATHER" }),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toMatch(/no debe especificarse motivo/i);
  });

  it("POST successfully records SERVICED result and returns 201", async () => {
    updateServiceFixture("SVC-1050", { status: "IN_PROGRESS" });
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/zone-results", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ zoneId: "zone-3", status: "SERVICED", notes: "Todo despejado" }),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.serviceId).toBe("SVC-1050");
    expect(body.zoneId).toBe("zone-3");
    expect(body.status).toBe("SERVICED");
    expect(body.reason).toBeNull();
    expect(body.notes).toBe("Todo despejado");
  });

  it("POST rejects duplicate recording for the same zone with 409", async () => {
    updateServiceFixture("SVC-1050", { status: "IN_PROGRESS" });
    const cookie = await authenticatedCookie("field-crew-leader-route");
    await POST(
      new Request("http://localhost/api/services/SVC-1050/zone-results", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ zoneId: "zone-3", status: "SERVICED" }),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    const dupResponse = await POST(
      new Request("http://localhost/api/services/SVC-1050/zone-results", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ zoneId: "zone-3", status: "PARTIAL", reason: "WEATHER" }),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );
    expect(dupResponse.status).toBe(409);
    const body = await dupResponse.json();
    expect(body.message).toMatch(/ya fue registrado/i);
  });

  it("GET returns all recorded zone results for the service", async () => {
    updateServiceFixture("SVC-1050", { status: "IN_PROGRESS" });
    const cookie = await authenticatedCookie("field-crew-leader-route");
    await POST(
      new Request("http://localhost/api/services/SVC-1050/zone-results", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ zoneId: "zone-3", status: "SERVICED" }),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    const getResponse = await GET(
      new Request("http://localhost/api/services/SVC-1050/zone-results", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );
    expect(getResponse.status).toBe(200);
    const results = await getResponse.json();
    expect(results).toHaveLength(1);
    expect(results[0].zoneId).toBe("zone-3");
  });
});
