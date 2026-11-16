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
import { z } from "zod";
import type { Route } from "./routes";
import { routesAdapter } from "./routes";
import { servicesAdapter, type Service, type ZoneResult, type ZoneResultStatus } from "./services";
import { zonesAdapter, type Zone } from "./zones";
import { mapWithConcurrency } from "./map-concurrency";
const coordinateSchema = z.tuple(stryMutAct_9fa48("11982") ? [] : (stryCov_9fa48("11982"), [stryMutAct_9fa48("11984") ? z.number().finite().max(-180).max(180) : stryMutAct_9fa48("11983") ? z.number().finite().min(-180).min(180) : (stryCov_9fa48("11983", "11984"), z.number().finite().min(stryMutAct_9fa48("11985") ? +180 : (stryCov_9fa48("11985"), -180)).max(180)), stryMutAct_9fa48("11987") ? z.number().finite().max(-90).max(90) : stryMutAct_9fa48("11986") ? z.number().finite().min(-90).min(90) : (stryCov_9fa48("11986", "11987"), z.number().finite().min(stryMutAct_9fa48("11988") ? +90 : (stryCov_9fa48("11988"), -90)).max(90))]));
const linearRingSchema = stryMutAct_9fa48("11989") ? z.array(coordinateSchema).max(4).superRefine((ring, context) => {
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
    context.addIssue({
      code: "custom",
      message: "A GeoJSON linear ring must be closed."
    });
  }
}) : (stryCov_9fa48("11989"), z.array(coordinateSchema).min(4).superRefine((ring, context) => {
  if (stryMutAct_9fa48("11990")) {
    {}
  } else {
    stryCov_9fa48("11990");
    const first = ring[0];
    const last = ring[stryMutAct_9fa48("11991") ? ring.length + 1 : (stryCov_9fa48("11991"), ring.length - 1)];
    if (stryMutAct_9fa48("11994") ? (!first || !last || first[0] !== last[0]) && first[1] !== last[1] : stryMutAct_9fa48("11993") ? false : stryMutAct_9fa48("11992") ? true : (stryCov_9fa48("11992", "11993", "11994"), (stryMutAct_9fa48("11996") ? (!first || !last) && first[0] !== last[0] : stryMutAct_9fa48("11995") ? false : (stryCov_9fa48("11995", "11996"), (stryMutAct_9fa48("11998") ? !first && !last : stryMutAct_9fa48("11997") ? false : (stryCov_9fa48("11997", "11998"), (stryMutAct_9fa48("11999") ? first : (stryCov_9fa48("11999"), !first)) || (stryMutAct_9fa48("12000") ? last : (stryCov_9fa48("12000"), !last)))) || (stryMutAct_9fa48("12002") ? first[0] === last[0] : stryMutAct_9fa48("12001") ? false : (stryCov_9fa48("12001", "12002"), first[0] !== last[0])))) || (stryMutAct_9fa48("12004") ? first[1] === last[1] : stryMutAct_9fa48("12003") ? false : (stryCov_9fa48("12003", "12004"), first[1] !== last[1])))) {
      if (stryMutAct_9fa48("12005")) {
        {}
      } else {
        stryCov_9fa48("12005");
        context.addIssue(stryMutAct_9fa48("12007") ? {} : (stryCov_9fa48("12007"), {
          code: stryMutAct_9fa48("12008") ? "" : (stryCov_9fa48("12008"), "custom"),
          message: stryMutAct_9fa48("12009") ? "" : (stryCov_9fa48("12009"), "A GeoJSON linear ring must be closed.")
        }));
      }
    }
  }
}));
const polygonCoordinatesSchema = stryMutAct_9fa48("12010") ? z.array(linearRingSchema).max(1) : (stryCov_9fa48("12010"), z.array(linearRingSchema).min(1));
const polygonSchema = z.object(stryMutAct_9fa48("12011") ? {} : (stryCov_9fa48("12011"), {
  type: z.literal(stryMutAct_9fa48("12012") ? "" : (stryCov_9fa48("12012"), "Polygon")),
  coordinates: polygonCoordinatesSchema
}));
const multiPolygonSchema = z.object(stryMutAct_9fa48("12013") ? {} : (stryCov_9fa48("12013"), {
  type: z.literal(stryMutAct_9fa48("12014") ? "" : (stryCov_9fa48("12014"), "MultiPolygon")),
  coordinates: stryMutAct_9fa48("12015") ? z.array(polygonCoordinatesSchema).max(1) : (stryCov_9fa48("12015"), z.array(polygonCoordinatesSchema).min(1))
}));
export const geometrySchema = z.discriminatedUnion(stryMutAct_9fa48("12016") ? "" : (stryCov_9fa48("12016"), "type"), stryMutAct_9fa48("12017") ? [] : (stryCov_9fa48("12017"), [polygonSchema, multiPolygonSchema]));
const operationalZonesGeoJsonSchema = z.object(stryMutAct_9fa48("12018") ? {} : (stryCov_9fa48("12018"), {
  type: z.literal(stryMutAct_9fa48("12019") ? "" : (stryCov_9fa48("12019"), "FeatureCollection")),
  features: z.array(z.object(stryMutAct_9fa48("12020") ? {} : (stryCov_9fa48("12020"), {
    type: z.literal(stryMutAct_9fa48("12021") ? "" : (stryCov_9fa48("12021"), "Feature")),
    properties: z.object(stryMutAct_9fa48("12022") ? {} : (stryCov_9fa48("12022"), {
      id: z.number(),
      nombre: z.string(),
      zoneCode: z.string(),
      zoneName: z.string()
    })).passthrough(),
    geometry: geometrySchema
  })))
}));
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
  if (stryMutAct_9fa48("12023")) {
    {}
  } else {
    stryCov_9fa48("12023");
    return operationalZonesGeoJsonSchema.safeParse(value);
  }
}
function toLeafletPolygon(coordinates: z.infer<typeof polygonCoordinatesSchema>): MapPolygon {
  if (stryMutAct_9fa48("12024")) {
    {}
  } else {
    stryCov_9fa48("12024");
    return coordinates.map(stryMutAct_9fa48("12025") ? () => undefined : (stryCov_9fa48("12025"), ring => ring.map(stryMutAct_9fa48("12026") ? () => undefined : (stryCov_9fa48("12026"), ([lng, lat]) => stryMutAct_9fa48("12027") ? [] : (stryCov_9fa48("12027"), [lat, lng])))));
  }
}
export function toLeafletPolygons(geometry: z.infer<typeof geometrySchema>): MapPolygon[] {
  if (stryMutAct_9fa48("12028")) {
    {}
  } else {
    stryCov_9fa48("12028");
    return (stryMutAct_9fa48("12031") ? geometry.type !== "Polygon" : stryMutAct_9fa48("12030") ? false : stryMutAct_9fa48("12029") ? true : (stryCov_9fa48("12029", "12030", "12031"), geometry.type === (stryMutAct_9fa48("12032") ? "" : (stryCov_9fa48("12032"), "Polygon")))) ? stryMutAct_9fa48("12033") ? [] : (stryCov_9fa48("12033"), [toLeafletPolygon(geometry.coordinates)]) : geometry.coordinates.map(toLeafletPolygon);
  }
}

