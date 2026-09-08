"use client";

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
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  ENVIRONMENTAL_REPORT_PRIORITY_LABELS,
  ENVIRONMENTAL_REPORT_STATUS_LABELS,
  ENVIRONMENTAL_REPORT_TYPE_LABELS,
  environmentalReportTypeSchema,
  issueViolationNoticeInputSchema,
  mergeEnvironmentalReportRead,
  environmentalReportsAdapter,
  EnvironmentalReportRequestError,
  type IssueViolationNoticeInput,
  type EnvironmentalInspection,
  type EnvironmentalInspectionScheduleInput,
  type EnvironmentalReport,
  type EnvironmentalReportType,
  type SanctionOutcomeIntegrationException,
  type ViolationNotice,
} from "@/lib/environmental-reports";
import { establishmentDirectoryAdapter, type Establishment } from "@/lib/establishment-directory";
import { CREW_CATALOG, SERVICE_TYPE_CATALOG, servicesAdapter, type Service } from "@/lib/services";
import { repairRequestsAdapter, type RepairRequest } from "@/lib/repair-requests";
import { getEnvironmentalReportClosure, SANCTION_DECISION_LABELS, type EnvironmentalReportClosure } from "@/lib/sanction-outcomes";
import type { OperationalScenario } from "@/lib/scenarios";
import { CreateRepairRequestDialog } from "@/components/services/create-repair-request-dialog";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; reports: EnvironmentalReport[]; total: number; sanctionOutcomeIntegrationExceptions: SanctionOutcomeIntegrationException[] };

type Action = "start-review" | "forward" | "dismiss" | "close";

const reportTypes = environmentalReportTypeSchema.options;
const inspectionServiceType = SERVICE_TYPE_CATALOG.find((type) => type.id === "st-env-inspection")!;
const inspectionChecklistVersions = [
  { value: "ambiental-v1", label: "Checklist ambiental v1" },
  { value: "ambiental-v2", label: "Checklist ambiental v2 (actualizado)" },
];
const inspectionChecklist = [
  { id: "location", label: "Verificar ubicación y contexto del hallazgo", required: true },
  { id: "source", label: "Identificar la fuente del impacto", required: true },
  { id: "evidence", label: "Registrar observaciones para el acta", required: true },
];
const violationTypeLabels: Record<string, string> = {
  NOISE_LIMIT: "Límite de ruido",
  ILLEGAL_DUMPING: "Disposición ilegal de residuos",
  UNTREATED_DISCHARGE: "Vertido sin tratamiento",
  HAZARDOUS_WASTE: "Residuos peligrosos",
  AIR_EMISSION: "Emisión atmosférica",
  NO_WASTE_MANAGEMENT: "Gestión inadecuada de residuos",
  INSPECTION_OBSTRUCTION: "Obstrucción de inspección",
};
const severityLabels: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};
const suggestedActionLabels: Record<string, string> = {
  WARNING: "Advertencia",
  FORMAL_NOTICE: "Aviso formal",
  FINE: "Multa sugerida",
  CLOSURE: "Clausura sugerida",
};
const reportStatuses = Object.keys(ENVIRONMENTAL_REPORT_STATUS_LABELS) as EnvironmentalReport["status"][];

const statusGroups = [
  { label: "Ingreso y revisión", statuses: ["RECEIVED", "UNDER_REVIEW"] as const },
  { label: "Derivación", statuses: ["FORWARDED", "DISMISSED"] as const },
  { label: "Inspección y resultado", statuses: ["INSPECTION_SCHEDULED", "INSPECTED", "NO_VIOLATION", "VIOLATION_FOUND"] as const },
  { label: "Acta y cierre", statuses: ["NOTICE_ISSUED", "SANCTIONED", "CLOSED", "REOPENED"] as const },
];

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
  REOPENED: RefreshCw,
};

const statusTone: Record<EnvironmentalReport["status"], string> = {
  RECEIVED: "border-[var(--color-info-line)] bg-[var(--color-info-fill)] text-[var(--color-info)]",
  UNDER_REVIEW: "border-[var(--color-info-line)] bg-[var(--color-info-fill)] text-[var(--color-info)]",
  FORWARDED: "border-[var(--color-success-line)] bg-[var(--color-success-fill)] text-[var(--color-success)]",
  DISMISSED: "border-[var(--color-border-strong)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]",
  INSPECTION_SCHEDULED: "border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] text-[var(--color-warning)]",
  INSPECTED: "border-[var(--color-info-line)] bg-[var(--color-info-fill)] text-[var(--color-info)]",
  NO_VIOLATION: "border-[var(--color-success-line)] bg-[var(--color-success-fill)] text-[var(--color-success)]",
  VIOLATION_FOUND: "border-[var(--color-danger-line)] bg-[var(--color-danger-fill)] text-[var(--color-danger)]",
  NOTICE_ISSUED: "border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] text-[var(--color-warning)]",
  SANCTIONED: "border-[var(--color-danger-line)] bg-[var(--color-danger-fill)] text-[var(--color-danger)]",
  CLOSED: "border-[var(--color-border-strong)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]",
  REOPENED: "border-[var(--color-info-line)] bg-[var(--color-info-fill)] text-[var(--color-info)]",
};

function visibleToScenario(report: EnvironmentalReport, scenario: OperationalScenario) {
  return scenario.actor.kind !== "FIELD" || report.assignedCrewId === scenario.actor.crewId;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No informado";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function reportAddress(report: EnvironmentalReport) {
  return report.address ?? report.location?.address ?? "Ubicación sin dirección";
}

function reportDetails(report: EnvironmentalReport) {
  return report.description ?? report.details ?? "Sin detalle operativo informado.";
}

function StatusBadge({ status }: { status: EnvironmentalReport["status"] }) {
  const Icon = statusIcon[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone[status]}`} role="status" aria-label={`Estado: ${ENVIRONMENTAL_REPORT_STATUS_LABELS[status]}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {ENVIRONMENTAL_REPORT_STATUS_LABELS[status]}
    </span>
  );
}

