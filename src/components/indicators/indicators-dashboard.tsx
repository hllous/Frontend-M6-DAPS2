"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Activity, CheckCheck, ChevronDown, Database, RefreshCw, Recycle, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { DataTable, useDataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { LoadingRegion } from "@/components/ui/loading-region";
import { Skeleton } from "@/components/ui/skeleton";
import { TableRowsSkeleton } from "@/components/ui/loading-skeletons";
import { TableCaption, TableCell, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatArgentinaCalendarDate, formatArgentinaNumericDateTime, todayInArgentina } from "@/lib/argentina-date";
import { CONTAINER_STATUS_LABELS, containersAdapter, type Container } from "@/lib/containers";
import { defaultIndicatorTarget, familyAppliesCatalogFilters, hasNumericThreshold, indicatorQueryErrorMessage, parseIndicatorUrlState, serializeIndicatorUrlState, indicatorQuerySchema, indicatorsAdapter, type IndicatorBreakdown, type IndicatorData, type IndicatorPeriod, type IndicatorPoint, type IndicatorQuery, type IndicatorTarget } from "@/lib/indicators";
import { serviceSourceHref } from "@/lib/referrals";
import { catalogoDeEtiquetas } from "@/lib/service-labels";
import { STATUS_LABEL, servicesAdapter, type Service } from "@/lib/services";
import type { OperationalScenario } from "@/lib/scenarios";
import { CoverageBreakdownTable } from "./coverage-breakdown-table";
import { BreakdownBarChart } from "./breakdown-bar-chart";
import { AttentionSignals } from "./attention-signals";
import { CoverageTrend } from "./coverage-trend";
import { ZonePanel } from "./zone-panel";
import { IndicatorVariation, type IndicatorVariationDirection, type IndicatorVariationProps } from "./indicator-variation";
import { formatIndicatorNumber } from "./number-format";

import styles from "./indicators-dashboard.module.css";

type FamilyKey = IndicatorData["family"];
type ViewMode = "bars" | "table";
type LoadStatus = "loading" | "ready" | "empty" | "error";
type DashboardModule = "trend" | "territory";
type FamilyState = { status: LoadStatus; data?: IndicatorData };
type SelectedSignal = { breakdownId: string; pointId: string };
type TraceResource = "services" | "containers";
type TracePlan = {
  resource: TraceResource;
  period: { from: string; to: string };
  zoneId?: string;
  title: string;
  href: string;
  linkLabel: string;
};

type UnsupportedTrace = { resource: null; reason: string };
type RecordPlan = TracePlan | UnsupportedTrace;
type TraceRecord = {
  id: string;
  /** Pantalla del registro en el shell (`detail=<UUID>`). */
  href: string;
  title: string;
  detail: string;
  zone: string;
  status: string;
};

const traceRecordColumns: DataTableColumn<TraceRecord>[] = [
  {
    id: "record",
    accessorFn: (record) => record.title,
    header: "Registro",
    enableSorting: false,
    cell: ({ row }) => <><Link className={styles.recordsLink} href={row.original.href}>{row.original.title}</Link><span className={styles.note}>{row.original.detail}</span></>,
  },
  { accessorKey: "zone", header: "Zona operativa", enableSorting: false },
  { accessorKey: "status", header: "Estado", enableSorting: false },
];

const traceRecordRowId = (record: TraceRecord) => record.id;

const familyMeta: Record<FamilyKey, { label: string; icon: typeof Activity; description: string }> = {
  coverage: { label: "Cobertura", icon: Activity, description: "Objetivos atendidos" },
  compliance: { label: "Cumplimiento", icon: CheckCheck, description: "Servicios en fecha" },
  incidents: { label: "Incidencias", icon: TriangleAlert, description: "Resolución de reportes" },
  waste: { label: "Residuos", icon: Recycle, description: "Desvío del relleno" },
};

const quickPeriods = [{ id: "7", label: "Semana", days: 7 }, { id: "30", label: "Mes", days: 30 }, { id: "90", label: "Trimestre", days: 90 }] as const;

function quickPeriodRange(days: number) {
  const to = todayInArgentina();
  const fromDate = new Date(`${to}T00:00:00Z`);
  fromDate.setUTCDate(fromDate.getUTCDate() - days + 1);
  return { from: fromDate.toISOString().slice(0, 10), to };
}

const familyOrder: FamilyKey[] = ["coverage", "compliance", "incidents", "waste"];
const territorialBreakdownIds = new Set(["zones", "unattended-zones", "containers"]);
type FilterOption = { id: string; label: string };
// Opciones reales de GET /zones y GET /service-types: el backend exige UUID en los filtros.
type FilterCatalog = { zones: FilterOption[]; serviceTypes: FilterOption[] };

function defaultTracePlan(family: FamilyKey, period: { from: string; to: string }, zoneId?: string): TracePlan | null {
  if (family !== "coverage" && family !== "compliance") return null;
  return {
    resource: "services",
    period,
    zoneId,
    title: "Servicios",
    href: "/app?destination=services",
    linkLabel: "Ver servicios",
  };
}

function signalTracePlan(data: IndicatorData, breakdown: IndicatorBreakdown, point: IndicatorPoint): RecordPlan {
  if ((data.family === "coverage" && breakdown.id === "zones") || (data.family === "compliance" && breakdown.id === "unattended-zones")) {
    return {
      resource: "services",
      period: data.period,
      zoneId: point.id,
      title: "Servicios",
      href: "/app?destination=services",
      linkLabel: "Ver servicios",
    };
  }

  if (data.family === "incidents" && breakdown.id === "containers") {
    return {
      resource: "containers",
      period: data.period,
      zoneId: point.id,
      title: "Contenedores",
      href: "/app/catalog/containers",
      linkLabel: "Ver contenedores",
    };
  }

  return {
    resource: null,
    reason: `No hay registros para «${point.label}».`,
  };
}

// El servicio no tiene código legible: la fila se nombra con su título y su agenda.
function serviceToTraceRecord(service: Service): TraceRecord {
  return {
    id: service.id,
    href: serviceSourceHref(service.id),
    title: service.title,
    detail: `${formatArgentinaCalendarDate(service.scheduledDate)}${service.windowFrom ? ` · ${service.windowFrom}–${service.windowTo ?? ""}` : ""}`,
    zone: service.zoneNames.length > 0 ? service.zoneNames.join(" · ") : "Sin zona",
    status: STATUS_LABEL[service.status],
  };
}

function containerToTraceRecord(container: Container, zones: Map<string, string>): TraceRecord {
  return {
    id: container.code,
    href: `/app/catalog/containers?detail=${encodeURIComponent(container.id)}`,
    title: container.code,
    detail: container.address ?? "Sin dirección",
    zone: zones.get(container.zoneId) ?? "Sin zona",
    status: CONTAINER_STATUS_LABELS[container.status],
  };
}

function formatNumber(value: number, unit: string) {
  return formatIndicatorNumber(value, { maximumFractionDigits: unit === "%" || unit === "h" || unit === "m³" || unit.startsWith("días") ? 1 : 0 });
}

function formatDate(value: string) {
  return formatArgentinaCalendarDate(value);
}

function formatDateTime(value: string) {
  return formatArgentinaNumericDateTime(value);
}

function familySummary(data: IndicatorData) {
  return metricText(data.primary);
}

type IndicatorSummaryStatus = { label: string; variant: "success" | "danger" };

