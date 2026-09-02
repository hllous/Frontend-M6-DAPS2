"use client";

// PROTOTYPE component. One shared filter/search bar drives both panes from
// a single filtered array — settled decision: map and table read the same
// filtered state, never two independent queries.
import { Search } from "lucide-react";
import { STATUS_LABEL, ZONES, type ServiceStatus } from "../data";
import { cn } from "@/lib/utils";

const ALL_STATUSES = Object.keys(STATUS_LABEL) as ServiceStatus[];

export interface FilterState {
  query: string;
  zone: string | "all";
  statuses: Set<ServiceStatus>;
}

export function Toolbar({
  filter,
  onChange,
  simulateMapOutage,
  onToggleMapOutage,
}: {
  filter: FilterState;
  onChange: (next: FilterState) => void;
  simulateMapOutage: boolean;
  onToggleMapOutage: () => void;
}) {
  function toggleStatus(status: ServiceStatus) {
    const next = new Set(filter.statuses);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    onChange({ ...filter, statuses: next });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-white px-4 py-3">
      <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5">
        <Search className="h-4 w-4 text-neutral-400" aria-hidden />
        <input
          value={filter.query}
          onChange={(e) => onChange({ ...filter, query: e.target.value })}
          placeholder="Buscar Servicio, zona, cuadrilla…"
          className="w-full bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
        />
      </div>

      <select
        value={filter.zone}
        onChange={(e) => onChange({ ...filter, zone: e.target.value })}
        className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-700"
      >
        <option value="all">Todas las zonas</option>
        {ZONES.map((z) => (
          <option key={z} value={z}>
            {z}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap gap-1.5">
        {ALL_STATUSES.map((s) => {
          const active = filter.statuses.has(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-navy bg-navy text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300",
              )}
              aria-pressed={active}
            >
              {STATUS_LABEL[s]}
            </button>
          );
        })}
      </div>

      <label className="ml-auto flex items-center gap-1.5 text-xs text-neutral-500">
        <input
          type="checkbox"
          checked={simulateMapOutage}
          onChange={onToggleMapOutage}
          className="h-3.5 w-3.5 rounded border-neutral-300"
        />
        Simular caída del mapa
        <span className="text-neutral-400">(la tabla sigue andando)</span>
      </label>
    </div>
  );
}
