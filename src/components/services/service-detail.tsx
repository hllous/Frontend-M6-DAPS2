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
  Pause,
  Play,
  PlayCircle,
  Siren,
  Truck,
  Users,
  Wrench,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  REPAIR_DAMAGE_TYPE_LABEL,
  REPAIR_REQUEST_STATUS_LABEL,
  REPAIR_SEVERITY_LABEL,
  type RepairRequest,
} from "@/lib/repair-requests";
import { formatCalendarDay } from "@/lib/argentina-date";
import { checkServiceWindowTiming, type Service } from "@/lib/services";
import type { StreetClosureDependency } from "@/lib/street-closure-requests";
import { StatusBadge } from "./status-badge";
import { ZoneExecutionPanel } from "./zone-execution-panel";
import { InspectionExecutionPanel } from "./inspection-execution-panel";
import { SERVICE_ORIGIN_LABEL, serviceTargetTypeLabel } from "./service-ui-labels";

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
  repairRequests,
  repairRequestsLoading = false,
  repairRequestsError = null,
  canStartService = false,
  isStarting = false,
  startError = null,
  startDraftPending = false,
  isResuming = false,
  resumeError = null,
  resumeDraftPending = false,
  streetClosureDependency = null,
  streetClosureDependencyLoading = false,
  streetClosureDependencyError = null,
  onRejectedClosureReschedule,
  onRejectedClosureCancel,
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
  repairRequests?: RepairRequest[];
  repairRequestsLoading?: boolean;
  repairRequestsError?: string | null;
  canStartService?: boolean;
  isStarting?: boolean;
  startError?: string | null;
  /** A local draft exists (composed while offline) awaiting manual resubmission. */
  startDraftPending?: boolean;
  isResuming?: boolean;
  resumeError?: string | null;
  resumeDraftPending?: boolean;
  streetClosureDependency?: StreetClosureDependency | null;
  streetClosureDependencyLoading?: boolean;
  streetClosureDependencyError?: string | null;
  onRejectedClosureReschedule?: (service: Service) => void;
  onRejectedClosureCancel?: (service: Service) => void;
  backLabel?: string;
}) {
  const windowTiming = checkServiceWindowTiming(service);
  const isEnvironmentalInspectionService = service.origin === "INSPECTION" && service.serviceTypeCategory === "ENVIRONMENTAL_CONTROL";
  // Sólo consulta = quien mira no puede cambiar el estado del servicio. Oficina no lo
  // ejecuta, pero lo reprograma, lo cancela o le asigna cuadrilla.
  const isReadOnly = !canStartService && !onAssignCrew && !onReschedule && !onConfirmReschedule && !onCancelService;

  return (
    <div className="flex h-full flex-col bg-[var(--color-surface)] overflow-hidden" role="region" aria-label={`Detalle completo de ${service.title}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-6 py-3 bg-[var(--color-canvas)]">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-xs font-semibold"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {backLabel}
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-3">
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
                {isStarting ? "Iniciando..." : startDraftPending ? "Reenviar" : "Iniciar servicio"}
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
                {isResuming ? "Reanudando..." : resumeDraftPending ? "Reenviar" : "Reanudar servicio"}
              </span>
            </Button>
          )}
          {onAssignCrew && (service.status === "SCHEDULED" || service.status === "RESCHEDULED") && (
            <Button
              variant={service.status === "RESCHEDULED" ? "outline" : "default"}
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
          {isReadOnly && (
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              Solo consulta
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <section aria-label="Servicio" className="flex-1 overflow-y-auto p-6 min-[761px]:p-8 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              <span>{service.serviceTypeName}</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
              {service.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <StatusBadge status={service.status} />
              <span className="rounded-lg bg-[var(--color-surface-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)]">
                Origen: {SERVICE_ORIGIN_LABEL[service.origin]}
              </span>
            </div>
          </div>

          {service.statusReason && (
            <div className="rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/50 p-4">
              <h3 className="text-xs font-bold text-[var(--color-warning)] uppercase tracking-wide">
                Motivo
              </h3>
              <p className="mt-1 text-sm text-[var(--color-warning)]">
                {service.statusReason}
              </p>
              {service.statusNote && (
                <>
                  <h3 className="mt-3 text-xs font-bold text-[var(--color-warning)] uppercase tracking-wide">
                    Nota de la cuadrilla
                  </h3>
                  <p className="mt-1 text-sm text-[var(--color-warning)]">
                    {service.statusNote}
                  </p>
                </>
              )}
            </div>
          )}

          {streetClosureDependencyLoading && (
            <div
              role="status"
              aria-label="Verificando el corte de calle…"
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4 text-sm text-[var(--color-text-secondary)]"
            >
              Verificando el corte de calle…
            </div>
          )}

          {streetClosureDependencyError && (
            <Alert
              variant="danger"
              role="alert"
              className="p-4 text-sm text-[var(--color-danger)]"
            >
              No se pudo consultar la dependencia de corte de calle: {streetClosureDependencyError}
            </Alert>
          )}

          {streetClosureDependency?.outcome === "blocked" && (
            <Alert
              variant="warning"
              role="status"
              aria-label="Corte de calle pendiente"
              className="p-4"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--color-warning)]">
                <Siren className="h-4 w-4" aria-hidden />
                Corte de calle pendiente de Tránsito
              </div>
            </Alert>
          )}

          {streetClosureDependency?.outcome === "allowed" && (
            <Alert
              variant="success"
              role="status"
              aria-label="Corte de calle aprobado"
              className="p-4 text-sm text-[var(--color-success)]"
            >
              <p className="font-bold">Corte de calle aprobado</p>
            </Alert>
          )}

          {streetClosureDependency?.outcome === "released" && (
            <Alert
              variant="success"
              role="status"
              aria-label="Corte de calle finalizado"
              className="p-4 text-sm text-[var(--color-success)]"
            >
              <p className="font-bold">Corte de calle finalizado</p>
            </Alert>
          )}

          {streetClosureDependency?.outcome === "expired" && (
            <Alert
              variant="warning"
              role="status"
              aria-label="Corte de calle vencido"
              className="p-4"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--color-warning)]">
                <Siren className="h-4 w-4" aria-hidden />
                Corte de calle vencido
              </div>
              <p className="mt-1 text-sm text-[var(--color-warning)]">
                El corte venció sin usarse.
              </p>
            </Alert>
          )}

          {streetClosureDependency?.outcome === "rejected" && (
            <Alert
              variant="danger"
              role="status"
              aria-label="Corte de calle rechazado"
              className="p-4"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--color-danger)]">
                <Siren className="h-4 w-4" aria-hidden />
                Corte de calle rechazado
              </div>
              <p className="mt-1 text-sm text-[var(--color-danger)]">
                Tránsito rechazó el corte. Reprograme o cancele el servicio.
              </p>
              {(onRejectedClosureReschedule || onRejectedClosureCancel) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {onRejectedClosureReschedule && (
                    <Button variant="outline" size="sm" onClick={() => onRejectedClosureReschedule(service)}>
                      Reprogramar
                    </Button>
                  )}
                  {onRejectedClosureCancel && (
                    <Button variant="outline" size="sm" onClick={() => onRejectedClosureCancel(service)}>
                      Cancelar servicio
                    </Button>
                  )}
                </div>
              )}
            </Alert>
          )}

          {service.status === "SCHEDULED" && canStartService && windowTiming.isOutside && (
            <Alert
              variant="warning"
              role="status"
              className="p-4"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-warning)] uppercase tracking-wide">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                Aviso: Inicio fuera de ventana horaria
              </div>
              <p className="mt-1 text-sm text-[var(--color-warning)]">
                {windowTiming.message}
              </p>
            </Alert>
          )}

          {startDraftPending && (
            <Alert
              variant="warning"
              role="status"
              className="p-4"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-warning)] uppercase tracking-wide">
                <CloudOff className="h-4 w-4" aria-hidden />
                Borrador local pendiente
              </div>
              <p className="mt-1 text-sm text-[var(--color-warning)]">
                Sin conexión. Se guardó en este dispositivo; reenvíe cuando vuelva la conexión.
              </p>
            </Alert>
          )}

          {startError && (
            <Alert
              variant="danger"
              role="alert"
              className="p-4"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-danger)] uppercase tracking-wide">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                No se pudo iniciar el servicio.
              </div>
              <p className="mt-1 text-sm text-[var(--color-danger)]">
                {startError}
              </p>
            </Alert>
          )}

          {resumeDraftPending && (
            <Alert
              variant="warning"
              role="status"
              className="p-4"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-warning)] uppercase tracking-wide">
                <CloudOff className="h-4 w-4" aria-hidden />
                Borrador local pendiente
              </div>
              <p className="mt-1 text-sm text-[var(--color-warning)]">
                Sin conexión. Se guardó en este dispositivo; reenvíe cuando vuelva la conexión.
              </p>
            </Alert>
          )}

          {resumeError && (
            <Alert
              variant="danger"
              role="alert"
              className="p-4"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-danger)] uppercase tracking-wide">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                No se pudo reanudar el servicio.
              </div>
              <p className="mt-1 text-sm text-[var(--color-danger)]">
                {resumeError}
              </p>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-[var(--color-border)] p-4 bg-[var(--color-canvas)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                  <Users className="h-4 w-4 text-[var(--color-action)]" aria-hidden />
                  Cuadrilla
                </div>
                {onAssignCrew && (service.status === "SCHEDULED" || service.status === "RESCHEDULED") && (
                  <Button
                    type="button"
                    variant="link"
                    size="xs"
                    onClick={() => onAssignCrew(service)}
                    className="h-auto min-h-0 min-w-0 px-0 py-0 text-[11px]/[14px] font-semibold text-[var(--color-action)] [@media(max-width:760px)]:min-h-0 [@media(max-width:760px)]:min-w-0"
                  >
                    {service.crewId ? "Reasignar" : "Asignar"}
                  </Button>
                )}
              </div>
              <div className="mt-2 text-sm font-bold text-[var(--color-text)]">
                {service.crewName ?? "Sin asignar"}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] p-4 bg-[var(--color-canvas)]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                <Calendar className="h-4 w-4 text-[var(--color-action)]" aria-hidden />
                Programación
              </div>
              <div className="mt-2 text-sm font-bold text-[var(--color-text)] tabular-nums">
                {formatCalendarDay(service.scheduledDate)}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-[var(--color-text-secondary)] tabular-nums">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                Horario: {service.windowFrom ? `${service.windowFrom} – ${service.windowTo ?? ""}` : "sin definir"}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] p-4 bg-[var(--color-canvas)]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                <Truck className="h-4 w-4 text-[var(--color-action)]" aria-hidden />
                Vehículo
              </div>
              <div className="mt-2 text-sm font-bold text-[var(--color-text)]">
                {service.vehiclePlate ?? "Sin vehículo"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] p-5 space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wide">
              Zonas
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div>
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
                  <span className="font-semibold text-[var(--color-text-secondary)]">Recorrido:</span>
                  <p className="mt-1 font-medium text-[var(--color-text)]">{service.routeName}</p>
                </div>
              )}
              {service.targetRef && (
                <div>
                  <span className="font-semibold text-[var(--color-text-secondary)]">Objetivo:</span>
                  <p className="mt-1 font-medium text-[var(--color-text)]">{service.targetRef} ({serviceTargetTypeLabel(service.targetType)})</p>
                </div>
              )}
              {service.ticketId && (
                <div>
                  <span className="font-semibold text-[var(--color-text-secondary)]">Reclamo:</span>
                  <p className="mt-1 font-medium text-[var(--color-text)]">{service.ticketId}</p>
                </div>
              )}
            </div>
          </div>

          {service.notes && (
            <div className="rounded-xl border border-[var(--color-border)] p-4 bg-[var(--color-surface-subtle)]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wide">
                <FileText className="h-4 w-4" aria-hidden />
                Notas
              </div>
              <p className="mt-2 text-sm text-[var(--color-text)]">
                {service.notes}
              </p>
            </div>
          )}

          {repairRequests !== undefined && (
            <section
              aria-labelledby="service-repair-requests-title"
              className="rounded-xl border border-[var(--color-border)] p-5 space-y-4"
            >
              <div>
                <h2 id="service-repair-requests-title" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--color-text)]">
                  <Wrench className="h-4 w-4 text-[var(--color-action)]" aria-hidden />
                  Derivaciones
                </h2>
              </div>

              {repairRequestsLoading ? (
                <p role="status" className="text-sm text-[var(--color-text-secondary)]">Cargando derivaciones…</p>
              ) : repairRequestsError ? (
                <p role="alert" className="text-sm text-[var(--color-danger)]">{repairRequestsError}</p>
              ) : repairRequests.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">Sin derivaciones.</p>
              ) : (
                <ul className="space-y-3" aria-label="Derivaciones">
                  {repairRequests.map((request) => (
                    <li key={request.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-bold text-[var(--color-text)]">{request.id}</span>
                        <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 font-semibold text-[var(--color-text)]">
                          {REPAIR_REQUEST_STATUS_LABEL[request.status]}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-1 text-xs text-[var(--color-text-secondary)] sm:grid-cols-2">
                        <span><strong className="text-[var(--color-text)]">{REPAIR_DAMAGE_TYPE_LABEL[request.damageType]}</strong></span>
                        <span><strong className="text-[var(--color-text)]">{REPAIR_SEVERITY_LABEL[request.severity]}</strong></span>
                        <span><strong className="text-[var(--color-text)]">{request.address}</strong></span>
                        {request.publicSafetyRisk ? <span><strong className="text-[var(--color-text)]">Riesgo</strong></span> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Zone Execution Workflow (Available for IN_PROGRESS and closed services) */}
          {((isEnvironmentalInspectionService && (service.status === "SCHEDULED" || service.status === "RESCHEDULED")) ||
            service.status === "IN_PROGRESS" ||
            service.status === "COMPLETED" ||
            service.status === "PARTIALLY_COMPLETED") && (
            isEnvironmentalInspectionService ? (
              <InspectionExecutionPanel
                service={service}
                canExecute={canStartService && service.status === "IN_PROGRESS"}
                waitingForStart={canStartService && (service.status === "SCHEDULED" || service.status === "RESCHEDULED")}
                onServiceUpdated={onServiceUpdated}
              />
            ) : (
              <ZoneExecutionPanel
                service={service}
                canExecute={canStartService}
                onServiceUpdated={onServiceUpdated}
              />
            )
          )}
        </section>

        {/* Persistent Related items panel (per ADR and UI architecture) */}
        <aside className="hidden w-72 shrink-0 border-l border-[var(--color-border)] bg-[var(--color-canvas)] p-5 min-[761px]:block overflow-y-auto" aria-label="Elementos relacionados">
          <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
            Relacionado
          </h3>
          <ul className="mt-3 space-y-3 text-xs">
            <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <span className="text-[var(--color-text-secondary)] block font-medium">Zona</span>
              <span className="font-bold text-[var(--color-text)] mt-0.5 block">{service.zoneNames.join(", ")}</span>
            </li>
            {service.targetRef ? (
              <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <span className="text-[var(--color-text-secondary)] block font-medium">
                  {service.targetType === "TREE" ? "Árboles" : "Objetivo"}
                </span>
                <span className="font-bold text-[var(--color-text)] mt-0.5 block">{service.targetRef}</span>
              </li>
            ) : null}
            <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <span className="text-[var(--color-text-secondary)] block font-medium">Cuadrilla</span>
              <span className="font-bold text-[var(--color-text)] mt-0.5 block">{service.crewName ?? "Sin asignar"}</span>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
