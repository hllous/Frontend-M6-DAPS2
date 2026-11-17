import { describe, expect, it } from "vitest";

import { sortCatalogFixtures } from "./catalog-sort-fixtures";

type Item = { id: string; code: string; kind?: string; qty?: number | null; active?: boolean };

const ids = (items: Item[]) => items.map((item) => item.id);

const items: Item[] = [
  { id: "b", code: "B", kind: "GREEN", qty: 5, active: true },
  { id: "a", code: "C", kind: "HOUSEHOLD", qty: null, active: false },
  { id: "c", code: "A", kind: "BULKY", qty: 5, active: true },
  { id: "d", code: "D", kind: "RECYCLABLE", qty: 1, active: false },
];
const KINDS = ["HOUSEHOLD", "RECYCLABLE", "BULKY", "GREEN"];

describe("sortCatalogFixtures", () => {
  it("sin sort ni order deja la lista como vino, sin mutar la original", () => {
    const original = [...items];
    expect(ids(sortCatalogFixtures(items, {}, "code"))).toEqual(["b", "a", "c", "d"]);
    expect(items).toEqual(original);
  });

  it("ordena asc por el campo pedido", () => {
    expect(ids(sortCatalogFixtures(items, { sort: "code", order: "asc" }, "code"))).toEqual(["c", "b", "a", "d"]);
  });

  it("ordena desc por el campo pedido", () => {
    expect(ids(sortCatalogFixtures(items, { sort: "code", order: "desc" }, "code"))).toEqual(["d", "a", "b", "c"]);
  });

  it("con solo sort el sentido es asc", () => {
    expect(ids(sortCatalogFixtures(items, { sort: "code" }, "kind"))).toEqual(["c", "b", "a", "d"]);
  });

  it("con solo order invierte el orden por defecto", () => {
    expect(ids(sortCatalogFixtures(items, { order: "desc" }, "code"))).toEqual(["d", "a", "b", "c"]);
    expect(ids(sortCatalogFixtures(items, { order: "asc" }, "code"))).toEqual(["c", "b", "a", "d"]);
  });

  it("desempata por id en el mismo sentido que el orden", () => {
    expect(ids(sortCatalogFixtures(items, { sort: "qty", order: "asc" }, "code"))).toEqual(["d", "b", "c", "a"]);
    expect(ids(sortCatalogFixtures(items, { sort: "qty", order: "desc" }, "code"))).toEqual(["a", "c", "b", "d"]);
  });

  it("los nulos van al final en asc y al principio en desc, como Postgres", () => {
    expect(sortCatalogFixtures(items, { sort: "qty", order: "asc" }, "code").at(-1)?.qty).toBeNull();
    expect(sortCatalogFixtures(items, { sort: "qty", order: "desc" }, "code")[0]?.qty).toBeNull();
  });

  it("los booleanos ordenan false antes que true", () => {
    expect(ids(sortCatalogFixtures(items, { sort: "active", order: "asc" }, "code"))).toEqual(["a", "d", "b", "c"]);
    expect(ids(sortCatalogFixtures(items, { sort: "active", order: "desc" }, "code"))).toEqual(["c", "b", "d", "a"]);
  });

  it("los enums ordenan por orden de declaración, no alfabético", () => {
    expect(ids(sortCatalogFixtures(items, { sort: "kind", order: "asc" }, "code", { kind: KINDS }))).toEqual(["a", "d", "c", "b"]);
    expect(ids(sortCatalogFixtures(items, { sort: "kind", order: "desc" }, "code", { kind: KINDS }))).toEqual(["b", "c", "d", "a"]);
    // sin el orden de declaración sería alfabético
    expect(ids(sortCatalogFixtures(items, { sort: "kind", order: "asc" }, "code"))).toEqual(["c", "b", "a", "d"]);
  });

  it("un campo sin valor en ningún ítem (createdAt en los fixtures) desempata por id", () => {
    expect(ids(sortCatalogFixtures(items, { sort: "createdAt", order: "asc" }, "code"))).toEqual(["a", "b", "c", "d"]);
    expect(ids(sortCatalogFixtures(items, { sort: "createdAt", order: "desc" }, "code"))).toEqual(["d", "c", "b", "a"]);
  });
});
