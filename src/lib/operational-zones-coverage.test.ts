import { afterEach, describe, expect, it, vi } from "vitest";

import { buildTodayZoneCoverage, loadTodayServiceCoverage, operationalZonesAdapter, polygonCenter } from "./operational-zones";
import { servicesAdapter, type Service, type ZoneResult } from "./services";
import { zonesAdapter } from "./zones";
import { serviceFixtures } from "./services-fixtures";

afterEach(() => vi.restoreAllMocks());

const base = serviceFixtures[0]!;
const service = (id: string, zoneIds: string[], zoneNames: string[]): Service => ({ ...base, id, zoneIds, zoneNames });
const result = (zoneId: string, status: ZoneResult["status"]) => ({ id: `r-${zoneId}-${status}`, zoneId, status, recordedAt: "2026-09-05T10:00:00.000Z", attachments: [] }) as ZoneResult;

describe("polygonCenter con un anillo de área casi nula", () => {
  it("devuelve el promedio de los vértices distintos", () => {
    const sliver = [[0, 0], [3e-10, 0], [0, 6e-10], [0, 0]] as [number, number][];
    const [lat, lng] = polygonCenter([[sliver]]);
    expect(lat).toBeCloseTo(1e-10, 15);
    expect(lng).toBeCloseTo(2e-10, 15);
  });
});

describe("buildTodayZoneCoverage", () => {
  it("combina servicios de la misma zona quedándose con el estado más grave y contando resultados", () => {
    const coverage = buildTodayZoneCoverage(
      [
        { service: service("a", ["z-x"], ["Zona X"]), zoneResults: [result("z-x", "SERVICED")] },
        { service: service("b", ["z-x"], ["Zona X"]), zoneResults: [result("z-x", "NOT_SERVICED")] },
        { service: service("c", ["z-x"], ["Zona X"]), zoneResults: [] },
        { service: service("d", ["z-y"], ["Zona Y"]), zoneResults: [] },
      ],
      [],
    );

    expect(coverage.map((zone) => zone.zoneName)).toEqual(["Zona X", "Zona Y"]);
    expect(coverage[0]).toMatchObject({ zoneId: "z-x", status: "NOT_SERVICED", serviceCount: 3, resultCount: 2 });
    expect(coverage[1]).toMatchObject({ zoneId: "z-y", status: "PENDING", serviceCount: 1, resultCount: 0 });
  });

  it("no baja el estado cuando llega uno menos grave después", () => {
    const [zone] = buildTodayZoneCoverage(
      [
        { service: service("a", ["z-x"], ["Zona X"]), zoneResults: [result("z-x", "PARTIAL")] },
        { service: service("b", ["z-x"], ["Zona X"]), zoneResults: [result("z-x", "SERVICED")] },
      ],
      [],
    );
    expect(zone!.status).toBe("PARTIAL");
  });

  it("usa un nombre de respaldo cuando la zona no figura ni en el catálogo ni en el servicio", () => {
    const [zone] = buildTodayZoneCoverage([{ service: service("a", ["z-q"], []), zoneResults: [] }], []);
    expect(zone!.zoneName).toBe("Zona no disponible");
  });
});

describe("loadTodayServiceCoverage", () => {
  it("recorre todas las páginas y completa los resultados por zona cuando el servicio no los trae", async () => {
    const list = vi.spyOn(servicesAdapter, "list").mockImplementation(async (query) => ({
      services: [service(`svc-${query?.page}`, ["z-x"], ["Zona X"])],
      total: 2, totalPages: 2, page: query?.page ?? 1, pageSize: 100,
    }));
    vi.spyOn(servicesAdapter, "get").mockImplementation(async (id) => ({ ...service(id, ["z-x"], ["Zona X"]), zoneResults: undefined }));
    const getZoneResults = vi.spyOn(servicesAdapter, "getZoneResults").mockResolvedValue([result("z-x", "SERVICED")]);

    const coverage = await loadTodayServiceCoverage("2026-09-05");

    expect(list.mock.calls.map(([query]) => query?.page)).toEqual([1, 2]);
    expect(coverage.map((item) => item.service.id)).toEqual(["svc-1", "svc-2"]);
    expect(getZoneResults).toHaveBeenCalledTimes(2);
    expect(coverage[0]!.zoneResults).toHaveLength(1);
  });
});

describe("operationalZonesAdapter.list", () => {
  it("permite pedir de nuevo después de una falla", async () => {
    const list = vi.spyOn(zonesAdapter, "list").mockRejectedValueOnce(new Error("caído"));
    await expect(operationalZonesAdapter.list()).rejects.toThrow("caído");

    list.mockResolvedValue({ zones: [], total: 0, page: 1, pageSize: 100, totalPages: 1 });
    expect(Array.isArray(await operationalZonesAdapter.list())).toBe(true);
    expect(list).toHaveBeenCalledTimes(2);
  });
});
