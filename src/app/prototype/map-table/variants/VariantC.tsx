"use client";

// Variant C — "List primary, map optional": the table is the whole screen
// by default — closest to a classic admin list — and the map is tucked
// behind a "Ver mapa" toggle rather than always occupying half the screen.
// Selecting a row expands it in place (accordion), so a quick look never
// leaves the list at all. This is the variant for an Office worker who
// mostly works the list and only checks the map occasionally, contrasting
// deliberately with Variant B's map-primary structure. Deliberately not a
// <table> like A/B — a stacked row list reads better once rows can expand
// in place, and keeps the three variants structurally distinct rather than
// three re-skinned tables.
import { useState } from "react";
import { Check, ChevronDown, ExternalLink, Map as MapIcon, MapPin, Route, X } from "lucide-react";
import { MapMock } from "../components/MapMock";
import { BulkActionBar } from "../components/ServiceTable";
import { StatusBadge, FlagBadge } from "../components/StatusBadge";
import { DetailStub } from "../components/DetailStub";
import type { MockService } from "../data";
import { cn } from "@/lib/utils";

export function VariantC(props: {
  services: MockService[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  mapLoading: boolean;
  mapError: boolean;
  detailService: MockService | null;
  onOpenDetail: (id: string) => void;
  onCloseDetail: () => void;
}) {
  const {
    services,
    selectedId,
    onSelect,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    onClearSelection,
    mapLoading,
    mapError,
    detailService,
    onOpenDetail,
    onCloseDetail,
  } = props;

  const [mapOpen, setMapOpen] = useState(false);
  const allSelected =
    services.length > 0 && services.every((s) => selectedIds.has(s.id));

  if (detailService) {
    return <DetailStub service={detailService} onBack={onCloseDetail} />;
  }

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-2">
        <label className="flex items-center gap-1.5 text-xs text-neutral-500">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            className="h-3.5 w-3.5 rounded border-neutral-300"
          />
          Seleccionar todo
        </label>
        <button
          type="button"
          onClick={() => setMapOpen(true)}
          className="ml-auto flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm font-medium text-navy hover:border-navy/40"
        >
          <MapIcon className="h-4 w-4" aria-hidden />
          Ver mapa
        </button>
      </div>

      <BulkActionBar count={selectedIds.size} onClear={onClearSelection} />

      <ul className="min-h-0 flex-1 divide-y divide-neutral-100 overflow-auto">
        {services.map((s) => {
          const expanded = s.id === selectedId;
          const checked = selectedIds.has(s.id);
          return (
            <li key={s.id}>
              <div
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onClick={() => onSelect(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(s.id);
                  }
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-4 py-3 outline-none focus-visible:bg-navy/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy",
                  expanded ? "bg-navy/5" : "hover:bg-neutral-50",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onToggleSelect(s.id)}
                  aria-label={`Seleccionar ${s.id}`}
                  className="h-3.5 w-3.5 shrink-0 rounded border-neutral-300"
                />
                {s.kind === "ROUTE" ? (
                  <Route className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                ) : (
                  <MapPin className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-neutral-800">
                    {s.title}
                  </div>
                  <div className="text-xs text-neutral-400">
                    {s.id} · {s.zone} · {s.scheduledFor}
                  </div>
                </div>
                <StatusBadge status={s.status} className="shrink-0" />
                {s.flag && <FlagBadge flag={s.flag} />}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-neutral-400 transition-transform",
                    expanded && "rotate-180",
                  )}
                  aria-hidden
                />
              </div>

              {expanded && (
                <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-4">
                  <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-neutral-400">Cuadrilla</dt>
                      <dd className="text-neutral-700">{s.crew}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-neutral-400">Tipo</dt>
                      <dd className="text-neutral-700">
                        {s.kind === "ROUTE" ? "Recorrido" : "Punto"}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-neutral-400">
                        Último evento
                      </dt>
                      <dd className="flex items-center gap-1.5 text-neutral-700">
                        <Check className="h-3.5 w-3.5 text-navy" aria-hidden />
                        {[...s.history].reverse().find((h) => h.done)?.label}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(s.id)}
                      className="flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-light"
                    >
                      Ver detalle completo
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelect(s.id)}
                      className="text-xs font-medium text-neutral-500 hover:underline"
                    >
                      Contraer
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {services.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-neutral-400">
            Ningún Servicio coincide con los filtros actuales.
          </li>
        )}
      </ul>

      {/* Map is opt-in, not default — overlay panel on desktop, full-screen
          on mobile, rather than a permanent half of the screen. */}
      {mapOpen && (
        <div className="absolute inset-0 z-20 flex justify-end bg-black/20 md:bg-transparent">
          <div className="flex h-full w-full flex-col border-l border-neutral-200 bg-white shadow-xl md:w-[420px]">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
              <span className="text-sm font-semibold text-neutral-700">Mapa</span>
              <button
                type="button"
                onClick={() => setMapOpen(false)}
                aria-label="Cerrar mapa"
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 p-2">
              <MapMock
                services={services}
                selectedId={selectedId}
                onSelect={onSelect}
                loading={mapLoading}
                error={mapError}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
