"use client";
import { errorMessage as getErrorMessage } from "@/lib/error-message";

import { useEffect, useId, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Info,
  MapPin,
  RefreshCw,
  Route,
  Truck,
  Users,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { formatArgentinaCalendarDate } from "@/lib/argentina-date";
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

/** Valor del ítem que borra el vehículo elegido: el Select no tiene opción vacía. */
const NO_VEHICLE = "__none__";

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
      <DialogContent className="max-w-2xl sm:max-w-2xl">
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
  const [fieldErrors, setFieldErrors] = useState<{ crew?: string; vehicle?: string; overrideNote?: string }>({});

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
            message: getErrorMessage(cause, "No se pudieron cargar los datos de la asignación."),
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
      setErrorMessage(null);
      setFieldErrors({ crew: "Debe seleccionar una cuadrilla asignada." });
      return;
    }

    if (requiresVehicle && (!vehicleId || !vehicleId.trim())) {
      setErrorMessage(null);
      setFieldErrors({ vehicle: "El tipo de servicio requiere la asignación obligatoria de un vehículo operativo." });
      return;
    }

    if (needsOverrideNote && overrideNote.trim().length < OVERRIDE_NOTE_MIN) {
      setErrorMessage(null);
      setFieldErrors({ overrideNote: `Hay un solapamiento: justifique la asignación en al menos ${OVERRIDE_NOTE_MIN} caracteres.` });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const updated = await servicesAdapter.assignCrew(service.id, {
        crewId,
        vehicleId: vehicleId ? vehicleId : null,
        ...(needsOverrideNote && { overrideNote: overrideNote.trim() }),
      });
      onAssigned(updated);
      onOpenChange(false);
    } catch (cause) {
      if (cause instanceof ServiceRequestError && cause.status === 409) {
        const hasAdvisoryOverlap = Boolean(conflicts.crewConflict || conflicts.vehicleConflict);
        if (hasAdvisoryOverlap) {
          setBackendConflict(cause.message);
        } else {
          setBackendConflict(null);
          setErrorMessage(
            "El servicio cambió desde que abrió esta ventana. Actualice la lista e intente de nuevo.",
          );
        }
        return;
      }
      const msg =
        getErrorMessage(cause, "Ocurrió un error al procesar la asignación de recursos.");
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedCrew = crews.find((c) => c.id === crewId);
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  // Mientras cargan las listas, la cuadrilla y el vehículo ya asignados se muestran por nombre y patente, no por id.
  const crewItems = {
    ...(service.crewId && service.crewName ? { [service.crewId]: service.crewName } : {}),
    ...Object.fromEntries(crews.map((c) => [c.id, c.name])),
  };
  const vehicleItems = {
    [NO_VEHICLE]: "Sin vehículo asignado",
    ...(service.vehicleId && service.vehiclePlate ? { [service.vehicleId]: service.vehiclePlate } : {}),
    ...Object.fromEntries(vehicles.map((v) => [v.id, v.plate])),
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Users className="size-4 text-primary" aria-hidden />
          <span>Despacho y asignación operativa</span>
        </div>
        <DialogTitle>Asignar cuadrilla y vehículo</DialogTitle>
        <DialogDescription>
          Asigne la cuadrilla operativa y los recursos vehiculares requeridos para la ejecución territorial del servicio.
        </DialogDescription>
      </DialogHeader>

      <div className="-mx-1 flex min-h-0 flex-col gap-4 overflow-y-auto px-1 py-2">
        <Item variant="muted">
          <ItemContent>
            <ItemTitle className="flex-wrap">
              {service.title}
              <Badge variant="neutral">
                {service.mode === "ROUTE" ? (
                  <>
                    <Route data-icon="inline-start" aria-hidden />
                    Recorrido
                  </>
                ) : (
                  <>
                    <MapPin data-icon="inline-start" aria-hidden />
                    Punto
                  </>
                )}
              </Badge>
              {ready && (
                <Badge variant={requiresVehicle ? "warning" : "neutral"}>
                  <Truck data-icon="inline-start" aria-hidden />
                  {requiresVehicle ? "Vehículo obligatorio" : "Vehículo opcional"}
                </Badge>
              )}
            </ItemTitle>
            <ItemDescription>{service.serviceTypeName}</ItemDescription>
            <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="size-4" aria-hidden />
                <dt>Fecha:</dt>
                <dd className="font-semibold text-foreground">{formatArgentinaCalendarDate(service.scheduledDate)}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden />
                <dt>Ventana:</dt>
                <dd className="font-semibold text-foreground">{service.windowFrom ?? "08:00"} – {service.windowTo ?? "12:00"}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden />
                <dt>Zonas:</dt>
                <dd className="font-semibold text-foreground">{service.zoneNames.join(", ")}</dd>
              </div>
            </dl>
          </ItemContent>
        </Item>

        {errorMessage && (
          <Alert variant="danger">
            <AlertCircle aria-hidden />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {resources.status === "loading" && (
          <Alert variant="info" role="status">
            <Spinner aria-hidden="true" />
            <AlertDescription>Cargando cuadrillas, vehículos y requisitos del tipo de servicio…</AlertDescription>
          </Alert>
        )}

        {resources.status === "error" && (
          <Alert variant="danger">
            <AlertCircle aria-hidden />
            <AlertDescription>
              <p>No se pudieron cargar los datos para asignar: {resources.message}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-2 self-start"
                onClick={() => {
                  setResources({ status: "loading" });
                  setLoadVersion((version) => version + 1);
                }}
              >
                <RefreshCw data-icon="inline-start" aria-hidden />
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={Boolean(fieldErrors.crew) || undefined}>
              <FieldLabel htmlFor={`${formId}-crew`}>
                Cuadrilla asignada <span aria-hidden>*</span>
              </FieldLabel>
              <Select
                value={crewId || null}
                items={crewItems}
                disabled={!ready}
                onValueChange={(value) => {
                  setCrewId(String(value));
                  setBackendConflict(null);
                  setErrorMessage(null);
                  setFieldErrors((prev) => ({ ...prev, crew: undefined }));
                }}
              >
                <SelectTrigger
                  id={`${formId}-crew`}
                  aria-required="true"
                  aria-invalid={Boolean(fieldErrors.crew) || undefined}
                  aria-describedby={fieldErrors.crew ? `${formId}-crew-desc ${formId}-crew-error` : `${formId}-crew-desc`}
                >
                  <SelectValue placeholder="Seleccione una cuadrilla…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {crews.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription id={`${formId}-crew-desc`}>
                Equipo municipal o de cooperativa responsable de la ejecución del servicio.
              </FieldDescription>
              {fieldErrors.crew && <FieldError id={`${formId}-crew-error`}>{fieldErrors.crew}</FieldError>}
            </Field>

            <Field data-invalid={Boolean(fieldErrors.vehicle) || undefined}>
              <FieldLabel htmlFor={`${formId}-vehicle`}>
                Vehículo operativo{" "}
                {requiresVehicle ? (
                  <span aria-hidden>*</span>
                ) : (
                  <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                )}
              </FieldLabel>
              <Select
                value={vehicleId || null}
                items={vehicleItems}
                disabled={!ready}
                onValueChange={(value) => {
                  setVehicleId(value === NO_VEHICLE ? "" : String(value));
                  setBackendConflict(null);
                  setErrorMessage(null);
                  setFieldErrors((prev) => ({ ...prev, vehicle: undefined }));
                }}
              >
                <SelectTrigger
                  id={`${formId}-vehicle`}
                  aria-required={requiresVehicle || undefined}
                  aria-invalid={Boolean(fieldErrors.vehicle) || undefined}
                  aria-describedby={fieldErrors.vehicle ? `${formId}-vehicle-desc ${formId}-vehicle-error` : `${formId}-vehicle-desc`}
                >
                  <SelectValue placeholder={requiresVehicle ? "Seleccione un vehículo requerido…" : "Sin vehículo asignado"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={NO_VEHICLE}>{vehicleItems[NO_VEHICLE]}</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription id={`${formId}-vehicle-desc`}>
                {requiresVehicle
                  ? "Requerido por la especificación técnica del tipo de servicio (ej. recolección o barrido mecánico)."
                  : "Opcional según los requerimientos operativos de la cuadrilla para este tipo de servicio."}
              </FieldDescription>
              {fieldErrors.vehicle && <FieldError id={`${formId}-vehicle-error`}>{fieldErrors.vehicle}</FieldError>}
            </Field>
          </FieldGroup>

          {needsOverrideNote && (
            <Alert variant="warning" role="status">
              <AlertTriangle aria-hidden />
              <AlertTitle className="font-semibold uppercase tracking-wider">Aviso de superposición horaria</AlertTitle>
              <AlertDescription className="flex flex-col gap-2">
                {conflicts.crewConflict && (
                  <p>
                    La cuadrilla{" "}
                    <strong>{selectedCrew?.name ?? conflicts.crewConflict.crewName}</strong> ya tiene asignado el servicio{" "}
                    <strong>{conflicts.crewConflict.id}</strong> (&quot;{conflicts.crewConflict.title}&quot;) en la misma fecha (
                    {formatArgentinaCalendarDate(conflicts.crewConflict.scheduledDate)} {conflicts.crewConflict.windowFrom ?? ""}&ndash;{conflicts.crewConflict.windowTo ?? ""}).
                  </p>
                )}

                {backendConflict && !conflicts.crewConflict && !conflicts.vehicleConflict && <p>{backendConflict}</p>}

                {conflicts.vehicleConflict && (
                  <p>
                    El vehículo{" "}
                    <strong>{selectedVehicle?.plate ?? conflicts.vehicleConflict.vehiclePlate}</strong> ya está asignado al servicio{" "}
                    <strong>{conflicts.vehicleConflict.id}</strong> (&quot;{conflicts.vehicleConflict.title}&quot;) en la misma fecha (
                    {formatArgentinaCalendarDate(conflicts.vehicleConflict.scheduledDate)} {conflicts.vehicleConflict.windowFrom ?? ""}&ndash;{conflicts.vehicleConflict.windowTo ?? ""}).
                  </p>
                )}

                <p className="flex items-center gap-1.5 border-t border-[var(--color-warning-line)] pt-2 text-xs font-medium">
                  <Info className="size-3.5 shrink-0" aria-hidden />
                  Se puede asignar igual, pero hay que justificar por qué: la justificación queda registrada con la asignación.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {needsOverrideNote && (
            <Field data-invalid={Boolean(fieldErrors.overrideNote) || undefined}>
              <FieldLabel htmlFor={`${formId}-override-note`}>
                Justificación del solapamiento <span aria-hidden>*</span>
              </FieldLabel>
              <Textarea
                id={`${formId}-override-note`}
                value={overrideNote}
                onChange={(e) => {
                  setOverrideNote(e.target.value);
                  setErrorMessage(null);
                  setFieldErrors((prev) => ({ ...prev, overrideNote: undefined }));
                }}
                required
                maxLength={OVERRIDE_NOTE_MAX}
                rows={3}
                aria-invalid={Boolean(fieldErrors.overrideNote)}
                aria-describedby={fieldErrors.overrideNote ? `${formId}-override-note-desc ${formId}-override-note-error` : `${formId}-override-note-desc`}
              />
              <FieldDescription id={`${formId}-override-note-desc`}>
                Entre {OVERRIDE_NOTE_MIN} y {OVERRIDE_NOTE_MAX} caracteres. Ej.: la otra parada termina antes; se coordinó con el jefe de cuadrilla.
              </FieldDescription>
              {fieldErrors.overrideNote && <FieldError id={`${formId}-override-note-error`}>{fieldErrors.overrideNote}</FieldError>}
            </Field>
          )}
        </form>
      </div>

      <DialogFooter className="flex-wrap">
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="submit" form={formId} disabled={isSubmitting || !ready} aria-busy={isSubmitting}>
          {isSubmitting ? <Spinner data-icon="inline-start" aria-hidden="true" /> : <Check data-icon="inline-start" aria-hidden />}
          <span>Confirmar asignación</span>
        </Button>
      </DialogFooter>
    </>
  );
}
