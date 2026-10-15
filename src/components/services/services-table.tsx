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
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
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
  type ServicesColumnVariant,
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
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Filtrar por ${label}`}
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-md p-1 transition-colors hover:bg-[var(--color-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]",
          active ? "text-[var(--color-action)] font-bold" : "text-[var(--color-text-secondary)]",
        )}
      >
        <Filter className={cn("h-3.5 w-3.5", active && "fill-[var(--color-action)]/20")} aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`Filtro de ${label}`}
          className="absolute right-0 top-full z-50 mt-1 min-w-[220px] rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3 text-left"
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
        </div>
      )}
    </div>
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

function ColumnResizeHandle({
  columnKey,
  label,
  width,
  minimumWidth,
  maximumWidth,
  dense,
  onResize,
}: {
  columnKey: ServicesColumnKey;
  label: string;
  width: number;
  minimumWidth: number;
  maximumWidth: number;
  dense: boolean;
  onResize: (key: ServicesColumnKey, width: number) => void;
}) {
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
    scroller: HTMLElement | null;
    previousOverflowAnchor: string;
  } | null>(null);

  function startResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const table = event.currentTarget.closest<HTMLTableElement>("table");
    if (!table) return;
    const scroller = table.parentElement;
    const previousOverflowAnchor = scroller?.style.getPropertyValue("overflow-anchor") ?? "";
    if (scroller) {
      const tableWidth = table.getBoundingClientRect().width;
      const visibleWidth = scroller.scrollLeft + scroller.clientWidth;
      table.style.setProperty("--column-resize-width-floor", `${Math.max(tableWidth, visibleWidth)}px`);
      scroller.style.setProperty("overflow-anchor", "none");
    }
    table.dataset.columnResizing = "true";
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: width,
      scroller,
      previousOverflowAnchor,
    };
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function resize(event: ReactPointerEvent<HTMLButtonElement>) {
    const activeDrag = drag.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    onResize(columnKey, activeDrag.startWidth + event.clientX - activeDrag.startX);
  }

  function finishResize(event: ReactPointerEvent<HTMLButtonElement>) {
    const activeDrag = drag.current;
    if (activeDrag?.pointerId !== event.pointerId) return;
    drag.current = null;
    const table = event.currentTarget.closest<HTMLTableElement>("table");
    if (table) {
      delete table.dataset.columnResizing;
      const tableWidth = Number.parseFloat(table.style.width);
      if (activeDrag.scroller && tableWidth <= activeDrag.scroller.clientWidth) {
        table.style.removeProperty("--column-resize-width-floor");
      }
    }
    if (activeDrag.scroller) {
      if (activeDrag.previousOverflowAnchor) {
        activeDrag.scroller.style.setProperty("overflow-anchor", activeDrag.previousOverflowAnchor);
      } else {
        activeDrag.scroller.style.removeProperty("overflow-anchor");
      }
    }
    if (typeof event.currentTarget.hasPointerCapture === "function" && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      role="slider"
      aria-label={`Ancho de columna ${label}`}
      aria-orientation="vertical"
      aria-valuemin={minimumWidth}
      aria-valuemax={maximumWidth}
      aria-valuenow={width}
      aria-valuetext={`${width} px`}
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
      title="Arrastre para cambiar el ancho; use las flechas para ajustar"
      onPointerDown={startResize}
      onPointerMove={resize}
      onPointerUp={finishResize}
      onPointerCancel={finishResize}
      onKeyDown={(event) => {
        const delta = event.key === "ArrowRight" || event.key === "ArrowUp"
          ? 10
          : event.key === "ArrowLeft" || event.key === "ArrowDown"
            ? -10
            : 0;
        if (delta === 0) return;
        event.preventDefault();
        event.stopPropagation();
        onResize(columnKey, width + delta);
      }}
      data-column-resize-edge={columnKey}
      style={{
        minHeight: dense ? 48 : 0,
        minWidth: 0,
        width: dense ? 44 : 24,
        right: 0,
      }}
      className="absolute right-0 top-0 h-full min-h-0 min-w-0 w-6 touch-none cursor-col-resize rounded-none px-0 text-[var(--color-text-secondary)] hover:text-[var(--color-action)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
    >
      <span aria-hidden="true" className="pointer-events-none absolute right-0 top-1/2 h-5 w-px translate-x-1/2 -translate-y-1/2 bg-current opacity-60" />
    </Button>
  );
}

export function ServicesTable({
  services,
  serviceOrdinals: suppliedServiceOrdinals,
  filterOptionsServices = services,
  compactOnPreview = false,
  previewMotionVariant = "a",
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
  columnEditorVariant = null,
  columnPreferences = null,
}: {
  services: Service[];
  serviceOrdinals?: ReadonlyMap<string, number>;
  filterOptionsServices?: Service[];
  compactOnPreview?: boolean;
  previewMotionVariant?: "a" | "b" | "c" | "d" | "e" | "f";
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
  columnEditorVariant?: ServicesColumnVariant | null;
  columnPreferences?: ServicesColumnPreferencesController | null;
}) {
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
  const activeColumnPreferences = columnEditorVariant ? columnPreferences : null;
  const animatedColumnCollapse = !dense && compactOnPreview && previewMotionVariant === "a";
  const compactColumns = dense || (!activeColumnPreferences && compactOnPreview && (previewMotionVariant === "b" || previewMotionVariant === "c" || previewMotionVariant === "f"));
  const stableDesktopPreviewTable = !dense && (previewMotionVariant === "d" || previewMotionVariant === "e" || previewMotionVariant === "f");

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

  const columns: Array<{ key: ServicesColumnKey; label: string; hideWhenDense?: boolean }> = [
    { key: "service", label: "Servicio" },
    { key: "status", label: "Estado" },
    { key: "zone", label: "Zona", hideWhenDense: true },
    { key: "crew", label: "Equipo", hideWhenDense: true },
    { key: "scheduled", label: "Fecha", hideWhenDense: true },
  ];
  const columnByKey = new Map(columns.map((column) => [column.key, column]));
  const tableOrder = activeColumnPreferences?.variant === "1"
    ? activeColumnPreferences.table.getVisibleLeafColumns()
      .filter((column) => column.id !== "ordinal")
      .map((column) => column.id as ServicesColumnKey)
    : null;
  const preferredOrder = dragPreviewOrder ?? tableOrder ?? activeColumnPreferences?.preferences.order ?? DEFAULT_COLUMN_ORDER;
  const compactKeys = dense ? MOBILE_COMPACT_COLUMNS : LEGACY_COMPACT_COLUMNS;
  const currentColumns = preferredOrder
    .filter((key) => !activeColumnPreferences || (activeColumnPreferences.variant === "1"
      ? activeColumnPreferences.table.getColumn(key)?.getIsVisible() ?? activeColumnPreferences.preferences.visibility[key]
      : activeColumnPreferences.preferences.visibility[key]))
    .filter((key) => columnByKey.has(key))
    .filter((key) => !compactColumns || compactKeys.has(key))
    .map((key) => columnByKey.get(key)!);
  const sizingColumns = currentColumns.filter((column) => !(animatedColumnCollapse && column.hideWhenDense));
  const widthTotal = sizingColumns.reduce((sum, column) => {
    const definition = SERVICES_COLUMN_DEFINITIONS.find((item) => item.key === column.key)!;
    return sum + (activeColumnPreferences?.variant === "1"
      ? activeColumnPreferences.table.getColumn(column.key)?.getSize() ?? definition.defaultWidth
      : activeColumnPreferences ? activeColumnPreferences.preferences.widths[column.key] : definition.defaultWidth);
  }, 0);
  const ordinalWidth = dense || compactColumns ? 40 : 48;
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
    return activeColumnPreferences?.variant === "1"
      ? activeColumnPreferences.table.getColumn(key)?.getSize() ?? definition.defaultWidth
      : activeColumnPreferences ? activeColumnPreferences.preferences.widths[key] : definition.defaultWidth;
  }

  function setColumnWidth(key: ServicesColumnKey, width: number) {
    if (!activeColumnPreferences) return;
    if (activeColumnPreferences.variant === "1") {
      activeColumnPreferences.table.setColumnSizing((current) => ({
        ...current,
        [key]: width,
      }));
      return;
    }
    activeColumnPreferences.setWidth(key, width);
  }

  function applyColumnOrder(order: ServicesColumnKey[], source: ServicesColumnKey) {
    if (!activeColumnPreferences) return;
    if (activeColumnPreferences.variant === "1") {
      activeColumnPreferences.table.setColumnOrder(["ordinal", ...order]);
    } else {
      activeColumnPreferences.setOrder(order);
    }
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
        data-preview-clip={stableDesktopPreviewTable ? "true" : undefined}
        className="min-h-0 flex-1 overflow-x-auto overflow-y-auto bg-[var(--color-surface)] [scrollbar-gutter:stable]"
      >
        <table
          ref={tableRef}
          data-motion-variant={previewMotionVariant}
          className="min-w-full table-fixed border-collapse bg-[var(--color-surface)] text-left text-xs"
          aria-label="Servicios operativos"
          style={{
            width: tablePixelWidth,
            minWidth: "max(100%, var(--column-resize-width-floor, 0px))",
          }}
        >
          <colgroup>
            <col data-column-key="ordinal" style={{ width: `${ordinalWidth}px` }} />
            {currentColumns.map((column) => {
              const collapsed = Boolean(animatedColumnCollapse && column.hideWhenDense);
              return (
                <col
                  key={column.key}
                  data-column-key={column.key}
                  data-preview-collapse-column={collapsed ? "true" : undefined}
                  style={{ width: collapsed ? "0px" : `${getDataColumnWidth(column.key)}px` }}
                />
              );
            })}
            <col data-column-filler />
          </colgroup>
          <thead className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] font-semibold">
            <tr>
              <th scope="col" data-column-key="ordinal" aria-label="Número de parada" className="sticky left-0 top-0 z-20 bg-inherit px-1 py-3 text-center">#</th>
              {currentColumns.map((col) => {
                const isSorted = sortKey === col.key;
                const isCompactDateSort = compactColumns && col.key === "service" && sortKey === "scheduled";
                const ariaSort = isSorted || isCompactDateSort
                  ? sortDir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none";
                const sortButtonAriaSort = isSorted ? ariaSort : "none";
                const directionLabel = sortDir === "asc" ? "ascendente" : "descendente";

                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={ariaSort}
                    aria-label={activeColumnPreferences
                      ? `${col.label}. Arrastre para reordenar. Use Alt y las flechas izquierda o derecha para mover.`
                      : undefined}
                    aria-keyshortcuts={activeColumnPreferences ? "Alt+ArrowLeft Alt+ArrowRight" : undefined}
                    tabIndex={activeColumnPreferences ? 0 : undefined}
                    data-column-key={col.key}
                    data-preview-collapse-column={animatedColumnCollapse && col.hideWhenDense ? "true" : undefined}
                    data-preview-trailing-column={compactOnPreview && previewMotionVariant === "e" && col.key !== "service" ? "true" : undefined}
                    aria-hidden={animatedColumnCollapse && col.hideWhenDense ? true : compactOnPreview && previewMotionVariant === "e" && col.key !== "service" ? true : undefined}
                    inert={animatedColumnCollapse && col.hideWhenDense || compactOnPreview && previewMotionVariant === "e" && col.key !== "service"}
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
                      <button
                        type="button"
                        onClick={() => onSortChange(col.key)}
                        className={cn(
                          "flex min-w-0 items-center gap-1 hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-focus)] rounded",
                          dense && "gap-0.5",
                        )}
                        aria-label={`Ordenar por ${col.label}, actualmente ${sortButtonAriaSort === "none" ? "sin ordenar" : directionLabel}`}
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
                      </button>

                      {compactColumns && col.key === "service" && (
                        <>
                          <button
                            type="button"
                            onClick={() => onSortChange("scheduled")}
                            aria-label={`Ordenar por Fecha, actualmente ${sortKey === "scheduled" ? directionLabel : "sin ordenar"}`}
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
                          </button>
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
                      <ColumnResizeHandle
                        columnKey={col.key}
                        label={col.label}
                        width={activeColumnPreferences.variant === "1"
                          ? activeColumnPreferences.table.getColumn(col.key)?.getSize() ?? activeColumnPreferences.preferences.widths[col.key]
                          : activeColumnPreferences.preferences.widths[col.key]}
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
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {services.map((service) => {
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
                <tr
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
                  style={columnEditorVariant && isSelected
                    ? { backgroundColor: "var(--color-surface)" }
                    : undefined}
                >
                  <td data-column-key="ordinal" className={cn("sticky left-0 z-10 bg-inherit text-center tabular-nums", dense ? "px-1 py-2" : "px-1.5 py-2")}>
                    <span
                      aria-label={`Parada ${ordinal}`}
                      className="inline-flex size-7 items-center justify-center rounded-full bg-[var(--color-action)] text-xs font-bold text-[var(--color-on-institutional)]"
                    >
                      {ordinal}
                    </span>
                  </td>
                  {currentColumns.map((column) => {
                    const collapsed = Boolean(animatedColumnCollapse && column.hideWhenDense);
                    const trailing = compactOnPreview && previewMotionVariant === "e" && column.key !== "service";
                    const cellAttributes = {
                      "data-column-key": column.key,
                      "data-preview-collapse-column": collapsed ? "true" : undefined,
                      "data-preview-trailing-column": trailing ? "true" : undefined,
                      "aria-hidden": collapsed || trailing || undefined,
                      inert: collapsed || trailing,
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
                      <td
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
                  <td aria-hidden="true" className="p-0" />
                </tr>
              );
            })}

            {services.length === 0 && (
              <tr>
                <td colSpan={currentColumns.length + 2} className="p-8 text-center text-sm text-[var(--color-text-secondary)]">
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
              </tr>
            )}
          </tbody>
        </table>
        {activeColumnPreferences && (
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {reorderAnnouncement}
          </span>
        )}
      </div>
    </div>
  );
}
