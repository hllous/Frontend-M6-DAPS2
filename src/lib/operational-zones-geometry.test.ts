import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isCoordinateInsideOperationalZone,
  parseOperationalZoneGeoJson,
  polygonCenter,
  resolveOperationalZones,
  routeToStopOverlays,
  safeParseOperationalZoneGeoJson,
  toLeafletPolygons,
  zoneGeometryCode,
  type MapCoordinate,
  type OperationalZoneGeometry,
} from "./operational-zones";
import type { Route } from "./routes";
import type { Zone } from "./zones";

afterEach(() => vi.restoreAllMocks());

// Anillos en [lat, lng] (formato Leaflet).
const square = (lo: number, hi: number): MapCoordinate[] => [[lo, lo], [lo, hi], [hi, hi], [hi, lo], [lo, lo]];
const geometry = (...polygons: MapCoordinate[][][]): Pick<OperationalZoneGeometry, "coordinates"> => ({ coordinates: polygons });

describe("isCoordinateInsideOperationalZone", () => {
  const zone = geometry([square(0, 10)]);

  it.each([
    [[5, 5], true],
    [[0.5, 9.5], true],
    [[-1, 5], false],
    [[11, 5], false],
    [[5, -1], false],
    [[5, 11], false],
    [[10.0001, 5], false],
  ] as [MapCoordinate, boolean][])("punto %j dentro=%s", (point, inside) => {
    expect(isCoordinateInsideOperationalZone(point, zone)).toBe(inside);
  });

  it.each([
    [[0, 5]], [[10, 5]], [[5, 0]], [[5, 10]], [[0, 0]], [[10, 10]],
  ] as [MapCoordinate][])("un punto sobre el borde %j cuenta como dentro", (point) => {
    expect(isCoordinateInsideOperationalZone(point, zone)).toBe(true);
  });

  it("un punto sobre la prolongación de un lado, fuera del segmento, queda fuera", () => {
    expect(isCoordinateInsideOperationalZone([0, 12], zone)).toBe(false);
    expect(isCoordinateInsideOperationalZone([0, -2], zone)).toBe(false);
    expect(isCoordinateInsideOperationalZone([12, 0], zone)).toBe(false);
    expect(isCoordinateInsideOperationalZone([-2, 10], zone)).toBe(false);
  });

  it("un punto apenas fuera del borde (más que la tolerancia) queda fuera", () => {
    expect(isCoordinateInsideOperationalZone([5, 10 + 1e-6], zone)).toBe(false);
    expect(isCoordinateInsideOperationalZone([-1e-6, 5], zone)).toBe(false);
  });

  it("un punto sobre una diagonal cuenta como borde y uno apenas fuera no", () => {
    const triangle = geometry([[[0, 0], [10, 10], [0, 10], [0, 0]]]);
    expect(isCoordinateInsideOperationalZone([5, 5], triangle)).toBe(true);
    expect(isCoordinateInsideOperationalZone([5, 4], triangle)).toBe(false);
    expect(isCoordinateInsideOperationalZone([4, 5], triangle)).toBe(true);
  });

  it("excluye los agujeros pero incluye su borde", () => {
    const withHole = geometry([square(0, 10), square(4, 6)]);
    expect(isCoordinateInsideOperationalZone([5, 5], withHole)).toBe(false);
    expect(isCoordinateInsideOperationalZone([4, 5], withHole)).toBe(true);
    expect(isCoordinateInsideOperationalZone([2, 2], withHole)).toBe(true);
  });

  it("con varios polígonos alcanza con estar en alguno, y con ninguno queda fuera", () => {
    const multi = geometry([square(0, 1)], [square(10, 11)]);
    expect(isCoordinateInsideOperationalZone([10.5, 10.5], multi)).toBe(true);
    expect(isCoordinateInsideOperationalZone([0.5, 0.5], multi)).toBe(true);
    expect(isCoordinateInsideOperationalZone([5, 5], multi)).toBe(false);
    expect(isCoordinateInsideOperationalZone([5, 5], geometry())).toBe(false);
  });

  it("un anillo con menos de tres puntos no contiene nada", () => {
    expect(isCoordinateInsideOperationalZone([0, 0], geometry([[[0, 0], [1, 1]]]))).toBe(false);
    expect(isCoordinateInsideOperationalZone([0.5, 0.5], geometry([[]]))).toBe(false);
  });

  it("un anillo de exactamente tres puntos sí se evalúa", () => {
    expect(isCoordinateInsideOperationalZone([1, 1], geometry([[[0, 0], [0, 4], [4, 0]]]))).toBe(true);
  });

  it("detecta el interior de un polígono cóncavo (cruce por la izquierda y por la derecha)", () => {
    const ushape = geometry([[[0, 0], [0, 9], [9, 9], [9, 6], [3, 6], [3, 3], [9, 3], [9, 0], [0, 0]]]);
    expect(isCoordinateInsideOperationalZone([1, 5], ushape)).toBe(true);
    expect(isCoordinateInsideOperationalZone([6, 4.5], ushape)).toBe(false);
    expect(isCoordinateInsideOperationalZone([8, 1], ushape)).toBe(true);
    expect(isCoordinateInsideOperationalZone([8, 8], ushape)).toBe(true);
    expect(isCoordinateInsideOperationalZone([10, 4.5], ushape)).toBe(false);
  });
});

