"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  CalendarClock,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Filter,
  MapPin,
  Route,
  Search,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTableResizeHandle } from "@/components/ui/data-table-resize-handle";
import { DataTable, DataTableSortButton, useDataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatCalendarDay } from "@/lib/argentina-date";
import type { Service, ServiceStatus } from "@/lib/services";
import { STATUS_LABEL } from "@/lib/services";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import { createServiceOrdinals, type SortDir, type SortKey } from "./service-sorting";
import {
  SERVICES_COLUMN_DEFINITIONS,
  type ServicesColumnPreferencesController,
  type ServicesColumnKey,
} from "./services-column-editor";

export type { SortDir, SortKey } from "./service-sorting";

export type ColumnFilters = {
  zones: Set<string>;
  statuses: Set<ServiceStatus>;
  crews: Set<string>;
  timeFrom: string;
  timeTo: string;
};

type ColumnPointerDrag = {
  pointerId: number;
  source: ServicesColumnKey;
  startX: number;
  startY: number;
  initialOrder: ServicesColumnKey[];
  previewOrder: ServicesColumnKey[];
  crossedColumns: Array<{ key: ServicesColumnKey; midpoint: number }>;
  targetIndex: number;
  moved: boolean;
};

const COLUMN_DRAG_HYSTERESIS_PX = 6;

function moveColumnOrder(
  order: ServicesColumnKey[],
  source: ServicesColumnKey,
  target: ServicesColumnKey,
): ServicesColumnKey[] {
  if (source === target) return order;
  const sourceIndex = order.indexOf(source);
  const targetIndex = order.indexOf(target);
  if (sourceIndex < 0 || targetIndex < 0) return order;
  const nextOrder = [...order];
  nextOrder.splice(sourceIndex, 1);
  nextOrder.splice(targetIndex, 0, source);
  return nextOrder;
}

function sameColumnOrder(a: ServicesColumnKey[], b: ServicesColumnKey[]): boolean {
  return a.length === b.length && a.every((key, index) => key === b[index]);
}

const ALL_STATUSES: ServiceStatus[] = [
  "SCHEDULED",
  "RESCHEDULED",
  "IN_PROGRESS",
  "SUSPENDED",
  "COMPLETED",
  "PARTIALLY_COMPLETED",
  "CANCELLED",
];

const DEFAULT_COLUMN_ORDER: ServicesColumnKey[] = [
  "service",
  "status",
  "zone",
  "crew",
  "scheduled",
];
const MOBILE_COMPACT_COLUMNS = new Set<ServicesColumnKey>(["service", "status", "zone"]);
const LEGACY_COMPACT_COLUMNS = new Set<ServicesColumnKey>(["service", "status"]);

function ColumnFilterPopover({
  label,
  active,
  onClear,
  children,
}: {
  label: string;
  active: boolean;
  onClear: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        aria-label={`Filtrar por ${label}`}
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-md p-1 transition-colors hover:bg-[var(--color-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]",
          active ? "text-[var(--color-action)] font-bold" : "text-[var(--color-text-secondary)]",
        )}
      >
        <Filter className={cn("h-3.5 w-3.5", active && "fill-[var(--color-action)]/20")} aria-hidden />
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={4}
        aria-label={`Filtro de ${label}`}
        className="w-auto min-w-[220px] gap-0 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3 text-left text-xs text-[var(--color-text)] shadow-none ring-0"
      >
        <div className="mb-2 flex items-center justify-between border-b border-[var(--color-border)] pb-2 text-xs font-semibold text-[var(--color-text)]">
          <span className="capitalize">{label}</span>
          {active && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] text-[var(--color-action)] hover:underline"
            >
              Limpiar
            </button>
          )}
        </div>
        {children}
      </PopoverContent>
    </Popover>
  );
}

