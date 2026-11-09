"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompactPager } from "@/components/ui/compact-pager";
import { DatePicker } from "@/components/ui/date-picker";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { INBOX_STATUSES, inboxPageSchema, sourceModuleLabel, type InboxEvent, type InboxPage } from "@/lib/integration-monitor";

import { dateTime, readApiJson } from "./integration-monitor-client";
import styles from "./integration-monitor.module.css";

type InboxStatus = (typeof INBOX_STATUSES)[number];
type InboxFilters = { status?: InboxStatus; eventType?: string; from?: string; to?: string };

const statusPresentation: Record<InboxStatus, { label: string; variant: "info" | "success" | "danger"; Icon: typeof Clock3 }> = {
  processed: { label: "Procesado", variant: "success", Icon: CheckCircle2 },
  failed: { label: "Fallido", variant: "danger", Icon: AlertCircle },
  pending: { label: "En curso", variant: "info", Icon: Clock3 },
};

function InboxStatusBadge({ status }: { status: InboxStatus }) {
  const { label, variant, Icon } = statusPresentation[status];
  return (
    <Badge variant={variant} aria-label={`Estado: ${label}`}>
      <Icon data-icon="inline-start" aria-hidden />
      {label}
    </Badge>
  );
}

function inboxQuery(filters: InboxFilters, page: number): string {
  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (filters.status) params.set("status", filters.status);
  if (filters.eventType) params.set("eventType", filters.eventType);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return params.toString();
}

/** Código corto del seguimiento; el completo queda en `title` para copiarlo. */
function TrackingId({ value }: { value: InboxEvent["correlationId"] }) {
  if (!value) return <>—</>;
  return <span className="tabular-nums" title={value}>{value.slice(0, 8)}</span>;
}