function primaryTarget(family: FamilyKey, data?: IndicatorData): IndicatorTarget | undefined {
  if (!data) return defaultIndicatorTarget(family);
  if (data.family === "incidents") {
    if (data.targets?.resolutionBusinessDays !== undefined) return data.targets.resolutionBusinessDays;
    if (data.reports.deadlineBusinessDays !== undefined) return { value: data.reports.deadlineBusinessDays, direction: "max" };
    return data.targets === undefined ? defaultIndicatorTarget(family) : undefined;
  }
  if (data.targets === undefined) return defaultIndicatorTarget(family);
  if (data.family === "coverage") return data.targets?.coveragePct;
  if (data.family === "compliance") return data.targets?.compliancePct;
  return data.targets?.landfillDiversionPct;
}

function indicatorSummaryDetails(family: FamilyKey, value: number | null | undefined, showStatus: boolean, data?: IndicatorData) {
  const target = primaryTarget(family, data);
  const definition = {
    target: hasNumericThreshold(target) ? { comparator: target.direction === "min" ? "≥" as const : "≤" as const, value: target.value, unit: family === "incidents" ? "días hábiles" as const : "%" as const } : null,
    direction: target?.direction === "max" || target?.direction === "down" ? "less-is-better" as const : "more-is-better" as const,
  };
  const targetLabel = definition.target
    ? `Meta ${definition.target.comparator} ${formatNumber(definition.target.value, definition.target.unit)} ${definition.target.unit}`
    : target?.direction === "down" ? "Tendencia descendente" : "Sin meta definida";
  const directionLabel = definition.target ? (definition.direction === "more-is-better" ? "más es mejor" : "menos es mejor") : "";
  let status: IndicatorSummaryStatus | undefined;

  if (showStatus && value !== null && value !== undefined && definition.target) {
    const meetsTarget = definition.target.comparator === "≥"
      ? value >= definition.target.value
      : value <= definition.target.value;
    status = meetsTarget
      ? { label: "Cumple la meta", variant: "success" }
      : { label: definition.direction === "less-is-better" ? "Sobre la meta" : "Bajo la meta", variant: "danger" };
  }

  return { targetLabel, directionLabel, status };
}

function knownVariationDirection(target: { direction: string } | null | undefined): IndicatorVariationDirection | undefined {
  return target?.direction === "min" || target?.direction === "max" || target?.direction === "down"
    ? target.direction
    : undefined;
}

