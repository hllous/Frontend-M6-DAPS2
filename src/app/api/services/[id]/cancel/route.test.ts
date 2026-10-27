import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetServiceFixtures, serviceFixtures, updateServiceFixture } from "@/lib/services-fixtures";
import { POST } from "./route";
import { loginAs } from "@/test/session";

beforeEach(() => {
  resetServiceFixtures();
});

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});



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
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await cancelRequest("SVC-1050", cookie);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toMatch(/oficina/i);
  });

  it("returns 400 when reason is missing", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await cancelRequest("SVC-1050", cookie, {});

    expect(response.status).toBe(400);
  });

  it("returns 400 when reason is an empty string", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await cancelRequest("SVC-1050", cookie, { reason: "" });

    expect(response.status).toBe(400);
  });

  it("returns 404 if the target service does not exist", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await cancelRequest("SVC-NONEXISTENT", cookie);

    expect(response.status).toBe(404);
  });

  it("returns 409 and rejects cancellation directly from IN_PROGRESS", async () => {
    // SVC-1042 is IN_PROGRESS
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await cancelRequest("SVC-1042", cookie);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.message).toMatch(/suspenderse primero/i);

    const untouched = serviceFixtures.find((s) => s.id === "SVC-1042");
    expect(untouched?.status).toBe("IN_PROGRESS");
  });

  it("cancels a SCHEDULED service with the required reason", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
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

    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await cancelRequest("SVC-1053", cookie);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("CANCELLED");
    expect(body.scheduledDate).toBe(originalScheduledDate);
  });

  it("cancels a SUSPENDED service", async () => {
    // SVC-1044 is SUSPENDED
    updateServiceFixture("SVC-1044", {
      status: "SUSPENDED",
      statusReason: "Desperfecto vehicular",
      statusNote: "El camión no arranca.",
    });
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await cancelRequest("SVC-1044", cookie);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("CANCELLED");
    expect(body.statusReason).toBe(cancelBody.reason);
    expect(body.statusNote).toBeNull();
  });

  it("forwards the status-change DTO with JSON content type", async () => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });

    const response = await cancelRequest("SVC-1050", cookie);

    expect(response.status).toBe(200);
    const requestInit = backendFetch.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).get("content-type")).toBe("application/json");
    expect(JSON.parse(String(requestInit.body))).toEqual(cancelBody);
  });
});

it.each(["mock", "backend-development"] as const)("denies limited Office planning before forwarding (%s)", async (mode) => {
  process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
  const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({}));
  const cookie = await loginAs("office-limited-intake", { mode: mode, devJwt: ((mode) === "backend-development") ? ("header.eyJleHAiOjE4MDAwMDAwMDB9.signature") : undefined });
  backendFetch.mockClear();
  const response = await POST(new Request("http://localhost/api/services/real-service/cancel", {
    method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(cancelBody),
  }), { params: Promise.resolve({ id: "real-service" }) });
  expect(response.status).toBe(403);
  expect(backendFetch).not.toHaveBeenCalled();
});

it("names the current status in Spanish when cancellation conflicts", async () => {
  updateServiceFixture("SVC-1050", { status: "COMPLETED" });
  const cookie = await loginAs("office-duty-queue", { mode: "mock" });
  const response = await cancelRequest("SVC-1050", cookie);
  expect(response.status).toBe(409);
  expect((await response.json()).message).toBe("Solo se pueden cancelar servicios programados, a reprogramar o suspendidos (estado actual: Completado).");
});

it("rejects malformed JSON with 400", async () => {
  const cookie = await loginAs("office-duty-queue", { mode: "mock" });
  const response = await POST(new Request("http://localhost/api/services/real-service/cancel", {
    method: "POST", headers: { cookie, "content-type": "application/json" }, body: "{",
  }), { params: Promise.resolve({ id: "real-service" }) });
  expect(response.status).toBe(400);
  expect((await response.json()).message).toContain("JSON válido");
});

it.each([401, 403, 409, 503])("preserves backend error status and body (%s)", async (status) => {
  process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
  const error = { statusCode: status, message: "El backend rechazó la operación." };
  const backendFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    if (String(url).endsWith("/crews")) return Response.json({ data: [{ id: "11111111-1111-4111-8111-111111111111", name: "Cuadrilla Belgrano — Recolección" }] });
    if ((init?.method ?? "GET") === "GET") return Response.json({ crewId: "11111111-1111-4111-8111-111111111111" });
    return Response.json(error, { status });
  });
  const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });
  backendFetch.mockClear();
  const response = await POST(new Request("http://localhost/api/services/real-service/cancel", {
    method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(cancelBody),
  }), { params: Promise.resolve({ id: "real-service" }) });
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual(error);
  const forwards = backendFetch.mock.calls.filter(([, init]) => init?.method === "POST");
  expect(forwards).toHaveLength(1);
  expect(String(forwards[0][0])).toBe("https://backend.internal/services/real-service/cancel");
});
