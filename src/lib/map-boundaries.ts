import { z } from "zod";

import {
  geometrySchema,
  isCoordinateInsideOperationalZone,
  polygonCenter,
  toLeafletPolygons,
  type MapCoordinate,
  type MapPolygon,
} from "./operational-zones";

/**
 * Límites de comunas y barrios de CABA (#708, #709): assets estáticos en `public/geo/`.
 * Fuente: BA Data, Gobierno de la Ciudad de Buenos Aires, datasets "Comunas" y "Barrios".
 * Licencia: Creative Commons Atribución 2.5 Argentina (CC BY 2.5 AR). Ver `public/geo/README.md`.
 *
 * Se emparejan con la API por clave, nunca por id (los ids son UUID):
 * barrio = `codigo` (slug sin acentos), comuna = `commune.code` (`comuna-N`).
 */
export const COMMUNES_GEOJSON_URL = "/geo/comunas.geojson";
export const BARRIOS_GEOJSON_URL = "/geo/barrios.geojson";

const featureCollection = <P extends z.ZodType>(properties: P) =>
  z.object({
    features: z.array(z.object({ properties, geometry: geometrySchema })),
  });
const communesGeoJsonSchema = featureCollection(z.object({ COMUNAS: z.number() }).passthrough());
const barriosGeoJsonSchema = featureCollection(z.object({ BARRIO: z.string(), COMUNA: z.number() }).passthrough());

// El GeoJSON abrevia o escribe distinto estos barrios respecto del `codigo` de M9.
const BARRIO_CODE_ALIASES: Record<string, string> = {
  boca: "la-boca",
  paternal: "la-paternal",
  "villa-gral-mitre": "villa-general-mitre",
};

export function barrioCodeFromName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return BARRIO_CODE_ALIASES[slug] ?? slug;
}

export const communeCode = (number: number) => `comuna-${number}`;

export type BoundaryCommune = {
  code: string;
  number: number;
  name: string;
  coordinates: MapPolygon[];
  center: MapCoordinate;
};

export type BoundaryBarrio = {
  code: string;
  name: string;
  communeCode: string;
  coordinates: MapPolygon[];
  /** [sur, oeste, norte, este] para descartar rápido antes de probar el polígono. */
  bbox: [number, number, number, number];
  fill: string;
  stroke: string;
};

export type MapBoundaries = {
  communes: BoundaryCommune[];
  /** Barrios con polígono. */
  barrios: BoundaryBarrio[];
  /** Barrios de la API sin polígono: se listan pero no se dibujan ni filtran. */
  barriosWithoutPolygon: { code: string; name: string; communeCode: string }[];
};

export const EMPTY_BOUNDARIES: MapBoundaries = { communes: [], barrios: [], barriosWithoutPolygon: [] };

type CatalogCommune = { code: string; name: string };
type CatalogNeighborhood = { codigo: string; nombre: string; zona: string; activo?: boolean };

function titleCase(name: string) {
  return name.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase());
}

function bboxOf(coordinates: MapPolygon[]): BoundaryBarrio["bbox"] {
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;
  for (const polygon of coordinates) {
    for (const [lat, lng] of polygon[0] ?? []) {
      south = Math.min(south, lat);
      north = Math.max(north, lat);
      west = Math.min(west, lng);
      east = Math.max(east, lng);
    }
  }
  return [south, west, north, east];
}

// Un tono por comuna (ángulo áureo: comunas vecinas quedan lejos en el círculo cromático) y un
// escalón de luminosidad por barrio. Relleno translúcido sobre un mapa claro: el borde oscuro del
// mismo tono lleva el contraste, tanto en modo claro como oscuro.
function barrioColors(communeNumber: number, indexInCommune: number) {
  const hue = Math.round((communeNumber * 137.508) % 360);
  const lightness = 46 + (indexInCommune % 4) * 8;
  return { fill: `hsl(${hue} 62% ${lightness}%)`, stroke: `hsl(${hue} 70% 22%)` };
}

/**
 * Cruza los GeoJSON con el catálogo de la API. Tolerante: un polígono sin barrio en la API se dibuja
 * con el nombre del GeoJSON, y un barrio de la API sin polígono va a `barriosWithoutPolygon`.
 */
