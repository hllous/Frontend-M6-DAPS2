import { z } from "zod";

import operationalZonesGeoJson from "@/data/operational-zones.json";

import type { Route } from "./routes";
import { routesAdapter } from "./routes";
import { servicesAdapter, type Service, type ZoneResult, type ZoneResultStatus } from "./services";
import { zonesAdapter, type Zone } from "./zones";

const coordinateSchema = z.tuple([z.number(), z.number()]);
const polygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(coordinateSchema)),
});

const operationalZonesGeoJsonSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(
    z.object({
      type: z.literal("Feature"),
      properties: z
        .object({
          id: z.number(),
          nombre: z.string(),
          zoneCode: z.string(),
          zoneName: z.string(),
        })
        .passthrough(),
      geometry: polygonSchema,
    }),
  ),
});

export type MapCoordinate = [number, number];

export type OperationalZoneGeometry = {
  code: string;
  name: string;
  sourceName: string;
  coordinates: MapCoordinate[][];
  center: MapCoordinate;
};

export type OperationalZone = OperationalZoneGeometry & {
  zone: Zone | null;
};

const parsedGeoJson = operationalZonesGeoJsonSchema.parse(operationalZonesGeoJson);

function toLeafletCoordinates(coordinates: [number, number][][]): MapCoordinate[][] {
  return coordinates.map((ring) => ring.map(([lng, lat]) => [lat, lng]));
}

function polygonCenter(coordinates: MapCoordinate[][]): MapCoordinate {
  const ring = coordinates[0] ?? [];
  if (ring.length < 3) return ring[0] ?? [-34.58, -58.42];

  let areaTwice = 0;
  let centerLat = 0;
  let centerLng = 0;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const [lat, lng] = ring[index]!;
    const [nextLat, nextLng] = ring[index + 1]!;
    const cross = lng * nextLat - nextLng * lat;
    areaTwice += cross;
    centerLat += (lat + nextLat) * cross;
    centerLng += (lng + nextLng) * cross;
  }

  if (Math.abs(areaTwice) < Number.EPSILON) {
    const [latTotal, lngTotal] = ring.reduce(
      ([lat, lng], [nextLat, nextLng]) => [lat + nextLat, lng + nextLng],
      [0, 0],
    );
    return [latTotal / ring.length, lngTotal / ring.length];
  }

  return [centerLat / (3 * areaTwice), centerLng / (3 * areaTwice)];
}

/**
 * Filtered from the official CABA Barrios GeoJSON using the backend's four
 * stable operational zone codes and the source barrio names. Source:
 * https://cdn.buenosaires.gob.ar/datosabiertos/datasets/innovacion-transformacion-digital/barrios/barrios.geojson
 * (CC-BY-2.5-AR).
 */
export const operationalZoneGeometries: OperationalZoneGeometry[] = parsedGeoJson.features.map(
  (feature) => {
    const coordinates = toLeafletCoordinates(feature.geometry.coordinates);
    return {
      code: feature.properties.zoneCode,
      name: feature.properties.zoneName,
      sourceName: feature.properties.nombre,
      coordinates,
      center: polygonCenter(coordinates),
    };
  },
);

export function resolveOperationalZones(zones: Zone[]): OperationalZone[] {
  return operationalZoneGeometries.map((geometry) => ({
    ...geometry,
    zone: zones.find((zone) => zone.code === geometry.code) ?? null,
  }));
}

export const operationalZonesAdapter = {
  async list(): Promise<OperationalZone[]> {
    const result = await zonesAdapter.list({ active: true, page: 1, pageSize: 100 });
    return resolveOperationalZones(result.zones);
  },
};

export type RouteStopOverlay = {
  id: string;
  sequence: number;
  estimatedDurationMin: number | null;
  zoneCode: string;
  zoneName: string;
  geometry: OperationalZoneGeometry | null;
};

const geometryByCode = new Map(operationalZoneGeometries.map((geometry) => [geometry.code, geometry]));

export function routeToStopOverlays(route: Route, zones: Zone[]): RouteStopOverlay[] {
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));

  return [...route.stops]
    .sort((left, right) => left.sequence - right.sequence)
    .map((stop) => {
      const zone = stop.zone ?? zoneById.get(stop.zoneId);
      const zoneCode = zone?.code ?? stop.zoneId;
      const zoneName = zone?.name ?? `Zona ${stop.zoneId}`;

      return {
        id: stop.id,
        sequence: stop.sequence,
        estimatedDurationMin: stop.estimatedDurationMin ?? null,
        zoneCode,
        zoneName,
        geometry: geometryByCode.get(zoneCode) ?? null,
      };
    });
}

export type TodayServiceCoverage = {
  service: Service;
  zoneResults: ZoneResult[];
};

export type TodayZoneCoverage = {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  status: ZoneResultStatus | "PENDING";
  serviceCount: number;
  resultCount: number;
  geometry: OperationalZoneGeometry | null;
};

const coveragePriority: Record<TodayZoneCoverage["status"], number> = {
  PENDING: 0,
  SERVICED: 1,
  PARTIAL: 2,
  NOT_SERVICED: 3,
};

function combineCoverageStatus(
  current: TodayZoneCoverage["status"],
  next: TodayZoneCoverage["status"],
): TodayZoneCoverage["status"] {
  return coveragePriority[next] > coveragePriority[current] ? next : current;
}

export function buildTodayZoneCoverage(
  services: TodayServiceCoverage[],
  zones: Zone[],
): TodayZoneCoverage[] {
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
  const coverageByZone = new Map<string, TodayZoneCoverage>();

  for (const { service, zoneResults } of services) {
    for (const [index, zoneId] of service.zoneIds.entries()) {
      const zone = zoneById.get(zoneId);
      const result = zoneResults.find((candidate) => candidate.zoneId === zoneId);
      const zoneCode = zone?.code ?? `Z-${zoneId}`;
      const zoneName = zone?.name ?? service.zoneNames[index] ?? `Zona ${zoneId}`;
      const current = coverageByZone.get(zoneId);

      if (!current) {
        coverageByZone.set(zoneId, {
          zoneId,
          zoneCode,
          zoneName,
          status: result?.status ?? "PENDING",
          serviceCount: 1,
          resultCount: result ? 1 : 0,
          geometry: geometryByCode.get(zoneCode) ?? null,
        });
        continue;
      }

      current.status = combineCoverageStatus(current.status, result?.status ?? "PENDING");
      current.serviceCount += 1;
      current.resultCount += result ? 1 : 0;
    }
  }

  return [...coverageByZone.values()].sort((left, right) => left.zoneName.localeCompare(right.zoneName, "es"));
}

export async function loadTodayServiceCoverage(
  scheduledDate: string,
): Promise<TodayServiceCoverage[]> {
  const page = await servicesAdapter.list({
    scheduledFrom: scheduledDate,
    scheduledTo: scheduledDate,
    page: 1,
    pageSize: 100,
  });

  return Promise.all(
    page.services.map(async (summary) => {
      const service = await servicesAdapter.get(summary.id);
      const zoneResults = service.zoneResults ?? (await servicesAdapter.getZoneResults(service.id));
      return { service, zoneResults };
    }),
  );
}

export async function loadRoute(routeId: string): Promise<Route> {
  return routesAdapter.get(routeId);
}
