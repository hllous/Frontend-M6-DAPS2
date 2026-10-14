import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetServiceFixtures } from "@/lib/services-fixtures";
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

  it("returns 403 for a Field actor (assignment is an Office decision)", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1043/assign-crew", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ crewId: "crew-a" }),
      }),
      { params: Promise.resolve({ id: "SVC-1043" }) },
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toMatch(/oficina/i);
  });

  it("returns 400 if the request body is invalid JSON or missing crewId", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
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
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
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
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
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
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1051/assign-crew", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ crewId: "crew-membership", vehicleId: "vehicle-4" }),
      }),
      { params: Promise.resolve({ id: "SVC-1051" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("SVC-1051");
    expect(body.crewId).toBe("crew-membership");
    expect(body.crewName).toBe("Cuadrilla E - Membresia");
    expect(body.vehicleId).toBe("vehicle-4");
    expect(body.vehiclePlate).toBe("AD 321 DE");
  });

  it("returns 404 for crews or vehicles that are not in their catalogs, like the backend", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    for (const input of [{ crewId: "crew-zz" }, { crewId: "crew-membership", vehicleId: "veh-101" }]) {
      const response = await POST(
        new Request("http://localhost/api/services/SVC-1043/assign-crew", {
          method: "POST",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify(input),
        }),
        { params: Promise.resolve({ id: "SVC-1043" }) },
      );
      expect(response.status).toBe(404);
    }
  });

  it("returns 409 on overlap without overrideNote and accepts it with one", async () => {
    // crew-c already holds SVC-1072 (13:00-16:00) and SVC-1053 (16:00-19:00) on SVC-1043 date (14:00-17:00).
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const assign = (input: object) =>
      POST(
        new Request("http://localhost/api/services/SVC-1043/assign-crew", {
          method: "POST",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify(input),
        }),
        { params: Promise.resolve({ id: "SVC-1043" }) },
      );

    const conflict = await assign({ crewId: "crew-c" });
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).message).toMatch(/SVC-10(53|72)/);

    const tooShort = await assign({ crewId: "crew-c", overrideNote: "corta" });
    expect(tooShort.status).toBe(400);

    const accepted = await assign({ crewId: "crew-c", overrideNote: "La poda termina antes de las 16." });
    expect(accepted.status).toBe(200);
    expect((await accepted.json()).crewName).toBe("Cuadrilla C · Ibáñez");
  });

  it("forwards overrideNote to the backend in backend-development mode", async () => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });
    const input = { crewId: "d907516e-ddb7-46d4-a7d4-cd235cbb1529", vehicleId: null, overrideNote: "Coordinado con el jefe de cuadrilla." };

    const response = await POST(
      new Request("http://localhost/api/services/SVC-1043/assign-crew", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
      { params: Promise.resolve({ id: "SVC-1043" }) },
    );

    expect(response.status).toBe(200);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/services/SVC-1043/assign-crew");
    expect(JSON.parse(String((backendFetch.mock.calls[0]?.[1] as RequestInit).body))).toEqual(input);
  });

  it("successfully assigns crew without vehicle when ServiceType does not require vehicle", async () => {
    // SVC-1043 is st-tree-pruning which has requiresVehicle: false
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(
      new Request("http://localhost/api/services/SVC-1043/assign-crew", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ crewId: "crew-membership" }),
      }),
      { params: Promise.resolve({ id: "SVC-1043" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("SVC-1043");
    expect(body.crewId).toBe("crew-membership");
    expect(body.crewName).toBe("Cuadrilla E - Membresia");
    expect(body.vehicleId).toBeNull();
  });
});

it.each(["mock", "backend-development"] as const)("denies limited Office planning before forwarding (%s)", async (mode) => {
  process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
  const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({}));
  const cookie = await loginAs("office-limited-intake", { mode: mode, devJwt: ((mode) === "backend-development") ? ("header.eyJleHAiOjE4MDAwMDAwMDB9.signature") : undefined });
  backendFetch.mockClear();
  const response = await POST(new Request("http://localhost/api/services/real-service/assign-crew", {
    method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ crewId: "crew-a" }),
  }), { params: Promise.resolve({ id: "real-service" }) });
  expect(response.status).toBe(403);
  expect(backendFetch).not.toHaveBeenCalled();
});

it("rejects malformed JSON with 400", async () => {
  const cookie = await loginAs("office-duty-queue", { mode: "mock" });
  const response = await POST(new Request("http://localhost/api/services/real-service/assign-crew", {
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
  const response = await POST(new Request("http://localhost/api/services/real-service/assign-crew", {
    method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ crewId: "crew-real" }),
  }), { params: Promise.resolve({ id: "real-service" }) });
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual(error);
  const forwards = backendFetch.mock.calls.filter(([, init]) => init?.method === "POST");
  expect(forwards).toHaveLength(1);
  expect(String(forwards[0][0])).toBe("https://backend.internal/services/real-service/assign-crew");
});
