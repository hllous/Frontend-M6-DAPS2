// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import type { Container } from "./containers";
import type { GreenPoint } from "./green-points";
import type { GreenSpace } from "./green-spaces";
import { isCoordinateInsideOperationalZone, type MapCoordinate, type OperationalZone } from "./operational-zones";
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
type LocatedCatalogItem = Pick<Container, "id" | "address" | "lat" | "lng"> | Pick<GreenPoint, "id" | "address" | "lat" | "lng"> | Pick<GreenSpace, "id" | "name" | "lat" | "lng"> | Pick<Tree, "id" | "address" | "lat" | "lng" | "surveyCode">;
function hasCoordinates(item: LocatedCatalogItem | undefined): item is LocatedCatalogItem & {
  lat: number;
  lng: number;
} {
  if (stryMutAct_9fa48("14266")) {
    {}
  } else {
    stryCov_9fa48("14266");
    return stryMutAct_9fa48("14269") ? item?.lat !== null && item?.lat !== undefined && item?.lng !== null || item?.lng !== undefined : stryMutAct_9fa48("14268") ? false : stryMutAct_9fa48("14267") ? true : (stryCov_9fa48("14267", "14268", "14269"), (stryMutAct_9fa48("14271") ? item?.lat !== null && item?.lat !== undefined || item?.lng !== null : stryMutAct_9fa48("14270") ? true : (stryCov_9fa48("14270", "14271"), (stryMutAct_9fa48("14273") ? item?.lat !== null || item?.lat !== undefined : stryMutAct_9fa48("14272") ? true : (stryCov_9fa48("14272", "14273"), (stryMutAct_9fa48("14275") ? item?.lat === null : stryMutAct_9fa48("14274") ? true : (stryCov_9fa48("14274", "14275"), (stryMutAct_9fa48("14276") ? item.lat : (stryCov_9fa48("14276"), item?.lat)) !== null)) && (stryMutAct_9fa48("14278") ? item?.lat === undefined : stryMutAct_9fa48("14277") ? true : (stryCov_9fa48("14277", "14278"), (stryMutAct_9fa48("14279") ? item.lat : (stryCov_9fa48("14279"), item?.lat)) !== undefined)))) && (stryMutAct_9fa48("14281") ? item?.lng === null : stryMutAct_9fa48("14280") ? true : (stryCov_9fa48("14280", "14281"), (stryMutAct_9fa48("14282") ? item.lng : (stryCov_9fa48("14282"), item?.lng)) !== null)))) && (stryMutAct_9fa48("14284") ? item?.lng === undefined : stryMutAct_9fa48("14283") ? true : (stryCov_9fa48("14283", "14284"), (stryMutAct_9fa48("14285") ? item.lng : (stryCov_9fa48("14285"), item?.lng)) !== undefined)));
  }
}
function serviceZones(service: Service, zones: OperationalZone[]): ServiceMapZone[] {
  if (stryMutAct_9fa48("14286")) {
    {}
  } else {
    stryCov_9fa48("14286");
    const zoneById = new Map(zones.flatMap(stryMutAct_9fa48("14287") ? () => undefined : (stryCov_9fa48("14287"), record => record.zone ? stryMutAct_9fa48("14288") ? [] : (stryCov_9fa48("14288"), [[record.zone.id, record] as const]) : stryMutAct_9fa48("14289") ? ["Stryker was here"] : (stryCov_9fa48("14289"), []))));
    return service.zoneIds.flatMap(zoneId => {
      if (stryMutAct_9fa48("14290")) {
        {}
      } else {
        stryCov_9fa48("14290");
        const record = zoneById.get(zoneId);
        if (stryMutAct_9fa48("14293") ? false : stryMutAct_9fa48("14292") ? true : stryMutAct_9fa48("14291") ? record : (stryCov_9fa48("14291", "14292", "14293"), !record)) return stryMutAct_9fa48("14294") ? ["Stryker was here"] : (stryCov_9fa48("14294"), []);
        return stryMutAct_9fa48("14295") ? [] : (stryCov_9fa48("14295"), [stryMutAct_9fa48("14296") ? {} : (stryCov_9fa48("14296"), {
          zoneId,
          code: record.code,
          name: record.name,
          coordinates: record.coordinates,
          center: record.center
        })]);
      }
    });
  }
}
function targetForService(service: Service, mapData: OperationalMapData): LocatedCatalogItem | undefined {
  if (stryMutAct_9fa48("14297")) {
    {}
  } else {
    stryCov_9fa48("14297");
    if (stryMutAct_9fa48("14300") ? false : stryMutAct_9fa48("14299") ? true : stryMutAct_9fa48("14298") ? service.targetId : (stryCov_9fa48("14298", "14299", "14300"), !service.targetId)) return undefined;
    if (stryMutAct_9fa48("14303") ? service.targetType !== "CONTAINER" : stryMutAct_9fa48("14302") ? false : stryMutAct_9fa48("14301") ? true : (stryCov_9fa48("14301", "14302", "14303"), service.targetType === (stryMutAct_9fa48("14304") ? "" : (stryCov_9fa48("14304"), "CONTAINER")))) {
      if (stryMutAct_9fa48("14305")) {
        {}
      } else {
        stryCov_9fa48("14305");
        return mapData.containers.find(stryMutAct_9fa48("14306") ? () => undefined : (stryCov_9fa48("14306"), item => stryMutAct_9fa48("14309") ? item.id !== service.targetId : stryMutAct_9fa48("14308") ? false : stryMutAct_9fa48("14307") ? true : (stryCov_9fa48("14307", "14308", "14309"), item.id === service.targetId)));
      }
    }
    if (stryMutAct_9fa48("14312") ? service.targetType !== "TREE" : stryMutAct_9fa48("14311") ? false : stryMutAct_9fa48("14310") ? true : (stryCov_9fa48("14310", "14311", "14312"), service.targetType === (stryMutAct_9fa48("14313") ? "" : (stryCov_9fa48("14313"), "TREE")))) {
      if (stryMutAct_9fa48("14314")) {
        {}
      } else {
        stryCov_9fa48("14314");
        return mapData.trees.find(stryMutAct_9fa48("14315") ? () => undefined : (stryCov_9fa48("14315"), item => stryMutAct_9fa48("14318") ? item.id !== service.targetId : stryMutAct_9fa48("14317") ? false : stryMutAct_9fa48("14316") ? true : (stryCov_9fa48("14316", "14317", "14318"), item.id === service.targetId)));
      }
    }
    if (stryMutAct_9fa48("14321") ? service.targetType !== "GREEN_POINT" : stryMutAct_9fa48("14320") ? false : stryMutAct_9fa48("14319") ? true : (stryCov_9fa48("14319", "14320", "14321"), service.targetType === (stryMutAct_9fa48("14322") ? "" : (stryCov_9fa48("14322"), "GREEN_POINT")))) {
      if (stryMutAct_9fa48("14323")) {
        {}
      } else {
        stryCov_9fa48("14323");
        return mapData.greenPoints.find(stryMutAct_9fa48("14324") ? () => undefined : (stryCov_9fa48("14324"), item => stryMutAct_9fa48("14327") ? item.id !== service.targetId : stryMutAct_9fa48("14326") ? false : stryMutAct_9fa48("14325") ? true : (stryCov_9fa48("14325", "14326", "14327"), item.id === service.targetId)));
      }
    }
    if (stryMutAct_9fa48("14330") ? service.targetType !== "GREEN_SPACE" : stryMutAct_9fa48("14329") ? false : stryMutAct_9fa48("14328") ? true : (stryCov_9fa48("14328", "14329", "14330"), service.targetType === (stryMutAct_9fa48("14331") ? "" : (stryCov_9fa48("14331"), "GREEN_SPACE")))) {
      if (stryMutAct_9fa48("14332")) {
        {}
      } else {
        stryCov_9fa48("14332");
        return mapData.greenSpaces.find(stryMutAct_9fa48("14333") ? () => undefined : (stryCov_9fa48("14333"), item => stryMutAct_9fa48("14336") ? item.id !== service.targetId : stryMutAct_9fa48("14335") ? false : stryMutAct_9fa48("14334") ? true : (stryCov_9fa48("14334", "14335", "14336"), item.id === service.targetId)));
      }
    }
    return undefined;
  }
}
function targetLabel(target: LocatedCatalogItem): string {
  if (stryMutAct_9fa48("14337")) {
    {}
  } else {
    stryCov_9fa48("14337");
    if (stryMutAct_9fa48("14339") ? false : stryMutAct_9fa48("14338") ? true : (stryCov_9fa48("14338", "14339"), (stryMutAct_9fa48("14340") ? "" : (stryCov_9fa48("14340"), "name")) in target)) return target.name;
    if (stryMutAct_9fa48("14342") ? false : stryMutAct_9fa48("14341") ? true : (stryCov_9fa48("14341", "14342"), (stryMutAct_9fa48("14343") ? "" : (stryCov_9fa48("14343"), "surveyCode")) in target)) return stryMutAct_9fa48("14344") ? target.address && target.surveyCode : (stryCov_9fa48("14344"), target.address ?? target.surveyCode);
    return stryMutAct_9fa48("14345") ? target.address && target.id : (stryCov_9fa48("14345"), target.address ?? target.id);
  }
}
function averageCoordinates(coordinates: MapCoordinate[]): MapCoordinate | null {
  if (stryMutAct_9fa48("14346")) {
    {}
  } else {
    stryCov_9fa48("14346");
    if (stryMutAct_9fa48("14349") ? coordinates.length !== 0 : stryMutAct_9fa48("14348") ? false : stryMutAct_9fa48("14347") ? true : (stryCov_9fa48("14347", "14348", "14349"), coordinates.length === 0)) return null;
    const totals = coordinates.reduce(stryMutAct_9fa48("14350") ? () => undefined : (stryCov_9fa48("14350"), ([lat, lng], [nextLat, nextLng]) => stryMutAct_9fa48("14351") ? [] : (stryCov_9fa48("14351"), [stryMutAct_9fa48("14352") ? lat - nextLat : (stryCov_9fa48("14352"), lat + nextLat), stryMutAct_9fa48("14353") ? lng - nextLng : (stryCov_9fa48("14353"), lng + nextLng)])), stryMutAct_9fa48("14354") ? [] : (stryCov_9fa48("14354"), [0, 0]));
    return stryMutAct_9fa48("14355") ? [] : (stryCov_9fa48("14355"), [stryMutAct_9fa48("14356") ? totals[0] * coordinates.length : (stryCov_9fa48("14356"), totals[0] / coordinates.length), stryMutAct_9fa48("14357") ? totals[1] * coordinates.length : (stryCov_9fa48("14357"), totals[1] / coordinates.length)]);
  }
}
function resolvePointLocation(service: Service, mapData: OperationalMapData, zones: OperationalZone[]): Omit<ServiceMapLocation, "serviceId"> {
  if (stryMutAct_9fa48("14358")) {
    {}
  } else {
    stryCov_9fa48("14358");
    const target = targetForService(service, mapData);
    const targetZones = serviceZones(service, zones);
    if (stryMutAct_9fa48("14361") ? false : stryMutAct_9fa48("14360") ? true : stryMutAct_9fa48("14359") ? hasCoordinates(target) : (stryCov_9fa48("14359", "14360", "14361"), !hasCoordinates(target))) {
      if (stryMutAct_9fa48("14362")) {
        {}
      } else {
        stryCov_9fa48("14362");
        return stryMutAct_9fa48("14363") ? {} : (stryCov_9fa48("14363"), {
          coordinates: null,
          locationType: stryMutAct_9fa48("14364") ? "" : (stryCov_9fa48("14364"), "unresolved"),
          locationLabel: null,
          zones: targetZones
        });
      }
    }

    // A catalog coordinate is only plotted after it is verified against the zone
    // snapshot used by the service, which prevents rendering a valid-looking
    // point in the wrong zone. When no zone resolves the check cannot run, so the
    // item is reported as unverified instead of being plotted unchecked.
    if (stryMutAct_9fa48("14367") ? targetZones.length !== 0 : stryMutAct_9fa48("14366") ? false : stryMutAct_9fa48("14365") ? true : (stryCov_9fa48("14365", "14366", "14367"), targetZones.length === 0)) {
      if (stryMutAct_9fa48("14368")) {
        {}
      } else {
        stryCov_9fa48("14368");
        return stryMutAct_9fa48("14369") ? {} : (stryCov_9fa48("14369"), {
          coordinates: null,
          locationType: stryMutAct_9fa48("14370") ? "" : (stryCov_9fa48("14370"), "unverified"),
          locationLabel: targetLabel(target),
          zones: targetZones
        });
      }
    }
    const targetMatchesZone = stryMutAct_9fa48("14371") ? targetZones.every(zone => isCoordinateInsideOperationalZone([target.lat, target.lng], zone)) : (stryCov_9fa48("14371"), targetZones.some(stryMutAct_9fa48("14372") ? () => undefined : (stryCov_9fa48("14372"), zone => isCoordinateInsideOperationalZone(stryMutAct_9fa48("14373") ? [] : (stryCov_9fa48("14373"), [target.lat, target.lng]), zone))));
    if (stryMutAct_9fa48("14376") ? false : stryMutAct_9fa48("14375") ? true : stryMutAct_9fa48("14374") ? targetMatchesZone : (stryCov_9fa48("14374", "14375", "14376"), !targetMatchesZone)) {
      if (stryMutAct_9fa48("14377")) {
        {}
      } else {
        stryCov_9fa48("14377");
        return stryMutAct_9fa48("14378") ? {} : (stryCov_9fa48("14378"), {
          coordinates: null,
          locationType: stryMutAct_9fa48("14379") ? "" : (stryCov_9fa48("14379"), "unresolved"),
          locationLabel: null,
          zones: targetZones
        });
      }
    }
    return stryMutAct_9fa48("14380") ? {} : (stryCov_9fa48("14380"), {
      coordinates: stryMutAct_9fa48("14381") ? [] : (stryCov_9fa48("14381"), [target.lat, target.lng]),
      locationType: stryMutAct_9fa48("14382") ? "" : (stryCov_9fa48("14382"), "point"),
      locationLabel: targetLabel(target),
      zones: targetZones
    });
  }
}
function resolveRouteLocation(service: Service, zones: OperationalZone[]): Omit<ServiceMapLocation, "serviceId"> {
  if (stryMutAct_9fa48("14383")) {
    {}
  } else {
    stryCov_9fa48("14383");
    const serviceZonesResolved = serviceZones(service, zones);
    const coordinates = averageCoordinates(serviceZonesResolved.map(stryMutAct_9fa48("14384") ? () => undefined : (stryCov_9fa48("14384"), zone => zone.center)));
    return stryMutAct_9fa48("14385") ? {} : (stryCov_9fa48("14385"), {
      coordinates,
      locationType: coordinates ? stryMutAct_9fa48("14386") ? "" : (stryCov_9fa48("14386"), "route") : stryMutAct_9fa48("14387") ? "" : (stryCov_9fa48("14387"), "unresolved"),
      locationLabel: (stryMutAct_9fa48("14391") ? serviceZonesResolved.length <= 0 : stryMutAct_9fa48("14390") ? serviceZonesResolved.length >= 0 : stryMutAct_9fa48("14389") ? false : stryMutAct_9fa48("14388") ? true : (stryCov_9fa48("14388", "14389", "14390", "14391"), serviceZonesResolved.length > 0)) ? serviceZonesResolved.map(stryMutAct_9fa48("14392") ? () => undefined : (stryCov_9fa48("14392"), zone => zone.name)).join(stryMutAct_9fa48("14393") ? "" : (stryCov_9fa48("14393"), " · ")) : null,
      zones: serviceZonesResolved
    });
  }
}
export function resolveServiceMapLocations(services: Service[], mapData: OperationalMapData, zones: OperationalZone[]): ServiceMapLocation[] {
  if (stryMutAct_9fa48("14394")) {
    {}
  } else {
    stryCov_9fa48("14394");
    return services.map(stryMutAct_9fa48("14395") ? () => undefined : (stryCov_9fa48("14395"), service => stryMutAct_9fa48("14396") ? {} : (stryCov_9fa48("14396"), {
      serviceId: service.id,
      ...((stryMutAct_9fa48("14399") ? service.mode !== "POINT" : stryMutAct_9fa48("14398") ? false : stryMutAct_9fa48("14397") ? true : (stryCov_9fa48("14397", "14398", "14399"), service.mode === (stryMutAct_9fa48("14400") ? "" : (stryCov_9fa48("14400"), "POINT")))) ? resolvePointLocation(service, mapData, zones) : resolveRouteLocation(service, zones))
    })));
  }
}
export type ServiceMapZoneSummary = {
  zone: ServiceMapZone;
  serviceIds: string[];
};