export function EnvironmentalReportsWorkspace({ scenario }: { scenario: OperationalScenario }) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(() => typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("detail"));
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(() => typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("inspectionId"));
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [search, setSearch] = useState("");
  const [announcement, setAnnouncement] = useState("");

  const fetchReports = useCallback(async () => {
    const page = await environmentalReportsAdapter.list({ page: 1, pageSize: 100 });
    return {
      reports: page.environmentalReports.filter((report) => visibleToScenario(report, scenario)),
      total: page.total,
      sanctionOutcomeIntegrationExceptions: page.sanctionOutcomeIntegrationExceptions,
    };
  }, [scenario]);

  const loadReports = useCallback(() => {
    setLoadState({ status: "loading" });
    void fetchReports().then(({ reports, total, sanctionOutcomeIntegrationExceptions }) => setLoadState({ status: "ready", reports, total, sanctionOutcomeIntegrationExceptions })).catch((error: unknown) => setLoadState({ status: "error", message: error instanceof Error ? error.message : "Intente nuevamente en unos instantes." }));
  }, [fetchReports]);

  useEffect(() => {
    let current = true;
    void fetchReports().then(({ reports, total, sanctionOutcomeIntegrationExceptions }) => { if (current) setLoadState({ status: "ready", reports, total, sanctionOutcomeIntegrationExceptions }); }).catch((error: unknown) => { if (current) setLoadState({ status: "error", message: error instanceof Error ? error.message : "Intente nuevamente en unos instantes." }); });
    return () => { current = false; };
  }, [fetchReports]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set("detail", selectedId); else url.searchParams.delete("detail");
    if (selectedInspectionId) url.searchParams.set("inspectionId", selectedInspectionId); else url.searchParams.delete("inspectionId");
    window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`.replace(/\?$/, ""));
  }, [selectedId, selectedInspectionId]);

  const filteredReports = useMemo(() => {
    if (loadState.status !== "ready") return [];
    const normalized = search.trim().toLowerCase();
    return loadState.reports.filter((report) =>
      (!filterStatus || report.status === filterStatus) &&
      (!filterType || report.reportType === filterType) &&
      (!normalized || [report.id, reportAddress(report), reportDetails(report), report.ticketId ?? ""].some((value) => value.toLowerCase().includes(normalized))),
    );
  }, [filterStatus, filterType, loadState, search]);

  const selectedReport = loadState.status === "ready" && selectedId ? loadState.reports.find((report) => report.id === selectedId) ?? null : null;

  const replaceReport = useCallback((updated: EnvironmentalReport) => {
    setLoadState((state) => state.status === "ready" ? { ...state, reports: state.reports.map((report) => report.id === updated.id ? mergeEnvironmentalReportRead(report, updated) : report) } : state);
  }, []);

  const handleCreated = useCallback((created: EnvironmentalReport) => {
    setLoadState((state) => state.status === "ready" ? { ...state, reports: [created, ...state.reports], total: state.total + 1 } : state);
    setCreateOpen(false);
    setAnnouncement(`Expediente ${created.id} abierto en estado Recibido.`);
  }, []);

  const refreshAfterConflict = useCallback(async (id: string) => {
    try {
      const fresh = await environmentalReportsAdapter.get(id);
      if (visibleToScenario(fresh, scenario)) replaceReport(fresh);
    } catch { /* the original action error remains the useful message */ }
  }, [replaceReport, scenario]);

  const handleAction = useCallback(async (action: Action, report: EnvironmentalReport) => {
    setAnnouncement("");
    try {
      const updated = action === "start-review" ? await environmentalReportsAdapter.startReview(report.id) : action === "forward" ? await environmentalReportsAdapter.forward(report.id) : action === "dismiss" ? await environmentalReportsAdapter.dismiss(report.id) : await environmentalReportsAdapter.close(report.id);
      replaceReport(updated);
      setAnnouncement(`${report.id}: ${ENVIRONMENTAL_REPORT_STATUS_LABELS[updated.status]}.`);
    } catch (error) {
      if (error instanceof EnvironmentalReportRequestError && error.status === 409) {
        await refreshAfterConflict(report.id);
        setAnnouncement(`${report.id} cambió mientras se procesaba la acción. Se actualizó el estado; revise nuevamente las acciones disponibles.`);
      } else {
        setAnnouncement(error instanceof Error ? error.message : "No se pudo actualizar el expediente.");
      }
    }
  }, [refreshAfterConflict, replaceReport]);

  if (selectedReport) return <ReportDetail report={selectedReport} scenario={scenario} focusedInspectionId={selectedInspectionId} onBack={() => { setSelectedId(null); setSelectedInspectionId(null); }} onAction={handleAction} onReportUpdated={replaceReport} />;

  return (
    <div className="flex min-h-full flex-col bg-[var(--color-canvas)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)] sm:text-[28px]">Control ambiental</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">{scenario.actor.kind === "OFFICE" ? "Cola de expedientes para clasificar y derivar." : "Hallazgos ambientales asignados a su contexto operativo."}</p>
          </div>
          {scenario.actor.kind === "FIELD" && <Button className="min-h-12 gap-2 sm:min-h-10" onClick={() => setCreateOpen(true)}><FilePlus2 className="h-4 w-4" aria-hidden />Abrir reporte</Button>}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <p className="sr-only" aria-live="polite">{announcement}</p>
        {scenario.actor.kind === "OFFICE" && <QueueFilters filterStatus={filterStatus} filterType={filterType} search={search} onStatus={setFilterStatus} onType={setFilterType} onSearch={setSearch} />}
        {loadState.status === "ready" && scenario.actor.kind === "OFFICE" && loadState.sanctionOutcomeIntegrationExceptions.length > 0 && <SanctionOutcomeIntegrationExceptionsPanel exceptions={loadState.sanctionOutcomeIntegrationExceptions} />}
        {loadState.status === "loading" && <LoadingState />}
        {loadState.status === "error" && <ErrorState message={loadState.message} onRetry={loadReports} />}
        {loadState.status === "ready" && filteredReports.length === 0 && <EmptyState hasFilters={Boolean(filterStatus || filterType || search)} onClear={() => { setFilterStatus(""); setFilterType(""); setSearch(""); }} canCreate={scenario.actor.kind === "FIELD"} onCreate={() => setCreateOpen(true)} />}
        {loadState.status === "ready" && filteredReports.length > 0 && <section aria-label={scenario.actor.kind === "OFFICE" ? "Cola de expedientes ambientales" : "Reportes ambientales asignados"} aria-describedby="environmental-scope-note"><p id="environmental-scope-note" className="sr-only">Seleccione un expediente para consultar su detalle. Los estados representan el ciclo completo del expediente ambiental.</p><ul className="grid gap-3" role="list">{filteredReports.map((report) => <ReportRow key={report.id} report={report} onOpen={() => { setSelectedId(report.id); setSelectedInspectionId(null); }} />)}</ul></section>}
      </main>

      <CreateReportDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={handleCreated} />
    </div>
  );
}

function QueueFilters({ filterStatus, filterType, search, onStatus, onType, onSearch }: { filterStatus: string; filterType: string; search: string; onStatus: (value: string) => void; onType: (value: string) => void; onSearch: (value: string) => void }) {
  return <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4" aria-label="Filtros de la cola"><div className="flex flex-col gap-3 lg:flex-row lg:items-end"><Field className="flex-1"><FieldLabel htmlFor="environmental-search">Buscar expediente</FieldLabel><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" aria-hidden /><input id="environmental-search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="ID, dirección o ticket" className="h-10 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] pl-9 pr-3 text-sm text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]" /></div></Field><Field className="lg:w-64"><FieldLabel htmlFor="environmental-status">Estado</FieldLabel><select id="environmental-status" value={filterStatus} onChange={(event) => onStatus(event.target.value)} className="h-10 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]"><option value="">Todos los estados</option>{statusGroups.map((group) => <optgroup key={group.label} label={group.label}>{group.statuses.map((status) => <option key={status} value={status}>{ENVIRONMENTAL_REPORT_STATUS_LABELS[status]}</option>)}</optgroup>)}</select></Field><Field className="lg:w-64"><FieldLabel htmlFor="environmental-type">Tipo de hallazgo</FieldLabel><select id="environmental-type" value={filterType} onChange={(event) => onType(event.target.value)} className="h-10 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]"><option value="">Todos los tipos</option>{reportTypes.map((type) => <option key={type} value={type}>{ENVIRONMENTAL_REPORT_TYPE_LABELS[type]}</option>)}</select></Field></div></section>;
}

function ReportRow({ report, onOpen }: { report: EnvironmentalReport; onOpen: () => void }) {
  return <li><button type="button" onClick={onOpen} className="flex min-h-12 w-full items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-subtle)] focus-visible:ring-3 focus-visible:ring-[var(--color-focus)] sm:items-center" aria-label={`${report.id}, ${ENVIRONMENTAL_REPORT_TYPE_LABELS[report.reportType]}, ${ENVIRONMENTAL_REPORT_STATUS_LABELS[report.status]}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-info-fill)] text-[var(--color-action)]"><MapPin className="h-4 w-4" aria-hidden /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="font-bold tabular-nums text-[var(--color-text)]">{report.id}</span><span className="text-xs font-semibold text-[var(--color-text-secondary)]">{ENVIRONMENTAL_REPORT_TYPE_LABELS[report.reportType]}</span></span><span className="mt-1 block truncate text-sm text-[var(--color-text)]">{reportAddress(report)}</span><span className="mt-1 block truncate text-xs text-[var(--color-text-secondary)]">Actualizado {formatDate(report.updatedAt)}{report.escalated ? " · Escalado" : ""}</span></span><StatusBadge status={report.status} /><ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[var(--color-text-secondary)] sm:mt-0" aria-hidden /></button></li>;
}