// El GeoJSON trae el barrio con su nombre oficial de CABA; el catálogo de M9 lo identifica por `codigo`.
// Solo difieren los nombres que el catálogo escribe distinto (Monserrat / Montserrat).
const GEOMETRY_CODE_ALIASES: Record<string, string> = stryMutAct_9fa48("12034") ? {} : (stryCov_9fa48("12034"), {
  monserrat: stryMutAct_9fa48("12035") ? "" : (stryCov_9fa48("12035"), "montserrat")
});

/** `codigo` de barrio de M9 (`san-nicolas`) a partir del nombre del barrio en el GeoJSON. */
function neighborhoodCodeFromName(name: string): string {
  if (stryMutAct_9fa48("12036")) {
    {}
  } else {
    stryCov_9fa48("12036");
    const slug = stryMutAct_9fa48("12038") ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-") : stryMutAct_9fa48("12037") ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/[^a-z0-9]+/g, "-") : (stryCov_9fa48("12037", "12038"), name.normalize(stryMutAct_9fa48("12039") ? "" : (stryCov_9fa48("12039"), "NFD")).replace(stryMutAct_9fa48("12040") ? /[^\u0300-\u036f]/g : (stryCov_9fa48("12040"), /[\u0300-\u036f]/g), stryMutAct_9fa48("12041") ? "Stryker was here!" : (stryCov_9fa48("12041"), "")).trim().toLowerCase().replace(stryMutAct_9fa48("12043") ? /[a-z0-9]+/g : stryMutAct_9fa48("12042") ? /[^a-z0-9]/g : (stryCov_9fa48("12042", "12043"), /[^a-z0-9]+/g), stryMutAct_9fa48("12044") ? "" : (stryCov_9fa48("12044"), "-")));
    return stryMutAct_9fa48("12045") ? GEOMETRY_CODE_ALIASES[slug] && slug : (stryCov_9fa48("12045"), GEOMETRY_CODE_ALIASES[slug] ?? slug);
  }
}

