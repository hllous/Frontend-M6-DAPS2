import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { handlers } from "@/mocks/handlers";
import { operationalZonesAdapter } from "./operational-zones";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it("shares simultaneous requests for active map zones but allows later refresh", async () => {
  let requests = 0;
  server.use(http.get("*/api/zones", async () => {
    requests++;
    await new Promise((resolve) => setTimeout(resolve, 50));
    return HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 1 } });
  }));
  await Promise.all([operationalZonesAdapter.list(), operationalZonesAdapter.list()]);
  expect(requests).toBe(1);
  await operationalZonesAdapter.list();
  expect(requests).toBe(2);
});
