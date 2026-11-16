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

// Limites que el backend valida con class-validator (`src/common/decorators/` de
// Backend-M6-DAPS2). Corre con `forbidNonWhitelisted`, asi que un valor fuera de
// rango termina en 400 en lugar de guardarse; el frontend los anticipa.
export const MAX_SEARCH_LENGTH = 100;
export const MAX_EXTERNAL_ID_LENGTH = 100;
export const MAX_NOTES_LENGTH = 2000;
export const MAX_REASON_LENGTH = 500;
export const MAX_ARRAY_ITEMS = 100;
// CreateServiceDto limita `ticketId` a 64 (mas estricto que el resto de los ids externos).
export const MAX_TICKET_ID_LENGTH = 64;
export const MAX_INT32 = 2147483647;
// Decimal(10,2): capacity, areaM2, weightKg, volumeM3.
export const MAX_DECIMAL_10_2 = 99999999.99;
export const MAX_TREE_HEIGHT_M = 999.99;
export const MAX_TREE_DIAMETER_CM = 9999.9;
export const MAX_PAGE = 10000000;
export const MAX_PAGE_SIZE = 100;
export const COORDINATE_DECIMALS = 7;

/**
 * El backend cuenta los decimales sobre la forma textual del numero (max 7), asi
 * que un mapa que entrega -34.123456789 termina en 400. Se redondea antes de enviar.
 */
export function roundCoordinate(value: number): number {
  if (stryMutAct_9fa48("10296")) {
    {}
  } else {
    stryCov_9fa48("10296");
    return Number(value.toFixed(COORDINATE_DECIMALS));
  }
}
const coordinateInput = stryMutAct_9fa48("10297") ? () => undefined : (stryCov_9fa48("10297"), (() => {
  const coordinateInput = (min: number, max: number, label: string) => stryMutAct_9fa48("10299") ? z.number({
    message: `${label} debe ser un número válido.`
  }).finite(`${label} debe ser un número válido.`).max(min, `${label} debe estar entre ${min} y ${max}.`).max(max, `${label} debe estar entre ${min} y ${max}.`).transform(roundCoordinate) : stryMutAct_9fa48("10298") ? z.number({
    message: `${label} debe ser un número válido.`
  }).finite(`${label} debe ser un número válido.`).min(min, `${label} debe estar entre ${min} y ${max}.`).min(max, `${label} debe estar entre ${min} y ${max}.`).transform(roundCoordinate) : (stryCov_9fa48("10298", "10299"), z.number(stryMutAct_9fa48("10300") ? {} : (stryCov_9fa48("10300"), {
    message: stryMutAct_9fa48("10301") ? `` : (stryCov_9fa48("10301"), `${label} debe ser un número válido.`)
  })).finite(stryMutAct_9fa48("10302") ? `` : (stryCov_9fa48("10302"), `${label} debe ser un número válido.`)).min(min, stryMutAct_9fa48("10303") ? `` : (stryCov_9fa48("10303"), `${label} debe estar entre ${min} y ${max}.`)).max(max, stryMutAct_9fa48("10304") ? `` : (stryCov_9fa48("10304"), `${label} debe estar entre ${min} y ${max}.`)).transform(roundCoordinate));
  return coordinateInput;
})());
export const latitudeInput = stryMutAct_9fa48("10305") ? () => undefined : (stryCov_9fa48("10305"), (() => {
  const latitudeInput = () => coordinateInput(stryMutAct_9fa48("10306") ? +90 : (stryCov_9fa48("10306"), -90), 90, stryMutAct_9fa48("10307") ? "" : (stryCov_9fa48("10307"), "La latitud"));
  return latitudeInput;
})());
export const longitudeInput = stryMutAct_9fa48("10308") ? () => undefined : (stryCov_9fa48("10308"), (() => {
  const longitudeInput = () => coordinateInput(stryMutAct_9fa48("10309") ? +180 : (stryCov_9fa48("10309"), -180), 180, stryMutAct_9fa48("10310") ? "" : (stryCov_9fa48("10310"), "La longitud"));
  return longitudeInput;
})());

