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
import { geometrySchema, isCoordinateInsideOperationalZone, polygonCenter, toLeafletPolygons, type MapCoordinate, type MapPolygon } from "./operational-zones";

/**
 * Límites de comunas y barrios de CABA (#708, #709): assets estáticos en `public/geo/`.
 * Fuente: BA Data, Gobierno de la Ciudad de Buenos Aires, datasets "Comunas" y "Barrios".
 * Licencia: Creative Commons Atribución 2.5 Argentina (CC BY 2.5 AR). Ver `public/geo/README.md`.
 *
 * Se emparejan con la API por clave, nunca por id (los ids son UUID):
 * barrio = `codigo` (slug sin acentos), comuna = `commune.code` (`comuna-N`).
 */
export const COMMUNES_GEOJSON_URL = stryMutAct_9fa48("11307") ? "" : (stryCov_9fa48("11307"), "/geo/comunas.geojson");
export const BARRIOS_GEOJSON_URL = stryMutAct_9fa48("11308") ? "" : (stryCov_9fa48("11308"), "/geo/barrios.geojson");
const featureCollection = stryMutAct_9fa48("11309") ? () => undefined : (stryCov_9fa48("11309"), (() => {
  const featureCollection = <P extends z.ZodType,>(properties: P) => z.object(stryMutAct_9fa48("11310") ? {} : (stryCov_9fa48("11310"), {
    features: z.array(z.object(stryMutAct_9fa48("11311") ? {} : (stryCov_9fa48("11311"), {
      properties,
      geometry: geometrySchema
    })))
  }));
  return featureCollection;
})());
const communesGeoJsonSchema = featureCollection(z.object(stryMutAct_9fa48("11312") ? {} : (stryCov_9fa48("11312"), {
  COMUNAS: z.number()
})).passthrough());
const barriosGeoJsonSchema = featureCollection(z.object(stryMutAct_9fa48("11313") ? {} : (stryCov_9fa48("11313"), {
  BARRIO: z.string(),
  COMUNA: z.number()
})).passthrough());