/** Clave para cruzar una zona con su geometría: el `codigo` del barrio, no el `code` de la zona. */
export function zoneGeometryCode(zone: Pick<Zone, "code" | "neighborhood">): string {
  if (stryMutAct_9fa48("12046")) {
    {}
  } else {
    stryCov_9fa48("12046");
    return stryMutAct_9fa48("12047") ? zone.neighborhood?.codigo && zone.code : (stryCov_9fa48("12047"), (stryMutAct_9fa48("12048") ? zone.neighborhood.codigo : (stryCov_9fa48("12048"), zone.neighborhood?.codigo)) ?? zone.code);
  }
}
export function parseOperationalZoneGeoJson(value: unknown): OperationalZoneGeometry[] {
  if (stryMutAct_9fa48("12049")) {
    {}
  } else {
    stryCov_9fa48("12049");
    const parsed = safeParseOperationalZoneGeoJson(value);
    if (stryMutAct_9fa48("12052") ? false : stryMutAct_9fa48("12051") ? true : stryMutAct_9fa48("12050") ? parsed.success : (stryCov_9fa48("12050", "12051", "12052"), !parsed.success)) {
      if (stryMutAct_9fa48("12053")) {
        {}
      } else {
        stryCov_9fa48("12053");
        console.error(stryMutAct_9fa48("12055") ? "" : (stryCov_9fa48("12055"), "Operational zone GeoJSON is invalid; zone overlays are disabled."), parsed.error);
        return stryMutAct_9fa48("12056") ? ["Stryker was here"] : (stryCov_9fa48("12056"), []);
      }
    }
    return parsed.data.features.map(feature => {
      if (stryMutAct_9fa48("12057")) {
        {}
      } else {
        stryCov_9fa48("12057");
        const coordinates = toLeafletPolygons(feature.geometry);
        return stryMutAct_9fa48("12058") ? {} : (stryCov_9fa48("12058"), {
          code: neighborhoodCodeFromName(feature.properties.nombre),
          name: feature.properties.zoneName,
          sourceName: feature.properties.nombre,
          coordinates,
          center: polygonCenter(coordinates)
        });
      }
    });
  }
}
let cachedOperationalZoneGeometries: OperationalZoneGeometry[] | undefined;
let geometryLoad: Promise<OperationalZoneGeometry[]> | undefined;
export function loadOperationalZoneGeometries(): Promise<OperationalZoneGeometry[]> {
  if (stryMutAct_9fa48("12059")) {
    {}
  } else {
    stryCov_9fa48("12059");
    if (stryMutAct_9fa48("12061") ? false : stryMutAct_9fa48("12060") ? true : (stryCov_9fa48("12060", "12061"), cachedOperationalZoneGeometries)) return Promise.resolve(cachedOperationalZoneGeometries);
    if (stryMutAct_9fa48("12064") ? false : stryMutAct_9fa48("12063") ? true : stryMutAct_9fa48("12062") ? geometryLoad : (stryCov_9fa48("12062", "12063", "12064"), !geometryLoad)) {
      if (stryMutAct_9fa48("12065")) {
        {}
      } else {
        stryCov_9fa48("12065");
        geometryLoad = import("@/data/operational-zones.json").then(module => {
          if (stryMutAct_9fa48("12066")) {
            {}
          } else {
            stryCov_9fa48("12066");
            cachedOperationalZoneGeometries = parseOperationalZoneGeoJson(module.default);
            return cachedOperationalZoneGeometries;
          }
        }).catch((error: unknown) => {
          if (stryMutAct_9fa48("12067")) {
            {}
          } else {
            stryCov_9fa48("12067");
            geometryLoad = undefined;
            throw error;
          }
        });
      }
    }
    return geometryLoad;
  }
}
export function getOperationalZoneGeometries(): OperationalZoneGeometry[] {
  if (stryMutAct_9fa48("12068")) {
    {}
  } else {
    stryCov_9fa48("12068");
    return stryMutAct_9fa48("12069") ? cachedOperationalZoneGeometries && [] : (stryCov_9fa48("12069"), cachedOperationalZoneGeometries ?? (stryMutAct_9fa48("12070") ? ["Stryker was here"] : (stryCov_9fa48("12070"), [])));
  }
}
const boundaryTolerance = 1e-8;
function isPointOnSegment([pointLat, pointLng]: MapCoordinate, [firstLat, firstLng]: MapCoordinate, [lastLat, lastLng]: MapCoordinate): boolean {
  if (stryMutAct_9fa48("12071")) {
    {}
  } else {
    stryCov_9fa48("12071");
    const deltaLat = stryMutAct_9fa48("12072") ? lastLat + firstLat : (stryCov_9fa48("12072"), lastLat - firstLat);
    const deltaLng = stryMutAct_9fa48("12073") ? lastLng + firstLng : (stryCov_9fa48("12073"), lastLng - firstLng);
    const cross = stryMutAct_9fa48("12074") ? (pointLng - firstLng) * deltaLat + (pointLat - firstLat) * deltaLng : (stryCov_9fa48("12074"), (stryMutAct_9fa48("12075") ? (pointLng - firstLng) / deltaLat : (stryCov_9fa48("12075"), (stryMutAct_9fa48("12076") ? pointLng + firstLng : (stryCov_9fa48("12076"), pointLng - firstLng)) * deltaLat)) - (stryMutAct_9fa48("12077") ? (pointLat - firstLat) / deltaLng : (stryCov_9fa48("12077"), (stryMutAct_9fa48("12078") ? pointLat + firstLat : (stryCov_9fa48("12078"), pointLat - firstLat)) * deltaLng)));
    const scale = stryMutAct_9fa48("12079") ? Math.min(1, Math.hypot(deltaLat, deltaLng)) : (stryCov_9fa48("12079"), Math.max(1, Math.hypot(deltaLat, deltaLng)));
    return stryMutAct_9fa48("12082") ? Math.abs(cross) <= boundaryTolerance * scale && pointLat >= Math.min(firstLat, lastLat) - boundaryTolerance && pointLat <= Math.max(firstLat, lastLat) + boundaryTolerance && pointLng >= Math.min(firstLng, lastLng) - boundaryTolerance || pointLng <= Math.max(firstLng, lastLng) + boundaryTolerance : stryMutAct_9fa48("12081") ? false : stryMutAct_9fa48("12080") ? true : (stryCov_9fa48("12080", "12081", "12082"), (stryMutAct_9fa48("12084") ? Math.abs(cross) <= boundaryTolerance * scale && pointLat >= Math.min(firstLat, lastLat) - boundaryTolerance && pointLat <= Math.max(firstLat, lastLat) + boundaryTolerance || pointLng >= Math.min(firstLng, lastLng) - boundaryTolerance : stryMutAct_9fa48("12083") ? true : (stryCov_9fa48("12083", "12084"), (stryMutAct_9fa48("12086") ? Math.abs(cross) <= boundaryTolerance * scale && pointLat >= Math.min(firstLat, lastLat) - boundaryTolerance || pointLat <= Math.max(firstLat, lastLat) + boundaryTolerance : stryMutAct_9fa48("12085") ? true : (stryCov_9fa48("12085", "12086"), (stryMutAct_9fa48("12088") ? Math.abs(cross) <= boundaryTolerance * scale || pointLat >= Math.min(firstLat, lastLat) - boundaryTolerance : stryMutAct_9fa48("12087") ? true : (stryCov_9fa48("12087", "12088"), (stryMutAct_9fa48("12091") ? Math.abs(cross) > boundaryTolerance * scale : stryMutAct_9fa48("12090") ? Math.abs(cross) < boundaryTolerance * scale : stryMutAct_9fa48("12089") ? true : (stryCov_9fa48("12089", "12090", "12091"), Math.abs(cross) <= (stryMutAct_9fa48("12092") ? boundaryTolerance / scale : (stryCov_9fa48("12092"), boundaryTolerance * scale)))) && (stryMutAct_9fa48("12095") ? pointLat < Math.min(firstLat, lastLat) - boundaryTolerance : stryMutAct_9fa48("12094") ? pointLat > Math.min(firstLat, lastLat) - boundaryTolerance : stryMutAct_9fa48("12093") ? true : (stryCov_9fa48("12093", "12094", "12095"), pointLat >= (stryMutAct_9fa48("12096") ? Math.min(firstLat, lastLat) + boundaryTolerance : (stryCov_9fa48("12096"), (stryMutAct_9fa48("12097") ? Math.max(firstLat, lastLat) : (stryCov_9fa48("12097"), Math.min(firstLat, lastLat))) - boundaryTolerance)))))) && (stryMutAct_9fa48("12100") ? pointLat > Math.max(firstLat, lastLat) + boundaryTolerance : stryMutAct_9fa48("12099") ? pointLat < Math.max(firstLat, lastLat) + boundaryTolerance : stryMutAct_9fa48("12098") ? true : (stryCov_9fa48("12098", "12099", "12100"), pointLat <= (stryMutAct_9fa48("12101") ? Math.max(firstLat, lastLat) - boundaryTolerance : (stryCov_9fa48("12101"), (stryMutAct_9fa48("12102") ? Math.min(firstLat, lastLat) : (stryCov_9fa48("12102"), Math.max(firstLat, lastLat))) + boundaryTolerance)))))) && (stryMutAct_9fa48("12105") ? pointLng < Math.min(firstLng, lastLng) - boundaryTolerance : stryMutAct_9fa48("12104") ? pointLng > Math.min(firstLng, lastLng) - boundaryTolerance : stryMutAct_9fa48("12103") ? true : (stryCov_9fa48("12103", "12104", "12105"), pointLng >= (stryMutAct_9fa48("12106") ? Math.min(firstLng, lastLng) + boundaryTolerance : (stryCov_9fa48("12106"), (stryMutAct_9fa48("12107") ? Math.max(firstLng, lastLng) : (stryCov_9fa48("12107"), Math.min(firstLng, lastLng))) - boundaryTolerance)))))) && (stryMutAct_9fa48("12110") ? pointLng > Math.max(firstLng, lastLng) + boundaryTolerance : stryMutAct_9fa48("12109") ? pointLng < Math.max(firstLng, lastLng) + boundaryTolerance : stryMutAct_9fa48("12108") ? true : (stryCov_9fa48("12108", "12109", "12110"), pointLng <= (stryMutAct_9fa48("12111") ? Math.max(firstLng, lastLng) - boundaryTolerance : (stryCov_9fa48("12111"), (stryMutAct_9fa48("12112") ? Math.min(firstLng, lastLng) : (stryCov_9fa48("12112"), Math.max(firstLng, lastLng))) + boundaryTolerance)))));
  }
}
function isPointInRing([pointLat, pointLng]: MapCoordinate, ring: MapCoordinate[], includeBoundary: boolean): boolean {
  if (stryMutAct_9fa48("12113")) {
    {}
  } else {
    stryCov_9fa48("12113");
    if (stryMutAct_9fa48("12117") ? ring.length >= 3 : stryMutAct_9fa48("12116") ? ring.length <= 3 : stryMutAct_9fa48("12115") ? false : stryMutAct_9fa48("12114") ? true : (stryCov_9fa48("12114", "12115", "12116", "12117"), ring.length < 3)) return stryMutAct_9fa48("12118") ? true : (stryCov_9fa48("12118"), false);
    let inside = stryMutAct_9fa48("12119") ? true : (stryCov_9fa48("12119"), false);
    for (let index = 0, previousIndex = stryMutAct_9fa48("12120") ? ring.length + 1 : (stryCov_9fa48("12120"), ring.length - 1); stryMutAct_9fa48("12123") ? index >= ring.length : stryMutAct_9fa48("12122") ? index <= ring.length : stryMutAct_9fa48("12121") ? false : (stryCov_9fa48("12121", "12122", "12123"), index < ring.length); previousIndex = stryMutAct_9fa48("12124") ? index-- : (stryCov_9fa48("12124"), index++)) {
      if (stryMutAct_9fa48("12125")) {
        {}
      } else {
        stryCov_9fa48("12125");
        const [lat, lng] = ring[index]!;
        const [previousLat, previousLng] = ring[previousIndex]!;
        if (stryMutAct_9fa48("12127") ? false : stryMutAct_9fa48("12126") ? true : (stryCov_9fa48("12126", "12127"), isPointOnSegment(stryMutAct_9fa48("12128") ? [] : (stryCov_9fa48("12128"), [pointLat, pointLng]), stryMutAct_9fa48("12129") ? [] : (stryCov_9fa48("12129"), [lat, lng]), stryMutAct_9fa48("12130") ? [] : (stryCov_9fa48("12130"), [previousLat, previousLng])))) {
          if (stryMutAct_9fa48("12131")) {
            {}
          } else {
            stryCov_9fa48("12131");
            return includeBoundary;
          }
        }
        const crossesLatitude = stryMutAct_9fa48("12134") ? lat > pointLat === previousLat > pointLat : stryMutAct_9fa48("12133") ? false : stryMutAct_9fa48("12132") ? true : (stryCov_9fa48("12132", "12133", "12134"), (stryMutAct_9fa48("12138") ? lat <= pointLat : stryMutAct_9fa48("12137") ? lat >= pointLat : stryMutAct_9fa48("12136") ? false : stryMutAct_9fa48("12135") ? true : (stryCov_9fa48("12135", "12136", "12137", "12138"), lat > pointLat)) !== (stryMutAct_9fa48("12142") ? previousLat <= pointLat : stryMutAct_9fa48("12141") ? previousLat >= pointLat : stryMutAct_9fa48("12140") ? false : stryMutAct_9fa48("12139") ? true : (stryCov_9fa48("12139", "12140", "12141", "12142"), previousLat > pointLat)));
        const boundaryLng = stryMutAct_9fa48("12143") ? (previousLng - lng) * (pointLat - lat) / (previousLat - lat) - lng : (stryCov_9fa48("12143"), (stryMutAct_9fa48("12144") ? (previousLng - lng) * (pointLat - lat) * (previousLat - lat) : (stryCov_9fa48("12144"), (stryMutAct_9fa48("12145") ? (previousLng - lng) / (pointLat - lat) : (stryCov_9fa48("12145"), (stryMutAct_9fa48("12146") ? previousLng + lng : (stryCov_9fa48("12146"), previousLng - lng)) * (stryMutAct_9fa48("12147") ? pointLat + lat : (stryCov_9fa48("12147"), pointLat - lat)))) / (stryMutAct_9fa48("12148") ? previousLat + lat : (stryCov_9fa48("12148"), previousLat - lat)))) + lng);
        if (stryMutAct_9fa48("12151") ? crossesLatitude || pointLng < boundaryLng : stryMutAct_9fa48("12150") ? false : stryMutAct_9fa48("12149") ? true : (stryCov_9fa48("12149", "12150", "12151"), crossesLatitude && (stryMutAct_9fa48("12154") ? pointLng >= boundaryLng : stryMutAct_9fa48("12153") ? pointLng <= boundaryLng : stryMutAct_9fa48("12152") ? true : (stryCov_9fa48("12152", "12153", "12154"), pointLng < boundaryLng)))) inside = stryMutAct_9fa48("12155") ? inside : (stryCov_9fa48("12155"), !inside);
      }
    }
    return inside;
  }
}

