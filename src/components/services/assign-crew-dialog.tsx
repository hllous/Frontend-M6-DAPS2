"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
  Route,
  Truck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { crewsAdapter, type Crew } from "@/lib/crews";
import {
  checkAssignmentConflicts,
  OVERRIDE_NOTE_MAX,
  OVERRIDE_NOTE_MIN,
  servicesAdapter,
  ServiceRequestError,
  type Service,
} from "@/lib/services";
import { serviceTypesAdapter } from "@/lib/service-types";
import { vehiclesAdapter, type Vehicle } from "@/lib/vehicles";
import { cn } from "@/lib/utils";

interface AssignCrewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
  allServices?: Service[];
  onAssigned: (updatedService: Service) => void;
}

export function AssignCrewDialog({
  open,
  onOpenChange,
  service,
  allServices = [],
  onAssigned,
}: AssignCrewDialogProps) {
  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-[var(--color-border)] bg-[var(--color-surface)] sm:max-w-2xl">
        <AssignCrewForm
          key={service.id}
          service={service}
          allServices={allServices}
          onOpenChange={onOpenChange}
          onAssigned={onAssigned}
        />
      </DialogContent>
    </Dialog>
  );
}

function AssignCrewForm({
  service,
  allServices,
  onOpenChange,
  onAssigned,
}: {
  service: Service;
  allServices: Service[];
  onOpenChange: (open: boolean) => void;
  onAssigned: (updatedService: Service) => void;
}) {
  const formId = useId();

  const [crewId, setCrewId] = useState<string>(() => service.crewId ?? "");
  const [vehicleId, setVehicleId] = useState<string>(() => service.vehicleId ?? "");
  const [overrideNote, setOverrideNote] = useState("");
  // El backend puede ver un solapamiento que la lista cargada en pantalla no muestra: su 409 también pide la justificación.
  const [backendConflict, setBackendConflict] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cuadrillas, vehículos y requiresVehicle salen del backend: sin ellos no se puede confirmar.
  const [resources, setResources] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; crews: Crew[]; vehicles: Vehicle[]; requiresVehicle: boolean }
  >({ status: "loading" });
  const [loadVersion, setLoadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      crewsAdapter.list({ active: true, pageSize: 100 }),
      vehiclesAdapter.list({ active: true, pageSize: 100 }),
      serviceTypesAdapter.get(service.serviceTypeId),
    ])
      .then(([crewsPage, vehiclesPage, type]) => {
        if (active) {
          setResources({
            status: "ready",
            crews: crewsPage.crews,
            vehicles: vehiclesPage.vehicles,
            requiresVehicle: type.requiresVehicle,
          });
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setResources({
            status: "error",
            message: cause instanceof Error ? cause.message : "No se pudieron cargar los datos de la asignación.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [service.serviceTypeId, loadVersion]);

  const ready = resources.status === "ready";
  const requiresVehicle = ready && resources.requiresVehicle;
  const crews = ready ? resources.crews : [];
  const vehicles = ready ? resources.vehicles : [];

  // Compute double-booking conflicts reactively
  const conflicts = useMemo(() => {
    return checkAssignmentConflicts({
      service,
      crewId: crewId || null,
      vehicleId: vehicleId || null,
      allServices,
    });
  }, [service, crewId, vehicleId, allServices]);
  const needsOverrideNote = Boolean(conflicts.crewConflict || conflicts.vehicleConflict || backendConflict);

  if (!service) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!service || !ready) return;

    if (!crewId) {
      setErrorMessage("Debe seleccionar una cuadrilla asignada.");
      return;
    }

    if (requiresVehicle && (!vehicleId || !vehicleId.trim())) {
      setErrorMessage(
        "El tipo de servicio requiere la asignación obligatoria de un vehículo operativo.",
      );
      return;
    }

    if (needsOverrideNote && overrideNote.trim().length < OVERRIDE_NOTE_MIN) {
      setErrorMessage(
        `Hay un solapamiento: justifique la asignación en al menos ${OVERRIDE_NOTE_MIN} caracteres.`,
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const updated = await servicesAdapter.assignCrew(service.id, {
        crewId,
        vehicleId: vehicleId ? vehicleId : null,
        ...(needsOverrideNote && { overrideNote: overrideNote.trim() }),
      });
      onAssigned(updated);
      onOpenChange(false);
    } catch (cause) {
      if (cause instanceof ServiceRequestError && cause.status === 409 && !needsOverrideNote) {
        setBackendConflict(cause.message);
        return;
      }
      const msg =
        cause instanceof Error
          ? cause.message
          : "Ocurrió un error al procesar la asignación de recursos.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedCrew = crews.find((c) => c.id === crewId);
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  return (
    <>
      <DialogHeader className="border-b border-[var(--color-border)] p-6 pb-4 bg-[var(--color-canvas)]">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            <Users className="h-4 w-4 text-[var(--color-action)]" aria-hidden />
            <span>Despacho y asignación operativa</span>
          </div>
          <DialogTitle className="text-xl font-bold text-[var(--color-text)]">
            Asignar cuadrilla y vehículo
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--color-text-secondary)]">
            Asigne la cuadrilla operativa y los recursos vehiculares requeridos para la ejecución territorial del servicio.
          </DialogDescription>
        </DialogHeader>

        {/* Service Context Summary Card */}
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                <span className="font-bold text-[var(--color-text)]">{service.id}</span>
                <span>·</span>
                <span>{service.serviceTypeName}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  {service.mode === "ROUTE" ? (
                    <>
                      <Route className="h-3.5 w-3.5 text-[var(--color-action)]" aria-hidden />
                      Recorrido
                    </>
                  ) : (
                    <>
                      <MapPin className="h-3.5 w-3.5 text-[var(--color-action)]" aria-hidden />
                      Punto
                    </>
                  )}
                </span>
              </div>
              <h3 className="mt-0.5 text-sm font-bold text-[var(--color-text)] line-clamp-1">
                {service.title}
              </h3>
            </div>

            {/* Vehicle Requirement Indicator */}
            <div className="shrink-0">
              {!ready ? null : requiresVehicle ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] px-2.5 py-1 text-xs font-semibold text-[var(--color-warning)]">
                  <Truck className="h-3.5 w-3.5" aria-hidden />
                  Vehículo obligatorio
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                  <Truck className="h-3.5 w-3.5" aria-hidden />
                  Vehículo opcional
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[var(--color-action)]" aria-hidden />
              <span>Fecha: <strong className="text-[var(--color-text)]">{service.scheduledDate}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[var(--color-action)]" aria-hidden />
              <span>Ventana: <strong className="text-[var(--color-text)]">{service.windowFrom ?? "08:00"} – {service.windowTo ?? "12:00"}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[var(--color-action)]" aria-hidden />
              <span>Zonas: <strong className="text-[var(--color-text)]">{service.zoneNames.join(", ")}</strong></span>
            </div>
          </div>
        </div>

        <form id={formId} noValidate onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)] p-3 text-xs text-[var(--color-danger)]" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
              <div className="font-semibold">{errorMessage}</div>
            </div>
          )}

          {resources.status === "loading" && (
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]" role="status">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              <span>Cargando cuadrillas, vehículos y requisitos del tipo de servicio…</span>
            </div>
          )}

          {resources.status === "error" && (
            <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)] p-3 text-xs text-[var(--color-danger)]" role="alert">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                <div className="font-semibold">
                  No se pudieron cargar los datos para asignar: {resources.message}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start text-xs gap-1.5"
                onClick={() => {
                  setResources({ status: "loading" });
                  setLoadVersion((version) => version + 1);
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                Reintentar
              </Button>
            </div>
          )}

          <FieldGroup className="space-y-4">
            {/* Field: Crew */}
            <Field>
              <FieldLabel htmlFor={`${formId}-crew`}>
                Cuadrilla asignada <span className="text-[var(--color-danger)]" aria-hidden>*</span>
              </FieldLabel>
              <select
                id={`${formId}-crew`}
                value={crewId}
                onChange={(e) => {
                  setCrewId(e.target.value);
                  setBackendConflict(null);
                  setErrorMessage(null);
                }}
                disabled={!ready}
                required
                aria-describedby={`${formId}-crew-desc`}
                className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
              >
                <option value="">Seleccione una cuadrilla…</option>
                {crews.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <FieldDescription id={`${formId}-crew-desc`}>
                Equipo municipal o de cooperativa responsable de la ejecución del servicio.
              </FieldDescription>
            </Field>

            {/* Field: Vehicle */}
            <Field>
              <FieldLabel htmlFor={`${formId}-vehicle`}>
                Vehículo operativo{" "}
                {requiresVehicle ? (
                  <span className="text-[var(--color-danger)]" aria-hidden>*</span>
                ) : (
                  <span className="text-[var(--color-text-secondary)] font-normal text-xs">(opcional)</span>
                )}
              </FieldLabel>
              <select
                id={`${formId}-vehicle`}
                value={vehicleId}
                onChange={(e) => {
                  setVehicleId(e.target.value);
                  setBackendConflict(null);
                  setErrorMessage(null);
                }}
                disabled={!ready}
                aria-describedby={`${formId}-vehicle-desc`}
                className={cn(
                  "w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]",
                  requiresVehicle && !vehicleId && "border-[var(--color-warning-line)]",
                )}
              >
                <option value="">
                  {requiresVehicle ? "Seleccione un vehículo requerido…" : "Sin vehículo asignado"}
                </option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate}
                  </option>
                ))}
              </select>
              <FieldDescription id={`${formId}-vehicle-desc`}>
                {requiresVehicle
                  ? "Requerido por la especificación técnica del tipo de servicio (ej. recolección o barrido mecánico)."
                  : "Opcional según los requerimientos operativos de la cuadrilla para este tipo de servicio."}
              </FieldDescription>
            </Field>
          </FieldGroup>

          {/* Double-booking non-authoritative warning banner */}
          {needsOverrideNote && (
            <div
              className="rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/60 p-4 space-y-2 text-xs text-[var(--color-warning)]"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[var(--color-warning)]">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                <span>Aviso de superposición horaria</span>
              </div>

              {conflicts.crewConflict && (
                <p className="leading-relaxed">
                  Aviso de superposición horaria: La cuadrilla{" "}
                  <strong>{selectedCrew?.name ?? conflicts.crewConflict.crewName}</strong> ya tiene asignado el servicio{" "}
                  <strong>{conflicts.crewConflict.id}</strong> (&quot;{conflicts.crewConflict.title}&quot;) en la misma fecha (
                  {conflicts.crewConflict.scheduledDate} {conflicts.crewConflict.windowFrom ?? ""}&ndash;{conflicts.crewConflict.windowTo ?? ""}).
                </p>
              )}

              {backendConflict && !conflicts.crewConflict && !conflicts.vehicleConflict && (
                <p className="leading-relaxed">{backendConflict}</p>
              )}

              {conflicts.vehicleConflict && (
                <p className="leading-relaxed">
                  Aviso de superposición horaria: El vehículo{" "}
                  <strong>{selectedVehicle?.plate ?? conflicts.vehicleConflict.vehiclePlate}</strong> ya está asignado al servicio{" "}
                  <strong>{conflicts.vehicleConflict.id}</strong> (&quot;{conflicts.vehicleConflict.title}&quot;) en la misma fecha (
                  {conflicts.vehicleConflict.scheduledDate} {conflicts.vehicleConflict.windowFrom ?? ""}&ndash;{conflicts.vehicleConflict.windowTo ?? ""}).
                </p>
              )}

              <div className="flex items-center gap-1.5 pt-1 text-[11px] font-medium text-[var(--color-text-secondary)] border-t border-[var(--color-warning-line)]/50">
                <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  Se puede asignar igual, pero hay que justificar por qué: la justificación queda registrada con la asignación.
                </span>
              </div>
            </div>
          )}

          {needsOverrideNote && (
            <Field>
              <FieldLabel htmlFor={`${formId}-override-note`}>
                Justificación del solapamiento <span className="text-[var(--color-danger)]" aria-hidden>*</span>
              </FieldLabel>
              <textarea
                id={`${formId}-override-note`}
                value={overrideNote}
                onChange={(e) => {
                  setOverrideNote(e.target.value);
                  setErrorMessage(null);
                }}
                required
                maxLength={OVERRIDE_NOTE_MAX}
                rows={3}
                aria-describedby={`${formId}-override-note-desc`}
                className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
              />
              <FieldDescription id={`${formId}-override-note-desc`}>
                Entre {OVERRIDE_NOTE_MIN} y {OVERRIDE_NOTE_MAX} caracteres. Ej.: la otra parada termina antes; se coordinó con el jefe de cuadrilla.
              </FieldDescription>
            </Field>
          )}

          <DialogFooter className="border-t border-[var(--color-border)] pt-4 gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={formId}
              variant="default"
              size="sm"
              disabled={isSubmitting || !ready}
              className="text-xs font-semibold gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  <span>Guardando asignación…</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  <span>Confirmar asignación</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
    </>
  );
}
