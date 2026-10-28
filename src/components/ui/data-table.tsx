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

import { cn } from "@/lib/utils";

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

/**
 * Per-column presentation hints read by the default header and row rendering.
 * Note: `cell` and `header` renderers that are functions are called inline, not mounted as
 * components, so they must not call hooks.
 */
export type DataTableColumnMeta = {
  /** Extra classes for the column's `<th>`. */
  headClassName?: string;
  /** Extra classes for the column's body cells. */
  cellClassName?: string;
  /**
   * Accessible name of the column: `data-label` on body cells (stacked mobile layouts) and the
   * "Ordenar por ..." label. Wins over the string header, which wins over the column id.
   */
  label?: string;
  /** Body cells render as `<th scope="row">`. */
  rowHeader?: boolean;
};

export const DATA_TABLE_FEATURES = tableFeatures({
  columnMeta: {} as DataTableColumnMeta,
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
  headerContent,
  operational = false,
  ...props
}: Omit<ComponentProps<"button">, "onClick"> & {
  label: string;
  /** Replaces the label text (keeps the direction icon); `label` still names the button. */
  headerContent?: ReactNode;
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
          {headerContent ?? label}
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

/**
 * Cell and header renderers that are functions are called inline, not mounted as components,
 * so a column array rebuilt on every render (closing over props and handlers) does not remount
 * its cells or drop focus. Consequence: renderers must not call hooks.
 */
function renderDef<C extends { column: { columnDef: object } }>(
  ctx: C,
  key: "cell" | "header",
  fallback: () => ReactNode,
): ReactNode {
  const def = (ctx.column.columnDef as Record<string, unknown>)[key];
  return typeof def === "function" ? (def as (c: C) => ReactNode)(ctx) : fallback();
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
  rowProps,
  ...props
}: ComponentProps<typeof Table> & {
  /** Props for each default `<tr>` (className, aria-current, data-*); ignored when `renderRow` is set. */
  rowProps?: (row: DataTableRow<T>) => Omit<ComponentProps<typeof TableRow>, "children">;
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
                const columnDef = header.column.columnDef;
                const label =
                  columnDef.meta?.label ||
                  (typeof columnDef.header === "string"
                    ? columnDef.header
                    : header.column.id);
                return (
                  <TableHead
                    key={header.id}
                    scope="col"
                    className={cn(header.column.getCanResize() && "relative", header.column.columnDef.meta?.headClassName)}
                    style={
                      table.options.enableColumnResizing
                        ? { width: header.column.getSize() }
                        : undefined
                    }
                    aria-sort={
                      !header.column.getCanSort()
                        ? undefined
                        : direction === false
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
                        headerContent={
                          typeof columnDef.header === "function"
                            ? renderDef(header.getContext(), "header", () => null)
                            : undefined
                        }
                        onClick={() => header.column.toggleSorting()}
                      />
                    ) : (
                      renderDef(header.getContext(), "header", () => <table.FlexRender header={header} />)
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
            <TableRow key={row.id} {...rowProps?.(row)}>
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta;
                const Cell = meta?.rowHeader ? TableHead : TableCell;
                return (
                  <Cell
                    key={cell.id}
                    {...(meta?.rowHeader ? { scope: "row" } : {})}
                    data-label={
                      meta?.label ??
                      (typeof cell.column.columnDef.header === "string"
                        ? cell.column.columnDef.header
                        : undefined)
                    }
                    className={meta?.cellClassName}
                  >
                    {renderDef(cell.getContext(), "cell", () => <table.FlexRender cell={cell} />)}
                  </Cell>
                );
              })}
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