// El GeoJSON abrevia o escribe distinto estos barrios respecto del `codigo` de M9.
const BARRIO_CODE_ALIASES: Record<string, string> = stryMutAct_9fa48("11314") ? {} : (stryCov_9fa48("11314"), {
  boca: stryMutAct_9fa48("11315") ? "" : (stryCov_9fa48("11315"), "la-boca"),
  paternal: stryMutAct_9fa48("11316") ? "" : (stryCov_9fa48("11316"), "la-paternal"),
  "villa-gral-mitre": stryMutAct_9fa48("11317") ? "" : (stryCov_9fa48("11317"), "villa-general-mitre")
});
export function barrioCodeFromName(name: string): string {
  if (stryMutAct_9fa48("11318")) {
    {}
  } else {
    stryCov_9fa48("11318");
    const slug = stryMutAct_9fa48("11320") ? name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : stryMutAct_9fa48("11319") ? name.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toUpperCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : (stryCov_9fa48("11319", "11320"), name.normalize(stryMutAct_9fa48("11321") ? "" : (stryCov_9fa48("11321"), "NFD")).replace(stryMutAct_9fa48("11322") ? /[^̀-ͯ]/g : (stryCov_9fa48("11322"), /[̀-ͯ]/g), stryMutAct_9fa48("11323") ? "Stryker was here!" : (stryCov_9fa48("11323"), "")).trim().toLowerCase().replace(stryMutAct_9fa48("11325") ? /[a-z0-9]+/g : stryMutAct_9fa48("11324") ? /[^a-z0-9]/g : (stryCov_9fa48("11324", "11325"), /[^a-z0-9]+/g), stryMutAct_9fa48("11326") ? "" : (stryCov_9fa48("11326"), "-")).replace(stryMutAct_9fa48("11328") ? /^-|-/g : stryMutAct_9fa48("11327") ? /-|-$/g : (stryCov_9fa48("11327", "11328"), /^-|-$/g), stryMutAct_9fa48("11329") ? "Stryker was here!" : (stryCov_9fa48("11329"), "")));
    return stryMutAct_9fa48("11330") ? BARRIO_CODE_ALIASES[slug] && slug : (stryCov_9fa48("11330"), BARRIO_CODE_ALIASES[slug] ?? slug);
  }
}
export const communeCode = stryMutAct_9fa48("11331") ? () => undefined : (stryCov_9fa48("11331"), (() => {
  const communeCode = (number: number) => stryMutAct_9fa48("11332") ? `` : (stryCov_9fa48("11332"), `comuna-${number}`);
  return communeCode;
})());
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
  barriosWithoutPolygon: {
    code: string;
    name: string;
    communeCode: string;
  }[];
};
export const EMPTY_BOUNDARIES: MapBoundaries = stryMutAct_9fa48("11333") ? {} : (stryCov_9fa48("11333"), {
  communes: stryMutAct_9fa48("11334") ? ["Stryker was here"] : (stryCov_9fa48("11334"), []),
  barrios: stryMutAct_9fa48("11335") ? ["Stryker was here"] : (stryCov_9fa48("11335"), []),
  barriosWithoutPolygon: stryMutAct_9fa48("11336") ? ["Stryker was here"] : (stryCov_9fa48("11336"), [])
});
type CatalogCommune = {
  code: string;
  name: string;
};
type CatalogNeighborhood = {
  codigo: string;
  nombre: string;
  zona: string;
  activo?: boolean;
};
function titleCase(name: string) {
  if (stryMutAct_9fa48("11337")) {
    {}
  } else {
    stryCov_9fa48("11337");
    return stryMutAct_9fa48("11338") ? name.toUpperCase().replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase()) : (stryCov_9fa48("11338"), name.toLowerCase().replace(stryMutAct_9fa48("11342") ? /(^|[\s-])(\P{L})/gu : stryMutAct_9fa48("11341") ? /(^|[\S-])(\p{L})/gu : stryMutAct_9fa48("11340") ? /(^|[^\s-])(\p{L})/gu : stryMutAct_9fa48("11339") ? /([\s-])(\p{L})/gu : (stryCov_9fa48("11339", "11340", "11341", "11342"), /(^|[\s-])(\p{L})/gu), stryMutAct_9fa48("11343") ? () => undefined : (stryCov_9fa48("11343"), (_, sep: string, letter: string) => stryMutAct_9fa48("11344") ? sep - letter.toUpperCase() : (stryCov_9fa48("11344"), sep + (stryMutAct_9fa48("11345") ? letter.toLowerCase() : (stryCov_9fa48("11345"), letter.toUpperCase()))))));
  }
}
function bboxOf(coordinates: MapPolygon[]): BoundaryBarrio["bbox"] {
  if (stryMutAct_9fa48("11346")) {
    {}
  } else {
    stryCov_9fa48("11346");
    let south = Infinity;
    let west = Infinity;
    let north = stryMutAct_9fa48("11347") ? +Infinity : (stryCov_9fa48("11347"), -Infinity);
    let east = stryMutAct_9fa48("11348") ? +Infinity : (stryCov_9fa48("11348"), -Infinity);
    for (const polygon of coordinates) {
      if (stryMutAct_9fa48("11349")) {
        {}
      } else {
        stryCov_9fa48("11349");
        for (const [lat, lng] of stryMutAct_9fa48("11350") ? polygon[0] && [] : (stryCov_9fa48("11350"), polygon[0] ?? (stryMutAct_9fa48("11351") ? ["Stryker was here"] : (stryCov_9fa48("11351"), [])))) {
          if (stryMutAct_9fa48("11352")) {
            {}
          } else {
            stryCov_9fa48("11352");
            south = stryMutAct_9fa48("11353") ? Math.max(south, lat) : (stryCov_9fa48("11353"), Math.min(south, lat));
            north = stryMutAct_9fa48("11354") ? Math.min(north, lat) : (stryCov_9fa48("11354"), Math.max(north, lat));
            west = stryMutAct_9fa48("11355") ? Math.max(west, lng) : (stryCov_9fa48("11355"), Math.min(west, lng));
            east = stryMutAct_9fa48("11356") ? Math.min(east, lng) : (stryCov_9fa48("11356"), Math.max(east, lng));
          }
        }
      }
    }
    return stryMutAct_9fa48("11357") ? [] : (stryCov_9fa48("11357"), [south, west, north, east]);
  }
}

