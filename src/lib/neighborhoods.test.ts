import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { handlers } from "@/mocks/handlers";
import { communesAdapter } from "./communes";
import {
  catalogErrorMessage,
  groupNeighborhoodsByCommune,
  isCatalogUnavailable,
  NeighborhoodRequestError,
  neighborhoodName,
  neighborhoodsAdapter,
} from "./neighborhoods";
import { neighborhoodFixtures } from "./neighborhoods-fixtures";
import { zoneFixtures } from "./zones-fixtures";
import { zoneLocationLabel, zoneSchema } from "./zones";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("neighborhoods adapter", () => {
  it("reads the 64-barrio M9 catalog through the BFF, inactive ones included", async () => {
    const all = await neighborhoodsAdapter.list();

    expect(all).toHaveLength(64);
    expect(all.filter((neighborhood) => !neighborhood.activo)).toHaveLength(16);
    expect(all[0]).toMatchObject({ id: expect.any(String), codigo: expect.any(String), zona: expect.any(String) });
  });

  it("passes the filters through and returns only the active 48 with soloActivos", async () => {
    await expect(neighborhoodsAdapter.list({ soloActivos: true })).resolves.toHaveLength(48);
    await expect(neighborhoodsAdapter.list({ q: "paler" })).resolves.toEqual([expect.objectContaining({ codigo: "palermo" })]);
    const comuna14 = await neighborhoodsAdapter.list({ zona: "comuna-14", soloActivos: true });
    expect(comuna14.map((neighborhood) => neighborhood.codigo)).toEqual(["palermo"]);
  });

  it("raises a typed unavailable error on the catalog 503", async () => {
    server.use(http.get("*/api/neighborhoods", () => HttpResponse.json({ statusCode: 503, message: "Sin catálogo" }, { status: 503 })));

    const error = await neighborhoodsAdapter.list().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(NeighborhoodRequestError);
    expect(isCatalogUnavailable(error)).toBe(true);
    expect(catalogErrorMessage(error)).toMatch(/todavía no está disponible/);
    expect(catalogErrorMessage(new Error("boom"), "comunas")).toBe("No se pudieron cargar las comunas. Intente nuevamente.");
  });

  it("rejects a response that does not respect the contract", async () => {
    server.use(http.get("*/api/neighborhoods", () => HttpResponse.json([{ id: 1 }])));

    await expect(neighborhoodsAdapter.list()).rejects.toMatchObject({ status: 502 });
  });
});

describe("communes adapter", () => {
  it("lists the 15 communes in numeric order with their zones and barrios", async () => {
    const communes = await communesAdapter.list();

    expect(communes).toHaveLength(15);
    expect(communes.map((commune) => commune.code).slice(0, 3)).toEqual(["comuna-1", "comuna-2", "comuna-3"]);
    expect(communes[0]?.zones.length).toBeGreaterThan(0);
    expect(communes[0]?.zones[0]?.neighborhoods[0]).toMatchObject({ id: expect.any(String), codigo: expect.any(String) });
  });
});

describe("helpers", () => {
  it("resolves the name at display time and never exposes the raw id", () => {
    const palermo = neighborhoodFixtures.find((neighborhood) => neighborhood.codigo === "palermo")!;

    expect(neighborhoodName(neighborhoodFixtures, palermo.id)).toBe("Palermo");
    expect(neighborhoodName(neighborhoodFixtures, "missing")).toBe("Barrio no disponible");
    expect(neighborhoodName([], "missing", "loading")).toBe("Cargando barrio…");
    expect(neighborhoodName([], "missing", "failed")).toBe("No se pudo cargar el nombre");
  });

  it("groups by commune in numeric order and sorts barrios by name", () => {
    const groups = groupNeighborhoodsByCommune(neighborhoodFixtures.filter((neighborhood) => neighborhood.activo));

    expect(groups).toHaveLength(15);
    expect(groups.map((group) => group.label).slice(0, 3)).toEqual(["Comuna 1", "Comuna 2", "Comuna 3"]);
    expect(groups[0]?.neighborhoods.map((neighborhood) => neighborhood.nombre)).toEqual([...groups[0]!.neighborhoods.map((neighborhood) => neighborhood.nombre)].sort((a, b) => a.localeCompare(b, "es")));
  });
});

describe("zone shape", () => {
  it("has 48 zones, one per active barrio, coded by the barrio codigo", () => {
    expect(zoneFixtures).toHaveLength(48);
    expect(zoneFixtures.every((zone) => zone.neighborhood?.codigo === zone.code && zone.commune)).toBe(true);
    expect(zoneFixtures.some((zone) => zone.code.startsWith("Z-"))).toBe(false);
  });

  it("accepts null commune and neighborhood, and a neighborhood without codigo or nombre", () => {
    const base = { id: "z", code: "palermo", name: "Palermo", active: true };

    expect(zoneSchema.safeParse({ ...base, commune: null, neighborhood: null }).success).toBe(true);
    expect(zoneSchema.safeParse({ ...base, commune: { id: "c", code: "comuna-14", name: "Comuna 14" }, neighborhood: { id: "n" } }).success).toBe(true);
    expect(zoneLocationLabel({ commune: null, neighborhood: { id: "n" } })).toBe("");
    expect(zoneLocationLabel({ commune: { id: "c", code: "comuna-14", name: "Comuna 14" }, neighborhood: { id: "n", nombre: "Palermo" } })).toBe("Palermo · Comuna 14");
  });
});
