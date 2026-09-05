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

const cancelBody = { reason: "Solicitud del cliente: ya no requiere el servicio." };

function cancelRequest(serviceId: string, cookie: string, body: unknown = cancelBody) {
  return POST(
    new Request(`http://localhost/api/services/${serviceId}/cancel`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: serviceId }) },
  );
}

describe("POST /api/services/[id]/cancel BFF route", () => {
  it("requires an active session and returns 401", async () => {
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1050/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cancelBody),
      }),
      { params: Promise.resolve({ id: "SVC-1050" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 for a Field actor (cancellation is an Office decision)", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await cancelRequest("SVC-1050", cookie);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toMatch(/oficina/i);
  });

  it("returns 400 when reason is missing", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await cancelRequest("SVC-1050", cookie, {});

    expect(response.status).toBe(400);
  });

  it("returns 400 when reason is an empty string", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await cancelRequest("SVC-1050", cookie, { reason: "" });

    expect(response.status).toBe(400);
  });

  it("returns 404 if the target service does not exist", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await cancelRequest("SVC-NONEXISTENT", cookie);

    expect(response.status).toBe(404);
  });

  it("returns 409 and rejects cancellation directly from IN_PROGRESS", async () => {
    // SVC-1042 is IN_PROGRESS
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await cancelRequest("SVC-1042", cookie);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.message).toMatch(/suspenderse primero/i);

    const untouched = serviceFixtures.find((s) => s.id === "SVC-1042");
    expect(untouched?.status).toBe("IN_PROGRESS");
  });

  it("cancels a SCHEDULED service with the required reason", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await cancelRequest("SVC-1050", cookie);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("CANCELLED");
    expect(body.statusReason).toBe(cancelBody.reason);
    expect(body.history).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Cancelado", done: true })]),
    );

    const updatedFixture = serviceFixtures.find((s) => s.id === "SVC-1050");
    expect(updatedFixture?.status).toBe("CANCELLED");
  });

  it("cancels a RESCHEDULED service directly, without inventing a replacement date", async () => {
    // SVC-1053 is RESCHEDULED
    const before = serviceFixtures.find((s) => s.id === "SVC-1053");
    const originalScheduledDate = before?.scheduledDate;

    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await cancelRequest("SVC-1053", cookie);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("CANCELLED");
    expect(body.scheduledDate).toBe(originalScheduledDate);
  });

  it("cancels a SUSPENDED service", async () => {
    // SVC-1044 is SUSPENDED
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await cancelRequest("SVC-1044", cookie);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("CANCELLED");
    expect(body.statusReason).toBe(cancelBody.reason);
  });
});