/** Medida decimal acotada (mismo tope que la columna del backend); `min` inclusivo. */
export const boundedDecimalInput = (label: string, max: number, options: {
  positive?: boolean;
} = {}) => {
  if (stryMutAct_9fa48("10311")) {
    {}
  } else {
    stryCov_9fa48("10311");
    const base = z.number(stryMutAct_9fa48("10312") ? {} : (stryCov_9fa48("10312"), {
      message: stryMutAct_9fa48("10313") ? `` : (stryCov_9fa48("10313"), `${label} debe ser un número.`)
    })).finite(stryMutAct_9fa48("10314") ? `` : (stryCov_9fa48("10314"), `${label} debe ser un número.`));
    const lowerBounded = options.positive ? base.positive(stryMutAct_9fa48("10315") ? `` : (stryCov_9fa48("10315"), `${label} debe ser mayor que cero.`)) : base.nonnegative(stryMutAct_9fa48("10316") ? `` : (stryCov_9fa48("10316"), `${label} no puede ser negativa.`));
    return stryMutAct_9fa48("10317") ? lowerBounded.min(max, `${label} no puede superar ${max}.`) : (stryCov_9fa48("10317"), lowerBounded.max(max, stryMutAct_9fa48("10318") ? `` : (stryCov_9fa48("10318"), `${label} no puede superar ${max}.`)));
  }
};

/** Id externo (usuario, organizacion, ticket, etc.) que el backend limita a 100. */
export const externalIdInput = stryMutAct_9fa48("10319") ? () => undefined : (stryCov_9fa48("10319"), (() => {
  const externalIdInput = (message = stryMutAct_9fa48("10320") ? "" : (stryCov_9fa48("10320"), "El identificador es obligatorio.")) => stryMutAct_9fa48("10323") ? z.string().min(1, message).max(MAX_EXTERNAL_ID_LENGTH, `El identificador no puede superar los ${MAX_EXTERNAL_ID_LENGTH} caracteres.`) : stryMutAct_9fa48("10322") ? z.string().trim().max(1, message).max(MAX_EXTERNAL_ID_LENGTH, `El identificador no puede superar los ${MAX_EXTERNAL_ID_LENGTH} caracteres.`) : stryMutAct_9fa48("10321") ? z.string().trim().min(1, message).min(MAX_EXTERNAL_ID_LENGTH, `El identificador no puede superar los ${MAX_EXTERNAL_ID_LENGTH} caracteres.`) : (stryCov_9fa48("10321", "10322", "10323"), z.string().trim().min(1, message).max(MAX_EXTERNAL_ID_LENGTH, stryMutAct_9fa48("10324") ? `` : (stryCov_9fa48("10324"), `El identificador no puede superar los ${MAX_EXTERNAL_ID_LENGTH} caracteres.`)));
  return externalIdInput;
})());

/** Lista de ids externos: hasta 100 elementos y 100 caracteres cada uno. */
export const externalIdListInput = stryMutAct_9fa48("10325") ? () => undefined : (stryCov_9fa48("10325"), (() => {
  const externalIdListInput = (options: {
    itemMessage?: string;
    emptyMessage?: string;
  } = {}) => stryMutAct_9fa48("10327") ? z.array(externalIdInput(options.itemMessage)).max(1, options.emptyMessage ?? "Seleccione al menos un elemento.").max(MAX_ARRAY_ITEMS, `No puede seleccionar más de ${MAX_ARRAY_ITEMS} elementos.`) : stryMutAct_9fa48("10326") ? z.array(externalIdInput(options.itemMessage)).min(1, options.emptyMessage ?? "Seleccione al menos un elemento.").min(MAX_ARRAY_ITEMS, `No puede seleccionar más de ${MAX_ARRAY_ITEMS} elementos.`) : (stryCov_9fa48("10326", "10327"), z.array(externalIdInput(options.itemMessage)).min(1, stryMutAct_9fa48("10328") ? options.emptyMessage && "Seleccione al menos un elemento." : (stryCov_9fa48("10328"), options.emptyMessage ?? (stryMutAct_9fa48("10329") ? "" : (stryCov_9fa48("10329"), "Seleccione al menos un elemento.")))).max(MAX_ARRAY_ITEMS, stryMutAct_9fa48("10330") ? `` : (stryCov_9fa48("10330"), `No puede seleccionar más de ${MAX_ARRAY_ITEMS} elementos.`)));
  return externalIdListInput;
})());

