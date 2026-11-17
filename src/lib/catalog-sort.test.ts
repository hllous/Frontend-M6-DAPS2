import { describe, expect, it } from "vitest";

import {
  appendSortParams,
  CATALOG_SORT_COLUMNS,
  CATALOG_SORT_FIELDS,
  catalogSortSchema,
  parseCatalogSort,
  sortingToQuery,
  type CatalogResource,
} from "./catalog-sort";

const RESOURCES = Object.keys(CATALOG_SORT_FIELDS) as CatalogResource[];

describe("campos de orden del Backend (#703)", () => {
  it("fija la lista cerrada de cada recurso; el primero es el orden por defecto", () => {
    expect(CATALOG_SORT_FIELDS).toEqual({
      vehicles: ["plate", "vehicleType", "capacity", "active", "createdAt"],
      containers: ["code", "containerType", "status", "capacityLiters", "createdAt"],
      trees: ["surveyCode", "species", "active", "createdAt"],
      crews: ["name", "crewType", "defaultShift", "active", "createdAt"],
      routes: ["code", "name", "active", "createdAt"],
      "green-points": ["code", "name", "active", "createdAt"],
      "green-spaces": ["name", "spaceType", "active", "createdAt"],
    });
  });

  it("mapea cada columna ordenable de la tabla a su campo; las demás no ofrecen ordenar", () => {
    expect(CATALOG_SORT_COLUMNS).toEqual({
      vehicles: { plate: "plate", type: "vehicleType", capacity: "capacity", status: "active" },
      containers: { code: "code", type: "containerType", capacity: "capacityLiters", status: "status" },
      trees: { surveyCode: "surveyCode", species: "species", status: "active" },
      crews: { name: "name", type: "crewType", shift: "defaultShift", status: "active" },
      routes: { code: "code", name: "name", status: "active" },
      "green-points": { code: "code", name: "name", status: "active" },
      "green-spaces": { name: "name", type: "spaceType", status: "active" },
    });
  });

  it.each(RESOURCES)("%s: todo campo mapeado figura en la lista del Backend", (resource) => {
    for (const field of Object.values(CATALOG_SORT_COLUMNS[resource])) {
      expect(CATALOG_SORT_FIELDS[resource]).toContain(field);
    }
  });
});

describe("parseCatalogSort", () => {
  it("sin sort ni order devuelve un valor vacío (el orden no cambia)", () => {
    expect(parseCatalogSort("vehicles", new URLSearchParams())).toEqual({ ok: true, value: {} });
  });

  it("acepta un campo del recurso con asc o desc", () => {
    expect(parseCatalogSort("containers", new URLSearchParams("sort=capacityLiters&order=desc"))).toEqual({
      ok: true,
      value: { sort: "capacityLiters", order: "desc" },
    });
    expect(parseCatalogSort("routes", new URLSearchParams("sort=name&order=asc"))).toEqual({
      ok: true,
      value: { sort: "name", order: "asc" },
    });
  });

  it("acepta solo order (invierte el orden por defecto)", () => {
    expect(parseCatalogSort("trees", new URLSearchParams("order=desc"))).toEqual({ ok: true, value: { order: "desc" } });
  });

  it("rechaza un sort que no es de ese recurso, aunque sea de otro", () => {
    const result = parseCatalogSort("routes", new URLSearchParams("sort=vehicleType"));
    expect(result).toEqual({
      ok: false,
      message: "Orden inválido. «sort» admite: code, name, active, createdAt; «order» admite: asc, desc.",
    });
  });

  it.each(["", "ASC", "up", "descending"])("rechaza el order %j", (order) => {
    expect(parseCatalogSort("crews", new URLSearchParams({ order })).ok).toBe(false);
  });

  it("rechaza un sort vacío", () => {
    expect(parseCatalogSort("crews", new URLSearchParams({ sort: "" })).ok).toBe(false);
  });
});

describe("catalogSortSchema", () => {
  it("es el contrato Zod de sort y order", () => {
    const schema = catalogSortSchema("green-spaces");
    expect(schema.parse({ sort: "spaceType", order: "desc" })).toEqual({ sort: "spaceType", order: "desc" });
    expect(schema.safeParse({ sort: "areaM2" }).success).toBe(false);
  });
});

describe("appendSortParams", () => {
  it("no agrega nada sin orden", () => {
    const params = new URLSearchParams("page=1");
    appendSortParams(params, {});
    expect(params.toString()).toBe("page=1");
  });

  it("agrega sort y order tal cual", () => {
    const params = new URLSearchParams("page=2");
    appendSortParams(params, { sort: "plate", order: "desc" });
    expect(params.toString()).toBe("page=2&sort=plate&order=desc");
  });

  it("agrega solo order si no hay sort", () => {
    const params = new URLSearchParams();
    appendSortParams(params, { order: "desc" });
    expect(params.toString()).toBe("order=desc");
  });
});

describe("sortingToQuery", () => {
  it("sin orden elegido no manda sort ni order", () => {
    expect(sortingToQuery("vehicles", [])).toEqual({});
  });

  it("columna ascendente: manda order=asc explícito", () => {
    expect(sortingToQuery("vehicles", [{ id: "type", desc: false }])).toEqual({ sort: "vehicleType", order: "asc" });
  });

  it("columna descendente: manda order=desc", () => {
    expect(sortingToQuery("containers", [{ id: "capacity", desc: true }])).toEqual({
      sort: "capacityLiters",
      order: "desc",
    });
  });

  it("una columna sin campo en el Backend no genera orden", () => {
    expect(sortingToQuery("containers", [{ id: "zone", desc: false }])).toEqual({});
    expect(sortingToQuery("trees", [{ id: "measures", desc: true }])).toEqual({});
  });

  it("el id de una columna de otro recurso no se traduce", () => {
    expect(sortingToQuery("routes", [{ id: "type", desc: false }])).toEqual({});
  });

  it("usa solo la primera columna (orden simple)", () => {
    expect(
      sortingToQuery("crews", [
        { id: "shift", desc: true },
        { id: "name", desc: false },
      ]),
    ).toEqual({ sort: "defaultShift", order: "desc" });
  });
});
