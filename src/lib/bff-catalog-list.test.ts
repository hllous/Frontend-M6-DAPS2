import { describe, expect, it } from "vitest";

import { catalogBackendQuery, catalogListQuery } from "./bff-route";

const parse = (url: URL) => ({ page: Number(url.searchParams.get("page") ?? 1) });

describe("catalogListQuery", () => {
  it("combina los filtros del recurso con sort y order", () => {
    const query = catalogListQuery("vehicles", new Request("http://x/api/vehicles?page=2&sort=plate&order=desc"), parse);
    expect(query).toEqual({ page: 2, sort: "plate", order: "desc" });
  });

  it("sin sort ni order devuelve solo los filtros", () => {
    expect(catalogListQuery("vehicles", new Request("http://x/api/vehicles?page=3"), parse)).toEqual({ page: 3 });
  });

  it("un sort fuera de la lista da la respuesta 400 con el path y el mensaje de siempre", async () => {
    const query = catalogListQuery("vehicles", new Request("http://x/api/vehicles?sort=zoneId"), parse);
    expect(query).toBeInstanceOf(Response);
    const response = query as Response;
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      statusCode: 400,
      message: "Orden inválido. «sort» admite: plate, vehicleType, capacity, active, createdAt; «order» admite: asc, desc.",
      path: "/api/vehicles",
    });
  });
});

describe("catalogBackendQuery", () => {
  it("reenvía los filtros permitidos más sort y order", () => {
    expect(catalogBackendQuery({ active: true, page: 1, sort: "plate", order: "asc", extra: "x" }, ["active", "page"])).toBe("?active=true&page=1&sort=plate&order=asc");
  });

  it("sin orden elegido no agrega nada", () => {
    expect(catalogBackendQuery({ page: 1 }, ["page"])).toBe("?page=1");
  });
});
