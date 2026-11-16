// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { containersAdapter } from "./containers";
import { crewsAdapter } from "./crews";
import { greenPointsAdapter } from "./green-points";
import { greenSpacesAdapter } from "./green-spaces";
import { routesAdapter } from "./routes";
import { treesAdapter } from "./trees";
import { vehiclesAdapter } from "./vehicles";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

type Query = Record<string, unknown>;
type ListFn = (query: Query) => Promise<unknown>;

const adapters: { path: string; list: ListFn; sort: string }[] = [
  { path: "vehicles", list: vehiclesAdapter.list as ListFn, sort: "vehicleType" },
  { path: "containers", list: containersAdapter.list as ListFn, sort: "capacityLiters" },
  { path: "trees", list: treesAdapter.list as ListFn, sort: "species" },
  { path: "crews", list: crewsAdapter.list as ListFn, sort: "defaultShift" },
  { path: "routes", list: routesAdapter.list as ListFn, sort: "name" },
  { path: "green-points", list: greenPointsAdapter.list as ListFn, sort: "code" },
  { path: "green-spaces", list: greenSpacesAdapter.list as ListFn, sort: "spaceType" },
];

describe.each(adapters)("adapter de $path: orden (#703)", ({ path, list, sort }) => {
  async function requestedSearch(query: Query) {
    let search = "";
    server.use(
      http.get(`*/api/${path}`, ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } });
      }),
    );
    await list(query);
    return search;
  }

  it("manda sort y order junto con la página, exactamente", async () => {
    expect(await requestedSearch({ page: 2, pageSize: 20, sort, order: "desc" })).toBe(
      `?page=2&pageSize=20&sort=${sort}&order=desc`,
    );
  });

  it("manda order=asc explícito cuando se pide", async () => {
    expect(await requestedSearch({ sort, order: "asc" })).toBe(`?sort=${sort}&order=asc`);
  });

  it("sin orden no agrega sort ni order", async () => {
    expect(await requestedSearch({ page: 1, pageSize: 20 })).toBe("?page=1&pageSize=20");
  });

  it("un 400 del orden llega como error de la solicitud con su mensaje", async () => {
    server.use(
      http.get(`*/api/${path}`, () =>
        HttpResponse.json(
          { statusCode: 400, message: "sort must be one of the following values", error: "Bad Request", timestamp: "2026-11-16T00:00:00.000Z", path: `/${path}` },
          { status: 400 },
        ),
      ),
    );
    await expect(list({ sort: "nope" })).rejects.toMatchObject({
      status: 400,
      message: "sort must be one of the following values",
    });
  });
});
