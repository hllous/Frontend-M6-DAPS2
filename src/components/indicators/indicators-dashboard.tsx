"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Activity, CheckCheck, ChevronDown, Database, RefreshCw, Recycle, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCaption, TableCell, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatArgentinaCalendarDate, formatArgentinaNumericDateTime, todayInArgentina } from "@/lib/argentina-date";
import { CONTAINER_STATUS_LABELS, containersAdapter, type Container } from "@/lib/containers";
import { familyAppliesCatalogFilters, indicatorQueryErrorMessage, parseIndicatorUrlState, serializeIndicatorUrlState, indicatorQuerySchema, indicatorsAdapter, INDICATOR_TARGETS, type IndicatorBreakdown, type IndicatorData, type IndicatorPeriod, type IndicatorPoint, type IndicatorQuery } from "@/lib/indicators";
import { serviceSourceHref } from "@/lib/referrals";
import { catalogoDeEtiquetas } from "@/lib/service-labels";
import { STATUS_LABEL, servicesAdapter, type Service } from "@/lib/services";
import type { OperationalScenario } from "@/lib/scenarios";
import { CoverageBreakdownTable } from "./coverage-breakdown-table";
import { BreakdownBarChart } from "./breakdown-bar-chart";
import { IndicatorVariation, type IndicatorVariationDirection, type IndicatorVariationProps } from "./indicator-variation";

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
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: unit === "%" || unit === "h" || unit === "m³" || unit === "días" ? 1 : 0 }).format(value);
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