/** Motivo de un cambio de estado (cancelar, reprogramar, aviso de demora). */
export const reasonInput = stryMutAct_9fa48("10331") ? () => undefined : (stryCov_9fa48("10331"), (() => {
  const reasonInput = (requiredMessage: string) => stryMutAct_9fa48("10334") ? z.string().min(1, requiredMessage).max(MAX_REASON_LENGTH, `El motivo no puede superar los ${MAX_REASON_LENGTH} caracteres.`) : stryMutAct_9fa48("10333") ? z.string().trim().max(1, requiredMessage).max(MAX_REASON_LENGTH, `El motivo no puede superar los ${MAX_REASON_LENGTH} caracteres.`) : stryMutAct_9fa48("10332") ? z.string().trim().min(1, requiredMessage).min(MAX_REASON_LENGTH, `El motivo no puede superar los ${MAX_REASON_LENGTH} caracteres.`) : (stryCov_9fa48("10332", "10333", "10334"), z.string().trim().min(1, requiredMessage).max(MAX_REASON_LENGTH, stryMutAct_9fa48("10335") ? `` : (stryCov_9fa48("10335"), `El motivo no puede superar los ${MAX_REASON_LENGTH} caracteres.`)));
  return reasonInput;
})());

/** Fija `page` dentro de 1..MAX_PAGE; un valor no numerico se descarta (default del backend). */
export function clampPage(value: number): number | undefined {
  if (stryMutAct_9fa48("10336")) {
    {}
  } else {
    stryCov_9fa48("10336");
    return clampInteger(value, 1, MAX_PAGE);
  }
}

/** Fija `pageSize` dentro de 1..MAX_PAGE_SIZE; un valor no numerico se descarta. */
export function clampPageSize(value: number): number | undefined {
  if (stryMutAct_9fa48("10337")) {
    {}
  } else {
    stryCov_9fa48("10337");
    return clampInteger(value, 1, MAX_PAGE_SIZE);
  }
}
function clampInteger(value: number, min: number, max: number): number | undefined {
  if (stryMutAct_9fa48("10338")) {
    {}
  } else {
    stryCov_9fa48("10338");
    if (stryMutAct_9fa48("10341") ? false : stryMutAct_9fa48("10340") ? true : stryMutAct_9fa48("10339") ? Number.isFinite(value) : (stryCov_9fa48("10339", "10340", "10341"), !Number.isFinite(value))) return undefined;
    return stryMutAct_9fa48("10342") ? Math.max(max, Math.max(min, Math.trunc(value))) : (stryCov_9fa48("10342"), Math.min(max, stryMutAct_9fa48("10343") ? Math.min(min, Math.trunc(value)) : (stryCov_9fa48("10343"), Math.max(min, Math.trunc(value)))));
  }
}
export function pageParam(searchParams: URLSearchParams): number | undefined {
  if (stryMutAct_9fa48("10344")) {
    {}
  } else {
    stryCov_9fa48("10344");
    return searchParams.has(stryMutAct_9fa48("10345") ? "" : (stryCov_9fa48("10345"), "page")) ? clampPage(Number(searchParams.get(stryMutAct_9fa48("10346") ? "" : (stryCov_9fa48("10346"), "page")))) : undefined;
  }
}
export function pageSizeParam(searchParams: URLSearchParams): number | undefined {
  if (stryMutAct_9fa48("10347")) {
    {}
  } else {
    stryCov_9fa48("10347");
    return searchParams.has(stryMutAct_9fa48("10348") ? "" : (stryCov_9fa48("10348"), "pageSize")) ? clampPageSize(Number(searchParams.get(stryMutAct_9fa48("10349") ? "" : (stryCov_9fa48("10349"), "pageSize")))) : undefined;
  }
}