/** Returns whether a Leaflet [latitude, longitude] coordinate belongs to a zone polygon. */
export function isCoordinateInsideOperationalZone(coordinate: MapCoordinate, geometry: Pick<OperationalZoneGeometry, "coordinates">): boolean {
  if (stryMutAct_9fa48("12156")) {
    {}
  } else {
    stryCov_9fa48("12156");
    return stryMutAct_9fa48("12157") ? geometry.coordinates.every(([outerRing, ...holes]) => Boolean(outerRing && isPointInRing(coordinate, outerRing, true)) && holes.every(hole => !isPointInRing(coordinate, hole, false))) : (stryCov_9fa48("12157"), geometry.coordinates.some(stryMutAct_9fa48("12158") ? () => undefined : (stryCov_9fa48("12158"), ([outerRing, ...holes]) => stryMutAct_9fa48("12161") ? Boolean(outerRing && isPointInRing(coordinate, outerRing, true)) || holes.every(hole => !isPointInRing(coordinate, hole, false)) : stryMutAct_9fa48("12160") ? false : stryMutAct_9fa48("12159") ? true : (stryCov_9fa48("12159", "12160", "12161"), Boolean(stryMutAct_9fa48("12164") ? outerRing || isPointInRing(coordinate, outerRing, true) : stryMutAct_9fa48("12163") ? false : stryMutAct_9fa48("12162") ? true : (stryCov_9fa48("12162", "12163", "12164"), outerRing && isPointInRing(coordinate, outerRing, stryMutAct_9fa48("12165") ? false : (stryCov_9fa48("12165"), true)))) && (stryMutAct_9fa48("12166") ? holes.some(hole => !isPointInRing(coordinate, hole, false)) : (stryCov_9fa48("12166"), holes.every(stryMutAct_9fa48("12167") ? () => undefined : (stryCov_9fa48("12167"), hole => stryMutAct_9fa48("12168") ? isPointInRing(coordinate, hole, false) : (stryCov_9fa48("12168"), !isPointInRing(coordinate, hole, stryMutAct_9fa48("12169") ? true : (stryCov_9fa48("12169"), false)))))))))));
  }
}
function ringDoubleArea(ring: MapCoordinate[]): number {
  if (stryMutAct_9fa48("12170")) {
    {}
  } else {
    stryCov_9fa48("12170");
    let areaTwice = 0;
    for (let index = 0; stryMutAct_9fa48("12173") ? index >= ring.length - 1 : stryMutAct_9fa48("12172") ? index <= ring.length - 1 : stryMutAct_9fa48("12171") ? false : (stryCov_9fa48("12171", "12172", "12173"), index < (stryMutAct_9fa48("12174") ? ring.length + 1 : (stryCov_9fa48("12174"), ring.length - 1))); stryMutAct_9fa48("12175") ? index -= 1 : (stryCov_9fa48("12175"), index += 1)) {
      if (stryMutAct_9fa48("12176")) {
        {}
      } else {
        stryCov_9fa48("12176");
        const [lat, lng] = ring[index]!;
        const [nextLat, nextLng] = ring[stryMutAct_9fa48("12177") ? index - 1 : (stryCov_9fa48("12177"), index + 1)]!;
        stryMutAct_9fa48("12178") ? areaTwice -= lng * nextLat - nextLng * lat : (stryCov_9fa48("12178"), areaTwice += stryMutAct_9fa48("12179") ? lng * nextLat + nextLng * lat : (stryCov_9fa48("12179"), (stryMutAct_9fa48("12180") ? lng / nextLat : (stryCov_9fa48("12180"), lng * nextLat)) - (stryMutAct_9fa48("12181") ? nextLng / lat : (stryCov_9fa48("12181"), nextLng * lat))));
      }
    }
    return areaTwice;
  }
}
function ringCenter(ring: MapCoordinate[]): MapCoordinate {
  if (stryMutAct_9fa48("12182")) {
    {}
  } else {
    stryCov_9fa48("12182");
    if (stryMutAct_9fa48("12186") ? ring.length >= 3 : stryMutAct_9fa48("12185") ? ring.length <= 3 : stryMutAct_9fa48("12184") ? false : stryMutAct_9fa48("12183") ? true : (stryCov_9fa48("12183", "12184", "12185", "12186"), ring.length < 3)) return stryMutAct_9fa48("12187") ? ring[0] && [-34.58, -58.42] : (stryCov_9fa48("12187"), ring[0] ?? (stryMutAct_9fa48("12188") ? [] : (stryCov_9fa48("12188"), [stryMutAct_9fa48("12189") ? +34.58 : (stryCov_9fa48("12189"), -34.58), stryMutAct_9fa48("12190") ? +58.42 : (stryCov_9fa48("12190"), -58.42)])));
    const areaTwice = ringDoubleArea(ring);
    let centerLat = 0;
    let centerLng = 0;
    for (let index = 0; stryMutAct_9fa48("12193") ? index >= ring.length - 1 : stryMutAct_9fa48("12192") ? index <= ring.length - 1 : stryMutAct_9fa48("12191") ? false : (stryCov_9fa48("12191", "12192", "12193"), index < (stryMutAct_9fa48("12194") ? ring.length + 1 : (stryCov_9fa48("12194"), ring.length - 1))); stryMutAct_9fa48("12195") ? index -= 1 : (stryCov_9fa48("12195"), index += 1)) {
      if (stryMutAct_9fa48("12196")) {
        {}
      } else {
        stryCov_9fa48("12196");
        const [lat, lng] = ring[index]!;
        const [nextLat, nextLng] = ring[stryMutAct_9fa48("12197") ? index - 1 : (stryCov_9fa48("12197"), index + 1)]!;
        const cross = stryMutAct_9fa48("12198") ? lng * nextLat + nextLng * lat : (stryCov_9fa48("12198"), (stryMutAct_9fa48("12199") ? lng / nextLat : (stryCov_9fa48("12199"), lng * nextLat)) - (stryMutAct_9fa48("12200") ? nextLng / lat : (stryCov_9fa48("12200"), nextLng * lat)));
        stryMutAct_9fa48("12201") ? centerLat -= (lat + nextLat) * cross : (stryCov_9fa48("12201"), centerLat += stryMutAct_9fa48("12202") ? (lat + nextLat) / cross : (stryCov_9fa48("12202"), (stryMutAct_9fa48("12203") ? lat - nextLat : (stryCov_9fa48("12203"), lat + nextLat)) * cross));
        stryMutAct_9fa48("12204") ? centerLng -= (lng + nextLng) * cross : (stryCov_9fa48("12204"), centerLng += stryMutAct_9fa48("12205") ? (lng + nextLng) / cross : (stryCov_9fa48("12205"), (stryMutAct_9fa48("12206") ? lng - nextLng : (stryCov_9fa48("12206"), lng + nextLng)) * cross));
      }
    }
    if (stryMutAct_9fa48("12210") ? Math.abs(areaTwice) >= Number.EPSILON : stryMutAct_9fa48("12209") ? Math.abs(areaTwice) <= Number.EPSILON : stryMutAct_9fa48("12208") ? false : stryMutAct_9fa48("12207") ? true : (stryCov_9fa48("12207", "12208", "12209", "12210"), Math.abs(areaTwice) < Number.EPSILON)) {
      if (stryMutAct_9fa48("12211")) {
        {}
      } else {
        stryCov_9fa48("12211");
        const distinctRing = stryMutAct_9fa48("12212") ? ring : (stryCov_9fa48("12212"), ring.slice(0, stryMutAct_9fa48("12213") ? +1 : (stryCov_9fa48("12213"), -1)));
        const [latTotal, lngTotal] = distinctRing.reduce(stryMutAct_9fa48("12214") ? () => undefined : (stryCov_9fa48("12214"), ([lat, lng], [nextLat, nextLng]) => stryMutAct_9fa48("12215") ? [] : (stryCov_9fa48("12215"), [stryMutAct_9fa48("12216") ? lat - nextLat : (stryCov_9fa48("12216"), lat + nextLat), stryMutAct_9fa48("12217") ? lng - nextLng : (stryCov_9fa48("12217"), lng + nextLng)])), stryMutAct_9fa48("12218") ? [] : (stryCov_9fa48("12218"), [0, 0]));
        return stryMutAct_9fa48("12219") ? [] : (stryCov_9fa48("12219"), [stryMutAct_9fa48("12220") ? latTotal * distinctRing.length : (stryCov_9fa48("12220"), latTotal / distinctRing.length), stryMutAct_9fa48("12221") ? lngTotal * distinctRing.length : (stryCov_9fa48("12221"), lngTotal / distinctRing.length)]);
      }
    }
    return stryMutAct_9fa48("12222") ? [] : (stryCov_9fa48("12222"), [stryMutAct_9fa48("12223") ? centerLat * (3 * areaTwice) : (stryCov_9fa48("12223"), centerLat / (stryMutAct_9fa48("12224") ? 3 / areaTwice : (stryCov_9fa48("12224"), 3 * areaTwice))), stryMutAct_9fa48("12225") ? centerLng * (3 * areaTwice) : (stryCov_9fa48("12225"), centerLng / (stryMutAct_9fa48("12226") ? 3 / areaTwice : (stryCov_9fa48("12226"), 3 * areaTwice)))]);
  }
}
export function polygonCenter(coordinates: MapPolygon[]): MapCoordinate {
  if (stryMutAct_9fa48("12227")) {
    {}
  } else {
    stryCov_9fa48("12227");
    const outerRings = coordinates.map(stryMutAct_9fa48("12228") ? () => undefined : (stryCov_9fa48("12228"), polygon => stryMutAct_9fa48("12229") ? polygon[0] && [] : (stryCov_9fa48("12229"), polygon[0] ?? (stryMutAct_9fa48("12230") ? ["Stryker was here"] : (stryCov_9fa48("12230"), [])))));
    const largestOuterRing = outerRings.reduce<MapCoordinate[]>(stryMutAct_9fa48("12231") ? () => undefined : (stryCov_9fa48("12231"), (largest, ring) => (stryMutAct_9fa48("12235") ? Math.abs(ringDoubleArea(ring)) <= Math.abs(ringDoubleArea(largest)) : stryMutAct_9fa48("12234") ? Math.abs(ringDoubleArea(ring)) >= Math.abs(ringDoubleArea(largest)) : stryMutAct_9fa48("12233") ? false : stryMutAct_9fa48("12232") ? true : (stryCov_9fa48("12232", "12233", "12234", "12235"), Math.abs(ringDoubleArea(ring)) > Math.abs(ringDoubleArea(largest)))) ? ring : largest), stryMutAct_9fa48("12236") ? ["Stryker was here"] : (stryCov_9fa48("12236"), []));
    return ringCenter(largestOuterRing);
  }
}

