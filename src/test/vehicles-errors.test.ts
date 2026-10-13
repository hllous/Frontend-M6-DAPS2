import { afterEach, describe, expect, it, vi } from "vitest";

import { VehicleContractError, VehicleRequestError, vehiclesAdapter } from "@/lib/vehicles";

afterEach(() => vi.restoreAllMocks());

describe("vehicles adapter error compatibility", () => {
  it("preserves its public contract error and malformed-response telemetry for non-JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("upstream HTML", { status: 502 }));
    const telemetry = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = await vehiclesAdapter.list().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(VehicleContractError);
    expect(error).toMatchObject({ message: "La respuesta de vehículos no es JSON válido.", cause: expect.any(Error) });
    expect(telemetry).toHaveBeenCalledExactlyOnceWith("[m6-telemetry]", { name: "request_malformed_response", resource: "vehicles" });
  });

  it("preserves its public request error, status and joined backend messages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({
      statusCode: 422, message: ["Patente inválida.", "Capacidad inválida."], error: "Unprocessable Entity",
      timestamp: "2026-10-13T18:00:00.000Z", path: "/vehicles",
    }, { status: 422 }));
    const error = await vehiclesAdapter.list().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(VehicleRequestError);
    expect(error).toMatchObject({ status: 422, message: "Patente inválida. Capacidad inválida." });
  });

  it("preserves its contract error and one telemetry event for malformed error envelopes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ message: "missing fields" }, { status: 500 }));
    const telemetry = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = await vehiclesAdapter.list().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(VehicleContractError);
    expect(error).toMatchObject({ message: "La respuesta de error de vehículos no respeta el contrato documentado.", cause: expect.any(Error) });
    expect(telemetry).toHaveBeenCalledExactlyOnceWith("[m6-telemetry]", { name: "request_malformed_response", resource: "vehicles" });
  });
});
