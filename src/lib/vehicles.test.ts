import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { NetworkFailureError } from "./authenticated-fetch";
import { vehiclesAdapter, VehicleContractError, VehicleRequestError } from "./vehicles";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("vehicles adapter", () => {
  it("normalizes a filtered paginated response", async () => {
    const page = await vehiclesAdapter.list({ active: true, vehicleType: "COMPACTOR_TRUCK" });

    expect(page.vehicles.length).toBeGreaterThan(0);
    expect(page.vehicles[0]).toMatchObject({
      plate: expect.any(String),
      vehicleType: "COMPACTOR_TRUCK",
      capacity: expect.any(Number),
      active: true,
    });
    expect(page).toMatchObject({ page: 1, pageSize: expect.any(Number), total: expect.any(Number) });
  });

  it("gets a vehicle using the documented response shape", async () => {
    const vehicle = await vehiclesAdapter.get("vehicle-1");

    expect(vehicle).toMatchObject({
      id: "vehicle-1",
      plate: expect.any(String),
      vehicleType: expect.any(String),
      capacity: expect.any(Number),
      active: expect.any(Boolean),
    });
  });

  it("creates a vehicle with only the documented creation fields", async () => {
    const vehicle = await vehiclesAdapter.create({
      plate: "AA 999 ZZ",
      vehicleType: "VAN",
      capacity: 5,
    });

    expect(vehicle).toMatchObject({ plate: "AA 999 ZZ", vehicleType: "VAN", capacity: 5, active: true });
  });

  it("updates a vehicle and can deactivate it through the logical-delete endpoint", async () => {
    const updated = await vehiclesAdapter.update("vehicle-1", {
      plate: "AA 111 BB",
      vehicleType: "COMPACTOR_TRUCK",
      capacity: 18,
      active: true,
    });
    expect(updated).toMatchObject({ id: "vehicle-1", plate: "AA 111 BB", capacity: 18, active: true });

    const deactivated = await vehiclesAdapter.remove("vehicle-1");
    expect(deactivated).toMatchObject({ id: "vehicle-1", active: false });
  });

  it("fails explicitly on malformed success payloads", async () => {
    server.use(http.get("*/api/vehicles", () => HttpResponse.json({ vehicles: "not-an-envelope" })));

    await expect(vehiclesAdapter.list()).rejects.toBeInstanceOf(VehicleContractError);
  });

  it("surfaces documented request errors and network failures", async () => {
    server.use(
      http.get("*/api/vehicles", () =>
        HttpResponse.json(
          {
            statusCode: 401,
            message: "La sesión no está activa.",
            error: "Unauthorized",
            timestamp: new Date().toISOString(),
            path: "/api/vehicles",
          },
          { status: 401 },
        ),
      ),
    );
    await expect(vehiclesAdapter.list()).rejects.toBeInstanceOf(VehicleRequestError);

    server.use(http.get("*/api/vehicles", () => HttpResponse.error()));
    await expect(vehiclesAdapter.list()).rejects.toBeInstanceOf(NetworkFailureError);
  });
});
