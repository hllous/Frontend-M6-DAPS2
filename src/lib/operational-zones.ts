import { z } from "zod";

import operationalZonesGeoJson from "@/data/operational-zones.json";

import type { Route } from "./routes";
import { routesAdapter } from "./routes";
import { servicesAdapter, type Service, type ZoneResult, type ZoneResultStatus } from "./services";
import { zonesAdapter, type Zone } from "./zones";

const coordinateSchema = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90),
]);
const linearRingSchema = z.array(coordinateSchema).min(4).superRefine((ring, context) => {
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
    context.addIssue({ code: "custom", message: "A GeoJSON linear ring must be closed." });
  }
});
const polygonCoordinatesSchema = z.array(linearRingSchema).min(1);
const polygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: polygonCoordinatesSchema,
});
const multiPolygonSchema = z.object({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(polygonCoordinatesSchema).min(1),
});
const geometrySchema = z.discriminatedUnion("type", [polygonSchema, multiPolygonSchema]);

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
      geometry: geometrySchema,
    }),
  ),
});

export type MapCoordinate = [number, number];
export type MapPolygon = MapCoordinate[][];

export type OperationalZoneGeometry = {
  code: string;
  name: string;
  sourceName: string;
  coordinates: MapPolygon[];
  center: MapCoordinate;
};

export type OperationalZone = OperationalZoneGeometry & {
  zone: Zone | null;
};

export function safeParseOperationalZoneGeoJson(value: unknown) {
  return operationalZonesGeoJsonSchema.safeParse(value);
}

function toLeafletPolygon(coordinates: z.infer<typeof polygonCoordinatesSchema>): MapPolygon {
  return coordinates.map((ring) => ring.map(([lng, lat]) => [lat, lng]));
}

function toLeafletPolygons(geometry: z.infer<typeof geometrySchema>): MapPolygon[] {
  return geometry.type === "Polygon"
    ? [toLeafletPolygon(geometry.coordinates)]
    : geometry.coordinates.map(toLeafletPolygon);
}

export function parseOperationalZoneGeoJson(value: unknown): OperationalZoneGeometry[] {
  const parsed = safeParseOperationalZoneGeoJson(value);
  if (!parsed.success) {
    console.error("Operational zone GeoJSON is invalid; zone overlays are disabled.", parsed.error);
    return [];
  }

  return parsed.data.features.map((feature) => {
    const coordinates = toLeafletPolygons(feature.geometry);
    return {
      code: feature.properties.zoneCode,
      name: feature.properties.zoneName,
      sourceName: feature.properties.nombre,
      coordinates,
      center: polygonCenter(coordinates),
    };
  });
}

let cachedOperationalZoneGeometries: OperationalZoneGeometry[] | undefined;

export function getOperationalZoneGeometries(): OperationalZoneGeometry[] {
  if (cachedOperationalZoneGeometries) return cachedOperationalZoneGeometries;
  cachedOperationalZoneGeometries = parseOperationalZoneGeoJson(operationalZonesGeoJson);
  return cachedOperationalZoneGeometries;
}

const boundaryTolerance = 1e-8;

function isPointOnSegment(
  [pointLat, pointLng]: MapCoordinate,
  [firstLat, firstLng]: MapCoordinate,
  [lastLat, lastLng]: MapCoordinate,
): boolean {
  const deltaLat = lastLat - firstLat;
  const deltaLng = lastLng - firstLng;
  const cross = (pointLng - firstLng) * deltaLat - (pointLat - firstLat) * deltaLng;
  const scale = Math.max(1, Math.hypot(deltaLat, deltaLng));

  return (
    Math.abs(cross) <= boundaryTolerance * scale &&
    pointLat >= Math.min(firstLat, lastLat) - boundaryTolerance &&
    pointLat <= Math.max(firstLat, lastLat) + boundaryTolerance &&
    pointLng >= Math.min(firstLng, lastLng) - boundaryTolerance &&
    pointLng <= Math.max(firstLng, lastLng) + boundaryTolerance
  );
}

