import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { operationalMapAdapter } from "./operational-map";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("operational map adapter", () => {
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