// Un tono por comuna (ángulo áureo: comunas vecinas quedan lejos en el círculo cromático) y un
// escalón de luminosidad por barrio. Relleno translúcido sobre un mapa claro: el borde oscuro del
// mismo tono lleva el contraste, tanto en modo claro como oscuro.
function barrioColors(communeNumber: number, indexInCommune: number) {
  if (stryMutAct_9fa48("11358")) {
    {}
  } else {
    stryCov_9fa48("11358");
    const hue = Math.round(stryMutAct_9fa48("11359") ? communeNumber * 137.508 * 360 : (stryCov_9fa48("11359"), (stryMutAct_9fa48("11360") ? communeNumber / 137.508 : (stryCov_9fa48("11360"), communeNumber * 137.508)) % 360));
    const lightness = stryMutAct_9fa48("11361") ? 46 - indexInCommune % 4 * 8 : (stryCov_9fa48("11361"), 46 + (stryMutAct_9fa48("11362") ? indexInCommune % 4 / 8 : (stryCov_9fa48("11362"), (stryMutAct_9fa48("11363") ? indexInCommune * 4 : (stryCov_9fa48("11363"), indexInCommune % 4)) * 8)));
    return stryMutAct_9fa48("11364") ? {} : (stryCov_9fa48("11364"), {
      fill: stryMutAct_9fa48("11365") ? `` : (stryCov_9fa48("11365"), `hsl(${hue} 62% ${lightness}%)`),
      stroke: stryMutAct_9fa48("11366") ? `` : (stryCov_9fa48("11366"), `hsl(${hue} 70% 22%)`)
    });
  }
}

/**
 * Cruza los GeoJSON con el catálogo de la API. Tolerante: un polígono sin barrio en la API se dibuja
 * con el nombre del GeoJSON, y un barrio de la API sin polígono va a `barriosWithoutPolygon`.
 */
