import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { operationalMapAdapter } from "./operational-map";
import { containersAdapter } from "./containers";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); operationalMapAdapter.invalidate(); });
afterAll(() => server.close());

describe("operational map adapter", () => {
  it("retains pages that finish after another page fails", async () => {
    server.use(http.get("*/api/containers", async ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page"));
      if (page === 2) return HttpResponse.json({}, { status: 500 });
      if (page === 3) await new Promise((resolve) => setTimeout(resolve, 100));
      return HttpResponse.json({ data: [{ id: `c-${page}`, code: `CT-${page}`, containerType: "HOUSEHOLD", zoneId: "zone-1", address: "Cabildo 1", lat: -34.56, lng: -58.45, capacityLiters: 1100, status: "ACTIVE" }], meta: { total: 3, page, pageSize: 100, totalPages: 3 } });
    }));
    await expect(operationalMapAdapter.load()).rejects.toThrow();
    const observed: string[][] = [];
    const unsubscribe = operationalMapAdapter.subscribe((data) => observed.push(data.containers.map((item) => item.code)));
    expect(observed.at(-1)).toContain("CT-3");
    unsubscribe();
  });
  it("preserves a later successful page while retrying a failed page", async () => {
    const observed: string[][] = [];
    server.use(http.get("*/api/containers", async ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page"));
      if (page === 2) { await new Promise((resolve) => setTimeout(resolve, 100)); return HttpResponse.json({}, { status: 500 }); }
      return HttpResponse.json({ data: [{ id: `c-${page}`, code: `CT-${page}`, containerType: "HOUSEHOLD", zoneId: "zone-1", address: "Cabildo 1", lat: -34.56, lng: -58.45, capacityLiters: 1100, status: "ACTIVE" }], meta: { total: 3, page, pageSize: 100, totalPages: 3 } });
    }));
    const unsubscribe = operationalMapAdapter.subscribe((data) => observed.push(data.containers.map((item) => item.code)));
    await expect(operationalMapAdapter.load()).rejects.toThrow();
    expect(observed.at(-1)).toContain("CT-3");
    observed.length = 0;
    await expect(operationalMapAdapter.load()).rejects.toThrow();
    expect(observed.every((codes) => codes.includes("CT-3"))).toBe(true);
    unsubscribe();
  });
  it("limits concurrent inventory requests across layers", async () => {
    let active = 0;
    let maximum = 0;
    for (const path of ["containers", "green-points", "green-spaces", "trees"]) {
      server.use(http.get(`*/api/${path}`, async ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        active++; maximum = Math.max(maximum, active);
        await new Promise((resolve) => setTimeout(resolve, 25));
        active--;
        return HttpResponse.json({ data: [], meta: { total: 500, page, pageSize: 100, totalPages: 5 } });
      }));
    }
    await operationalMapAdapter.load();
    expect(maximum).toBeGreaterThan(1);
    expect(maximum).toBeLessThanOrEqual(6);
  });
  it("keeps loaded layers available when another fails and allows a retry", async () => {
    let fail = true;
    server.use(http.get("*/api/trees", async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
      return fail ? HttpResponse.json({ message: "failed" }, { status: 500 }) : HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 1 } });
    }));
    let last = 0;
    const unsubscribe = operationalMapAdapter.subscribe((data) => { last = data.containers.length; });
    await expect(operationalMapAdapter.load()).rejects.toThrow();
    expect(last).toBeGreaterThan(0);
    fail = false;
    const data = await operationalMapAdapter.load();
    expect(data.containers.length).toBeGreaterThan(0);
    unsubscribe();
  });
  it("reloads inventory after a container edit", async () => {
    const before = await operationalMapAdapter.load();
    const original = before.containers.find((container) => container.id === "cont-1")!;
    await containersAdapter.update(original.id, { address: "Av. Rivadavia 2000" });
    const after = await operationalMapAdapter.load();
    expect(after.containers.find((container) => container.id === original.id)?.address).toBe("Av. Rivadavia 2000");
  });
  it("delivers partial inventory before all layers finish", async () => {
    const progress = vi.fn();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    server.use(http.get("*/api/trees", async () => {
      await gate;
      return HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 1 } });
    }));
    const unsubscribe = operationalMapAdapter.subscribe(progress);
    const load = operationalMapAdapter.load();
    await vi.waitFor(() => expect(progress).toHaveBeenCalled());
    release();
    await load;
    unsubscribe();
  });
  it("reloads after invalidation", async () => {
    let requests = 0;
    server.use(http.get("*/api/containers", () => {
      requests++;
      return HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 1 } });
    }));
    await operationalMapAdapter.load();
    await operationalMapAdapter.load();
    operationalMapAdapter.invalidate();
    await operationalMapAdapter.load();
    expect(requests).toBe(2);
  });
  it("requests remaining inventory pages concurrently", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    server.use(http.get("*/api/containers", async ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page"));
      if (page > 1) {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 30));
        inFlight--;
      }
      return HttpResponse.json({ data: [], meta: { total: 300, page, pageSize: 100, totalPages: 3 } });
    }));
    await operationalMapAdapter.load();
    expect(maxInFlight).toBeGreaterThan(1);
  });
  it("shares one inventory load between simultaneous map consumers", async () => {
    let requests = 0;
    server.use(http.get("*/api/containers", () => {
      requests += 1;
      return HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 1 } });
    }));
    const [services, map] = await Promise.all([operationalMapAdapter.load(), operationalMapAdapter.load()]);
    expect(services.containers).toEqual(map.containers);
    expect(requests).toBe(1);
  });
  it("loads every page from each point layer with the documented page-size cap", async () => {
    const requestedPages: string[] = [];
    const container = (page: number) => ({
      id: `container-${page}`,
      code: `CT-PAGE-${page}`,
      containerType: "HOUSEHOLD",
      zoneId: "zone-1",
      address: `Av. Cabildo ${2100 + page}`,
      lat: -34.56 - page / 1000,
      lng: -58.45 - page / 1000,
      capacityLiters: 1100,
      status: page === 1 ? "OVERFLOWED" : "DAMAGED",
    });

    server.use(
      http.get("*/api/containers", ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get("page"));
        requestedPages.push(`${page}:${url.searchParams.get("pageSize")}`);
        return HttpResponse.json({
          data: [container(page)],
          meta: { total: 2, page, pageSize: 100, totalPages: 2 },
        });
      }),
    );

    const result = await operationalMapAdapter.load();

    expect(requestedPages).toEqual(["1:100", "2:100"]);
    expect(result.containers.map((item) => item.code)).toEqual(["CT-PAGE-1", "CT-PAGE-2"]);
    expect(result.greenPoints.length).toBeGreaterThan(0);
    expect(result.greenSpaces.length).toBeGreaterThan(0);
    expect(result.trees.length).toBeGreaterThan(0);
  });
});