function indicatorSummaryDetails(family: FamilyKey, value: number | null | undefined, showStatus: boolean, data?: IndicatorData) {
  const backend = data?.family === "coverage" ? data.targets?.coveragePct : data?.family === "compliance" ? data.targets?.compliancePct : data?.family === "incidents" ? data.targets?.resolutionBusinessDays : data?.targets?.landfillDiversionPct;
  const definition = backend === undefined && data?.targets === undefined ? INDICATOR_TARGETS[family] : {
    target: backend?.value != null && (backend.direction === "min" || backend.direction === "max") ? { comparator: backend.direction === "min" ? "≥" as const : "≤" as const, value: backend.value, unit: family === "incidents" ? "días" as const : "%" as const } : null,
    direction: backend?.direction === "max" ? "less-is-better" as const : "more-is-better" as const,
  };
  const targetLabel = definition.target
    ? `Meta ${definition.target.comparator} ${formatNumber(definition.target.value, definition.target.unit)} ${definition.target.unit}`
    : backend?.direction === "down" ? "Tendencia descendente" : "Sin meta definida";
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

function indicatorVariationDetails(data: IndicatorData): Omit<IndicatorVariationProps, "id"> {
  const previousPeriod = data.previous?.period;
  const previous = previousPeriod ? { previousPeriod } : {};

  if (data.family === "coverage") {
    const direction = knownVariationDirection(data.targets?.coveragePct);
    return { delta: data.delta?.coveragePct, unitKind: "percentage-points", ...previous, ...(direction ? { direction } : {}) };
  }

  if (data.family === "compliance") {
    const direction = knownVariationDirection(data.targets?.compliancePct);
    return { delta: data.delta?.onTimePct, unitKind: "percentage-points", ...previous, ...(direction ? { direction } : {}) };
  }

  if (data.family === "incidents") {
    const direction = knownVariationDirection(data.targets?.resolutionBusinessDays);
    return { delta: data.delta?.avgResolutionDays, unitKind: "days", ...previous, ...(direction ? { direction } : {}) };
  }

  const direction = knownVariationDirection(data.targets?.landfillDiversionPct);
  return { delta: data.delta?.divertedPct, unitKind: "percentage-points", ...previous, ...(direction ? { direction } : {}) };
}

function indicatorSummaryDescription(targetLabel: string, directionLabel: string, status?: IndicatorSummaryStatus) {
  return [
    `${targetLabel}.`,
    directionLabel ? `${directionLabel}.` : null,
    status ? `Estado: ${status.label}.` : null,
  ].filter(Boolean).join(" ");
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

function FamilySelectorBand({ states, selectedFamily, onSelect, onRetry }: { states: Record<FamilyKey, FamilyState>; selectedFamily: FamilyKey; onSelect: (family: FamilyKey) => void; onRetry: (family: FamilyKey) => void }) {
  return <LoadingRegion label="Familias" isLoading={familyOrder.some((family) => states[family].status === "loading")}>
    <ToggleGroup value={[selectedFamily]} onValueChange={(values) => { const family = values[0]; if (family) onSelect(family as FamilyKey); }} aria-label="Familias" className={styles.summaryBand}>
      {familyOrder.map((family) => {
        const state = states[family];
        const item = state.data;
        const meta = familyMeta[family];
        const Icon = meta.icon;
        const summary = indicatorSummaryDetails(family, item?.primary.value, state.status === "ready", item);
        const descriptionId = `indicator-${family}-summary-description`;
        const variation = item ? indicatorVariationDetails(item) : null;
        const variationId = `indicator-${family}-variation-description`;
        return <Card className={styles.summaryCard} data-state={state.status} key={family} size="sm">
          <ToggleGroupItem variant="card" className={`${styles.summaryCardSelect} ${state.status === "loading" && item ? styles.previousData : ""}`} value={family} aria-label={`${meta.label}: seleccionar familia`} aria-describedby={variation ? `${descriptionId} ${variationId}` : descriptionId}>
            <span className={styles.summaryCardHeader}><span className="text-sm font-semibold text-muted-foreground">{meta.label}</span><span className={`${styles.summaryIcon} size-8 rounded-lg bg-muted text-primary`}><Icon size={17} aria-hidden /></span></span>
            {state.status === "loading" && !item ? <Skeleton aria-hidden className="h-[30px] w-24" /> : <span className="text-3xl leading-none font-bold tabular-nums tracking-tight">{item ? familySummary(item) : "—"}</span>}
            <span className="text-xs leading-snug text-muted-foreground">{item?.primary.label ?? meta.description}</span>
            {variation ? <IndicatorVariation id={variationId} {...variation} /> : null}
            <span className={styles.summaryTargetDetails}>
              <span className="text-xs font-semibold text-foreground">{summary.targetLabel}</span>
              <span className="text-xs text-muted-foreground">{summary.directionLabel}</span>
              {summary.status ? <Badge className="h-auto min-h-6 py-1" variant={summary.status.variant} aria-hidden="true">
                {summary.status.variant === "success" ? <CheckCheck aria-hidden /> : <TriangleAlert aria-hidden />}
                {summary.status.label}
              </Badge> : null}
            </span>
            <span className="text-xs font-semibold text-primary">{selectedFamily === family ? "Detalle seleccionado" : "Ver detalle"}</span>
          </ToggleGroupItem>
          <span className="sr-only" id={descriptionId}>{indicatorSummaryDescription(summary.targetLabel, summary.directionLabel, summary.status)}</span>
          {state.status === "empty" ? <Alert role="status" className={styles.summaryState}>Sin datos</Alert> : null}
          {state.status === "error" ? <Alert variant="danger" className={styles.summaryState}><AlertTitle>No se pudo cargar {meta.label}</AlertTitle><Button type="button" variant="outline" size="sm" onClick={() => onRetry(family)}>Reintentar {meta.label}</Button></Alert> : null}
        </Card>;
      })}
    </ToggleGroup>
  </LoadingRegion>;
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
  const [viewMode, setViewMode] = useState<ViewMode>(initialUrlState.view);
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
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${search}`);
  }, [appliedQuery, canView, selectedFamily, selectedSignal, viewMode]);
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
  }, [selectedData]);

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
    const to = todayInArgentina();
    const fromDate = new Date(`${to}T00:00:00Z`);
    fromDate.setUTCDate(fromDate.getUTCDate() - days + 1);
    const nextQuery = { ...query, from: fromDate.toISOString().slice(0, 10), to };
    setQuery(nextQuery);
    applyQuery(nextQuery);
  };

  const visibleRecordsStatus = activeRecordPlan?.resource && recordsStatus === "idle" ? "loading" : recordsStatus;
  const recordsView = <AccessibleRecords family={selectedFamily} plan={activeRecordPlan} selection={selectedSignal} breakdown={selectedBreakdown} point={selectedPoint} records={records} status={visibleRecordsStatus} familyStatus={selectedFamilyState.status} open={recordsOpen} onOpenChange={setRecordsOpen} onClear={clearSignal} />;
  const selectedModuleContent = (module: DashboardModule, breakdowns: IndicatorBreakdown[], state: LoadStatus) => <ModuleState label={module === "trend" ? "Por categoría" : "Detalle territorial"} status={state} onRetry={() => retryFamily(selectedFamily)}><IndicatorModuleContent family={selectedFamily} breakdowns={breakdowns} viewMode={viewMode} selection={selectedSignal} onSelect={selectSignal} period={selectedData?.period ?? { from: appliedQuery.from ?? "", to: appliedQuery.to ?? "" }} /></ModuleState>;

  if (!canView) {
    return <section className={styles.empty} aria-labelledby="indicator-forbidden-title"><div><h2 id="indicator-forbidden-title">No tiene permiso para ver los indicadores.</h2></div></section>;
  }

  return (
    <section className={styles.dashboard} aria-labelledby="indicator-dashboard-title">
      <div className={styles.heading}>
        <div><h1 id="indicator-dashboard-title">Indicadores operativos</h1></div>
        {freshness ? <div className={styles.freshness}><Database size={16} aria-hidden /> Actualizado {formatDateTime(freshness)}</div> : <div aria-hidden className={`${styles.freshness} invisible`}><Database size={16} aria-hidden /> Actualizado</div>}
      </div>

      <form className={styles.filters} onSubmit={(event) => { event.preventDefault(); applyQuery(query); }}>
        <Field className={styles.field}><FieldLabel htmlFor="indicator-from">Desde</FieldLabel><DatePicker id="indicator-from" value={query.from ?? ""} onChange={(from) => { setFilterError(null); setQuery((current) => ({ ...current, from: from || undefined })); }} /></Field>
        <Field className={styles.field}><FieldLabel htmlFor="indicator-to">Hasta</FieldLabel><DatePicker id="indicator-to" value={query.to ?? ""} invalid={Boolean(filterError)} aria-describedby={filterError ? "indicator-to-error" : undefined} onChange={(to) => { setFilterError(null); setQuery((current) => ({ ...current, to: to || undefined })); }} /></Field>
        <div className={styles.periodShortcuts} role="group" aria-label="Períodos rápidos">
          {([["Última semana", 7], ["Último mes", 30], ["Último trimestre", 90]] as const).map(([label, days]) => <Button key={days} type="button" variant="outline" onClick={() => applyPeriod(days)}>{label}</Button>)}
        </div>
        <Field className={styles.field}>
          <FieldLabel htmlFor="indicator-family">Familia</FieldLabel>
          <Select value={selectedFamily} onValueChange={(family) => selectFamily(String(family) as FamilyKey)}>
            <SelectTrigger id="indicator-family"><SelectValue>{familyMeta[selectedFamily].label}</SelectValue></SelectTrigger>
            <SelectContent><SelectGroup>{familyOrder.map((family) => <SelectItem key={family} value={family}>{familyMeta[family].label}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>
        </Field>
        <CatalogFilter id="indicator-zone" label="Zona operativa" allLabel="Todas las zonas" noun="zonas" options={filterCatalog?.zones} value={query.zoneId} onChange={(zoneId) => setQuery((current) => ({ ...current, zoneId }))} />
        <CatalogFilter id="indicator-service-type" label="Tipo de servicio" allLabel="Todos los tipos" noun="tipos de servicio" options={filterCatalog?.serviceTypes} value={query.serviceTypeId} onChange={(serviceTypeId) => setQuery((current) => ({ ...current, serviceTypeId }))} />
        <Button className={styles.filterAction} type="submit" disabled={dashboardStatus === "loading"}><RefreshCw data-icon="inline-start" aria-hidden />{dashboardStatus === "loading" ? "Actualizando…" : "Actualizar"}</Button>
        {ignoredFilters ? <Alert role="status" className={styles.note}>Filtros sin efecto en {familyMeta[selectedFamily].label}: {ignoredFilters}. Esta familia sólo se filtra por período, así que se muestra sin filtrar.</Alert> : null}
        {filterError ? <FieldError id="indicator-to-error" className={styles.fieldError}>{filterError}</FieldError> : null}
      </form>

      <div className={styles.summaryHeading}><h2>Resumen del período</h2><span>{appliedQuery.from && appliedQuery.to ? `${formatDate(appliedQuery.from)} – ${formatDate(appliedQuery.to)}` : "Últimos 30 días"}</span></div>
      <FamilySelectorBand states={familyStates} selectedFamily={selectedFamily} onSelect={selectFamily} onRetry={retryFamily} />
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
        <TabsContent value="summary"><LoadingRegion label={`Datos del resumen de ${familyMeta[selectedFamily].label}`} isLoading={selectedFamilyState.status === "loading" && Boolean(selectedData)} className={selectedFamilyState.status === "loading" && selectedData ? styles.previousData : undefined}><section className={styles.mobileSummary} aria-labelledby="mobile-summary-title"><h2 id="mobile-summary-title">{familyMeta[selectedFamily].label}</h2>{selectedData ? <p><strong>{selectedData.primary.label}:</strong> {metricText(selectedData.primary)}</p> : selectedFamilyState.status === "loading" ? <LoadingRegion label={`Resumen de ${familyMeta[selectedFamily].label}`}><Skeleton aria-hidden className="h-6 w-3/4" /></LoadingRegion> : <p>{selectedFamilyState.status === "error" ? "No se pudo cargar. Intente nuevamente." : "Sin resultados en el período."}</p>}
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
        </section></LoadingRegion></TabsContent>
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
  // Hoy sólo la resolución media de reportes puede venir null (ningún reporte cerrado en el período).
  if (metric.value === null) return "Sin reportes cerrados";
  return `${formatNumber(metric.value, metric.unit)} ${metric.unit}`;
}

function pointText(point: IndicatorPoint) {
  const value = metricText(point);
  const details = point.details?.map((detail) => `${formatNumber(detail.value, detail.unit)} ${detail.label.toLowerCase()}`).join(" · ");
  return details ? `${value} · ${details}` : value;
}

function detailContext(data: IndicatorData) {
  if (data.family === "incidents") {
    return <p className={styles.detailContext}>Contenedores y arbolado: situación actual.</p>;
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
      <div><h2 id="indicator-detail-title">{meta.label}</h2><p>{formatDate(data.period.from)} – {formatDate(data.period.to)} · {data.primary.label}: <strong>{metricText(data.primary)}</strong></p></div>
      <div className={styles.viewActions}>
        <ToggleGroup value={[requestedViewMode]} onValueChange={(values) => { const value = values[0]; if (value) onViewModeChange(value as ViewMode); }} variant="outline" size="sm" className={styles.viewToggle} aria-label="Vista del detalle">
          <ToggleGroupItem value="bars">Barras</ToggleGroupItem>
          <ToggleGroupItem value="table">Tabla</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
    {hasSummaryMetrics ? <div className={styles.summaryMetrics} aria-label={`Resumen exacto de ${meta.label}`}>{data.summaryMetrics.map((metric) => <div className={styles.summaryMetric} key={metric.label}><strong>{metricText(metric)}</strong><span>{metric.label}</span></div>)}</div> : null}
    {detailContext(data)}
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