export function buildMapBoundaries(communesGeoJson: unknown, barriosGeoJson: unknown, catalog: {
  communes?: CatalogCommune[];
  neighborhoods?: CatalogNeighborhood[];
} = {}): MapBoundaries {
  if (stryMutAct_9fa48("11367")) {
    {}
  } else {
    stryCov_9fa48("11367");
    const communes = communesGeoJsonSchema.safeParse(communesGeoJson);
    const barrios = barriosGeoJsonSchema.safeParse(barriosGeoJson);
    if (stryMutAct_9fa48("11370") ? !communes.success && !barrios.success : stryMutAct_9fa48("11369") ? false : stryMutAct_9fa48("11368") ? true : (stryCov_9fa48("11368", "11369", "11370"), (stryMutAct_9fa48("11371") ? communes.success : (stryCov_9fa48("11371"), !communes.success)) || (stryMutAct_9fa48("11372") ? barrios.success : (stryCov_9fa48("11372"), !barrios.success)))) {
      if (stryMutAct_9fa48("11373")) {
        {}
      } else {
        stryCov_9fa48("11373");
        console.error(stryMutAct_9fa48("11375") ? "" : (stryCov_9fa48("11375"), "Commune/barrio GeoJSON is invalid; boundary layers are disabled."));
        return EMPTY_BOUNDARIES;
      }
    }
    const apiCommuneName = new Map((stryMutAct_9fa48("11376") ? catalog.communes && [] : (stryCov_9fa48("11376"), catalog.communes ?? (stryMutAct_9fa48("11377") ? ["Stryker was here"] : (stryCov_9fa48("11377"), [])))).map(stryMutAct_9fa48("11378") ? () => undefined : (stryCov_9fa48("11378"), commune => stryMutAct_9fa48("11379") ? [] : (stryCov_9fa48("11379"), [commune.code, commune.name]))));
    const apiBarrioName = new Map((stryMutAct_9fa48("11380") ? catalog.neighborhoods && [] : (stryCov_9fa48("11380"), catalog.neighborhoods ?? (stryMutAct_9fa48("11381") ? ["Stryker was here"] : (stryCov_9fa48("11381"), [])))).map(stryMutAct_9fa48("11382") ? () => undefined : (stryCov_9fa48("11382"), barrio => stryMutAct_9fa48("11383") ? [] : (stryCov_9fa48("11383"), [barrio.codigo, barrio.nombre]))));
    const builtCommunes = stryMutAct_9fa48("11384") ? communes.data.features.map((feature): BoundaryCommune => {
      const number = feature.properties.COMUNAS;
      const coordinates = toLeafletPolygons(feature.geometry);
      return {
        code: communeCode(number),
        number,
        name: apiCommuneName.get(communeCode(number)) ?? `Comuna ${number}`,
        coordinates,
        center: polygonCenter(coordinates)
      };
    }) : (stryCov_9fa48("11384"), communes.data.features.map((feature): BoundaryCommune => {
      if (stryMutAct_9fa48("11385")) {
        {}
      } else {
        stryCov_9fa48("11385");
        const number = feature.properties.COMUNAS;
        const coordinates = toLeafletPolygons(feature.geometry);
        return stryMutAct_9fa48("11386") ? {} : (stryCov_9fa48("11386"), {
          code: communeCode(number),
          number,
          name: stryMutAct_9fa48("11387") ? apiCommuneName.get(communeCode(number)) && `Comuna ${number}` : (stryCov_9fa48("11387"), apiCommuneName.get(communeCode(number)) ?? (stryMutAct_9fa48("11388") ? `` : (stryCov_9fa48("11388"), `Comuna ${number}`))),
          coordinates,
          center: polygonCenter(coordinates)
        });
      }
    }).sort(stryMutAct_9fa48("11389") ? () => undefined : (stryCov_9fa48("11389"), (left, right) => stryMutAct_9fa48("11390") ? left.number + right.number : (stryCov_9fa48("11390"), left.number - right.number))));
    const indexInCommune = new Map<number, number>();
    const builtBarrios = stryMutAct_9fa48("11391") ? barrios.data.features.map((feature): BoundaryBarrio => {
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
        ...barrioColors(number, index)
      };
    }) : (stryCov_9fa48("11391"), barrios.data.features.map((feature): BoundaryBarrio => {
      if (stryMutAct_9fa48("11392")) {
        {}
      } else {
        stryCov_9fa48("11392");
        const code = barrioCodeFromName(feature.properties.BARRIO);
        const number = feature.properties.COMUNA;
        const index = stryMutAct_9fa48("11393") ? indexInCommune.get(number) && 0 : (stryCov_9fa48("11393"), indexInCommune.get(number) ?? 0);
        indexInCommune.set(number, stryMutAct_9fa48("11395") ? index - 1 : (stryCov_9fa48("11395"), index + 1));
        const coordinates = toLeafletPolygons(feature.geometry);
        return stryMutAct_9fa48("11396") ? {} : (stryCov_9fa48("11396"), {
          code,
          name: stryMutAct_9fa48("11397") ? apiBarrioName.get(code) && titleCase(feature.properties.BARRIO) : (stryCov_9fa48("11397"), apiBarrioName.get(code) ?? titleCase(feature.properties.BARRIO)),
          communeCode: communeCode(number),
          coordinates,
          bbox: bboxOf(coordinates),
          ...barrioColors(number, index)
        });
      }
    }).sort(stryMutAct_9fa48("11398") ? () => undefined : (stryCov_9fa48("11398"), (left, right) => left.name.localeCompare(right.name, stryMutAct_9fa48("11399") ? "" : (stryCov_9fa48("11399"), "es")))));
    const drawn = new Set(builtBarrios.map(stryMutAct_9fa48("11400") ? () => undefined : (stryCov_9fa48("11400"), barrio => barrio.code)));
    const barriosWithoutPolygon = stryMutAct_9fa48("11401") ? (catalog.neighborhoods ?? []).map(barrio => ({
      code: barrio.codigo,
      name: barrio.nombre,
      communeCode: barrio.zona
    })) : (stryCov_9fa48("11401"), (stryMutAct_9fa48("11402") ? catalog.neighborhoods && [] : (stryCov_9fa48("11402"), catalog.neighborhoods ?? (stryMutAct_9fa48("11403") ? ["Stryker was here"] : (stryCov_9fa48("11403"), [])))).filter(stryMutAct_9fa48("11404") ? () => undefined : (stryCov_9fa48("11404"), barrio => stryMutAct_9fa48("11407") ? barrio.activo !== false && !drawn.has(barrio.codigo) || /^comuna-\d+$/.test(barrio.zona) : stryMutAct_9fa48("11406") ? false : stryMutAct_9fa48("11405") ? true : (stryCov_9fa48("11405", "11406", "11407"), (stryMutAct_9fa48("11409") ? barrio.activo !== false || !drawn.has(barrio.codigo) : stryMutAct_9fa48("11408") ? true : (stryCov_9fa48("11408", "11409"), (stryMutAct_9fa48("11411") ? barrio.activo === false : stryMutAct_9fa48("11410") ? true : (stryCov_9fa48("11410", "11411"), barrio.activo !== (stryMutAct_9fa48("11412") ? true : (stryCov_9fa48("11412"), false)))) && (stryMutAct_9fa48("11413") ? drawn.has(barrio.codigo) : (stryCov_9fa48("11413"), !drawn.has(barrio.codigo))))) && (stryMutAct_9fa48("11417") ? /^comuna-\D+$/ : stryMutAct_9fa48("11416") ? /^comuna-\d$/ : stryMutAct_9fa48("11415") ? /^comuna-\d+/ : stryMutAct_9fa48("11414") ? /comuna-\d+$/ : (stryCov_9fa48("11414", "11415", "11416", "11417"), /^comuna-\d+$/)).test(barrio.zona)))).map(stryMutAct_9fa48("11418") ? () => undefined : (stryCov_9fa48("11418"), barrio => stryMutAct_9fa48("11419") ? {} : (stryCov_9fa48("11419"), {
      code: barrio.codigo,
      name: barrio.nombre,
      communeCode: barrio.zona
    }))));
    return stryMutAct_9fa48("11420") ? {} : (stryCov_9fa48("11420"), {
      communes: builtCommunes,
      barrios: builtBarrios,
      barriosWithoutPolygon
    });
  }
}

