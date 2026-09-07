import { afterEach, describe, expect, it, vi } from "vitest";

import { treeUpdateInputSchema, treesAdapter, TreeContractError, TreeRequestError } from "./trees";

afterEach(() => vi.restoreAllMocks());

const tree = { id: "tree-101", surveyCode: "ARB-00442", zoneId: "zone-1", species: "Jacarandá", address: "Av. Mitre 1140", lat: -34.6038, lng: -58.3814, heightM: 12.4, diameterCm: 48, active: true };

describe("treesAdapter", () => {
  it("forwards the documented filters with an explicit page size", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [tree], meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 } }), { status: 200 }));
    await expect(treesAdapter.list({ active: true, zoneId: "zone-1", search: "Jacarandá", pageSize: 100 })).resolves.toMatchObject({ trees: [tree], pageSize: 100 });
    expect(fetchMock).toHaveBeenCalledWith("/api/trees?active=true&zoneId=zone-1&search=Jacarand%C3%A1&pageSize=100", expect.objectContaining({ cache: "no-store" }));
  });

  it("sends create data and keeps surveyCode out of the update DTO", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(tree), { status: 201 }));
    await treesAdapter.create({ surveyCode: "ARB-00442", zoneId: "zone-1", species: "Jacarandá", address: "Av. Mitre 1140", lat: -34.6038, lng: -58.3814, heightM: 12.4, diameterCm: 48 });
    expect(fetchMock).toHaveBeenCalledWith("/api/trees", expect.objectContaining({ method: "POST", body: JSON.stringify({ surveyCode: "ARB-00442", zoneId: "zone-1", species: "Jacarandá", address: "Av. Mitre 1140", lat: -34.6038, lng: -58.3814, heightM: 12.4, diameterCm: 48 }) }));
    expect(treeUpdateInputSchema.safeParse({ surveyCode: "ARB-99999", species: "Tipa" }).success).toBe(false);

    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ...tree, species: "Tipa" }), { status: 200 }));
    await treesAdapter.update("tree-101", { species: "Tipa" });
    expect(fetchMock).toHaveBeenLastCalledWith("/api/trees/tree-101", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ species: "Tipa" }) }));
  });

  it("accepts logical delete and rejects malformed success and error responses", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    await expect(treesAdapter.remove("tree-101")).resolves.toBeUndefined();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ invalid: true }), { status: 200 }));
    await expect(treesAdapter.list()).rejects.toBeInstanceOf(TreeContractError);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ statusCode: 409, message: "conflict", error: "Conflict", timestamp: "now", path: "/api/trees" }), { status: 409 }));
    await expect(treesAdapter.list()).rejects.toMatchObject({ constructor: TreeRequestError, status: 409 });
  });
});