export function buildMapBoundaries(
  communesGeoJson: unknown,
  barriosGeoJson: unknown,
  catalog: { communes?: CatalogCommune[]; neighborhoods?: CatalogNeighborhood[] } = {},
): MapBoundaries {
  const communes = communesGeoJsonSchema.safeParse(communesGeoJson);
  const barrios = barriosGeoJsonSchema.safeParse(barriosGeoJson);
  if (!communes.success || !barrios.success) {
    console.error("Commune/barrio GeoJSON is invalid; boundary layers are disabled.");
    return EMPTY_BOUNDARIES;
  }

  const apiCommuneName = new Map((catalog.communes ?? []).map((commune) => [commune.code, commune.name]));
  const apiBarrioName = new Map((catalog.neighborhoods ?? []).map((barrio) => [barrio.codigo, barrio.nombre]));

  const builtCommunes = communes.data.features
    .map((feature): BoundaryCommune => {
      const number = feature.properties.COMUNAS;
      const coordinates = toLeafletPolygons(feature.geometry);
      return {
        code: communeCode(number),
        number,
        name: apiCommuneName.get(communeCode(number)) ?? `Comuna ${number}`,
        coordinates,
        center: polygonCenter(coordinates),
      };
    })
    .sort((left, right) => left.number - right.number);

  const indexInCommune = new Map<number, number>();
  const builtBarrios = barrios.data.features
    .map((feature): BoundaryBarrio => {
      const code = barrioCodeFromName(feature.properties.BARRIO);
      const number = feature.properties.COMUNA;
      const index = indexInCommune.get(number) ?? 0;
      indexInCommune.set(number, index + 1);
      const coordinates = toLeafletPolygons(feature.geometry);
      return {
        code,
        name: apiBarrioName.get(code) ?? titleCase(feature.properties.BARRIO),
        communeCode: communeCode(number),
        coordinates,
        bbox: bboxOf(coordinates),
        ...barrioColors(number, index),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "es"));

  const drawn = new Set(builtBarrios.map((barrio) => barrio.code));
  const barriosWithoutPolygon = (catalog.neighborhoods ?? [])
    .filter((barrio) => barrio.activo !== false && !drawn.has(barrio.codigo) && /^comuna-\d+$/.test(barrio.zona))
    .map((barrio) => ({ code: barrio.codigo, name: barrio.nombre, communeCode: barrio.zona }));

  return { communes: builtCommunes, barrios: builtBarrios, barriosWithoutPolygon };
}

/** Descarga los dos GeoJSON estáticos (el caché HTTP del navegador evita repetir la descarga). */
export function fetchBoundaryGeoJson(): Promise<[unknown, unknown]> {
  const load = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`No se pudo cargar ${url}`);
    return (await response.json()) as unknown;
  };
  return Promise.all([load(COMMUNES_GEOJSON_URL), load(BARRIOS_GEOJSON_URL)]);
}

// ---------------------------------------------------------------------------
// Visibilidad (#720)
// ---------------------------------------------------------------------------

/** Códigos de comuna y de barrio que están visibles. */
export type BoundaryVisibility = { communes: ReadonlySet<string>; barrios: ReadonlySet<string> };

export function showAll(boundaries: MapBoundaries): BoundaryVisibility {
  return {
    communes: new Set(boundaries.communes.map((commune) => commune.code)),
    barrios: new Set(boundaries.barrios.map((barrio) => barrio.code)),
  };
}

export const hideAll = (): BoundaryVisibility => ({ communes: new Set(), barrios: new Set() });

/** Ocultar una comuna oculta sus barrios; mostrarla los muestra a todos. */
export function setCommuneVisible(
  boundaries: MapBoundaries,
  current: BoundaryVisibility,
  code: string,
  visible: boolean,
): BoundaryVisibility {
  const communes = new Set(current.communes);
  const barrios = new Set(current.barrios);
  if (visible) communes.add(code); else communes.delete(code);
  for (const barrio of boundaries.barrios) {
    if (barrio.communeCode !== code) continue;
    if (visible) barrios.add(barrio.code); else barrios.delete(barrio.code);
  }
  return { communes, barrios };
}

/** Mostrar un barrio de una comuna oculta lo muestra a él solo: la comuna sigue oculta. */
export function setBarrioVisible(current: BoundaryVisibility, code: string, visible: boolean): BoundaryVisibility {
  const barrios = new Set(current.barrios);
  if (visible) barrios.add(code); else barrios.delete(code);
  return { communes: current.communes, barrios };
}

/** Con todo visible no se filtra nada. */
export function isFilterActive(boundaries: MapBoundaries, visibility: BoundaryVisibility): boolean {
  return (
    visibility.barrios.size < boundaries.barrios.length || visibility.communes.size < boundaries.communes.length
  );
}

/** Código del barrio que contiene el punto `[lat, lng]`, o null si cae fuera de todos. */
export function barrioAt(boundaries: MapBoundaries, [lat, lng]: MapCoordinate): string | null {
  for (const barrio of boundaries.barrios) {
    const [south, west, north, east] = barrio.bbox;
    if (lat < south || lat > north || lng < west || lng > east) continue;
    if (isCoordinateInsideOperationalZone([lat, lng], barrio)) return barrio.code;
  }
  return null;
}

/** Un marcador se ve si no hay filtro activo o si cae dentro de un barrio visible. */
export function isPointVisible(
  boundaries: MapBoundaries,
  visibility: BoundaryVisibility,
  point: MapCoordinate,
): boolean {
  if (!isFilterActive(boundaries, visibility)) return true;
  const code = barrioAt(boundaries, point);
  return code !== null && visibility.barrios.has(code);
}