/** Descarga los dos GeoJSON estáticos (el caché HTTP del navegador evita repetir la descarga). */
export function fetchBoundaryGeoJson(): Promise<[unknown, unknown]> {
  if (stryMutAct_9fa48("11421")) {
    {}
  } else {
    stryCov_9fa48("11421");
    const load = async (url: string) => {
      if (stryMutAct_9fa48("11422")) {
        {}
      } else {
        stryCov_9fa48("11422");
        const response = await fetch(url);
        if (stryMutAct_9fa48("11425") ? false : stryMutAct_9fa48("11424") ? true : stryMutAct_9fa48("11423") ? response.ok : (stryCov_9fa48("11423", "11424", "11425"), !response.ok)) throw new Error(stryMutAct_9fa48("11427") ? `` : (stryCov_9fa48("11427"), `No se pudo cargar ${url}`));
        return (await response.json()) as unknown;
      }
    };
    return Promise.all(stryMutAct_9fa48("11428") ? [] : (stryCov_9fa48("11428"), [load(COMMUNES_GEOJSON_URL), load(BARRIOS_GEOJSON_URL)]));
  }
}

// ---------------------------------------------------------------------------
// Visibilidad (#720)
// ---------------------------------------------------------------------------

/** Códigos de comuna y de barrio que están visibles. */
export type BoundaryVisibility = {
  communes: ReadonlySet<string>;
  barrios: ReadonlySet<string>;
};
export function showAll(boundaries: MapBoundaries): BoundaryVisibility {
  if (stryMutAct_9fa48("11429")) {
    {}
  } else {
    stryCov_9fa48("11429");
    return stryMutAct_9fa48("11430") ? {} : (stryCov_9fa48("11430"), {
      communes: new Set(boundaries.communes.map(stryMutAct_9fa48("11431") ? () => undefined : (stryCov_9fa48("11431"), commune => commune.code))),
      barrios: new Set(boundaries.barrios.map(stryMutAct_9fa48("11432") ? () => undefined : (stryCov_9fa48("11432"), barrio => barrio.code)))
    });
  }
}
export const hideAll = stryMutAct_9fa48("11433") ? () => undefined : (stryCov_9fa48("11433"), (() => {
  const hideAll = (): BoundaryVisibility => stryMutAct_9fa48("11434") ? {} : (stryCov_9fa48("11434"), {
    communes: new Set(),
    barrios: new Set()
  });
  return hideAll;
})());

