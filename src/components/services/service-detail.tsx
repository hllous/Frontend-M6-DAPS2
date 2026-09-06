"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Calendar,
  CalendarClock,
  Clock,
  CloudOff,
  FileText,
  MapPin,
  Pause,
  Play,
  PlayCircle,
  Route,
  ShieldCheck,
  Siren,
  Truck,
  Users,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { checkServiceWindowTiming, type Service } from "@/lib/services";
import { StatusBadge } from "./status-badge";
import { ZoneExecutionPanel } from "./zone-execution-panel";

export function ServiceDetail({
  service,
  onBack,
  onAssignCrew,
  onStartService,
  onSuspendService,
  onResumeService,
  onReschedule,
  onConfirmReschedule,
  onCancelService,
  onCreateRepairRequest,
  onCreateStreetClosureRequest,
  onServiceUpdated,
  canStartService = false,
  isStarting = false,
  startError = null,
  startDraftPending = false,
  isResuming = false,
  resumeError = null,
  resumeDraftPending = false,
  backLabel = "Volver a Servicios",
}: {
  service: Service;
  onBack: () => void;
  onAssignCrew?: (service: Service) => void;
  onStartService?: (service: Service) => void | Promise<void>;
  onSuspendService?: (service: Service) => void;
  onResumeService?: (service: Service) => void | Promise<void>;
  onReschedule?: (service: Service) => void;
  onConfirmReschedule?: (service: Service) => void;
  onCancelService?: (service: Service) => void;
  onCreateRepairRequest?: (service: Service) => void;
  onCreateStreetClosureRequest?: (service: Service) => void;
  onServiceUpdated?: (service: Service) => void;
  canStartService?: boolean;
  isStarting?: boolean;
  startError?: string | null;
  /** A local draft exists (composed while offline) awaiting manual resubmission. */
  startDraftPending?: boolean;
  isResuming?: boolean;
  resumeError?: string | null;
  resumeDraftPending?: boolean;
  backLabel?: string;
}) {
  const windowTiming = checkServiceWindowTiming(service);

  return (
    <div className="flex h-full flex-col bg-[var(--color-surface)] overflow-hidden" role="region" aria-label={`Detalle completo de ${service.id}`}>
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-3 bg-[var(--color-canvas)]">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-xs font-semibold"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {backLabel}
        </Button>
        <div className="flex items-center gap-3">
          {canStartService && onStartService && service.status === "SCHEDULED" && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onStartService(service)}
              disabled={isStarting}
              className="gap-1.5 text-xs font-semibold"
            >
              <Play className="h-3.5 w-3.5" aria-hidden />
              <span>
                {isStarting ? "Iniciando..." : startDraftPending ? "Reintentar envío" : "Iniciar servicio"}
              </span>
            </Button>
          )}
          {canStartService && onSuspendService && service.status === "IN_PROGRESS" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSuspendService(service)}
              className="gap-1.5 text-xs font-semibold text-[var(--color-warning)] border-[var(--color-warning-line)] hover:bg-[var(--color-warning-fill)]/40"
            >
              <Pause className="h-3.5 w-3.5" aria-hidden />
              <span>Suspender servicio</span>
            </Button>
          )}
          {canStartService && onResumeService && service.status === "SUSPENDED" && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onResumeService(service)}
              disabled={isResuming}
              className="gap-1.5 text-xs font-semibold"
            >
              <PlayCircle className="h-3.5 w-3.5" aria-hidden />
              <span>
                {isResuming ? "Reanudando..." : resumeDraftPending ? "Reintentar envío" : "Reanudar servicio"}
              </span>
            </Button>
          )}
          {onAssignCrew && (service.status === "SCHEDULED" || service.status === "RESCHEDULED") && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onAssignCrew(service)}
              className="gap-1.5 text-xs font-semibold"
            >
              <Users className="h-3.5 w-3.5" aria-hidden />
              <span>{service.crewId ? "Reasignar cuadrilla" : "Asignar cuadrilla"}</span>
            </Button>
          )}
          {onCreateRepairRequest && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCreateRepairRequest(service)}
              className="gap-1.5 text-xs font-semibold"
            >
              <Wrench className="h-3.5 w-3.5" aria-hidden />
              <span>Crear derivación de reparación</span>
            </Button>
          )}
          {onReschedule && service.status === "SCHEDULED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReschedule(service)}
              className="gap-1.5 text-xs font-semibold"
            >
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              <span>Reprogramar</span>
            </Button>
          )}
          {onConfirmReschedule && service.status === "RESCHEDULED" && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onConfirmReschedule(service)}
              className="gap-1.5 text-xs font-semibold"
            >
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              <span>Confirmar nueva fecha</span>
            </Button>
          )}
          {onCancelService &&
            (service.status === "SCHEDULED" ||
              service.status === "RESCHEDULED" ||
              service.status === "SUSPENDED") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancelService(service)}
                className="gap-1.5 text-xs font-semibold text-[var(--color-danger)] border-[var(--color-danger-line)] hover:bg-[var(--color-danger-fill)]/40"
              >
                <Ban className="h-3.5 w-3.5" aria-hidden />
                <span>Cancelar servicio</span>
              </Button>
            )}
          {onCreateStreetClosureRequest &&
            (service.status === "SCHEDULED" || service.status === "RESCHEDULED") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCreateStreetClosureRequest(service)}
                className="gap-1.5 text-xs font-semibold text-[var(--color-action)]"
              >
                <Siren className="h-3.5 w-3.5" aria-hidden />
                <span>Solicitar corte de calle</span>
              </Button>
            )}
          {!canStartService && (
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              Solo consulta
            </span>
          )}
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">
            {service.id} · Detalle operativo
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              {service.mode === "ROUTE" ? (
                <span className="inline-flex items-center gap-1.5 text-[var(--color-action)]">
                  <Route className="h-4 w-4" aria-hidden />
                  Servicio en Recorrido
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[var(--color-action)]">
                  <MapPin className="h-4 w-4" aria-hidden />
                  Servicio en Punto
                </span>
              )}
              <span>·</span>
              <span className="font-bold text-[var(--color-text)]">{service.id}</span>
              <span>·</span>
              <span>{service.serviceTypeName}</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
              {service.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <StatusBadge status={service.status} />
              <span className="rounded-lg bg-[var(--color-surface-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)]">
                Origen: {service.origin}
              </span>
            </div>
          </div>

          {service.statusReason && (
            <div className="rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/50 p-4">
              <h3 className="text-xs font-bold text-[var(--color-warning)] uppercase tracking-wide">
                Motivo de estado
              </h3>
              <p className="mt-1 text-sm text-[var(--color-warning)]">
                {service.statusReason}
              </p>
            </div>
          )}

          {service.status === "SCHEDULED" && canStartService && windowTiming.isOutside && (
            <div
              role="status"
              className="rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/50 p-4"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-warning)] uppercase tracking-wide">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                Aviso: Inicio fuera de ventana horaria
              </div>
              <p className="mt-1 text-sm text-[var(--color-warning)]">
                {windowTiming.message}
              </p>
            </div>
          )}

          {startDraftPending && (
            <div
              role="status"
              className="rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/50 p-4"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-warning)] uppercase tracking-wide">
                <CloudOff className="h-4 w-4" aria-hidden />
                Borrador local pendiente
              </div>
              <p className="mt-1 text-sm text-[var(--color-warning)]">
                No se pudo conectar con el servidor al iniciar el servicio. La acción se conservó en
                este dispositivo; reenvíela manualmente cuando recupere la conexión.
              </p>
            </div>
          )}

          {startError && (
            <div
              role="alert"
              className="rounded-xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)]/50 p-4"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-danger)] uppercase tracking-wide">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                Error al iniciar servicio
              </div>
              <p className="mt-1 text-sm text-[var(--color-danger)]">
                {startError}
              </p>
            </div>
          )}

          {resumeDraftPending && (
            <div
              role="status"
              className="rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/50 p-4"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-warning)] uppercase tracking-wide">
                <CloudOff className="h-4 w-4" aria-hidden />
                Borrador local pendiente
              </div>
              <p className="mt-1 text-sm text-[var(--color-warning)]">
                No se pudo conectar con el servidor al reanudar el servicio. La acción se conservó en
                este dispositivo; reenvíela manualmente cuando recupere la conexión.
              </p>
            </div>
          )}

          {resumeError && (
            <div
              role="alert"
              className="rounded-xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)]/50 p-4"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-danger)] uppercase tracking-wide">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                Error al reanudar servicio
              </div>
              <p className="mt-1 text-sm text-[var(--color-danger)]">
                {resumeError}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-[var(--color-border)] p-4 bg-[var(--color-canvas)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                  <Users className="h-4 w-4 text-[var(--color-action)]" aria-hidden />
                  Cuadrilla asignada
                </div>
                {onAssignCrew && (service.status === "SCHEDULED" || service.status === "RESCHEDULED") && (
                  <button
                    type="button"
                    onClick={() => onAssignCrew(service)}
                    className="text-[11px] font-semibold text-[var(--color-action)] hover:underline focus:outline-none"
                  >
                    {service.crewId ? "Reasignar" : "Asignar"}
                  </button>
                )}
              </div>
              <div className="mt-2 text-sm font-bold text-[var(--color-text)]">
                {service.crewName ?? "Sin asignar"}
              </div>
              <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
                {service.crewId ? `ID: ${service.crewId}` : "Pendiente de coordinación"}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] p-4 bg-[var(--color-canvas)]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                <Calendar className="h-4 w-4 text-[var(--color-action)]" aria-hidden />
                Programación
              </div>
              <div className="mt-2 text-sm font-bold text-[var(--color-text)] tabular-nums">
                {service.scheduledDate}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-[var(--color-text-secondary)] tabular-nums">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                Ventana: {service.windowFrom ? `${service.windowFrom} – ${service.windowTo ?? ""}` : "No establecida"}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] p-4 bg-[var(--color-canvas)]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                <Truck className="h-4 w-4 text-[var(--color-action)]" aria-hidden />
                Vehículo operativo
              </div>
              <div className="mt-2 text-sm font-bold text-[var(--color-text)]">
                {service.vehiclePlate ?? "Sin vehículo"}
              </div>
              <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
                {service.vehicleId ? `ID: ${service.vehicleId}` : "Sin requerimiento especial"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] p-5 space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wide">
              Alcance y delimitación territorial
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div>
                <span className="font-semibold text-[var(--color-text-secondary)]">Zonas operativas:</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {service.zoneNames.map((zn) => (
                    <span key={zn} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2 py-0.5 font-medium text-[var(--color-text)]">
                      {zn}
                    </span>
                  ))}
                </div>
              </div>
              {service.routeName && (
                <div>
                  <span className="font-semibold text-[var(--color-text-secondary)]">Recorrido asignado:</span>
                  <p className="mt-1 font-medium text-[var(--color-text)]">{service.routeName}</p>
                </div>
              )}
              {service.targetRef && (
                <div>
                  <span className="font-semibold text-[var(--color-text-secondary)]">Bien de inventario / Objetivo:</span>
                  <p className="mt-1 font-medium text-[var(--color-text)]">{service.targetRef} ({service.targetType})</p>
                </div>
              )}
              {service.ticketId && (
                <div>
                  <span className="font-semibold text-[var(--color-text-secondary)]">Reclamo ciudadano (M2):</span>
                  <p className="mt-1 font-medium text-[var(--color-text)]">{service.ticketId}</p>
                </div>
              )}
            </div>
          </div>

          {service.notes && (
            <div className="rounded-xl border border-[var(--color-border)] p-4 bg-[var(--color-surface-subtle)]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wide">
                <FileText className="h-4 w-4" aria-hidden />
                Notas operativas de despacho
              </div>
              <p className="mt-2 text-sm text-[var(--color-text)]">
                {service.notes}
              </p>
            </div>
          )}

          {/* Zone Execution Workflow (Available for IN_PROGRESS and closed services) */}
          {(service.status === "IN_PROGRESS" ||
            service.status === "COMPLETED" ||
            service.status === "PARTIALLY_COMPLETED") && (
            <ZoneExecutionPanel
              service={service}
              canExecute={canStartService}
              onServiceUpdated={onServiceUpdated}
            />
          )}
        </main>

        {/* Persistent Related items panel (per ADR and UI architecture) */}
        <aside className="hidden w-72 shrink-0 border-l border-[var(--color-border)] bg-[var(--color-canvas)] p-5 md:block overflow-y-auto" aria-label="Elementos relacionados">
          <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
            Contexto relacionado
          </h3>
          <ul className="mt-3 space-y-3 text-xs">
            <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <span className="text-[var(--color-text-secondary)] block font-medium">Zona</span>
              <span className="font-bold text-[var(--color-text)] mt-0.5 block">{service.zoneNames.join(", ")}</span>
            </li>
            <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <span className="text-[var(--color-text-secondary)] block font-medium">Cuadrilla</span>
              <span className="font-bold text-[var(--color-text)] mt-0.5 block">{service.crewName ?? "Sin asignar"}</span>
            </li>
            <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <span className="text-[var(--color-text-secondary)] block font-medium">Seguridad operativa</span>
              <span className="inline-flex items-center gap-1 text-[var(--color-success)] mt-1 font-semibold">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Validación Zod activa
              </span>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
