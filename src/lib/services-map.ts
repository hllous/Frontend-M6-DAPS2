import type { Container } from "./containers";
import type { GreenPoint } from "./green-points";
import type { GreenSpace } from "./green-spaces";
import {
  isCoordinateInsideOperationalZone,
  type MapCoordinate,
  type OperationalZone,
} from "./operational-zones";
import type { OperationalMapData } from "./operational-map";
import type { Service } from "./services";
import type { Tree } from "./trees";

export type ServiceMapZone = {
  zoneId: string;
  code: string;
  name: string;
  coordinates: OperationalZone["coordinates"];
  center: MapCoordinate;
};

export type ServiceMapLocation = {
  serviceId: string;
  coordinates: MapCoordinate | null;
  /**
   * `unverified`: the target has coordinates but the service zone snapshot is
   * missing, so the point cannot be checked against its zone and is not plotted.
   */
  locationType: "point" | "route" | "unresolved" | "unverified";
  locationLabel: string | null;
  zones: ServiceMapZone[];
};

type LocatedCatalogItem =
  | Pick<Container, "id" | "address" | "lat" | "lng">
  | Pick<GreenPoint, "id" | "address" | "lat" | "lng">
  | Pick<GreenSpace, "id" | "name" | "lat" | "lng">
  | Pick<Tree, "id" | "address" | "lat" | "lng" | "surveyCode">;

function hasCoordinates(item: LocatedCatalogItem | undefined): item is LocatedCatalogItem & { lat: number; lng: number } {
  return item?.lat !== null && item?.lat !== undefined && item?.lng !== null && item?.lng !== undefined;
}

function serviceZones(service: Service, zones: OperationalZone[]): ServiceMapZone[] {
  const zoneById = new Map(
    zones.flatMap((record) => (record.zone ? [[record.zone.id, record] as const] : [])),
  );

  return service.zoneIds.flatMap((zoneId) => {
    const record = zoneById.get(zoneId);
    if (!record) return [];

    return [{
      zoneId,
      code: record.code,
      name: record.name,
      coordinates: record.coordinates,
      center: record.center,
    }];
  });
}

function targetForService(service: Service, mapData: OperationalMapData): LocatedCatalogItem | undefined {
  if (!service.targetId) return undefined;

  if (service.targetType === "CONTAINER") {
    return mapData.containers.find((item) => item.id === service.targetId);
  }
  if (service.targetType === "TREE") {
    return mapData.trees.find((item) => item.id === service.targetId);
  }
  if (service.targetType === "GREEN_POINT") {
    return mapData.greenPoints.find((item) => item.id === service.targetId);
  }
  if (service.targetType === "GREEN_SPACE") {
    return mapData.greenSpaces.find((item) => item.id === service.targetId);
  }

  return undefined;
}

function targetLabel(target: LocatedCatalogItem): string {
  if ("name" in target) return target.name;
  if ("surveyCode" in target) return target.address ?? target.surveyCode;
  return target.address ?? target.id;
}

function averageCoordinates(coordinates: MapCoordinate[]): MapCoordinate | null {
  if (coordinates.length === 0) return null;

  const totals = coordinates.reduce(
    ([lat, lng], [nextLat, nextLng]) => [lat + nextLat, lng + nextLng],
    [0, 0],
  );
  return [totals[0] / coordinates.length, totals[1] / coordinates.length];
}

function resolvePointLocation(
  service: Service,
  mapData: OperationalMapData,
  zones: OperationalZone[],
): Omit<ServiceMapLocation, "serviceId"> {
  const target = targetForService(service, mapData);
  const targetZones = serviceZones(service, zones);

  if (!hasCoordinates(target)) {
    return {
      coordinates: null,
      locationType: "unresolved",
      locationLabel: null,
      zones: targetZones,
    };
  }

  // A catalog coordinate is only plotted after it is verified against the zone
  // snapshot used by the service, which prevents rendering a valid-looking
  // point in the wrong zone. When no zone resolves the check cannot run, so the
  // item is reported as unverified instead of being plotted unchecked.
  if (targetZones.length === 0) {
    return {
      coordinates: null,
      locationType: "unverified",
      locationLabel: targetLabel(target),
      zones: targetZones,
    };
  }

  const targetMatchesZone = targetZones.some((zone) =>
    isCoordinateInsideOperationalZone([target.lat, target.lng], zone),
  );

  if (!targetMatchesZone) {
    return {
      coordinates: null,
      locationType: "unresolved",
      locationLabel: null,
      zones: targetZones,
    };
  }

  return {
    coordinates: [target.lat, target.lng],
    locationType: "point",
    locationLabel: targetLabel(target),
    zones: targetZones,
  };
}

function resolveRouteLocation(service: Service, zones: OperationalZone[]): Omit<ServiceMapLocation, "serviceId"> {
  const serviceZonesResolved = serviceZones(service, zones);
  const coordinates = averageCoordinates(serviceZonesResolved.map((zone) => zone.center));

  return {
    coordinates,
    locationType: coordinates ? "route" : "unresolved",
    locationLabel: serviceZonesResolved.length > 0
      ? serviceZonesResolved.map((zone) => `${zone.code} · ${zone.name}`).join(" · ")
      : null,
    zones: serviceZonesResolved,
  };
}

export function resolveServiceMapLocations(
  services: Service[],
  mapData: OperationalMapData,
  zones: OperationalZone[],
): ServiceMapLocation[] {
  return services.map((service) => ({
    serviceId: service.id,
    ...(service.mode === "POINT"
      ? resolvePointLocation(service, mapData, zones)
      : resolveRouteLocation(service, zones)),
  }));
}

export type ServiceMapZoneSummary = {
  zone: ServiceMapZone;
  serviceIds: string[];
};

/** Groups every service (point or route) under each zone it belongs to. */
export function summarizeServiceZones(locations: ServiceMapLocation[]): ServiceMapZoneSummary[] {
  const zonesById = new Map<string, ServiceMapZoneSummary>();

  for (const location of locations) {
    for (const zone of location.zones) {
      const current = zonesById.get(zone.zoneId) ?? { zone, serviceIds: [] };
      if (!current.serviceIds.includes(location.serviceId)) current.serviceIds.push(location.serviceId);
      zonesById.set(zone.zoneId, current);
    }
  }

  return [...zonesById.values()];
}
