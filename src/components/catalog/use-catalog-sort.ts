"use client";

import { useCallback, useMemo, useState } from "react";

import type { DataTableColumn } from "@/components/ui/data-table";
import {
  CATALOG_SORT_COLUMNS,
  sortingToQuery,
  type CatalogResource,
  type CatalogSortQuery,
} from "@/lib/catalog-sort";

type Sorting = { id: string; desc: boolean }[];
type SortingUpdater = Sorting | ((old: Sorting) => Sorting);

/**
 * Orden por columna de un catálogo paginado, delegado al Backend (`sort` y `order`, #703).
 * Devuelve la query a mezclar con los filtros y las opciones de `useDataTable` (`manualSorting`: la tabla no
 * reordena la página cargada). Al cambiar el orden se vuelve a la página 1: es el comienzo del nuevo orden y
 * seguir en la página N mostraría un tramo arbitrario de él. La página 2 continúa el orden de la 1 porque el
 * Backend ordena todo el resultado antes de paginar.
 */
export function useCatalogSort<R extends CatalogResource>(resource: R, onSortChange: () => void) {
  const [sorting, setSorting] = useState<Sorting>([]);
  const sortQuery = useMemo<CatalogSortQuery<R>>(() => sortingToQuery(resource, sorting), [resource, sorting]);
  const onSortingChange = useCallback(
    (updater: SortingUpdater) => {
      setSorting(updater);
      onSortChange();
    },
    [onSortChange],
  );
  return { sortQuery, tableOptions: { manualSorting: true, state: { sorting }, onSortingChange } as const };
}

/**
 * Habilita ordenar solo las columnas con campo de `sort` en el Backend (`CATALOG_SORT_COLUMNS`); el resto no
 * ofrece ordenar. Con `manualSorting` el accesor no se usa para ordenar, pero TanStack lo exige para
 * considerar ordenable la columna.
 */
export function withCatalogSorting<T extends { id: string }>(
  resource: CatalogResource,
  columns: DataTableColumn<T>[],
): DataTableColumn<T>[] {
  const fields: Readonly<Record<string, string>> = CATALOG_SORT_COLUMNS[resource];
  return columns.map((column) => {
    const field = column.id ? fields[column.id] : undefined;
    if (!field) return { ...column, enableSorting: false };
    return {
      accessorFn: (row: T) => (row as Record<string, unknown>)[field],
      ...column,
      enableSorting: true,
    } as DataTableColumn<T>;
  });
}
