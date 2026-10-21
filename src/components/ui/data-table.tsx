"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  columnOrderingFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type ReactTable,
  type Row,
  type RowData,
  type TableOptions,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Button } from "./button";
import { DataTableResizeHandle } from "./data-table-resize-handle";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

export const DATA_TABLE_FEATURES = tableFeatures({
  columnVisibilityFeature,
  columnOrderingFeature,
  columnSizingFeature,
  columnResizingFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text, alphanumeric: sortFn_alphanumeric },
});

export type DataTableColumn<T extends RowData> = ColumnDef<
  typeof DATA_TABLE_FEATURES,
  T
>;
export type DataTableInstance<T extends RowData> = ReactTable<
  typeof DATA_TABLE_FEATURES,
  T
>;
export type DataTableRow<T extends RowData> = Row<
  typeof DATA_TABLE_FEATURES,
  T
>;

type Options<T extends RowData> = Pick<
  TableOptions<typeof DATA_TABLE_FEATURES, T>,
  | "data"
  | "columns"
  | "getRowId"
  | "initialState"
  | "state"
  | "onSortingChange"
  | "manualSorting"
  | "enableHiding"
  | "onColumnVisibilityChange"
  | "onColumnOrderChange"
  | "enableColumnResizing"
  | "columnResizeMode"
  | "onColumnSizingChange"
> & {
  persistenceKey?: string;
};

/** Share this instance with an existing column editor; feature controls remain opt-in. */
export function useDataTable<T extends RowData>({
  persistenceKey,
  ...options
}: Options<T>) {
  const table = useTable({
    enableHiding: false,
    enableColumnResizing: false,
    enableMultiSort: false,
    defaultColumn: { sortDescFirst: false },
    ...options,
    features: DATA_TABLE_FEATURES,
  });
  const loaded = useRef(false);
  const restore = useEffectEvent(() => {
    loaded.current = false;
    if (!persistenceKey) return;
    table.resetSorting();
    table.resetColumnOrder();
    table.resetColumnVisibility();
    table.resetColumnSizing();
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem(persistenceKey) ?? "null",
      );
      if (!saved || typeof saved !== "object") return;
      const state = saved as Record<string, unknown>;
      const ids = new Set(table.getAllLeafColumns().map((column) => column.id));
      if (Array.isArray(state.sorting)) {
        table.setSorting(
          state.sorting.filter(
            (sort) =>
              sort && ids.has(sort.id) && typeof sort.desc === "boolean",
          ),
        );
      }
      if (Array.isArray(state.columnOrder)) {
        table.setColumnOrder([
          ...new Set(
            state.columnOrder.filter(
              (id): id is string => typeof id === "string" && ids.has(id),
            ),
          ),
        ]);
      }
      if (
        state.columnVisibility &&
        typeof state.columnVisibility === "object"
      ) {
        const visibility = state.columnVisibility as Record<string, unknown>;
        table.setColumnVisibility(
          Object.fromEntries(
            table
              .getAllLeafColumns()
              .map((column) => [
                column.id,
                column.getCanHide() ? visibility[column.id] !== false : true,
              ]),
          ),
        );
      }
      if (state.columnSizing && typeof state.columnSizing === "object") {
        const sizing = state.columnSizing as Record<string, unknown>;
        table.setColumnSizing(
          Object.fromEntries(
            table.getAllLeafColumns().flatMap((column) => {
              const size = sizing[column.id];
              return typeof size === "number" && Number.isFinite(size)
                ? [
                    [
                      column.id,
                      Math.min(
                        column.columnDef.maxSize ?? 10000,
                        Math.max(column.columnDef.minSize ?? 20, size),
                      ),
                    ],
                  ]
                : [];
            }),
          ),
        );
      }
    } catch {
      // Storage may be unavailable or contain an obsolete preference format.
    }
  });
  useEffect(() => {
    restore();
  }, [persistenceKey]);
  const { sorting, columnVisibility, columnOrder, columnSizing } = table.state;
  useEffect(() => {
    if (!persistenceKey) return;
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    try {
      localStorage.setItem(
        persistenceKey,
        JSON.stringify({
          sorting,
          columnVisibility,
          columnOrder,
          columnSizing,
        }),
      );
    } catch {
      // Preferences are optional; all interactions still work in memory.
    }
  }, [persistenceKey, sorting, columnVisibility, columnOrder, columnSizing]);
  return table;
}

