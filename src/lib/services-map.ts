import type { Container } from "./containers";
import type { GreenPoint } from "./green-points";
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
  locationType: "point" | "route" | "unresolved";
  locationLabel: string | null;
  zones: ServiceMapZone[];
};

type LocatedCatalogItem = Pick<Container, "id" | "address" | "lat" | "lng"> | Pick<GreenPoint, "id" | "address" | "lat" | "lng"> | Pick<Tree, "id" | "address" | "lat" | "lng" | "surveyCode">;

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

  return undefined;
}

function targetLabel(target: LocatedCatalogItem): string {
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

  // A catalog coordinate is authoritative, but when the canonical zone is
  // available also verify that it belongs to the zone snapshot used by the
  // service. This prevents rendering a valid-looking point in the wrong zone.
  const targetMatchesZone = targetZones.length === 0 || targetZones.some((zone) =>
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