/** Filtro booleano: solo "true"/"false"; cualquier otro valor se ignora en vez de leerse como false. */
export function booleanParam(searchParams: URLSearchParams, name: string): boolean | undefined {
  if (stryMutAct_9fa48("10350")) {
    {}
  } else {
    stryCov_9fa48("10350");
    const value = searchParams.get(name);
    return (stryMutAct_9fa48("10353") ? value !== "true" : stryMutAct_9fa48("10352") ? false : stryMutAct_9fa48("10351") ? true : (stryCov_9fa48("10351", "10352", "10353"), value === (stryMutAct_9fa48("10354") ? "" : (stryCov_9fa48("10354"), "true")))) ? stryMutAct_9fa48("10355") ? false : (stryCov_9fa48("10355"), true) : (stryMutAct_9fa48("10358") ? value !== "false" : stryMutAct_9fa48("10357") ? false : stryMutAct_9fa48("10356") ? true : (stryCov_9fa48("10356", "10357", "10358"), value === (stryMutAct_9fa48("10359") ? "" : (stryCov_9fa48("10359"), "false")))) ? stryMutAct_9fa48("10360") ? true : (stryCov_9fa48("10360"), false) : undefined;
  }
}

/** Trunca la busqueda al maximo que acepta el backend en lugar de rechazarla con 400. */
export function searchParam(searchParams: URLSearchParams): string | undefined {
  if (stryMutAct_9fa48("10361")) {
    {}
  } else {
    stryCov_9fa48("10361");
    const value = searchParams.get(stryMutAct_9fa48("10362") ? "" : (stryCov_9fa48("10362"), "search"));
    return (stryMutAct_9fa48("10365") ? value !== null : stryMutAct_9fa48("10364") ? false : stryMutAct_9fa48("10363") ? true : (stryCov_9fa48("10363", "10364", "10365"), value === null)) ? undefined : stryMutAct_9fa48("10366") ? value : (stryCov_9fa48("10366"), value.slice(0, MAX_SEARCH_LENGTH));
  }
}
export type CoordinateFieldResult = {
  value: number;
  error?: undefined;
} | {
  value?: undefined;
  error: string;
};

/**
 * Valida el texto de un campo de coordenada: numerico, dentro del rango y
 * redondeado a 7 decimales. El error queda listo para mostrar en el formulario.
 */