describe("polygonCenter", () => {
  it("el centro de un cuadrado y de un rectángulo desplazado es el centro geométrico", () => {
    const [lat, lng] = polygonCenter([[square(0, 10)]]);
    expect(lat).toBeCloseTo(5);
    expect(lng).toBeCloseTo(5);
    const rect: MapCoordinate[] = [[2, 10], [2, 14], [8, 14], [8, 10], [2, 10]];
    const [rLat, rLng] = polygonCenter([[rect]]);
    expect(rLat).toBeCloseTo(5);
    expect(rLng).toBeCloseTo(12);
  });

  it("el orden horario o antihorario da el mismo centro", () => {
    const cw = polygonCenter([[square(0, 6)]]);
    const ccw = polygonCenter([[[...square(0, 6)].reverse()]]);
    expect(cw[0]).toBeCloseTo(ccw[0]);
    expect(cw[1]).toBeCloseTo(ccw[1]);
  });

  it("el centro de un polígono asimétrico es su centroide de área, no el promedio de vértices", () => {
    // Trapecio: el promedio de vértices sería [1.5, 2]; el centroide de área es [1.25, 13/6].
    const [lat, lng] = polygonCenter([[[[0, 0], [0, 6], [3, 2], [3, 0], [0, 0]]]]);
    expect(lat).toBeCloseTo(1.25);
    expect(lng).toBeCloseTo(13 / 6);
  });

  it("un anillo de área despreciable (menor que EPSILON) devuelve el promedio de sus vértices distintos", () => {
    // El mismo trapecio escalado a 1e-9: su doble área (~2.4e-17) queda bajo Number.EPSILON.
    const tiny: MapCoordinate[] = [[0, 0], [0, 6e-9], [3e-9, 2e-9], [3e-9, 0], [0, 0]];
    const [lat, lng] = polygonCenter([[tiny]]);
    expect(lat).toBeCloseTo(1.5e-9, 15);
    expect(lng).toBeCloseTo(2e-9, 15);
  });

  it("un anillo de menos de tres puntos devuelve su primer punto", () => {
    expect(polygonCenter([[[[3, 4], [5, 6]]]])).toEqual([3, 4]);
  });

  it("un anillo de exactamente tres puntos se calcula como polígono", () => {
    // Con `<= 3` devolvería el primer punto [0, 0].
    const [lat, lng] = polygonCenter([[[[0, 0], [0, 6], [6, 0]]]]);
    expect(lat).toBeCloseTo(2);
    expect(lng).toBeCloseTo(2);
  });

  it("elige el anillo de mayor área aunque esté primero y con orientación opuesta", () => {
    const large = [...square(0, 10)].reverse();
    const [lat, lng] = polygonCenter([[large], [square(20, 21)]]);
    expect(lat).toBeCloseTo(5);
    expect(lng).toBeCloseTo(5);
  });

  it("ante dos anillos de igual área conserva el primero", () => {
    const [lat] = polygonCenter([[square(0, 2)], [square(10, 12)]]);
    expect(lat).toBeCloseTo(1);
  });
});

describe("toLeafletPolygons", () => {
  it("invierte [lng, lat] a [lat, lng] en Polygon y MultiPolygon", () => {
    const ring: [number, number][] = [[10, 20], [11, 20], [11, 21], [10, 20]];
    expect(toLeafletPolygons({ type: "Polygon", coordinates: [ring] })).toEqual([[[[20, 10], [20, 11], [21, 11], [20, 10]]]]);
    const swapped = [[20, 10], [20, 11], [21, 11], [20, 10]];
    expect(toLeafletPolygons({ type: "MultiPolygon", coordinates: [[ring], [ring]] })).toEqual([[swapped], [swapped]]);
  });
});