function ReportDetail({ report, scenario, focusedInspectionId, onBack, onAction, onReportUpdated }: { report: EnvironmentalReport; scenario: OperationalScenario; focusedInspectionId: string | null; onBack: () => void; onAction: (action: Action, report: EnvironmentalReport) => Promise<void>; onReportUpdated: (report: EnvironmentalReport) => void }) {
  const isOffice = scenario.actor.kind === "OFFICE";
  const [inspections, setInspections] = useState<EnvironmentalInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"schedule" | "reinspection">("schedule");
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduledService, setScheduledService] = useState<Service | null>(null);
  const [inspectionServices, setInspectionServices] = useState<Record<string, Service | null>>({});
  const [inspectionRepairRequests, setInspectionRepairRequests] = useState<Record<string, RepairRequest[]>>({});
  const [repairRequestInspectionId, setRepairRequestInspectionId] = useState<string | null>(null);
  const [violationNotice, setViolationNotice] = useState<ViolationNotice | null>(null);
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [noticeError, setNoticeError] = useState<string | null>(null);
  const [issueNoticeOpen, setIssueNoticeOpen] = useState(false);

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
      setNoticeError(error instanceof Error ? error.message : "No se pudo cargar el acta de infracción.");
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
      .catch((error: unknown) => { if (current) { setHistoryError(error instanceof Error ? error.message : "No se pudo cargar la historia de inspecciones."); setLoading(false); } });
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
  const canSchedule = isOffice && report.status === "UNDER_REVIEW" && !activeInspection;
  const canReprogram = isOffice && report.status === "INSPECTION_SCHEDULED" && Boolean(activeInspection);
  const canReinspect = isOffice && report.status === "INSPECTED" && inspections.some((inspection) => inspection.outcome === "INCONCLUSIVE");
  const closure = getEnvironmentalReportClosure(report);
  const visibleClosure = closure && (closure.kind !== "sanctioned" || canViewSanctionOutcome) ? closure : null;
  const repairRequestInspection = inspections.find((inspection) => inspection.id === repairRequestInspectionId) ?? null;
  const canCreateRepairRequestFromInspection = (inspection: EnvironmentalInspection) => {
    if (isOffice) return true;
    const sourceService = inspectionServices[inspection.id];
    return scenario.actor.kind === "FIELD" && Boolean(sourceService?.crewId && sourceService.crewId === scenario.actor.crewId);
  };
  const actions: { action: Action; label: string; icon: typeof Check; tone?: string }[] = report.status === "RECEIVED"
    ? [{ action: "start-review", label: "Iniciar revisión", icon: Search }]
    : report.status === "UNDER_REVIEW"
      ? [{ action: "forward", label: "Derivar expediente", icon: Forward }, { action: "dismiss", label: "Desestimar expediente", icon: X, tone: "text-[var(--color-danger)]" }]
      : ["FORWARDED", "DISMISSED", "NO_VIOLATION", "SANCTIONED"].includes(report.status)
        ? [{ action: "close", label: "Cerrar expediente", icon: Check, tone: "text-[var(--color-danger)]" }]
        : [];

  async function handleSchedule(input: EnvironmentalInspectionScheduleInput, crewId: string) {
    setScheduleError(null);
    try {
      const inspection = await environmentalReportsAdapter.schedule(report.id, input);
      if (inspection.serviceId) {
        setScheduledService(await servicesAdapter.get(inspection.serviceId).catch(() => null));
      } else {
        let service: Service;
        try {
          service = await servicesAdapter.create({
            title: `Inspección ambiental · ${report.id}`,
            serviceTypeId: inspectionServiceType.id,
            origin: "INSPECTION",
            inspectionId: inspection.id,
            zoneIds: ["zone-1"],
            targetType: "ENVIRONMENTAL_REPORT",
            targetId: report.id,
            targetRef: reportAddress(report),
            scheduledDate: input.scheduledDate,
            timeWindow: input.timeWindow,
            notes: input.notes,
          });
        } catch {
          throw new Error("La inspección quedó programada, pero no se pudo crear el Servicio POINT. Revise la agenda antes de continuar.");
        }
        try {
          setScheduledService(await servicesAdapter.assignCrew(service.id, { crewId, vehicleId: null }));
        } catch {
          setScheduledService(service);
          throw new Error("El Servicio POINT quedó creado, pero la asignación de la cuadrilla no se completó.");
        }
      }
      onReportUpdated(await environmentalReportsAdapter.get(report.id));
      await loadInspections();
      setScheduleOpen(false);
    } catch (error) {
      setScheduleError(error instanceof Error ? error.message : "No se pudo completar la programación. Revise el estado del expediente.");
    }
  }

  async function handleIssueNotice(input: IssueViolationNoticeInput) {
    setNoticeError(null);
    if (!completedViolationInspection) throw new Error("No hay una inspección con infracción constatada.");
    try {
      const issuedNotice = await environmentalReportsAdapter.issueViolationNotice(completedViolationInspection.id, input);
      setViolationNotice(issuedNotice);
      onReportUpdated(await environmentalReportsAdapter.get(report.id));
      await loadInspections();
      setIssueNoticeOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo emitir el acta de infracción.";
      if (error instanceof EnvironmentalReportRequestError && error.status === 409) {
        const conflictMessage = `Conflicto al emitir el acta: ${message}`;
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
          <Button variant="outline" size="sm" onClick={onBack} className="min-h-10 gap-1.5 sm:min-h-8"><ArrowLeft data-icon="inline-start" aria-hidden />Volver a expedientes</Button>
          <span className="text-xs font-semibold tabular-nums text-[var(--color-text-secondary)]">{report.id}</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)] sm:text-[28px]">Expediente {report.id}</h1><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{ENVIRONMENTAL_REPORT_TYPE_LABELS[report.reportType]} · actualización de {formatDate(report.updatedAt)}</p></div>
          <StatusBadge status={report.status} />
        </div>
        {isOffice && actions.length > 0 && <section className="rounded-2xl border border-[var(--color-action)] bg-[var(--color-info-fill)] p-4 sm:p-5" aria-labelledby="report-actions-title"><h2 id="report-actions-title" className="text-sm font-bold text-[var(--color-text)]">Siguiente decisión de Oficina</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Las acciones disponibles respetan el estado actual del expediente.</p><div className="mt-4 flex flex-wrap gap-2">{actions.map(({ action, label, icon: Icon, tone }) => <Button key={action} variant={action === "forward" || action === "start-review" ? "default" : "outline"} className={`min-h-10 gap-2 ${tone ?? ""}`} onClick={() => void onAction(action, report)}><Icon data-icon="inline-start" aria-hidden />{label}</Button>)}</div></section>}
        {isOffice && (canSchedule || canReprogram || canReinspect) && <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5" aria-labelledby="inspection-scheduling-title"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><CalendarDays aria-hidden /><div><h2 id="inspection-scheduling-title" className="text-sm font-bold text-[var(--color-text)]">Programación de inspección</h2><p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">{canReinspect ? "La inspección anterior fue inconclusa. Registre una nueva inspección y un nuevo Servicio POINT." : "Defina la fecha y la cuadrilla. El tipo de Servicio POINT se determina automáticamente."}</p></div></div><div className="flex flex-wrap gap-2">{(canSchedule || canReinspect) && <Button className="min-h-10 gap-2" onClick={() => { setScheduleMode(canReinspect ? "reinspection" : "schedule"); setScheduleOpen(true); }}><CalendarDays data-icon="inline-start" aria-hidden />{canReinspect ? "Programar reinspección" : "Programar inspección"}</Button>}{canReprogram && <Button variant="outline" className="min-h-10 gap-2" onClick={() => { setScheduleMode("schedule"); setScheduleOpen(true); }}><RefreshCw data-icon="inline-start" aria-hidden />Reprogramar inspección</Button>}</div></div></section>}
        {scheduleError && <div role="alert" className="rounded-xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)] p-3 text-sm text-[var(--color-danger)]">{scheduleError}</div>}
        {canViewViolationNotice && completedViolationInspection && <ViolationNoticePanel inspection={completedViolationInspection} notice={violationNotice} loading={noticeLoading} error={noticeError} showIssue={showNoticeIssuance} canIssue={canSubmitNotice} hasEvidence={hasInspectionEvidence} onIssue={() => setIssueNoticeOpen(true)} />}
        <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]"><div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-4 sm:p-5"><h2 className="text-sm font-bold text-[var(--color-text)]">Contexto operativo</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><DataField label="Ubicación" value={reportAddress(report)} /><DataField label="Detalle del hallazgo" value={reportDetails(report)} wide /><DataField label="Prioridad" value={ENVIRONMENTAL_REPORT_PRIORITY_LABELS[report.priority]} /><DataField label="Creado" value={formatDate(report.createdAt)} /><DataField label="Última actualización" value={formatDate(report.updatedAt)} /></dl></div><div className="rounded-2xl border border-[var(--color-border)] p-4 sm:p-5"><h2 className="text-sm font-bold text-[var(--color-text)]">Vigencia del registro</h2><p className="mt-2 text-sm text-[var(--color-text-secondary)]">La prioridad y los cambios tardíos de M2 se muestran como información de lectura.</p>{report.escalated && <p className="mt-4 rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] p-3 text-sm font-semibold text-[var(--color-warning)]">Escalado por M2</p>}{report.citizenResponse && isOffice && <p className="mt-4 text-sm text-[var(--color-text)]">{report.citizenResponse}</p>}{report.ticketId && isOffice && <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Ticket de origen: <span className="font-semibold tabular-nums text-[var(--color-text)]">{report.ticketId}</span></p>}</div></section>
         <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5" aria-labelledby="inspection-history-title"><div className="flex items-center gap-2"><ClipboardCheck aria-hidden /><h2 id="inspection-history-title" className="text-sm font-bold text-[var(--color-text)]">Historia de inspecciones</h2></div>{loading && <p className="mt-3 text-sm text-[var(--color-text-secondary)]">Cargando historia de inspecciones…</p>}{historyError && <p className="mt-3 text-sm text-[var(--color-danger)]" role="alert">{historyError}</p>}{!loading && !historyError && inspections.length === 0 && <p className="mt-3 text-sm text-[var(--color-text-secondary)]">No hay inspecciones registradas.</p>}{!loading && !historyError && inspections.length > 0 && <ol className="mt-4 space-y-3">{inspections.map((inspection) => <li key={inspection.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-[var(--color-text)]">{inspection.id}</span><span className="text-sm text-[var(--color-text-secondary)]">{inspection.outcome ? `Resultado: ${inspection.outcome}` : "Inspección programada"}</span></div><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{inspection.scheduledDate} · {inspection.timeWindow.start}–{inspection.timeWindow.end} · {inspection.checklistVersion}</p>{inspection.serviceId && <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Servicio POINT: <span className="font-semibold text-[var(--color-text)]">{inspection.serviceId}</span></p>}{scheduledService && inspection.id === inspections[inspections.length - 1]?.id && <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Cuadrilla asignada: <span className="font-semibold text-[var(--color-text)]">{scheduledService.crewName ?? scheduledService.crewId ?? "Pendiente"}</span></p>}<div className="mt-3 flex flex-wrap items-center gap-2">{inspectionRepairRequests[inspection.id]?.map((request) => <span key={request.id} className="rounded-full border border-[var(--color-info-line)] bg-[var(--color-info-fill)] px-2.5 py-1 text-xs font-semibold text-[var(--color-info)]" role="status" aria-label={`Derivación ${request.id}: ${request.status === "REQUESTED" ? "Pendiente" : request.status === "IN_PROGRESS" ? "En curso" : "Cerrada"}`}>{request.id} · {request.status === "REQUESTED" ? "Pendiente de respuesta de M3" : request.status === "IN_PROGRESS" ? "En curso" : "Cerrada"}</span>)}{canCreateRepairRequestFromInspection(inspection) && <Button type="button" variant="outline" className="min-h-12 gap-2 sm:min-h-10" onClick={() => setRepairRequestInspectionId(inspection.id)}><Wrench data-icon="inline-start" aria-hidden />Crear derivación de reparación</Button>}</div></li>)}</ol>}</section>
        {visibleClosure && <EnvironmentalReportClosurePanel closure={visibleClosure} />}
        {canViewSanctionOutcome && report.sanctionOutcome && <SanctionOutcomePanel outcome={report.sanctionOutcome} />}
      </main>
       <InspectionSchedulingDialog open={scheduleOpen} mode={scheduleMode} activeInspection={activeInspection} onOpenChange={setScheduleOpen} onSubmit={handleSchedule} />
       <IssueViolationNoticeDialog key={`${report.id}-${issueNoticeOpen ? "open" : "closed"}`} open={issueNoticeOpen} inspection={completedViolationInspection} onOpenChange={setIssueNoticeOpen} onSubmit={handleIssueNotice} />
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
  const tone = isWaiting
    ? "border-[var(--color-info-line)] bg-[var(--color-info-fill)]"
    : isDeadline
      ? "border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]"
      : "border-[var(--color-success-line)] bg-[var(--color-success-fill)]";
  const iconTone = isWaiting
    ? "text-[var(--color-info)]"
    : isDeadline
      ? "text-[var(--color-warning)]"
      : "text-[var(--color-success)]";

  return (
    <section className={`rounded-2xl border p-4 sm:p-5 ${tone}`} role="region" aria-label="Estado de cierre">
      <div className="flex items-start gap-3">
        {isWaiting ? <Clock3 className={`mt-0.5 h-5 w-5 shrink-0 ${iconTone}`} aria-hidden /> : isDeadline ? <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${iconTone}`} aria-hidden /> : <CircleCheck className={`mt-0.5 h-5 w-5 shrink-0 ${iconTone}`} aria-hidden />}
        <div className="min-w-0">
          <p className="font-semibold text-[var(--color-text)]">{closure.label}</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{closure.description}</p>
          {"deadlineAt" in closure && <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Plazo de M4: <span className="font-semibold tabular-nums text-[var(--color-text)]">{formatDate(closure.deadlineAt)}</span></p>}
        </div>
      </div>
    </section>
  );
}

function SanctionOutcomeIntegrationExceptionsPanel({ exceptions }: { exceptions: SanctionOutcomeIntegrationException[] }) {
  return (
    <section className="rounded-2xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] p-4 sm:p-5" role="region" aria-label="Excepciones de integración M4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-warning)]" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[var(--color-text)]">Excepciones de integración M4</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Estas resoluciones no pudieron asociarse a un acta conocida. Revise la correlación antes de tomar cualquier decisión fuera de M6.</p>
        </div>
      </div>
      <ul className="mt-4 grid gap-3" role="list">
        {exceptions.map((exception) => (
          <li key={`${exception.violationNoticeId}-${exception.externalRef}`} className="rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-surface)] p-3">
            <p className="font-semibold text-[var(--color-text)]">Acta recibida: <span className="break-words tabular-nums">{exception.violationNoticeId}</span></p>
            <p className="mt-1 break-words text-sm text-[var(--color-text-secondary)]">Referencia externa: <span className="font-semibold text-[var(--color-text)]">{exception.externalRef}</span></p>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{exception.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SanctionOutcomePanel({ outcome }: { outcome: NonNullable<EnvironmentalReport["sanctionOutcome"]> }) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5" role="region" aria-label="Resolución de M4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-action)]" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[var(--color-text)]">Resolución de M4</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Registro de solo lectura. M6 no edita ni reemplaza la decisión externa.</p>
        </div>
      </div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <DataField label="Decisión" value={SANCTION_DECISION_LABELS[outcome.decision]} />
        <DataField label="Fecha de decisión" value={formatDate(outcome.decidedAt)} />
        <DataField label="Acta relacionada" value={outcome.violationNoticeId} />
        <DataField label="Referencia externa" value={outcome.externalRef} />
        {outcome.dismissalReason && <DataField label="Motivo informado por M4" value={outcome.dismissalReason} wide />}
      </dl>
    </section>
  );
}

function ViolationNoticePanel({ inspection, notice, loading, error, showIssue, canIssue, hasEvidence, onIssue }: { inspection: EnvironmentalInspection; notice: ViolationNotice | null; loading: boolean; error: string | null; showIssue: boolean; canIssue: boolean; hasEvidence: boolean; onIssue: () => void }) {
  return <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5" aria-labelledby="violation-notice-title"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><FilePlus2 className="mt-0.5 h-5 w-5 text-[var(--color-action)]" aria-hidden /><div><h2 id="violation-notice-title" className="text-sm font-bold text-[var(--color-text)]">Acta de infracción</h2><p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">El acta se emite una sola vez a partir de la inspección {inspection.id} y queda como registro de lectura.</p></div></div>{showIssue && !notice && <Button className="min-h-10 gap-2" onClick={onIssue} disabled={!canIssue}><FilePlus2 data-icon="inline-start" aria-hidden />Emitir aviso de infracción</Button>}</div>{loading && <p className="mt-4 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Consultando acta…</p>}{error && <div className="mt-4 rounded-xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)] p-3 text-sm text-[var(--color-danger)]" role="alert">{error}</div>}{!loading && !notice && showIssue && <div className="mt-4 space-y-2"><p className="text-sm text-[var(--color-text-secondary)]">La evidencia se conserva dentro de la inspección; no se copia al acta.</p>{!hasEvidence && <p className="rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] p-3 text-sm font-semibold text-[var(--color-warning)]">La emisión está bloqueada: agregue evidencia a la inspección antes de emitir el acta.</p>}</div>}{!loading && !notice && !showIssue && <p className="mt-4 text-sm text-[var(--color-text-secondary)]">No hay un acta disponible para esta inspección.</p>}{notice && <div className="mt-4 grid gap-4"><div className="rounded-xl border border-[var(--color-success-line)] bg-[var(--color-success-fill)] p-3"><p className="font-semibold text-[var(--color-text)]">Acta inmutable</p><p className="mt-1 text-sm text-[var(--color-text-secondary)]">No se puede editar ni eliminar. Una corrección requiere una nueva inspección.</p></div><dl className="grid gap-4 sm:grid-cols-2"><DataField label="Número de acta" value={notice.noticeNumber} /><DataField label="Fecha de emisión" value={formatDate(notice.issuedAt)} /><DataField label="Actas previas del establecimiento" value={String(notice.priorNoticeCount)} /><DataField label="Tipo de infracción" value={violationTypeLabels[notice.violationType] ?? notice.violationType} /><DataField label="Gravedad" value={severityLabels[notice.severity] ?? notice.severity} /><DataField label="Acción sugerida" value={suggestedActionLabels[notice.suggestedAction] ?? notice.suggestedAction} /></dl>{notice.establishmentId ? <p className="text-sm text-[var(--color-text-secondary)]">Establecimiento resuelto: <span className="font-semibold text-[var(--color-text)]">{notice.establishmentId}</span></p> : <div className="flex items-start gap-3 rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] p-3 text-sm text-[var(--color-text)]" role="status" aria-label="Aviso no-forwarded"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" aria-hidden /><div><p className="font-semibold">Aviso no-forwarded</p><p className="mt-1 text-[var(--color-text-secondary)]"><span>M4 no fue contactado</span> y el expediente fue cerrado localmente. Este registro no representa una sanción externa.</p></div></div>}</div>}</section>;
}

function IssueViolationNoticeDialog({ open, inspection, onOpenChange, onSubmit }: { open: boolean; inspection: EnvironmentalInspection | null; onOpenChange: (open: boolean) => void; onSubmit: (input: IssueViolationNoticeInput) => Promise<void> }) {
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
      setLookupMessage("Ingrese un ID, nombre o dirección para buscar el establecimiento.");
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
        setLookupMessage("No se encontró un establecimiento. M4 no será contactado por este flujo.");
      }
    } catch {
      setLookupState("idle");
      setLookupMessage("No se pudo consultar el directorio local. Intente nuevamente.");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!resolvedEstablishment && !nonForwarded) nextErrors.establishment = "Resuelva un establecimiento o continúe sin establecimiento.";
    if (!violationType) nextErrors.violationType = "Seleccione el tipo de infracción.";
    if (!severity) nextErrors.severity = "Seleccione la gravedad.";
    if (!suggestedAction) nextErrors.suggestedAction = "Seleccione la acción sugerida.";
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length > 0 || !inspection) return;

    const parsed = issueViolationNoticeInputSchema.safeParse({ establishmentId: resolvedEstablishment?.id ?? null, violationType, severity, suggestedAction });
    if (!parsed.success) {
      setSubmitError("Revise los datos requeridos antes de emitir el acta.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No se pudo emitir el acta de infracción.");
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

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[min(90vh,760px)] max-w-lg overflow-y-auto"><DialogHeader><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-action)]"><Building2 className="h-4 w-4" aria-hidden />Emisión de acta</div><DialogTitle>Emitir aviso de infracción</DialogTitle><DialogDescription>La emisión es inmutable. Verifique la inspección y seleccione un establecimiento antes de registrar el aviso.</DialogDescription></DialogHeader>{submitError && <div role="alert" className="rounded-xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)] p-3 text-sm text-[var(--color-danger)]">{submitError}</div>}<form id="violation-notice-form" onSubmit={submit}><FieldGroup><Field><FieldLabel htmlFor="violation-establishment">Buscar establecimiento <span aria-hidden="true">*</span></FieldLabel><div className="flex flex-col gap-2 sm:flex-row"><input id="violation-establishment" value={query} onChange={(event) => updateQuery(event.target.value)} disabled={submitting || lookupState === "loading"} placeholder="ID, nombre o dirección" aria-invalid={Boolean(errors.establishment)} aria-describedby={errors.establishment ? "violation-establishment-error" : "violation-establishment-help"} className="h-12 min-w-0 flex-1 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]" /><Button type="button" variant="outline" className="min-h-12 gap-2 sm:min-h-10" onClick={() => void lookupEstablishment()} disabled={submitting || lookupState === "loading"}><Search data-icon="inline-start" aria-hidden />{lookupState === "loading" ? "Buscando…" : "Buscar establecimiento"}</Button></div>{errors.establishment && <FieldError id="violation-establishment-error">{errors.establishment}</FieldError>}{!errors.establishment && <FieldDescription id="violation-establishment-help">El directorio es un adapter local reemplazable. M4 no se contacta durante la búsqueda.</FieldDescription>}{lookupState === "resolved" && resolvedEstablishment && <div className="flex items-start gap-3 rounded-xl border border-[var(--color-success-line)] bg-[var(--color-success-fill)] p-3" role="status"><Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" aria-hidden /><div><p className="font-semibold text-[var(--color-text)]">{resolvedEstablishment.name}</p><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{resolvedEstablishment.id} · {resolvedEstablishment.address}</p></div></div>}{lookupState === "not-found" && <div className="rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] p-3" role="status"><p className="text-sm text-[var(--color-text)]">{lookupMessage}</p><Button type="button" variant="outline" className="mt-3 min-h-10" onClick={() => { setNonForwarded(true); setLookupMessage("Se registrará un aviso no-forwarded: M4 no fue contactado y el expediente se cerrará localmente."); }}>Continuar sin establecimiento</Button></div>}{lookupMessage && lookupState !== "not-found" && <p className="text-sm text-[var(--color-danger)]" role="alert">{lookupMessage}</p>}{nonForwarded && <div className="flex items-start gap-3 rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] p-3" role="status"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" aria-hidden /><p className="text-sm text-[var(--color-text)]">Aviso no-forwarded: M4 no fue contactado. El expediente se cerrará localmente.</p></div>}</Field><Field><FieldLabel htmlFor="violation-type">Tipo de infracción <span aria-hidden="true">*</span></FieldLabel><select id="violation-type" value={violationType} onChange={(event) => { setViolationType(event.target.value as IssueViolationNoticeInput["violationType"]); setErrors((current) => ({ ...current, violationType: "" })); }} disabled={submitting} aria-required="true" aria-invalid={Boolean(errors.violationType)} aria-describedby={errors.violationType ? "violation-type-error" : undefined} className="h-12 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]"><option value="">Seleccione el tipo</option>{Object.entries(violationTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{errors.violationType && <FieldError id="violation-type-error">{errors.violationType}</FieldError>}</Field><Field><FieldLabel htmlFor="violation-severity">Gravedad <span aria-hidden="true">*</span></FieldLabel><select id="violation-severity" value={severity} onChange={(event) => { setSeverity(event.target.value as IssueViolationNoticeInput["severity"]); setErrors((current) => ({ ...current, severity: "" })); }} disabled={submitting} aria-required="true" aria-invalid={Boolean(errors.severity)} aria-describedby={errors.severity ? "violation-severity-error" : undefined} className="h-12 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]"><option value="">Seleccione la gravedad</option>{Object.entries(severityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{errors.severity && <FieldError id="violation-severity-error">{errors.severity}</FieldError>}</Field><Field><FieldLabel htmlFor="violation-suggested-action">Acción sugerida <span aria-hidden="true">*</span></FieldLabel><select id="violation-suggested-action" value={suggestedAction} onChange={(event) => { setSuggestedAction(event.target.value as IssueViolationNoticeInput["suggestedAction"]); setErrors((current) => ({ ...current, suggestedAction: "" })); }} disabled={submitting} aria-required="true" aria-invalid={Boolean(errors.suggestedAction)} aria-describedby={errors.suggestedAction ? "violation-suggested-action-error" : undefined} className="h-12 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]"><option value="">Seleccione la acción</option>{Object.entries(suggestedActionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{errors.suggestedAction && <FieldError id="violation-suggested-action-error">{errors.suggestedAction}</FieldError>}</Field></FieldGroup></form><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Volver al expediente</Button><Button type="submit" form="violation-notice-form" disabled={submitting || (!resolvedEstablishment && !nonForwarded)} className="min-h-10 gap-2">{submitting && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden />}{submitting ? "Emitiendo aviso…" : nonForwarded ? "Registrar aviso no-forwarded" : "Emitir aviso de infracción"}</Button></DialogFooter></DialogContent></Dialog>;
}

function InspectionSchedulingDialog({ open, mode, activeInspection, onOpenChange, onSubmit }: { open: boolean; mode: "schedule" | "reinspection"; activeInspection: EnvironmentalInspection | null; onOpenChange: (open: boolean) => void; onSubmit: (input: EnvironmentalInspectionScheduleInput, crewId: string) => Promise<void> }) {
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("11:00");
  const [crewId, setCrewId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!date || !crewId) { setError("Indique la fecha y la cuadrilla para continuar."); return; }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ scheduledDate: date, timeWindow: { start, end }, checklistVersion: activeInspection?.checklistVersion ?? inspectionChecklistVersions[1].value, checklist: activeInspection?.checklist ?? inspectionChecklist }, crewId);
      setDate("");
      setCrewId("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo completar la programación.");
    } finally {
      setSubmitting(false);
    }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg"><DialogHeader><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-action)]"><CalendarDays aria-hidden />Programación operativa</div><DialogTitle>{mode === "reinspection" ? "Programar reinspección" : activeInspection ? "Reprogramar inspección" : "Programar inspección"}</DialogTitle><DialogDescription>{mode === "reinspection" ? "La inspección anterior fue inconclusa. Se creará una nueva inspección con su propio Servicio POINT." : "Defina fecha y cuadrilla. El checklist se captura en la inspección y el modo POINT se asigna automáticamente."}</DialogDescription></DialogHeader>{error && <div role="alert" className="rounded-xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)] p-3 text-sm text-[var(--color-danger)]">{error}</div>}<form id="inspection-scheduling-form" onSubmit={submit}><FieldGroup><Field><FieldLabel htmlFor="inspection-scheduled-date">Fecha de inspección</FieldLabel><input id="inspection-scheduled-date" aria-required="true" type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={submitting} className="h-12 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel htmlFor="inspection-time-start">Inicio</FieldLabel><input id="inspection-time-start" type="time" value={start} onChange={(event) => setStart(event.target.value)} disabled={submitting} className="h-12 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]" /></Field><Field><FieldLabel htmlFor="inspection-time-end">Fin</FieldLabel><input id="inspection-time-end" type="time" value={end} onChange={(event) => setEnd(event.target.value)} disabled={submitting} className="h-12 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]" /></Field></div><Field><FieldLabel htmlFor="inspection-checklist-version">Versión del checklist</FieldLabel><select id="inspection-checklist-version" value={activeInspection?.checklistVersion ?? inspectionChecklistVersions[1].value} disabled className="h-12 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-subtle)] px-3 text-base text-[var(--color-text)]">{inspectionChecklistVersions.map((version) => <option key={version.value} value={version.value}>{version.label}</option>)}</select><FieldDescription>La versión queda capturada en la inspección y no se elige para el Servicio POINT.</FieldDescription></Field><Field><FieldLabel htmlFor="inspection-crew">Cuadrilla</FieldLabel><select id="inspection-crew" value={crewId} onChange={(event) => setCrewId(event.target.value)} disabled={submitting} aria-required="true" className="h-12 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)]"><option value="">Seleccione una cuadrilla</option>{CREW_CATALOG.map((crew) => <option key={crew.id} value={crew.id}>{crew.name}</option>)}</select></Field></FieldGroup></form><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button><Button type="submit" form="inspection-scheduling-form" disabled={submitting} className="min-h-10 gap-2">{submitting && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden />}{submitting ? "Guardando programación…" : mode === "reinspection" ? "Programar reinspección" : activeInspection ? "Guardar reprogramación" : "Programar inspección"}</Button></DialogFooter></DialogContent></Dialog>;
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
    if (!description.trim()) nextErrors.description = "Describa el hallazgo para que Oficina pueda clasificarlo.";
    if (!lat || Number.isNaN(Number(lat))) nextErrors.lat = "Indique una latitud válida.";
    if (!lng || Number.isNaN(Number(lng))) nextErrors.lng = "Indique una longitud válida.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitting(true); setErrorMessage(null);
    try { const created = await environmentalReportsAdapter.create({ reportType: reportType as EnvironmentalReportType, address: address.trim(), description: description.trim(), lat: Number(lat), lng: Number(lng) }); onSuccess(created); setReportType(""); setAddress(""); setDescription(""); setLat(""); setLng(""); setErrors({}); } catch (error) { setErrorMessage(error instanceof Error ? error.message : "No se pudo abrir el reporte."); } finally { setSubmitting(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg"><DialogHeader><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-action)]"><MapPin className="h-4 w-4" aria-hidden />Detección de campo</div><DialogTitle>Abrir reporte ambiental</DialogTitle><DialogDescription>Registre el hallazgo observado en la vía pública. El expediente se abrirá como Recibido para su revisión.</DialogDescription></DialogHeader>{errorMessage && <div role="alert" className="rounded-xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)] p-3 text-sm text-[var(--color-danger)]">{errorMessage}</div>}<form id="environmental-report-form" onSubmit={submit} className="overflow-y-auto"><FieldGroup><Field><FieldLabel htmlFor="environmental-report-type">Tipo de hallazgo <span aria-hidden="true">*</span></FieldLabel><select id="environmental-report-type" value={reportType} onChange={(event) => { setReportType(event.target.value as EnvironmentalReportType); setErrors((current) => ({ ...current, reportType: "" })); }} disabled={submitting} className="h-12 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]" aria-invalid={Boolean(errors.reportType)} aria-describedby={errors.reportType ? "environmental-report-type-error" : undefined}><option value="">Seleccione el tipo</option>{reportTypes.map((type) => <option key={type} value={type}>{ENVIRONMENTAL_REPORT_TYPE_LABELS[type]}</option>)}</select>{errors.reportType && <FieldError id="environmental-report-type-error">{errors.reportType}</FieldError>}</Field><Field><FieldLabel htmlFor="environmental-report-address">Dirección o referencia <span aria-hidden="true">*</span></FieldLabel><input id="environmental-report-address" value={address} onChange={(event) => setAddress(event.target.value)} disabled={submitting} placeholder="Ej.: Av. Warnes 1840" className="h-12 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]" aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? "environmental-report-address-error" : undefined} />{errors.address && <FieldError id="environmental-report-address-error">{errors.address}</FieldError>}</Field><Field><FieldLabel htmlFor="environmental-report-description">Descripción del hallazgo <span aria-hidden="true">*</span></FieldLabel><textarea id="environmental-report-description" value={description} onChange={(event) => setDescription(event.target.value)} disabled={submitting} rows={4} placeholder="Describa qué observó y cuándo." className="w-full resize-y rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-3 text-base text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]" aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "environmental-report-description-error" : undefined} />{errors.description && <FieldError id="environmental-report-description-error">{errors.description}</FieldError>}<FieldDescription>Incluya señales útiles para la clasificación posterior. No registre datos personales.</FieldDescription></Field><div className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel htmlFor="environmental-report-lat">Latitud <span aria-hidden="true">*</span></FieldLabel><input id="environmental-report-lat" type="number" step="any" value={lat} onChange={(event) => setLat(event.target.value)} disabled={submitting} className="h-12 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]" aria-invalid={Boolean(errors.lat)} aria-describedby={errors.lat ? "environmental-report-lat-error" : undefined} />{errors.lat && <FieldError id="environmental-report-lat-error">{errors.lat}</FieldError>}</Field><Field><FieldLabel htmlFor="environmental-report-lng">Longitud <span aria-hidden="true">*</span></FieldLabel><input id="environmental-report-lng" type="number" step="any" value={lng} onChange={(event) => setLng(event.target.value)} disabled={submitting} className="h-12 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]" aria-invalid={Boolean(errors.lng)} aria-describedby={errors.lng ? "environmental-report-lng-error" : undefined} />{errors.lng && <FieldError id="environmental-report-lng-error">{errors.lng}</FieldError>}</Field></div></FieldGroup></form><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button><Button type="submit" form="environmental-report-form" disabled={submitting} className="min-h-10 gap-2">{submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{submitting ? "Abriendo reporte…" : "Abrir reporte"}</Button></DialogFooter></DialogContent></Dialog>;
}

function LoadingState() { return <div className="flex min-h-56 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]" role="status"><Loader2 className="h-5 w-5 animate-spin text-[var(--color-action)]" aria-hidden /><span className="sr-only">Cargando expedientes ambientales</span></div>; }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-[var(--color-danger-line)] bg-[var(--color-surface)] p-6 text-center" role="alert"><CircleAlert className="h-8 w-8 text-[var(--color-danger)]" aria-hidden /><h2 className="mt-3 text-lg font-bold text-[var(--color-text)]">No se pudieron cargar los expedientes</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{message}</p><Button className="mt-5 min-h-10 gap-2" onClick={onRetry}><RefreshCw className="h-4 w-4" aria-hidden />Reintentar carga</Button></div>; }
function EmptyState({ hasFilters, onClear, canCreate, onCreate }: { hasFilters: boolean; onClear: () => void; canCreate: boolean; onCreate: () => void }) { return <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-6 text-center"><CircleCheck className="h-8 w-8 text-[var(--color-success)]" aria-hidden /><h2 className="mt-3 text-lg font-bold text-[var(--color-text)]">{hasFilters ? "No hay expedientes con esos filtros" : "No hay expedientes asignados"}</h2><p className="mt-1 max-w-md text-sm text-[var(--color-text-secondary)]">{hasFilters ? "Pruebe con otro estado, tipo o término de búsqueda." : "Los nuevos reportes aparecerán aquí después de abrirlos."}</p>{hasFilters ? <Button variant="outline" className="mt-5 min-h-10" onClick={onClear}>Limpiar filtros</Button> : canCreate && <Button className="mt-5 min-h-10 gap-2" onClick={onCreate}><FilePlus2 className="h-4 w-4" aria-hidden />Abrir reporte</Button>}</div>; }
