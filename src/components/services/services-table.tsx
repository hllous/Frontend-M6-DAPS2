"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
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

export type { SortDir, SortKey } from "./service-sorting";

export type ColumnFilters = {
  zones: Set<string>;
  statuses: Set<ServiceStatus>;
  crews: Set<string>;
  timeFrom: string;
  timeTo: string;
};

const ALL_STATUSES: ServiceStatus[] = [
  "SCHEDULED",
  "RESCHEDULED",
  "IN_PROGRESS",
  "SUSPENDED",
  "COMPLETED",
  "PARTIALLY_COMPLETED",
  "CANCELLED",
];

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

export function ServicesTable({
  services,
  serviceOrdinals: suppliedServiceOrdinals,
  filterOptionsServices = services,
  compactOnPreview = false,
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
}: {
  services: Service[];
  serviceOrdinals?: ReadonlyMap<string, number>;
  filterOptionsServices?: Service[];
  compactOnPreview?: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSortChange: (key: SortKey) => void;
  columnFilters: ColumnFilters;
  onColumnFiltersChange: (filters: ColumnFilters) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  dense?: boolean;
}) {
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const compactColumns = dense || compactOnPreview;

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

  const columns: Array<{ key: SortKey; label: string; hideWhenDense?: boolean }> = [
    { key: "service", label: "Servicio" },
    { key: "zone", label: "Zona", hideWhenDense: true },
    { key: "status", label: "Estado" },
    { key: "crew", label: "Cuadrilla", hideWhenDense: true },
    { key: "scheduled", label: "Programado", hideWhenDense: true },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--color-surface)]" role="region" aria-label="Tabla operativa de Servicios">
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-scroll [scrollbar-gutter:stable]">
        <table
          className="w-full min-w-0 table-fixed border-collapse text-left text-xs"
          aria-label="Servicios operativos"
        >
          <colgroup>
            {compactColumns ? (
              <>
                <col className="w-[12%]" />
                <col className="w-[56%]" />
                <col className="w-[32%]" />
              </>
            ) : (
              <>
                <col className="w-[8%]" />
                <col className="w-[25%]" />
                <col className="w-[15%]" />
                <col className="w-[18%]" />
                <col className="w-[16%]" />
                <col className="w-[18%]" />
              </>
            )}
          </colgroup>
          <thead className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] font-semibold">
            <tr>
              <th scope="col" aria-label="Número de parada" className="px-1 py-3 text-center">#</th>
              {columns.map((col) => {
                if (compactColumns && col.hideWhenDense) return null;
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
                    className="select-none px-1 py-2"
                  >
                    <div className={cn("flex items-center justify-between gap-1.5", dense && "gap-1")}>
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
                            <ArrowUp className="h-3 w-3 text-[var(--color-action)]" aria-hidden />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-[var(--color-action)]" aria-hidden />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" aria-hidden />
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
                                <span>{STATUS_LABEL[st]}</span>
                              </label>
                            ))}
                          </div>
                        </ColumnFilterPopover>
                      )}

                      {col.key === "crew" && (
                        <ColumnFilterPopover
                          label="cuadrilla"
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
                service.zoneNames.join(", "),
                formatCalendarDay(service.scheduledDate),
                service.windowFrom
                  ? `${service.windowFrom}${service.windowTo ? `–${service.windowTo}` : ""}`
                  : "",
              ].filter(Boolean).join(" · ");

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
                      ? "bg-[var(--color-action)]/10"
                      : "hover:bg-[var(--color-canvas)]",
                  )}
                >
                  <td className={cn("text-center tabular-nums", dense ? "px-1 py-2" : "px-1.5 py-2")}>
                    <span
                      aria-label={`Parada ${ordinal}`}
                      className="inline-flex size-7 items-center justify-center rounded-full bg-[var(--color-action)] text-xs font-bold text-[var(--color-on-institutional)]"
                    >
                      {ordinal}
                    </span>
                  </td>
                  <td className="px-1.5 py-2">
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
                        {dense && (
                          <span className="mt-0.5 block text-[11px] text-[var(--color-text-secondary)]">
                            {compactSecondaryInfo}
                          </span>
                        )}
                      </span>
                    </button>
                  </td>

                  {!compactColumns && (
                    <td className="px-1.5 py-2 text-[var(--color-text)]">
                      {service.zoneNames.join(", ")}
                    </td>
                  )}

                  <td className="px-1.5 py-2">
                    <div className="flex flex-col gap-1 items-start">
                      <StatusBadge status={service.status} className="gap-1 px-1.5 text-[11px] [&_svg]:h-3 [&_svg]:w-3" />
                    </div>
                  </td>

                  {!compactColumns && (
                    <td className="px-1.5 py-2 text-[var(--color-text)]">
                      {service.crewName ?? (
                        <span className="italic text-[var(--color-text-secondary)]">Sin asignar</span>
                      )}
                    </td>
                  )}

                  {!compactColumns && (
                    <td className="px-1.5 py-2 text-[var(--color-text)] tabular-nums">
                      <div>{formatCalendarDay(service.scheduledDate)}</div>
                      {service.windowFrom && (
                        <div className="text-[11px] text-[var(--color-text-secondary)]">
                          {service.windowFrom} – {service.windowTo ?? ""}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}

            {services.length === 0 && (
              <tr>
                <td colSpan={compactColumns ? 3 : columns.length + 1} className="p-8 text-center text-sm text-[var(--color-text-secondary)]">
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
      </div>
    </div>
  );
}