export function parseCoordinateField(raw: string, kind: "lat" | "lng"): CoordinateFieldResult {
  if (stryMutAct_9fa48("10367")) {
    {}
  } else {
    stryCov_9fa48("10367");
    const noun = (stryMutAct_9fa48("10370") ? kind !== "lat" : stryMutAct_9fa48("10369") ? false : stryMutAct_9fa48("10368") ? true : (stryCov_9fa48("10368", "10369", "10370"), kind === (stryMutAct_9fa48("10371") ? "" : (stryCov_9fa48("10371"), "lat")))) ? stryMutAct_9fa48("10372") ? "" : (stryCov_9fa48("10372"), "latitud") : stryMutAct_9fa48("10373") ? "" : (stryCov_9fa48("10373"), "longitud");
    const text = stryMutAct_9fa48("10374") ? raw : (stryCov_9fa48("10374"), raw.trim());
    if (stryMutAct_9fa48("10377") ? false : stryMutAct_9fa48("10376") ? true : stryMutAct_9fa48("10375") ? text : (stryCov_9fa48("10375", "10376", "10377"), !text)) return stryMutAct_9fa48("10378") ? {} : (stryCov_9fa48("10378"), {
      error: stryMutAct_9fa48("10379") ? `` : (stryCov_9fa48("10379"), `Indique una ${noun} numérica válida.`)
    });
    if (stryMutAct_9fa48("10382") ? false : stryMutAct_9fa48("10381") ? true : stryMutAct_9fa48("10380") ? /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) : (stryCov_9fa48("10380", "10381", "10382"), !(stryMutAct_9fa48("10393") ? /^[+-]?(?:\d+(?:\.\d*)?|\.\D+)$/ : stryMutAct_9fa48("10392") ? /^[+-]?(?:\d+(?:\.\d*)?|\.\d)$/ : stryMutAct_9fa48("10391") ? /^[+-]?(?:\d+(?:\.\D*)?|\.\d+)$/ : stryMutAct_9fa48("10390") ? /^[+-]?(?:\d+(?:\.\d)?|\.\d+)$/ : stryMutAct_9fa48("10389") ? /^[+-]?(?:\d+(?:\.\d*)|\.\d+)$/ : stryMutAct_9fa48("10388") ? /^[+-]?(?:\D+(?:\.\d*)?|\.\d+)$/ : stryMutAct_9fa48("10387") ? /^[+-]?(?:\d(?:\.\d*)?|\.\d+)$/ : stryMutAct_9fa48("10386") ? /^[^+-]?(?:\d+(?:\.\d*)?|\.\d+)$/ : stryMutAct_9fa48("10385") ? /^[+-](?:\d+(?:\.\d*)?|\.\d+)$/ : stryMutAct_9fa48("10384") ? /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)/ : stryMutAct_9fa48("10383") ? /[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/ : (stryCov_9fa48("10383", "10384", "10385", "10386", "10387", "10388", "10389", "10390", "10391", "10392", "10393"), /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/)).test(text))) {
      if (stryMutAct_9fa48("10394")) {
        {}
      } else {
        stryCov_9fa48("10394");
        return stryMutAct_9fa48("10395") ? {} : (stryCov_9fa48("10395"), {
          error: stryMutAct_9fa48("10396") ? `` : (stryCov_9fa48("10396"), `La ${noun} debe ser un número válido.`)
        });
      }
    }
    const parsed = ((stryMutAct_9fa48("10399") ? kind !== "lat" : stryMutAct_9fa48("10398") ? false : stryMutAct_9fa48("10397") ? true : (stryCov_9fa48("10397", "10398", "10399"), kind === (stryMutAct_9fa48("10400") ? "" : (stryCov_9fa48("10400"), "lat")))) ? latitudeInput() : longitudeInput()).safeParse(Number(text));
    if (stryMutAct_9fa48("10403") ? false : stryMutAct_9fa48("10402") ? true : stryMutAct_9fa48("10401") ? parsed.success : (stryCov_9fa48("10401", "10402", "10403"), !parsed.success)) {
      if (stryMutAct_9fa48("10404")) {
        {}
      } else {
        stryCov_9fa48("10404");
        const message = stryMutAct_9fa48("10405") ? parsed.error.issues[0]?.message && `Indique una ${noun} numérica válida.` : (stryCov_9fa48("10405"), (stryMutAct_9fa48("10406") ? parsed.error.issues[0].message : (stryCov_9fa48("10406"), parsed.error.issues[0]?.message)) ?? (stryMutAct_9fa48("10407") ? `` : (stryCov_9fa48("10407"), `Indique una ${noun} numérica válida.`)));
        return stryMutAct_9fa48("10408") ? {} : (stryCov_9fa48("10408"), {
          error: message
        });
      }
    }
    return stryMutAct_9fa48("10409") ? {} : (stryCov_9fa48("10409"), {
      value: parsed.data
    });
  }
}