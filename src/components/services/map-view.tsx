"use client";

import { useMemo } from "react";
import { AlertCircle, Loader2, MapPin, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Service } from "@/lib/services";
import { cn } from "@/lib/utils";

function fitBounds(services: Service[]) {
  if (services.length === 0) {
    return { minX: 0, minY: 0, w: 100, h: 100 };
  }
  const xs = services.map((s) => s.coordinates.x);
  const ys = services.map((s) => s.coordinates.y);
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);

  const padX = Math.max((maxX - minX) * 0.2, 8);
  const padY = Math.max((maxY - minY) * 0.2, 8);
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

export function MapView({
  services,
  selectedId,
  onSelect,
  loading = false,
  error = false,
  onRetry,
  filterFingerprint,
  className,
}: {
  services: Service[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  filterFingerprint?: string;
  className?: string;
}) {
  // Only re-fit bounding box when active filters changed (filterFingerprint change)
  // or on initial mount, NOT on pure selection changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bounds = useMemo(() => fitBounds(services), [filterFingerprint]);

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)] bg-[linear-gradient(var(--color-surface-subtle)_1px,transparent_1px),linear-gradient(90deg,var(--color-surface-subtle)_1px,transparent_1px)] bg-[size:24px_24px]",
        className,
      )}
      role="region"
      aria-label="Mapa territorial de Servicios"
    >
      {error ? (
        <div
          role="alert"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[var(--color-surface)]/95 p-6 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-danger-fill)] text-[var(--color-accent)]">
            <AlertCircle className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--color-text)]">
              No se pudo cargar el mapa
            </h3>
            <p className="mt-1 max-w-sm text-xs text-[var(--color-text-secondary)]">
              La tabla de servicios permanece completamente disponible y operativa. El mapa es una vista complementaria.
            </p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw data-icon="inline-start" aria-hidden />
              Reintentar mapa
            </Button>
          )}
        </div>
      ) : loading ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-[var(--color-surface)]/80 text-sm font-medium text-[var(--color-text-secondary)]"
        >
          <Loader2 className="h-5 w-5 animate-spin text-[var(--color-action)]" aria-hidden />
          <span>Cargando mapa territorial…</span>
        </div>
      ) : null}

      {!error && (
        <div className="relative h-full w-full">
          {services.map((service, index) => {
            const left = Math.min(Math.max(((service.coordinates.x - bounds.minX) / bounds.w) * 100, 4), 96);
            const top = Math.min(Math.max(((service.coordinates.y - bounds.minY) / bounds.h) * 100, 4), 96);
            const isSelected = service.id === selectedId;
            const markerNumber = index + 1;

            return (
              <button
                key={service.id}
                type="button"
                tabIndex={0}
                onClick={() => onSelect(service.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(service.id);
                  }
                }}
                style={{ left: `${left}%`, top: `${top}%` }}
                className={cn(
                  "group absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-300",
                  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2",
                  isSelected
                    ? "z-30 h-8 w-8 bg-[var(--color-institutional)] text-[var(--color-on-institutional)] ring-4 ring-[var(--color-accent)] ring-offset-2 scale-110 shadow-md"
                    : "z-10 h-7 w-7 bg-[var(--color-institutional)] text-[var(--color-on-institutional)] hover:scale-110 hover:z-20 border-2 border-[var(--color-surface)] shadow-xs",
                )}
                aria-label={`Parada ${markerNumber}: ${service.id} — ${service.title} (${service.zoneNames.join(", ")})`}
                aria-pressed={isSelected}
              >
                <span className="text-[11px] font-bold tabular-nums" aria-hidden>
                  {markerNumber}
                </span>

                {/* Accessible anchored floating label on hover/focus */}
                <span
                  className={cn(
                    "pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 -translate-x-1/2 hidden whitespace-nowrap rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-institutional)] px-2.5 py-1 text-xs font-medium text-white shadow-md group-hover:block group-focus-visible:block",
                  )}
                  role="tooltip"
                >
                  <span className="font-bold">{service.id}</span> · {service.title}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div
        className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/90 px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)] backdrop-blur-xs shadow-xs"
        aria-hidden="true"
      >
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-[var(--color-action)]" />
          {services.length} servicio{services.length === 1 ? "" : "s"} visible{services.length === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