export function InboxEventsPanel({ active }: { active: boolean }) {
  const [draft, setDraft] = useState({ status: "", eventType: "", from: "", to: "" });
  const [filters, setFilters] = useState<InboxFilters>({});
  const [pageNumber, setPageNumber] = useState(1);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [result, setResult] = useState<{ key: string; page?: InboxPage; error?: string } | null>(null);

  const datesInvalid = Boolean(draft.from && draft.to && draft.from > draft.to);
  const request = inboxQuery(filters, pageNumber);
  const requestKey = `${request}:${refreshVersion}`;

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void readApiJson(`/api/events/inbox?${request}`, inboxPageSchema, { signal: controller.signal })
      .then((page) => setResult({ key: requestKey, page }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setResult({
          key: requestKey,
          error: error instanceof Error ? error.message : "No se pudieron cargar los eventos recibidos.",
        });
      });
    return () => controller.abort();
  }, [active, request, requestKey]);

  function applyFilters() {
    if (datesInvalid) return;
    setFilters({
      status: draft.status ? draft.status as InboxStatus : undefined,
      eventType: draft.eventType.trim() || undefined,
      from: draft.from || undefined,
      to: draft.to || undefined,
    });
    setPageNumber(1);
  }

  function clearFilters() {
    setDraft({ status: "", eventType: "", from: "", to: "" });
    setFilters({});
    setPageNumber(1);
  }

  const matches = result?.key === requestKey;
  const loading = active && !matches;
  const error = matches ? result.error ?? null : null;
  const page = matches ? result.page ?? null : null;
  const rows = page?.data ?? [];
  const meta = page?.meta;
  const start = meta && meta.total > 0 ? (meta.page - 1) * meta.pageSize + 1 : 0;
  const end = meta ? Math.min(meta.page * meta.pageSize, meta.total) : 0;
  const filtered = Object.values(filters).some(Boolean);

  return (
    <>
      <FieldGroup className="grid grid-cols-1 gap-3 min-[761px]:grid-cols-2 min-[1024px]:grid-cols-4">
        <Field>
          <FieldLabel htmlFor="inbox-status">Estado</FieldLabel>
          <Select value={draft.status || "all"} onValueChange={(value) => setDraft((current) => ({ ...current, status: value && value !== "all" ? value : "" }))}>
            <SelectTrigger id="inbox-status" aria-label="Estado de eventos recibidos">
              <SelectValue>{draft.status ? statusPresentation[draft.status as InboxStatus].label : "Todos"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Todos</SelectItem>
                {INBOX_STATUSES.map((status) => <SelectItem key={status} value={status}>{statusPresentation[status].label}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="inbox-event-type">Tipo de evento</FieldLabel>
          <Input
            id="inbox-event-type"
            value={draft.eventType}
            maxLength={100}
            autoComplete="off"
            placeholder="p. ej., workOrderCompleted"
            onChange={(event) => setDraft((current) => ({ ...current, eventType: event.target.value }))}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="inbox-from">Recibidos desde</FieldLabel>
          <DatePicker id="inbox-from" value={draft.from} onChange={(from) => setDraft((current) => ({ ...current, from }))} max={draft.to || undefined} invalid={datesInvalid} aria-label="Recibidos desde" />
        </Field>
        <Field>
          <FieldLabel htmlFor="inbox-to">Recibidos hasta</FieldLabel>
          <DatePicker id="inbox-to" value={draft.to} onChange={(to) => setDraft((current) => ({ ...current, to }))} min={draft.from || undefined} invalid={datesInvalid} aria-label="Recibidos hasta" />
          {datesInvalid ? <FieldError>La fecha inicial no puede ser posterior a la fecha final.</FieldError> : null}
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={applyFilters} disabled={datesInvalid}>Aplicar filtros de recibidos</Button>
        <Button type="button" variant="outline" onClick={clearFilters}>Limpiar filtros</Button>
        <Button type="button" variant="outline" onClick={() => setRefreshVersion((version) => version + 1)}>
          <RefreshCw data-icon="inline-start" aria-hidden />
          Actualizar recibidos
        </Button>
      </div>

      {loading ? (
        <div role="status" aria-label="Cargando eventos recibidos" className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <span className="sr-only">Cargando eventos recibidos.</span>
        </div>
      ) : error ? (
        <Alert variant="danger">
          <AlertCircle aria-hidden />
          <AlertTitle>No se pudieron cargar los eventos recibidos</AlertTitle>
          <AlertDescription>{error} Actualice la lista para volver a intentar.</AlertDescription>
        </Alert>
      ) : rows.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyTitle>{filtered ? "No hay eventos recibidos con esos filtros" : "No hay eventos recibidos"}</EmptyTitle>
            <EmptyDescription>{filtered ? "Cambie o limpie los filtros para ver otros eventos." : "Los eventos que lleguen de otras áreas aparecerán aquí."}</EmptyDescription>
          </EmptyHeader>
          {filtered ? <EmptyContent><Button type="button" variant="outline" onClick={clearFilters}>Limpiar filtros</Button></EmptyContent> : null}
        </Empty>
      ) : (
        <>
          <div className={styles.desktopLayout}>
            <Table aria-label="Eventos recibidos" className="min-w-[64rem]">
              <TableCaption className="sr-only">Eventos recibidos, del más reciente al más antiguo</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Tipo</TableHead>
                  <TableHead scope="col">Área emisora</TableHead>
                  <TableHead scope="col">Estado</TableHead>
                  <TableHead scope="col">Recibido</TableHead>
                  <TableHead scope="col">Procesado</TableHead>
                  <TableHead scope="col">Seguimiento</TableHead>
                  <TableHead scope="col">Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((event) => (
                  <TableRow key={event.messageId}>
                    <TableCell className="font-medium">{event.eventType}</TableCell>
                    <TableCell>{sourceModuleLabel(event.sourceModule)}</TableCell>
                    <TableCell><InboxStatusBadge status={event.status} /></TableCell>
                    <TableCell className="tabular-nums">{dateTime(event.receivedAt)}</TableCell>
                    <TableCell className="tabular-nums">{event.processedAt ? dateTime(event.processedAt) : "—"}</TableCell>
                    <TableCell><TrackingId value={event.correlationId} /></TableCell>
                    <TableCell><span className="block max-w-56 truncate" title={event.error ?? undefined}>{event.error ?? "—"}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul aria-label="Eventos recibidos" className={`${styles.mobileLayout} flex flex-col divide-y divide-border`}>
            {rows.map((event) => (
              <li key={event.messageId} className="flex min-w-0 flex-col gap-2 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="min-w-0 break-all font-medium">{event.eventType}</span>
                  <InboxStatusBadge status={event.status} />
                </div>
                <p className="text-sm">{sourceModuleLabel(event.sourceModule)} · <span className="tabular-nums">{dateTime(event.receivedAt)}</span></p>
                {event.processedAt ? <p className="text-sm tabular-nums">Procesado {dateTime(event.processedAt)}</p> : null}
                {event.error ? <p className="break-words text-sm text-muted-foreground">{event.error}</p> : null}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Mostrando {start}–{end} de {meta?.total ?? 0}</p>
            <CompactPager label="Paginación de eventos recibidos" page={pageNumber} totalPages={Math.max(1, meta?.totalPages ?? 1)} onPageChange={setPageNumber} />
          </div>
        </>
      )}
    </>
  );
}