/** Ocultar una comuna oculta sus barrios; mostrarla los muestra a todos. */
export function setCommuneVisible(boundaries: MapBoundaries, current: BoundaryVisibility, code: string, visible: boolean): BoundaryVisibility {
  if (stryMutAct_9fa48("11435")) {
    {}
  } else {
    stryCov_9fa48("11435");
    const communes = new Set(current.communes);
    const barrios = new Set(current.barrios);
    if (stryMutAct_9fa48("11437") ? false : stryMutAct_9fa48("11436") ? true : (stryCov_9fa48("11436", "11437"), visible)) {
      if (stryMutAct_9fa48("11438")) {
        ;
      } else {
        stryCov_9fa48("11438");
        communes.add(code);
      }
    } else if (stryMutAct_9fa48("11439")) {
      ;
    } else {
      stryCov_9fa48("11439");
      communes.delete(code);
    }
    for (const barrio of boundaries.barrios) {
      if (stryMutAct_9fa48("11440")) {
        {}
      } else {
        stryCov_9fa48("11440");
        if (stryMutAct_9fa48("11443") ? barrio.communeCode === code : stryMutAct_9fa48("11442") ? false : stryMutAct_9fa48("11441") ? true : (stryCov_9fa48("11441", "11442", "11443"), barrio.communeCode !== code)) continue;
        if (stryMutAct_9fa48("11445") ? false : stryMutAct_9fa48("11444") ? true : (stryCov_9fa48("11444", "11445"), visible)) {
          if (stryMutAct_9fa48("11446")) {
            ;
          } else {
            stryCov_9fa48("11446");
            barrios.add(barrio.code);
          }
        } else if (stryMutAct_9fa48("11447")) {
          ;
        } else {
          stryCov_9fa48("11447");
          barrios.delete(barrio.code);
        }
      }
    }
    return stryMutAct_9fa48("11448") ? {} : (stryCov_9fa48("11448"), {
      communes,
      barrios
    });
  }
}

/** Mostrar un barrio de una comuna oculta lo muestra a él solo: la comuna sigue oculta. */
export function setBarrioVisible(current: BoundaryVisibility, code: string, visible: boolean): BoundaryVisibility {
  if (stryMutAct_9fa48("11449")) {
    {}
  } else {
    stryCov_9fa48("11449");
    const barrios = new Set(current.barrios);
    if (stryMutAct_9fa48("11451") ? false : stryMutAct_9fa48("11450") ? true : (stryCov_9fa48("11450", "11451"), visible)) {
      if (stryMutAct_9fa48("11452")) {
        ;
      } else {
        stryCov_9fa48("11452");
        barrios.add(code);
      }
    } else if (stryMutAct_9fa48("11453")) {
      ;
    } else {
      stryCov_9fa48("11453");
      barrios.delete(code);
    }
    return stryMutAct_9fa48("11454") ? {} : (stryCov_9fa48("11454"), {
      communes: current.communes,
      barrios
    });
  }
}

/** Con todo visible no se filtra nada. */
export function isFilterActive(boundaries: MapBoundaries, visibility: BoundaryVisibility): boolean {
  if (stryMutAct_9fa48("11455")) {
    {}
  } else {
    stryCov_9fa48("11455");
    return stryMutAct_9fa48("11458") ? visibility.barrios.size < boundaries.barrios.length && visibility.communes.size < boundaries.communes.length : stryMutAct_9fa48("11457") ? false : stryMutAct_9fa48("11456") ? true : (stryCov_9fa48("11456", "11457", "11458"), (stryMutAct_9fa48("11461") ? visibility.barrios.size >= boundaries.barrios.length : stryMutAct_9fa48("11460") ? visibility.barrios.size <= boundaries.barrios.length : stryMutAct_9fa48("11459") ? false : (stryCov_9fa48("11459", "11460", "11461"), visibility.barrios.size < boundaries.barrios.length)) || (stryMutAct_9fa48("11464") ? visibility.communes.size >= boundaries.communes.length : stryMutAct_9fa48("11463") ? visibility.communes.size <= boundaries.communes.length : stryMutAct_9fa48("11462") ? false : (stryCov_9fa48("11462", "11463", "11464"), visibility.communes.size < boundaries.communes.length)));
  }
}

