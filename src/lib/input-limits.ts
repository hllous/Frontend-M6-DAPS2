import { z } from "zod";

// Limites que el backend valida con class-validator (`src/common/decorators/` de
// Backend-M6-DAPS2). Corre con `forbidNonWhitelisted`, asi que un valor fuera de
// rango termina en 400 en lugar de guardarse; el frontend los anticipa.
export const MAX_SEARCH_LENGTH = 100;
export const MAX_EXTERNAL_ID_LENGTH = 100;
export const MAX_NOTES_LENGTH = 2000;
export const MAX_REASON_LENGTH = 500;
export const MAX_ARRAY_ITEMS = 100;

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
  return Number(value.toFixed(COORDINATE_DECIMALS));
}

const coordinateInput = (min: number, max: number, label: string) =>
  z
    .number({ message: `${label} debe ser un número válido.` })
    .finite(`${label} debe ser un número válido.`)
    .min(min, `${label} debe estar entre ${min} y ${max}.`)
    .max(max, `${label} debe estar entre ${min} y ${max}.`)
    .transform(roundCoordinate);

export const latitudeInput = () => coordinateInput(-90, 90, "La latitud");
export const longitudeInput = () => coordinateInput(-180, 180, "La longitud");

/** Medida decimal acotada (mismo tope que la columna del backend); `min` inclusivo. */
export const boundedDecimalInput = (label: string, max: number, options: { positive?: boolean } = {}) => {
  const base = z.number({ message: `${label} debe ser un número.` }).finite(`${label} debe ser un número.`);
  const lowerBounded = options.positive
    ? base.positive(`${label} debe ser mayor que cero.`)
    : base.nonnegative(`${label} no puede ser negativa.`);
  return lowerBounded.max(max, `${label} no puede superar ${max}.`);
};

/** Id externo (usuario, organizacion, ticket, etc.) que el backend limita a 100. */
export const externalIdInput = (message = "El identificador es obligatorio.") =>
  z
    .string()
    .trim()
    .min(1, message)
    .max(MAX_EXTERNAL_ID_LENGTH, `El identificador no puede superar los ${MAX_EXTERNAL_ID_LENGTH} caracteres.`);

/** Fija `page` dentro de 1..MAX_PAGE; un valor no numerico se descarta (default del backend). */
export function clampPage(value: number): number | undefined {
  return clampInteger(value, 1, MAX_PAGE);
}

/** Fija `pageSize` dentro de 1..MAX_PAGE_SIZE; un valor no numerico se descarta. */
export function clampPageSize(value: number): number | undefined {
  return clampInteger(value, 1, MAX_PAGE_SIZE);
}

function clampInteger(value: number, min: number, max: number): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function pageParam(searchParams: URLSearchParams): number | undefined {
  return searchParams.has("page") ? clampPage(Number(searchParams.get("page"))) : undefined;
}

export function pageSizeParam(searchParams: URLSearchParams): number | undefined {
  return searchParams.has("pageSize") ? clampPageSize(Number(searchParams.get("pageSize"))) : undefined;
}

/** Trunca la busqueda al maximo que acepta el backend en lugar de rechazarla con 400. */
export function searchParam(searchParams: URLSearchParams): string | undefined {
  const value = searchParams.get("search");
  return value === null ? undefined : value.slice(0, MAX_SEARCH_LENGTH);
}

export type CoordinateFieldResult = { value: number; error?: undefined } | { value?: undefined; error: string };

/**
 * Valida el texto de un campo de coordenada: numerico, dentro del rango y
 * redondeado a 7 decimales. El error queda listo para mostrar en el formulario.
 */
export function parseCoordinateField(raw: string, kind: "lat" | "lng"): CoordinateFieldResult {
  const noun = kind === "lat" ? "latitud" : "longitud";
  const text = raw.trim();
  if (!text) return { error: `Indique una ${noun} numérica válida.` };
  const parsed = (kind === "lat" ? latitudeInput() : longitudeInput()).safeParse(Number(text));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? `Indique una ${noun} numérica válida.`;
    return { error: message };
  }
  return { value: parsed.data };
}
