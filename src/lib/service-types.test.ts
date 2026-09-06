import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ServiceTypeContractError,
  ServiceTypeRequestError,
  serviceTypesAdapter,
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
