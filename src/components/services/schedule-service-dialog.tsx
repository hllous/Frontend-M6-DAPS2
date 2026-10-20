"use client";
import { errorMessage as getErrorMessage } from "@/lib/error-message";

import { useEffect, useId, useMemo, useState } from "react";
import { AlertCircle, Check, Info, MapPin, Route as RouteIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import { servicesAdapter, type CreateServiceInput, type Service, type ServiceMode, type ServiceOrigin } from "@/lib/services";
import { routesAdapter, type Route } from "@/lib/routes";
import { serviceTypesAdapter, type ServiceType } from "@/lib/service-types";
import { zonesAdapter, type Zone } from "@/lib/zones";
import { containersAdapter } from "@/lib/containers";
import { treesAdapter } from "@/lib/trees";
import { greenSpacesAdapter } from "@/lib/green-spaces";
import { greenPointsAdapter } from "@/lib/green-points";
import { todayInArgentina } from "@/lib/argentina-date";
import { MAX_NOTES_LENGTH } from "@/lib/input-limits";
import { SERVICE_MODE_LABEL, SERVICE_ORIGIN_LABEL } from "./service-ui-labels";

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
const PAST_DATE_ERROR = "La fecha programada debe ser hoy o una fecha posterior en Argentina.";

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
  const [today] = useState(() => todayInArgentina());
  const [scheduledDate, setScheduledDate] = useState<string>(() => today);
  const [windowStart, setWindowStart] = useState<string>("08:00");
  const [windowEnd, setWindowEnd] = useState<string>("12:00");

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
    setFieldErrors({});
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
      const message = "No hay un tipo de servicio activo para programar. Cree o active uno en Catálogo > Tipos de servicio.";
      if (catalogs.status === "ready") setFieldErrors({ serviceType: message });
      else setErrorMessage(message);
      return;
    }

    if (scheduledDate < today) {
      setScheduledDateError(PAST_DATE_ERROR);
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
      setFieldErrors({ reference: "Debe indicar el UUID técnico del reclamo." });
      return;
    }

    if (origin === "TICKET" && !isUuid(referenceId.trim())) {
      setFieldErrors({ reference: "El ticketId debe ser un UUID válido. El identificador TK-… es publicId y no reemplaza el UUID técnico." });
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
        setFieldErrors({ route: getErrorMessage(cause, "No se pudo consultar el recorrido seleccionado.") });
        setIsSubmitting(false);
        return;
      }
    }

    if (zoneIds.filter(Boolean).length === 0) {
      setFieldErrors(derivedMode === "ROUTE"
        ? { route: "El recorrido seleccionado no tiene paradas con zona asignada." }
        : { zone: "Debe seleccionarse al menos una zona para el servicio." });
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
        getErrorMessage(cause, "No se pudo programar el servicio. Verifique los datos ingresados.");
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const originItems = { MANUAL: "Manual (operación a demanda)", PLANNED: "Planificado (programa regular de servicio)" };
  const serviceTypeItems = Object.fromEntries(serviceTypes.map((t) => [t.id, `${t.name} (${SERVICE_MODE_LABEL[t.mode]})`]));
  const routeItems = Object.fromEntries(routes.map((r) => [r.id, `${r.name} (${r.code})`]));
  const activeZones = zones.filter((z) => z.active);
  const zoneItems = Object.fromEntries(activeZones.map((z) => [z.id, `${z.name} (${z.code})`]));
  const targetItems = Object.fromEntries(visibleTargetOptions.map((o) => [o.id, o.label]));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
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

        <div className="-mx-1 flex min-h-0 flex-col gap-4 overflow-y-auto px-1 py-2">
          {errorMessage && (
            <Alert variant="danger">
              <AlertCircle aria-hidden />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {catalogs.status === "error" && (
            <Alert variant="danger">
              <AlertCircle aria-hidden />
              <AlertDescription>No se pudieron cargar los tipos de servicio, recorridos y zonas. Cierre este diálogo y vuelva a intentarlo.</AlertDescription>
            </Alert>
          )}

          <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4" aria-busy={catalogs.status === "loading"}>
            {isLinked ? (
              <Item variant="muted">
                <ItemContent>
                  <ItemTitle>
                    <Info className="size-4 text-primary" aria-hidden />
                    Origen vinculado preservado
                  </ItemTitle>
                  <ItemDescription>
                    Origen: <strong className="text-foreground">{SERVICE_ORIGIN_LABEL[origin]}</strong>
                  </ItemDescription>
                  {origin === "TICKET" && !hasTrustedTicketContext && (
                    <Field className="mt-2" data-invalid={Boolean(fieldErrors.reference) || undefined}>
                      <FieldLabel htmlFor="linked-ticket-id">UUID del ticket de M2 *</FieldLabel>
                      <Input
                        id="linked-ticket-id"
                        value={manualTicketId}
                        onChange={(event) => { setManualTicketId(event.target.value); setFieldErrors((prev) => ({ ...prev, reference: undefined })); }}
                        className="font-mono"
                        aria-invalid={Boolean(fieldErrors.reference)}
                        aria-describedby={fieldErrors.reference ? "linked-ticket-id-help linked-ticket-id-error" : "linked-ticket-id-help"}
                      />
                      <FieldDescription id="linked-ticket-id-help">Pegue el UUID técnico del expediente. El formato TK-… es publicId y no sirve para correlacionar eventos.</FieldDescription>
                      {fieldErrors.reference && <FieldError id="linked-ticket-id-error">{fieldErrors.reference}</FieldError>}
                    </Field>
                  )}
                </ItemContent>
              </Item>
            ) : (
              <Field>
                <FieldLabel htmlFor="service-origin">Origen del servicio *</FieldLabel>
                <Select
                  value={genericOrigin}
                  items={originItems}
                  onValueChange={(value) => setGenericOrigin(value as ServiceOrigin)}
                >
                  <SelectTrigger id="service-origin">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="MANUAL">{originItems.MANUAL}</SelectItem>
                      <SelectItem value="PLANNED">{originItems.PLANNED}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Los servicios planificados corresponden al cronograma habitual; los manuales a intervenciones no rutinarias.
                </FieldDescription>
              </Field>
            )}

            <Field data-invalid={Boolean(fieldErrors.serviceType) || undefined}>
              <FieldLabel htmlFor="service-type">Tipo de servicio *</FieldLabel>
              <Select
                value={serviceTypeId || null}
                items={serviceTypeItems}
                onValueChange={(value) => { setServiceTypeId(String(value)); setFieldErrors((prev) => ({ ...prev, serviceType: undefined })); }}
              >
                <SelectTrigger
                  id="service-type"
                  aria-invalid={Boolean(fieldErrors.serviceType) || undefined}
                  aria-describedby={fieldErrors.serviceType ? "service-type-error" : undefined}
                >
                  <SelectValue />
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
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Modo determinado por el catálogo:</span>
                <Badge variant="info">
                  {derivedMode === "ROUTE" ? (
                    <>
                      <RouteIcon data-icon="inline-start" aria-hidden />
                      Recorrido
                    </>
                  ) : (
                    <>
                      <MapPin data-icon="inline-start" aria-hidden />
                      Punto fijo
                    </>
                  )}
                </Badge>
              </div>
              <FieldDescription>
                El modo de ejecución no es configurable por el operador; se hereda del tipo de servicio seleccionado.
              </FieldDescription>
            </Field>

            {derivedMode === "ROUTE" ? (
              <Card size="sm">
                <CardContent className="flex flex-col gap-3">
                  <Field data-invalid={Boolean(fieldErrors.route) || undefined}>
                    <FieldLabel htmlFor="service-route">Recorrido asignado *</FieldLabel>
                    <Select
                      value={routeId || null}
                      items={routeItems}
                      onValueChange={(value) => { setRouteId(String(value)); setFieldErrors((prev) => ({ ...prev, route: undefined })); }}
                    >
                      <SelectTrigger
                        id="service-route"
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
                      <span className="text-sm font-medium text-muted-foreground">Zonas cubiertas (snapshot inmutable):</span>
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
              <Card size="sm">
                <CardContent className="flex flex-col gap-3">
                  <Field>
                    <FieldLabel htmlFor="target-type">Tipo de objetivo *</FieldLabel>
                    <Select
                      value={targetType}
                      items={TARGET_KIND_LABELS}
                      onValueChange={(value) => handleTargetTypeChange(value as TargetKind)}
                    >
                      <SelectTrigger id="target-type">
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
                        <FieldLabel htmlFor="target-id">Bien del inventario *</FieldLabel>
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
                            <SelectValue placeholder="Seleccione un bien…" />
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
                              Buscando en el inventario…
                            </>
                          )}
                          {targetOptions.status === "ready" && targetOptions.options.length === 0 && "No hay bienes que coincidan con la búsqueda."}
                          {targetOptions.status === "ready" && targetOptions.options.length > 0 &&
                            (selectedTargetZone ? `Zona derivada del bien: ${selectedTargetZone.name}.` : "La zona del servicio se deriva del bien elegido.")}
                        </FieldDescription>
                        {fieldErrors.target && <FieldError id="target-id-error">{fieldErrors.target}</FieldError>}
                        {targetOptions.status === "error" && (
                          <FieldError>No se pudo consultar el inventario. Cambie la búsqueda para reintentar.</FieldError>
                        )}
                      </Field>
                    </>
                  ) : (
                    <FieldGroup className="grid gap-4 sm:grid-cols-2">
                      <Field data-invalid={Boolean(fieldErrors.zone) || undefined}>
                        <FieldLabel htmlFor="point-zone">Zona operativa *</FieldLabel>
                        <Select
                          value={pointZoneId || null}
                          items={zoneItems}
                          onValueChange={(value) => { setPointZoneId(String(value)); setFieldErrors((prev) => ({ ...prev, zone: undefined })); }}
                        >
                          <SelectTrigger
                            id="point-zone"
                            aria-invalid={Boolean(fieldErrors.zone) || undefined}
                            aria-describedby={fieldErrors.zone ? "point-zone-error" : undefined}
                          >
                            <SelectValue />
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
                        <FieldLabel htmlFor="target-ref">Dirección o referencia *</FieldLabel>
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
                        <FieldDescription>Sin bien del inventario el servicio se ubica por zona; la referencia queda en las notas.</FieldDescription>
                      </Field>
                    </FieldGroup>
                  )}
                </CardContent>
              </Card>
            )}

            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2" data-invalid={Boolean(scheduledDateError) || undefined}>
                <FieldLabel htmlFor="scheduled-date">Fecha programada *</FieldLabel>
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
                <FieldLabel id="window-start-label" htmlFor="window-start">Desde *</FieldLabel>
                <TimePicker id="window-start" value={windowStart} onChange={setWindowStart} required aria-labelledby="window-start-label" />
              </Field>

              <Field>
                <FieldLabel id="window-end-label" htmlFor="window-end">Hasta *</FieldLabel>
                <TimePicker id="window-end" value={windowEnd} onChange={setWindowEnd} required aria-labelledby="window-end-label" />
              </Field>
            </FieldGroup>

            <Field>
              <FieldLabel htmlFor="service-notes">Notas e instrucciones operativas (opcional)</FieldLabel>
              <Textarea
                id="service-notes"
                rows={2}
                maxLength={MAX_NOTES_LENGTH}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instrucciones especiales para la cuadrilla o restricciones de acceso…"
                className="min-h-16 resize-none"
              />
            </Field>

            <Alert variant="info" role="status">
              <Info aria-hidden />
              <AlertDescription>
                El servicio se creará en estado <strong>Programado</strong> sin cuadrilla ni vehículo asignados. La asignación operativa se realiza posteriormente en el despacho.
              </AlertDescription>
            </Alert>
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
