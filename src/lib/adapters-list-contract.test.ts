import { afterEach, describe, expect, it, vi } from "vitest";

import { crewsAdapter } from "./crews";
import { disposalSitesAdapter } from "./disposal-sites";
import { greenPointsAdapter } from "./green-points";
import { greenSpacesAdapter } from "./green-spaces";
import { repairRequestsAdapter } from "./repair-requests";
import { routesAdapter } from "./routes";
import { serviceFrequenciesAdapter } from "./service-frequencies";
import { serviceTypesAdapter } from "./service-types";
import { streetClosureRequestsAdapter } from "./street-closure-requests";
import { treeInterventionsAdapter } from "./tree-interventions";
import { treesAdapter } from "./trees";
import { vehiclesAdapter } from "./vehicles";
import { zonesAdapter } from "./zones";

type ListAdapter = { list: (query?: { page?: number; pageSize?: number }) => Promise<unknown> };

const adapters: Array<[string, ListAdapter, string]> = [
  ["crews", crewsAdapter as ListAdapter, "/api/crews"],
  ["disposal sites", disposalSitesAdapter as ListAdapter, "/api/disposal-sites"],
  ["green points", greenPointsAdapter as ListAdapter, "/api/green-points"],
  ["green spaces", greenSpacesAdapter as ListAdapter, "/api/green-spaces"],
  ["repair requests", repairRequestsAdapter as ListAdapter, "/api/repair-requests"],
  ["routes", routesAdapter as ListAdapter, "/api/routes"],
  ["service frequencies", serviceFrequenciesAdapter as ListAdapter, "/api/service-frequencies"],
  ["service types", serviceTypesAdapter as ListAdapter, "/api/service-types"],
  ["street closure requests", streetClosureRequestsAdapter as ListAdapter, "/api/street-closure-requests"],
  ["tree interventions", treeInterventionsAdapter as ListAdapter, "/api/tree-interventions"],
  ["trees", treesAdapter as ListAdapter, "/api/trees"],
  ["vehicles", vehiclesAdapter as ListAdapter, "/api/vehicles"],
  ["zones", zonesAdapter as ListAdapter, "/api/zones"],
];

afterEach(() => vi.restoreAllMocks());

describe.each(adapters)("%s list adapter", (_name, adapter, path) => {
  it("sends the pagination query to its BFF route", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({}));
    await adapter.list({ page: 2, pageSize: 5 }).catch(() => undefined);

    const url = new URL(String(fetchSpy.mock.calls[0]![0]), "http://localhost");
    expect(url.pathname).toBe(path);
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("pageSize")).toBe("5");
  });

  it("omits the query string when there is nothing to filter", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({}));
    await adapter.list().catch(() => undefined);
    expect(String(fetchSpy.mock.calls[0]![0])).toBe(path);
  });

  it("refuses a response that is not JSON with a retryable message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>Bad gateway</html>", { status: 200 }));
    await expect(adapter.list()).rejects.toThrow(/información válida/);
  });

  it("refuses an error body that does not follow the error contract", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ raro: true }, { status: 500 }));
    await expect(adapter.list()).rejects.toThrow(/información válida|No se pudo/);
  });

  it("refuses a successful response with the wrong shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ data: "no-es-una-lista" }));
    await expect(adapter.list()).rejects.toThrow(/información válida|No se pudo/);
  });

  it("reports a network failure as a connection problem", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    await expect(adapter.list()).rejects.toThrow(/conectar con el servidor/);
  });
});
