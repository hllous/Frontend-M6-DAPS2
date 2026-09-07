"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Check,
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
  environmentalReportsAdapter,
  EnvironmentalReportRequestError,
  type EnvironmentalReport,
  type EnvironmentalReportType,
} from "@/lib/environmental-reports";
import type { OperationalScenario } from "@/lib/scenarios";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; reports: EnvironmentalReport[]; total: number };

type Action = "start-review" | "forward" | "dismiss" | "close";

const reportTypes = environmentalReportTypeSchema.options;
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
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [search, setSearch] = useState("");
  const [announcement, setAnnouncement] = useState("");

  const fetchReports = useCallback(async () => {
    const page = await environmentalReportsAdapter.list({ page: 1, pageSize: 100 });
    return { reports: page.environmentalReports.filter((report) => visibleToScenario(report, scenario)), total: page.total };
  }, [scenario]);

  const loadReports = useCallback(() => {
    setLoadState({ status: "loading" });
    void fetchReports().then(({ reports, total }) => setLoadState({ status: "ready", reports, total })).catch((error: unknown) => setLoadState({ status: "error", message: error instanceof Error ? error.message : "Intente nuevamente en unos instantes." }));
  }, [fetchReports]);

  useEffect(() => {
    let current = true;
    void fetchReports().then(({ reports, total }) => { if (current) setLoadState({ status: "ready", reports, total }); }).catch((error: unknown) => { if (current) setLoadState({ status: "error", message: error instanceof Error ? error.message : "Intente nuevamente en unos instantes." }); });
    return () => { current = false; };
  }, [fetchReports]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set("detail", selectedId); else url.searchParams.delete("detail");
    window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`.replace(/\?$/, ""));
  }, [selectedId]);

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
    setLoadState((state) => state.status === "ready" ? { ...state, reports: state.reports.map((report) => report.id === updated.id ? updated : report) } : state);
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

  if (selectedReport) return <ReportDetail report={selectedReport} scenario={scenario} onBack={() => setSelectedId(null)} onAction={handleAction} />;

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
        {loadState.status === "loading" && <LoadingState />}
        {loadState.status === "error" && <ErrorState message={loadState.message} onRetry={loadReports} />}
        {loadState.status === "ready" && filteredReports.length === 0 && <EmptyState hasFilters={Boolean(filterStatus || filterType || search)} onClear={() => { setFilterStatus(""); setFilterType(""); setSearch(""); }} canCreate={scenario.actor.kind === "FIELD"} onCreate={() => setCreateOpen(true)} />}
        {loadState.status === "ready" && filteredReports.length > 0 && <section aria-label={scenario.actor.kind === "OFFICE" ? "Cola de expedientes ambientales" : "Reportes ambientales asignados"} aria-describedby="environmental-scope-note"><p id="environmental-scope-note" className="sr-only">Seleccione un expediente para consultar su detalle. Los estados representan el ciclo completo del expediente ambiental.</p><ul className="grid gap-3" role="list">{filteredReports.map((report) => <ReportRow key={report.id} report={report} onOpen={() => setSelectedId(report.id)} />)}</ul></section>}
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

function ReportDetail({ report, scenario, onBack, onAction }: { report: EnvironmentalReport; scenario: OperationalScenario; onBack: () => void; onAction: (action: Action, report: EnvironmentalReport) => Promise<void> }) {
  const isOffice = scenario.actor.kind === "OFFICE";
  const actions: { action: Action; label: string; icon: typeof Check; tone?: string }[] = report.status === "RECEIVED" ? [{ action: "start-review", label: "Iniciar revisión", icon: Search }] : report.status === "UNDER_REVIEW" ? [{ action: "forward", label: "Derivar expediente", icon: Forward }, { action: "dismiss", label: "Desestimar expediente", icon: X, tone: "text-[var(--color-danger)]" }] : ["FORWARDED", "DISMISSED", "NO_VIOLATION", "SANCTIONED"].includes(report.status) ? [{ action: "close", label: "Cerrar expediente", icon: Check, tone: "text-[var(--color-danger)]" }] : [];
  return <div className="flex min-h-full flex-col bg-[var(--color-surface)]" role="region" aria-label={`Detalle de ${report.id}`}><header className="border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-4 py-3 sm:px-6 lg:px-8"><div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3"><Button variant="outline" size="sm" onClick={onBack} className="min-h-10 gap-1.5 sm:min-h-8"><ArrowLeft className="h-4 w-4" aria-hidden />Volver a expedientes</Button><span className="text-xs font-semibold tabular-nums text-[var(--color-text-secondary)]">{report.id}</span></div></header><main className="mx-auto w-full max-w-6xl flex-1 space-y-5 p-4 sm:p-6 lg:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)] sm:text-[28px]">Expediente {report.id}</h1><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{ENVIRONMENTAL_REPORT_TYPE_LABELS[report.reportType]} · actualización de {formatDate(report.updatedAt)}</p></div><StatusBadge status={report.status} /></div>{isOffice && actions.length > 0 && <section className="rounded-2xl border border-[var(--color-action)] bg-[var(--color-info-fill)] p-4 sm:p-5" aria-labelledby="report-actions-title"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-action)]"><ArrowUpRight className="h-4 w-4" aria-hidden /></span><div className="min-w-0 flex-1"><h2 id="report-actions-title" className="text-sm font-bold text-[var(--color-text)]">Siguiente decisión de Oficina</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Las acciones disponibles respetan el estado actual del expediente.</p><div className="mt-4 flex flex-wrap gap-2">{actions.map(({ action, label, icon: Icon, tone }) => <Button key={action} variant={action === "forward" || action === "start-review" ? "default" : "outline"} className={`min-h-10 gap-2 ${tone ?? ""}`} onClick={() => void onAction(action, report)}><Icon className="h-4 w-4" aria-hidden />{label}</Button>)}</div></div></div></section>}{report.status === "CLOSED" && <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] p-4" role="note"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-warning)]" aria-hidden /><p className="text-sm text-[var(--color-text)]">Este expediente está cerrado. Una reapertura informada por una lectura posterior se mostrará como <strong>Reabierto · en revisión</strong>; no se genera una acción desde esta pantalla.</p></div>}{report.status === "SANCTIONED" && <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)] p-4" role="note"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-danger)]" aria-hidden /><p className="text-sm text-[var(--color-text)]">La sanción es terminal y este expediente no puede reabrirse desde M6.</p></div>}<section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]"><div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-4 sm:p-5"><h2 className="text-sm font-bold text-[var(--color-text)]">Contexto operativo</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><DataField label="Ubicación" value={reportAddress(report)} /><DataField label="Detalle del hallazgo" value={reportDetails(report)} wide /><DataField label="Prioridad" value={ENVIRONMENTAL_REPORT_PRIORITY_LABELS[report.priority]} /><DataField label="Creado" value={formatDate(report.createdAt)} /><DataField label="Última actualización" value={formatDate(report.updatedAt)} />{report.deadlineAt && <DataField label="Plazo de resolución" value={formatDate(report.deadlineAt)} />}</dl></div><div className="rounded-2xl border border-[var(--color-border)] p-4 sm:p-5"><h2 className="text-sm font-bold text-[var(--color-text)]">Vigencia del registro</h2><p className="mt-2 text-sm text-[var(--color-text-secondary)]">La prioridad y los cambios tardíos de M2 se muestran como información de lectura.</p>{report.escalated && <p className="mt-4 rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] p-3 text-sm font-semibold text-[var(--color-warning)]">Escalado por M2</p>}{report.citizenResponse && isOffice && <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Información aportada por M2</p><p className="mt-1 text-sm text-[var(--color-text)]">{report.citizenResponse}</p></div>}{report.ticketId && isOffice && <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Ticket de origen: <span className="font-semibold tabular-nums text-[var(--color-text)]">{report.ticketId}</span></p>}</div></section></main></div>;
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
