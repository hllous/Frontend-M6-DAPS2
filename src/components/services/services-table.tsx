"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
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
import type { Service, ServiceStatus } from "@/lib/services";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/services";
import { cn } from "@/lib/utils";
import { FlagBadge, StatusBadge } from "./status-badge";

export type SortKey = "service" | "zone" | "status" | "crew" | "scheduled";
export type SortDir = "asc" | "desc";

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

function compareServices(a: Service, b: Service, key: SortKey): number {
  switch (key) {
    case "status":
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    case "service":
      return a.title.localeCompare(b.title);
    case "zone":
      return (a.zoneNames[0] ?? "").localeCompare(b.zoneNames[0] ?? "");
    case "crew":
      return (a.crewName ?? "zzz").localeCompare(b.crewName ?? "zzz");
    case "scheduled": {
      const aTime = `${a.scheduledDate} ${a.windowFrom ?? ""}`;
      const bTime = `${b.scheduledDate} ${b.windowFrom ?? ""}`;
      return aTime.localeCompare(bTime);
    }
  }
}

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

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
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
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Filtrar por ${label}`}
        className={cn(
          "rounded-md p-1 transition-colors hover:bg-[var(--color-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]",
          active ? "text-[var(--color-action)] font-bold" : "text-[var(--color-text-secondary)]",
        )}
      >
        <Filter className={cn("h-3.5 w-3.5", active && "fill-[var(--color-action)]/20")} aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`Filtro de ${label}`}
          className="absolute right-0 top-full z-50 mt-1 min-w-[220px] rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3 text-left shadow-lg"
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

export function ServicesTable({
  services,
  selectedId,
  onSelect,
  sortKey,
  sortDir,
  onSortChange,
  columnFilters,
  onColumnFiltersChange,
  dense = false,
}: {
  services: Service[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSortChange: (key: SortKey) => void;
  columnFilters: ColumnFilters;
  onColumnFiltersChange: (filters: ColumnFilters) => void;
  dense?: boolean;
}) {
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

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
    services.forEach((s) => s.zoneNames.forEach((zn) => set.add(zn)));
    return Array.from(set).sort();
  }, [services]);

  const availableCrews = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => set.add(s.crewName ?? "Sin asignar"));
    return Array.from(set).sort();
  }, [services]);

  const sortedServices = useMemo(() => {
    const copy = [...services];
    copy.sort((a, b) => {
      const cmp = compareServices(a, b, sortKey);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [services, sortKey, sortDir]);

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
    { key: "scheduled", label: "Programado" },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--color-surface)]" role="region" aria-label="Tabla operativa de Servicios">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-xs" role="grid">
          <thead className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] font-semibold">
            <tr role="row">
              {columns.map((col) => {
                if (dense && col.hideWhenDense) return null;
                const isSorted = sortKey === col.key;
                const ariaSort = isSorted
                  ? sortDir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none";

                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className="p-3 select-none"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSortChange(col.key)}
                        className="flex items-center gap-1 hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-focus)] rounded"
                        aria-label={`Ordenar por ${col.label}, actualmente ${ariaSort === "none" ? "sin ordenar" : ariaSort}`}
                      >
                        <span>{col.label}</span>
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
                                onChange={(e) => onColumnFiltersChange({ ...columnFilters, timeFrom: e.target.value })}
                                className="rounded border border-[var(--color-border-strong)] px-1.5 py-0.5 text-xs text-[var(--color-text)]"
                              />
                            </label>
                            <label className="flex items-center justify-between gap-2">
                              <span className="text-[var(--color-text-secondary)]">Hasta</span>
                              <input
                                type="time"
                                value={columnFilters.timeTo}
                                onChange={(e) => onColumnFiltersChange({ ...columnFilters, timeTo: e.target.value })}
                                className="rounded border border-[var(--color-border-strong)] px-1.5 py-0.5 text-xs text-[var(--color-text)]"
                              />
                            </label>
                          </div>
                        </ColumnFilterPopover>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {sortedServices.map((service) => {
              const isSelected = service.id === selectedId;

              return (
                <tr
                  key={service.id}
                  ref={(el) => {
                    rowRefs.current[service.id] = el;
                  }}
                  tabIndex={0}
                  role="row"
                  aria-selected={isSelected}
                  onClick={() => onSelect(service.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(service.id);
                    }
                  }}
                  className={cn(
                    "cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus)]",
                    isSelected
                      ? "bg-[var(--color-action)]/10 font-medium"
                      : "hover:bg-[var(--color-canvas)]",
                  )}
                >
                  <td className="p-3">
                    <div className="flex items-start gap-2">
                      {service.mode === "ROUTE" ? (
                        <Route className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-action)]" aria-hidden />
                      ) : (
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-action)]" aria-hidden />
                      )}
                      <div>
                        <div className="font-semibold text-[var(--color-text)] leading-tight">
                          {service.title}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
                          <span>{service.id}</span>
                          {dense && (
                            <span> · {service.zoneNames.join(", ")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {!dense && (
                    <td className="p-3 text-[var(--color-text)]">
                      {service.zoneNames.join(", ")}
                    </td>
                  )}

                  <td className="p-3">
                    <div className="flex flex-col gap-1 items-start">
                      <StatusBadge status={service.status} />
                      {service.flag && <FlagBadge flag={service.flag} />}
                    </div>
                  </td>

                  {!dense && (
                    <td className="p-3 text-[var(--color-text)]">
                      {service.crewName ?? (
                        <span className="italic text-[var(--color-text-secondary)]">Sin asignar</span>
                      )}
                    </td>
                  )}

                  <td className="p-3 text-[var(--color-text)] tabular-nums whitespace-nowrap">
                    <div>{service.scheduledDate}</div>
                    {service.windowFrom && (
                      <div className="text-[11px] text-[var(--color-text-secondary)]">
                        {service.windowFrom} – {service.windowTo ?? ""}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {sortedServices.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="p-12 text-center text-sm text-[var(--color-text-secondary)]">
                  Ningún servicio coincide con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
