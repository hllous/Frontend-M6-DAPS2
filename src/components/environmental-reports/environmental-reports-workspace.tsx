"use client";
import { errorMessage as getErrorMessage } from "@/lib/error-message";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  ClipboardCheck,
  CircleAlert,
  CircleCheck,
  Clock3,
  FilePlus2,
  Forward,
  MapPin,
  MessageCircleQuestion,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemGroup } from "@/components/ui/item";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import { formatArgentinaCalendarDate, formatArgentinaNumericDateTime } from "@/lib/argentina-date";
import {
  ENVIRONMENTAL_INSPECTION_OUTCOME_LABELS,
  ENVIRONMENTAL_SEVERITY_LABELS as severityLabels,
  ENVIRONMENTAL_SUGGESTED_ACTION_LABELS as suggestedActionLabels,
  ENVIRONMENTAL_VIOLATION_TYPE_LABELS as violationTypeLabels,
  ENVIRONMENTAL_REPORT_PRIORITY_LABELS,
  ENVIRONMENTAL_REPORT_STATUS_LABELS,
  ENVIRONMENTAL_REPORT_TYPE_LABELS,
  environmentalReportTypeSchema,
  environmentalReportDateRangeSchema,
  issueViolationNoticeInputSchema,
  mergeEnvironmentalReportRead,
  environmentalReportsAdapter,
  EnvironmentalReportRequestError,
  INSPECTION_CHECKLIST_TEMPLATE,
  type IssueViolationNoticeInput,
  type EnvironmentalInspection,
  type EnvironmentalInspectionScheduleInput,
  type EnvironmentalReport,
  type EnvironmentalReportPriority,
  type EnvironmentalReportStatus,
  type EnvironmentalReportType,
  type RequestInformationInput,
  type SanctionOutcomeIntegrationException,
  type ViolationNotice,
} from "@/lib/environmental-reports";
import { establishmentDirectoryAdapter, type Establishment } from "@/lib/establishment-directory";
import { OVERRIDE_NOTE_MAX, OVERRIDE_NOTE_MIN, ServiceRequestError, servicesAdapter, type Service } from "@/lib/services";
import { crewsAdapter, type Crew } from "@/lib/crews";
import { ENVIRONMENTAL_INSPECTION_SERVICE_TYPE_RULE, resolveServiceType } from "@/lib/service-types";
import { zonesAdapter, type Zone } from "@/lib/zones";
import { repairRequestsAdapter, type RepairRequest } from "@/lib/repair-requests";
import { getEnvironmentalReportClosure, SANCTION_DECISION_LABELS, type EnvironmentalReportClosure } from "@/lib/sanction-outcomes";
import type { OperationalScenario } from "@/lib/scenarios";
import { CreateRepairRequestDialog } from "@/components/services/create-repair-request-dialog";
import { RescheduleReasonDialog } from "@/components/services/reschedule-reason-dialog";
import { ConfirmRescheduleDialog } from "@/components/services/confirm-reschedule-dialog";
import { ReportDecisionDialog, type ReportDecision } from "./report-decision-dialog";
import { RequestInformationDialog } from "./request-information-dialog";
import { MAX_SEARCH_LENGTH, parseCoordinateField } from "@/lib/input-limits";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; reports: EnvironmentalReport[]; total: number; totalPages: number; sanctionOutcomeIntegrationExceptions: SanctionOutcomeIntegrationException[] };

type Action = "start-review" | "forward" | "dismiss" | "close";

const reportTypes = environmentalReportTypeSchema.options;
const reportPriorities = Object.keys(ENVIRONMENTAL_REPORT_PRIORITY_LABELS) as EnvironmentalReportPriority[];
const QUEUE_PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;
const reportStatuses = Object.keys(ENVIRONMENTAL_REPORT_STATUS_LABELS) as EnvironmentalReportStatus[];
const ALL_STATUSES_OPTION = "__environmental-report-all-statuses__";