/** Código del barrio que contiene el punto `[lat, lng]`, o null si cae fuera de todos. */
export function barrioAt(boundaries: MapBoundaries, [lat, lng]: MapCoordinate): string | null {
  if (stryMutAct_9fa48("11465")) {
    {}
  } else {
    stryCov_9fa48("11465");
    for (const barrio of boundaries.barrios) {
      if (stryMutAct_9fa48("11466")) {
        {}
      } else {
        stryCov_9fa48("11466");
        const [south, west, north, east] = barrio.bbox;
        if (stryMutAct_9fa48("11469") ? (lat < south || lat > north || lng < west) && lng > east : stryMutAct_9fa48("11468") ? false : stryMutAct_9fa48("11467") ? true : (stryCov_9fa48("11467", "11468", "11469"), (stryMutAct_9fa48("11471") ? (lat < south || lat > north) && lng < west : stryMutAct_9fa48("11470") ? false : (stryCov_9fa48("11470", "11471"), (stryMutAct_9fa48("11473") ? lat < south && lat > north : stryMutAct_9fa48("11472") ? false : (stryCov_9fa48("11472", "11473"), (stryMutAct_9fa48("11476") ? lat >= south : stryMutAct_9fa48("11475") ? lat <= south : stryMutAct_9fa48("11474") ? false : (stryCov_9fa48("11474", "11475", "11476"), lat < south)) || (stryMutAct_9fa48("11479") ? lat <= north : stryMutAct_9fa48("11478") ? lat >= north : stryMutAct_9fa48("11477") ? false : (stryCov_9fa48("11477", "11478", "11479"), lat > north)))) || (stryMutAct_9fa48("11482") ? lng >= west : stryMutAct_9fa48("11481") ? lng <= west : stryMutAct_9fa48("11480") ? false : (stryCov_9fa48("11480", "11481", "11482"), lng < west)))) || (stryMutAct_9fa48("11485") ? lng <= east : stryMutAct_9fa48("11484") ? lng >= east : stryMutAct_9fa48("11483") ? false : (stryCov_9fa48("11483", "11484", "11485"), lng > east)))) continue;
        if (stryMutAct_9fa48("11487") ? false : stryMutAct_9fa48("11486") ? true : (stryCov_9fa48("11486", "11487"), isCoordinateInsideOperationalZone(stryMutAct_9fa48("11488") ? [] : (stryCov_9fa48("11488"), [lat, lng]), barrio))) return barrio.code;
      }
    }
    return null;
  }
}

/** Un marcador se ve si no hay filtro activo o si cae dentro de un barrio visible. */
export function isPointVisible(boundaries: MapBoundaries, visibility: BoundaryVisibility, point: MapCoordinate): boolean {
  if (stryMutAct_9fa48("11489")) {
    {}
  } else {
    stryCov_9fa48("11489");
    if (stryMutAct_9fa48("11492") ? false : stryMutAct_9fa48("11491") ? true : stryMutAct_9fa48("11490") ? isFilterActive(boundaries, visibility) : (stryCov_9fa48("11490", "11491", "11492"), !isFilterActive(boundaries, visibility))) return stryMutAct_9fa48("11493") ? false : (stryCov_9fa48("11493"), true);
    const code = barrioAt(boundaries, point);
    return stryMutAct_9fa48("11496") ? code !== null || visibility.barrios.has(code) : stryMutAct_9fa48("11495") ? false : stryMutAct_9fa48("11494") ? true : (stryCov_9fa48("11494", "11495", "11496"), (stryMutAct_9fa48("11498") ? code === null : stryMutAct_9fa48("11497") ? true : (stryCov_9fa48("11497", "11498"), code !== null)) && visibility.barrios.has(code));
  }
}