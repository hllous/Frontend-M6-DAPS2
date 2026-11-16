import type { SortOrder } from "./catalog-sort";

type Comparable = string | number | boolean | null | undefined;

function rank(value: unknown, enumOrder: readonly string[] | undefined): Comparable {
  if (enumOrder && typeof value === "string") return enumOrder.indexOf(value);
  return value as Comparable;
}

/** Nulos al final en asc y al principio en desc, como Postgres. */
function compareValues(a: Comparable, b: Comparable): number {
  if (a == null || b == null) return a == null ? (b == null ? 0 : 1) : -1;
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b);
  return a === b ? 0 : a < b ? -1 : 1;
}

/**
 * Espejo del orden del Backend (#703) para los mocks: todo el resultado antes de paginar, desempate por `id`
 * en el mismo sentido y enums por orden de declaración (`enumOrders`), no alfabético. Sin `sort` ni `order`
 * devuelve la lista como vino; con solo `order`, invierte el orden por defecto.
 */
export function sortCatalogFixtures<T extends { id: string }>(
  items: readonly T[],
  query: { sort?: string; order?: SortOrder },
  defaultField: string,
  enumOrders: Readonly<Record<string, readonly string[]>> = {},
): T[] {
  if (!query.sort && !query.order) return [...items];
  const field = query.sort ?? defaultField;
  const direction = query.order === "desc" ? -1 : 1;
  return [...items].sort((a, b) => {
    const byField = compareValues(
      rank((a as Record<string, unknown>)[field], enumOrders[field]),
      rank((b as Record<string, unknown>)[field], enumOrders[field]),
    );
    return direction * (byField || a.id.localeCompare(b.id));
  });
}