/**
 * Filtered from the official CABA Barrios GeoJSON using the backend's eight
 * stable operational zone codes and the source barrio names. Source:
 * https://cdn.buenosaires.gob.ar/datosabiertos/datasets/innovacion-transformacion-digital/barrios/barrios.geojson
 * (CC-BY-2.5-AR).
 */
export function resolveOperationalZones(zones: Zone[], geometries: OperationalZoneGeometry[] = getOperationalZoneGeometries()): OperationalZone[] {
  if (stryMutAct_9fa48("12237")) {
    {}
  } else {
    stryCov_9fa48("12237");
    return geometries.map(stryMutAct_9fa48("12238") ? () => undefined : (stryCov_9fa48("12238"), geometry => stryMutAct_9fa48("12239") ? {} : (stryCov_9fa48("12239"), {
      ...geometry,
      zone: stryMutAct_9fa48("12240") ? zones.find(zone => zoneGeometryCode(zone) === geometry.code) && null : (stryCov_9fa48("12240"), zones.find(stryMutAct_9fa48("12241") ? () => undefined : (stryCov_9fa48("12241"), zone => stryMutAct_9fa48("12244") ? zoneGeometryCode(zone) !== geometry.code : stryMutAct_9fa48("12243") ? false : stryMutAct_9fa48("12242") ? true : (stryCov_9fa48("12242", "12243", "12244"), zoneGeometryCode(zone) === geometry.code))) ?? null)
    })));
  }
}
let pendingOperationalZones: Promise<OperationalZone[]> | undefined;
export const operationalZonesAdapter = stryMutAct_9fa48("12245") ? {} : (stryCov_9fa48("12245"), {
  list(): Promise<OperationalZone[]> {
    if (stryMutAct_9fa48("12246")) {
      {}
    } else {
      stryCov_9fa48("12246");
      if (stryMutAct_9fa48("12248") ? false : stryMutAct_9fa48("12247") ? true : (stryCov_9fa48("12247", "12248"), pendingOperationalZones)) return pendingOperationalZones;
      const request = Promise.all(stryMutAct_9fa48("12249") ? [] : (stryCov_9fa48("12249"), [zonesAdapter.list(stryMutAct_9fa48("12250") ? {} : (stryCov_9fa48("12250"), {
        active: stryMutAct_9fa48("12251") ? false : (stryCov_9fa48("12251"), true),
        page: 1,
        pageSize: 100
      })), loadOperationalZoneGeometries()])).then(stryMutAct_9fa48("12252") ? () => undefined : (stryCov_9fa48("12252"), ([result, geometries]) => resolveOperationalZones(result.zones, geometries)));
      pendingOperationalZones = request;
      void request.then(() => {
        if (stryMutAct_9fa48("12253")) {
          {}
        } else {
          stryCov_9fa48("12253");
          if (stryMutAct_9fa48("12256") ? pendingOperationalZones !== request : stryMutAct_9fa48("12255") ? false : stryMutAct_9fa48("12254") ? true : (stryCov_9fa48("12254", "12255", "12256"), pendingOperationalZones === request)) pendingOperationalZones = undefined;
        }
      }, () => {
        if (stryMutAct_9fa48("12257")) {
          {}
        } else {
          stryCov_9fa48("12257");
          if (stryMutAct_9fa48("12260") ? pendingOperationalZones !== request : stryMutAct_9fa48("12259") ? false : stryMutAct_9fa48("12258") ? true : (stryCov_9fa48("12258", "12259", "12260"), pendingOperationalZones === request)) pendingOperationalZones = undefined;
        }
      });
      return request;
    }
  }
});
export type RouteStopOverlay = {
  id: string;
  sequence: number;
  estimatedDurationMin: number | null;
  zoneCode: string;
  zoneName: string;
  geometry: OperationalZoneGeometry | null;
};
export function routeToStopOverlays(route: Route, zones: Zone[]): RouteStopOverlay[] {
  if (stryMutAct_9fa48("12261")) {
    {}
  } else {
    stryCov_9fa48("12261");
    const zoneById = new Map(zones.map(stryMutAct_9fa48("12262") ? () => undefined : (stryCov_9fa48("12262"), zone => stryMutAct_9fa48("12263") ? [] : (stryCov_9fa48("12263"), [zone.id, zone]))));
    const geometryByCode = new Map(getOperationalZoneGeometries().map(stryMutAct_9fa48("12264") ? () => undefined : (stryCov_9fa48("12264"), geometry => stryMutAct_9fa48("12265") ? [] : (stryCov_9fa48("12265"), [geometry.code, geometry]))));
    return stryMutAct_9fa48("12266") ? [...route.stops].map(stop => {
      // Prefer the current catalog record: the stop's zoneCode/zoneName may be a
      // stale snapshot while the catalog already has the canonical code.
      const zone = zoneById.get(stop.zoneId);
      const zoneCode = zone ? zoneGeometryCode(zone) : stop.zoneCode;
      const zoneName = zone?.name ?? stop.zoneName;
      return {
        id: stop.id,
        sequence: stop.sequence,
        estimatedDurationMin: stop.estimatedDurationMin ?? null,
        zoneCode,
        zoneName,
        geometry: geometryByCode.get(zoneCode) ?? null
      };
    }) : (stryCov_9fa48("12266"), (stryMutAct_9fa48("12267") ? [] : (stryCov_9fa48("12267"), [...route.stops])).sort(stryMutAct_9fa48("12268") ? () => undefined : (stryCov_9fa48("12268"), (left, right) => stryMutAct_9fa48("12269") ? left.sequence + right.sequence : (stryCov_9fa48("12269"), left.sequence - right.sequence))).map(stop => {
      if (stryMutAct_9fa48("12270")) {
        {}
      } else {
        stryCov_9fa48("12270");
        // Prefer the current catalog record: the stop's zoneCode/zoneName may be a
        // stale snapshot while the catalog already has the canonical code.
        const zone = zoneById.get(stop.zoneId);
        const zoneCode = zone ? zoneGeometryCode(zone) : stop.zoneCode;
        const zoneName = stryMutAct_9fa48("12271") ? zone?.name && stop.zoneName : (stryCov_9fa48("12271"), (stryMutAct_9fa48("12272") ? zone.name : (stryCov_9fa48("12272"), zone?.name)) ?? stop.zoneName);
        return stryMutAct_9fa48("12273") ? {} : (stryCov_9fa48("12273"), {
          id: stop.id,
          sequence: stop.sequence,
          estimatedDurationMin: stryMutAct_9fa48("12274") ? stop.estimatedDurationMin && null : (stryCov_9fa48("12274"), stop.estimatedDurationMin ?? null),
          zoneCode,
          zoneName,
          geometry: stryMutAct_9fa48("12275") ? geometryByCode.get(zoneCode) && null : (stryCov_9fa48("12275"), geometryByCode.get(zoneCode) ?? null)
        });
      }
    }));
  }
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
const coveragePriority: Record<TodayZoneCoverage["status"], number> = stryMutAct_9fa48("12276") ? {} : (stryCov_9fa48("12276"), {
  PENDING: 0,
  SERVICED: 1,
  PARTIAL: 2,
  NOT_SERVICED: 3
});
function combineCoverageStatus(current: TodayZoneCoverage["status"], next: TodayZoneCoverage["status"]): TodayZoneCoverage["status"] {
  if (stryMutAct_9fa48("12277")) {
    {}
  } else {
    stryCov_9fa48("12277");
    return (stryMutAct_9fa48("12281") ? coveragePriority[next] <= coveragePriority[current] : stryMutAct_9fa48("12280") ? coveragePriority[next] >= coveragePriority[current] : stryMutAct_9fa48("12279") ? false : stryMutAct_9fa48("12278") ? true : (stryCov_9fa48("12278", "12279", "12280", "12281"), coveragePriority[next] > coveragePriority[current])) ? next : current;
  }
}
export function buildTodayZoneCoverage(services: TodayServiceCoverage[], zones: Zone[]): TodayZoneCoverage[] {
  if (stryMutAct_9fa48("12282")) {
    {}
  } else {
    stryCov_9fa48("12282");
    const zoneById = new Map(zones.map(stryMutAct_9fa48("12283") ? () => undefined : (stryCov_9fa48("12283"), zone => stryMutAct_9fa48("12284") ? [] : (stryCov_9fa48("12284"), [zone.id, zone]))));
    const geometryByCode = new Map(getOperationalZoneGeometries().map(stryMutAct_9fa48("12285") ? () => undefined : (stryCov_9fa48("12285"), geometry => stryMutAct_9fa48("12286") ? [] : (stryCov_9fa48("12286"), [geometry.code, geometry]))));
    const coverageByZone = new Map<string, TodayZoneCoverage>();
    for (const {
      service,
      zoneResults
    } of services) {
      if (stryMutAct_9fa48("12287")) {
        {}
      } else {
        stryCov_9fa48("12287");
        for (const [index, zoneId] of service.zoneIds.entries()) {
          if (stryMutAct_9fa48("12288")) {
            {}
          } else {
            stryCov_9fa48("12288");
            const zone = zoneById.get(zoneId);
            const result = zoneResults.find(stryMutAct_9fa48("12289") ? () => undefined : (stryCov_9fa48("12289"), candidate => stryMutAct_9fa48("12292") ? candidate.zoneId !== zoneId : stryMutAct_9fa48("12291") ? false : stryMutAct_9fa48("12290") ? true : (stryCov_9fa48("12290", "12291", "12292"), candidate.zoneId === zoneId)));
            const zoneCode = zone ? zoneGeometryCode(zone) : zoneId;
            const zoneName = stryMutAct_9fa48("12293") ? (zone?.name ?? service.zoneNames[index]) && "Zona no disponible" : (stryCov_9fa48("12293"), (stryMutAct_9fa48("12294") ? zone?.name && service.zoneNames[index] : (stryCov_9fa48("12294"), (stryMutAct_9fa48("12295") ? zone.name : (stryCov_9fa48("12295"), zone?.name)) ?? service.zoneNames[index])) ?? (stryMutAct_9fa48("12296") ? "" : (stryCov_9fa48("12296"), "Zona no disponible")));
            const current = coverageByZone.get(zoneId);
            if (stryMutAct_9fa48("12299") ? false : stryMutAct_9fa48("12298") ? true : stryMutAct_9fa48("12297") ? current : (stryCov_9fa48("12297", "12298", "12299"), !current)) {
              if (stryMutAct_9fa48("12300")) {
                {}
              } else {
                stryCov_9fa48("12300");
                coverageByZone.set(zoneId, stryMutAct_9fa48("12302") ? {} : (stryCov_9fa48("12302"), {
                  zoneId,
                  zoneCode,
                  zoneName,
                  status: stryMutAct_9fa48("12303") ? result?.status && "PENDING" : (stryCov_9fa48("12303"), (stryMutAct_9fa48("12304") ? result.status : (stryCov_9fa48("12304"), result?.status)) ?? (stryMutAct_9fa48("12305") ? "" : (stryCov_9fa48("12305"), "PENDING"))),
                  serviceCount: 1,
                  resultCount: result ? 1 : 0,
                  geometry: stryMutAct_9fa48("12306") ? geometryByCode.get(zoneCode) && null : (stryCov_9fa48("12306"), geometryByCode.get(zoneCode) ?? null)
                }));
                continue;
              }
            }
            current.status = combineCoverageStatus(current.status, stryMutAct_9fa48("12307") ? result?.status && "PENDING" : (stryCov_9fa48("12307"), (stryMutAct_9fa48("12308") ? result.status : (stryCov_9fa48("12308"), result?.status)) ?? (stryMutAct_9fa48("12309") ? "" : (stryCov_9fa48("12309"), "PENDING"))));
            stryMutAct_9fa48("12310") ? current.serviceCount -= 1 : (stryCov_9fa48("12310"), current.serviceCount += 1);
            stryMutAct_9fa48("12311") ? current.resultCount -= result ? 1 : 0 : (stryCov_9fa48("12311"), current.resultCount += result ? 1 : 0);
          }
        }
      }
    }
    return stryMutAct_9fa48("12312") ? [...coverageByZone.values()] : (stryCov_9fa48("12312"), (stryMutAct_9fa48("12313") ? [] : (stryCov_9fa48("12313"), [...coverageByZone.values()])).sort(stryMutAct_9fa48("12314") ? () => undefined : (stryCov_9fa48("12314"), (left, right) => left.zoneName.localeCompare(right.zoneName, stryMutAct_9fa48("12315") ? "" : (stryCov_9fa48("12315"), "es")))));
  }
}
export async function loadTodayServiceCoverage(scheduledDate: string): Promise<TodayServiceCoverage[]> {
  if (stryMutAct_9fa48("12316")) {
    {}
  } else {
    stryCov_9fa48("12316");
    const page = await servicesAdapter.list(stryMutAct_9fa48("12317") ? {} : (stryCov_9fa48("12317"), {
      scheduledFrom: scheduledDate,
      scheduledTo: scheduledDate,
      page: 1,
      pageSize: 100
    }));
    const remainingPages = await mapWithConcurrency(Array.from(stryMutAct_9fa48("12318") ? {} : (stryCov_9fa48("12318"), {
      length: stryMutAct_9fa48("12319") ? Math.min(0, page.totalPages - 1) : (stryCov_9fa48("12319"), Math.max(0, stryMutAct_9fa48("12320") ? page.totalPages + 1 : (stryCov_9fa48("12320"), page.totalPages - 1)))
    }), stryMutAct_9fa48("12321") ? () => undefined : (stryCov_9fa48("12321"), (_, index) => stryMutAct_9fa48("12322") ? index - 2 : (stryCov_9fa48("12322"), index + 2))), 6, stryMutAct_9fa48("12323") ? () => undefined : (stryCov_9fa48("12323"), pageNumber => servicesAdapter.list(stryMutAct_9fa48("12324") ? {} : (stryCov_9fa48("12324"), {
      scheduledFrom: scheduledDate,
      scheduledTo: scheduledDate,
      page: pageNumber,
      pageSize: 100
    }))));
    return mapWithConcurrency((stryMutAct_9fa48("12325") ? [] : (stryCov_9fa48("12325"), [page, ...remainingPages])).flatMap(stryMutAct_9fa48("12326") ? () => undefined : (stryCov_9fa48("12326"), result => result.services)), 6, async summary => {
      if (stryMutAct_9fa48("12327")) {
        {}
      } else {
        stryCov_9fa48("12327");
        const service = await servicesAdapter.get(summary.id);
        const zoneResults = stryMutAct_9fa48("12328") ? service.zoneResults && (await servicesAdapter.getZoneResults(service.id)) : (stryCov_9fa48("12328"), service.zoneResults ?? (await servicesAdapter.getZoneResults(service.id)));
        return stryMutAct_9fa48("12329") ? {} : (stryCov_9fa48("12329"), {
          service,
          zoneResults
        });
      }
    });
  }
}
export async function loadRoute(routeId: string): Promise<Route> {
  if (stryMutAct_9fa48("12330")) {
    {}
  } else {
    stryCov_9fa48("12330");
    return routesAdapter.get(routeId);
  }
}