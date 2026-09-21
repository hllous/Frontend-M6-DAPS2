import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ServiceTypeContractError,
  ServiceTypeNotFoundError,
  ServiceTypeRequestError,
  resolveServiceType,
  serviceTypesAdapter,
  TREE_PRUNING_SERVICE_TYPE_RULE,
} from "./service-types";

afterEach(() => vi.restoreAllMocks());

const serviceType = {
  id: "st-101",
  code: "WASTE-ROUTE",
  name: "Recolección domiciliaria",
  category: "WASTE_COLLECTION",
  mode: "ROUTE",
  requiresVehicle: true,
  active: true,
};

describe("serviceTypesAdapter", () => {
  it("reads the confirmed paginated list contract and forwards every filter", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        data: [serviceType],
        meta: { total: 1, page: 2, pageSize: 10, totalPages: 1 },
      }), { status: 200 }),
    );

    const result = await serviceTypesAdapter.list({
      active: true,
      category: "WASTE_COLLECTION",
      mode: "ROUTE",
      search: "waste",
      page: 2,
      pageSize: 10,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/service-types?active=true&category=WASTE_COLLECTION&mode=ROUTE&search=waste&page=2&pageSize=10",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(result).toEqual({ serviceTypes: [serviceType], page: 2, pageSize: 10, total: 1, totalPages: 1 });
  });

  it("sends the confirmed create payload and validates the resource response", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(serviceType), { status: 201 }),
    );

    await expect(serviceTypesAdapter.create({
      code: "WASTE-ROUTE",
      name: "Recolección domiciliaria",
      category: "WASTE_COLLECTION",
      mode: "ROUTE",
      requiresVehicle: true,
    })).resolves.toEqual(serviceType);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/service-types",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          code: "WASTE-ROUTE",
          name: "Recolección domiciliaria",
          category: "WASTE_COLLECTION",
          mode: "ROUTE",
          requiresVehicle: true,
        }),
      }),
    );
  });

  it("only sends editable fields when updating", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ...serviceType, name: "Recolección nocturna", active: false }), { status: 200 }),
    );

    await serviceTypesAdapter.update("st-101", {
      name: "Recolección nocturna",
      requiresVehicle: true,
      active: false,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/service-types/st-101",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ name: "Recolección nocturna", requiresVehicle: true, active: false }) }),
    );
  });

  it("represents logical deletion as DELETE and keeps contract errors visible", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ...serviceType, active: false }), { status: 200 }),
    );
    await expect(serviceTypesAdapter.remove("st-101")).resolves.toMatchObject({ active: false });
    expect(fetchMock).toHaveBeenCalledWith("/api/service-types/st-101", expect.objectContaining({ method: "DELETE" }));

    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ nope: true }), { status: 200 }));
    await expect(serviceTypesAdapter.list()).rejects.toBeInstanceOf(ServiceTypeContractError);
    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ statusCode: 409, message: "conflict", error: "Conflict", timestamp: "now", path: "/api/service-types" }), { status: 409 }));
    await expect(serviceTypesAdapter.list()).rejects.toMatchObject({
      constructor: ServiceTypeRequestError,
      status: 409,
    });
  });
});

describe("resolveServiceType", () => {
  const pruning = { id: "0b8f2c6e-1a4d-4f7e-9c3b-5d2e8a1f6b70", code: "ARB-POD", name: "Poda de arbolado", category: "TREES", mode: "POINT", requiresVehicle: true, active: true };
  const otherTrees = { ...pruning, id: "7c1d9e3a-2b5f-4a86-8d04-9e6f3b2a1c55", code: "ARB-EXT", name: "Extracción de arbolado" };
  const listResponse = (items: unknown[]) => new Response(JSON.stringify({ data: items, meta: { total: items.length, page: 1, pageSize: 100, totalPages: 1 } }), { status: 200 });

  it("looks the type up by category, mode and active state and returns the backend id", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(listResponse([pruning]));

    await expect(resolveServiceType(TREE_PRUNING_SERVICE_TYPE_RULE)).resolves.toMatchObject({ id: pruning.id });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/service-types?active=true&category=TREES&mode=POINT&pageSize=100",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("prefers the usual code when the category has more than one active type", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(listResponse([otherTrees, pruning]));
    await expect(resolveServiceType(TREE_PRUNING_SERVICE_TYPE_RULE)).resolves.toMatchObject({ code: "ARB-POD" });
  });

  it("falls back to the first active type of the category when the usual code is missing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(listResponse([otherTrees]));
    await expect(resolveServiceType(TREE_PRUNING_SERVICE_TYPE_RULE)).resolves.toMatchObject({ id: otherTrees.id });
  });

  it("fails with a Spanish message and never invents an id when nothing matches", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(listResponse([{ ...pruning, active: false }, { ...pruning, category: "GREEN_SPACES" }]));

    const failure = await resolveServiceType(TREE_PRUNING_SERVICE_TYPE_RULE).catch((caught: unknown) => caught);
    expect(failure).toBeInstanceOf(ServiceTypeNotFoundError);
    expect((failure as Error).message).toBe("No hay un tipo de servicio activo de poda de arbolado en el catálogo. Cree o active uno en Catálogo > Tipos de servicio antes de continuar.");
  });
});