describe("safeParseOperationalZoneGeoJson", () => {
  const ring = [[0, 0], [1, 0], [1, 1], [0, 0]];
  const feature = (geometryValue: unknown, extra: object = {}) => ({
    type: "Feature",
    properties: { id: 1, nombre: "Palermo", zoneCode: "Z1", zoneName: "Zona 1", ...extra },
    geometry: geometryValue,
  });
  const collection = (...features: unknown[]) => ({ type: "FeatureCollection", features });

  it("acepta Polygon y MultiPolygon y conserva propiedades extra", () => {
    const ok = safeParseOperationalZoneGeoJson(collection(
      feature({ type: "Polygon", coordinates: [ring] }, { extra: 1 }),
      feature({ type: "MultiPolygon", coordinates: [[ring]] }),
    ));
    expect(ok.success).toBe(true);
    expect(ok.data?.features[0]?.properties).toMatchObject({ extra: 1 });
  });

  it.each([
    ["tipo de colección", { type: "Other", features: [] }],
    ["tipo de feature", collection({ ...feature({ type: "Polygon", coordinates: [ring] }), type: "X" })],
    ["geometría de punto", collection(feature({ type: "Point", coordinates: [0, 0] }))],
    ["anillo de menos de 4 puntos", collection(feature({ type: "Polygon", coordinates: [[[0, 0], [1, 0], [0, 0]]] }))],
    ["polígono sin anillos", collection(feature({ type: "Polygon", coordinates: [] }))],
    ["multipolígono vacío", collection(feature({ type: "MultiPolygon", coordinates: [] }))],
    ["longitud fuera de rango", collection(feature({ type: "Polygon", coordinates: [[[181, 0], [1, 0], [1, 1], [181, 0]]] }))],
    ["longitud menor al rango", collection(feature({ type: "Polygon", coordinates: [[[-181, 0], [1, 0], [1, 1], [-181, 0]]] }))],
    ["latitud fuera de rango", collection(feature({ type: "Polygon", coordinates: [[[0, 91], [1, 0], [1, 1], [0, 91]]] }))],
    ["latitud menor al rango", collection(feature({ type: "Polygon", coordinates: [[[0, -91], [1, 0], [1, 1], [0, -91]]] }))],
    ["coordenada infinita", collection(feature({ type: "Polygon", coordinates: [[[Infinity, 0], [1, 0], [1, 1], [Infinity, 0]]] }))],
    ["propiedades sin id numérico", collection(feature({ type: "Polygon", coordinates: [ring] }, { id: "1" }))],
    ["propiedades sin nombre", collection(feature({ type: "Polygon", coordinates: [ring] }, { nombre: 1 }))],
    ["propiedades sin zoneCode", collection(feature({ type: "Polygon", coordinates: [ring] }, { zoneCode: 1 }))],
    ["propiedades sin zoneName", collection(feature({ type: "Polygon", coordinates: [ring] }, { zoneName: 1 }))],
  ])("rechaza %s", (_name, value) => {
    expect(safeParseOperationalZoneGeoJson(value).success).toBe(false);
  });

  it("acepta coordenadas justo en los límites del rango", () => {
    const edge = [[-180, -90], [180, -90], [180, 90], [-180, -90]];
    expect(safeParseOperationalZoneGeoJson(collection(feature({ type: "Polygon", coordinates: [edge] }))).success).toBe(true);
  });

  it("rechaza un anillo abierto con el mensaje de anillo cerrado (primer o segundo componente distinto)", () => {
    const openLng = safeParseOperationalZoneGeoJson(collection(feature({ type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [2, 0]]] })));
    const openLat = safeParseOperationalZoneGeoJson(collection(feature({ type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 2]]] })));
    for (const result of [openLng, openLat]) {
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => issue.message)).toContain("A GeoJSON linear ring must be closed.");
    }
  });
});

