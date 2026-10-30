"use client";
import { errorMessage as getErrorMessage } from "@/lib/error-message";

import { useEffect, useId, useMemo, useState } from "react";
import { AlertCircle, Check, ChevronDown, Info, MapPin, Route as RouteIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,

  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import { servicesAdapter, ServiceRequestError, OVERRIDE_NOTE_MIN, OVERRIDE_NOTE_MAX, type CreateServiceInput, type Service, type ServiceMode, type ServiceOrigin } from "@/lib/services";
import { routesAdapter, type Route } from "@/lib/routes";
import { serviceTypesAdapter, type ServiceType, type ServiceTypeCategory } from "@/lib/service-types";
import { asksForOverrideNote, crewFit, crewFitWarnings, crewsInZoneFirst } from "@/lib/crew-fit";
import { crewsAdapter, type Crew } from "@/lib/crews";
import { zonesAdapter, type Zone } from "@/lib/zones";
import { containersAdapter } from "@/lib/containers";
import { treesAdapter } from "@/lib/trees";
import { greenSpacesAdapter } from "@/lib/green-spaces";
import { greenPointsAdapter } from "@/lib/green-points";
import { todayInArgentina } from "@/lib/argentina-date";
import { MAX_NOTES_LENGTH } from "@/lib/input-limits";
import { SERVICE_MODE_LABEL, SERVICE_ORIGIN_LABEL } from "./service-ui-labels";
import { useRevealFirstError } from "./use-reveal-first-error";

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
  | { status: "ready"; serviceTypes: ServiceType[]; routes: Route[]; zones: Zone[]; crews: Crew[]; crewsFailed: boolean };

type InventoryTargetType = "CONTAINER" | "TREE" | "GREEN_SPACE" | "GREEN_POINT";
type TargetKind = InventoryTargetType | "LOCATION";
type TargetOption = { id: string; label: string; zoneId: string };
type TargetOptions = { status: "idle" | "loading" | "error" } | { status: "ready"; options: TargetOption[] };

const TARGET_KIND_LABELS: Record<TargetKind, string> = {
  CONTAINER: "Contenedor",
  TREE: "Árbol urbano",
  GREEN_SPACE: "Espacio verde",
  GREEN_POINT: "Punto verde",
  LOCATION: "Otra ubicación",
};

const TARGET_PAGE_SIZE = 20;
const NO_CREW = "__none__";

/** El tipo de objetivo sale de la categoría del tipo de servicio; ponytail: las inspecciones ambientales esperan el expediente (Backend #452). */
const TARGET_KIND_BY_CATEGORY: Record<ServiceTypeCategory, TargetKind> = {
  WASTE_COLLECTION: "CONTAINER",
  STREET_CLEANING: "CONTAINER",
  CONTAINERS: "CONTAINER",
  TREES: "TREE",
  GREEN_SPACES: "GREEN_SPACE",
  ENVIRONMENTAL_CONTROL: "LOCATION",
};
const PAST_DATE_ERROR = "La fecha debe ser hoy o posterior.";

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
  const [crewId, setCrewId] = useState("");
  const [overrideNote, setOverrideNote] = useState("");
  const [backendConflict, setBackendConflict] = useState(false);
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
      setServiceTypeId("");
      setPointZoneId("");
      setCrewId("");
      setOverrideNote("");
      setBackendConflict(false);
    }
  }

  // Scheduling temporal state
  const [today] = useState(() => todayInArgentina());
  const [scheduledDate, setScheduledDate] = useState<string>(() => today);
  const [windowStart, setWindowStart] = useState<string>("08:00");
  const [windowEnd, setWindowEnd] = useState<string>("12:00");

  // "Más datos" disclosure
  const [moreOpen, setMoreOpen] = useState(false);

  // Notes
  const [notes, setNotes] = useState<string>("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scheduledDateError, setScheduledDateError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    serviceType?: string;
    target?: string;
    targetRef?: string;
    reference?: string;
    route?: string;
    zone?: string;
  }>({});
  const scrollRef = useRevealFirstError(errorMessage, scheduledDateError, fieldErrors);

  // Los tipos de servicio, recorridos y zonas son los del backend (UUID): no se pueden fijar en el código.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([
      serviceTypesAdapter.list({ active: true, pageSize: 100 }),
      routesAdapter.list({ active: true, pageSize: 100 }),
      zonesAdapter.list({ active: true, pageSize: 100 }),
      // La cuadrilla es opcional: si su listado falla, el resto del formulario sigue funcionando.
      crewsAdapter.list({ active: true, pageSize: 100 }).then((page) => ({ crews: page.crews, failed: false })).catch(() => ({ crews: [] as Crew[], failed: true })),
    ])
      .then(([types, routeList, zoneList, crewList]) => {
        if (!cancelled) setCatalogs({ status: "ready", serviceTypes: types.serviceTypes.filter((t) => t.active), routes: routeList.routes, zones: zoneList.zones, crews: crewList.crews, crewsFailed: crewList.failed });
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
    setPointZoneId("");
    setFieldErrors((prev) => ({ ...prev, target: undefined, targetRef: undefined, zone: undefined }));
  };

  const serviceTypes = useMemo(() => (catalogs.status === "ready" ? catalogs.serviceTypes : []), [catalogs]);
  const routes = useMemo(() => (catalogs.status === "ready" ? catalogs.routes : []), [catalogs]);
  const zones = useMemo(() => (catalogs.status === "ready" ? catalogs.zones : []), [catalogs]);
  const crews = useMemo(() => (catalogs.status === "ready" ? catalogs.crews : []), [catalogs]);
  const crewsFailed = catalogs.status === "ready" && catalogs.crewsFailed;
  const crewItems = useMemo(() => ({ [NO_CREW]: "Sin asignar", ...Object.fromEntries(crews.map((crew) => [crew.id, crew.name])) }), [crews]);

  // Tipo y zona arrancan sin elegir: un valor por defecto podía dar una combinación incoherente. El recorrido sí toma el primero.
  const serviceTypeId = serviceTypes.some((t) => t.id === chosenServiceTypeId) ? chosenServiceTypeId : "";
  const routeId = routes.some((r) => r.id === chosenRouteId) ? chosenRouteId : (routes[0]?.id ?? "");
  const pointZoneId = zones.some((z) => z.id === chosenZoneId) ? chosenZoneId : "";

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
  const [routeDetail, setRouteDetail] = useState<Route | null>(null);
  useEffect(() => {
    if (!open || !selectedRoute || selectedRoute.stops.length) return;
    let active = true;
    routesAdapter.get(selectedRoute.id).then((route) => { if (active) setRouteDetail(route); }).catch(() => undefined);
    return () => { active = false; };
  }, [open, selectedRoute]);
  const routeWithStops = selectedRoute?.stops.length ? selectedRoute : routeDetail?.id === routeId ? routeDetail : selectedRoute;
  const selectedRouteZones = useMemo(
    () => [...(routeWithStops?.stops ?? [])].sort((a, b) => a.sequence - b.sequence).map((stop) => ({ id: stop.zoneId, name: stop.zoneName })),
    [routeWithStops],
  );

  const fitZones = derivedMode === "ROUTE" ? selectedRouteZones.map((zone) => zone.id) : [inventoryType && selectedTarget ? selectedTarget.zoneId : pointZoneId].filter(Boolean);
  const fit = crewFit(crews.find((crew) => crew.id === crewId), fitZones, selectedServiceType?.code);
  const needsNote = fit.zone || fit.specialty || backendConflict;

  // Reset form when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setErrorMessage(null);
      setFieldErrors({});
      setScheduledDateError(null);
      setIsSubmitting(false);
    }
    onOpenChange(nextOpen);
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    setScheduledDateError(null);

    if (catalogs.status !== "ready" || !selectedServiceType) {
      const message = catalogs.status === "ready" && serviceTypes.length > 0 ? "Seleccione un tipo de servicio." : "No hay tipos de servicio activos. Active uno en Configuración.";
      if (catalogs.status === "ready") setFieldErrors({ serviceType: message });
      else setErrorMessage(message);
      return;
    }

    if (scheduledDate < today) {
      setScheduledDateError(PAST_DATE_ERROR);
      return;
    }

    if (derivedMode === "POINT" && selectedServiceType && targetType !== TARGET_KIND_BY_CATEGORY[selectedServiceType.category]) {
      setFieldErrors({ serviceType: "El tipo de objetivo no corresponde al tipo de servicio elegido." });
      return;
    }

    if (inventoryType && !selectedTarget) {
      setFieldErrors({ target: `Debe elegir el ${TARGET_KIND_LABELS[inventoryType].toLocaleLowerCase("es")} sobre el que se ejecuta el servicio.` });
      return;
    }

    if (derivedMode === "POINT" && !inventoryType && !targetRef.trim()) {
      setFieldErrors({ targetRef: "Debe indicar la dirección o referencia de la ubicación." });
      return;
    }

    if (origin === "TICKET" && !referenceId.trim()) {
      setFieldErrors({ reference: "Indique el Nº de reclamo." });
      return;
    }

    if (origin === "TICKET" && !isUuid(referenceId.trim())) {
      setFieldErrors({ reference: "El Nº de reclamo no es válido." });
      return;
    }

    if (origin === "INSPECTION" && !referenceId.trim()) {
      setErrorMessage("Indique la inspección.");
      return;
    }

    if (origin === "INSPECTION" && !isUuid(referenceId.trim())) {
      setErrorMessage("La inspección no es válida.");
      return;
    }

    if (origin === "WEATHER_ALERT" && !referenceId.trim()) {
      setErrorMessage("Indique la alerta meteorológica.");
      return;
    }

    if (needsNote && overrideNote.trim().length < OVERRIDE_NOTE_MIN) { setErrorMessage(`Escriba al menos ${OVERRIDE_NOTE_MIN} caracteres de justificación.`); return; }
    setIsSubmitting(true);

    // Build zone snapshot. El listado de recorridos puede no traer las paradas: entonces se pide el detalle.
    // Con un bien del inventario la zona sale del bien, igual que en el backend.
    let zoneIds = [inventoryType && selectedTarget ? selectedTarget.zoneId : pointZoneId];
    if (derivedMode === "ROUTE") {
      try {
        const stops = selectedRouteZones.length > 0 ? selectedRouteZones.map((zone) => zone.id) : (await routesAdapter.get(routeId)).stops.map((stop) => stop.zoneId);
        zoneIds = [...new Set(stops)];
      } catch (cause) {
        setFieldErrors({ route: getErrorMessage(cause, "No se pudo consultar el recorrido seleccionado.") });
        setIsSubmitting(false);
        return;
      }
    }

    if (zoneIds.filter(Boolean).length === 0) {
      setFieldErrors(derivedMode === "ROUTE"
        ? { route: "El recorrido no tiene zonas." }
        : { zone: "Seleccione al menos una zona." });
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
      crewId: crewId || undefined,
      overrideNote: needsNote ? overrideNote.trim() : undefined,
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
      if (cause instanceof ServiceRequestError && cause.status === 409 && asksForOverrideNote(cause.message)) { setBackendConflict(true); return; }
      const msg =
        getErrorMessage(cause, "No se pudo programar el servicio. Verifique los datos ingresados.");
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const originItems = { MANUAL: "Manual", PLANNED: "Planificado" };
  const serviceTypeItems = Object.fromEntries(serviceTypes.map((t) => [t.id, `${t.name} (${SERVICE_MODE_LABEL[t.mode]})`]));
  const routeItems = Object.fromEntries(routes.map((r) => [r.id, `${r.name} (${r.code})`]));
  const activeZones = zones.filter((z) => z.active);
  const zoneItems = Object.fromEntries(activeZones.map((z) => [z.id, z.name]));
  const targetItems = Object.fromEntries(visibleTargetOptions.map((o) => [o.id, o.label]));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Programar servicio
          </DialogTitle>
        </DialogHeader>

        <div ref={scrollRef} className="-mx-1 flex min-h-0 flex-col gap-4 overflow-y-auto px-1 py-2">
          {errorMessage && (
            <Alert variant="danger">
              <AlertCircle aria-hidden />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {catalogs.status === "error" && (
            <Alert variant="danger">
              <AlertCircle aria-hidden />
              <AlertDescription>No se pudo cargar el formulario. Ciérrelo e intente nuevamente.</AlertDescription>
            </Alert>
          )}

          <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4" aria-busy={catalogs.status === "loading"}>
            <p className="text-xs text-muted-foreground">Los campos con * son obligatorios.</p>
            <p role="status" className="sr-only">{selectedServiceType ? `Modo: ${derivedMode === "ROUTE" ? "recorrido" : "puntual"}.` : ""}</p>
            {isLinked && (
              <Item variant="muted">
                <ItemContent>
                  <ItemTitle>
                    <Info className="size-4 text-primary" aria-hidden />
                    Origen: {SERVICE_ORIGIN_LABEL[origin]}
                  </ItemTitle>
                  {origin === "TICKET" && !hasTrustedTicketContext && (
                    <Field className="mt-2" data-invalid={Boolean(fieldErrors.reference) || undefined}>
                      <FieldLabel htmlFor="linked-ticket-id">Nº de reclamo{" "}<span aria-hidden>*</span></FieldLabel>
                      <Input
                        id="linked-ticket-id"
                        aria-required="true"
                        value={manualTicketId}
                        onChange={(event) => { setManualTicketId(event.target.value); setFieldErrors((prev) => ({ ...prev, reference: undefined })); }}
                        className="font-mono" placeholder="Pegue el Nº de reclamo"
                        aria-invalid={Boolean(fieldErrors.reference)}
                        aria-describedby={fieldErrors.reference ? "linked-ticket-id-error" : undefined}
                      />
                      {fieldErrors.reference && <FieldError id="linked-ticket-id-error">{fieldErrors.reference}</FieldError>}
                    </Field>
                  )}
                </ItemContent>
              </Item>
            )}

            <Field data-invalid={Boolean(fieldErrors.serviceType) || undefined}>
              <FieldLabel htmlFor="service-type">Tipo de servicio{" "}<span aria-hidden>*</span></FieldLabel>
              <Select
                value={serviceTypeId || null}
                items={serviceTypeItems}
                onValueChange={(value) => {
                  setServiceTypeId(String(value));
                  const category = serviceTypes.find((t) => t.id === value)?.category;
                  if (category) handleTargetTypeChange(TARGET_KIND_BY_CATEGORY[category]);
                  setFieldErrors((prev) => ({ ...prev, serviceType: undefined }));
                }}
              >
                <SelectTrigger
                  id="service-type"
                  aria-required="true"
                  aria-invalid={Boolean(fieldErrors.serviceType) || undefined}
                  aria-describedby={fieldErrors.serviceType ? "service-type-error" : undefined}
                >
                  <SelectValue placeholder="Seleccione un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {serviceTypes.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        {serviceTypeItems[st.id]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldErrors.serviceType && <FieldError id="service-type-error">{fieldErrors.serviceType}</FieldError>}
              {selectedServiceType ? <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">
                  {derivedMode === "ROUTE" ? (
                    <>
                      <RouteIcon data-icon="inline-start" aria-hidden />
                      Recorrido
                    </>
                  ) : (
                    <>
                      <MapPin data-icon="inline-start" aria-hidden />
                      Puntual
                    </>
                  )}
                </Badge>
              </div> : null}
              <FieldDescription>La zona sale del recorrido, del elemento elegido o de la zona que indique abajo.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="service-crew">Cuadrilla (opcional)</FieldLabel>
              <Select
                value={crewId || NO_CREW}
                items={crewItems}
                onValueChange={(value) => { setCrewId(value === NO_CREW ? "" : String(value)); setBackendConflict(false); }}
              >
                <SelectTrigger id="service-crew"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={NO_CREW}>Sin asignar</SelectItem>
                    {crewsInZoneFirst(crews, fitZones).map((crew) => <SelectItem key={crew.id} value={crew.id}>{crew.name}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {crewsFailed ? <FieldError role="status">No se pudo cargar el listado de cuadrillas; puede asignarla después.</FieldError> : null}
            </Field>

            {needsNote && <Field><FieldLabel htmlFor="service-override-note">Justificación de la asignación <span aria-hidden="true">*</span></FieldLabel><FieldDescription id="service-override-help" role="status">{crewFitWarnings(fit).join(" ")} {backendConflict && "La asignación presenta un conflicto de horario, zona o especialidad. "}Indique el motivo (mínimo {OVERRIDE_NOTE_MIN} caracteres).</FieldDescription><Textarea id="service-override-note" aria-required="true" aria-describedby="service-override-help" value={overrideNote} onChange={(event) => setOverrideNote(event.target.value)} maxLength={OVERRIDE_NOTE_MAX} /></Field>}

            {!selectedServiceType ? null : derivedMode === "ROUTE" ? (
              <Card size="sm" role="group" aria-labelledby="schedule-route-heading">
                <span id="schedule-route-heading" className="sr-only">Datos del recorrido</span>
                <CardContent className="flex flex-col gap-3">
                  <Field data-invalid={Boolean(fieldErrors.route) || undefined}>
                    <FieldLabel htmlFor="service-route">Recorrido asignado{" "}<span aria-hidden>*</span></FieldLabel>
                    <Select
                      value={routeId || null}
                      items={routeItems}
                      onValueChange={(value) => { setRouteId(String(value)); setFieldErrors((prev) => ({ ...prev, route: undefined })); }}
                    >
                      <SelectTrigger
                        id="service-route"
                        aria-required="true"
                        aria-invalid={Boolean(fieldErrors.route) || undefined}
                        aria-describedby={fieldErrors.route ? "service-route-error" : undefined}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {routes.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {routeItems[r.id]}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {fieldErrors.route && <FieldError id="service-route-error">{fieldErrors.route}</FieldError>}
                  </Field>

                  {selectedRoute && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-muted-foreground">Zonas:</span>
                      <ul className="flex flex-wrap gap-1.5" aria-label="Zonas cubiertas">
                        {selectedRouteZones.map((zone) => (
                          <li key={zone.id}>
                            <Badge variant="neutral">
                              <Check data-icon="inline-start" aria-hidden />
                              {zone.name}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card size="sm" role="group" aria-labelledby="schedule-point-heading">
                <span id="schedule-point-heading" className="sr-only">Datos de la ubicación</span>
                <CardContent className="flex flex-col gap-3">
                  <Field>
                    <FieldLabel htmlFor="target-type">Tipo de objetivo{" "}<span aria-hidden>*</span></FieldLabel>
                    <Select
                      value={targetType}
                      items={TARGET_KIND_LABELS}
                      disabled
                      onValueChange={(value) => handleTargetTypeChange(value as TargetKind)}
                    >
                      <SelectTrigger id="target-type" aria-required="true" aria-describedby="target-type-hint">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {(Object.keys(TARGET_KIND_LABELS) as TargetKind[]).map((kind) => (
                            <SelectItem key={kind} value={kind}>
                              {TARGET_KIND_LABELS[kind]}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription id="target-type-hint">Lo define el tipo de servicio elegido.</FieldDescription>
                  </Field>

                  {inventoryType ? (
                    <>
                      <Field>
                        <FieldLabel htmlFor="target-search">Buscar {TARGET_KIND_LABELS[inventoryType].toLocaleLowerCase("es")}</FieldLabel>
                        <Input
                          id="target-search"
                          type="search"
                          value={targetSearch}
                          onChange={(e) => setTargetSearch(e.target.value)}
                          placeholder={inventoryType === "GREEN_SPACE" ? "Nombre del espacio" : "Código o dirección"}
                        />
                      </Field>
                      <Field data-invalid={Boolean(fieldErrors.target) || undefined}>
                        <FieldLabel htmlFor="target-id">Elemento{" "}<span aria-hidden>*</span></FieldLabel>
                        <Select
                          value={selectedTarget?.id ?? null}
                          items={targetItems}
                          onValueChange={(value) => { setSelectedTarget(visibleTargetOptions.find((o) => o.id === value) ?? null); setFieldErrors((prev) => ({ ...prev, target: undefined })); }}
                        >
                          <SelectTrigger
                            id="target-id"
                            aria-required="true"
                            aria-invalid={Boolean(fieldErrors.target) || undefined}
                            aria-describedby={fieldErrors.target ? "target-id-status target-id-error" : "target-id-status"}
                            aria-busy={targetOptions.status === "loading"}
                          >
                            <SelectValue placeholder="Seleccione un elemento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {visibleTargetOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FieldDescription id="target-id-status" aria-live="polite" className="flex items-center gap-2">
                          {targetOptions.status === "loading" && (
                            <>
                              <Spinner aria-hidden="true" />
                              Buscando…
                            </>
                          )}
                          {targetOptions.status === "ready" && targetOptions.options.length === 0 && "Sin resultados."}
                          {targetOptions.status === "ready" && targetOptions.options.length > 0 &&
                            (selectedTargetZone ? `Zona: ${selectedTargetZone.name}` : null)}
                        </FieldDescription>
                        {fieldErrors.target && <FieldError id="target-id-error">{fieldErrors.target}</FieldError>}
                        {targetOptions.status === "error" && (
                          <FieldError>No se pudo buscar. Intente nuevamente.</FieldError>
                        )}
                      </Field>
                    </>
                  ) : (
                    <FieldGroup className="grid gap-4 sm:grid-cols-2">
                      <Field data-invalid={Boolean(fieldErrors.zone) || undefined}>
                        <FieldLabel htmlFor="point-zone">Zona operativa{" "}<span aria-hidden>*</span></FieldLabel>
                        <Select
                          value={pointZoneId || null}
                          items={zoneItems}
                          onValueChange={(value) => { setPointZoneId(String(value)); setFieldErrors((prev) => ({ ...prev, zone: undefined })); }}
                        >
                          <SelectTrigger
                            id="point-zone"
                            aria-required="true"
                            aria-invalid={Boolean(fieldErrors.zone) || undefined}
                            aria-describedby={fieldErrors.zone ? "point-zone-error" : undefined}
                          >
                            <SelectValue placeholder="Seleccione una zona" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {activeZones.map((z) => (
                                <SelectItem key={z.id} value={z.id}>
                                  {zoneItems[z.id]}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        {fieldErrors.zone && <FieldError id="point-zone-error">{fieldErrors.zone}</FieldError>}
                      </Field>
                      <Field data-invalid={Boolean(fieldErrors.targetRef) || undefined}>
                        <FieldLabel htmlFor="target-ref">Dirección o referencia{" "}<span aria-hidden>*</span></FieldLabel>
                        <Input
                          id="target-ref"
                          type="text"
                          value={targetRef}
                          onChange={(e) => { setTargetRef(e.target.value); setFieldErrors((prev) => ({ ...prev, targetRef: undefined })); }}
                          placeholder="p. ej. Av. Rivadavia 2200"
                          required
                          aria-invalid={Boolean(fieldErrors.targetRef)}
                          aria-describedby={fieldErrors.targetRef ? "target-ref-error" : undefined}
                        />
                        {fieldErrors.targetRef && <FieldError id="target-ref-error">{fieldErrors.targetRef}</FieldError>}
                      </Field>
                    </FieldGroup>
                  )}
                </CardContent>
              </Card>
            )}

            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2" data-invalid={Boolean(scheduledDateError) || undefined}>
                <FieldLabel htmlFor="scheduled-date">Fecha programada{" "}<span aria-hidden>*</span></FieldLabel>
                <DatePicker
                  id="scheduled-date"
                  value={scheduledDate}
                  min={today}
                  invalid={Boolean(scheduledDateError)}
                  aria-required
                  aria-describedby={scheduledDateError ? "scheduled-date-error" : undefined}
                  onChange={(value) => {
                    setScheduledDate(value);
                    setScheduledDateError(null);
                  }}
                />
                {scheduledDateError && <FieldError id="scheduled-date-error">{scheduledDateError}</FieldError>}
              </Field>

              <Field>
                <FieldLabel id="window-start-label" htmlFor="window-start">Desde{" "}<span aria-hidden>*</span></FieldLabel>
                <TimePicker id="window-start" value={windowStart} onChange={setWindowStart} required aria-labelledby="window-start-label" />
              </Field>

              <Field>
                <FieldLabel id="window-end-label" htmlFor="window-end">Hasta{" "}<span aria-hidden>*</span></FieldLabel>
                <TimePicker id="window-end" value={windowEnd} onChange={setWindowEnd} required aria-labelledby="window-end-label" />
              </Field>
            </FieldGroup>

            <Collapsible open={moreOpen} onOpenChange={setMoreOpen} className="flex flex-col gap-4">
              <CollapsibleTrigger className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&[data-panel-open]>svg]:rotate-180">
                Más datos
                <ChevronDown className="size-4 transition-transform" aria-hidden />
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-4">
                {!isLinked && (
                  <Field>
                    <FieldLabel htmlFor="service-origin">Origen del servicio{" "}<span aria-hidden>*</span></FieldLabel>
                    <Select
                      value={genericOrigin}
                      items={originItems}
                      onValueChange={(value) => setGenericOrigin(value as ServiceOrigin)}
                    >
                      <SelectTrigger id="service-origin" aria-required="true">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="MANUAL">{originItems.MANUAL}</SelectItem>
                          <SelectItem value="PLANNED">{originItems.PLANNED}</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              <Field>
                <FieldLabel htmlFor="service-notes">Notas (opcional)</FieldLabel>
                <Textarea
                  id="service-notes"
                  rows={2}
                  maxLength={MAX_NOTES_LENGTH}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Indicaciones para la cuadrilla"
                  className="min-h-16 resize-none"
                />
              </Field>
              </CollapsibleContent>
            </Collapsible>

          </form>
        </div>

        <DialogFooter className="flex-wrap">
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
            aria-busy={isSubmitting}
          >
            {isSubmitting && <Spinner data-icon="inline-start" aria-hidden="true" />}
            <span>Programar servicio</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
