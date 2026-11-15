import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { NetworkFailureError } from "./authenticated-fetch";
import { RouteContractError, RouteRequestError, routesAdapter } from "./routes";
import { ZoneContractError, ZoneRequestError, zonesAdapter } from "./zones";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

const documentedError = (statusCode: number, message: string | string[]) =>
  HttpResponse.json({ statusCode, message, error: "Error", timestamp: "t", path: "/p" }, { status: statusCode });

type Case = {
  name: string;
  resource: "zones" | "routes";
  method: "get" | "post" | "patch" | "put" | "delete";
  path: string;
  call: () => Promise<unknown>;
  Request: new (...args: never[]) => Error;
  Contract: new (...args: never[]) => Error;
};

const zone = { Request: ZoneRequestError, Contract: ZoneContractError, resource: "zones" as const };
const route = { Request: RouteRequestError, Contract: RouteContractError, resource: "routes" as const };

const cases: Case[] = [
  { ...zone, name: "zones.list", method: "get", path: "*/api/zones", call: () => zonesAdapter.list() },
  { ...zone, name: "zones.get", method: "get", path: "*/api/zones/z1", call: () => zonesAdapter.get("z1") },
  { ...zone, name: "zones.create", method: "post", path: "*/api/zones", call: () => zonesAdapter.create({ code: "Z9", name: "Zona 9" }) },
  { ...zone, name: "zones.update", method: "patch", path: "*/api/zones/z1", call: () => zonesAdapter.update("z1", { name: "Otra" }) },
  { ...zone, name: "zones.delete", method: "delete", path: "*/api/zones/z1", call: () => zonesAdapter.delete("z1") },
  { ...zone, name: "zones.assignNeighborhoods", method: "post", path: "*/api/zones/z1/neighborhoods", call: () => zonesAdapter.assignNeighborhoods("z1", { neighborhoodIds: ["n1"] }) },
  { ...zone, name: "zones.removeNeighborhood", method: "delete", path: "*/api/zones/z1/neighborhoods/n1", call: () => zonesAdapter.removeNeighborhood("z1", "n1") },
  { ...zone, name: "zones.checkReferences", method: "get", path: "*/api/zones/z1/references", call: () => zonesAdapter.checkReferences("z1") },
  { ...route, name: "routes.list", method: "get", path: "*/api/routes", call: () => routesAdapter.list() },
  { ...route, name: "routes.get", method: "get", path: "*/api/routes/r1", call: () => routesAdapter.get("r1") },
  { ...route, name: "routes.update", method: "patch", path: "*/api/routes/r1", call: () => routesAdapter.update("r1", { name: "Otro" }) },
  { ...route, name: "routes.delete", method: "delete", path: "*/api/routes/r1", call: () => routesAdapter.delete("r1") },
  { ...route, name: "routes.checkReferences", method: "get", path: "*/api/routes/r1/references", call: () => routesAdapter.checkReferences("r1") },
];

describe.each(cases)("$name error contract", ({ method, path, call, resource, Request, Contract }) => {
  const reply = (resolver: () => Response) => server.use(http[method](path, resolver));

  it("turns a transport failure into a NetworkFailureError and records telemetry for the resource", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    reply(() => HttpResponse.error());

    await expect(call()).rejects.toBeInstanceOf(NetworkFailureError);
    expect(info).toHaveBeenCalledWith("[m6-telemetry]", { name: "request_network_failure", resource });
  });

  it("joins an array message of a documented error and keeps the status", async () => {
    reply(() => documentedError(409, ["Tiene referencias.", "No se puede borrar."]));

    const error = await call().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Request);
    expect(error).toMatchObject({ message: "Tiene referencias. No se puede borrar.", status: 409 });
  });

  it("raises a contract error for an undocumented error body and records telemetry", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    reply(() => HttpResponse.json({ oops: 1 }, { status: 500 }));

    await expect(call()).rejects.toBeInstanceOf(Contract);
    expect(info).toHaveBeenCalledWith("[m6-telemetry]", { name: "request_malformed_response", resource });
  });

  it("raises a contract error when the body is not JSON", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    reply(() => new HttpResponse("<html>", { status: 200 }));

    await expect(call()).rejects.toBeInstanceOf(Contract);
  });

  it("raises a contract error when a successful body breaks the schema", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    reply(() => HttpResponse.json({ nope: true }, { status: 200 }));

    await expect(call()).rejects.toBeInstanceOf(Contract);
  });
});

describe("input validation happens before any request", () => {
  it("rejects invalid zone input without calling the backend", async () => {
    const hit = vi.fn();
    server.use(http.post("*/api/zones", () => (hit(), HttpResponse.json({}))));

    await expect(zonesAdapter.create({ code: "  ", name: "x" })).rejects.toThrow();
    await expect(zonesAdapter.create({ code: "Z", name: "x".repeat(101) })).rejects.toThrow();
    await expect(zonesAdapter.create({ code: "Z", name: "x", communeId: "no-uuid" })).rejects.toThrow();
    await expect(zonesAdapter.assignNeighborhoods("z1", { neighborhoodIds: [] })).rejects.toThrow();
    expect(hit).not.toHaveBeenCalled();
  });

  it("encodes the neighborhood id when removing it from a zone", async () => {
    let seen = "";
    server.use(
      http.delete("*/api/zones/z1/neighborhoods/:id", ({ request }) => {
        seen = new URL(request.url).pathname;
        return HttpResponse.json({ nope: true });
      }),
    );
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    await zonesAdapter.removeNeighborhood("z1", "barrio/uno").catch(() => undefined);

    expect(seen).toBe("/api/zones/z1/neighborhoods/barrio%2Funo");
  });
});

describe("zone helpers", () => {
  it("orders zones by commune number numerically, then by name, with commune-less zones last", async () => {
    const { sortZonesByCommune, communeNumber, zoneLabel } = await import("./zones");
    const make = (id: string, name: string, commune?: { name: string; number?: number }) => ({
      id, code: id, name, active: true,
      commune: commune ? { id: `c-${id}`, code: id, ...commune } : null,
    });
    const sorted = sortZonesByCommune([
      make("a", "Zeta"),
      make("b", "Beta", { name: "Comuna 10" }),
      make("c", "Alfa", { name: "Comuna 2" }),
      make("d", "Gama", { name: "Comuna 2", number: 2 }),
    ]);

    expect(sorted.map((z) => z.id)).toEqual(["c", "d", "b", "a"]);
    expect(communeNumber(null)).toBeNull();
    expect(communeNumber({ id: "x", code: "x", name: "Sin número" })).toBeNull();
    expect(zoneLabel(sorted, "c", true)).toBe("Alfa");
    expect(zoneLabel(sorted, "zz", true)).toBe("Zona no disponible");
    expect(zoneLabel(sorted, "zz", false)).toBe("Cargando zona…");
  });
});
