"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { OperationalScenario } from "@/lib/scenarios";
import {
  checkServiceWindowTiming,
  ServiceRequestError,
  servicesAdapter,
  type Service,
} from "@/lib/services";
import { filterServiceFixtures } from "@/lib/services-fixtures";
import styles from "@/components/shell/app-shell.module.css";
import { ServiceDetail } from "./service-detail";
import { StatusBadge } from "./status-badge";

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

  const handleStartService = async (service: Service) => {
    setStartingId(service.id);
    setStartErrors((prev) => ({ ...prev, [service.id]: "" }));
    try {
      const updated = await servicesAdapter.start(service.id);
      setServices((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s)),
      );
    } catch (cause) {
      const msg =
        cause instanceof ServiceRequestError
          ? cause.message
          : "No se pudo registrar el inicio del servicio.";
      setStartErrors((prev) => ({ ...prev, [service.id]: msg }));
    } finally {
      setStartingId(null);
    }
  };

  const selectedService = selectedDetailId
    ? services.find((s) => s.id === selectedDetailId) ?? null
    : null;

  if (selectedService) {
    return (
      <ServiceDetail
        service={selectedService}
        onBack={() => setSelectedDetailId(null)}
        onStartService={mayExecuteService ? handleStartService : undefined}
        canStartService={mayExecuteService}
        isStarting={startingId === selectedService.id}
        startError={startErrors[selectedService.id] ?? null}
        backLabel="Volver a Servicios asignados"
      />
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
                      <span>{startingId === service.id ? "Iniciando..." : "Iniciar servicio"}</span>
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
    </section>
  );
}
