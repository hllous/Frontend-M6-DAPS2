import { z } from "zod";

/**
 * Orden de los listados paginados de catálogos (Backend #703): `?sort=<campo>&order=asc|desc`.
 * Una sola fuente de verdad: campos aceptados por recurso, qué columna de la tabla manda cada campo
 * y cómo se arma la query. El Backend ordena todo el resultado antes de paginar y desempata por `id`.
 */
export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/** Campos de `sort` por recurso; el primero es el orden por defecto del Backend. */
export const CATALOG_SORT_FIELDS = {
  vehicles: ["plate", "vehicleType", "capacity", "active", "createdAt"],
  containers: ["code", "containerType", "status", "capacityLiters", "createdAt"],
  trees: ["surveyCode", "species", "active", "createdAt"],
  crews: ["name", "crewType", "defaultShift", "active", "createdAt"],
  routes: ["code", "name", "active", "createdAt"],
  "green-points": ["code", "name", "active", "createdAt"],
  "green-spaces": ["name", "spaceType", "active", "createdAt"],
} as const;

export type CatalogResource = keyof typeof CATALOG_SORT_FIELDS;
export type CatalogSortField<R extends CatalogResource> = (typeof CATALOG_SORT_FIELDS)[R][number];
export type CatalogSortQuery<R extends CatalogResource> = { sort?: CatalogSortField<R>; order?: SortOrder };

/**
 * Columna de la tabla (id) -> campo de `sort`. Una columna que no figura acá no ofrece ordenar:
 * el Backend no tiene campo para ella (zona, dirección, medidas, paradas, etc.).
 */
export const CATALOG_SORT_COLUMNS: { [R in CatalogResource]: Readonly<Record<string, CatalogSortField<R>>> } = {
  vehicles: { plate: "plate", type: "vehicleType", capacity: "capacity", status: "active" },
  containers: { code: "code", type: "containerType", capacity: "capacityLiters", status: "status" },
  trees: { surveyCode: "surveyCode", species: "species", status: "active" },
  crews: { name: "name", type: "crewType", shift: "defaultShift", status: "active" },
  routes: { code: "code", name: "name", status: "active" },
  "green-points": { code: "code", name: "name", status: "active" },
  "green-spaces": { name: "name", type: "spaceType", status: "active" },
};

const orderSchema = z.enum(SORT_ORDERS);

/** Contrato Zod de `sort` y `order` de un recurso (lista cerrada, igual que `@SortField` del Backend). */
export function catalogSortSchema<R extends CatalogResource>(resource: R) {
  return z.object({
    sort: z.enum(CATALOG_SORT_FIELDS[resource] as unknown as [CatalogSortField<R>, ...CatalogSortField<R>[]]).optional(),
    order: orderSchema.optional(),
  });
}

export type ParsedCatalogSort<R extends CatalogResource> =
  | { ok: true; value: CatalogSortQuery<R> }
  | { ok: false; message: string };

/** Lee `sort` y `order` de la query del BFF. Un valor fuera de la lista no se ignora: da `ok: false` (el BFF responde 400, como el Backend). */
export function parseCatalogSort<R extends CatalogResource>(resource: R, searchParams: URLSearchParams): ParsedCatalogSort<R> {
  const parsed = catalogSortSchema(resource).safeParse({
    sort: searchParams.get("sort") ?? undefined,
    order: searchParams.get("order") ?? undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: `Orden inválido. «sort» admite: ${CATALOG_SORT_FIELDS[resource].join(", ")}; «order» admite: ${SORT_ORDERS.join(", ")}.`,
    };
  }
  return { ok: true, value: parsed.data as CatalogSortQuery<R> };
}

/** Suma `sort` y `order` a una query string; sin ellos no agrega nada (el orden no cambia). */
export function appendSortParams(params: URLSearchParams, query: { sort?: string; order?: SortOrder }): void {
  if (query.sort) params.set("sort", query.sort);
  if (query.order) params.set("order", query.order);
}

export type ColumnSorting = readonly { id: string; desc: boolean }[];

/**
 * Estado de orden de la tabla -> `sort`/`order` del Backend. Sin orden elegido (o con una columna sin campo)
 * devuelve `{}`: el Backend aplica su orden por defecto. `asc` va siempre explícito para que la query sea inequívoca.
 */
export function sortingToQuery<R extends CatalogResource>(resource: R, sorting: ColumnSorting): CatalogSortQuery<R> {
  const [first] = sorting;
  const field = first ? CATALOG_SORT_COLUMNS[resource][first.id] : undefined;
  return field ? { sort: field, order: first.desc ? "desc" : "asc" } : {};
}