function initialQueueParams() {
  const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const page = Number(params.get("page"));
  const selectedStatuses = params.getAll("status");
  return {
    status: reportStatuses.filter((status) => selectedStatuses.includes(status)),
    type: params.get("type") ?? "",
    priority: params.get("priority") ?? "",
    search: params.get("q") ?? "",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}
// El backend no guarda versión de checklist (el BFF no la reenvía); sólo la usa el modo mock.
const INSPECTION_CHECKLIST_VERSION = "ambiental-v2";

const statusGroups = [
  { label: "Ingreso y revisión", statuses: ["RECEIVED", "UNDER_REVIEW"] as const },
  { label: "Derivación", statuses: ["FORWARDED", "DISMISSED"] as const },
  { label: "Inspección y resultado", statuses: ["INSPECTION_SCHEDULED", "INSPECTED", "NO_VIOLATION", "VIOLATION_FOUND"] as const },
  { label: "Acta y cierre", statuses: ["NOTICE_ISSUED", "SANCTIONED", "CLOSED"] as const },
];

function statusSummary(statuses: EnvironmentalReportStatus[]) {
  const labels = reportStatuses.filter((status) => statuses.includes(status)).map((status) => ENVIRONMENTAL_REPORT_STATUS_LABELS[status]);
  if (labels.length === 0) return "Todos los estados";
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.length} estados`;
}

const statusIcon: Record<EnvironmentalReport["status"], typeof Clock3> = {
  RECEIVED: Clock3,
  UNDER_REVIEW: Search,
  FORWARDED: Forward,
  DISMISSED: X,
  INSPECTION_SCHEDULED: Clock3,
  INSPECTED: Check,
  NO_VIOLATION: CircleCheck,
  VIOLATION_FOUND: ShieldAlert,
  NOTICE_ISSUED: FilePlus2,
  SANCTIONED: ShieldAlert,
  CLOSED: CircleCheck,
};

const statusVariant: Record<EnvironmentalReport["status"], "info" | "success" | "warning" | "danger" | "neutral"> = {
  RECEIVED: "info",
  UNDER_REVIEW: "info",
  FORWARDED: "success",
  DISMISSED: "neutral",
  INSPECTION_SCHEDULED: "warning",
  INSPECTED: "info",
  NO_VIOLATION: "success",
  VIOLATION_FOUND: "danger",
  NOTICE_ISSUED: "warning",
  SANCTIONED: "danger",
  CLOSED: "neutral",
};

function visibleToScenario(report: EnvironmentalReport, scenario: OperationalScenario) {
  return scenario.actor.kind !== "FIELD" || report.assignedCrewId === scenario.actor.crewId;
}

function InformationRequestPending({ report }: { report: EnvironmentalReport }) {
  return (
    <div role="status" aria-label="Información pedida" className="mt-4 space-y-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm">
      <p className="font-semibold text-[var(--color-text)]">Pendiente de respuesta. Si vence, el expediente se desestima.</p>
      {report.informationRequestMessage && <p className="text-[var(--color-text)]">{report.informationRequestMessage}</p>}
      <p className="text-[var(--color-text-secondary)]">Pedido el {formatDate(report.informationRequestedAt)}{report.informationRequestRequiredBy ? ` · Vence ${formatDate(report.informationRequestRequiredBy)}` : ""}</p>
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return formatArgentinaNumericDateTime(value);
}

type SchedulingMode = "schedule" | "reinspection" | "service";

/** Lo necesario para el alta del Servicio POINT de una inspección ya creada (#320). */
type InspectionServiceDraft = {
  inspectionId: string;
  scheduledDate: string;
  timeWindow: { start: string; end: string };
  zoneId: string;
  crewId: string;
  notes?: string;
  /** Mensaje del 409 por cuadrilla o vehículo ocupado: el reintento pide la justificación. */
  conflict?: string;
};

/**
 * La inspección se crea sin agenda: la fecha, la franja y la cuadrilla viven en su
 * Servicio POINT. Sólo el modo mock trae la agenda en la propia inspección.
 */
function inspectionAgenda(inspection: EnvironmentalInspection, service: Service | null | undefined) {
  const day = service?.scheduledDate ?? inspection.scheduledDate;
  const date = day ? formatArgentinaCalendarDate(day) : inspection.inspectedAt ? formatArgentinaNumericDateTime(inspection.inspectedAt) : "—";
  const window = service?.windowFrom ? `${service.windowFrom}–${service.windowTo ?? ""}` : inspection.timeWindow ? `${inspection.timeWindow.start}–${inspection.timeWindow.end}` : "—";
  return `${date} · ${window}`;
}

function reportAddress(report: EnvironmentalReport) {
  return report.address ?? report.location?.address ?? "Sin dirección";
}

function reportDetails(report: EnvironmentalReport) {
  return report.description ?? report.details ?? "Sin detalle.";
}

function StatusBadge({ status }: { status: EnvironmentalReport["status"] }) {
  const Icon = statusIcon[status];
  return (
    <Badge variant={statusVariant[status]} role="status" aria-label={`Estado: ${ENVIRONMENTAL_REPORT_STATUS_LABELS[status]}`}>
      <Icon data-icon="inline-start" aria-hidden />
      {ENVIRONMENTAL_REPORT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function EnvironmentalReportsWorkspace({ scenario }: { scenario: OperationalScenario }) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(() => typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("detail"));
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(() => typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("inspectionId"));
  const [createOpen, setCreateOpen] = useState(false);
  const [initialParams] = useState(initialQueueParams);
  const [filterStatus, setFilterStatus] = useState<EnvironmentalReportStatus[]>(initialParams.status);
  const [filterType, setFilterType] = useState<string>(initialParams.type);
  const [filterPriority, setFilterPriority] = useState<string>(initialParams.priority);
  const [filterFrom, setFilterFrom] = useState(initialParams.from);
  const [filterTo, setFilterTo] = useState(initialParams.to);
  const range = environmentalReportDateRangeSchema.safeParse({ from: filterFrom || undefined, to: filterTo || undefined });
  const rangeError = range.success ? undefined : range.error.issues[0].message;
  const [search, setSearch] = useState(initialParams.search);
  const [debouncedSearch, setDebouncedSearch] = useState(initialParams.search.trim());
  const [queuePage, setQueuePage] = useState(initialParams.page);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // El filtrado y la paginación los resuelve el backend; el navegador sólo recorta por escenario (Field).
  const fetchReports = useCallback(async () => {
    const page = await environmentalReportsAdapter.list({
      page: queuePage,
      pageSize: QUEUE_PAGE_SIZE,
      status: filterStatus.length > 0 ? filterStatus : undefined,
      reportType: (filterType || undefined) as EnvironmentalReportType | undefined,
      priority: (filterPriority || undefined) as EnvironmentalReportPriority | undefined,
      search: debouncedSearch || undefined,
      from: filterFrom || undefined,
      to: filterTo || undefined,
    });
    return {
      reports: page.environmentalReports.filter((report) => visibleToScenario(report, scenario)),
      total: page.total,
      totalPages: page.totalPages,
      sanctionOutcomeIntegrationExceptions: page.sanctionOutcomeIntegrationExceptions,
    };
  }, [scenario, queuePage, filterStatus, filterType, filterPriority, debouncedSearch, filterFrom, filterTo]);

  const loadReports = useCallback(() => {
    if (rangeError) return;
    setLoadState({ status: "loading" });
    void fetchReports().then((result) => setLoadState({ status: "ready", ...result })).catch((error: unknown) => setLoadState({ status: "error", message: getErrorMessage(error, "Intente nuevamente.") }));
  }, [fetchReports, rangeError]);

  useEffect(() => {
    if (rangeError) return;
    let current = true;
    void fetchReports().then((result) => { if (current) setLoadState({ status: "ready", ...result }); }).catch((error: unknown) => { if (current) setLoadState({ status: "error", message: getErrorMessage(error, "Intente nuevamente.") }); });
    return () => { current = false; };
  }, [fetchReports, rangeError]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set("detail", selectedId); else url.searchParams.delete("detail");
    if (selectedInspectionId) url.searchParams.set("inspectionId", selectedInspectionId); else url.searchParams.delete("inspectionId");
    url.searchParams.delete("status");
    for (const status of filterStatus) url.searchParams.append("status", status);
    const queue: [string, string][] = [["from", filterFrom], ["to", filterTo], ["type", filterType], ["priority", filterPriority], ["q", debouncedSearch], ["page", queuePage > 1 ? String(queuePage) : ""]];
    for (const [key, value] of queue) { if (value) url.searchParams.set(key, value); else url.searchParams.delete(key); }
    window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`.replace(/\?$/, ""));
  }, [selectedId, selectedInspectionId, filterStatus, filterType, filterPriority, debouncedSearch, queuePage, filterFrom, filterTo]);

  const filteredReports = loadState.status === "ready" ? loadState.reports : [];

  const selectedReport = loadState.status === "ready" && selectedId ? loadState.reports.find((report) => report.id === selectedId) ?? null : null;

  const replaceReport = useCallback((updated: EnvironmentalReport) => {
    setLoadState((state) => state.status === "ready" ? { ...state, reports: state.reports.map((report) => report.id === updated.id ? mergeEnvironmentalReportRead(report, updated) : report) } : state);
  }, []);

  const handleCreated = useCallback((created: EnvironmentalReport) => {
    setLoadState((state) => state.status === "ready" ? { ...state, reports: [created, ...state.reports], total: state.total + 1 } : state);
    setCreateOpen(false);
    setAnnouncement(`Expediente ${created.id} abierto.`);
  }, []);

  const refreshAfterConflict = useCallback(async (id: string) => {
    try {
      const fresh = await environmentalReportsAdapter.get(id);
      if (visibleToScenario(fresh, scenario)) replaceReport(fresh);
    } catch { /* the original action error remains the useful message */ }
  }, [replaceReport, scenario]);

  const handleAction = useCallback(async (action: Action, report: EnvironmentalReport, reason?: string): Promise<string | null> => {
    setAnnouncement("");
    try {
      const updated = action === "start-review" ? await environmentalReportsAdapter.startReview(report.id) : action === "forward" ? await environmentalReportsAdapter.forward(report.id, { reason: reason ?? "" }) : action === "dismiss" ? await environmentalReportsAdapter.dismiss(report.id, { reason: reason ?? "" }) : await environmentalReportsAdapter.close(report.id);
      replaceReport(updated);
      setAnnouncement(`${report.id}: ${ENVIRONMENTAL_REPORT_STATUS_LABELS[updated.status]}.`);
      return null;
    } catch (error) {
      if (error instanceof EnvironmentalReportRequestError && error.status === 409) {
        await refreshAfterConflict(report.id);
        const message = "El expediente cambió. Revise el estado actual.";
        setAnnouncement(message);
        return message;
      }
      const message = getErrorMessage(error, "No se pudo actualizar el expediente. Intente nuevamente.");
      setAnnouncement(message);
      return message;
    }
  }, [refreshAfterConflict, replaceReport]);

  if (selectedReport) return <ReportDetail report={selectedReport} scenario={scenario} focusedInspectionId={selectedInspectionId} onBack={() => { setSelectedId(null); setSelectedInspectionId(null); }} onAction={handleAction} onReportUpdated={replaceReport} />;

  return (
    <div className="flex min-h-full flex-col bg-[var(--color-canvas)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)] sm:text-[28px]">Control ambiental</h1>
          </div>
          {scenario.actor.kind === "FIELD" && <Button className="gap-2" onClick={() => setCreateOpen(true)}><FilePlus2 className="h-4 w-4" aria-hidden />Abrir reporte</Button>}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 p-4 sm:px-6 sm:pt-5 sm:pb-6 lg:px-8 lg:pb-8">
        <div role="status" className="sr-only">{announcement}</div>
        {scenario.actor.kind === "OFFICE" && <QueueFilters from={filterFrom} to={filterTo} rangeError={rangeError} onFrom={(value) => { setFilterFrom(value); setQueuePage(1); }} onTo={(value) => { setFilterTo(value); setQueuePage(1); }} onClearDates={() => { setFilterFrom(""); setFilterTo(""); setQueuePage(1); }} filterStatus={filterStatus} filterType={filterType} filterPriority={filterPriority} search={search} onStatus={(value) => { setFilterStatus(value); setQueuePage(1); }} onType={(value) => { setFilterType(value); setQueuePage(1); }} onPriority={(value) => { setFilterPriority(value); setQueuePage(1); }} onSearch={(value) => { setSearch(value); setQueuePage(1); }} />}
        {loadState.status === "ready" && scenario.actor.kind === "OFFICE" && loadState.sanctionOutcomeIntegrationExceptions.length > 0 && <SanctionOutcomeIntegrationExceptionsPanel exceptions={loadState.sanctionOutcomeIntegrationExceptions} />}
        {!rangeError && loadState.status === "loading" && <LoadingState />}
        {!rangeError && loadState.status === "error" && <ErrorState message={loadState.message} onRetry={loadReports} />}
        {!rangeError && loadState.status === "ready" && filteredReports.length === 0 && <EmptyState hasFilters={filterStatus.length > 0 || Boolean(filterType || filterPriority || search || filterFrom || filterTo)} onClear={() => { setFilterStatus([]); setFilterType(""); setFilterPriority(""); setSearch(""); setFilterFrom(""); setFilterTo(""); setQueuePage(1); }} canCreate={scenario.actor.kind === "FIELD"} onCreate={() => setCreateOpen(true)} />}
        {!rangeError && loadState.status === "ready" && filteredReports.length > 0 && <section aria-label={scenario.actor.kind === "OFFICE" ? "Cola de expedientes ambientales" : "Reportes ambientales asignados"}><ItemGroup className="grid gap-3">{filteredReports.map((report) => <ReportRow key={report.id} report={report} onOpen={() => { setSelectedId(report.id); setSelectedInspectionId(null); }} />)}</ItemGroup></section>}
        {!rangeError && loadState.status === "ready" && loadState.totalPages > 1 && <QueuePagination page={queuePage} totalPages={loadState.totalPages} total={loadState.total} onPage={setQueuePage} />}
      </div>

      <CreateReportDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={handleCreated} />
    </div>
  );
}

function QueuePagination({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (page: number) => void }) {
  const previousDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  return <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[var(--color-text-secondary)]">Página {page} de {totalPages} · {total} expedientes</p><Pagination aria-label="Paginación de la cola" className="mx-0 w-auto"><PaginationContent><PaginationItem><PaginationPrevious href="#cola" aria-disabled={previousDisabled} tabIndex={previousDisabled ? -1 : undefined} onClick={(event) => { event.preventDefault(); if (!previousDisabled) onPage(page - 1); }} /></PaginationItem><PaginationItem><PaginationLink href="#cola" isActive aria-label={`Página ${page}`} onClick={(event) => event.preventDefault()}>{page}</PaginationLink></PaginationItem><PaginationItem><PaginationNext href="#cola" aria-disabled={nextDisabled} tabIndex={nextDisabled ? -1 : undefined} onClick={(event) => { event.preventDefault(); if (!nextDisabled) onPage(page + 1); }} /></PaginationItem></PaginationContent></Pagination></div>;
}

