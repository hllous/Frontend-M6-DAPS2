"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock3, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import {
  AUDIT_ENTITY_TYPES,
  auditPageSchema,
  auditQuerySchema,
  outboxDetailSchema,
  outboxEventSchema,
  outboxPageSchema,
  OUTBOX_STATUSES,
  retryFailedResponseSchema,
  type AuditEntry,
  type AuditPage,
  type OutboxDetail,
  type OutboxEvent,
  type OutboxPage,
} from "@/lib/integration-monitor";
import type { M6Role } from "@/lib/m6-roles";

import { auditActionLabel, auditStatusLabel } from "./audit-labels";
import styles from "./integration-monitor.module.css";

type MonitorTab = "events" | "activity";
type OutboxStatus = (typeof OUTBOX_STATUSES)[number];
type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];
type EventFilters = { status?: OutboxStatus; eventType?: string; from?: string; to?: string };
type AuditFilters = { entityType?: AuditEntityType; entityId?: string };
type DialogMode = "detail" | "single-confirm" | "bulk-confirm" | null;

type IntegrationMonitorProps = {
  canManage: boolean;
  initialTab?: MonitorTab;
  initialEntityType?: AuditEntityType;
  initialEntityId?: string;
};

class ApiRequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function readApiJson<T>(url: string, schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(url, init);
  const body = await response.json().catch(() => undefined) as { message?: unknown } | undefined;
  if (!response.ok) {
    const message = Array.isArray(body?.message)
      ? body.message.filter((part): part is string => typeof part === "string").join(" ")
      : typeof body?.message === "string" ? body.message : "No se pudo completar la solicitud.";
    throw new ApiRequestError(response.status, message);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiRequestError(502, "La respuesta recibida no tiene el formato esperado.");
  return parsed.data;
}

function dateTime(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

const statusPresentation: Record<OutboxStatus, { label: string; variant: "info" | "success" | "danger"; Icon: typeof Clock3 }> = {
  PENDING: { label: "Pendiente", variant: "info", Icon: Clock3 },
  SENT: { label: "Enviado", variant: "success", Icon: CheckCircle2 },
  FAILED: { label: "Fallido", variant: "danger", Icon: AlertCircle },
};

function EventStatus({ status }: { status: OutboxStatus }) {
  const { label, variant, Icon } = statusPresentation[status];
  return (
    <Badge variant={variant} aria-label={`Estado: ${label}`}>
      <Icon data-icon="inline-start" aria-hidden />
      {label}
    </Badge>
  );
}

const entityLabels: Record<AuditEntityType, string> = {
  CONTAINER: "Contenedor",
  ENVIRONMENTAL_REPORT: "Expediente ambiental",
  ENVIRONMENTAL_INSPECTION: "Inspección ambiental",
  VIOLATION_NOTICE: "Acta",
  REPAIR_REQUEST: "Solicitud de reparación",
  STREET_CLOSURE_REQUEST: "Solicitud de corte de calle",
  TREE_INTERVENTION: "Intervención de arbolado",
  SERVICE: "Servicio",
  CREW: "Cuadrilla",
  ZONE: "Zona",
  VEHICLE: "Vehículo",
  ROUTE: "Recorrido",
};

const roleLabels: Record<M6Role, string> = {
  M6_ADMIN: "Administrador",
  M6_OFICINA_OPERACIONES: "Operaciones",
  M6_OFICINA_AMBIENTAL: "Oficina ambiental",
  M6_CAMPO_CUADRILLA: "Cuadrilla",
  M6_CAMPO_INSPECTOR: "Inspector",
  M6_AUDITOR: "Auditor",
};

function eventActivityHref(event: Pick<OutboxEvent, "aggregateType" | "aggregateId">): string | null {
  if (!AUDIT_ENTITY_TYPES.some((entityType) => entityType === event.aggregateType)) return null;
  const params = new URLSearchParams({
    tab: "activity",
    entityType: event.aggregateType,
    entityId: event.aggregateId,
  });
  return `/app/admin/integration-monitor?${params.toString()}`;
}

function auditActivityHref(entry: Pick<AuditEntry, "entityType" | "entityId">): string {
  const params = new URLSearchParams({
    tab: "activity",
    entityType: entry.entityType,
    entityId: entry.entityId,
  });
  return `/app/admin/integration-monitor?${params.toString()}`;
}

function AuditEntityLink({ entry }: { entry: AuditEntry }) {
  return (
    <Button
      variant="link"
      size="sm"
      nativeButton={false}
      role="link"
      aria-label={`Ver actividad de ${entityLabels[entry.entityType]} ${entry.entityId}`}
      render={<Link href={auditActivityHref(entry)} />}
    >
      {entityLabels[entry.entityType]}
    </Button>
  );
}

function AuditLabel({ value, showRawCode }: { value: { label: string; rawCode: string | null }; showRawCode: boolean }) {
  return (
    <>
      {value.label}
      {showRawCode && value.rawCode ? (
        <span className="block break-all text-xs font-normal text-muted-foreground">Código: {value.rawCode}</span>
      ) : null}
    </>
  );
}

function eventQuery(filters: EventFilters, page: number): string {
  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (filters.status) params.set("status", filters.status);
  if (filters.eventType) params.set("eventType", filters.eventType);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return params.toString();
}

function auditQuery(filters: AuditFilters, page: number): string {
  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (filters.entityType) params.set("entityType", filters.entityType);
  if (filters.entityId) params.set("entityId", filters.entityId);
  return params.toString();
}

function EventActions({ event, canManage, onOpenDetail }: {
  event: OutboxEvent;
  canManage: boolean;
  onOpenDetail: (event: OutboxEvent) => void;
}) {
  const activityHref = eventActivityHref(event);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {canManage ? (
        <Button type="button" variant="outline" size="sm" aria-label={`Ver detalle de ${event.eventType}`} onClick={() => onOpenDetail(event)}>
          Ver detalle
        </Button>
      ) : null}
      {activityHref ? (
        <Button variant="link" size="sm" nativeButton={false} role="link" aria-label={`Ver actividad de ${entityLabels[event.aggregateType as AuditEntityType]}`} render={<Link href={activityHref} />}>
          Ver actividad
        </Button>
      ) : null}
    </div>
  );
}

export function IntegrationMonitor({
  canManage,
  initialTab = "events",
  initialEntityType,
  initialEntityId,
}: IntegrationMonitorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<MonitorTab>(initialTab);
  const [eventDraft, setEventDraft] = useState({ status: "", eventType: "", from: "", to: "" });
  const [eventFilters, setEventFilters] = useState<EventFilters>({});
  const [eventPageNumber, setEventPageNumber] = useState(1);
  const [eventResult, setEventResult] = useState<{ key: string; page?: OutboxPage; error?: string } | null>(null);
  const [failedCountResult, setFailedCountResult] = useState<{ version: number; count?: number; error?: string } | null>(null);
  const [auditDraft, setAuditDraft] = useState({ entityType: initialEntityType ?? "", entityId: initialEntityId ?? "" });
  const [auditFilters, setAuditFilters] = useState<AuditFilters>({
    entityType: initialEntityType,
    entityId: initialEntityId,
  });
  const [auditPageNumber, setAuditPageNumber] = useState(1);
  const [auditResult, setAuditResult] = useState<{ key: string; page?: AuditPage; error?: string } | null>(null);
  const [auditFilterError, setAuditFilterError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedEvent, setSelectedEvent] = useState<OutboxEvent | null>(null);
  const [detailResult, setDetailResult] = useState<{ key: string; detail?: OutboxDetail; error?: string } | null>(null);
  const [bulkLimit, setBulkLimit] = useState("20");
  const [savingRetry, setSavingRetry] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const datesInvalid = Boolean(eventDraft.from && eventDraft.to && eventDraft.from > eventDraft.to);
  const bulkLimitValue = Number(bulkLimit);
  const bulkLimitInvalid = !Number.isInteger(bulkLimitValue) || bulkLimitValue < 1 || bulkLimitValue > 100;
  const eventRequest = eventQuery(eventFilters, eventPageNumber);
  const eventRequestKey = `${eventRequest}:${refreshVersion}`;
  const auditRequest = auditQuery(auditFilters, auditPageNumber);
  const auditRequestKey = `${auditRequest}:${refreshVersion}`;

  useEffect(() => {
    const controller = new AbortController();
    void readApiJson(`/api/events/outbox?${eventRequest}`, outboxPageSchema, { signal: controller.signal })
      .then((page) => setEventResult({ key: eventRequestKey, page }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setEventResult({
          key: eventRequestKey,
          error: error instanceof Error ? error.message : "No se pudieron cargar los eventos salientes.",
        });
      });
    return () => controller.abort();
  }, [eventRequest, eventRequestKey]);

  useEffect(() => {
    const controller = new AbortController();
    void readApiJson(`/api/events/outbox?${new URLSearchParams({ status: "FAILED", page: "1", pageSize: "1" })}`, outboxPageSchema, { signal: controller.signal })
      .then((page) => setFailedCountResult({ version: refreshVersion, count: page.meta.total }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setFailedCountResult({
          version: refreshVersion,
          error: error instanceof Error ? error.message : "No se pudo cargar el total de eventos fallidos.",
        });
      });
    return () => controller.abort();
  }, [refreshVersion]);

  useEffect(() => {
    if (activeTab !== "activity") return;
    const controller = new AbortController();
    void readApiJson(`/api/audit?${auditRequest}`, auditPageSchema, { signal: controller.signal })
      .then((page) => setAuditResult({ key: auditRequestKey, page }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setAuditResult({
          key: auditRequestKey,
          error: error instanceof Error ? error.message : "No se pudo cargar el registro de actividad.",
        });
      });
    return () => controller.abort();
  }, [activeTab, auditRequest, auditRequestKey]);

  useEffect(() => {
    if (dialogMode !== "detail" || !selectedEvent) return;
    const controller = new AbortController();
    void readApiJson(`/api/events/outbox/${encodeURIComponent(selectedEvent.id)}`, outboxDetailSchema, { signal: controller.signal })
      .then((detail) => setDetailResult({ key: selectedEvent.id, detail }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setDetailResult({
          key: selectedEvent.id,
          error: error instanceof Error ? error.message : "No se pudo cargar el detalle del evento.",
        });
      });
    return () => controller.abort();
  }, [dialogMode, selectedEvent]);

  function updateActivityUrl(tab: MonitorTab, filters: AuditFilters) {
    const params = new URLSearchParams();
    if (tab === "activity") params.set("tab", "activity");
    if (filters.entityType) params.set("entityType", filters.entityType);
    if (filters.entityId) params.set("entityId", filters.entityId);
    router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
  }

  function changeTab(value: string | null) {
    const tab: MonitorTab = value === "activity" ? "activity" : "events";
    setActiveTab(tab);
    updateActivityUrl(tab, auditFilters);
  }

  function applyEventFilters() {
    if (datesInvalid) return;
    setEventFilters({
      status: eventDraft.status ? eventDraft.status as OutboxStatus : undefined,
      eventType: eventDraft.eventType.trim() || undefined,
      from: eventDraft.from || undefined,
      to: eventDraft.to || undefined,
    });
    setEventPageNumber(1);
    setAnnouncement("");
  }

  function clearEventFilters() {
    setEventDraft({ status: "", eventType: "", from: "", to: "" });
    setEventFilters({});
    setEventPageNumber(1);
    setAnnouncement("");
  }

  function applyAuditFilters() {
    const parsed = auditQuerySchema.safeParse({
      entityType: auditDraft.entityType || undefined,
      entityId: auditDraft.entityId.trim() || undefined,
    });
    if (!parsed.success) {
      setAuditFilterError("Ingrese un identificador válido para filtrar la actividad.");
      return;
    }
    const filters = {
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
    };
    setAuditFilters(filters);
    setAuditPageNumber(1);
    setAuditFilterError(null);
    setAnnouncement("");
    updateActivityUrl("activity", filters);
  }

  function clearAuditFilters() {
    const filters: AuditFilters = {};
    setAuditDraft({ entityType: "", entityId: "" });
    setAuditFilters(filters);
    setAuditPageNumber(1);
    setAuditFilterError(null);
    updateActivityUrl("activity", filters);
  }

  function openEventDetail(event: OutboxEvent) {
    setSelectedEvent(event);
    setDetailResult(null);
    setDialogMode("detail");
    setRequestError(null);
    setAnnouncement("");
  }

  function closeDialog() {
    setDialogMode(null);
    setSelectedEvent(null);
    setDetailResult(null);
    setRequestError(null);
    setSavingRetry(false);
  }

  function beginSingleRetry() {
    setDetailResult(null);
    setDialogMode("single-confirm");
    setRequestError(null);
  }

  function beginBulkRetry() {
    setBulkLimit("20");
    setDialogMode("bulk-confirm");
    setSelectedEvent(null);
    setDetailResult(null);
    setRequestError(null);
    setAnnouncement("");
  }

  async function confirmRetry() {
    if (!selectedEvent) return;
    setSavingRetry(true);
    setRequestError(null);
    try {
      await readApiJson(`/api/events/outbox/${encodeURIComponent(selectedEvent.id)}/retry`, outboxEventSchema, { method: "POST" });
      setAnnouncement("El evento se reencoló y ahora está pendiente.");
      closeDialog();
      setRefreshVersion((version) => version + 1);
    } catch (error) {
      const message = error instanceof ApiRequestError && error.status === 409
        ? "El evento ya no está fallido o hubo otro reintento en curso. Actualice la lista y revise su estado."
        : error instanceof Error ? error.message : "No se pudo reintentar el evento. Actualice la lista e intente nuevamente.";
      closeDialog();
      setRequestError(message);
    }
  }

  async function confirmBulkRetry() {
    if (bulkLimitInvalid) return;
    setSavingRetry(true);
    setRequestError(null);
    try {
      const result = await readApiJson("/api/events/outbox/retry-failed", retryFailedResponseSchema, {
        method: "POST",
        headers: { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
        body: JSON.stringify({ confirm: true, limit: bulkLimitValue }),
      });
      const retryVerb = result.requeued === 1 ? "Se reencoló" : "Se reencolaron";
      const requeuedLabel = result.requeued === 1 ? "evento" : "eventos";
      const remainingMessage = result.remainingFailed === 0
        ? "no quedan eventos fallidos"
        : result.remainingFailed === 1
          ? "queda 1 evento fallido"
          : `quedan ${result.remainingFailed} eventos fallidos`;
      setAnnouncement(`${retryVerb} ${result.requeued} ${requeuedLabel}; ${remainingMessage}.`);
      closeDialog();
      setRefreshVersion((version) => version + 1);
    } catch (error) {
      const message = error instanceof ApiRequestError && error.status === 409
        ? "Otro reintento cambió los eventos. Actualice la lista y vuelva a revisar el contador."
        : error instanceof Error ? error.message : "No se pudieron reintentar los eventos. Actualice la lista e intente nuevamente.";
      closeDialog();
      setRequestError(message);
    }
  }

  const eventRequestMatches = eventResult?.key === eventRequestKey;
  const eventPage = eventRequestMatches ? eventResult.page ?? null : null;
  const eventsLoading = !eventRequestMatches;
  const eventsError = eventRequestMatches ? eventResult.error ?? null : null;
  const failedCountMatches = failedCountResult?.version === refreshVersion;
  const failedCount = failedCountMatches ? failedCountResult.count ?? null : null;
  const failedCountError = failedCountMatches ? failedCountResult.error ?? null : null;
  const auditRequestMatches = auditResult?.key === auditRequestKey;
  const auditPage = auditRequestMatches ? auditResult.page ?? null : null;
  const auditLoading = activeTab === "activity" && !auditRequestMatches;
  const auditError = auditRequestMatches ? auditResult.error ?? null : null;
  const detailRequestMatches = selectedEvent !== null && detailResult?.key === selectedEvent.id;
  const eventDetail = detailRequestMatches ? detailResult.detail ?? null : null;
  const detailLoading = dialogMode === "detail" && selectedEvent !== null && !detailRequestMatches;
  const detailError = detailRequestMatches ? detailResult.error ?? null : null;
  const eventRows = eventPage?.data ?? [];
  const auditRows = auditPage?.data ?? [];
  const eventMeta = eventPage?.meta;
  const auditMeta = auditPage?.meta;
  const eventStart = eventMeta && eventMeta.total > 0 ? (eventMeta.page - 1) * eventMeta.pageSize + 1 : 0;
  const eventEnd = eventMeta ? Math.min(eventMeta.page * eventMeta.pageSize, eventMeta.total) : 0;
  const auditStart = auditMeta && auditMeta.total > 0 ? (auditMeta.page - 1) * auditMeta.pageSize + 1 : 0;
  const auditEnd = auditMeta ? Math.min(auditMeta.page * auditMeta.pageSize, auditMeta.total) : 0;

  return (
    <section aria-labelledby="integration-monitor-title" className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 id="integration-monitor-title" className="text-2xl font-bold tracking-tight">Conexiones con otras áreas</h1>
      </header>

      <Tabs value={activeTab} onValueChange={changeTab} className="min-w-0">
        <TabsList className="w-full min-[761px]:w-fit">
          <TabsTrigger value="events" className="text-foreground">Eventos salientes</TabsTrigger>
          <TabsTrigger value="activity" className="text-foreground">Registro de actividad</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="flex min-w-0 flex-col gap-4 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p aria-label="Eventos fallidos" className="text-sm">
              <strong className="tabular-nums">{failedCount ?? "—"}</strong> {failedCount === 1 ? "evento fallido" : "eventos fallidos"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setRefreshVersion((version) => version + 1)}>
                <RefreshCw data-icon="inline-start" aria-hidden />
                Actualizar lista
              </Button>
              {canManage ? (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  aria-label="Reintentar eventos fallidos"
                  disabled={failedCount === null || failedCount === 0 || savingRetry}
                  onClick={beginBulkRetry}
                >
                  <RefreshCw data-icon="inline-start" aria-hidden />
                  Reintentar fallidos
                </Button>
              ) : null}
            </div>
          </div>

          {failedCountError ? <p className="text-sm text-destructive">{failedCountError}</p> : null}

          <FieldGroup className="grid grid-cols-1 gap-3 min-[761px]:grid-cols-2 min-[1024px]:grid-cols-4">
            <Field>
              <FieldLabel htmlFor="outbox-status">Estado</FieldLabel>
              <Select value={eventDraft.status || "all"} onValueChange={(value) => setEventDraft((current) => ({ ...current, status: value && value !== "all" ? value : "" }))}>
                <SelectTrigger id="outbox-status" aria-label="Estado">
                  <SelectValue>{eventDraft.status ? statusPresentation[eventDraft.status as OutboxStatus].label : "Todos"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todos</SelectItem>
                    {OUTBOX_STATUSES.map((status) => <SelectItem key={status} value={status}>{statusPresentation[status].label}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="outbox-event-type">Tipo de evento</FieldLabel>
              <Input
                id="outbox-event-type"
                value={eventDraft.eventType}
                maxLength={100}
                autoComplete="off"
                placeholder="p. ej., containerDamaged"
                onChange={(event) => setEventDraft((current) => ({ ...current, eventType: event.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="outbox-from">Desde</FieldLabel>
              <DatePicker
                id="outbox-from"
                value={eventDraft.from}
                onChange={(from) => setEventDraft((current) => ({ ...current, from }))}
                max={eventDraft.to || undefined}
                invalid={datesInvalid}
                aria-label="Desde"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="outbox-to">Hasta</FieldLabel>
              <DatePicker
                id="outbox-to"
                value={eventDraft.to}
                onChange={(to) => setEventDraft((current) => ({ ...current, to }))}
                min={eventDraft.from || undefined}
                invalid={datesInvalid}
                aria-label="Hasta"
              />
              {datesInvalid ? <FieldError>La fecha inicial no puede ser posterior a la fecha final.</FieldError> : null}
            </Field>
          </FieldGroup>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={applyEventFilters} disabled={datesInvalid}>Aplicar filtros</Button>
            <Button type="button" variant="outline" onClick={clearEventFilters}>Limpiar filtros</Button>
          </div>

          {requestError ? (
            <Alert variant="danger">
              <AlertCircle aria-hidden />
              <AlertTitle>No se pudo completar el reintento</AlertTitle>
              <AlertDescription>{requestError}</AlertDescription>
            </Alert>
          ) : null}

          {eventsLoading ? (
            <div role="status" aria-label="Cargando eventos salientes" className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <span className="sr-only">Cargando eventos salientes.</span>
            </div>
          ) : eventsError ? (
            <Alert variant="danger">
              <AlertCircle aria-hidden />
              <AlertTitle>No se pudieron cargar los eventos</AlertTitle>
              <AlertDescription>{eventsError} Actualice la lista para volver a intentar.</AlertDescription>
            </Alert>
          ) : eventRows.length === 0 ? (
            <Empty className="border border-dashed border-border">
              <EmptyHeader>
                <EmptyTitle>{Object.values(eventFilters).some(Boolean) ? "No hay eventos con esos filtros" : "No hay eventos salientes"}</EmptyTitle>
                <EmptyDescription>{Object.values(eventFilters).some(Boolean) ? "Cambie o limpie los filtros para ver otros eventos." : "Los eventos enviados aparecerán aquí."}</EmptyDescription>
              </EmptyHeader>
              {Object.values(eventFilters).some(Boolean) ? (
                <EmptyContent><Button type="button" variant="outline" onClick={clearEventFilters}>Limpiar filtros</Button></EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <>
              <div className={styles.desktopLayout}>
                <Table aria-label="Eventos salientes" className="min-w-[58rem]">
                  <TableCaption className="sr-only">Eventos salientes, del más reciente al más antiguo</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Tipo</TableHead>
                      <TableHead scope="col">Estado</TableHead>
                      <TableHead scope="col">Ocurrido</TableHead>
                      <TableHead scope="col">Intentos</TableHead>
                      <TableHead scope="col">Último error</TableHead>
                      <TableHead scope="col">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventRows.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.eventType}</TableCell>
                        <TableCell><EventStatus status={event.status} /></TableCell>
                        <TableCell className="tabular-nums">{dateTime(event.occurredAt)}</TableCell>
                        <TableCell className="tabular-nums">{event.attempts}</TableCell>
                        <TableCell><span className="block max-w-56 truncate" title={event.lastError ?? undefined}>{event.lastError ?? "—"}</span></TableCell>
                        <TableCell><EventActions event={event} canManage={canManage} onOpenDetail={openEventDetail} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul aria-label="Eventos salientes" className={`${styles.mobileLayout} flex flex-col divide-y divide-border`}>
                {eventRows.map((event) => (
                  <li key={event.id} className="flex min-w-0 flex-col gap-2 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="min-w-0 break-all font-medium">{event.eventType}</span>
                      <EventStatus status={event.status} />
                    </div>
                    <p className="text-sm tabular-nums">{dateTime(event.occurredAt)} · Intentos: {event.attempts}</p>
                    {event.lastError ? <p className="break-words text-sm text-muted-foreground">{event.lastError}</p> : null}
                    <EventActions event={event} canManage={canManage} onOpenDetail={openEventDetail} />
                  </li>
                ))}
              </ul>
              <nav aria-label="Paginación de eventos" className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Mostrando {eventStart}–{eventEnd} de {eventMeta?.total ?? 0}</p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" aria-label="Página anterior" disabled={eventPageNumber <= 1} onClick={() => setEventPageNumber((page) => Math.max(1, page - 1))}>Anterior</Button>
                  <span className="text-sm tabular-nums">Página {eventPageNumber} de {Math.max(1, eventMeta?.totalPages ?? 1)}</span>
                  <Button type="button" variant="outline" size="sm" aria-label="Página siguiente" disabled={eventPageNumber >= (eventMeta?.totalPages ?? 1)} onClick={() => setEventPageNumber((page) => page + 1)}>Siguiente</Button>
                </div>
              </nav>
            </>
          )}
        </TabsContent>

        <TabsContent value="activity" className="flex min-w-0 flex-col gap-4 pt-3">
          <FieldGroup className="grid grid-cols-1 gap-3 min-[761px]:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="audit-entity-type">Tipo de entidad</FieldLabel>
              <Select value={auditDraft.entityType || "all"} onValueChange={(value) => setAuditDraft((current) => ({ ...current, entityType: value && value !== "all" ? value as AuditEntityType : "" }))}>
                <SelectTrigger id="audit-entity-type" aria-label="Tipo de entidad">
                  <SelectValue>{auditDraft.entityType ? entityLabels[auditDraft.entityType as AuditEntityType] : "Todos"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todos</SelectItem>
                    {AUDIT_ENTITY_TYPES.map((entityType) => <SelectItem key={entityType} value={entityType}>{entityLabels[entityType]}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="audit-entity-id">Identificador de entidad</FieldLabel>
              <Input
                id="audit-entity-id"
                value={auditDraft.entityId}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(auditFilterError) || undefined}
                aria-describedby={auditFilterError ? "audit-filter-error" : undefined}
                onChange={(event) => setAuditDraft((current) => ({ ...current, entityId: event.target.value }))}
              />
              <FieldDescription>Use el identificador completo para seguir una entidad.</FieldDescription>
              {auditFilterError ? <FieldError id="audit-filter-error">{auditFilterError}</FieldError> : null}
            </Field>
          </FieldGroup>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={applyAuditFilters}>Aplicar filtros de actividad</Button>
            <Button type="button" variant="outline" onClick={clearAuditFilters}>Limpiar filtros</Button>
            <Button type="button" variant="outline" onClick={() => setRefreshVersion((version) => version + 1)}>Actualizar registro</Button>
          </div>

          {auditLoading ? (
            <div role="status" aria-label="Cargando actividad" className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <span className="sr-only">Cargando registro de actividad.</span>
            </div>
          ) : auditError ? (
            <Alert variant="danger">
              <AlertCircle aria-hidden />
              <AlertTitle>No se pudo cargar el registro de actividad</AlertTitle>
              <AlertDescription>{auditError} Actualice el registro para volver a intentar.</AlertDescription>
            </Alert>
          ) : auditRows.length === 0 ? (
            <Empty className="border border-dashed border-border">
              <EmptyHeader>
                <EmptyTitle>{Object.values(auditFilters).some(Boolean) ? "No hay actividad para esos filtros" : "No hay actividad registrada"}</EmptyTitle>
                <EmptyDescription>{Object.values(auditFilters).some(Boolean) ? "Cambie o limpie los filtros para ver otros registros." : "Los cambios registrados aparecerán aquí."}</EmptyDescription>
              </EmptyHeader>
              {Object.values(auditFilters).some(Boolean) ? (
                <EmptyContent><Button type="button" variant="outline" onClick={clearAuditFilters}>Limpiar filtros</Button></EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <>
              <div className={styles.desktopLayout}>
                <Table aria-label="Registro de actividad" className="min-w-[72rem]">
                  <TableCaption className="sr-only">Registro de actividad, del más reciente al más antiguo</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Acción</TableHead>
                      <TableHead scope="col">Entidad</TableHead>
                      <TableHead scope="col">Estado anterior</TableHead>
                      <TableHead scope="col">Estado nuevo</TableHead>
                      <TableHead scope="col">Persona y roles</TableHead>
                      <TableHead scope="col">Nota</TableHead>
                      <TableHead scope="col">Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditRows.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium"><AuditLabel value={auditActionLabel(entry.action)} showRawCode={canManage} /></TableCell>
                        <TableCell>
                          <AuditEntityLink entry={entry} />
                          <span className="block max-w-40 break-all text-xs text-muted-foreground">{entry.entityId}</span>
                        </TableCell>
                        <TableCell><AuditLabel value={auditStatusLabel(entry.entityType, entry.fromStatus)} showRawCode={canManage} /></TableCell>
                        <TableCell><AuditLabel value={auditStatusLabel(entry.entityType, entry.toStatus)} showRawCode={canManage} /></TableCell>
                        <TableCell>
                          <span className="block">{entry.actorUserId}</span>
                          <span className="block text-xs text-muted-foreground">{entry.actorRoles.map((role) => roleLabels[role as M6Role] ?? "Otro perfil").join(", ")}</span>
                        </TableCell>
                        <TableCell><span className="block max-w-48 whitespace-normal">{entry.note ?? "—"}</span></TableCell>
                        <TableCell className="tabular-nums">{dateTime(entry.occurredAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul aria-label="Registro de actividad" className={`${styles.mobileLayout} flex flex-col divide-y divide-border`}>
                {auditRows.map((entry) => (
                  <li key={entry.id} className="flex min-w-0 flex-col gap-2 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="font-medium"><AuditLabel value={auditActionLabel(entry.action)} showRawCode={canManage} /></span>
                      <time className="text-sm tabular-nums" dateTime={entry.occurredAt}>{dateTime(entry.occurredAt)}</time>
                    </div>
                    <p className="flex flex-wrap items-baseline gap-1 break-all text-sm">
                      <AuditEntityLink entry={entry} />
                      <span>{entry.entityId}</span>
                    </p>
                    <p className="text-sm"><AuditLabel value={auditStatusLabel(entry.entityType, entry.fromStatus)} showRawCode={canManage} /> → <AuditLabel value={auditStatusLabel(entry.entityType, entry.toStatus)} showRawCode={canManage} /></p>
                    <p className="text-sm">Persona {entry.actorUserId} · {entry.actorRoles.map((role) => roleLabels[role as M6Role] ?? "Otro perfil").join(", ")}</p>
                    {entry.note ? <p className="break-words text-sm text-muted-foreground">{entry.note}</p> : null}
                  </li>
                ))}
              </ul>
              <nav aria-label="Paginación del registro de actividad" className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Mostrando {auditStart}–{auditEnd} de {auditMeta?.total ?? 0}</p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" aria-label="Página anterior" disabled={auditPageNumber <= 1} onClick={() => setAuditPageNumber((page) => Math.max(1, page - 1))}>Anterior</Button>
                  <span className="text-sm tabular-nums">Página {auditPageNumber} de {Math.max(1, auditMeta?.totalPages ?? 1)}</span>
                  <Button type="button" variant="outline" size="sm" aria-label="Página siguiente" disabled={auditPageNumber >= (auditMeta?.totalPages ?? 1)} onClick={() => setAuditPageNumber((page) => page + 1)}>Siguiente</Button>
                </div>
              </nav>
            </>
          )}
        </TabsContent>
      </Tabs>

      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>

      <Dialog open={dialogMode !== null} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-3xl">
          {dialogMode === "detail" ? (
            <>
              <DialogHeader>
                <DialogTitle>Detalle del evento</DialogTitle>
                <DialogDescription>{selectedEvent?.eventType} · {selectedEvent ? dateTime(selectedEvent.occurredAt) : ""}</DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-3">
                {detailLoading ? <p role="status">Cargando detalle del evento.</p> : null}
                {detailError ? <Alert variant="danger"><AlertTitle>No se pudo cargar el detalle</AlertTitle><AlertDescription>{detailError}</AlertDescription></Alert> : null}
                {eventDetail ? (
                  <>
                    <dl className="grid grid-cols-1 gap-3 min-[761px]:grid-cols-2">
                      <div><dt className="text-sm font-medium">Identificador del evento</dt><dd className="break-all text-sm tabular-nums">{eventDetail.id}</dd></div>
                      <div><dt className="text-sm font-medium">Estado</dt><dd><EventStatus status={eventDetail.status} /></dd></div>
                      <div><dt className="text-sm font-medium">Entidad</dt><dd className="text-sm">{entityLabels[eventDetail.aggregateType as AuditEntityType] ?? "Registro"}</dd></div>
                      <div><dt className="text-sm font-medium">Identificador de entidad</dt><dd className="break-all text-sm tabular-nums">{eventDetail.aggregateId}</dd></div>
                    </dl>
                    {eventDetail.status === "FAILED" && canManage ? (
                      <Button type="button" onClick={beginSingleRetry}>Reintentar evento</Button>
                    ) : null}
                    <section aria-labelledby="event-payload-title" className="flex flex-col gap-2">
                      <h2 id="event-payload-title" className="text-base font-semibold">Contenido enviado</h2>
                      <pre aria-label="Contenido del evento" className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md border border-border bg-muted p-3 font-mono text-xs">{JSON.stringify(eventDetail.payload, null, 2)}</pre>
                    </section>
                    <section aria-labelledby="event-retries-title" className="flex flex-col gap-2">
                      <h2 id="event-retries-title" className="text-base font-semibold">Reintentos manuales ({eventDetail.retries.length})</h2>
                      {eventDetail.retries.length === 0 ? <p className="text-sm text-muted-foreground">No se registraron reintentos manuales.</p> : (
                        <ul className="flex flex-col divide-y divide-border">
                          {eventDetail.retries.map((retry) => (
                            <li key={retry.id} className="flex flex-col gap-1 py-2 text-sm">
                              <p>Persona {retry.actorUserId} · {dateTime(retry.at)}</p>
                              <p>Intentos anteriores: {retry.previousAttempts}</p>
                              {retry.previousError ? <p className="break-words text-muted-foreground">Error anterior: {retry.previousError}</p> : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </>
                ) : null}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>Cerrar</Button>
              </DialogFooter>
            </>
          ) : dialogMode === "single-confirm" ? (
            <>
              <DialogHeader>
                <DialogTitle>Confirmar reintento</DialogTitle>
                <DialogDescription>Se volverá a enviar el mismo identificador del evento. Esta acción no corrige un contenido que el sistema receptor haya rechazado.</DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto py-3">
                <p className="break-all text-sm">{selectedEvent?.id}</p>
              </div>
              <DialogFooter className="[@media(width<640px)]:!flex-col">
                <Button type="button" variant="outline" onClick={closeDialog} disabled={savingRetry}>Cancelar</Button>
                <Button type="button" onClick={() => void confirmRetry()} disabled={savingRetry}>
                  {savingRetry ? "Reintentando…" : "Confirmar reintento"}
                </Button>
              </DialogFooter>
            </>
          ) : dialogMode === "bulk-confirm" ? (
            <>
              <DialogHeader>
                <DialogTitle>Reintentar eventos fallidos</DialogTitle>
                <DialogDescription>Cada evento se enviará con el mismo identificador. El reintento no corrige un contenido que el sistema receptor haya rechazado.</DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto py-3">
                <Field>
                  <FieldLabel htmlFor="bulk-retry-limit">Límite de reintentos</FieldLabel>
                  <Input
                    id="bulk-retry-limit"
                    type="number"
                    min={1}
                    max={100}
                    value={bulkLimit}
                    aria-invalid={bulkLimitInvalid || undefined}
                    onChange={(event) => setBulkLimit(event.target.value)}
                  />
                  <FieldDescription>Se procesarán hasta {bulkLimit || "0"} eventos fallidos, del más antiguo al más reciente.</FieldDescription>
                  {bulkLimitInvalid ? <FieldError>Ingrese un número entero entre 1 y 100.</FieldError> : null}
                </Field>
              </div>
              <DialogFooter className="[@media(width<640px)]:!flex-col">
                <Button type="button" variant="outline" onClick={closeDialog} disabled={savingRetry}>Cancelar</Button>
                <Button type="button" onClick={() => void confirmBulkRetry()} disabled={savingRetry || bulkLimitInvalid}>
                  {savingRetry ? "Reintentando…" : "Confirmar reintento masivo"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