function ScheduledFilterPopover({
  columnFilters,
  onColumnFiltersChange,
}: {
  columnFilters: ColumnFilters;
  onColumnFiltersChange: (filters: ColumnFilters) => void;
}) {
  return (
    <ColumnFilterPopover
      label="horario"
      active={Boolean(columnFilters.timeFrom || columnFilters.timeTo)}
      onClear={() => onColumnFiltersChange({ ...columnFilters, timeFrom: "", timeTo: "" })}
    >
      <div className="space-y-2 py-1 text-xs">
        <label className="flex items-center justify-between gap-2">
          <span className="text-[var(--color-text-secondary)]">Desde</span>
          <input
            type="time"
            value={columnFilters.timeFrom}
            onChange={(event) => onColumnFiltersChange({ ...columnFilters, timeFrom: event.target.value })}
            className="rounded border border-[var(--color-border-strong)] px-1.5 py-0.5 text-xs text-[var(--color-text)]"
          />
        </label>
        <label className="flex items-center justify-between gap-2">
          <span className="text-[var(--color-text-secondary)]">Hasta</span>
          <input
            type="time"
            value={columnFilters.timeTo}
            onChange={(event) => onColumnFiltersChange({ ...columnFilters, timeTo: event.target.value })}
            className="rounded border border-[var(--color-border-strong)] px-1.5 py-0.5 text-xs text-[var(--color-text)]"
          />
        </label>
      </div>
    </ColumnFilterPopover>
  );
}

