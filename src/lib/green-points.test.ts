import { afterEach, describe, expect, it, vi } from "vitest";

import { greenPointsAdapter, GreenPointContractError, GreenPointRequestError } from "./green-points";

afterEach(() => vi.restoreAllMocks());

const greenPoint = { id: "gp-101", code: "GP-001", name: "Punto verde Plaza Mitre", zoneId: "zone-1", wasteTypes: ["GREEN", "RECYCLABLE"], address: "Av. Mitre 1200", lat: -34.6037, lng: -58.3816, active: true };

describe("greenPointsAdapter", () => {
  it("forwards every documented list filter with an explicit page size", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [greenPoint], meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 } }), { status: 200 }));
    await expect(greenPointsAdapter.list({ active: true, zoneId: "zone-1", wasteType: "RECYCLABLE", search: "Mitre", pageSize: 100 })).resolves.toMatchObject({ greenPoints: [greenPoint], pageSize: 100 });
    expect(fetchMock).toHaveBeenCalledWith("/api/green-points?active=true&zoneId=zone-1&wasteType=RECYCLABLE&search=Mitre&pageSize=100", expect.objectContaining({ cache: "no-store" }));
  });

  it("sends the create shape and fully replaces wasteTypes on update", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(greenPoint), { status: 201 }));
    await greenPointsAdapter.create({ code: "GP-001", name: "Punto verde Plaza Mitre", zoneId: "zone-1", wasteTypes: ["GREEN", "RECYCLABLE"], address: "Av. Mitre 1200", lat: -34.6037, lng: -58.3816 });
    expect(fetchMock).toHaveBeenCalledWith("/api/green-points", expect.objectContaining({ method: "POST", body: JSON.stringify({ code: "GP-001", name: "Punto verde Plaza Mitre", zoneId: "zone-1", wasteTypes: ["GREEN", "RECYCLABLE"], address: "Av. Mitre 1200", lat: -34.6037, lng: -58.3816 }) }));

    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ...greenPoint, wasteTypes: ["HOUSEHOLD"] }), { status: 200 }));
    await greenPointsAdapter.update("gp-101", { wasteTypes: ["HOUSEHOLD"] });
    expect(fetchMock).toHaveBeenLastCalledWith("/api/green-points/gp-101", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ wasteTypes: ["HOUSEHOLD"] }) }));
  });

  it("accepts the documented 204 logical delete and rejects malformed responses", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    await expect(greenPointsAdapter.remove("gp-101")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("/api/green-points/gp-101", expect.objectContaining({ method: "DELETE" }));

    fetchMock.mockResolvedValue(new Response(JSON.stringify({ invalid: true }), { status: 200 }));
    await expect(greenPointsAdapter.list()).rejects.toBeInstanceOf(GreenPointContractError);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ statusCode: 409, message: "conflict", error: "Conflict", timestamp: "now", path: "/api/green-points" }), { status: 409 }));
    await expect(greenPointsAdapter.list()).rejects.toMatchObject({ constructor: GreenPointRequestError, status: 409 });
  });
});
