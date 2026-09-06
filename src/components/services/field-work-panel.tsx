"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CloudOff, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CreateRepairRequestDialog } from "./create-repair-request-dialog";
import type { OperationalScenario } from "@/lib/scenarios";
import { repairRequestsAdapter, type RepairRequest } from "@/lib/repair-requests";
import {
  checkServiceWindowTiming,
  servicesAdapter,
  type Service,
} from "@/lib/services";
import { filterServiceFixtures } from "@/lib/services-fixtures";
import {
  getFieldDraft,
  clearFieldDraft,
  retryFieldDraft,
  submitFieldAction,
  type FieldDraftActionType,
  type FieldDraftServiceSnapshot,
} from "@/lib/field-drafts";
import styles from "@/components/shell/app-shell.module.css";
import { DraftConflictDialog } from "./draft-conflict-view";
import { ServiceDetail } from "./service-detail";
import { StatusBadge } from "./status-badge";
import { SuspendServiceDialog } from "./suspend-service-dialog";

export function FieldWorkPanel({
  scenario,
}: {
  scenario: OperationalScenario;
}) {
  const crewId = scenario.actor.crewId;
  const mayExecuteService = scenario.capabilities.includes("service:execute");

  // Synchronous initialization with fixture snapshot so zero-CLS and instant test assertions work
  const [services, setServices] = useState<Service[]>(() =>
    crewId ? filterServiceFixtures({ crewId }) : [],
  );
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startErrors, setStartErrors] = useState<Record<string, string>>({});
  const [suspendingServiceId, setSuspendingServiceId] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [resumeErrors, setResumeErrors] = useState<Record<string, string>>({});
  const [repairRequestServiceId, setRepairRequestServiceId] = useState<string | null>(null);
  const [repairRequests, setRepairRequests] = useState<Record<string, RepairRequest[]>>({});
  const [repairRequestsErrors, setRepairRequestsErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState<{
    serviceId: string;
    actionType: Extract<FieldDraftActionType, "start" | "resume">;
    current: Service;
    composedAgainst: FieldDraftServiceSnapshot;
  } | null>(null);

  useEffect(() => {
    let isCurrent = true;
    async function load() {
      if (!crewId) return;
      try {
        const page = await servicesAdapter.list({ crewId, pageSize: 50 });
        if (isCurrent) setServices(page.services);
      } catch {
        // Retain existing services if refresh fails
      }
    }
    void load();
    return () => {
      isCurrent = false;
    };
  }, [crewId]);

  async function runFieldAction({
    service,
    actionType,
    submit,
    onError,
  }: {
    service: Service;
    actionType: Extract<FieldDraftActionType, "start" | "resume">;
    submit: () => Promise<Service>;
    onError: (message: string) => void;
  }) {
    const existingDraft = getFieldDraft<null>(service.id, actionType);
    const outcome = existingDraft
      ? await retryFieldDraft({ draft: existingDraft, submit })
      : await submitFieldAction({ service, actionType, payload: null, submit });

    if (outcome.kind === "success") {
      setServices((prev) => prev.map((s) => (s.id === outcome.result.id ? outcome.result : s)));
    } else if (outcome.kind === "conflict") {
      setConflict({
        serviceId: service.id,
        actionType,
        current: outcome.current,
        composedAgainst: outcome.composedAgainst,
      });
    } else if (outcome.kind === "error") {
      onError(outcome.message);
    }
    // "draft-saved" / "still-offline": no error surfaced — the pending-draft
    // indicator (read from storage on the next render) takes over instead.
  }

  const handleStartService = async (service: Service) => {
    setStartingId(service.id);
    setStartErrors((prev) => ({ ...prev, [service.id]: "" }));
    await runFieldAction({
      service,
      actionType: "start",
      submit: () => servicesAdapter.start(service.id),
      onError: (msg) => setStartErrors((prev) => ({ ...prev, [service.id]: msg })),
    });
    setStartingId(null);
  };

  const handleResumeService = async (service: Service) => {
    setResumingId(service.id);
    setResumeErrors((prev) => ({ ...prev, [service.id]: "" }));
    await runFieldAction({
      service,
      actionType: "resume",
      submit: () => servicesAdapter.resume(service.id),
      onError: (msg) => setResumeErrors((prev) => ({ ...prev, [service.id]: msg })),
    });
    setResumingId(null);
  };

  const handlePreserveConflict = () => {
    setConflict(null);
  };

  const handleDiscardConflict = () => {
    if (conflict) {
      clearFieldDraft(conflict.serviceId, conflict.actionType);
    }
    setConflict(null);
  };

  const handleServiceUpdated = (updated: Service) => {
    setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleServiceSuspended = (updated: Service) => {
    setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setSuspendingServiceId(null);
  };

  const selectedService = selectedDetailId
    ? services.find((s) => s.id === selectedDetailId) ?? null
    : null;

  useEffect(() => {
    if (!selectedService || !crewId || selectedService.crewId !== crewId) return;

    let isCurrent = true;
    void repairRequestsAdapter.list({ detectedInId: selectedService.id, pageSize: 50 })
      .then((page) => {
        if (isCurrent) setRepairRequests((current) => ({ ...current, [selectedService.id]: page.repairRequests }));
      })
      .catch(() => {
        if (isCurrent) setRepairRequestsErrors((current) => ({ ...current, [selectedService.id]: "No se pudieron cargar las derivaciones de este Servicio." }));
      });

    return () => {
      isCurrent = false;
    };
  }, [crewId, selectedService]);

  const suspendingService = suspendingServiceId
    ? services.find((s) => s.id === suspendingServiceId) ?? null
    : null;

  const repairRequestService = repairRequestServiceId
    ? services.find((s) => s.id === repairRequestServiceId) ?? null
    : null;
  const canCreateRepairRequest = Boolean(
    selectedService &&
      scenario.actor.kind === "FIELD" &&
      scenario.actor.crewId &&
      selectedService.crewId === scenario.actor.crewId,
  );

  if (selectedService) {
    return (
      <>
        <ServiceDetail
          service={selectedService}
          onBack={() => setSelectedDetailId(null)}
          onStartService={mayExecuteService ? handleStartService : undefined}
          onSuspendService={mayExecuteService ? (s) => setSuspendingServiceId(s.id) : undefined}
          onResumeService={mayExecuteService ? handleResumeService : undefined}
          onCreateRepairRequest={canCreateRepairRequest ? (service) => setRepairRequestServiceId(service.id) : undefined}
          onServiceUpdated={handleServiceUpdated}
          repairRequests={repairRequests[selectedService.id] ?? []}
          repairRequestsLoading={!Object.prototype.hasOwnProperty.call(repairRequests, selectedService.id) && !repairRequestsErrors[selectedService.id]}
          repairRequestsError={repairRequestsErrors[selectedService.id] ?? null}
          canStartService={mayExecuteService}
          isStarting={startingId === selectedService.id}
          startError={startErrors[selectedService.id] ?? null}
          startDraftPending={Boolean(getFieldDraft(selectedService.id, "start"))}
          isResuming={resumingId === selectedService.id}
          resumeError={resumeErrors[selectedService.id] ?? null}
          resumeDraftPending={Boolean(getFieldDraft(selectedService.id, "resume"))}
          backLabel="Volver a Servicios asignados"
        />
        {mayExecuteService && (
          <SuspendServiceDialog
            open={Boolean(suspendingService)}
            onOpenChange={(open) => {
              if (!open) setSuspendingServiceId(null);
            }}
            service={suspendingService}
            onSuspended={handleServiceSuspended}
          />
        )}
        {canCreateRepairRequest && repairRequestService && (
          <CreateRepairRequestDialog
            open={repairRequestServiceId === repairRequestService.id}
            service={repairRequestService}
            onOpenChange={(open) => {
              if (!open) setRepairRequestServiceId(null);
            }}
            onCreated={(request) => {
              setRepairRequests((current) => ({
                ...current,
                [request.detectedInId]: [
                  request,
                  ...(current[request.detectedInId] ?? []).filter((item) => item.id !== request.id),
                ],
              }));
            }}
          />
        )}
        {mayExecuteService && (
          <DraftConflictDialog
            open={Boolean(conflict)}
            onOpenChange={(open) => {
              if (!open) setConflict(null);
            }}
            serviceId={conflict?.serviceId ?? ""}
            actionLabel={conflict?.actionType === "resume" ? "reanudación" : "inicio"}
            composedAgainst={conflict?.composedAgainst ?? null}
            current={conflict?.current ?? null}
            onPreserve={handlePreserveConflict}
            onDiscard={handleDiscardConflict}
          />
        )}
      </>
    );
  }

  return (
    <section aria-labelledby="work-title" className={styles.workPanel}>
      <div className={styles.pageHeading}>
        <p>Turno en curso</p>
        <h1 id="work-title">Servicios asignados</h1>
        <span>
          {scenario.work.summary}
          {scenario.actor.crewName ? ` · ${scenario.actor.crewName}` : ""}
        </span>
      </div>

      {services.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center text-sm text-[var(--color-text-secondary)]">
          No hay servicios asignados para su cuadrilla en este turno.
        </div>
      ) : (
        <ol className={styles.workList}>
          {services.map((service, index) => {
            const windowTiming = checkServiceWindowTiming(service);
            const isOutside =
              service.status === "SCHEDULED" && windowTiming.isOutside;
            const error = startErrors[service.id];
            const draftPending = Boolean(getFieldDraft(service.id, "start"));

            return (
              <li
                key={service.id}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-1 flex-col gap-2 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className={styles.workIndex}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[var(--color-text)]">
                          {service.title}
                        </span>
                        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                          {service.id}
                        </span>
                        <StatusBadge status={service.status} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                        <span>
                          {service.mode === "ROUTE" ? "Recorrido" : "Punto"} · {service.serviceTypeName}
                        </span>
                        <span>·</span>
                        <span className="tabular-nums">
                          {service.scheduledDate} ({service.windowFrom ?? "—"} – {service.windowTo ?? "—"})
                        </span>
                        <span>·</span>
                        <span>
                          {service.vehiclePlate
                            ? `Vehículo: ${service.vehiclePlate}`
                            : "Sin vehículo"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isOutside && (
                    <div
                      role="status"
                      className="ml-8 flex items-center gap-1.5 rounded-lg border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/40 px-2.5 py-1 text-xs font-medium text-[var(--color-warning)]"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>Aviso: Inicio fuera de ventana horaria</span>
                    </div>
                  )}

                  {draftPending && (
                    <div
                      role="status"
                      className="ml-8 flex items-center gap-1.5 rounded-lg border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/40 px-2.5 py-1 text-xs font-medium text-[var(--color-warning)]"
                    >
                      <CloudOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>Borrador local pendiente de envío (sin conexión)</span>
                    </div>
                  )}

                  {error && (
                    <div
                      role="alert"
                      className="ml-8 flex items-center gap-1.5 rounded-lg border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)]/40 px-2.5 py-1 text-xs font-semibold text-[var(--color-danger)]"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>{error}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDetailId(service.id)}
                    className="text-xs font-semibold"
                  >
                    Ver detalle
                  </Button>

                  {mayExecuteService && service.status === "SCHEDULED" ? (
                    <Button
                      size="sm"
                      onClick={() => handleStartService(service)}
                      disabled={startingId === service.id}
                      className="gap-1.5 text-xs font-semibold"
                    >
                      <Play className="h-3.5 w-3.5" data-icon="inline-start" aria-hidden />
                      <span>
                        {startingId === service.id
                          ? "Iniciando..."
                          : draftPending
                          ? "Reintentar envío"
                          : "Iniciar servicio"}
                      </span>
                    </Button>
                  ) : !mayExecuteService ? (
                    <span className={styles.workState}>Solo consulta</span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {!mayExecuteService && (
        <p className={styles.permissionNote}>
          La persona responsable de la cuadrilla registra los cambios de estado del servicio.
        </p>
      )}

      {mayExecuteService && (
        <DraftConflictDialog
          open={Boolean(conflict)}
          onOpenChange={(open) => {
            if (!open) setConflict(null);
          }}
          serviceId={conflict?.serviceId ?? ""}
          actionLabel={conflict?.actionType === "resume" ? "reanudación" : "inicio"}
          composedAgainst={conflict?.composedAgainst ?? null}
          current={conflict?.current ?? null}
          onPreserve={handlePreserveConflict}
          onDiscard={handleDiscardConflict}
        />
      )}
    </section>
  );
}
