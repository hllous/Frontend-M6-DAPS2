// @ts-nocheck
import { describe, expect, it } from "vitest";

import { loadAllPages } from "./reference-catalog";

describe("loadAllPages", () => {
  it("reads every page of a catalog, in order, with the largest page size the backend accepts", async () => {
    const catalog = Array.from({ length: 250 }, (_, index) => `item-${index + 1}`);
    const requested: Array<[number, number]> = [];
    const items = await loadAllPages(async (page, pageSize) => {
      requested.push([page, pageSize]);
      return { items: catalog.slice((page - 1) * pageSize, page * pageSize), totalPages: Math.ceil(catalog.length / pageSize) };
    });
    expect(items).toEqual(catalog);
    expect(requested.map(([page]) => page).sort()).toEqual([1, 2, 3]);
    expect(requested.every(([, pageSize]) => pageSize === 100)).toBe(true);
  });

  it("asks only for the first page of an empty catalog", async () => {
    let calls = 0;
    const items = await loadAllPages(async () => { calls += 1; return { items: [], totalPages: 0 }; });
    expect(items).toEqual([]);
    expect(calls).toBe(1);
  });
});
