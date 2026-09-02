"use client";

// PROTOTYPE component. Structure borrowed from the catalogued
// charts-stats-4.png reference (dense inline analytics table with a
// trend/status column) — see docs/design/inspiration/README.md.
// This is the guaranteed full-parity path (settled decision): every row is
// reachable and operable by keyboard/screen reader on its own, independent
// of the map.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Filter, MapPin, Route } from "lucide-react";
import {
  MOCK_SERVICES,
  STATUS_LABEL,
  STATUS_ORDER,
  ZONES,
  type MockService,
  type ServiceStatus,
} from "../data";
import { StatusBadge, FlagBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";

type SortKey = "title" | "zone" | "status" | "crew" | "scheduledFor";
type SortDir = "asc" | "desc";

const COLUMNS: Array<{ key: SortKey; label: string; hideWhenDense?: boolean }> = [
  { key: "title", label: "Servicio" },
  { key: "zone", label: "Zona", hideWhenDense: true },
  { key: "status", label: "Estado" },
  { key: "crew", label: "Cuadrilla", hideWhenDense: true },
  { key: "scheduledFor", label: "Programado" },
];

function compare(a: MockService, b: MockService, key: SortKey): number {
  switch (key) {
    case "status":
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    case "title":
      return a.title.localeCompare(b.title);
    case "zone":
      return a.zone.localeCompare(b.zone);
    case "crew":
      return a.crew.localeCompare(b.crew);
    case "scheduledFor":
      // PROTOTYPE: scheduledFor is a display string ("Hoy 09:00"), not a
      // real timestamp — a locale compare is enough to prove the sorting
      // affordance. Real data sorts by the underlying ISO date instead.
      return a.scheduledFor.localeCompare(b.scheduledFor);
  }
}

const ALL_STATUSES = Object.keys(STATUS_LABEL) as ServiceStatus[];
const ALL_CREWS = Array.from(new Set(MOCK_SERVICES.map((s) => s.crew))).sort((a, b) =>
  a.localeCompare(b),
);

function parseHour(scheduledFor: string): string | null {
  // PROTOTYPE: scheduledFor is a display string ("Hoy 09:00"), so the range
  // filter below compares hour-of-day only, ignoring which day it is.
  const match = scheduledFor.match(/(\d{2}:\d{2})/);
  return match ? match[1] : null;
}

function toggleSetValue<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

// Column-header filter popover. Self-contained (own open state + outside-
// click close) so any header can drop one in without lifting popover state
// into the table. Pattern inspired by 21st.dev's "Data Table Filter"
// (id 8103, uniquesonu) — rebuilt without Radix/cmdk since neither is in
// this project's dependencies yet, matching the prototype's light-deps
// approach used elsewhere (see resizable.tsx).
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
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Filtrar por ${label}`}
        className={cn(
          "rounded p-0.5 hover:bg-neutral-100",
          active ? "text-navy" : "text-neutral-400",
        )}
      >
        <Filter className={cn("h-3 w-3", active && "fill-navy/20")} aria-hidden />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-md border border-neutral-200 bg-white p-2 normal-case tracking-normal text-neutral-700 shadow-lg">
          {children}
          {active && (
            <button
              type="button"
              onClick={onClear}
              className="mt-2 w-full rounded border border-neutral-200 py-1 text-xs text-neutral-500 hover:bg-neutral-50"
            >
              Limpiar filtro
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CheckboxFilterList<T extends string>({
  options,
  selected,
  onToggle,
  labelFor,
}: {
  options: readonly T[];
  selected: Set<T>;
  onToggle: (value: T) => void;
  labelFor?: (value: T) => string;
}) {
  return (
    <div className="flex max-h-48 flex-col gap-0.5 overflow-auto">
      {options.map((opt) => (
        <label
          key={opt}
          className="flex items-center gap-2 rounded px-1 py-1 text-xs hover:bg-neutral-50"
        >
          <input
            type="checkbox"
            checked={selected.has(opt)}
            onChange={() => onToggle(opt)}
            className="h-3 w-3 rounded border-neutral-300"
          />
          {labelFor ? labelFor(opt) : opt}
        </label>
      ))}
    </div>
  );
}

export function ServiceTable({
  services,
  selectedId,
  onSelect,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  dense = false,
}: {
  services: MockService[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  dense?: boolean;
}) {
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  const [columnFilters, setColumnFilters] = useState({
    zone: new Set<string>(),
    status: new Set<ServiceStatus>(),
    crew: new Set<string>(),
    hourFrom: "",
    hourTo: "",
  });

  useEffect(() => {
    if (selectedId) {
      rowRefs.current[selectedId]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedId]);

  // Column-header filters are local to the table — a second, finer-grained
  // layer under the shared top-bar filter (zone/estado/search), not a
  // replacement for it. See Toolbar.tsx.
  const filtered = useMemo(() => {
    const { zone, status, crew, hourFrom, hourTo } = columnFilters;
    if (zone.size === 0 && status.size === 0 && crew.size === 0 && !hourFrom && !hourTo) {
      return services;
    }
    return services.filter((s) => {
      if (zone.size > 0 && !zone.has(s.zone)) return false;
      if (status.size > 0 && !status.has(s.status)) return false;
      if (crew.size > 0 && !crew.has(s.crew)) return false;
      if (hourFrom || hourTo) {
        const hour = parseHour(s.scheduledFor);
        if (!hour) return false;
        if (hourFrom && hour < hourFrom) return false;
        if (hourTo && hour > hourTo) return false;
      }
      return true;
    });
  }, [services, columnFilters]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const copy = [...filtered].sort((a, b) => compare(a, b, sort.key));
    return sort.dir === "asc" ? copy : copy.reverse();
  }, [filtered, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null; // third click clears sorting for this column
    });
  }

  const columnFilterCount =
    (columnFilters.zone.size > 0 ? 1 : 0) +
    (columnFilters.status.size > 0 ? 1 : 0) +
    (columnFilters.crew.size > 0 ? 1 : 0) +
    (columnFilters.hourFrom || columnFilters.hourTo ? 1 : 0);

  function clearColumnFilters() {
    setColumnFilters({
      zone: new Set(),
      status: new Set(),
      crew: new Set(),
      hourFrom: "",
      hourTo: "",
    });
  }

  const allSelected =
    services.length > 0 && services.every((s) => selectedIds.has(s.id));

  return (
    <div className="flex h-full flex-col">
      {columnFilterCount > 0 && (
        <div className="flex items-center gap-2 border-b border-navy/15 bg-navy/5 px-3 py-1.5 text-xs text-navy">
          <Filter className="h-3 w-3" aria-hidden />
          {columnFilterCount} filtro{columnFilterCount === 1 ? "" : "s"} de columna activo
          {columnFilterCount === 1 ? "" : "s"}
          <button
            type="button"
            onClick={clearColumnFilters}
            className="ml-auto font-medium hover:underline"
          >
            Limpiar
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-white text-xs uppercase tracking-wide text-neutral-400 shadow-[inset_0_-1px_0_theme(colors.neutral.200)]">
          <tr>
            <th className="w-9 px-3 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                aria-label="Seleccionar todos los Servicios visibles"
                className="h-3.5 w-3.5 rounded border-neutral-300"
              />
            </th>
            {COLUMNS.map((col) => {
              if (col.hideWhenDense && dense) return null;
              const active = sort?.key === col.key;
              const Icon = !active ? ArrowUpDown : sort!.dir === "asc" ? ArrowUp : ArrowDown;
              return (
                <th key={col.key} className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        "flex items-center gap-1 uppercase tracking-wide hover:text-neutral-700",
                        active && "text-navy",
                      )}
                      aria-label={`Ordenar por ${col.label}`}
                    >
                      {col.label}
                      <Icon
                        className={cn("h-3 w-3", !active && "opacity-40")}
                        aria-hidden
                      />
                    </button>
                    {col.key === "zone" && (
                      <ColumnFilterPopover
                        label="zona"
                        active={columnFilters.zone.size > 0}
                        onClear={() =>
                          setColumnFilters((f) => ({ ...f, zone: new Set() }))
                        }
                      >
                        <CheckboxFilterList
                          options={ZONES}
                          selected={columnFilters.zone}
                          onToggle={(v) =>
                            setColumnFilters((f) => ({ ...f, zone: toggleSetValue(f.zone, v) }))
                          }
                        />
                      </ColumnFilterPopover>
                    )}
                    {col.key === "status" && (
                      <ColumnFilterPopover
                        label="estado"
                        active={columnFilters.status.size > 0}
                        onClear={() =>
                          setColumnFilters((f) => ({ ...f, status: new Set() }))
                        }
                      >
                        <CheckboxFilterList
                          options={ALL_STATUSES}
                          selected={columnFilters.status}
                          onToggle={(v) =>
                            setColumnFilters((f) => ({
                              ...f,
                              status: toggleSetValue(f.status, v),
                            }))
                          }
                          labelFor={(v) => STATUS_LABEL[v]}
                        />
                      </ColumnFilterPopover>
                    )}
                    {col.key === "crew" && (
                      <ColumnFilterPopover
                        label="cuadrilla"
                        active={columnFilters.crew.size > 0}
                        onClear={() =>
                          setColumnFilters((f) => ({ ...f, crew: new Set() }))
                        }
                      >
                        <CheckboxFilterList
                          options={ALL_CREWS}
                          selected={columnFilters.crew}
                          onToggle={(v) =>
                            setColumnFilters((f) => ({ ...f, crew: toggleSetValue(f.crew, v) }))
                          }
                        />
                      </ColumnFilterPopover>
                    )}
                    {col.key === "scheduledFor" && (
                      <ColumnFilterPopover
                        label="horario"
                        active={Boolean(columnFilters.hourFrom || columnFilters.hourTo)}
                        onClear={() =>
                          setColumnFilters((f) => ({ ...f, hourFrom: "", hourTo: "" }))
                        }
                      >
                        <div className="flex flex-col gap-1.5">
                          <label className="flex items-center justify-between gap-2 text-xs normal-case tracking-normal">
                            Desde
                            <input
                              type="time"
                              value={columnFilters.hourFrom}
                              onChange={(e) =>
                                setColumnFilters((f) => ({ ...f, hourFrom: e.target.value }))
                              }
                              className="rounded border border-neutral-200 px-1 py-0.5 text-xs"
                            />
                          </label>
                          <label className="flex items-center justify-between gap-2 text-xs normal-case tracking-normal">
                            Hasta
                            <input
                              type="time"
                              value={columnFilters.hourTo}
                              onChange={(e) =>
                                setColumnFilters((f) => ({ ...f, hourTo: e.target.value }))
                              }
                              className="rounded border border-neutral-200 px-1 py-0.5 text-xs"
                            />
                          </label>
                          <p className="text-[10px] normal-case tracking-normal text-neutral-400">
                            Compara solo la hora programada, no el día.
                          </p>
                        </div>
                      </ColumnFilterPopover>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => {
            const selected = s.id === selectedId;
            const checked = selectedIds.has(s.id);
            return (
              <tr
                key={s.id}
                ref={(el) => {
                  rowRefs.current[s.id] = el;
                }}
                tabIndex={0}
                role="row"
                aria-selected={selected}
                onClick={() => onSelect(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(s.id);
                  }
                }}
                className={cn(
                  "cursor-pointer border-b border-neutral-100 outline-none transition-colors focus-visible:bg-navy/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy",
                  selected ? "bg-navy/5" : "hover:bg-neutral-50",
                )}
              >
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleSelect(s.id)}
                    aria-label={`Seleccionar ${s.id}`}
                    className="h-3.5 w-3.5 rounded border-neutral-300"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    {s.kind === "ROUTE" ? (
                      <Route className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
                    ) : (
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
                    )}
                    <div>
                      <div className="font-medium text-neutral-800">{s.title}</div>
                      <div className="text-xs text-neutral-400">
                        {s.id}
                        {dense ? ` · ${s.zone}` : ""}
                      </div>
                      {s.flag && (
                        <div className="mt-1">
                          <FlagBadge flag={s.flag} />
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                {!dense && <td className="px-3 py-2.5 text-neutral-600">{s.zone}</td>}
                <td className="px-3 py-2.5">
                  <StatusBadge status={s.status} />
                </td>
                {!dense && <td className="px-3 py-2.5 text-neutral-600">{s.crew}</td>}
                <td className="whitespace-nowrap px-3 py-2.5 text-neutral-500">
                  {s.scheduledFor}
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-10 text-center text-sm text-neutral-400">
                Ningún Servicio coincide con los filtros actuales.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

export function BulkActionBar({
  count,
  onClear,
}: {
  count: number;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3 border-b border-navy/15 bg-navy/5 px-4 py-2 text-sm">
      <span className="font-medium text-navy">
        {count} Servicio{count === 1 ? "" : "s"} seleccionado{count === 1 ? "" : "s"}
      </span>
      {/* PROTOTYPE: empty action shell only — settled decision defers real
          bulk workflows (weather/inspection-triggered creation & suspension)
          to ticket #22 and others. */}
      <button
        type="button"
        disabled
        className="cursor-not-allowed rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-400"
        title="Reservado para futuras acciones masivas (ver ticket #22)"
      >
        Acciones…
      </button>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto text-xs font-medium text-navy hover:underline"
      >
        Limpiar selección
      </button>
    </div>
  );
}
