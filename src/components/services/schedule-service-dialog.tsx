"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { AlertCircle, Calendar, Check, Clock, Info, Loader2, MapPin, Route as RouteIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  ROUTE_CATALOG,
  SERVICE_TYPE_CATALOG,
  servicesAdapter,
  type CreateServiceInput,
  type RouteCatalogItem,
  type Service,
  type ServiceMode,
  type ServiceOrigin,
  type ServiceTypeCatalogItem,
} from "@/lib/services";
import { zoneFixtures } from "@/lib/zones-fixtures";
import { cn } from "@/lib/utils";

interface ScheduleServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (service: Service) => void;
  initialOrigin?: ServiceOrigin;
  initialReferenceId?: string;
}

export function ScheduleServiceDialog({
  open,
  onOpenChange,
  onCreated,
  initialOrigin,
  initialReferenceId,
}: ScheduleServiceDialogProps) {
  const formId = useId();

  // Determine whether this is a linked-create flow
  const isLinked = useMemo(() => {
    return (
      initialOrigin === "TICKET" ||
      initialOrigin === "INSPECTION" ||
      initialOrigin === "WEATHER_ALERT"
    );
  }, [initialOrigin]);

  // Form State
  const [serviceTypeId, setServiceTypeId] = useState<string>(
    () => SERVICE_TYPE_CATALOG[0]?.id ?? "st-waste-route",
  );
  const [genericOrigin, setGenericOrigin] = useState<ServiceOrigin>("MANUAL");

  // Effective origin & reference: locked when linked, user-selected otherwise
  const origin: ServiceOrigin = isLinked && initialOrigin ? initialOrigin : genericOrigin;
  const referenceId: string = isLinked ? (initialReferenceId ?? "") : "";

  // Route mode state
  const [routeId, setRouteId] = useState<string>(
    () => ROUTE_CATALOG[0]?.id ?? "route-1",
  );

  // Point mode state
  const [pointZoneId, setPointZoneId] = useState<string>(
    () => zoneFixtures[0]?.id ?? "zone-1",
  );
  const [targetType, setTargetType] = useState<string>("CONTAINER");
  const [targetRef, setTargetRef] = useState<string>("");

  // Scheduling temporal state
  const [scheduledDate, setScheduledDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [windowStart, setWindowStart] = useState<string>("08:00");
  const [windowEnd, setWindowEnd] = useState<string>("12:00");

  // Notes
  const [notes, setNotes] = useState<string>("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected Service Type determines Mode strictly
  const selectedServiceType = useMemo<ServiceTypeCatalogItem | undefined>(() => {
    return SERVICE_TYPE_CATALOG.find((t) => t.id === serviceTypeId);
  }, [serviceTypeId]);

  const derivedMode: ServiceMode = selectedServiceType?.mode ?? "ROUTE";

  // Selected Route for ROUTE mode
  const selectedRoute = useMemo<RouteCatalogItem | undefined>(() => {
    return ROUTE_CATALOG.find((r) => r.id === routeId);
  }, [routeId]);

  // Reset form when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setErrorMessage(null);
      setIsSubmitting(false);
    }
    onOpenChange(nextOpen);
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    // Build zone snapshot
    const zoneIds =
      derivedMode === "ROUTE"
        ? (selectedRoute?.zoneIds ?? [])
        : [pointZoneId];

    if (zoneIds.length === 0) {
      setErrorMessage("Debe seleccionarse al menos una zona para el servicio.");
      return;
    }

    if (derivedMode === "POINT" && !targetRef.trim()) {
      setErrorMessage("Debe indicar el identificador o dirección del objetivo puntual.");
      return;
    }

    if (origin === "TICKET" && !referenceId.trim()) {
      setErrorMessage("El identificador de reclamo (ticketId) es obligatorio.");
      return;
    }

    if (origin === "INSPECTION" && !referenceId.trim()) {
      setErrorMessage("El identificador de inspección es obligatorio.");
      return;
    }

    if (origin === "WEATHER_ALERT" && !referenceId.trim()) {
      setErrorMessage("El identificador de alerta meteorológica es obligatorio.");
      return;
    }

    const payload: CreateServiceInput = {
      serviceTypeId,
      origin,
      ticketId: origin === "TICKET" ? referenceId.trim() : undefined,
      inspectionId: origin === "INSPECTION" ? referenceId.trim() : undefined,
      weatherAlertId: origin === "WEATHER_ALERT" ? referenceId.trim() : undefined,
      routeId: derivedMode === "ROUTE" ? routeId : undefined,
      zoneIds,
      targetType: derivedMode === "POINT" ? targetType : undefined,
      targetRef: derivedMode === "POINT" ? targetRef.trim() : undefined,
      scheduledDate,
      timeWindow: {
        start: windowStart,
        end: windowEnd,
      },
      notes: notes.trim() ? notes.trim() : undefined,
    };

    setIsSubmitting(true);

    try {
      const createdService = await servicesAdapter.create(payload);
      onCreated(createdService);
      handleOpenChange(false);
    } catch (cause) {
      const msg =
        cause instanceof Error
          ? cause.message
          : "No se pudo programar el servicio. Verifique los datos ingresados.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isLinked ? "Programar servicio vinculado" : "Programar nuevo servicio"}
          </DialogTitle>
          <DialogDescription>
            {isLinked
              ? "Programación vinculada a un evento u origen externo. El origen se preserva sin requerir reingreso."
              : "Defina el tipo de servicio, cobertura territorial y ventana horaria. Nace sin cuadrilla ni vehículo asignados."}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
            <span>{errorMessage}</span>
          </div>
        )}

        <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {/* Linked Origin Banner */}
          {isLinked ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text)]">
                <Info className="h-4 w-4 text-[var(--color-action)] shrink-0" aria-hidden />
                <span>Origen vinculado preservado</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[var(--color-text-secondary)]">Origen:</span>
                  <p className="font-bold text-[var(--color-text)] mt-0.5">
                    {origin === "TICKET" && "Reclamo ciudadano (TICKET)"}
                    {origin === "INSPECTION" && "Inspección ambiental (INSPECTION)"}
                    {origin === "WEATHER_ALERT" && "Alerta meteorológica (WEATHER_ALERT)"}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--color-text-secondary)]">ID Referencia:</span>
                  <p className="font-mono font-bold text-[var(--color-text)] mt-0.5">
                    {referenceId || "(Sin ID)"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Generic Origin Selector */
            <Field>
              <FieldLabel htmlFor="service-origin">Origen del servicio *</FieldLabel>
              <select
                id="service-origin"
                value={genericOrigin}
                onChange={(e) => setGenericOrigin(e.target.value as ServiceOrigin)}
                className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
              >
                <option value="MANUAL">Manual (operación a demanda)</option>
                <option value="PLANNED">Planificado (programa regular de servicio)</option>
              </select>
              <FieldDescription>
                Los servicios planificados corresponden al cronograma habitual; los manuales a intervenciones no rutinarias.
              </FieldDescription>
            </Field>
          )}

          {/* Service Type Selection */}
          <Field>
            <FieldLabel htmlFor="service-type">Tipo de servicio *</FieldLabel>
            <select
              id="service-type"
              value={serviceTypeId}
              onChange={(e) => setServiceTypeId(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs font-medium text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
            >
              {SERVICE_TYPE_CATALOG.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.mode === "ROUTE" ? "Recorrido" : "Punto"})
                </option>
              ))}
            </select>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-secondary)]">
                Modo determinado por el catálogo:
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  derivedMode === "ROUTE"
                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                    : "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20",
                )}
              >
                {derivedMode === "ROUTE" ? (
                  <>
                    <RouteIcon className="h-3 w-3" aria-hidden />
                    <span>Recorrido (ROUTE)</span>
                  </>
                ) : (
                  <>
                    <MapPin className="h-3 w-3" aria-hidden />
                    <span>Punto fijo (POINT)</span>
                  </>
                )}
              </span>
            </div>
            <FieldDescription>
              El modo de ejecución no es configurable por el operador; se hereda del tipo de servicio seleccionado.
            </FieldDescription>
          </Field>

          {/* Scope / Destination: ROUTE vs POINT */}
          {derivedMode === "ROUTE" ? (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 flex flex-col gap-2.5">
              <Field>
                <FieldLabel htmlFor="service-route">Recorrido asignado *</FieldLabel>
                <select
                  id="service-route"
                  value={routeId}
                  onChange={(e) => setRouteId(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
                >
                  {ROUTE_CATALOG.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </Field>

              {selectedRoute && (
                <div className="text-xs">
                  <span className="text-[var(--color-text-secondary)] font-medium">
                    Zonas cubiertas (snapshot inmutable):
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {selectedRoute.zoneNames.map((zn, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text)]"
                      >
                        <Check className="h-3 w-3 text-blue-600 dark:text-blue-400" aria-hidden />
                        {zn}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3.5 flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="point-zone">Zona operativa *</FieldLabel>
                  <select
                    id="point-zone"
                    value={pointZoneId}
                    onChange={(e) => setPointZoneId(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
                  >
                    {zoneFixtures
                      .filter((z) => z.active)
                      .map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name} ({z.code})
                        </option>
                      ))}
                  </select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="target-type">Tipo de objetivo</FieldLabel>
                  <select
                    id="target-type"
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
                  >
                    <option value="CONTAINER">Contenedor</option>
                    <option value="TREE">Árbol urbano</option>
                    <option value="GREEN_POINT">Punto verde</option>
                    <option value="LOCATION">Ubicación / Dirección</option>
                  </select>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="target-ref">Identificador de objetivo / Dirección *</FieldLabel>
                <input
                  id="target-ref"
                  type="text"
                  value={targetRef}
                  onChange={(e) => setTargetRef(e.target.value)}
                  placeholder={
                    targetType === "CONTAINER"
                      ? "p. ej. CT-0442"
                      : targetType === "TREE"
                      ? "p. ej. TR-0884"
                      : "p. ej. Av. Rivadavia 2200"
                  }
                  required
                  className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
                />
                <FieldDescription>
                  Identificador del elemento en inventario o dirección geográfica específica del trabajo puntual.
                </FieldDescription>
              </Field>
            </div>
          )}

          {/* Temporal scheduling: Date & Time window */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field className="sm:col-span-1">
              <FieldLabel htmlFor="scheduled-date">Fecha programada *</FieldLabel>
              <input
                id="scheduled-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
              />
            </Field>

            <Field className="sm:col-span-1">
              <FieldLabel htmlFor="window-start">Desde *</FieldLabel>
              <input
                id="window-start"
                type="time"
                value={windowStart}
                onChange={(e) => setWindowStart(e.target.value)}
                required
                className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
              />
            </Field>

            <Field className="sm:col-span-1">
              <FieldLabel htmlFor="window-end">Hasta *</FieldLabel>
              <input
                id="window-end"
                type="time"
                value={windowEnd}
                onChange={(e) => setWindowEnd(e.target.value)}
                required
                className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
              />
            </Field>
          </div>

          {/* Notes */}
          <Field>
            <FieldLabel htmlFor="service-notes">Notas e instrucciones operativas (opcional)</FieldLabel>
            <textarea
              id="service-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones especiales para la cuadrilla o restricciones de acceso…"
              className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] resize-none"
            />
          </Field>

          {/* Unassigned Guarantee notice */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3 text-[11px] text-[var(--color-text-secondary)] flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" aria-hidden />
            <span>
              El servicio se creará en estado <strong>PROGRAMADO</strong> sin cuadrilla ni vehículo asignados. La asignación operativa se realiza posteriormente en el despacho.
            </span>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={isSubmitting}
            className="font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                <span>Programando…</span>
              </>
            ) : (
              <span>Programar servicio</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