function computedPreviousPeriod(period: IndicatorPeriod) {
  const start = new Date(`${period.from}T00:00:00.000Z`);
  const end = new Date(`${period.to}T00:00:00.000Z`);
  const day = 86400000;
  const duration = (end.getTime() - start.getTime()) / day + 1;
  if (!Number.isInteger(duration) || duration < 1 || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;

  const previousTo = new Date(start);
  previousTo.setUTCDate(previousTo.getUTCDate() - 1);
  const previousFrom = new Date(previousTo);
  previousFrom.setUTCDate(previousFrom.getUTCDate() - duration + 1);
  return { from: previousFrom.toISOString().slice(0, 10), to: previousTo.toISOString().slice(0, 10) };
}

function comparisonPeriod(data: IndicatorData, delta: number | null | undefined) {
  return data.previous?.period ?? (delta === null || delta === undefined ? undefined : computedPreviousPeriod(data.period));
}

function indicatorVariationDetails(data: IndicatorData): Omit<IndicatorVariationProps, "id"> {
  if (data.family === "coverage") {
    const delta = data.delta?.coveragePct;
    const direction = knownVariationDirection(primaryTarget(data.family, data));
    const previousPeriod = comparisonPeriod(data, delta);
    return { delta, unitKind: "percentage-points", ...(previousPeriod ? { previousPeriod } : {}), ...(direction ? { direction } : {}) };
  }

  if (data.family === "compliance") {
    const delta = data.delta?.onTimePct;
    const direction = knownVariationDirection(primaryTarget(data.family, data));
    const previousPeriod = comparisonPeriod(data, delta);
    return { delta, unitKind: "percentage-points", ...(previousPeriod ? { previousPeriod } : {}), ...(direction ? { direction } : {}) };
  }

  if (data.family === "incidents") {
    const delta = data.reports.avgResolutionBusinessDays === undefined ? data.delta?.avgResolutionDays : data.delta?.avgResolutionBusinessDays;
    const direction = knownVariationDirection(primaryTarget(data.family, data));
    const previousPeriod = comparisonPeriod(data, delta);
    return { delta, unitKind: "days", ...(previousPeriod ? { previousPeriod } : {}), ...(direction ? { direction } : {}) };
  }

  const delta = data.delta?.divertedPct;
  const direction = knownVariationDirection(primaryTarget(data.family, data));
  const previousPeriod = comparisonPeriod(data, delta);
  return { delta, unitKind: "percentage-points", ...(previousPeriod ? { previousPeriod } : {}), ...(direction ? { direction } : {}) };
}

function indicatorTargetLabel(target: { direction: string; value: number | null } | null | undefined, unit: string) {
  if (target?.direction === "down") return "Meta: tendencia descendente";
  if (!hasNumericThreshold(target)) return "Sin meta definida";
  const comparator = target.direction === "min" ? "≥" : "≤";
  return `Meta ${comparator} ${formatNumber(target.value, unit)} ${unit}`;
}

function AdditionalIndicators({ data }: { data: IndicatorData }) {
  if (data.family === "compliance") {
    const deviation = data.schedulingDeviation;
    if (!deviation) return null;

    return <section className={styles.indicatorMetricGrid} aria-label="Indicadores complementarios de Cumplimiento">
      <Card role="group" aria-labelledby="indicator-scheduling-deviation-title" size="sm" className={styles.indicatorMetricCard}>
        <CardHeader><CardTitle id="indicator-scheduling-deviation-title">Desvío de programación</CardTitle></CardHeader>
        <CardContent className={styles.indicatorMetricContent}>
          <strong className="text-2xl font-semibold leading-none tabular-nums">{formatNumber(deviation.deviatedPct, "%")} %</strong>
          <p className="text-sm leading-snug text-muted-foreground">{formatNumber(deviation.deviated, "servicios")} de {formatNumber(deviation.total, "servicios")} servicios se desviaron de la programación.</p>
          <p className="text-xs font-semibold text-foreground">{indicatorTargetLabel(data.targets?.schedulingDeviationPct, "%")}</p>
          <IndicatorVariation delta={data.delta?.deviatedPct} unitKind="percentage-points" direction={knownVariationDirection(data.targets?.schedulingDeviationPct)} previousPeriod={comparisonPeriod(data, data.delta?.deviatedPct)} />
        </CardContent>
      </Card>
    </section>;
  }

  if (data.family !== "incidents") return null;
  const { reports, containers } = data;
  const history = containers.history;

  return <section className={styles.indicatorMetricGrid} aria-label="Indicadores complementarios de Incidencias">
    {reports.withinDeadline ? <Card role="group" aria-labelledby="indicator-within-deadline-title" size="sm" className={styles.indicatorMetricCard}>
      <CardHeader><CardTitle id="indicator-within-deadline-title">Reportes resueltos en plazo</CardTitle></CardHeader>
      <CardContent className={styles.indicatorMetricContent}>
        <strong className="text-2xl font-semibold leading-none tabular-nums">{reports.withinDeadline.pct === null ? "Sin datos" : `${formatNumber(reports.withinDeadline.pct, "%")} %`}</strong>
        <p className="text-sm leading-snug text-muted-foreground">{reports.withinDeadline.resolved === 0 ? "No hubo reportes resueltos." : `${formatNumber(reports.withinDeadline.withinDeadline, "reportes")} de ${formatNumber(reports.withinDeadline.resolved, "reportes")} reportes se resolvieron en plazo.`}</p>
        <p className="text-xs font-semibold text-foreground">{indicatorTargetLabel(data.targets?.reportsWithinDeadlinePct, "%")}</p>
        <IndicatorVariation delta={data.delta?.withinDeadlinePct} unitKind="percentage-points" direction={knownVariationDirection(data.targets?.reportsWithinDeadlinePct)} previousPeriod={comparisonPeriod(data, data.delta?.withinDeadlinePct)} />
      </CardContent>
    </Card> : null}
    {reports.overdue ? <Card role="group" aria-labelledby="indicator-overdue-title" size="sm" className={styles.indicatorMetricCard}>
      <CardHeader><CardTitle id="indicator-overdue-title">Reportes vencidos hoy</CardTitle></CardHeader>
      <CardContent className={styles.indicatorMetricContent}>
        <strong className="text-2xl font-semibold leading-none tabular-nums">{reports.overdue.pct === null ? "Sin datos" : `${formatNumber(reports.overdue.pct, "%")} %`}</strong>
        <p className="text-sm leading-snug text-muted-foreground">{reports.overdue.open === 0 ? "No hay reportes abiertos hoy." : `${formatNumber(reports.overdue.overdue, "reportes")} de ${formatNumber(reports.overdue.open, "reportes")} reportes abiertos.`}</p>
        <p className="text-xs font-semibold text-foreground">{indicatorTargetLabel(data.targets?.reportsOverduePct, "%")}</p>
      </CardContent>
    </Card> : null}
    <Card role="group" aria-labelledby="indicator-container-overflows-title" size="sm" className={styles.indicatorMetricCard}>
      <CardHeader><CardTitle id="indicator-container-overflows-title">Desbordes de contenedores</CardTitle></CardHeader>
      <CardContent className={styles.indicatorMetricContent}>
        <strong className="text-2xl font-semibold leading-none tabular-nums">{history ? `${formatNumber(history.overflowIncidents, "incidentes")} incidentes` : "Sin dato"}</strong>
        <p className="text-sm leading-snug text-muted-foreground">{history ? "Eventos de desborde durante el período." : "No hay datos del historial para el período."}</p>
        <p className="text-xs font-semibold text-foreground">{indicatorTargetLabel(data.targets?.overflowTrend, "incidentes")}</p>
        <IndicatorVariation delta={data.delta?.overflowIncidents} unitKind="count" direction={knownVariationDirection(data.targets?.overflowTrend)} previousPeriod={comparisonPeriod(data, data.delta?.overflowIncidents)} />
      </CardContent>
    </Card>
    <Card role="group" aria-labelledby="indicator-pending-container-damage-title" size="sm" className={styles.indicatorMetricCard}>
      <CardHeader><CardTitle id="indicator-pending-container-damage-title">Contenedores con daños pendientes</CardTitle></CardHeader>
      <CardContent className={styles.indicatorMetricContent}>
        <strong className="text-2xl font-semibold leading-none tabular-nums">{history?.pendingDamage == null ? "Sin dato" : `${formatNumber(history.pendingDamage, "contenedores")} contenedores`}</strong>
        <p className="text-sm leading-snug text-muted-foreground">{history?.pendingDamage == null
          ? history?.trackingSince ? `Historial disponible desde ${formatArgentinaCalendarDate(history.trackingSince)}.` : "No se informó cuándo comienza el historial."
          : "Contenedores dañados o en reparación al cierre del período."}</p>
        <p className="text-xs font-semibold text-foreground">{indicatorTargetLabel(data.targets?.pendingDamageTrend, "contenedores")}</p>
        <IndicatorVariation delta={data.delta?.pendingDamage} unitKind="count" direction={knownVariationDirection(data.targets?.pendingDamageTrend)} previousPeriod={comparisonPeriod(data, data.delta?.pendingDamage)} />
      </CardContent>
    </Card>
  </section>;
}

function emptyFamilyState(): Record<FamilyKey, FamilyState> {
  return familyOrder.reduce((states, family) => {
    states[family] = { status: "loading" };
    return states;
  }, {} as Record<FamilyKey, FamilyState>);
}

function hasIndicatorPoints(data: IndicatorData) {
  return data.breakdowns.some((breakdown) => breakdown.points.length > 0);
}

function moduleBreakdowns(data: IndicatorData, module: DashboardModule) {
  return data.breakdowns.filter((breakdown) => module === "territory" ? territorialBreakdownIds.has(breakdown.id) : !territorialBreakdownIds.has(breakdown.id));
}

function moduleStatus(state: FamilyState, data: IndicatorData | undefined, module: DashboardModule): LoadStatus {
  if (state.status === "loading" || state.status === "error") return state.status;
  return data && moduleBreakdowns(data, module).some((breakdown) => breakdown.points.length > 0) ? "ready" : "empty";
}

async function requestFamily(family: FamilyKey, query: IndicatorQuery) {
  if (family === "coverage") return indicatorsAdapter.getCoverage(query);
  if (family === "compliance") return indicatorsAdapter.getCompliance(query);
  if (family === "incidents") return indicatorsAdapter.getIncidents(query);
  return indicatorsAdapter.getWaste(query);
}

function useNarrowDashboard() {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => setIsNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isNarrow;
}

function FamilyDetailSummary({ family, state }: { family: FamilyKey; state: FamilyState }) {
  const data = state.data;
  const summary = indicatorSummaryDetails(family, data?.primary.value, state.status === "ready", data);
  const variation = data ? indicatorVariationDetails(data) : null;
  return <Card size="sm" role="region" aria-label={`Resumen de ${familyMeta[family].label}`}><CardContent className="flex flex-wrap items-center gap-3">
    {data ? <><strong>{familySummary(data)}</strong><span>{data.primary.label}</span></> : state.status === "loading" ? <Skeleton aria-label="Cargando resumen" className="h-6 w-24" /> : <span>{state.status === "error" ? "Sin datos disponibles." : "Sin resultados en el período."}</span>}
    {variation ? <IndicatorVariation {...variation} /> : null}
    <span>{summary.targetLabel}</span>
    {summary.directionLabel ? <span>{summary.directionLabel}</span> : null}
    {summary.status ? <Badge variant={summary.status.variant}>{summary.status.variant === "success" ? <CheckCheck aria-hidden /> : <TriangleAlert aria-hidden />}<span>{summary.status.label}</span></Badge> : null}
    {data?.family === "incidents" ? <span>Resolución media en días corridos: {data.reports.avgResolutionDays === null ? "Sin reportes cerrados" : `${formatNumber(data.reports.avgResolutionDays, "días")} días`}</span> : null}
  </CardContent></Card>;
}

function ModuleState({ label, status, onRetry, children }: { label: string; status: LoadStatus; onRetry: () => void; children?: React.ReactNode }) {
  const titleId = `indicator-${label.toLowerCase().replaceAll(" ", "-")}-title`;
  const emptyLabel = label === "Detalle territorial" ? "territoriales" : label.toLowerCase();
  if (status === "ready") return <section className={styles.module} aria-label={label} role="region"><h2 id={titleId}>{label}</h2>{children}</section>;
  if (status === "loading") return <LoadingRegion label={label} className={styles.moduleState}><h2 id={titleId}>{label}</h2><div aria-hidden className={styles.moduleSkeleton}>{["w-full", "w-4/5", "w-3/5", "w-2/5"].map((width) => <Skeleton key={width} className={`h-6 ${width}`} />)}</div></LoadingRegion>;
  if (status === "empty") return <section className={styles.moduleState} aria-label={label} role="region"><Empty><EmptyHeader><EmptyTitle id={titleId}>Sin resultados {emptyLabel}</EmptyTitle><EmptyDescription>No hay datos para los filtros seleccionados.</EmptyDescription></EmptyHeader></Empty></section>;
  return <section className={styles.moduleState} aria-label={label} role="region"><Alert variant="danger"><AlertTitle id={titleId}>No se pudo cargar {label}. Intente nuevamente.</AlertTitle><Button type="button" variant="outline" onClick={onRetry}>Reintentar {label}</Button></Alert></section>;
}

export function IndicatorsDashboard({ scenario }: { scenario: OperationalScenario }) {
  const canView = scenario.capabilities.includes("indicator:view");
  const searchParams = useSearchParams();
  // El estado inicial sale de la URL una sola vez; después la URL sólo se escribe.
  const [initialUrlState] = useState(() => parseIndicatorUrlState(searchParams ?? new URLSearchParams()));
  const pendingSignal = useRef(initialUrlState.signal);
  const [query, setQuery] = useState<IndicatorQuery>(initialUrlState.query);
  const [appliedQuery, setAppliedQuery] = useState<IndicatorQuery>(initialUrlState.query);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [familyStates, setFamilyStates] = useState<Record<FamilyKey, FamilyState>>(emptyFamilyState);
  const [selectedFamily, setSelectedFamily] = useState<FamilyKey>(initialUrlState.family);
  const [detailOpen, setDetailOpen] = useState(() => Boolean(searchParams?.has("family")));
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(initialUrlState.view);
  const [overviewView, setOverviewView] = useState<"bars" | "table">("bars");
  const [selectedSignal, setSelectedSignal] = useState<SelectedSignal | null>(null);
  const [recordPlan, setRecordPlan] = useState<RecordPlan | null>(null);
  const [records, setRecords] = useState<TraceRecord[]>([]);
  const [recordsStatus, setRecordsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [filterCatalog, setFilterCatalog] = useState<FilterCatalog | null>(null);
  const isNarrow = useNarrowDashboard();
  const familyRequestVersions = useRef<Record<FamilyKey, number>>({ coverage: 0, compliance: 0, incidents: 0, waste: 0 });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadFamily = useCallback((family: FamilyKey, nextQuery: IndicatorQuery) => {
    const requestVersion = familyRequestVersions.current[family] + 1;
    familyRequestVersions.current[family] = requestVersion;
    setFamilyStates((previous) => ({ ...previous, [family]: { status: "loading", data: previous[family].data } }));
    requestFamily(family, nextQuery).then((nextData) => {
      if (!mountedRef.current || familyRequestVersions.current[family] !== requestVersion) return;
      setFamilyStates((previous) => ({ ...previous, [family]: { status: hasIndicatorPoints(nextData) ? "ready" : "empty", data: nextData } }));
    }).catch(() => {
      if (mountedRef.current && familyRequestVersions.current[family] === requestVersion) {
        setFamilyStates((previous) => ({ ...previous, [family]: { status: "error", data: previous[family].data } }));
      }
    });
  }, []);

  useEffect(() => {
    if (!canView) return;
    let current = true;
    // catalogoDeEtiquetas no rechaza: si un catálogo falla, devuelve un mapa vacío.
    catalogoDeEtiquetas().then((catalog) => {
      if (!current) return;
      const options = (entries: Iterable<[string, string]>) => [...entries].map(([id, label]) => ({ id, label }));
      setFilterCatalog({ zones: options(catalog.zones), serviceTypes: options([...catalog.serviceTypes].map(([id, type]) => [id, type.name])) });
    });
    return () => { current = false; };
  }, [canView]);

  useEffect(() => {
    if (!canView) return;
    familyOrder.forEach((family) => loadFamily(family, appliedQuery));
  }, [appliedQuery, canView, loadFamily]);

  const freshness = useMemo(() => {
    const values = familyOrder.map((family) => familyStates[family].data?.freshness.updatedAt).filter((value): value is string => Boolean(value));
    return values.sort().at(-1);
  }, [familyStates]);
  const selectedFamilyState = familyStates[selectedFamily];
  const selectedData = selectedFamilyState.status === "empty" ? undefined : selectedFamilyState.data;
  const selectedPeriodFrom = selectedFamilyState.status === "ready" ? selectedData?.period.from : undefined;
  const selectedPeriodTo = selectedFamilyState.status === "ready" ? selectedData?.period.to : undefined;
  const planPeriodFrom = selectedPeriodFrom ?? appliedQuery.from;
  const planPeriodTo = selectedPeriodTo ?? appliedQuery.to;
  const defaultRecordsPlan = useMemo(
    () => planPeriodFrom && planPeriodTo ? defaultTracePlan(selectedFamily, { from: planPeriodFrom, to: planPeriodTo }, appliedQuery.zoneId) : null,
    [appliedQuery.zoneId, planPeriodFrom, planPeriodTo, selectedFamily],
  );
  const activeRecordPlan = recordPlan ?? defaultRecordsPlan;

  useEffect(() => {
    const plan = activeRecordPlan;
    if (!plan || plan.resource === null) {
      return;
    }

    let current = true;
    const request = plan.resource === "services"
      ? servicesAdapter.list({ page: 1, pageSize: 100, zoneId: plan.zoneId, scheduledFrom: plan.period.from, scheduledTo: plan.period.to }).then((page) => page.services.map(serviceToTraceRecord))
      : Promise.all([containersAdapter.list({ page: 1, pageSize: 100, zoneId: plan.zoneId }), catalogoDeEtiquetas()])
        .then(([page, catalog]) => page.containers.map((container) => containerToTraceRecord(container, catalog.zones)));

    request.then((nextRecords) => {
      if (!current) return;
      setRecords(nextRecords);
      setRecordsStatus("ready");
    }).catch(() => {
      if (current) setRecordsStatus("error");
    });

    return () => { current = false; };
  }, [activeRecordPlan]);

  const selectedBreakdown = selectedData?.breakdowns.find((breakdown) => breakdown.id === selectedSignal?.breakdownId);
  const selectedPoint = selectedBreakdown?.points.find((point) => point.id === selectedSignal?.pointId);

  useEffect(() => {
    if (!canView) return;
    const search = serializeIndicatorUrlState({ query: appliedQuery, family: selectedFamily, view: viewMode, signal: selectedSignal ?? pendingSignal.current ?? undefined }, window.location.search);
    const params = new URLSearchParams(search);
    if (!detailOpen) params.delete("family");
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${params}`);
  }, [appliedQuery, canView, detailOpen, selectedFamily, selectedSignal, viewMode]);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const state = parseIndicatorUrlState(params);
      setDetailOpen(params.has("family"));
      setSelectedFamily(state.family);
      pendingSignal.current = state.signal;
      setSelectedSignal(null);
      setRecordPlan(null);
      setRecordsStatus("idle");
      setViewMode(state.view);
      setAppliedQuery(state.query);
      setQuery(state.query);
      if (!params.has("family")) requestAnimationFrame(() => { if (returnFocusRef.current) document.querySelector<HTMLElement>(`[data-detail-trigger="${returnFocusRef.current}"]`)?.focus(); });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => { if (detailOpen) detailHeadingRef.current?.focus(); }, [detailOpen, selectedFamily]);
  const trendBreakdowns = selectedFamilyState.data ? moduleBreakdowns(selectedFamilyState.data, "trend") : [];
  const territoryBreakdowns = selectedFamilyState.data ? moduleBreakdowns(selectedFamilyState.data, "territory") : [];
  const trendStatus = moduleStatus(selectedFamilyState.data ? { ...selectedFamilyState, status: "ready" } : selectedFamilyState, selectedFamilyState.data, "trend");
  const territoryStatus = moduleStatus(selectedFamilyState.data ? { ...selectedFamilyState, status: "ready" } : selectedFamilyState, selectedFamilyState.data, "territory");
  const dashboardStatus = familyOrder.some((family) => familyStates[family].status === "loading")
    ? "loading"
    : familyOrder.every((family) => familyStates[family].status === "error") ? "error" : "ready";
  const ignoredFilters = familyAppliesCatalogFilters(selectedFamily) ? null
    : [appliedQuery.zoneId && "Zona", appliedQuery.serviceTypeId && "Tipo de servicio"].filter(Boolean).join(" y ") || null;
  const clearSignal = () => {
    setSelectedSignal(null);
    setRecordPlan((current) => current?.resource ? { ...current, zoneId: undefined } : null);
    setRecordsStatus("idle");
  };

  const selectFamily = (family: FamilyKey) => {
    pendingSignal.current = undefined;
    setSelectedFamily(family);
    setSelectedSignal(null);
    setRecordPlan(null);
    setRecordsStatus("idle");
  };

  useEffect(() => {
    const signal = pendingSignal.current;
    if (!signal || !selectedData) return;
    pendingSignal.current = undefined;
    const breakdown = selectedData.breakdowns.find((item) => item.id === signal.breakdownId);
    const point = breakdown?.points.find((item) => item.id === signal.pointId);
    if (!breakdown || !point) return;
    setSelectedSignal(signal);
    setRecordsStatus("loading");
    setRecordPlan(signalTracePlan(selectedData, breakdown, point));
    setRecordsOpen(true);
  }, [selectedData, detailOpen]);

  const openDetail = (family: FamilyKey, trigger: HTMLElement) => {
    returnFocusRef.current = trigger.dataset.detailTrigger ?? null;
    const params = new URLSearchParams(window.location.search);
    params.set("family", family);
    window.history.pushState(window.history.state, "", `${window.location.pathname}?${params}`);
    selectFamily(family);
    setDetailOpen(true);
  };
  const closeDetail = () => {
    returnFocusRef.current ??= `family-${selectedFamily}`;
    const params = new URLSearchParams(window.location.search);
    params.delete("family");
    window.history.pushState(window.history.state, "", `${window.location.pathname}?${params}`);
    setDetailOpen(false);
    requestAnimationFrame(() => { if (returnFocusRef.current) document.querySelector<HTMLElement>(`[data-detail-trigger="${returnFocusRef.current}"]`)?.focus(); });
  };

  const retryFamily = (family: FamilyKey) => {
    loadFamily(family, appliedQuery);
  };

  const selectSignal = (breakdownId: string, pointId: string) => {
    if (!selectedData) return;
    const breakdown = selectedData.breakdowns.find((item) => item.id === breakdownId);
    const point = breakdown?.points.find((item) => item.id === pointId);
    if (!breakdown || !point) return;
    if (selectedSignal?.breakdownId === breakdownId && selectedSignal.pointId === pointId) {
      clearSignal();
      return;
    }
    setSelectedSignal({ breakdownId, pointId });
    setRecordsStatus("loading");
    setRecordPlan(signalTracePlan(selectedData, breakdown, point));
    setRecordsOpen(true);
  };

  const applyQuery = (nextQuery: IndicatorQuery) => {
    pendingSignal.current = undefined;
    const validation = indicatorQuerySchema.safeParse(nextQuery);
    if (!validation.success) { setFilterError(indicatorQueryErrorMessage(validation.error)); return; }
    setFilterError(null);
    setSelectedSignal(null);
    setRecordPlan(null);
    setRecordsStatus("idle");
    setAppliedQuery({ ...nextQuery });
  };
  const applyPeriod = (days: number) => {
    const nextQuery = { ...query, ...quickPeriodRange(days) };
    setQuery(nextQuery);
    applyQuery(nextQuery);
  };
  const activeQuickPeriod = quickPeriods.find((item) => {
    const range = quickPeriodRange(item.days);
    return appliedQuery.from === range.from && appliedQuery.to === range.to;
  });

  const optionLabel = (options: FilterOption[] | undefined, id?: string) => id ? (options?.find((option) => option.id === id)?.label ?? null) : null;
  const filtersSummary = [
    activeQuickPeriod?.label ?? (appliedQuery.from && appliedQuery.to ? `${formatDate(appliedQuery.from)} – ${formatDate(appliedQuery.to)}` : null),
    optionLabel(filterCatalog?.zones, appliedQuery.zoneId),
    optionLabel(filterCatalog?.serviceTypes, appliedQuery.serviceTypeId),
  ].filter(Boolean).join(" · ");

  const visibleRecordsStatus = activeRecordPlan?.resource && recordsStatus === "idle" ? "loading" : recordsStatus;
  const recordsView = <AccessibleRecords family={selectedFamily} plan={activeRecordPlan} selection={selectedSignal} breakdown={selectedBreakdown} point={selectedPoint} records={records} status={visibleRecordsStatus} familyStatus={selectedFamilyState.status} open={recordsOpen} onOpenChange={setRecordsOpen} onClear={clearSignal} />;
  const selectedModuleContent = (module: DashboardModule, breakdowns: IndicatorBreakdown[], state: LoadStatus) => <ModuleState label={module === "trend" ? "Por categoría" : "Detalle territorial"} status={state} onRetry={() => retryFamily(selectedFamily)}><IndicatorModuleContent family={selectedFamily} breakdowns={breakdowns} viewMode={viewMode} selection={selectedSignal} onSelect={selectSignal} period={selectedData?.period ?? { from: appliedQuery.from ?? "", to: appliedQuery.to ?? "" }} /></ModuleState>;

  if (!canView) {
    return <section className={styles.empty} aria-labelledby="indicator-forbidden-title"><div><h2 id="indicator-forbidden-title">No tiene permiso para ver los indicadores.</h2></div></section>;
  }

  return (
    <section className={styles.dashboard} aria-labelledby="indicator-dashboard-title">
      <div className={styles.heading}>
        <div><h1 id="indicator-dashboard-title">Tableros</h1></div>
        {freshness ? <div className={styles.freshness}><Database size={16} aria-hidden /> Actualizado {formatDateTime(freshness)}</div> : <div aria-hidden className={`${styles.freshness} invisible`}><Database size={16} aria-hidden /> Actualizado</div>}
      </div>

      <Collapsible className={styles.quickFilters}>
        <div className={styles.quickBar}>
          <CollapsibleTrigger render={<Button type="button" variant="outline" size="sm" className="group/filters" aria-label="Más filtros" aria-describedby="indicator-filters-summary" />}>
            <SlidersHorizontal data-icon="inline-start" aria-hidden />
            Más filtros
            <span id="indicator-filters-summary" className={styles.filtersSummary}>{filtersSummary}</span>
            <ChevronDown data-icon="inline-end" aria-hidden className="transition-transform group-aria-expanded/filters:rotate-180" />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
      <form className={styles.filters} onSubmit={(event) => { event.preventDefault(); applyQuery(query); }}>
        <div className={styles.periodRow}>
          <ToggleGroup variant="period" value={activeQuickPeriod ? [activeQuickPeriod.id] : []} onValueChange={(values) => { const item = quickPeriods.find((entry) => entry.id === values[0]); if (item) applyPeriod(item.days); }} aria-label="Período" className={styles.quickPeriods}>
            {quickPeriods.map((item) => <ToggleGroupItem key={item.id} value={item.id} className="h-10 min-w-20 [@media(max-width:760px)]:h-12">{item.label}</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
        <Field className={styles.field}><FieldLabel htmlFor="indicator-from">Desde</FieldLabel><DatePicker id="indicator-from" value={query.from ?? ""} onChange={(from) => { setFilterError(null); setQuery((current) => ({ ...current, from: from || undefined })); }} /></Field>
        <Field className={styles.field}><FieldLabel htmlFor="indicator-to">Hasta</FieldLabel><DatePicker id="indicator-to" value={query.to ?? ""} invalid={Boolean(filterError)} aria-describedby={filterError ? "indicator-to-error" : undefined} onChange={(to) => { setFilterError(null); setQuery((current) => ({ ...current, to: to || undefined })); }} /></Field>
        <CatalogFilter id="indicator-zone" label="Zona operativa" allLabel="Todas las zonas" noun="zonas" options={filterCatalog?.zones} value={query.zoneId} onChange={(zoneId) => setQuery((current) => ({ ...current, zoneId }))} />
        <CatalogFilter id="indicator-service-type" label="Tipo de servicio" allLabel="Todos los tipos" noun="tipos de servicio" options={filterCatalog?.serviceTypes} value={query.serviceTypeId} onChange={(serviceTypeId) => setQuery((current) => ({ ...current, serviceTypeId }))} />
        <Button className={styles.filterAction} type="submit" disabled={dashboardStatus === "loading"}><RefreshCw data-icon="inline-start" aria-hidden />{dashboardStatus === "loading" ? "Actualizando…" : "Actualizar"}</Button>
        {ignoredFilters ? <Alert role="status" className={styles.note}>Filtros sin efecto en {familyMeta[selectedFamily].label}: {ignoredFilters}. Esta familia sólo se filtra por período, así que se muestra sin filtrar.</Alert> : null}
        {filterError ? <FieldError id="indicator-to-error" className={styles.fieldError}>{filterError}</FieldError> : null}
      </form>
        </CollapsibleContent>
      </Collapsible>

      {!detailOpen ? <>
      <AttentionSignals states={familyStates} period={appliedQuery} onRetry={retryFamily} onDetail={(family, trigger) => openDetail(family, trigger)} />
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2"><div className="min-w-0">
        <div className="flex gap-2"><Button type="button" variant={overviewView === "bars" ? "default" : "outline"} aria-pressed={overviewView === "bars"} onClick={() => setOverviewView("bars")}>Gráfico</Button><Button type="button" variant={overviewView === "table" ? "default" : "outline"} aria-pressed={overviewView === "table"} onClick={() => setOverviewView("table")}>Tabla</Button></div>
        {familyStates.coverage.data?.family === "coverage" ? <CoverageTrend data={familyStates.coverage.data} viewMode={overviewView} overview /> : familyStates.coverage.status === "loading" ? <p>Cargando cobertura…</p> : familyStates.coverage.status === "error" ? <Alert variant="danger"><AlertTitle>No se pudo cargar la cobertura.</AlertTitle><Button type="button" variant="outline" onClick={() => retryFamily("coverage")}>Reintentar</Button></Alert> : <p>Sin datos en el período.</p>}
      </div><ZonePanel states={familyStates} onRetry={retryFamily} ignoredFilters={Boolean(appliedQuery.zoneId || appliedQuery.serviceTypeId)} /></div>
      <nav aria-label="Detalle por familia" className="flex flex-wrap items-center gap-2"><span>Detalle por familia</span>{familyOrder.map((family) => <Button key={family} data-detail-trigger={`family-${family}`} type="button" variant="outline" size="sm" onClick={(event) => openDetail(family, event.currentTarget)}>{familyMeta[family].label}</Button>)}</nav>
      </> : <>
      <Button type="button" variant="outline" className="self-start" onClick={closeDetail}>Volver a Tableros</Button>
      <h2 ref={detailHeadingRef} tabIndex={-1}>Detalle de {familyMeta[selectedFamily].label}</h2>
      {selectedFamilyState.status === "error" ? <Alert variant="danger"><AlertTitle>No se pudo actualizar {familyMeta[selectedFamily].label}. Los datos pueden estar desactualizados.</AlertTitle><Button type="button" variant="outline" size="sm" onClick={() => retryFamily(selectedFamily)}>Reintentar</Button></Alert> : null}
      <FamilyDetailSummary family={selectedFamily} state={selectedFamilyState} />


      {isNarrow ? <ToggleGroup value={[viewMode]} onValueChange={(values) => { const value = values[0]; if (value) setViewMode(value as ViewMode); }} variant="outline" className={styles.mobileViewToggle} aria-label="Vista">
        <ToggleGroupItem value="bars" size="lg">Barras</ToggleGroupItem>
        <ToggleGroupItem value="table" size="lg">Tabla</ToggleGroupItem>
      </ToggleGroup> : null}
      {isNarrow ? <Tabs defaultValue="summary" className={styles.mobileTabs}>
        <TabsList aria-label="Secciones del tablero" className={styles.tabList}>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="trend">Por categoría</TabsTrigger>
          <TabsTrigger value="territory">Territorio</TabsTrigger>
          <TabsTrigger value="records">Registros</TabsTrigger>
        </TabsList>
        <TabsContent value="summary"><LoadingRegion label={`Datos del resumen de ${familyMeta[selectedFamily].label}`} isLoading={selectedFamilyState.status === "loading" && Boolean(selectedData)} className={selectedFamilyState.status === "loading" && selectedData ? styles.previousData : undefined}><section className={styles.mobileSummary} aria-labelledby="mobile-summary-title"><h3 id="mobile-summary-title">Resumen</h3>{selectedData ? <p><strong>{selectedData.primary.label}:</strong> {metricText(selectedData.primary)}</p> : selectedFamilyState.status === "loading" ? <LoadingRegion label={`Resumen de ${familyMeta[selectedFamily].label}`}><Skeleton aria-hidden className="h-6 w-3/4" /></LoadingRegion> : <p>{selectedFamilyState.status === "error" ? "No se pudo cargar. Intente nuevamente." : "Sin resultados en el período."}</p>}
          {selectedData?.family === "coverage" ? <p><strong>Programado a futuro:</strong> {metricText(selectedData.summaryMetrics.find((metric) => metric.label === "Programado a futuro")!)}</p> : null}
          {(() => {
            const summary = indicatorSummaryDetails(selectedFamily, selectedData?.primary.value, selectedFamilyState.status === "ready", selectedData);
            return <div className={styles.mobileSummaryDetails}>
              <span className="text-sm font-semibold text-foreground">{summary.targetLabel}</span>
              <span className="text-sm text-muted-foreground">{summary.directionLabel}</span>
              {summary.status ? <Badge variant={summary.status.variant} role="status" aria-label={`Estado: ${summary.status.label}`}>
                {summary.status.variant === "success" ? <CheckCheck aria-hidden /> : <TriangleAlert aria-hidden />}
                {summary.status.label}
              </Badge> : null}
            </div>;
          })()}
        </section>{selectedData ? <AdditionalIndicators data={selectedData} /> : null}{selectedData ? detailContext(selectedData) : null}{selectedData?.family === "coverage" ? <CoverageTrend data={selectedData} viewMode={viewMode} /> : null}</LoadingRegion></TabsContent>
        <TabsContent value="trend"><LoadingRegion label="Datos por categoría" isLoading={selectedFamilyState.status === "loading" && Boolean(selectedData)} className={selectedFamilyState.status === "loading" && selectedData ? styles.previousData : undefined}>{selectedModuleContent("trend", trendBreakdowns, trendStatus)}</LoadingRegion></TabsContent>
        <TabsContent value="territory"><LoadingRegion label="Datos territoriales" isLoading={selectedFamilyState.status === "loading" && Boolean(selectedData)} className={selectedFamilyState.status === "loading" && selectedData ? styles.previousData : undefined}>{selectedModuleContent("territory", territoryBreakdowns, territoryStatus)}</LoadingRegion></TabsContent>
        <TabsContent value="records">{recordsView}</TabsContent>
      </Tabs> : selectedData ? <>
        <LoadingRegion label={`Detalle de ${familyMeta[selectedFamily].label}`} isLoading={selectedFamilyState.status === "loading"} className={selectedFamilyState.status === "loading" ? styles.previousData : undefined}><IndicatorDetail data={selectedData} viewMode={viewMode} selection={selectedSignal} onViewModeChange={setViewMode} onSelect={selectSignal} trendBreakdowns={trendBreakdowns} territoryBreakdowns={territoryBreakdowns} trendStatus={trendStatus} territoryStatus={territoryStatus} onRetry={() => retryFamily(selectedFamily)} /></LoadingRegion>
        {recordsView}
      </> : <div className={styles.desktopModules}>
        {selectedModuleContent("trend", trendBreakdowns, trendStatus)}
        {selectedModuleContent("territory", territoryBreakdowns, territoryStatus)}
        {recordsView}
      </div>}
      </>}
    </section>
  );
}

function CatalogFilter({ id, label, allLabel, noun, options, value, onChange }: { id: string; label: string; allLabel: string; noun: string; options?: FilterOption[]; value?: string; onChange: (value: string | undefined) => void }) {
  const hint = !options ? null : options.length === 0 ? "No se pudieron cargar. Intente nuevamente." : null;
  return <Field className={`${styles.field} min-w-0`}>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <Combobox
      id={id}
      value={value ?? ""}
      options={[{ value: "", label: allLabel }, ...(options ?? []).map((option) => ({ value: option.id, label: option.label }))]}
      onChange={(next) => onChange(next || undefined)}
      disabled={!options?.length}
      aria-describedby={hint || !options ? `${id}-hint` : undefined}
      placeholder={allLabel}
      searchPlaceholder={`Buscar ${noun}`}
      emptyText="Sin resultados."
    />
    {!options ? <LoadingRegion id={`${id}-hint`} label={`Opciones de ${label}`} className="sr-only" /> : null}
    {hint ? <FieldDescription id={`${id}-hint`} className={styles.note} role="status">{hint}</FieldDescription> : null}
  </Field>;
}

function metricText(metric: { value: number | null; unit: string }) {
  if (metric.value === null) return metric.unit.startsWith("días") ? "Sin reportes cerrados" : "Sin dato";
  return `${formatNumber(metric.value, metric.unit)} ${metric.unit}`;
}

function pointText(point: IndicatorPoint) {
  const value = metricText(point);
  const details = point.details?.map((detail) => detail.value === null ? "Sin dato" : `${formatNumber(detail.value, detail.unit)} ${detail.label.toLowerCase()}`).join(" · ");
  return details ? `${value} · ${details}` : value;
}

function detailContext(data: IndicatorData) {
  if (data.family === "incidents") {
    return <p className={styles.detailContext}>Desbordes y daños: eventos del período.<br />Estados de contenedores y riesgo de arbolado: situación actual.</p>;
  }
  if (data.family === "waste") {
    return <p className={styles.detailContext}>Volúmenes en kg y m³. Desvío: porcentaje que no fue a relleno sanitario.</p>;
  }
  return null;
}

function IndicatorModuleContent({ family, breakdowns, viewMode, selection, onSelect, period }: { family: IndicatorData["family"]; breakdowns: IndicatorBreakdown[]; viewMode: ViewMode; selection: SelectedSignal | null; onSelect: (breakdownId: string, pointId: string) => void; period: IndicatorPeriod }) {
  return <div className={styles.moduleContent}>{breakdowns.map((breakdown) => <BreakdownView key={breakdown.id} family={family} breakdown={breakdown} viewMode={viewMode} period={period} selectedId={selection?.breakdownId === breakdown.id ? selection.pointId : undefined} onSelect={(pointId) => onSelect(breakdown.id, pointId)} />)}</div>;
}

function IndicatorDetail({ data: rawData, viewMode: requestedViewMode, selection, onViewModeChange, onSelect, trendBreakdowns, territoryBreakdowns, trendStatus, territoryStatus, onRetry }: { data: IndicatorData; viewMode: ViewMode; selection: SelectedSignal | null; onViewModeChange: (mode: ViewMode) => void; onSelect: (breakdownId: string, pointId: string) => void; trendBreakdowns: IndicatorBreakdown[]; territoryBreakdowns: IndicatorBreakdown[]; trendStatus: LoadStatus; territoryStatus: LoadStatus; onRetry: () => void }) {
  const data = rawData;
  const meta = familyMeta[data.family];
  const hasSummaryMetrics = data.family === "coverage" || data.family === "compliance";
  return <section className={styles.detail} aria-labelledby="indicator-detail-title">
    <div className={styles.detailHeader}>
      <div><p id="indicator-detail-title">{meta.label}</p><p>{formatDate(data.period.from)} – {formatDate(data.period.to)} · {data.primary.label}: <strong>{metricText(data.primary)}</strong></p></div>
      <div className={styles.viewActions}>
        <ToggleGroup value={[requestedViewMode]} onValueChange={(values) => { const value = values[0]; if (value) onViewModeChange(value as ViewMode); }} variant="outline" size="sm" className={styles.viewToggle} aria-label="Vista del detalle">
          <ToggleGroupItem value="bars">Barras</ToggleGroupItem>
          <ToggleGroupItem value="table">Tabla</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
    {hasSummaryMetrics ? <div className={styles.summaryMetrics} aria-label={`Resumen exacto de ${meta.label}`}>{data.summaryMetrics.map((metric) => <div className={styles.summaryMetric} key={metric.label}><strong>{metricText(metric)}</strong><span>{metric.label}</span></div>)}</div> : null}
    <AdditionalIndicators data={data} />
    {detailContext(data)}
    {data.family === "coverage" ? <CoverageTrend data={data} viewMode={requestedViewMode} /> : null}
    <div className={styles.detailModules} role={requestedViewMode === "table" ? "region" : undefined} aria-label={requestedViewMode === "table" ? `Tabla de datos de ${meta.label}` : undefined}>
      <ModuleState label="Por categoría" status={trendStatus} onRetry={onRetry}><IndicatorModuleContent family={data.family} breakdowns={trendBreakdowns} viewMode={requestedViewMode} selection={selection} onSelect={onSelect} period={data.period} /></ModuleState>
      <ModuleState label="Detalle territorial" status={territoryStatus} onRetry={onRetry}><IndicatorModuleContent family={data.family} breakdowns={territoryBreakdowns} viewMode={requestedViewMode} selection={selection} onSelect={onSelect} period={data.period} /></ModuleState>
    </div>
  </section>;
}

function AccessibleRecords({ family, plan, selection, breakdown, point, records, status, familyStatus = "ready", open, onOpenChange, onClear }: { family: FamilyKey; plan: RecordPlan | null; selection: SelectedSignal | null; breakdown?: IndicatorBreakdown; point?: IndicatorPoint; records: TraceRecord[]; status: "idle" | "loading" | "ready" | "error"; familyStatus?: LoadStatus; open: boolean; onOpenChange: (open: boolean) => void; onClear: () => void }) {
  const meta = familyMeta[family];
  const hasSelection = Boolean(selection && breakdown && point);
  const loading = (familyStatus === "loading" && !plan) || Boolean(plan?.resource && status === "loading");
  return <LoadingRegion label="Registros" isLoading={loading} className={styles.records}>
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <h2 className={styles.recordsHeading}><CollapsibleTrigger id="indicator-records-title" render={<Button type="button" variant="ghost" size="lg" className={styles.recordsTrigger} />}>Registros<ChevronDown data-icon="inline-end" aria-hidden /></CollapsibleTrigger></h2>
      <CollapsibleContent className={styles.recordsBody}>
        {familyStatus === "loading" && !plan ? <RecordsSkeleton /> : null}
        {familyStatus === "error" && !plan ? <Alert variant="danger" className={styles.recordsMessage}>No se pudieron cargar los registros.</Alert> : null}
        {plan?.resource ? <Link className={styles.recordsLink} href={plan.href}>{plan.linkLabel}</Link> : null}
        <Alert role="status" variant="info" className={styles.recordsContext}>
          {plan?.resource === null && hasSelection ? <AlertDescription>{plan.reason}</AlertDescription> : hasSelection ? <AlertDescription><strong>Filtro:</strong> {meta.label} · {breakdown?.title} · {point?.label} · {pointText(point!)}</AlertDescription> : plan?.resource ? <AlertDescription>Todos los registros del período.</AlertDescription> : <AlertDescription>Seleccione un dato del gráfico.</AlertDescription>}
          {hasSelection ? <Button type="button" variant="outline" size="sm" onClick={onClear}>Quitar filtro</Button> : null}
        </Alert>
        {plan?.resource ? status === "loading" ? <RecordsSkeleton /> : status === "error" ? <Alert variant="danger" className={styles.recordsMessage}>No se pudieron cargar los registros.</Alert> : <TraceRecordsTable plan={plan} records={records} /> : <Alert role="status" className={styles.recordsMessage}>Sin registros.</Alert>}
      </CollapsibleContent>
    </Collapsible>
  </LoadingRegion>;
}

function RecordsSkeleton() {
  return <TableRowsSkeleton className={styles.recordsTableWrap} tableClassName={styles.recordsTable} rowCount={3} columnWidths={["w-40", "w-24", "w-20"]} columnLabels={["Registro", "Zona operativa", "Estado"]} />;
}

function TraceRecordsTable({ plan, records }: { plan: TracePlan; records: TraceRecord[] }) {
  const table = useDataTable({ data: records, columns: traceRecordColumns, getRowId: traceRecordRowId });

  return <div className={styles.recordsTableWrap}><DataTable
    table={table}
    container={false}
    className={styles.recordsTable}
    renderEmpty={() => <TableRow><TableCell colSpan={3}>Sin registros.</TableCell></TableRow>}
  ><TableCaption>Registros accesibles de {plan.title}</TableCaption></DataTable></div>;
}

function BreakdownView({ family, breakdown, viewMode, period, selectedId: controlledSelectedId, onSelect }: { family: IndicatorData["family"]; breakdown: IndicatorBreakdown; viewMode: ViewMode; period: IndicatorPeriod; selectedId?: string; onSelect: (pointId: string) => void }) {
  const [localSelectedId, setLocalSelectedId] = useState(controlledSelectedId);
  const selectedId = controlledSelectedId ?? localSelectedId;
  const selected = controlledSelectedId ? breakdown.points.find((point) => point.id === selectedId) : undefined;
  const setSelectedId = (pointId: string) => { setLocalSelectedId(pointId); onSelect(pointId); };
  const isCoverageBreakdown = family === "coverage" && (breakdown.id === "zones" || breakdown.id === "service-types");
  const wide = viewMode === "bars" || isCoverageBreakdown;
  const coverageTable = family === "coverage" && breakdown.id === "zones"
    ? <CoverageBreakdownTable points={breakdown.points} target={breakdown.target} nameHeading="Zona" noun="zonas" title={breakdown.title} initialDirection="asc" period={period} selectedId={selected?.id} onSelect={setSelectedId} mapHref="/app?destination=map" />
    : family === "coverage" && breakdown.id === "service-types"
      ? <CoverageBreakdownTable points={breakdown.points} target={breakdown.target} nameHeading="Tipo de servicio" noun="tipos de servicio" title={breakdown.title} initialDirection="desc" period={period} limit={breakdown.points.length} selectedId={selected?.id} onSelect={setSelectedId} />
      : null;
  return <div className={`${styles.breakdown} ${wide ? styles.breakdownWide : ""}`}><div className={styles.breakdownHeader}><h3>{breakdown.title}</h3><p>{breakdown.description}</p>{selected ? <Alert role="status" variant="info" className="mt-2"><AlertDescription><strong>Seleccionado:</strong> {selected.label} · {pointText(selected)}{selected.note ? ` · ${selected.note}` : ""}</AlertDescription></Alert> : null}</div>{coverageTable ?? (viewMode === "bars" ? <BreakdownBarChart points={breakdown.points} selectedId={selected?.id} onSelect={setSelectedId} title={breakdown.title} formatValue={metricText} formatDetail={pointText} /> : <TableView points={breakdown.points} selectedId={selected?.id} onSelect={setSelectedId} title={breakdown.title} />)}</div>;
}

function TableView({ points, selectedId, onSelect, title }: { points: IndicatorPoint[]; selectedId?: string; onSelect: (id: string) => void; title: string }) {
  const detailLabels = useMemo(() => [...new Set(points.flatMap((point) => point.details?.map((detail) => detail.label) ?? []))], [points]);
  const valueHeading = tableValueHeading(points[0]?.unit);
  const columns = useMemo<DataTableColumn<IndicatorPoint>[]>(() => [
    {
      id: "category",
      accessorFn: (point) => point.label,
      header: "Categoría",
      enableSorting: false,
    },
    ...detailLabels.map((label, index) => ({
      id: `detail-${index}`,
      accessorFn: (point: IndicatorPoint) => point.details?.find((detail) => detail.label === label)?.value ?? null,
      header: label,
      enableSorting: false,
      cell: ({ row }: { row: { original: IndicatorPoint } }) => {
        const detail = row.original.details?.find((item) => item.label === label);
        return detail ? metricText(detail) : "";
      },
    })),
    {
      id: "value",
      accessorFn: (point) => point.value,
      header: valueHeading,
      enableSorting: false,
      cell: ({ row }) => metricText(row.original),
    },
  ], [detailLabels, valueHeading]);
  const table = useDataTable({ data: points, columns });

  return <div className={styles.tableWrap}><DataTable
    table={table}
    container={false}
    className={styles.table}
    renderEmpty={() => null}
    renderRow={(row) => <TableRow key={row.id}>{row.getVisibleCells().map((cell) => {
      const point = row.original;
      return <TableCell key={cell.id} className={cell.column.id === "category" ? styles.categoryCell : styles.value}>{cell.column.id === "category" ? <Button type="button" variant={selectedId === point.id ? "secondary" : "ghost"} size="sm" className={styles.rowButton} aria-pressed={selectedId === point.id} onClick={() => onSelect(point.id)}>{point.label}{point.note ? <span className={styles.note}>{point.note}</span> : null}</Button> : <table.FlexRender cell={cell} />}</TableCell>;
    })}</TableRow>}
  ><TableCaption>Valores exactos de {title.toLowerCase()}</TableCaption></DataTable></div>;
}

function tableValueHeading(unit?: string) {
  const labels: Record<string, string> = { "%": "Porcentaje", "kg": "Kilogramos", "h": "Horas", "incidentes": "Incidentes", "árboles": "Árboles", "reportes": "Reportes", "objetivos": "Objetivos", "servicios": "Servicios" };
  return labels[unit ?? ""] ?? "Valor";
}