function QueueFilters({ from, to, rangeError, onFrom, onTo, onClearDates, filterStatus, filterType, filterPriority, search, onStatus, onType, onPriority, onSearch }: { from: string; to: string; rangeError?: string; onFrom: (value: string) => void; onTo: (value: string) => void; onClearDates: () => void; filterStatus: EnvironmentalReportStatus[]; filterType: string; filterPriority: string; search: string; onStatus: (value: EnvironmentalReportStatus[]) => void; onType: (value: string) => void; onPriority: (value: string) => void; onSearch: (value: string) => void }) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4" aria-label="Filtros de la cola">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <Field className="flex-1">
          <FieldLabel htmlFor="environmental-search">Buscar expediente</FieldLabel>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" aria-hidden />
            <Input id="environmental-search" value={search} maxLength={MAX_SEARCH_LENGTH} onChange={(event) => onSearch(event.target.value)} placeholder="Nº, dirección o reclamo" className="pl-9" />
          </div>
        </Field>
        <QueueStatusFilter filterStatus={filterStatus} onStatus={onStatus} />
        <Field className="lg:w-64">
          <FieldLabel htmlFor="environmental-type">Tipo de hallazgo</FieldLabel>
          <Select value={filterType || "all"} onValueChange={(value) => onType(value === "all" ? "" : String(value ?? ""))}>
            <SelectTrigger id="environmental-type"><SelectValue>{filterType ? ENVIRONMENTAL_REPORT_TYPE_LABELS[filterType as EnvironmentalReportType] : "Todos los tipos"}</SelectValue></SelectTrigger>
            <SelectContent><SelectGroup><SelectItem value="all">Todos los tipos</SelectItem>{reportTypes.map((type) => <SelectItem key={type} value={type}>{ENVIRONMENTAL_REPORT_TYPE_LABELS[type]}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>
        </Field>
        <Field className="lg:w-48">
          <FieldLabel htmlFor="environmental-priority">Prioridad</FieldLabel>
          <Select value={filterPriority || "all"} onValueChange={(value) => onPriority(value === "all" ? "" : String(value ?? ""))}>
            <SelectTrigger id="environmental-priority"><SelectValue>{filterPriority ? ENVIRONMENTAL_REPORT_PRIORITY_LABELS[filterPriority as EnvironmentalReportPriority] : "Todas las prioridades"}</SelectValue></SelectTrigger>
            <SelectContent><SelectGroup><SelectItem value="all">Todas las prioridades</SelectItem>{reportPriorities.map((priority) => <SelectItem key={priority} value={priority}>{ENVIRONMENTAL_REPORT_PRIORITY_LABELS[priority]}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>
        </Field>
      </div>
    <FieldSet className="mt-4" aria-describedby={rangeError ? "environmental-range-error" : undefined}>
      <FieldLegend variant="label">Última actualización</FieldLegend>
      <FieldGroup className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
        <Field data-invalid={Boolean(rangeError)}>
          <FieldLabel htmlFor="environmental-from">Desde</FieldLabel>
          <DatePicker id="environmental-from" value={from} onChange={onFrom} invalid={Boolean(rangeError)} aria-describedby={rangeError ? "environmental-range-error" : undefined} />
        </Field>
        <Field data-invalid={Boolean(rangeError)}>
          <FieldLabel htmlFor="environmental-to">Hasta</FieldLabel>
          <DatePicker id="environmental-to" value={to} onChange={onTo} invalid={Boolean(rangeError)} aria-describedby={rangeError ? "environmental-range-error" : undefined} />
        </Field>
      </FieldGroup>
      {rangeError && <FieldError id="environmental-range-error">{rangeError}</FieldError>}
      {(from || to) && <Button variant="ghost" size="sm" className="self-start" onClick={onClearDates}>Limpiar fechas</Button>}
    </FieldSet>
    </section>
  );
}

function QueueStatusFilter({ filterStatus, onStatus }: { filterStatus: EnvironmentalReportStatus[]; onStatus: (value: EnvironmentalReportStatus[]) => void }) {
  return (
    <Field className="w-64 max-w-full">
      <FieldLabel htmlFor="environmental-status">Estado</FieldLabel>
      <Select
        modal={false}
        multiple
        value={filterStatus}
        onValueChange={(value) => {
          const selectedValues: string[] = Array.isArray(value) ? value : value ? [value] : [];
          if (selectedValues.includes(ALL_STATUSES_OPTION)) {
            onStatus([]);
            return;
          }

          const selectedStatuses = selectedValues.filter((value): value is EnvironmentalReportStatus => reportStatuses.includes(value as EnvironmentalReportStatus));
          onStatus(reportStatuses.filter((status) => selectedStatuses.includes(status)));
        }}
      >
        <SelectTrigger id="environmental-status" className="min-w-0"><SelectValue className="min-w-0 overflow-hidden"><span className="block truncate">{statusSummary(filterStatus)}</span></SelectValue></SelectTrigger>
        <SelectContent align="start" className="min-w-80 max-h-[min(24rem,calc(var(--available-height)-5rem))] overflow-y-auto overscroll-contain">
          <SelectItem value={ALL_STATUSES_OPTION} className="sticky top-0 z-20 bg-popover">Todos los estados</SelectItem>
          <SelectSeparator />
          {statusGroups.map((group) => (
            <SelectGroup key={group.label} variant="nested" className="mx-0 pl-2 before:hidden">
              <SelectLabel className="sticky top-10 z-10 bg-popover px-0 font-semibold text-[var(--color-text)] [@media(max-width:760px)]:top-12">{group.label}</SelectLabel>
              {group.statuses.map((status) => {
                const Icon = statusIcon[status];
                return <SelectItem key={status} value={status} className="pl-5 before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-[var(--color-border-strong)] before:content-['']"><Icon aria-hidden />{ENVIRONMENTAL_REPORT_STATUS_LABELS[status]}</SelectItem>;
              })}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function ReportRow({ report, onOpen }: { report: EnvironmentalReport; onOpen: () => void }) {
  return <Item variant="outline" className="p-0" render={<Button type="button" variant="ghost" onClick={onOpen} className="h-auto min-h-12 w-full justify-start gap-4 rounded-lg px-4! py-3.5! text-left whitespace-normal" aria-label={`${report.id}, ${ENVIRONMENTAL_REPORT_TYPE_LABELS[report.reportType]}, ${ENVIRONMENTAL_REPORT_STATUS_LABELS[report.status]}`} />}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-info-fill)] text-[var(--color-action)]"><MapPin className="h-4 w-4" aria-hidden /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="font-bold tabular-nums text-[var(--color-text)]">{report.id}</span><span className="text-xs font-semibold text-[var(--color-text-secondary)]">{ENVIRONMENTAL_REPORT_TYPE_LABELS[report.reportType]}</span></span><span className="mt-1.5 block truncate text-sm text-[var(--color-text)]">{reportAddress(report)}</span><span className="mt-1 block truncate text-xs text-[var(--color-text-secondary)]">Actualizado {formatDate(report.updatedAt)}{report.escalated ? " · Escalado" : ""}</span></span><StatusBadge status={report.status} /><ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[var(--color-text-secondary)] sm:mt-0" aria-hidden /></Item>;
}

function ReportDetail({ report, scenario, focusedInspectionId, onBack, onAction, onReportUpdated }: { report: EnvironmentalReport; scenario: OperationalScenario; focusedInspectionId: string | null; onBack: () => void; onAction: (action: Action, report: EnvironmentalReport, reason?: string) => Promise<string | null>; onReportUpdated: (report: EnvironmentalReport) => void }) {
  const isOffice = scenario.actor.kind === "OFFICE";
  const [inspections, setInspections] = useState<EnvironmentalInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<SchedulingMode>("schedule");
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [serviceDraft, setServiceDraft] = useState<InspectionServiceDraft | null>(null);
  const [scheduledService, setScheduledService] = useState<Service | null>(null);
  const [inspectionServices, setInspectionServices] = useState<Record<string, Service | null>>({});
  const [inspectionRepairRequests, setInspectionRepairRequests] = useState<Record<string, RepairRequest[]>>({});
  const [repairRequestInspectionId, setRepairRequestInspectionId] = useState<string | null>(null);
  const [violationNotice, setViolationNotice] = useState<ViolationNotice | null>(null);
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [noticeError, setNoticeError] = useState<string | null>(null);
  const [issueNoticeOpen, setIssueNoticeOpen] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<ReportDecision | null>(null);
  const [requestInfoOpen, setRequestInfoOpen] = useState(false);
  const [rescheduleStep, setRescheduleStep] = useState<"reason" | "confirm" | null>(null);
  const reportTitleRef = useRef<HTMLHeadingElement>(null);
  const focusTitleAfterDialogRef = useRef(false);
  const dialogFinalFocus = useCallback(() => {
    if (!focusTitleAfterDialogRef.current) return true;
    focusTitleAfterDialogRef.current = false;
    return reportTitleRef.current;
  }, []);

  const canIssueViolationNotice = isOffice && scenario.capabilities.includes("violationNotice:issue");
  const canViewViolationNotice = isOffice && scenario.capabilities.includes("violationNotice:view");
  const canViewSanctionOutcome = isOffice && scenario.capabilities.includes("sanctionOutcome:view");

  const loadViolationNotice = useCallback(async (items: EnvironmentalInspection[]) => {
    const violationInspection = items.find((inspection) => inspection.outcome === "VIOLATION_FOUND");
    if (!canViewViolationNotice || !violationInspection) {
      setViolationNotice(null);
      setNoticeLoading(false);
      return null;
    }

    setNoticeLoading(true);
    setNoticeError(null);
    try {
      const notice = await environmentalReportsAdapter.getViolationNotice(violationInspection.id);
      setViolationNotice(notice);
      return notice;
    } catch (error) {
      if (error instanceof EnvironmentalReportRequestError && error.status === 404) {
        setViolationNotice(null);
        return null;
      }
      setNoticeError(getErrorMessage(error, "No se pudo cargar el acta."));
      return null;
    } finally {
      setNoticeLoading(false);
    }
  }, [canViewViolationNotice]);

  const loadInspectionSources = useCallback(async (items: EnvironmentalInspection[]) => {
    const sourceResults = await Promise.all(items.map(async (inspection) => {
      const [service, referrals] = await Promise.all([
        inspection.serviceId ? servicesAdapter.get(inspection.serviceId).catch(() => null) : Promise.resolve(null),
        repairRequestsAdapter.list({ detectedInId: inspection.id, pageSize: 50 }).then((page) => page.repairRequests).catch(() => []),
      ]);
      return { inspectionId: inspection.id, service, referrals };
    }));
    setInspectionServices((current) => ({
      ...current,
      ...Object.fromEntries(sourceResults.map(({ inspectionId, service }) => [inspectionId, service])),
    }));
    setInspectionRepairRequests((current) => ({
      ...current,
      ...Object.fromEntries(sourceResults.map(({ inspectionId, referrals }) => [inspectionId, referrals])),
    }));
  }, []);

  const loadInspections = useCallback(async () => {
    const items = await environmentalReportsAdapter.listInspections(report.id);
    setInspections(items);
    void loadInspectionSources(items);
    await loadViolationNotice(items);
    return items;
  }, [loadInspectionSources, loadViolationNotice, report.id]);

  useEffect(() => {
    let current = true;
    void environmentalReportsAdapter.listInspections(report.id)
      .then(async (items) => { if (current) { setInspections(items); setLoading(false); void loadInspectionSources(items); await loadViolationNotice(items); } })
      .catch((error: unknown) => { if (current) { setHistoryError(getErrorMessage(error, "No se pudieron cargar las inspecciones.")); setLoading(false); } });
    return () => { current = false; };
  }, [loadInspectionSources, loadViolationNotice, report.id]);

  useEffect(() => {
    if (!focusedInspectionId || loading || !inspections.some((inspection) => inspection.id === focusedInspectionId)) return;
    document.getElementById("inspection-history-title")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [focusedInspectionId, inspections, loading]);

  const activeInspection = inspections.find((inspection) => !inspection.outcome) ?? null;
  const completedViolationInspection = inspections.find((inspection) => inspection.outcome === "VIOLATION_FOUND") ?? null;
  const showNoticeIssuance = canIssueViolationNotice && report.status === "VIOLATION_FOUND" && Boolean(completedViolationInspection);
  const hasInspectionEvidence = Boolean(completedViolationInspection?.attachments?.length);
  const canSubmitNotice = showNoticeIssuance && hasInspectionEvidence && !violationNotice && !noticeLoading;
  // #639: una sola solicitud abierta por expediente; mientras está pendiente el backend responde 409
  // a derivar, desestimar y cerrar, así que esas acciones no se ofrecen.
  const infoPending = report.informationRequestPending === true;
  const canRequestInfo = isOffice && report.status === "UNDER_REVIEW" && Boolean(report.ticketId) && !infoPending;
  const canSchedule = isOffice && report.status === "UNDER_REVIEW" && !activeInspection;
  // La agenda de la inspección vive en su Servicio POINT: reprogramar es reprogramar
  // ese servicio (reschedule + confirm-reschedule), no crear otra inspección.
  const activeService = activeInspection ? inspectionServices[activeInspection.id] ?? null : null;
  const canReprogram = isOffice && report.status === "INSPECTION_SCHEDULED" && (activeService?.status === "SCHEDULED" || activeService?.status === "RESCHEDULED");
  const canReinspect = isOffice && report.status === "INSPECTED" && inspections.some((inspection) => inspection.outcome === "INCONCLUSIVE");
  // #320: si el alta del servicio falló, la inspección quedó abierta sin servicio y el expediente ya
  // está en INSPECTION_SCHEDULED (volver a programar da 409): sólo se reintenta el alta del servicio.
  const orphanInspection = isOffice && report.status === "INSPECTION_SCHEDULED" && activeInspection && !activeInspection.serviceId ? activeInspection : null;
  const claimId = report.publicId ?? report.ticketId;
  const hasClaimData = Boolean(report.escalated || (report.citizenResponse && isOffice) || (claimId && isOffice));
  const closure = getEnvironmentalReportClosure(report);
  const visibleClosure = closure && (closure.kind !== "sanctioned" || canViewSanctionOutcome) ? closure : null;
  const repairRequestInspection = inspections.find((inspection) => inspection.id === repairRequestInspectionId) ?? null;
  const canCreateRepairRequestFromInspection = (inspection: EnvironmentalInspection) => {
    if (isOffice) return true;
    const sourceService = inspectionServices[inspection.id];
    return scenario.actor.kind === "FIELD" && Boolean(sourceService?.crewId && sourceService.crewId === scenario.actor.crewId);
  };
  const allActions: { action: Action; label: string; icon: typeof Check; tone?: string }[] = report.status === "RECEIVED"
    ? [{ action: "start-review", label: "Iniciar revisión", icon: Search }]
    : report.status === "UNDER_REVIEW"
      ? [{ action: "forward", label: "Derivar expediente", icon: Forward }, { action: "dismiss", label: "Desestimar expediente", icon: X, tone: "text-[var(--color-danger)]" }]
      : ["FORWARDED", "DISMISSED", "NO_VIOLATION", "SANCTIONED"].includes(report.status)
        ? [{ action: "close", label: "Cerrar expediente", icon: Check, tone: "text-[var(--color-danger)]" }]
        : [];
  const actions = infoPending ? allActions.filter(({ action }) => action !== "forward" && action !== "dismiss" && action !== "close") : allActions;

  async function handleRequestInformation(input: RequestInformationInput): Promise<string | null> {
    try {
      onReportUpdated(await environmentalReportsAdapter.requestInformation(report.id, input));
      focusTitleAfterDialogRef.current = true;
      return null;
    } catch (error) {
      if (error instanceof EnvironmentalReportRequestError && error.status === 409) {
        try { onReportUpdated(await environmentalReportsAdapter.get(report.id)); } catch { /* the 409 message below stays */ }
        return "Ya hay una solicitud pendiente.";
      }
      return getErrorMessage(error, "No se pudo enviar el pedido. Intente nuevamente.");
    }
  }

  // El servicio recién creado en modo mock todavía no está vinculado a la inspección.
  const linkedService = (inspection: EnvironmentalInspection) => inspectionServices[inspection.id] ?? (inspection.id === inspections[inspections.length - 1]?.id ? scheduledService : null);

  function replaceInspectionService(updated: Service) {
    if (!activeInspection) return;
    setInspectionServices((current) => ({ ...current, [activeInspection.id]: updated }));
  }

  // El alta lleva la cuadrilla y el inspectionId: el backend vincula la inspección en la misma
  // transacción, así que no queda un servicio suelto ni una asignación a medias (#320).
  async function createInspectionService(draft: InspectionServiceDraft, overrideNote?: string) {
    const inspectionServiceType = await resolveServiceType(ENVIRONMENTAL_INSPECTION_SERVICE_TYPE_RULE);
    return servicesAdapter.create({
      title: `Inspección · ${report.id}`,
      serviceTypeId: inspectionServiceType.id,
      origin: "INSPECTION",
      inspectionId: draft.inspectionId,
      zoneIds: [draft.zoneId],
      scheduledDate: draft.scheduledDate,
      timeWindow: draft.timeWindow,
      notes: draft.notes,
      crewId: draft.crewId,
      overrideNote,
    });
  }

  async function refreshAfterScheduling() {
    try {
      onReportUpdated(await environmentalReportsAdapter.get(report.id));
      await loadInspections();
    } catch (error) {
      setScheduleError((current) => current ?? (getErrorMessage(error, "No se pudo actualizar. Intente nuevamente.")));
    }
  }

  async function handleSchedule(input: EnvironmentalInspectionScheduleInput, crewId: string) {
    setScheduleError(null);
    if (!input.zoneId) {
      setScheduleError("Seleccione una zona.");
      return;
    }
    let draft: InspectionServiceDraft;
    try {
      const inspection = await environmentalReportsAdapter.schedule(report.id, input);
      draft = { inspectionId: inspection.id, scheduledDate: input.scheduledDate, timeWindow: input.timeWindow, zoneId: input.zoneId, crewId, notes: input.notes };
    } catch (error) {
      setScheduleError(getErrorMessage(error, "No se pudo programar. Intente nuevamente."));
      return;
    }
    try {
      setScheduledService(await createInspectionService(draft));
      setServiceDraft(null);
    } catch (error) {
      const conflict = error instanceof ServiceRequestError && error.status === 409 ? error.message : undefined;
      setServiceDraft({ ...draft, conflict });
      setScheduleError("Inspección programada, pero no se creó el servicio. Use «Programar servicio».");
    }
    setScheduleOpen(false);
    await refreshAfterScheduling();
  }

  async function handleScheduleService(input: EnvironmentalInspectionScheduleInput, crewId: string, overrideNote?: string) {
    if (!orphanInspection || !input.zoneId) return;
    // Si falla, el error sube al diálogo y la inspección sigue sin servicio: se puede volver a intentar.
    setScheduledService(await createInspectionService({ inspectionId: orphanInspection.id, scheduledDate: input.scheduledDate, timeWindow: input.timeWindow, zoneId: input.zoneId, crewId, notes: input.notes }, overrideNote));
    setServiceDraft(null);
    setScheduleError(null);
    setScheduleOpen(false);
    await refreshAfterScheduling();
  }

  async function handleIssueNotice(input: IssueViolationNoticeInput) {
    setNoticeError(null);
    if (!completedViolationInspection) throw new Error("No hay inspección con infracción.");
    try {
      const issuedNotice = await environmentalReportsAdapter.issueViolationNotice(completedViolationInspection.id, input);
      setViolationNotice(issuedNotice);
      onReportUpdated(await environmentalReportsAdapter.get(report.id));
      await loadInspections();
      focusTitleAfterDialogRef.current = true;
      setIssueNoticeOpen(false);
    } catch (error) {
      const message = getErrorMessage(error, "No se pudo emitir el acta. Intente nuevamente.");
      if (error instanceof EnvironmentalReportRequestError && error.status === 409) {
        const conflictMessage = "No se pudo emitir el acta. Intente nuevamente.";
        setNoticeError(conflictMessage);
        try {
          setViolationNotice(await environmentalReportsAdapter.getViolationNotice(completedViolationInspection.id));
        } catch { /* the conflict message remains actionable */ }
        try {
          onReportUpdated(await environmentalReportsAdapter.get(report.id));
        } catch { /* the original conflict remains the useful message */ }
        setNoticeError(conflictMessage);
        throw new Error(conflictMessage);
      }
      setNoticeError(message);
      throw error instanceof Error ? error : new Error(message);
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-[var(--color-surface)]" role="region" aria-label={`Detalle de ${report.id}`}>
      <header className="border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5"><ArrowLeft data-icon="inline-start" aria-hidden />Volver a expedientes</Button>
          <span className="text-xs font-semibold tabular-nums text-[var(--color-text-secondary)]">{report.id}</span>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 space-y-5 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h1 ref={reportTitleRef} tabIndex={-1} className="text-2xl font-bold tracking-tight text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 sm:text-[28px]">Expediente {report.id}</h1><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{ENVIRONMENTAL_REPORT_TYPE_LABELS[report.reportType]} · actualizado {formatDate(report.updatedAt)}</p></div>
          <StatusBadge status={report.status} />
        </div>
        {isOffice && (actions.length > 0 || canRequestInfo || infoPending || canSchedule || canReprogram || canReinspect || orphanInspection) && <section className="rounded-2xl border border-[var(--color-action)] bg-[var(--color-info-fill)] p-4 sm:p-5" aria-labelledby="report-actions-title"><h2 id="report-actions-title" className="text-sm font-bold text-[var(--color-text)]">Acciones</h2>{(orphanInspection || canReinspect) && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{orphanInspection ? "Falta fecha y cuadrilla." : "La anterior fue inconclusa. Programe otra."}</p>}<div className="mt-4 flex flex-wrap gap-2">{actions.map(({ action, label, icon: Icon, tone }) => <Button key={action} variant={action === "forward" || action === "start-review" ? "default" : "outline"} className={`gap-2 ${tone ?? ""}`} onClick={() => { if (action === "forward" || action === "dismiss") setPendingDecision(action); else void onAction(action, report); }}><Icon data-icon="inline-start" aria-hidden />{label}</Button>)}{canRequestInfo && <Button variant="outline" className="gap-2" onClick={() => setRequestInfoOpen(true)}><MessageCircleQuestion data-icon="inline-start" aria-hidden />Pedir información al vecino</Button>}{orphanInspection && <Button className="gap-2" onClick={() => { setScheduleMode("service"); setScheduleOpen(true); }}><CalendarDays data-icon="inline-start" aria-hidden />Programar servicio</Button>}{(canSchedule || canReinspect) && <Button className="gap-2" onClick={() => { setScheduleMode(canReinspect ? "reinspection" : "schedule"); setScheduleOpen(true); }}><CalendarDays data-icon="inline-start" aria-hidden />{canReinspect ? "Programar reinspección" : "Programar inspección"}</Button>}{canReprogram && <Button variant="outline" className="gap-2" onClick={() => setRescheduleStep(activeService?.status === "RESCHEDULED" ? "confirm" : "reason")}><RefreshCw data-icon="inline-start" aria-hidden />{activeService?.status === "RESCHEDULED" ? "Confirmar nueva fecha" : "Reprogramar inspección"}</Button>}</div>{infoPending && <InformationRequestPending report={report} />}</section>}
        {scheduleError && <Alert variant="danger">{scheduleError}</Alert>}
        {canViewViolationNotice && completedViolationInspection && <ViolationNoticePanel inspection={completedViolationInspection} notice={violationNotice} loading={noticeLoading} error={noticeError} showIssue={showNoticeIssuance} canIssue={canSubmitNotice} hasEvidence={hasInspectionEvidence} onIssue={() => setIssueNoticeOpen(true)} />}
        <section className={hasClaimData ? "grid gap-5 lg:grid-cols-[1.3fr_0.7fr]" : "grid gap-5"}><div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-4 sm:p-5"><h2 className="text-sm font-bold text-[var(--color-text)]">Datos</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><DataField label="Ubicación" value={reportAddress(report)} /><DataField label="Hallazgo" value={reportDetails(report)} wide /><DataField label="Prioridad" value={report.priority === null ? "—" : ENVIRONMENTAL_REPORT_PRIORITY_LABELS[report.priority]} /><DataField label="Creado" value={formatDate(report.createdAt)} /><DataField label="Última actualización" value={formatDate(report.updatedAt)} /></dl></div>{hasClaimData && <div className="rounded-2xl border border-[var(--color-border)] p-4 sm:p-5">{report.escalated && <p className="rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] p-3 text-sm font-semibold text-[var(--color-warning)]">Escalado</p>}{report.citizenResponse && isOffice && <p className={`${report.escalated ? "mt-4 " : ""}text-sm text-[var(--color-text)]`}>{report.citizenResponse}</p>}{claimId && isOffice && <p className={`${report.escalated || report.citizenResponse ? "mt-4 " : ""}text-sm text-[var(--color-text-secondary)]`}>Reclamo: <span className="font-semibold tabular-nums text-[var(--color-text)]">{claimId}</span></p>}</div>}</section>
         <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5" aria-labelledby="inspection-history-title"><div className="flex items-center gap-2"><ClipboardCheck aria-hidden /><h2 id="inspection-history-title" className="text-sm font-bold text-[var(--color-text)]">Inspecciones</h2></div>{loading && <Alert role="status" className="mt-3"><Spinner aria-hidden />Cargando inspecciones…</Alert>}{historyError && <Alert variant="danger" className="mt-3">{historyError}</Alert>}{!loading && !historyError && inspections.length === 0 && <p className="mt-3 text-sm text-[var(--color-text-secondary)]">Sin inspecciones.</p>}{!loading && !historyError && inspections.length > 0 && <ItemGroup className="mt-4 space-y-3">{inspections.map((inspection, index) => { const service = linkedService(inspection); return <Item key={inspection.id} variant="muted" className="items-stretch rounded-xl"><div className="flex w-full flex-wrap items-center justify-between gap-2"><span className="font-semibold text-[var(--color-text)]">{inspection.id}</span><span className="text-sm text-[var(--color-text-secondary)]">{inspection.outcome ? `Resultado: ${ENVIRONMENTAL_INSPECTION_OUTCOME_LABELS[inspection.outcome]}` : "Inspección programada"}</span></div><span className="sr-only">Inspección {index + 1}</span><p className="w-full text-sm text-[var(--color-text-secondary)]">{inspectionAgenda(inspection, service)}</p>{inspection.serviceId && <p className="w-full text-sm text-[var(--color-text-secondary)]">Servicio: <span className="font-semibold text-[var(--color-text)]">{inspection.serviceId}</span></p>}{service && <p className="w-full text-sm text-[var(--color-text-secondary)]">Cuadrilla asignada: <span className="font-semibold text-[var(--color-text)]">{service.crewName ?? (service.crewId ? "Cuadrilla sin nombre disponible" : "Pendiente")}</span></p>}<div className="flex w-full flex-wrap items-center gap-2">{inspectionRepairRequests[inspection.id]?.map((request) => <Badge key={request.id} variant="info" role="status" aria-label={`Derivación ${request.id}: ${request.status === "REQUESTED" ? "Pendiente" : request.status === "IN_PROGRESS" ? "En curso" : "Cerrada"}`}>{request.id} · {request.status === "REQUESTED" ? "Pendiente de respuesta de Obras Públicas" : request.status === "IN_PROGRESS" ? "En curso" : "Cerrada"}</Badge>)}{canCreateRepairRequestFromInspection(inspection) && <Button type="button" variant="outline" className="gap-2" onClick={() => setRepairRequestInspectionId(inspection.id)}><Wrench data-icon="inline-start" aria-hidden />Crear derivación de reparación</Button>}</div></Item>; })}</ItemGroup>}</section>
        {visibleClosure && <EnvironmentalReportClosurePanel closure={visibleClosure} />}
        {canViewSanctionOutcome && report.sanctionOutcome && <SanctionOutcomePanel outcome={report.sanctionOutcome} />}
      </div>
       <RequestInformationDialog open={requestInfoOpen} reportId={report.id} finalFocus={dialogFinalFocus} onOpenChange={setRequestInfoOpen} onConfirm={handleRequestInformation} />
       <ReportDecisionDialog decision={pendingDecision} reportId={report.id} finalFocus={dialogFinalFocus} onOpenChange={(open) => { if (!open) setPendingDecision(null); }} onConfirm={async (decision, reason) => { const error = await onAction(decision, report, reason); if (error === null) focusTitleAfterDialogRef.current = true; return error; }} />
       <InspectionSchedulingDialog key={scheduleOpen ? scheduleMode : "closed"} open={scheduleOpen} mode={scheduleMode} initial={scheduleMode === "service" && serviceDraft?.inspectionId === orphanInspection?.id ? serviceDraft : null} onOpenChange={setScheduleOpen} onSubmit={scheduleMode === "service" ? handleScheduleService : handleSchedule} />
       <RescheduleReasonDialog open={rescheduleStep === "reason"} onOpenChange={(open) => { if (!open) setRescheduleStep((step) => step === "reason" ? null : step); }} service={activeService} onRescheduled={(updated) => { replaceInspectionService(updated); setRescheduleStep(null); }} />
       <ConfirmRescheduleDialog open={rescheduleStep === "confirm"} onOpenChange={(open) => { if (!open) setRescheduleStep((step) => step === "confirm" ? null : step); }} service={activeService} onConfirmed={(updated) => { replaceInspectionService(updated); setRescheduleStep(null); }} />
       <IssueViolationNoticeDialog key={`${report.id}-${issueNoticeOpen ? "open" : "closed"}`} open={issueNoticeOpen} inspection={completedViolationInspection} finalFocus={dialogFinalFocus} onOpenChange={setIssueNoticeOpen} onSubmit={handleIssueNotice} />
       <CreateRepairRequestDialog
         key={repairRequestInspection?.id ?? "no-inspection"}
         open={Boolean(repairRequestInspection)}
         inspection={repairRequestInspection ?? undefined}
         report={report}
         service={repairRequestInspection ? inspectionServices[repairRequestInspection.id] ?? undefined : undefined}
         onOpenChange={(open) => { if (!open) setRepairRequestInspectionId(null); }}
         onCreated={(request) => {
           setInspectionRepairRequests((current) => ({
             ...current,
             [request.detectedInId]: [request, ...(current[request.detectedInId] ?? []).filter((item) => item.id !== request.id)],
           }));
         }}
       />
    </div>
  );
}

function EnvironmentalReportClosurePanel({ closure }: { closure: EnvironmentalReportClosure }) {
  const isWaiting = closure.kind === "waiting" || closure.kind === "deadline-pending";
  const isDeadline = closure.kind === "deadline" || closure.kind === "deadline-pending";
  const variant = isWaiting ? "info" : isDeadline ? "warning" : "success";

  return (
    <section aria-label="Cierre">
    <Alert role="status" variant={variant} aria-label="Cierre" className="rounded-2xl p-4 sm:p-5">
      <div className="flex items-start gap-3">
        {isWaiting ? <Clock3 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> : isDeadline ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> : <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />}
        <div className="min-w-0">
          <AlertTitle>{closure.label}</AlertTitle>
          <AlertDescription>{closure.description}</AlertDescription>
          {"deadlineAt" in closure && <AlertDescription>Plazo de Faltas: <span className="font-semibold tabular-nums">{formatDate(closure.deadlineAt)}</span></AlertDescription>}
        </div>
      </div>
    </Alert>
    </section>
  );
}

function SanctionOutcomeIntegrationExceptionsPanel({ exceptions }: { exceptions: SanctionOutcomeIntegrationException[] }) {
  return (
    <section aria-label="Resoluciones sin acta">
    <Alert role="status" variant="warning" aria-label="Resoluciones sin acta" className="rounded-2xl p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div className="min-w-0">
          <AlertTitle>Resoluciones sin acta</AlertTitle>
          <AlertDescription>No coinciden con ningún acta.</AlertDescription>
        </div>
      </div>
      <ItemGroup className="mt-4 grid gap-3">
        {exceptions.map((exception) => (
          <Item key={`${exception.violationNoticeId}-${exception.externalRef}`} variant="outline" className="items-start bg-background p-3">
            <p className="font-semibold text-[var(--color-text)]">Acta: <span className="break-words tabular-nums">{exception.violationNoticeId}</span></p>
            <p className="mt-1 break-words text-sm text-[var(--color-text-secondary)]">Referencia: <span className="font-semibold text-[var(--color-text)]">{exception.externalRef}</span></p>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{exception.message}</p>
          </Item>
        ))}
      </ItemGroup>
    </Alert>
    </section>
  );
}

function SanctionOutcomePanel({ outcome }: { outcome: NonNullable<EnvironmentalReport["sanctionOutcome"]> }) {
  return (
    <section aria-label="Resolución de Faltas">
    <Alert role="status" variant="info" aria-label="Resolución de Faltas" className="rounded-2xl p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div className="min-w-0">
          <AlertTitle>Resolución de Faltas</AlertTitle>
        </div>
      </div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <DataField label="Decisión" value={SANCTION_DECISION_LABELS[outcome.decision]} />
        <DataField label="Fecha de decisión" value={formatDate(outcome.decidedAt)} />
        <DataField label="Acta" value={outcome.violationNoticeId} />
        <DataField label="Referencia" value={outcome.externalRef} />
        {outcome.dismissalReason && <DataField label="Motivo" value={outcome.dismissalReason} wide />}
      </dl>
    </Alert>
    </section>
  );
}

function ViolationNoticePanel({ inspection, notice, loading, error, showIssue, canIssue, hasEvidence, onIssue }: { inspection: EnvironmentalInspection; notice: ViolationNotice | null; loading: boolean; error: string | null; showIssue: boolean; canIssue: boolean; hasEvidence: boolean; onIssue: () => void }) {
  return <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5" aria-labelledby="violation-notice-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3"><FilePlus2 className="mt-0.5 h-5 w-5 text-[var(--color-action)]" aria-hidden /><div><h2 id="violation-notice-title" className="text-sm font-bold text-[var(--color-text)]">Acta de infracción</h2></div></div>
      {showIssue && !notice && <Button className="gap-2" onClick={onIssue} disabled={!canIssue}><FilePlus2 data-icon="inline-start" aria-hidden />Emitir acta</Button>}
    </div>
    {loading && <Alert role="status" className="mt-4"><Spinner aria-hidden />Consultando acta…</Alert>}
    {error && <Alert variant="danger" className="mt-4">{error}</Alert>}
    {!loading && !notice && showIssue && !hasEvidence && <Alert variant="warning" className="mt-4">Agregue evidencia a la inspección para emitir el acta.</Alert>}
    {!loading && !notice && !showIssue && <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Sin acta.</p>}
    {notice && <div className="mt-4 grid gap-4"><Alert role="status" variant="success"><AlertTitle>Acta emitida. No se puede modificar.</AlertTitle></Alert><dl className="grid gap-4 sm:grid-cols-2"><DataField label="Número de acta" value={notice.noticeNumber} /><DataField label="Fecha de emisión" value={formatDate(notice.issuedAt)} /><DataField label="Actas previas" value={String(notice.priorNoticeCount)} /><DataField label="Tipo de infracción" value={violationTypeLabels[notice.violationType] ?? notice.violationType} /><DataField label="Gravedad" value={severityLabels[notice.severity] ?? notice.severity} /><DataField label="Acción sugerida" value={suggestedActionLabels[notice.suggestedAction] ?? notice.suggestedAction} /></dl>{notice.establishmentId ? <p className="text-sm text-[var(--color-text-secondary)]">Establecimiento: <span className="font-semibold text-[var(--color-text)]">{notice.establishmentId}</span></p> : <Alert variant="warning" role="status" aria-label="Acta no enviada a Faltas"><AlertTriangle aria-hidden /><AlertTitle>Acta no enviada a Faltas</AlertTitle><AlertDescription>El expediente se cerró sin resolución de Faltas.</AlertDescription></Alert>}</div>}
  </section>;
}

function IssueViolationNoticeDialog({ open, inspection, onOpenChange, onSubmit, finalFocus }: { open: boolean; inspection: EnvironmentalInspection | null; onOpenChange: (open: boolean) => void; onSubmit: (input: IssueViolationNoticeInput) => Promise<void>; finalFocus: React.ComponentProps<typeof DialogContent>["finalFocus"] }) {
  const [query, setQuery] = useState("");
  const [resolvedEstablishment, setResolvedEstablishment] = useState<Establishment | null>(null);
  const [nonForwarded, setNonForwarded] = useState(false);
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "resolved" | "not-found">("idle");
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [violationType, setViolationType] = useState<IssueViolationNoticeInput["violationType"] | "">(inspection?.violationType ?? "");
  const [severity, setSeverity] = useState<IssueViolationNoticeInput["severity"] | "">(inspection?.severity ?? "");
  const [suggestedAction, setSuggestedAction] = useState<IssueViolationNoticeInput["suggestedAction"] | "">(inspection?.suggestedAction ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function lookupEstablishment() {
    const normalizedQuery = query.trim();
    setErrors((current) => ({ ...current, establishment: "" }));
    setResolvedEstablishment(null);
    setNonForwarded(false);
    if (!normalizedQuery) {
      setLookupState("idle");
      setLookupMessage("Ingrese nombre, dirección o Nº.");
      return;
    }
    setLookupState("loading");
    setLookupMessage(null);
    try {
      const establishment = await establishmentDirectoryAdapter.resolve({ query: normalizedQuery });
      if (establishment) {
        setResolvedEstablishment(establishment);
        setLookupState("resolved");
        setLookupMessage(null);
      } else {
        setLookupState("not-found");
        setLookupMessage("No se encontró el establecimiento.");
      }
    } catch {
      setLookupState("idle");
      setLookupMessage("No se pudo buscar. Intente nuevamente.");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!resolvedEstablishment && !nonForwarded) nextErrors.establishment = "Elija un establecimiento o continúe sin él.";
    if (!violationType) nextErrors.violationType = "Seleccione el tipo de infracción.";
    if (!severity) nextErrors.severity = "Seleccione la gravedad.";
    if (!suggestedAction) nextErrors.suggestedAction = "Seleccione la acción sugerida.";
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length > 0 || !inspection) return;

    const parsed = issueViolationNoticeInputSchema.safeParse({ establishmentId: resolvedEstablishment?.id ?? null, violationType, severity, suggestedAction });
    if (!parsed.success) {
      setSubmitError("Complete los datos obligatorios.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } catch (error) {
      setSubmitError(getErrorMessage(error, "No se pudo emitir el acta. Intente nuevamente."));
    } finally {
      setSubmitting(false);
    }
  }

  const updateQuery = (value: string) => {
    setQuery(value);
    setResolvedEstablishment(null);
    setNonForwarded(false);
    setLookupState("idle");
    setLookupMessage(null);
    setErrors((current) => ({ ...current, establishment: "" }));
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[min(90vh,760px)] max-w-lg overflow-y-auto" finalFocus={finalFocus}>
      <DialogHeader><DialogTitle>Emitir acta</DialogTitle><DialogDescription>Verifique la inspección y elija el establecimiento. No se puede modificar.</DialogDescription></DialogHeader>
      {submitError && <Alert variant="danger">{submitError}</Alert>}
      <form id="violation-notice-form" onSubmit={submit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="violation-establishment">Buscar establecimiento <span aria-hidden="true">*</span></FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row"><Input id="violation-establishment" value={query} onChange={(event) => updateQuery(event.target.value)} disabled={submitting || lookupState === "loading"} placeholder="Nombre, dirección o Nº" aria-invalid={Boolean(errors.establishment)} aria-describedby={errors.establishment ? "violation-establishment-error" : undefined} className="sm:flex-1" /><Button type="button" variant="outline" className="gap-2" onClick={() => void lookupEstablishment()} disabled={submitting || lookupState === "loading"}><Search data-icon="inline-start" aria-hidden />{lookupState === "loading" ? "Buscando…" : "Buscar establecimiento"}</Button></div>
            {errors.establishment && <FieldError id="violation-establishment-error">{errors.establishment}</FieldError>}
            {lookupState === "resolved" && resolvedEstablishment && <Alert role="status" variant="success"><Building2 aria-hidden /><AlertTitle>{resolvedEstablishment.name}</AlertTitle><AlertDescription>{resolvedEstablishment.id} · {resolvedEstablishment.address}</AlertDescription></Alert>}
            {lookupState === "not-found" && <Alert role="status" variant="warning"><AlertDescription>{lookupMessage}</AlertDescription><Button type="button" variant="outline" className="mt-3" onClick={() => setNonForwarded(true)}>Continuar sin establecimiento</Button></Alert>}
            {lookupMessage && lookupState !== "not-found" && <Alert variant="danger" role="alert">{lookupMessage}</Alert>}
            {nonForwarded && <Alert role="status" variant="warning"><AlertTriangle aria-hidden /><AlertDescription>El acta no se enviará a Faltas. El expediente se cierra.</AlertDescription></Alert>}
          </Field>
          <Field>
            <FieldLabel htmlFor="violation-type">Tipo de infracción <span aria-hidden="true">*</span></FieldLabel>
            <Select value={violationType || "none"} onValueChange={(value) => { setViolationType(value === "none" ? "" : String(value) as IssueViolationNoticeInput["violationType"]); setErrors((current) => ({ ...current, violationType: "" })); }}>
              <SelectTrigger id="violation-type" aria-required="true" aria-invalid={Boolean(errors.violationType)} aria-describedby={errors.violationType ? "violation-type-error" : undefined}><SelectValue>{violationType ? violationTypeLabels[violationType] : "Seleccione el tipo"}</SelectValue></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem value="none">Seleccione el tipo</SelectItem>{Object.entries(violationTypeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
            {errors.violationType && <FieldError id="violation-type-error">{errors.violationType}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="violation-severity">Gravedad <span aria-hidden="true">*</span></FieldLabel>
            <Select value={severity || "none"} onValueChange={(value) => { setSeverity(value === "none" ? "" : String(value) as IssueViolationNoticeInput["severity"]); setErrors((current) => ({ ...current, severity: "" })); }}>
              <SelectTrigger id="violation-severity" aria-required="true" aria-invalid={Boolean(errors.severity)} aria-describedby={errors.severity ? "violation-severity-error" : undefined}><SelectValue>{severity ? severityLabels[severity] : "Seleccione la gravedad"}</SelectValue></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem value="none">Seleccione la gravedad</SelectItem>{Object.entries(severityLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
            {errors.severity && <FieldError id="violation-severity-error">{errors.severity}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="violation-suggested-action">Acción sugerida <span aria-hidden="true">*</span></FieldLabel>
            <Select value={suggestedAction || "none"} onValueChange={(value) => { setSuggestedAction(value === "none" ? "" : String(value) as IssueViolationNoticeInput["suggestedAction"]); setErrors((current) => ({ ...current, suggestedAction: "" })); }}>
              <SelectTrigger id="violation-suggested-action" aria-required="true" aria-invalid={Boolean(errors.suggestedAction)} aria-describedby={errors.suggestedAction ? "violation-suggested-action-error" : undefined}><SelectValue>{suggestedAction ? suggestedActionLabels[suggestedAction] : "Seleccione la acción"}</SelectValue></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem value="none">Seleccione la acción</SelectItem>{Object.entries(suggestedActionLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
            {errors.suggestedAction && <FieldError id="violation-suggested-action-error">{errors.suggestedAction}</FieldError>}
          </Field>
        </FieldGroup>
      </form>
      <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button><Button type="submit" form="violation-notice-form" disabled={submitting || (!resolvedEstablishment && !nonForwarded)} className="gap-2">{submitting && <Spinner data-icon="inline-start" aria-hidden />}{submitting ? "Emitiendo acta…" : nonForwarded ? "Emitir sin establecimiento" : "Emitir acta"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function InspectionSchedulingDialog({ open, mode, initial, onOpenChange, onSubmit }: { open: boolean; mode: SchedulingMode; initial: InspectionServiceDraft | null; onOpenChange: (open: boolean) => void; onSubmit: (input: EnvironmentalInspectionScheduleInput, crewId: string, overrideNote?: string) => Promise<void> }) {
  const [date, setDate] = useState(initial?.scheduledDate ?? "");
  const [start, setStart] = useState(initial?.timeWindow.start ?? "09:00");
  const [end, setEnd] = useState(initial?.timeWindow.end ?? "11:00");
  const [crewId, setCrewId] = useState(initial?.crewId ?? "");
  const [zoneId, setZoneId] = useState(initial?.zoneId ?? "");
  const [zones, setZones] = useState<Zone[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cuadrilla o vehículo ocupados en esa franja: el backend da 409 y acepta el alta con una justificación.
  const [conflict, setConflict] = useState<string | null>(initial?.conflict ?? null);
  const [attempted, setAttempted] = useState(false);
  const [overrideNote, setOverrideNote] = useState("");
  const title = mode === "reinspection" ? "Programar reinspección" : mode === "service" ? "Programar servicio" : "Programar inspección";

  useEffect(() => {
    let active = true;
    zonesAdapter
      .list({ active: true, pageSize: 100 })
      .then((page) => { if (active) setZones(page.zones.filter((zone) => zone.active)); })
      .catch(() => undefined);
    // Cuadrillas reales: el alta del servicio exige un UUID de cuadrilla, no los ids de CREW_CATALOG.
    crewsAdapter
      .list({ active: true, pageSize: 100 })
      .then((page) => { if (active) setCrews(page.crews); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const missingDate = attempted && !date;
  const missingZone = attempted && !zoneId;
  const missingCrew = attempted && !crewId;
  const shortNote = attempted && !!conflict && overrideNote.trim().length < OVERRIDE_NOTE_MIN;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (!date || !crewId || !zoneId) { setError("Indique fecha, zona y cuadrilla."); return; }
    if (conflict && overrideNote.trim().length < OVERRIDE_NOTE_MIN) { setError(`Escriba al menos ${OVERRIDE_NOTE_MIN} caracteres.`); return; }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ scheduledDate: date, timeWindow: { start, end }, zoneId, checklistVersion: INSPECTION_CHECKLIST_VERSION, checklist: [...INSPECTION_CHECKLIST_TEMPLATE] }, crewId, conflict ? overrideNote.trim() : undefined);
      setDate("");
      setCrewId("");
      setZoneId("");
    } catch (submitError) {
      if (submitError instanceof ServiceRequestError && submitError.status === 409 && !conflict) {
        setConflict(submitError.message);
        return;
      }
      setError(getErrorMessage(submitError, "No se pudo programar. Intente nuevamente."));
    } finally {
      setSubmitting(false);
    }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      {error && <Alert variant="danger">{error}</Alert>}
      <form id="inspection-scheduling-form" onSubmit={submit} className="-mx-1 min-h-0 overflow-y-auto px-1">
        <FieldGroup>
          <Field><FieldLabel htmlFor="inspection-scheduled-date">Fecha de inspección <span aria-hidden="true">*</span></FieldLabel><DatePicker id="inspection-scheduled-date" value={date} onChange={setDate} disabled={submitting} aria-required="true" invalid={missingDate} aria-describedby={missingDate ? "inspection-date-error" : undefined} />{missingDate && <FieldError id="inspection-date-error">Indique la fecha.</FieldError>}</Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field><FieldLabel id="inspection-time-start-label" htmlFor="inspection-time-start">Inicio</FieldLabel><TimePicker id="inspection-time-start" aria-labelledby="inspection-time-start-label" value={start} onChange={setStart} disabled={submitting} /></Field>
            <Field><FieldLabel id="inspection-time-end-label" htmlFor="inspection-time-end">Fin</FieldLabel><TimePicker id="inspection-time-end" aria-labelledby="inspection-time-end-label" value={end} onChange={setEnd} disabled={submitting} /></Field>
          </div>
          <Field><FieldLabel htmlFor="inspection-zone">Zona operativa <span aria-hidden="true">*</span></FieldLabel><Combobox id="inspection-zone" value={zoneId} onChange={setZoneId} disabled={submitting} aria-required="true" invalid={missingZone} aria-describedby={missingZone ? "inspection-zone-error" : undefined} placeholder="Seleccione una zona" searchPlaceholder="Buscar zonas" emptyText="No se encontraron zonas." options={[{ value: "", label: "Seleccione una zona" }, ...zones.map((zone) => ({ value: zone.id, label: zone.name }))]} />{missingZone && <FieldError id="inspection-zone-error">Seleccione una zona.</FieldError>}</Field>
          <Field><FieldLabel htmlFor="inspection-crew">Cuadrilla <span aria-hidden="true">*</span></FieldLabel><Combobox id="inspection-crew" value={crewId} onChange={setCrewId} disabled={submitting} aria-required="true" invalid={missingCrew} aria-describedby={missingCrew ? "inspection-crew-error" : undefined} placeholder="Seleccione una cuadrilla" searchPlaceholder="Buscar cuadrillas" emptyText="No se encontraron cuadrillas." options={[{ value: "", label: "Seleccione una cuadrilla" }, ...crews.map((crew) => ({ value: crew.id, label: crew.name }))]} />{missingCrew && <FieldError id="inspection-crew-error">Seleccione una cuadrilla.</FieldError>}</Field>
          {conflict && <Field><FieldLabel htmlFor="inspection-override-note">Justificación <span aria-hidden="true">*</span></FieldLabel><Textarea id="inspection-override-note" value={overrideNote} onChange={(event) => setOverrideNote(event.target.value)} disabled={submitting} rows={3} maxLength={OVERRIDE_NOTE_MAX} aria-required="true" aria-invalid={shortNote || undefined} aria-describedby={shortNote ? "inspection-override-note-help inspection-override-note-error" : "inspection-override-note-help"} className="resize-y" /><FieldDescription id="inspection-override-note-help">{conflict} Elija otra cuadrilla o justifique (mínimo {OVERRIDE_NOTE_MIN} caracteres).</FieldDescription>{shortNote && <FieldError id="inspection-override-note-error">Mínimo {OVERRIDE_NOTE_MIN} caracteres.</FieldError>}</Field>}
        </FieldGroup>
      </form>
      <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button><Button type="submit" form="inspection-scheduling-form" disabled={submitting} className="gap-2">{submitting && <Spinner data-icon="inline-start" aria-hidden />}{submitting ? "Programando…" : title}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function DataField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) { return <div className={wide ? "sm:col-span-2" : ""}><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{label}</dt><dd className="mt-1 text-sm text-[var(--color-text)]">{value}</dd></div>; }

function CreateReportDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: (report: EnvironmentalReport) => void }) {
  const [reportType, setReportType] = useState<EnvironmentalReportType | "">("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!reportType) nextErrors.reportType = "Seleccione el tipo de hallazgo.";
    if (!address.trim()) nextErrors.address = "Indique dónde se observó el hallazgo.";
    if (!description.trim()) nextErrors.description = "Describa el hallazgo.";
    const latResult = parseCoordinateField(lat, "lat");
    const lngResult = parseCoordinateField(lng, "lng");
    if (latResult.error) nextErrors.lat = latResult.error;
    if (lngResult.error) nextErrors.lng = lngResult.error;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitting(true); setErrorMessage(null);
    try { const created = await environmentalReportsAdapter.create({ reportType: reportType as EnvironmentalReportType, address: address.trim(), description: description.trim(), lat: latResult.value ?? 0, lng: lngResult.value ?? 0 }); onSuccess(created); setReportType(""); setAddress(""); setDescription(""); setLat(""); setLng(""); setErrors({}); } catch (error) { setErrorMessage(getErrorMessage(error, "No se pudo abrir el reporte. Intente nuevamente.")); } finally { setSubmitting(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Abrir reporte</DialogTitle></DialogHeader>
      {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
      <form id="environmental-report-form" onSubmit={submit} className="overflow-y-auto">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="environmental-report-type">Tipo de hallazgo <span aria-hidden="true">*</span></FieldLabel>
            <Select value={reportType || "none"} onValueChange={(value) => { setReportType(value === "none" ? "" : String(value) as EnvironmentalReportType); setErrors((current) => ({ ...current, reportType: "" })); }}>
              <SelectTrigger id="environmental-report-type" aria-required="true" aria-invalid={Boolean(errors.reportType)} aria-describedby={errors.reportType ? "environmental-report-type-error" : undefined}><SelectValue>{reportType ? ENVIRONMENTAL_REPORT_TYPE_LABELS[reportType] : "Seleccione el tipo"}</SelectValue></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem value="none">Seleccione el tipo</SelectItem>{reportTypes.map((type) => <SelectItem key={type} value={type}>{ENVIRONMENTAL_REPORT_TYPE_LABELS[type]}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
            {errors.reportType && <FieldError id="environmental-report-type-error">{errors.reportType}</FieldError>}
          </Field>
          <Field><FieldLabel htmlFor="environmental-report-address">Dirección o referencia <span aria-hidden="true">*</span></FieldLabel><Input id="environmental-report-address" value={address} onChange={(event) => setAddress(event.target.value)} disabled={submitting} placeholder="Ej.: Av. Warnes 1840" aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? "environmental-report-address-error" : undefined} />{errors.address && <FieldError id="environmental-report-address-error">{errors.address}</FieldError>}</Field>
          <Field><FieldLabel htmlFor="environmental-report-description">Descripción del hallazgo <span aria-hidden="true">*</span></FieldLabel><Textarea id="environmental-report-description" value={description} onChange={(event) => setDescription(event.target.value)} disabled={submitting} rows={4} placeholder="Describa qué observó y cuándo." aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "environmental-report-description-error" : undefined} className="resize-y" />{errors.description && <FieldError id="environmental-report-description-error">{errors.description}</FieldError>}<FieldDescription>No incluya datos personales.</FieldDescription></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field><FieldLabel htmlFor="environmental-report-lat">Latitud <span aria-hidden="true">*</span></FieldLabel><Input id="environmental-report-lat" type="number" min="-90" max="90" step="any" value={lat} onChange={(event) => setLat(event.target.value)} disabled={submitting} aria-invalid={Boolean(errors.lat)} aria-describedby={errors.lat ? "environmental-report-lat-error" : undefined} />{errors.lat && <FieldError id="environmental-report-lat-error">{errors.lat}</FieldError>}</Field>
            <Field><FieldLabel htmlFor="environmental-report-lng">Longitud <span aria-hidden="true">*</span></FieldLabel><Input id="environmental-report-lng" type="number" min="-180" max="180" step="any" value={lng} onChange={(event) => setLng(event.target.value)} disabled={submitting} aria-invalid={Boolean(errors.lng)} aria-describedby={errors.lng ? "environmental-report-lng-error" : undefined} />{errors.lng && <FieldError id="environmental-report-lng-error">{errors.lng}</FieldError>}</Field>
          </div>
        </FieldGroup>
      </form>
      <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button><Button type="submit" form="environmental-report-form" disabled={submitting} className="gap-2">{submitting && <Spinner data-icon="inline-start" aria-hidden />}{submitting ? "Abriendo reporte…" : "Abrir reporte"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function LoadingState() { return <div className="flex min-h-56 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"><Spinner aria-label="Cargando expedientes ambientales" /></div>; }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <Alert variant="danger" className="flex min-h-56 flex-col items-center justify-center p-6 text-center"><CircleAlert aria-hidden /><AlertTitle>No se pudieron cargar los expedientes</AlertTitle><AlertDescription>{message}</AlertDescription><Button className="mt-5 gap-2" onClick={onRetry}><RefreshCw className="h-4 w-4" aria-hidden />Reintentar carga</Button></Alert>; }
function EmptyState({ hasFilters, onClear, canCreate, onCreate }: { hasFilters: boolean; onClear: () => void; canCreate: boolean; onCreate: () => void }) { return <Empty className="min-h-56 rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-6 text-center"><EmptyHeader><CircleCheck className="h-8 w-8 text-[var(--color-success)]" aria-hidden /><EmptyTitle>{hasFilters ? "Sin expedientes con esos filtros." : "Sin expedientes."}</EmptyTitle></EmptyHeader>{hasFilters ? <Button variant="outline" className="mt-5" onClick={onClear}>Limpiar filtros</Button> : canCreate && <Button className="mt-5 gap-2" onClick={onCreate}><FilePlus2 className="h-4 w-4" aria-hidden />Abrir reporte</Button>}</Empty>; }