describe("parseOperationalZoneGeoJson", () => {
  const ring = [[-58.4, -34.6], [-58.4, -34.5], [-58.3, -34.5], [-58.4, -34.6]];
  const build = (nombre: string) => ({
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: { id: 1, nombre, zoneCode: "Z", zoneName: "Zona Z" }, geometry: { type: "Polygon", coordinates: [ring] } }],
  });

  it("normaliza el nombre del barrio a un código (acentos, espacios y símbolos)", () => {
    const [zone] = parseOperationalZoneGeoJson(build("  Villa Gral. Mitre  "));
    expect(zone).toMatchObject({ code: "villa-gral-mitre", name: "Zona Z", sourceName: "  Villa Gral. Mitre  " });
    expect(parseOperationalZoneGeoJson(build("San Nicolás"))[0]?.code).toBe("san-nicolas");
    expect(parseOperationalZoneGeoJson(build("Parque Chacabuco"))[0]?.code).toBe("parque-chacabuco");
    expect(parseOperationalZoneGeoJson(build("Boca 2"))[0]?.code).toBe("boca-2");
  });

  it("traduce el alias Monserrat a Montserrat", () => {
    expect(parseOperationalZoneGeoJson(build("Monserrat"))[0]?.code).toBe("montserrat");
  });

  it("convierte las coordenadas a [lat, lng] y calcula un centro dentro del polígono", () => {
    const [zone] = parseOperationalZoneGeoJson(build("X"));
    expect(zone?.coordinates[0]?.[0]?.[0]).toEqual([-34.6, -58.4]);
    expect(isCoordinateInsideOperationalZone(zone!.center, zone!)).toBe(true);
  });

  it("si el GeoJSON es inválido devuelve [] y lo informa en consola con el motivo", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(parseOperationalZoneGeoJson({ nope: true })).toEqual([]);
    expect(error).toHaveBeenCalledWith("Operational zone GeoJSON is invalid; zone overlays are disabled.", expect.anything());
  });
});

describe("zoneGeometryCode y resolveOperationalZones", () => {
  const zoneOf = (id: string, code: string, codigo?: string) =>
    ({ id, code, name: `Zona ${code}`, neighborhood: codigo ? { codigo } : null }) as unknown as Zone;
  const geo = (code: string): OperationalZoneGeometry => ({ code, name: code, sourceName: code, coordinates: [], center: [0, 0] });

  it("prefiere el código del barrio y cae al código de la zona", () => {
    expect(zoneGeometryCode(zoneOf("1", "Z1", "palermo"))).toBe("palermo");
    expect(zoneGeometryCode(zoneOf("1", "Z1"))).toBe("Z1");
  });

  it("cruza cada geometría con su zona o con null", () => {
    const zones = [zoneOf("1", "Z1", "palermo"), zoneOf("2", "Z2", "boedo")];
    const resolved = resolveOperationalZones(zones, [geo("boedo"), geo("otro")]);
    expect(resolved.map((entry) => entry.zone?.id ?? null)).toEqual(["2", null]);
    expect(resolved[0]).toMatchObject({ code: "boedo" });
    expect(resolveOperationalZones(zones, [])).toEqual([]);
  });
});

describe("routeToStopOverlays", () => {
  const zones = [
    { id: "z1", code: "Z1", name: "Nombre catálogo", neighborhood: { codigo: "palermo" } },
    { id: "z2", code: "Z2", name: "Dos", neighborhood: null },
  ] as unknown as Zone[];
  const stop = (id: string, sequence: number, zoneId: string, extra: object = {}) =>
    ({ id, sequence, zoneId, zoneCode: `old-${zoneId}`, zoneName: `viejo ${zoneId}`, ...extra });

  it("ordena por secuencia sin mutar la ruta y prefiere los datos vigentes del catálogo", () => {
    const route = { stops: [stop("b", 2, "z2", { estimatedDurationMin: 15 }), stop("a", 1, "z1"), stop("c", 3, "zx")] } as unknown as Route;
    const overlays = routeToStopOverlays(route, zones);
    expect(route.stops.map((s) => s.id)).toEqual(["b", "a", "c"]);
    expect(overlays.map((o) => o.id)).toEqual(["a", "b", "c"]);
    expect(overlays[0]).toMatchObject({ sequence: 1, zoneCode: "palermo", zoneName: "Nombre catálogo", estimatedDurationMin: null, geometry: null });
    expect(overlays[1]).toMatchObject({ zoneCode: "Z2", zoneName: "Dos", estimatedDurationMin: 15 });
    expect(overlays[2]).toMatchObject({ zoneCode: "old-zx", zoneName: "viejo zx" });
  });

  it("conserva una duración estimada de 0", () => {
    const route = { stops: [stop("a", 1, "z1", { estimatedDurationMin: 0 })] } as unknown as Route;
    expect(routeToStopOverlays(route, zones)[0]?.estimatedDurationMin).toBe(0);
  });
});