export function ServicesTable({
  services,
  serviceOrdinals: suppliedServiceOrdinals,
  filterOptionsServices = services,
  selectedId,
  onSelect,
  sortKey,
  sortDir,
  onSortChange,
  columnFilters,
  onColumnFiltersChange,
  hasActiveFilters = false,
  onClearFilters,
  dense = false,
  columnPreferences = null,
}: {
  services: Service[];
  serviceOrdinals?: ReadonlyMap<string, number>;
  filterOptionsServices?: Service[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  sortKey: SortKey | null;
  sortDir: SortDir;
  onSortChange: (key: SortKey) => void;
  columnFilters: ColumnFilters;
  onColumnFiltersChange: (filters: ColumnFilters) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  dense?: boolean;
  columnPreferences?: ServicesColumnPreferencesController | null;
}) {
  const tableColumns = useMemo<DataTableColumn<Service>[]>(
    () =>
      SERVICES_COLUMN_DEFINITIONS.map((column) => ({
        id: column.key,
        header: column.label,
        accessorFn: (service) => {
          switch (column.key) {
            case "service":
              return service.title;
            case "status":
              return service.status;
            case "zone":
              return service.zoneNames.join(", ");
            case "crew":
              return service.crewName ?? "Sin asignar";
            case "scheduled":
              return service.scheduledDate;
          }
        },
      })),
    [],
  );
  // The workspace also orders map stops and ordinals; retain its controlled sort.
  const dataTable = useDataTable({
    data: services,
    columns: tableColumns,
    manualSorting: true,
    getRowId: (service) => service.id,
    state: {
      sorting: sortKey ? [{ id: sortKey, desc: sortDir === "desc" }] : [],
    },
    onSortingChange: (updater) => {
      const current = sortKey
        ? [{ id: sortKey, desc: sortDir === "desc" }]
        : [];
      const next = typeof updater === "function" ? updater(current) : updater;
      const key = next[0]?.id ?? sortKey;
      if (key) onSortChange(key as SortKey);
    },
  });
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const tableRef = useRef<HTMLTableElement>(null);
  const [draggedColumn, setDraggedColumn] = useState<ServicesColumnKey | null>(null);
  const [dragPreviewOrder, setDragPreviewOrder] = useState<ServicesColumnKey[] | null>(null);
  const columnPointerDrag = useRef<ColumnPointerDrag | null>(null);
  const columnDragListenersCleanup = useRef<(() => void) | null>(null);
  const priorColumnPositions = useRef<Map<HTMLElement, number> | null>(null);
  const columnAnimationId = useRef(0);
  const suppressSortClick = useRef(false);
  const [reorderAnnouncement, setReorderAnnouncement] = useState("");
  const activeColumnPreferences = columnPreferences;
  const compactColumns = dense;

  useEffect(() => () => columnDragListenersCleanup.current?.(), []);

  useLayoutEffect(() => {
    const previous = priorColumnPositions.current;
    const table = tableRef.current;
    priorColumnPositions.current = null;
    if (!previous || !table) return;

    const movingCells: HTMLElement[] = [];
    table.querySelectorAll<HTMLElement>("thead th[data-column-key], tbody td[data-column-key]").forEach((cell) => {
      const oldLeft = previous.get(cell);
      if (oldLeft === undefined) return;
      const deltaX = oldLeft - cell.getBoundingClientRect().left;
      if (Math.abs(deltaX) < 1) return;
      cell.dataset.columnReorderAnimating = "true";
      cell.style.transition = "none";
      cell.style.transform = `translateX(${deltaX}px)`;
      movingCells.push(cell);
    });

    if (movingCells.length === 0) return;
    const animationId = ++columnAnimationId.current;
    window.requestAnimationFrame(() => {
      if (columnAnimationId.current !== animationId) return;
      for (const cell of movingCells) {
        cell.style.transition = "transform 140ms cubic-bezier(0.16, 1, 0.3, 1)";
        cell.style.transform = "translateX(0)";
      }
    });
    window.setTimeout(() => {
      if (columnAnimationId.current !== animationId) return;
      for (const cell of movingCells) {
        cell.style.removeProperty("transition");
        cell.style.removeProperty("transform");
        delete cell.dataset.columnReorderAnimating;
      }
    }, 180);
  }, [dragPreviewOrder]);

  // Auto-scroll selected row into view smoothly
  useEffect(() => {
    if (selectedId && rowRefs.current[selectedId]) {
      const el = rowRefs.current[selectedId];
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedId]);

  const availableZones = useMemo(() => {
    const set = new Set<string>();
    filterOptionsServices.forEach((s) => s.zoneNames.forEach((zn) => set.add(zn)));
    columnFilters.zones.forEach((zone) => set.add(zone));
    return Array.from(set).sort();
  }, [filterOptionsServices, columnFilters.zones]);

  const availableCrews = useMemo(() => {
    const set = new Set<string>();
    filterOptionsServices.forEach((s) => set.add(s.crewName ?? "Sin asignar"));
    columnFilters.crews.forEach((crew) => set.add(crew));
    return Array.from(set).sort();
  }, [filterOptionsServices, columnFilters.crews]);

  const computedServiceOrdinals = useMemo(() => createServiceOrdinals(services), [services]);
  const serviceOrdinals = suppliedServiceOrdinals ?? computedServiceOrdinals;

  const toggleZone = (zone: string) => {
    const next = new Set(columnFilters.zones);
    if (next.has(zone)) next.delete(zone);
    else next.add(zone);
    onColumnFiltersChange({ ...columnFilters, zones: next });
  };

  const toggleStatus = (status: ServiceStatus) => {
    const next = new Set(columnFilters.statuses);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    onColumnFiltersChange({ ...columnFilters, statuses: next });
  };

  const toggleCrew = (crew: string) => {
    const next = new Set(columnFilters.crews);
    if (next.has(crew)) next.delete(crew);
    else next.add(crew);
    onColumnFiltersChange({ ...columnFilters, crews: next });
  };

  const columns: Array<{ key: ServicesColumnKey; label: string }> = [
    { key: "service", label: "Servicio" },
    { key: "status", label: "Estado" },
    { key: "zone", label: "Zona" },
    { key: "crew", label: "Equipo" },
    { key: "scheduled", label: "Fecha" },
  ];
  const columnByKey = new Map(columns.map((column) => [column.key, column]));
  const tableOrder = activeColumnPreferences?.table.getVisibleLeafColumns()
    .filter((column) => column.id !== "ordinal")
    .map((column) => column.id as ServicesColumnKey);
  const preferredOrder = dragPreviewOrder ?? tableOrder ?? activeColumnPreferences?.preferences.order ?? DEFAULT_COLUMN_ORDER;
  const compactKeys = dense ? MOBILE_COMPACT_COLUMNS : LEGACY_COMPACT_COLUMNS;
  const currentColumns = preferredOrder
    .filter((key) => !activeColumnPreferences || (activeColumnPreferences.table.getColumn(key)?.getIsVisible()
      ?? activeColumnPreferences.preferences.visibility[key]))
    .filter((key) => columnByKey.has(key))
    .filter((key) => !compactColumns || compactKeys.has(key))
    .map((key) => columnByKey.get(key)!);
  const widthTotal = currentColumns.reduce((sum, column) => {
    const definition = SERVICES_COLUMN_DEFINITIONS.find((item) => item.key === column.key)!;
    return sum + (activeColumnPreferences?.table.getColumn(column.key)?.getSize()
      ?? activeColumnPreferences?.preferences.widths[column.key]
      ?? definition.defaultWidth);
  }, 0);
  const ordinalWidth = dense ? 40 : 48;
  const tablePixelWidth = ordinalWidth + widthTotal;

  useLayoutEffect(() => {
    const table = tableRef.current;
    const scroller = table?.parentElement;
    if (!table || !scroller) return;

    const clearUnusedResizeFloor = () => {
      if (table.dataset.columnResizing === "true") return;
      const tableWidth = Number.parseFloat(table.style.width);
      if (tableWidth <= scroller.clientWidth) {
        table.style.removeProperty("--column-resize-width-floor");
      }
    };

    clearUnusedResizeFloor();
    const observer = new ResizeObserver(clearUnusedResizeFloor);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [tablePixelWidth]);

  function getDataColumnWidth(key: ServicesColumnKey): number {
    const definition = SERVICES_COLUMN_DEFINITIONS.find((item) => item.key === key)!;
    return activeColumnPreferences?.table.getColumn(key)?.getSize()
      ?? activeColumnPreferences?.preferences.widths[key]
      ?? definition.defaultWidth;
  }

  function setColumnWidth(key: ServicesColumnKey, width: number) {
    if (!activeColumnPreferences) return;
    activeColumnPreferences.table.setColumnSizing((current) => ({
      ...current,
      [key]: width,
    }));
  }

  function applyColumnOrder(order: ServicesColumnKey[], source: ServicesColumnKey) {
    if (!activeColumnPreferences) return;
    activeColumnPreferences.table.setColumnOrder(["ordinal", ...order]);
    const label = SERVICES_COLUMN_DEFINITIONS.find((column) => column.key === source)?.label ?? source;
    setReorderAnnouncement(`${label}, posición ${order.indexOf(source) + 1} de ${order.length}.`);
  }

  function moveColumnTo(source: ServicesColumnKey, target: ServicesColumnKey) {
    if (!activeColumnPreferences) return;
    const nextOrder = moveColumnOrder(activeColumnPreferences.preferences.order, source, target);
    if (sameColumnOrder(nextOrder, activeColumnPreferences.preferences.order)) return;
    applyColumnOrder(nextOrder, source);
  }

  function captureColumnPositions() {
    const table = tableRef.current;
    if (!table) return;
    const positions = new Map<HTMLElement, number>();
    table.querySelectorAll<HTMLElement>("thead th[data-column-key], tbody td[data-column-key]").forEach((cell) => {
      positions.set(cell, cell.getBoundingClientRect().left);
    });
    priorColumnPositions.current = positions;
  }

  function startColumnPointerDrag(event: ReactPointerEvent<HTMLTableHeaderCellElement>, key: ServicesColumnKey) {
    if (!activeColumnPreferences || event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest('[role="slider"]')) return;
    const table = tableRef.current;
    if (!table) return;
    columnAnimationId.current += 1;
    table.querySelectorAll<HTMLElement>("[data-column-reorder-animating]").forEach((cell) => {
      cell.style.removeProperty("transition");
      cell.style.removeProperty("transform");
      delete cell.dataset.columnReorderAnimating;
    });
    const sourceIndex = currentColumns.findIndex((column) => column.key === key);
    if (sourceIndex < 0) return;
    const initialOrder = [...activeColumnPreferences.preferences.order];
    const headerMidpoints = new Map<string, number>();
    table.querySelectorAll<HTMLElement>("thead th[data-column-key]").forEach((header) => {
      const columnKey = header.dataset.columnKey;
      if (!columnKey || columnKey === "ordinal") return;
      const box = header.getBoundingClientRect();
      headerMidpoints.set(columnKey, box.left + box.width / 2);
    });
    const crossedColumns = currentColumns
      .filter((column) => column.key !== key)
      .flatMap((column) => {
        const midpoint = headerMidpoints.get(column.key);
        return midpoint === undefined ? [] : [{ key: column.key, midpoint }];
      });
    columnPointerDrag.current = {
      pointerId: event.pointerId,
      source: key,
      startX: event.clientX,
      startY: event.clientY,
      initialOrder,
      previewOrder: initialOrder,
      crossedColumns,
      targetIndex: sourceIndex,
      moved: false,
    };

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      const activeDrag = columnPointerDrag.current;
      if (!activeDrag || activeDrag.pointerId !== pointerEvent.pointerId) return;
      if (!activeDrag.moved && Math.hypot(pointerEvent.clientX - activeDrag.startX, pointerEvent.clientY - activeDrag.startY) < 7) return;
      pointerEvent.preventDefault();
      if (!activeDrag.moved) {
        activeDrag.moved = true;
        setDraggedColumn(activeDrag.source);
      }

      let nextIndex = activeDrag.targetIndex;
      let nextOrder = activeDrag.previewOrder;
      while (
        nextIndex < activeDrag.crossedColumns.length &&
        pointerEvent.clientX > activeDrag.crossedColumns[nextIndex].midpoint + COLUMN_DRAG_HYSTERESIS_PX
      ) {
        nextOrder = moveColumnOrder(nextOrder, activeDrag.source, activeDrag.crossedColumns[nextIndex].key);
        nextIndex += 1;
      }
      while (
        nextIndex > 0 &&
        pointerEvent.clientX < activeDrag.crossedColumns[nextIndex - 1].midpoint - COLUMN_DRAG_HYSTERESIS_PX
      ) {
        nextIndex -= 1;
        nextOrder = moveColumnOrder(nextOrder, activeDrag.source, activeDrag.crossedColumns[nextIndex].key);
      }

      if (nextIndex !== activeDrag.targetIndex && !sameColumnOrder(nextOrder, activeDrag.previewOrder)) {
        captureColumnPositions();
        activeDrag.targetIndex = nextIndex;
        activeDrag.previewOrder = nextOrder;
        setDragPreviewOrder(sameColumnOrder(nextOrder, activeDrag.initialOrder) ? null : nextOrder);
      }
    };
    const finishPointerDrag = (pointerEvent: PointerEvent) => {
      const activeDrag = columnPointerDrag.current;
      if (!activeDrag || activeDrag.pointerId !== pointerEvent.pointerId) return;
      if (activeDrag.moved) {
        pointerEvent.preventDefault();
        suppressSortClick.current = true;
        window.setTimeout(() => { suppressSortClick.current = false; }, 0);
        if (pointerEvent.type !== "pointercancel" && !sameColumnOrder(activeDrag.previewOrder, activeDrag.initialOrder)) {
          applyColumnOrder(activeDrag.previewOrder, activeDrag.source);
        }
        captureColumnPositions();
        setDragPreviewOrder(null);
      }
      columnPointerDrag.current = null;
      setDraggedColumn(null);
      columnDragListenersCleanup.current?.();
      columnDragListenersCleanup.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishPointerDrag);
    window.addEventListener("pointercancel", finishPointerDrag);
    columnDragListenersCleanup.current = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishPointerDrag);
      window.removeEventListener("pointercancel", finishPointerDrag);
    };
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--color-surface)]" role="region" aria-label="Tabla operativa de Servicios">
      <div
        data-preview-clip={!dense ? "true" : undefined}
        className="min-h-0 flex-1 overflow-x-auto overflow-y-auto bg-[var(--color-surface)] [scrollbar-gutter:auto]"
      >
        <DataTable
          table={dataTable}
          container={false}
          ref={tableRef}
          className="min-w-full table-fixed border-collapse bg-[var(--color-surface)] text-left text-xs"
          aria-label="Servicios operativos"
          style={{
            width: tablePixelWidth,
            minWidth: "max(100%, var(--column-resize-width-floor, 0px))",
          }}
          bodyClassName="divide-y divide-[var(--color-border)]"
          renderHeader={() => (<thead data-slot="table-header" className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] font-semibold">
            <tr data-slot="table-row">
              <th data-slot="table-head" scope="col" data-column-key="ordinal" aria-label="Número de parada" className="sticky left-0 top-0 z-20 bg-[var(--color-surface-subtle)] px-1 py-3 text-center">#</th>
              {currentColumns.map((col) => {
                const isSorted = sortKey === col.key;
                const isCompactDateSort = compactColumns && col.key === "service" && sortKey === "scheduled";
                const ariaSort = isSorted || isCompactDateSort
                  ? sortDir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none";

                return (
                  <th data-slot="table-head"
                    key={col.key}
                    scope="col"
                    aria-sort={ariaSort}
                    aria-label={activeColumnPreferences
                      ? `${col.label}. Arrastre para reordenar. Use Alt y las flechas izquierda o derecha para mover.`
                      : undefined}
                    aria-keyshortcuts={activeColumnPreferences ? "Alt+ArrowLeft Alt+ArrowRight" : undefined}
                    tabIndex={activeColumnPreferences ? 0 : undefined}
                    data-column-key={col.key}
                    data-column-dragging={draggedColumn === col.key ? "true" : undefined}
                    className={cn(
                      "relative select-none px-1 py-2",
                      activeColumnPreferences && "cursor-grab active:cursor-grabbing",
                    )}
                    style={activeColumnPreferences ? { touchAction: "pan-y" } : undefined}
                    onPointerDown={(event) => startColumnPointerDrag(event, col.key)}
                    onClickCapture={(event) => {
                      if (!suppressSortClick.current) return;
                      event.preventDefault();
                      event.stopPropagation();
                      suppressSortClick.current = false;
                    }}
                    onKeyDown={(event) => {
                      if (!activeColumnPreferences || event.target !== event.currentTarget || !event.altKey) return;
                      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                      event.preventDefault();
                      const order = currentColumns.map((column) => column.key);
                      const index = order.indexOf(col.key);
                      const targetIndex = index + (event.key === "ArrowLeft" ? -1 : 1);
                      const target = order[targetIndex];
                      if (target) moveColumnTo(col.key, target);
                    }}
                  >
                    <div className={cn(
                      "flex items-center justify-between gap-1.5",
                      dense && "gap-1",
                      activeColumnPreferences && (dense ? "pr-11" : "pr-7"),
                    )}>
                      <DataTableSortButton
                        operational
                        label={col.label}
                        direction={isSorted ? sortDir : false}
                        onClick={() => dataTable.getColumn(col.key)?.toggleSorting()}
                        className={cn(
                          "flex min-w-0 items-center gap-1 hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-focus)] rounded",
                          dense && "gap-0.5",
                        )}
                      >
                        <span>{col.key === "scheduled" ? "Fecha" : col.key === "crew" ? "Equipo" : col.label}</span>
                        {isSorted ? (
                          sortDir === "asc" ? (
                            <ArrowUp className={cn("h-3 w-3 text-[var(--color-action)]", dense && "h-2.5 w-2.5")} aria-hidden />
                          ) : (
                            <ArrowDown className={cn("h-3 w-3 text-[var(--color-action)]", dense && "h-2.5 w-2.5")} aria-hidden />
                          )
                        ) : (
                          <ArrowUpDown className={cn("h-3 w-3 opacity-40 hover:opacity-100", dense && "hidden")} aria-hidden />
                        )}
                      </DataTableSortButton>

                      {compactColumns && col.key === "service" && (
                        <>
                          <DataTableSortButton
                            operational
                            label="Fecha"
                            direction={sortKey === "scheduled" ? sortDir : false}
                            onClick={() => dataTable.getColumn("scheduled")?.toggleSorting()}
                            className="inline-flex size-6 shrink-0 items-center justify-center rounded hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-focus)]"
                          >
                            {sortKey === "scheduled" ? (
                              sortDir === "asc" ? (
                                <ArrowUp className="h-3 w-3 text-[var(--color-action)]" aria-hidden />
                              ) : (
                                <ArrowDown className="h-3 w-3 text-[var(--color-action)]" aria-hidden />
                              )
                            ) : (
                              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                            )}
                          </DataTableSortButton>
                          <ScheduledFilterPopover
                            columnFilters={columnFilters}
                            onColumnFiltersChange={onColumnFiltersChange}
                          />
                        </>
                      )}

                      {col.key === "zone" && (
                        <ColumnFilterPopover
                          label="zona"
                          active={columnFilters.zones.size > 0}
                          onClear={() => onColumnFiltersChange({ ...columnFilters, zones: new Set() })}
                        >
                          <div className="max-h-48 overflow-y-auto space-y-1.5 py-1">
                            {availableZones.map((z) => (
                              <label key={z} className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={columnFilters.zones.has(z)}
                                  onChange={() => toggleZone(z)}
                                  className="h-3.5 w-3.5 rounded border-[var(--color-border-strong)] text-[var(--color-action)] focus:ring-[var(--color-focus)]"
                                />
                                <span>{z}</span>
                              </label>
                            ))}
                          </div>
                        </ColumnFilterPopover>
                      )}

                      {col.key === "status" && (
                        <ColumnFilterPopover
                          label="estado"
                          active={columnFilters.statuses.size > 0}
                          onClear={() => onColumnFiltersChange({ ...columnFilters, statuses: new Set() })}
                        >
                          <div className="max-h-56 overflow-y-auto space-y-1.5 py-1">
                            {ALL_STATUSES.map((st) => (
                              <label key={st} className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={columnFilters.statuses.has(st)}
                                  onChange={() => toggleStatus(st)}
                                  className="h-3.5 w-3.5 rounded border-[var(--color-border-strong)] text-[var(--color-action)] focus:ring-[var(--color-focus)]"
                                />
                                <span data-status-filter-option={st}>
                                  <StatusBadge status={st} className="gap-1 px-1.5 py-0 text-[10px]" />
                                </span>
                              </label>
                            ))}
                          </div>
                        </ColumnFilterPopover>
                      )}

                      {col.key === "crew" && (
                        <ColumnFilterPopover
                          label="equipo"
                          active={columnFilters.crews.size > 0}
                          onClear={() => onColumnFiltersChange({ ...columnFilters, crews: new Set() })}
                        >
                          <div className="max-h-48 overflow-y-auto space-y-1.5 py-1">
                            {availableCrews.map((c) => (
                              <label key={c} className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={columnFilters.crews.has(c)}
                                  onChange={() => toggleCrew(c)}
                                  className="h-3.5 w-3.5 rounded border-[var(--color-border-strong)] text-[var(--color-action)] focus:ring-[var(--color-focus)]"
                                />
                                <span>{c}</span>
                              </label>
                            ))}
                          </div>
                        </ColumnFilterPopover>
                      )}

                      {col.key === "scheduled" && (
                        <ScheduledFilterPopover
                          columnFilters={columnFilters}
                          onColumnFiltersChange={onColumnFiltersChange}
                        />
                      )}

                    </div>

                    {activeColumnPreferences && (
                      <DataTableResizeHandle
                        columnKey={col.key}
                        label={col.label}
                        width={activeColumnPreferences.table.getColumn(col.key)?.getSize()
                          ?? activeColumnPreferences.preferences.widths[col.key]}
                        minimumWidth={SERVICES_COLUMN_DEFINITIONS.find((item) => item.key === col.key)!.minimumWidth}
                        maximumWidth={SERVICES_COLUMN_DEFINITIONS.find((item) => item.key === col.key)!.maximumWidth}
                        dense={dense}
                        onResize={setColumnWidth}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>)}
          renderRow={(row) => {
              const service = row.original;
              const isSelected = service.id === selectedId;
              const ordinal = serviceOrdinals.get(service.id)!;
              const compactSecondaryInfo = [
                formatCalendarDay(service.scheduledDate),
                service.windowFrom
                  ? `${service.windowFrom}${service.windowTo ? `–${service.windowTo}` : ""}`
                  : "",
              ].filter(Boolean).join(" · ");
              const compactMetadataColumn = currentColumns.at(-1)?.key;

              return (
                <tr data-slot="table-row"
                  key={service.id}
                  data-service-id={service.id}
                  data-service-ordinal={ordinal}
                  ref={(el) => {
                    rowRefs.current[service.id] = el;
                  }}
                  aria-selected={isSelected}
                  onClick={() => onSelect(service.id)}
                  className={cn(
                    "cursor-pointer select-none transition-colors",
                    isSelected
                      ? activeColumnPreferences ? "bg-[var(--color-surface)]" : "bg-[var(--color-action)]/10"
                      : "hover:bg-[var(--color-canvas)]",
                  )}
                >
                  <td data-slot="table-cell" data-column-key="ordinal" className={cn("sticky left-0 z-10 bg-inherit text-center tabular-nums", dense ? "px-1 py-2" : "px-1.5 py-2")}>
                    <span
                      aria-label={`Parada ${ordinal}`}
                      className="inline-flex size-7 items-center justify-center rounded-full bg-[var(--color-action)] text-xs font-bold text-[var(--color-on-institutional)]"
                    >
                      {ordinal}
                    </span>
                  </td>
                  {currentColumns.map((column) => {
                    const cellAttributes = {
                      "data-column-key": column.key,
                    };
                    const content = (() => {
                      switch (column.key) {
                        case "service":
                          return (
                            <button
                              type="button"
                              data-service-select="true"
                              data-service-id={service.id}
                              aria-label={`Seleccionar servicio ${service.title}`}
                              aria-pressed={isSelected}
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelect(service.id);
                              }}
                              className="flex min-w-0 w-full items-start gap-2 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                            >
                              {service.mode === "ROUTE" ? (
                                <Route className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-action)]" aria-hidden />
                              ) : (
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-action)]" aria-hidden />
                              )}
                              <span className="min-w-0">
                                <span className="block break-words font-semibold text-[var(--color-text)] leading-tight">
                                  {service.title}
                                </span>
                              </span>
                            </button>
                          );
                        case "status":
                          return (
                            <StatusBadge
                              status={service.status}
                              className={cn(
                                "w-max max-w-none shrink-0 gap-1 whitespace-nowrap px-1.5 text-[11px] [&_svg]:h-3 [&_svg]:w-3",
                                dense && "gap-0.5 px-1 py-0 text-[10px] [&_svg]:h-2.5 [&_svg]:w-2.5",
                              )}
                            />
                          );
                        case "zone":
                          return service.zoneNames.join(", ");
                        case "crew":
                          return service.crewName ?? <span className="italic text-[var(--color-text-secondary)]">Sin asignar</span>;
                        case "scheduled":
                          return (
                            <>
                              <div>{formatCalendarDay(service.scheduledDate)}</div>
                              {service.windowFrom && (
                                <div className="text-[11px] text-[var(--color-text-secondary)]">
                                  {service.windowFrom} – {service.windowTo ?? ""}
                                </div>
                              )}
                            </>
                          );
                      }
                    })();
                    const compactMetadata = dense && compactMetadataColumn === column.key && compactSecondaryInfo;

                    return (
                      <td data-slot="table-cell"
                        key={column.key}
                        {...cellAttributes}
                        data-column-dragging={draggedColumn === column.key ? "true" : undefined}
                        className={cn(
                          "px-1.5 py-2 text-[var(--color-text)]",
                          column.key === "status" && "text-left",
                          column.key === "status" && "min-w-[130px]",
                          column.key === "scheduled" && "tabular-nums",
                        )}
                      >
                        {content}
                        {compactMetadata && (
                          <span className="mt-0.5 block text-[11px] text-[var(--color-text-secondary)]">
                            {compactMetadata}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td data-slot="table-cell" aria-hidden="true" className="p-0" />
                </tr>
              );
            }}
          renderEmpty={() => (<tr data-slot="table-row">
                <td data-slot="table-cell" colSpan={currentColumns.length + 2} className="p-8 text-center text-sm text-[var(--color-text-secondary)]">
                  <Empty className="mx-auto max-w-sm gap-3 rounded-none p-0" role="status">
                    <EmptyHeader>
                      <EmptyTitle>
                        {hasActiveFilters
                          ? "No hay servicios que coincidan con los filtros aplicados."
                          : "No hay servicios para mostrar en este período."}
                      </EmptyTitle>
                    </EmptyHeader>
                    {hasActiveFilters && onClearFilters && (
                      <EmptyContent>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={onClearFilters}
                        >
                          Limpiar filtros
                        </Button>
                      </EmptyContent>
                    )}
                  </Empty>
                </td>
              </tr>)}
        >
          <colgroup>
            <col data-column-key="ordinal" style={{ width: `${ordinalWidth}px` }} />
            {currentColumns.map((column) => (
              <col
                key={column.key}
                data-column-key={column.key}
                style={{ width: `${getDataColumnWidth(column.key)}px` }}
              />
            ))}
            <col data-column-filler />
          </colgroup>
        </DataTable>
        {activeColumnPreferences && (
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {reorderAnnouncement}
          </span>
        )}
      </div>
    </div>
  );
}
