"use client";

// PROTOTYPE component. Stands in for the real Service detail route, which
// issue #7 already decided carries a persistent Related-items panel — every
// variant's selection path ends here, whether by an explicit "view detail"
// action (A, C) or immediately on selection (B). Not a new detail surface.
import { ArrowLeft, MapPin, Route } from "lucide-react";
import type { MockService } from "../data";
import { StatusBadge, FlagBadge } from "./StatusBadge";

export function DetailStub({
  service,
  onBack,
}: {
  service: MockService;
  onBack: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-navy hover:bg-navy/5"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver
        </button>
        <span className="text-xs text-neutral-400">
          Ruta de detalle real (issue #7) — stub para este prototipo
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-400">
            {service.kind === "ROUTE" ? (
              <Route className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <MapPin className="h-3.5 w-3.5" aria-hidden />
            )}
            {service.id} · {service.zone}
          </div>
          <h2 className="mt-1 text-xl font-bold text-neutral-900">
            {service.title}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={service.status} />
            {service.flag && <FlagBadge flag={service.flag} />}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 p-4">
              <div className="text-xs text-neutral-400">Cuadrilla asignada</div>
              <div className="mt-1 text-sm font-medium text-neutral-800">
                {service.crew}
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 p-4">
              <div className="text-xs text-neutral-400">Programado</div>
              <div className="mt-1 text-sm font-medium text-neutral-800">
                {service.scheduledFor}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
            Contenido específico del Servicio (evidencia, mapa de detalle,
            historial completo) — fuera del alcance de este prototipo.
          </div>
        </div>

        {/* Persistent Related-items panel — decided in issue #7 for every
            detail view; stubbed here just to show it's always present. */}
        <aside className="hidden w-64 shrink-0 border-l border-neutral-200 bg-neutral-50 p-4 md:block">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Relacionados
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-neutral-500">
            <li className="rounded-md border border-neutral-200 bg-white p-2">
              Zona: {service.zone}
            </li>
            <li className="rounded-md border border-neutral-200 bg-white p-2">
              Cuadrilla: {service.crew}
            </li>
            <li className="rounded-md border border-neutral-200 bg-white p-2">
              Otros Servicios de hoy en esta zona
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