export function DataTableSortButton({
  label,
  direction,
  onClick,
  children,
  operational = false,
  ...props
}: Omit<ComponentProps<"button">, "onClick"> & {
  label: string;
  direction: false | "asc" | "desc";
  onClick: () => void;
  operational?: boolean;
}) {
  if (operational)
    return (
      <button
        type="button"
        data-slot="button"
        {...props}
        onClick={onClick}
        aria-label={`Ordenar por ${label}, actualmente ${direction === false ? "sin ordenar" : direction === "asc" ? "ascendente" : "descendente"}`}
      >
        {children}
      </button>
    );
  return (
    <Button
      variant="ghost"
      size="sm"
      {...props}
      onClick={onClick}
      aria-label={`Ordenar por ${label}, actualmente ${direction === false ? "sin ordenar" : direction === "asc" ? "ascendente" : "descendente"}`}
    >
      {children ?? (
        <>
          {label}
          {direction === "asc" ? (
            <ArrowUp />
          ) : direction === "desc" ? (
            <ArrowDown />
          ) : (
            <ArrowUpDown />
          )}
        </>
      )}
    </Button>
  );
}

/** Render overrides preserve a mature table's layout while sharing its row model. */
export function DataTable<T extends RowData>({
  table,
  renderHeader,
  renderRow,
  emptyState = "No hay resultados.",
  children,
  bodyClassName,
  headerClassName,
  renderEmpty,
  ...props
}: ComponentProps<typeof Table> & {
  table: DataTableInstance<T>;
  renderHeader?: () => ReactNode;
  renderRow?: (row: DataTableRow<T>) => ReactNode;
  emptyState?: ReactNode;
  bodyClassName?: string;
  headerClassName?: string;
  renderEmpty?: () => ReactNode;
}) {
  const rows = table.getRowModel().rows;
  return (
    <Table {...props}>
      {children}
      {renderHeader ? (
        renderHeader()
      ) : (
        <TableHeader className={headerClassName}>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const direction = header.column.getIsSorted();
                const label =
                  typeof header.column.columnDef.header === "string"
                    ? header.column.columnDef.header
                    : header.column.id;
                return (
                  <TableHead
                    key={header.id}
                    scope="col"
                    className="relative"
                    style={
                      table.options.enableColumnResizing
                        ? { width: header.column.getSize() }
                        : undefined
                    }
                    aria-sort={
                      direction === false
                        ? "none"
                        : direction === "asc"
                          ? "ascending"
                          : "descending"
                    }
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <DataTableSortButton
                        label={label}
                        direction={direction}
                        onClick={() => header.column.toggleSorting()}
                      />
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                    {header.column.getCanResize() && (
                      <DataTableResizeHandle
                        columnKey={header.column.id}
                        label={label}
                        width={header.column.getSize()}
                        minimumWidth={header.column.columnDef.minSize ?? 20}
                        maximumWidth={header.column.columnDef.maxSize ?? 10000}
                        dense={false}
                        onResize={(id, size) =>
                          table.setColumnSizing((current) => ({
                            ...current,
                            [id]: Math.max(
                              header.column.columnDef.minSize ?? 20,
                              Math.min(
                                header.column.columnDef.maxSize ?? 10000,
                                size,
                              ),
                            ),
                          }))
                        }
                      />
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
      )}
      <TableBody className={bodyClassName}>
        {rows.map((row) =>
          renderRow ? (
            renderRow(row)
          ) : (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ),
        )}
        {rows.length === 0 &&
          (renderEmpty ? (
            renderEmpty()
          ) : (
            <TableRow>
              <TableCell colSpan={table.getVisibleLeafColumns().length}>
                {emptyState}
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}
