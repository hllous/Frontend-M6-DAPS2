"use client";

// PROTOTYPE component. Stands in for a real MapLibre view (already decided
// separately in issue #11) — the point of this ticket is the interaction
// model, not the mapping library. Pins live on a fake 0-100 coordinate
// plane; filtering re-fits the visible bounding box (settled decision: a
// filter change auto-fits the map). Selecting a pin only highlights it —
// it never yanks the viewport (that's reserved for the filter-driven fit).
import { useMemo } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import type { MockService } from "../data";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<string, string> = {
  SCHEDULED: "bg-slate-400",
  ASSIGNED: "bg-blue-500",
  IN_PROGRESS: "bg-amber-500",
  SERVICED: "bg-teal-500",
  COMPLETED: "bg-emerald-500",
  SUSPENDED: "bg-coral",
  CANCELLED: "bg-slate-300",
};

function fitBounds(services: MockService[]) {
  if (services.length === 0) {
    return { minX: 0, minY: 0, w: 100, h: 100 };
  }
  const xs = services.map((s) => s.x);
  const ys = services.map((s) => s.y);
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  const padX = Math.max((maxX - minX) * 0.25, 8);
  const padY = Math.max((maxY - minY) * 0.25, 8);
  minX -= padX;
  maxX += padX;
  minY -= padY;
  maxY += padY;
  return {
    minX,
    minY,
    w: Math.max(maxX - minX, 15),
    h: Math.max(maxY - minY, 15),
  };
}

export function MapMock({
  services,
  selectedId,
  onSelect,
  loading = false,
  error = false,
  className,
}: {
  services: MockService[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  error?: boolean;
  className?: string;
}) {
  const bounds = useMemo(() => fitBounds(services), [services]);

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-lg border border-neutral-200 bg-[linear-gradient(#eef1f5_1px,transparent_1px),linear-gradient(90deg,#eef1f5_1px,transparent_1px)] bg-[size:24px_24px] bg-neutral-50",
        className,
      )}
      role="group"
      aria-label="Mapa de Servicios (referencial)"
    >
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-50/95 p-6 text-center">
          <AlertCircle className="h-6 w-6 text-coral" aria-hidden />
          <p className="text-sm font-semibold text-neutral-800">
            No se pudo cargar el mapa
          </p>
          <p className="max-w-xs text-xs text-neutral-500">
            La tabla sigue disponible y funcional — el mapa es una vista
            complementaria, no un requisito.
          </p>
        </div>
      ) : loading ? (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-neutral-50/80 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Cargando mapa…
        </div>
      ) : null}

      {!error &&
        services.map((s) => {
          const left = ((s.x - bounds.minX) / bounds.w) * 100;
          const top = ((s.y - bounds.minY) / bounds.h) * 100;
          const selected = s.id === selectedId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              style={{ left: `${left}%`, top: `${top}%` }}
              className={cn(
                "group absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm transition-[left,top,transform] duration-500 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy",
                STATUS_DOT[s.status],
                selected
                  ? "z-10 h-5 w-5 ring-2 ring-navy ring-offset-2"
                  : "h-3.5 w-3.5 hover:scale-125",
              )}
              aria-label={`${s.title} — ${s.zone}`}
              aria-pressed={selected}
            >
              <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded bg-navy px-2 py-1 text-[11px] font-medium text-white group-hover:block">
                {s.id}
              </span>
            </button>
          );
        })}

      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[11px] text-neutral-500 shadow-sm">
        Mapa referencial (prototipo) · {services.length} de resultado(s)
      </div>
    </div>
  );
}
