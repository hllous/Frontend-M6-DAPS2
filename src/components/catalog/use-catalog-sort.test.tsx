import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DataTableColumn } from "@/components/ui/data-table";
import { useCatalogSort, withCatalogSorting } from "./use-catalog-sort";

describe("useCatalogSort", () => {
  it("empieza sin orden: ni sort ni order, y la tabla no reordena por su cuenta", () => {
    const { result } = renderHook(() => useCatalogSort("vehicles", vi.fn()));

    expect(result.current.sortQuery).toEqual({});
    expect(result.current.tableOptions.manualSorting).toBe(true);
    expect(result.current.tableOptions.state.sorting).toEqual([]);
  });

  it("traduce la columna ordenada al campo del Backend y avisa del cambio (para volver a la página 1)", () => {
    const onSortChange = vi.fn();
    const { result } = renderHook(() => useCatalogSort("vehicles", onSortChange));

    act(() => result.current.tableOptions.onSortingChange([{ id: "type", desc: true }]));

    expect(result.current.sortQuery).toEqual({ sort: "vehicleType", order: "desc" });
    expect(result.current.tableOptions.state.sorting).toEqual([{ id: "type", desc: true }]);
    expect(onSortChange).toHaveBeenCalledTimes(1);
  });

  it("acepta un updater funcional y parte del orden vigente", () => {
    const { result } = renderHook(() => useCatalogSort("crews", vi.fn()));
    act(() => result.current.tableOptions.onSortingChange([{ id: "shift", desc: false }]));

    act(() => result.current.tableOptions.onSortingChange((old) => old.map((sort) => ({ ...sort, desc: !sort.desc }))));

    expect(result.current.sortQuery).toEqual({ sort: "defaultShift", order: "desc" });
  });

  it("al quitar el orden vuelve a no mandar sort ni order", () => {
    const { result } = renderHook(() => useCatalogSort("routes", vi.fn()));
    act(() => result.current.tableOptions.onSortingChange([{ id: "name", desc: false }]));

    act(() => result.current.tableOptions.onSortingChange([]));

    expect(result.current.sortQuery).toEqual({});
  });

  it("mantiene la misma query mientras el orden no cambie", () => {
    const { result, rerender } = renderHook(() => useCatalogSort("trees", vi.fn()));
    act(() => result.current.tableOptions.onSortingChange([{ id: "species", desc: false }]));
    const first = result.current.sortQuery;

    rerender();

    expect(result.current.sortQuery).toBe(first);
  });
});

type Row = { id: string; code: string; name: string };
const column = (id: string, extra: Partial<DataTableColumn<Row>> = {}): DataTableColumn<Row> =>
  ({ id, header: id, cell: () => null, ...extra }) as DataTableColumn<Row>;

describe("withCatalogSorting", () => {
  const columns = withCatalogSorting<Row>("routes", [column("code"), column("name"), column("stops"), column("status"), column("actions")]);
  const byId = Object.fromEntries(columns.map((c) => [c.id, c]));

  it("habilita solo las columnas con campo de orden en el Backend", () => {
    expect(columns.map((c) => [c.id, c.enableSorting])).toEqual([
      ["code", true],
      ["name", true],
      ["stops", false],
      ["status", true],
      ["actions", false],
    ]);
  });

  it("da a la columna ordenable un accesor del campo del Backend (TanStack lo exige para ordenar)", () => {
    const accessor = (byId.status as { accessorFn: (row: Row) => unknown }).accessorFn;

    expect(accessor({ id: "1", code: "A", name: "B", active: true } as unknown as Row)).toBe(true);
    expect((byId.code as { accessorFn: (row: Row) => unknown }).accessorFn({ id: "1", code: "A", name: "B" })).toBe("A");
  });

  it("respeta el accesor propio de la columna y no toca las no ordenables", () => {
    const own = (row: Row) => row.name;
    const [custom, plain] = withCatalogSorting<Row>("routes", [column("code", { accessorFn: own } as Partial<DataTableColumn<Row>>), column("stops")]);

    expect((custom as { accessorFn: unknown }).accessorFn).toBe(own);
    expect("accessorFn" in plain).toBe(false);
  });

  it("una columna sin id no ofrece ordenar", () => {
    const [anonymous] = withCatalogSorting<Row>("routes", [{ header: "x", cell: () => null } as DataTableColumn<Row>]);

    expect(anonymous.enableSorting).toBe(false);
  });
});