/** Groups every service (point or route) under each zone it belongs to. */
export function summarizeServiceZones(locations: ServiceMapLocation[]): ServiceMapZoneSummary[] {
  if (stryMutAct_9fa48("14401")) {
    {}
  } else {
    stryCov_9fa48("14401");
    const zonesById = new Map<string, ServiceMapZoneSummary>();
    for (const location of locations) {
      if (stryMutAct_9fa48("14402")) {
        {}
      } else {
        stryCov_9fa48("14402");
        for (const zone of location.zones) {
          if (stryMutAct_9fa48("14403")) {
            {}
          } else {
            stryCov_9fa48("14403");
            const current = stryMutAct_9fa48("14404") ? zonesById.get(zone.zoneId) && {
              zone,
              serviceIds: []
            } : (stryCov_9fa48("14404"), zonesById.get(zone.zoneId) ?? (stryMutAct_9fa48("14405") ? {} : (stryCov_9fa48("14405"), {
              zone,
              serviceIds: stryMutAct_9fa48("14406") ? ["Stryker was here"] : (stryCov_9fa48("14406"), [])
            })));
            if (stryMutAct_9fa48("14409") ? false : stryMutAct_9fa48("14408") ? true : stryMutAct_9fa48("14407") ? current.serviceIds.includes(location.serviceId) : (stryCov_9fa48("14407", "14408", "14409"), !current.serviceIds.includes(location.serviceId))) if (stryMutAct_9fa48("14410")) {
              ;
            } else {
              stryCov_9fa48("14410");
              current.serviceIds.push(location.serviceId);
            }
            if (stryMutAct_9fa48("14411")) {
              ;
            } else {
              stryCov_9fa48("14411");
              zonesById.set(zone.zoneId, current);
            }
          }
        }
      }
    }
    return stryMutAct_9fa48("14412") ? [] : (stryCov_9fa48("14412"), [...zonesById.values()]);
  }
}