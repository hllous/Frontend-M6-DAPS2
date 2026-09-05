"use client";

import { useId, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Info,
  Loader2,
  MapPin,
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
import {
  checkAssignmentConflicts,
  CREW_CATALOG,
  SERVICE_TYPE_CATALOG,
  servicesAdapter,
  type Service,
  VEHICLE_CATALOG,
} from "@/lib/services";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Derive service type requirements
  const serviceType = useMemo(() => {
    return SERVICE_TYPE_CATALOG.find((t) => t.id === service.serviceTypeId) ?? null;
  }, [service]);

  const requiresVehicle = Boolean(serviceType?.requiresVehicle);

  // Compute double-booking conflicts reactively
  const conflicts = useMemo(() => {
    return checkAssignmentConflicts({
      service,
      crewId: crewId || null,
      vehicleId: vehicleId || null,
      allServices,
    });
  }, [service, crewId, vehicleId, allServices]);

  if (!service) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!service) return;

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

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const updated = await servicesAdapter.assignCrew(service.id, {
        crewId,
        vehicleId: vehicleId ? vehicleId : null,
      });
      onAssigned(updated);
      onOpenChange(false);
    } catch (cause) {
      const msg =
        cause instanceof Error
          ? cause.message
          : "Ocurrió un error al procesar la asignación de recursos.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedCrew = CREW_CATALOG.find((c) => c.id === crewId);
  const selectedVehicle = VEHICLE_CATALOG.find((v) => v.id === vehicleId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-[var(--color-border)] bg-[var(--color-surface)] sm:max-w-2xl">
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
              {requiresVehicle ? (
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

        <form id={formId} onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)] p-3 text-xs text-[var(--color-danger)]" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
              <div className="font-semibold">{errorMessage}</div>
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
                  setErrorMessage(null);
                }}
                required
                aria-describedby={`${formId}-crew-desc`}
                className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
              >
                <option value="">Seleccione una cuadrilla…</option>
                {CREW_CATALOG.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.defaultShift})
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
                  setErrorMessage(null);
                }}
                aria-describedby={`${formId}-vehicle-desc`}
                className={cn(
                  "w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]",
                  requiresVehicle && !vehicleId && "border-[var(--color-warning-line)]",
                )}
              >
                <option value="">
                  {requiresVehicle ? "Seleccione un vehículo requerido…" : "Sin vehículo asignado"}
                </option>
                {VEHICLE_CATALOG.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} — {v.model ?? v.vehicleType}
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
          {(conflicts.crewConflict || conflicts.vehicleConflict) && (
            <div
              className="rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/60 p-4 space-y-2 text-xs text-[var(--color-warning)]"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[var(--color-warning)]">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                <span>Aviso de superposición horaria (no bloqueante)</span>
              </div>

              {conflicts.crewConflict && (
                <p className="leading-relaxed">
                  Aviso de superposición horaria: La cuadrilla{" "}
                  <strong>{selectedCrew?.name ?? conflicts.crewConflict.crewName}</strong> ya tiene asignado el servicio{" "}
                  <strong>{conflicts.crewConflict.id}</strong> (&quot;{conflicts.crewConflict.title}&quot;) en la misma fecha (
                  {conflicts.crewConflict.scheduledDate} {conflicts.crewConflict.windowFrom ?? ""}&ndash;{conflicts.crewConflict.windowTo ?? ""}).
                </p>
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
                  Aviso no bloqueante: la normativa operativa permite confirmar la asignación sin restricción técnica. No se requiere justificación ni nota de anulación.
                </span>
              </div>
            </div>
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
              disabled={isSubmitting}
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
      </DialogContent>
    </Dialog>
  );
}
