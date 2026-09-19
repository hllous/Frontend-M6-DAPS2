"use client";

import {
  Calendar,
  Check,
  Clock,
  ExternalLink,
  MapPin,
  Route,
  Truck,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Service } from "@/lib/services";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

export function ServicePreview({
  service,
  onOpenDetail,
  onAssignCrew,
  onClose,
  className,
}: {
  service: Service;
  onOpenDetail: (id: string) => void;
  onAssignCrew?: (service: Service) => void;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-md overflow-hidden",
        className,
      )}
      aria-labelledby="preview-title"
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] p-4 bg-[var(--color-canvas)]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
            {service.mode === "ROUTE" ? (
              <span className="inline-flex items-center gap-1 text-[var(--color-action)]">
                <Route className="h-3.5 w-3.5" aria-hidden />
                Recorrido
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[var(--color-action)]">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                Punto
              </span>
            )}
            <span>·</span>
            <span className="font-bold text-[var(--color-text)]">{service.id}</span>
          </div>
          <h2
            id="preview-title"
            className="mt-1 text-sm font-bold text-[var(--color-text)] leading-snug line-clamp-2"
          >
            {service.title}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {service.zoneNames.map((zn) => (
              <span
                key={zn}
                className="inline-flex items-center rounded-md bg-[var(--color-surface-subtle)] px-2 py-0.5 text-xs text-[var(--color-text)]"
              >
                {zn}
              </span>
            ))}
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar vista previa"
            className="h-8 w-8 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={service.status} />
        </div>

        {service.statusReason && (
          <div className="rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/40 p-3 text-xs text-[var(--color-warning)]">
            <span className="font-semibold block mb-0.5">Motivo de estado:</span>
            {service.statusReason}
          </div>
        )}

        <dl className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-xs">
          <div>
            <dt className="flex items-center gap-1 text-[var(--color-text-secondary)] font-medium">
              <Users className="h-3.5 w-3.5" aria-hidden />
              Cuadrilla
            </dt>
            <dd className="mt-0.5 font-semibold text-[var(--color-text)]">
              {service.crewName ?? "Sin asignar"}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-[var(--color-text-secondary)] font-medium">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              Fecha
            </dt>
            <dd className="mt-0.5 font-semibold text-[var(--color-text)] tabular-nums">
              {service.scheduledDate}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-[var(--color-text-secondary)] font-medium">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              Horario
            </dt>
            <dd className="mt-0.5 font-semibold text-[var(--color-text)] tabular-nums">
              {service.windowFrom ? `${service.windowFrom} – ${service.windowTo ?? ""}` : "No definida"}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-[var(--color-text-secondary)] font-medium">
              <Truck className="h-3.5 w-3.5" aria-hidden />
              Vehículo
            </dt>
            <dd className="mt-0.5 font-semibold text-[var(--color-text)]">
              {service.vehiclePlate ?? "No asignado"}
            </dd>
          </div>
        </dl>

        {service.notes && (
          <div>
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
              Notas operativas
            </span>
            <p className="mt-1 text-xs text-[var(--color-text)] bg-[var(--color-surface-subtle)] p-2.5 rounded-lg border border-[var(--color-border)]">
              {service.notes}
            </p>
          </div>
        )}

        {service.history.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
              Historial de cambios
            </span>
            <ol className="mt-3 relative pl-4 border-l-2 border-[var(--color-border)] space-y-3">
              {service.history.map((step, idx) => (
                <li key={idx} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[23px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-[var(--color-surface)]",
                      step.done
                        ? "border-[var(--color-action)] text-[var(--color-action)]"
                        : "border-[var(--color-border-strong)] text-transparent",
                    )}
                    aria-hidden
                  >
                    {step.done && <Check className="h-2.5 w-2.5" />}
                  </span>
                  <div className="text-xs">
                    <span className="font-semibold text-[var(--color-text)]">{step.label}</span>
                    <span className="ml-2 text-[11px] text-[var(--color-text-secondary)] tabular-nums">
                      {step.at}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] p-3 bg-[var(--color-canvas)] flex flex-col gap-2">
        {onAssignCrew && (service.status === "SCHEDULED" || service.status === "RESCHEDULED") && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => onAssignCrew(service)}
            className="w-full justify-center text-xs font-semibold gap-1.5"
          >
            <Users className="h-3.5 w-3.5" aria-hidden />
            <span>{service.crewId ? "Reasignar cuadrilla" : "Asignar cuadrilla"}</span>
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenDetail(service.id)}
          className="w-full justify-center text-xs font-semibold gap-1.5"
        >
          <span>Ver detalle completo</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    </aside>
  );
}