function isPointInRing(
  [pointLat, pointLng]: MapCoordinate,
  ring: MapCoordinate[],
  includeBoundary: boolean,
): boolean {
  if (ring.length < 3) return false;
  let inside = false;

  for (let index = 0, previousIndex = ring.length - 1; index < ring.length; previousIndex = index++) {
    const [lat, lng] = ring[index]!;
    const [previousLat, previousLng] = ring[previousIndex]!;
    if (isPointOnSegment([pointLat, pointLng], [lat, lng], [previousLat, previousLng])) {
      return includeBoundary;
    }

    const crossesLatitude = (lat > pointLat) !== (previousLat > pointLat);
    const boundaryLng =
      ((previousLng - lng) * (pointLat - lat)) / (previousLat - lat) + lng;

    if (crossesLatitude && pointLng < boundaryLng) inside = !inside;
  }

  return inside;
}

/** Returns whether a Leaflet [latitude, longitude] coordinate belongs to a zone polygon. */
export function isCoordinateInsideOperationalZone(
  coordinate: MapCoordinate,
  geometry: Pick<OperationalZoneGeometry, "coordinates">,
): boolean {
  return geometry.coordinates.some(([outerRing, ...holes]) =>
    Boolean(outerRing && isPointInRing(coordinate, outerRing, true)) &&
      holes.every((hole) => !isPointInRing(coordinate, hole, false)),
  );
}

function ringDoubleArea(ring: MapCoordinate[]): number {
  let areaTwice = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [lat, lng] = ring[index]!;
    const [nextLat, nextLng] = ring[index + 1]!;
    areaTwice += lng * nextLat - nextLng * lat;
  }
  return areaTwice;
}

function ringCenter(ring: MapCoordinate[]): MapCoordinate {
  if (ring.length < 3) return ring[0] ?? [-34.58, -58.42];

  const areaTwice = ringDoubleArea(ring);
  let centerLat = 0;
  let centerLng = 0;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const [lat, lng] = ring[index]!;
    const [nextLat, nextLng] = ring[index + 1]!;
    const cross = lng * nextLat - nextLng * lat;
    centerLat += (lat + nextLat) * cross;
    centerLng += (lng + nextLng) * cross;
  }

  if (Math.abs(areaTwice) < Number.EPSILON) {
    const distinctRing = ring.slice(0, -1);
    const [latTotal, lngTotal] = distinctRing.reduce(
      ([lat, lng], [nextLat, nextLng]) => [lat + nextLat, lng + nextLng],
      [0, 0],
    );
    return [latTotal / distinctRing.length, lngTotal / distinctRing.length];
  }

  return [centerLat / (3 * areaTwice), centerLng / (3 * areaTwice)];
}

function polygonCenter(coordinates: MapPolygon[]): MapCoordinate {
  const outerRings = coordinates.map((polygon) => polygon[0] ?? []);
  const largestOuterRing = outerRings.reduce((largest, ring) =>
    Math.abs(ringDoubleArea(ring)) > Math.abs(ringDoubleArea(largest)) ? ring : largest,
  );
  return ringCenter(largestOuterRing);
}

/**
 * Filtered from the official CABA Barrios GeoJSON using the backend's eight
 * stable operational zone codes and the source barrio names. Source:
 * https://cdn.buenosaires.gob.ar/datosabiertos/datasets/innovacion-transformacion-digital/barrios/barrios.geojson
 * (CC-BY-2.5-AR).
 */
export function resolveOperationalZones(
  zones: Zone[],
  geometries: OperationalZoneGeometry[] = getOperationalZoneGeometries(),
): OperationalZone[] {
  return geometries.map((geometry) => ({
    ...geometry,
    zone: zones.find((zone) => zone.code === geometry.code) ?? null,
  }));
}

export const operationalZonesAdapter = {
  async list(): Promise<OperationalZone[]> {
    const result = await zonesAdapter.list({ active: true, page: 1, pageSize: 100 });
    return resolveOperationalZones(result.zones, getOperationalZoneGeometries());
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

export function routeToStopOverlays(route: Route, zones: Zone[]): RouteStopOverlay[] {
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
  const geometryByCode = new Map(getOperationalZoneGeometries().map((geometry) => [geometry.code, geometry]));

  return [...route.stops]
    .sort((left, right) => left.sequence - right.sequence)
    .map((stop) => {
      // Prefer the current catalog record: the stop's zoneCode/zoneName may be a
      // stale snapshot while the catalog already has the canonical code.
      const zone = zoneById.get(stop.zoneId);
      const zoneCode = zone?.code ?? stop.zoneCode;
      const zoneName = zone?.name ?? stop.zoneName;

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
  const geometryByCode = new Map(getOperationalZoneGeometries().map((geometry) => [geometry.code, geometry]));
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
