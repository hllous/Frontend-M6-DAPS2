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
import { servicesAdapter, type CreateServiceInput, type Service, type ServiceMode, type ServiceOrigin } from "@/lib/services";
import { routesAdapter, type Route } from "@/lib/routes";
import { serviceTypesAdapter, type ServiceType } from "@/lib/service-types";
import { zonesAdapter, type Zone } from "@/lib/zones";
import { containersAdapter } from "@/lib/containers";
import { treesAdapter } from "@/lib/trees";
import { greenSpacesAdapter } from "@/lib/green-spaces";
import { greenPointsAdapter } from "@/lib/green-points";
import { cn } from "@/lib/utils";
import { MAX_NOTES_LENGTH } from "@/lib/input-limits";

interface ScheduleServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (service: Service) => void;
  initialOrigin?: ServiceOrigin;
  initialReferenceId?: string;
}

type Catalogs =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; serviceTypes: ServiceType[]; routes: Route[]; zones: Zone[] };

type InventoryTargetType = "CONTAINER" | "TREE" | "GREEN_SPACE" | "GREEN_POINT";
type TargetKind = InventoryTargetType | "LOCATION";
type TargetOption = { id: string; label: string; zoneId: string };
type TargetOptions = { status: "idle" | "loading" | "error" } | { status: "ready"; options: TargetOption[] };

const TARGET_KIND_LABELS: Record<TargetKind, string> = {
  CONTAINER: "Contenedor",
  TREE: "Árbol urbano",
  GREEN_SPACE: "Espacio verde",
  GREEN_POINT: "Punto verde",
  LOCATION: "Ubicación suelta (sin bien del inventario)",
};

const TARGET_PAGE_SIZE = 20;

/** Busca bienes del inventario del tipo pedido y los muestra por código o dirección, nunca por UUID. */
async function searchTargets(type: InventoryTargetType, search: string): Promise<TargetOption[]> {
  const term = search.trim() || undefined;
  switch (type) {
    case "CONTAINER":
      return (await containersAdapter.list({ search: term, pageSize: TARGET_PAGE_SIZE })).containers.map((c) => ({
        id: c.id,
        label: [c.code, c.address].filter(Boolean).join(" · "),
        zoneId: c.zoneId,
      }));
    case "TREE":
      return (await treesAdapter.list({ active: true, search: term, pageSize: TARGET_PAGE_SIZE })).trees.map((t) => ({
        id: t.id,
        label: [t.surveyCode, t.species, t.address].filter(Boolean).join(" · "),
        zoneId: t.zoneId,
      }));
    case "GREEN_POINT":
      return (await greenPointsAdapter.list({ active: true, search: term, pageSize: TARGET_PAGE_SIZE })).greenPoints.map((g) => ({
        id: g.id,
        label: [g.code, g.name, g.address].filter(Boolean).join(" · "),
        zoneId: g.zoneId,
      }));
    case "GREEN_SPACE": {
      // ponytail: el adapter de espacios verdes no expone `search`; se filtra por nombre sobre los primeros 100.
      const { greenSpaces } = await greenSpacesAdapter.list({ active: true, pageSize: 100 });
      const needle = term?.toLocaleLowerCase("es");
      return greenSpaces
        .filter((g) => !needle || g.name.toLocaleLowerCase("es").includes(needle))
        .slice(0, TARGET_PAGE_SIZE)
        .map((g) => ({ id: g.id, label: g.name, zoneId: g.zoneId }));
    }
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return uuidPattern.test(value);
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
  const [catalogs, setCatalogs] = useState<Catalogs>({ status: "loading" });
  const [chosenServiceTypeId, setServiceTypeId] = useState("");
  const [genericOrigin, setGenericOrigin] = useState<ServiceOrigin>("MANUAL");
  const [manualTicketId, setManualTicketId] = useState(() => initialReferenceId ?? "");

  // Effective origin & reference: locked when linked, user-selected otherwise
  const origin: ServiceOrigin = isLinked && initialOrigin ? initialOrigin : genericOrigin;
  const referenceId: string = origin === "TICKET" ? manualTicketId : isLinked ? (initialReferenceId ?? "") : "";
  const hasTrustedTicketContext = origin === "TICKET" && isUuid(initialReferenceId?.trim() ?? "");

  // Route mode state
  const [chosenRouteId, setRouteId] = useState("");

  // Point mode state
  const [chosenZoneId, setPointZoneId] = useState("");
  const [targetType, setTargetType] = useState<TargetKind>("CONTAINER");
  const [targetRef, setTargetRef] = useState<string>("");
  const [targetSearch, setTargetSearch] = useState("");
  const [targetOptions, setTargetOptions] = useState<TargetOptions>({ status: "idle" });
  const [selectedTarget, setSelectedTarget] = useState<TargetOption | null>(null);

  // El diálogo no se desmonta al cerrarse: al reabrir no puede arrastrar el objetivo del servicio anterior.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setManualTicketId(initialReferenceId ?? "");
      setTargetType("CONTAINER");
      setTargetRef("");
      setTargetSearch("");
      setTargetOptions({ status: "idle" });
      setSelectedTarget(null);
    }
  }

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

  // Los tipos de servicio, recorridos y zonas son los del backend (UUID): no se pueden fijar en el código.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([
      serviceTypesAdapter.list({ active: true, pageSize: 100 }),
      routesAdapter.list({ active: true, pageSize: 100 }),
      zonesAdapter.list({ active: true, pageSize: 100 }),
    ])
      .then(([types, routeList, zoneList]) => {
        if (!cancelled) setCatalogs({ status: "ready", serviceTypes: types.serviceTypes.filter((t) => t.active), routes: routeList.routes, zones: zoneList.zones });
      })
      .catch(() => {
        if (!cancelled) setCatalogs({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Cambiar el tipo de objetivo invalida el bien elegido: un id de contenedor no es un árbol.
  const handleTargetTypeChange = (next: TargetKind) => {
    setTargetType(next);
    setSelectedTarget(null);
    setTargetSearch("");
  };

  const serviceTypes = useMemo(() => (catalogs.status === "ready" ? catalogs.serviceTypes : []), [catalogs]);
  const routes = useMemo(() => (catalogs.status === "ready" ? catalogs.routes : []), [catalogs]);
  const zones = useMemo(() => (catalogs.status === "ready" ? catalogs.zones : []), [catalogs]);

  // Sin elección explícita se toma la primera opción del catálogo.
  const serviceTypeId = serviceTypes.some((t) => t.id === chosenServiceTypeId) ? chosenServiceTypeId : (serviceTypes[0]?.id ?? "");
  const routeId = routes.some((r) => r.id === chosenRouteId) ? chosenRouteId : (routes[0]?.id ?? "");
  const pointZoneId = zones.some((z) => z.id === chosenZoneId) ? chosenZoneId : (zones[0]?.id ?? "");

  // Selected Service Type determines Mode strictly
  const selectedServiceType = serviceTypes.find((t) => t.id === serviceTypeId);
  const derivedMode: ServiceMode = selectedServiceType?.mode ?? "ROUTE";

  const inventoryType = derivedMode === "POINT" && targetType !== "LOCATION" ? targetType : null;
  useEffect(() => {
    if (!open || !inventoryType) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setTargetOptions({ status: "loading" });
      searchTargets(inventoryType, targetSearch)
        .then((options) => {
          if (!cancelled) setTargetOptions({ status: "ready", options });
        })
        .catch(() => {
          if (!cancelled) setTargetOptions({ status: "error" });
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, inventoryType, targetSearch]);

  const visibleTargetOptions = useMemo(() => {
    const options = targetOptions.status === "ready" ? targetOptions.options : [];
    // La elección se conserva aunque una búsqueda posterior ya no la traiga.
    return selectedTarget && !options.some((o) => o.id === selectedTarget.id) ? [selectedTarget, ...options] : options;
  }, [targetOptions, selectedTarget]);
  const selectedTargetZone = zones.find((z) => z.id === selectedTarget?.zoneId);

  // Selected Route for ROUTE mode
  const selectedRoute = routes.find((r) => r.id === routeId);
  const selectedRouteZones = useMemo(
    () => [...(selectedRoute?.stops ?? [])].sort((a, b) => a.sequence - b.sequence).map((stop) => ({ id: stop.zoneId, name: stop.zoneName })),
    [selectedRoute],
  );

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

    if (catalogs.status !== "ready" || !selectedServiceType) {
      setErrorMessage("No hay un tipo de servicio activo para programar. Cree o active uno en Catálogo > Tipos de servicio.");
      return;
    }

    if (inventoryType && !selectedTarget) {
      setErrorMessage(`Debe elegir el ${TARGET_KIND_LABELS[inventoryType].toLocaleLowerCase("es")} sobre el que se ejecuta el servicio.`);
      return;
    }

    if (derivedMode === "POINT" && !inventoryType && !targetRef.trim()) {
      setErrorMessage("Debe indicar la dirección o referencia de la ubicación.");
      return;
    }

    if (origin === "TICKET" && !referenceId.trim()) {
      setErrorMessage("Debe indicar el UUID técnico del reclamo.");
      return;
    }

    if (origin === "TICKET" && !isUuid(referenceId.trim())) {
      setErrorMessage("El ticketId debe ser un UUID válido. El identificador TK-… es publicId y no reemplaza el UUID técnico.");
      return;
    }

    if (origin === "INSPECTION" && !referenceId.trim()) {
      setErrorMessage("El identificador de inspección es obligatorio.");
      return;
    }

    if (origin === "INSPECTION" && !isUuid(referenceId.trim())) {
      setErrorMessage("El identificador de inspección debe ser el UUID de la inspección.");
      return;
    }

    if (origin === "WEATHER_ALERT" && !referenceId.trim()) {
      setErrorMessage("El identificador de alerta meteorológica es obligatorio.");
      return;
    }

    setIsSubmitting(true);

    // Build zone snapshot. El listado de recorridos puede no traer las paradas: entonces se pide el detalle.
    // Con un bien del inventario la zona sale del bien, igual que en el backend.
    let zoneIds = [inventoryType && selectedTarget ? selectedTarget.zoneId : pointZoneId];
    if (derivedMode === "ROUTE") {
      try {
        const stops = selectedRouteZones.length > 0 ? selectedRouteZones.map((zone) => zone.id) : (await routesAdapter.get(routeId)).stops.map((stop) => stop.zoneId);
        zoneIds = [...new Set(stops)];
      } catch (cause) {
        setErrorMessage(cause instanceof Error ? cause.message : "No se pudo consultar el recorrido seleccionado.");
        setIsSubmitting(false);
        return;
      }
    }

    if (zoneIds.filter(Boolean).length === 0) {
      setErrorMessage(derivedMode === "ROUTE" ? "El recorrido seleccionado no tiene paradas con zona asignada." : "Debe seleccionarse al menos una zona para el servicio.");
      setIsSubmitting(false);
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
      targetType: inventoryType ?? undefined,
      targetId: inventoryType ? selectedTarget?.id : undefined,
      targetRef: derivedMode !== "POINT" ? undefined : inventoryType ? selectedTarget?.label : targetRef.trim(),
      scheduledDate,
      timeWindow: {
        start: windowStart,
        end: windowEnd,
      },
      notes: notes.trim() ? notes.trim() : undefined,
    };

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

        {catalogs.status === "error" && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
            <span>No se pudieron cargar los tipos de servicio, recorridos y zonas. Cierre este diálogo y vuelva a intentarlo.</span>
          </div>
        )}

        <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4 py-2" aria-busy={catalogs.status === "loading"}>
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
                {origin === "TICKET" && !hasTrustedTicketContext ? (
                  <Field>
                    <FieldLabel htmlFor="linked-ticket-id">UUID del ticket de M2 *</FieldLabel>
                    <input
                      id="linked-ticket-id"
                      value={manualTicketId}
                      onChange={(event) => setManualTicketId(event.target.value)}
                      className="mt-1 h-10 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 font-mono text-xs text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]"
                      aria-describedby="linked-ticket-id-help"
                    />
                    <FieldDescription id="linked-ticket-id-help">Pegue el UUID técnico del expediente. El formato TK-… es publicId y no sirve para correlacionar eventos.</FieldDescription>
                  </Field>
                ) : (
                  <div>
                    <span className="text-[var(--color-text-secondary)]">{origin === "TICKET" ? "UUID de ticket:" : "ID Referencia:"}</span>
                    <p className="font-mono font-bold text-[var(--color-text)] mt-0.5">
                      {referenceId || "(Sin ID)"}
                    </p>
                  </div>
                )}
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
              {serviceTypes.map((st) => (
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
                  {routes.map((r) => (
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
                    {selectedRouteZones.map((zone) => (
                      <span
                        key={zone.id}
                        className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text)]"
                      >
                        <Check className="h-3 w-3 text-blue-600 dark:text-blue-400" aria-hidden />
                        {zone.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3.5 flex flex-col gap-3">
              <Field>
                <FieldLabel htmlFor="target-type">Tipo de objetivo *</FieldLabel>
                <select
                  id="target-type"
                  value={targetType}
                  onChange={(e) => handleTargetTypeChange(e.target.value as TargetKind)}
                  className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
                >
                  {(Object.keys(TARGET_KIND_LABELS) as TargetKind[]).map((kind) => (
                    <option key={kind} value={kind}>
                      {TARGET_KIND_LABELS[kind]}
                    </option>
                  ))}
                </select>
              </Field>

              {inventoryType ? (
                <>
                  <Field>
                    <FieldLabel htmlFor="target-search">Buscar {TARGET_KIND_LABELS[inventoryType].toLocaleLowerCase("es")}</FieldLabel>
                    <input
                      id="target-search"
                      type="search"
                      value={targetSearch}
                      onChange={(e) => setTargetSearch(e.target.value)}
                      placeholder={inventoryType === "GREEN_SPACE" ? "Nombre del espacio" : "Código o dirección"}
                      className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="target-id">Bien del inventario *</FieldLabel>
                    <select
                      id="target-id"
                      value={selectedTarget?.id ?? ""}
                      onChange={(e) => setSelectedTarget(visibleTargetOptions.find((o) => o.id === e.target.value) ?? null)}
                      aria-describedby="target-id-status"
                      aria-busy={targetOptions.status === "loading"}
                      className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
                    >
                      <option value="">Seleccione un bien…</option>
                      {visibleTargetOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <FieldDescription id="target-id-status" aria-live="polite">
                      {targetOptions.status === "loading" && "Buscando en el inventario…"}
                      {targetOptions.status === "ready" && targetOptions.options.length === 0 && "No hay bienes que coincidan con la búsqueda."}
                      {targetOptions.status === "ready" && targetOptions.options.length > 0 &&
                        (selectedTargetZone ? `Zona derivada del bien: ${selectedTargetZone.name}.` : "La zona del servicio se deriva del bien elegido.")}
                    </FieldDescription>
                    {targetOptions.status === "error" && (
                      <FieldError>No se pudo consultar el inventario. Cambie la búsqueda para reintentar.</FieldError>
                    )}
                  </Field>
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="point-zone">Zona operativa *</FieldLabel>
                    <select
                      id="point-zone"
                      value={pointZoneId}
                      onChange={(e) => setPointZoneId(e.target.value)}
                      className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
                    >
                      {zones
                        .filter((z) => z.active)
                        .map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name} ({z.code})
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="target-ref">Dirección o referencia *</FieldLabel>
                    <input
                      id="target-ref"
                      type="text"
                      value={targetRef}
                      onChange={(e) => setTargetRef(e.target.value)}
                      placeholder="p. ej. Av. Rivadavia 2200"
                      required
                      className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
                    />
                    <FieldDescription>Sin bien del inventario el servicio se ubica por zona; la referencia queda en las notas.</FieldDescription>
                  </Field>
                </div>
              )}
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
              maxLength={MAX_NOTES_LENGTH}
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
            disabled={isSubmitting || catalogs.status !== "ready"}
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
