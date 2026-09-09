"use client";

import Link from "next/link";
import { Activity, CheckCheck, Database, RefreshCw, Recycle, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CONTAINER_STATUS_LABELS, containersAdapter, type Container } from "@/lib/containers";
import { defaultIndicatorQuery, indicatorsAdapter, type IndicatorBreakdown, type IndicatorData, type IndicatorPoint, type IndicatorQuery } from "@/lib/indicators";
import { STATUS_LABEL, servicesAdapter, type Service } from "@/lib/services";
import type { OperationalScenario } from "@/lib/scenarios";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

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
  title: string;
  detail: string;
  zone: string;
  status: string;
};

const familyMeta: Record<FamilyKey, { label: string; icon: typeof Activity; description: string }> = {
  coverage: { label: "Cobertura", icon: Activity, description: "Objetivos atendidos" },
  compliance: { label: "Cumplimiento", icon: CheckCheck, description: "Servicios en fecha" },
  incidents: { label: "Incidencias", icon: TriangleAlert, description: "Resolución de reportes" },
  waste: { label: "Residuos", icon: Recycle, description: "Desvío del relleno" },
};

const familyOrder: FamilyKey[] = ["coverage", "compliance", "incidents", "waste"];
const territorialBreakdownIds = new Set(["zones", "unattended-zones", "containers"]);
const chartConfig: ChartConfig = { value: { label: "Valor", color: "var(--color-action)" } };
const zoneOptions = [{ id: "zone-1", label: "Centro" }, { id: "zone-2", label: "Costera" }, { id: "zone-3", label: "Norte" }];
const serviceTypeOptions = [{ id: "service-collection", label: "Recolección" }, { id: "service-sweeping", label: "Barrido" }, { id: "service-green", label: "Espacios verdes" }];

function zoneLabel(zoneId: string) {
  return zoneOptions.find((option) => option.id === zoneId)?.label ?? zoneId;
}

function serviceTypeLabel(serviceTypeId: string) {
  return serviceTypeOptions.find((option) => option.id === serviceTypeId)?.label ?? serviceTypeId;
}

function defaultTracePlan(family: FamilyKey, period: { from: string; to: string }, zoneId?: string): TracePlan | null {
  if (family !== "coverage" && family !== "compliance") return null;
  return {
    resource: "services",
    period,
    zoneId,
    title: "Servicios",
    href: "/app?destination=services",
    linkLabel: "Abrir Servicios",
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
      linkLabel: "Abrir Servicios",
    };
  }

  if (data.family === "incidents" && breakdown.id === "containers") {
    return {
      resource: "containers",
      period: data.period,
      zoneId: point.id,
      title: "Contenedores",
      href: "/app/catalog/containers",
      linkLabel: "Abrir catálogo de contenedores",
    };
  }

  return {
    resource: null,
    reason: `La señal «${point.label}» no se puede vincular con un registro operativo: el contrato de indicadores no expone una clave compatible con un catálogo actual.`,
  };
}

function serviceToTraceRecord(service: Service): TraceRecord {
  return {
    id: service.id,
    title: service.title,
    detail: service.serviceTypeName ?? "Servicio urbano",
    zone: service.zoneNames.length > 0 ? service.zoneNames.join(" · ") : "Sin zona informada",
    status: STATUS_LABEL[service.status],
  };
}

function containerToTraceRecord(container: Container): TraceRecord {
  return {
    id: container.code,
    title: container.code,
    detail: container.address,
    zone: zoneLabel(container.zoneId),
    status: CONTAINER_STATUS_LABELS[container.status],
  };
}

function formatNumber(value: number, unit: string) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: unit === "%" || unit === "h" || unit === "m³" ? 1 : 0 }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function familySummary(data: IndicatorData) {
  return `${formatNumber(data.primary.value, data.primary.unit)} ${data.primary.unit}`;
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
  return <section className={styles.summaryBand} aria-label="Familias de indicadores" role="region" aria-busy={familyOrder.some((family) => states[family].status === "loading")}>
    {familyOrder.map((family) => {
      const state = states[family];
      const item = state.data;
      const meta = familyMeta[family];
      const Icon = meta.icon;
      return <article className={styles.summaryCard} data-state={state.status} key={family}>
        <button type="button" className={styles.summaryCardSelect} aria-pressed={selectedFamily === family} aria-label={`${meta.label}: seleccionar familia`} onClick={() => onSelect(family)}>
          <span className={styles.summaryCardHeader}><span>{meta.label}</span><span className={styles.summaryIcon}><Icon size={17} aria-hidden /></span></span>
          <span className={styles.summaryValue}>{item && state.status === "ready" ? familySummary(item) : "—"}</span>
          <span className={styles.summaryLabel}>{item?.primary.label ?? meta.description}</span>
          <span className={styles.summaryHint}>{selectedFamily === family ? "Detalle seleccionado" : "Ver detalle"}</span>
        </button>
        {state.status === "loading" ? <Skeleton className={styles.summarySkeleton} role="status" aria-label={`Cargando ${meta.label}`} /> : null}
        {state.status === "empty" ? <p className={styles.summaryState} role="status">Sin datos</p> : null}
        {state.status === "error" ? <div className={styles.summaryState} role="alert"><span>No se pudo cargar {meta.label}</span><Button type="button" variant="outline" size="sm" onClick={() => onRetry(family)}>Reintentar {meta.label}</Button></div> : null}
      </article>;
    })}
  </section>;
}

function ModuleState({ label, status, onRetry, children }: { label: string; status: LoadStatus; onRetry: () => void; children?: React.ReactNode }) {
  const titleId = `indicator-${label.toLowerCase().replaceAll(" ", "-")}-title`;
  const emptyLabel = label === "Detalle territorial" ? "territoriales" : label.toLowerCase();
  if (status === "ready") return <section className={styles.module} aria-label={label} role="region"><h2 id={titleId}>{label}</h2>{children}</section>;
  if (status === "loading") return <section className={styles.moduleState} aria-label={label} role="region"><h2 id={titleId}>{label}</h2><Skeleton className={styles.moduleSkeleton} aria-hidden /><p role="status">Cargando {label.toLowerCase()}…</p></section>;
  if (status === "empty") return <section className={styles.moduleState} aria-label={label} role="region"><Empty><EmptyHeader><EmptyTitle id={titleId}>Sin resultados {emptyLabel}</EmptyTitle><EmptyDescription>No hay datos para los filtros seleccionados.</EmptyDescription></EmptyHeader></Empty></section>;
  return <section className={styles.moduleState} aria-label={label} role="region"><Alert variant="destructive"><AlertTitle id={titleId}>No se pudo cargar {label}</AlertTitle><AlertDescription>Verifique la conexión y vuelva a intentarlo. El período y la familia seleccionada se conservarán.</AlertDescription><Button type="button" variant="outline" onClick={onRetry}>Reintentar {label}</Button></Alert></section>;
}

export function IndicatorsDashboard({ scenario }: { scenario: OperationalScenario }) {
  const canView = scenario.capabilities.includes("indicator:view");
  const [query, setQuery] = useState<IndicatorQuery>(() => defaultIndicatorQuery());
  const [appliedQuery, setAppliedQuery] = useState<IndicatorQuery>(() => defaultIndicatorQuery());
  const [familyStates, setFamilyStates] = useState<Record<FamilyKey, FamilyState>>(emptyFamilyState);
  const [selectedFamily, setSelectedFamily] = useState<FamilyKey>("coverage");
  const [viewMode, setViewMode] = useState<ViewMode>("bars");
  const [selectedSignal, setSelectedSignal] = useState<SelectedSignal | null>(null);
  const [recordPlan, setRecordPlan] = useState<RecordPlan | null>(null);
  const [records, setRecords] = useState<TraceRecord[]>([]);
  const [recordsStatus, setRecordsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
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
    familyOrder.forEach((family) => loadFamily(family, appliedQuery));
  }, [appliedQuery, canView, loadFamily]);

  const freshness = useMemo(() => {
    const values = familyOrder.map((family) => familyStates[family].data?.freshness.updatedAt).filter((value): value is string => Boolean(value));
    return values.sort().at(-1);
  }, [familyStates]);
  const selectedFamilyState = familyStates[selectedFamily];
  const selectedData = selectedFamilyState.status === "ready" ? selectedFamilyState.data : undefined;
  const selectedPeriodFrom = selectedData?.period.from;
  const selectedPeriodTo = selectedData?.period.to;
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
      : containersAdapter.list({ page: 1, pageSize: 100, zoneId: plan.zoneId }).then((page) => page.containers.map(containerToTraceRecord));

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
  const trendBreakdowns = selectedFamilyState.data ? moduleBreakdowns(selectedFamilyState.data, "trend") : [];
  const territoryBreakdowns = selectedFamilyState.data ? moduleBreakdowns(selectedFamilyState.data, "territory") : [];
  const trendStatus = moduleStatus(selectedFamilyState, selectedFamilyState.data, "trend");
  const territoryStatus = moduleStatus(selectedFamilyState, selectedFamilyState.data, "territory");
  const dashboardStatus = familyOrder.some((family) => familyStates[family].status === "loading")
    ? "loading"
    : familyOrder.every((family) => familyStates[family].status === "error") ? "error" : "ready";
  const clearSignal = () => {
    setSelectedSignal(null);
    setRecordPlan((current) => current?.resource ? { ...current, zoneId: undefined } : null);
    setRecordsStatus("idle");
  };

  const selectFamily = (family: FamilyKey) => {
    setSelectedFamily(family);
    setSelectedSignal(null);
    setRecordPlan(null);
    setRecordsStatus("idle");
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
  };

  const visibleRecordsStatus = activeRecordPlan?.resource && recordsStatus === "idle" ? "loading" : recordsStatus;
  const recordsView = <AccessibleRecords family={selectedFamily} period={selectedData?.period} appliedQuery={appliedQuery} plan={activeRecordPlan} selection={selectedSignal} breakdown={selectedBreakdown} point={selectedPoint} records={records} status={visibleRecordsStatus} familyStatus={selectedFamilyState.status} onClear={clearSignal} />;
  const selectedModuleContent = (module: DashboardModule, breakdowns: IndicatorBreakdown[], state: LoadStatus) => <ModuleState label={module === "trend" ? "Tendencia" : "Detalle territorial"} status={state} onRetry={() => retryFamily(selectedFamily)}><IndicatorModuleContent breakdowns={breakdowns} viewMode={viewMode} selection={selectedSignal} onSelect={selectSignal} /></ModuleState>;

  if (!canView) {
    return <section className={styles.empty} aria-labelledby="indicator-forbidden-title"><div><h2 id="indicator-forbidden-title">Indicadores no disponibles</h2><p>Su sesión no tiene la capacidad necesaria para consultar indicadores operativos.</p></div></section>;
  }

  return (
    <section className={styles.dashboard} aria-labelledby="indicator-dashboard-title">
      <div className={styles.heading}>
        <div><h1 id="indicator-dashboard-title">Indicadores operativos</h1><p>Una lectura común de cobertura, cumplimiento, incidencias y residuos para coordinar la operación municipal.</p></div>
        {freshness ? <div className={styles.freshness}><Database size={16} aria-hidden /> Actualizado {formatDateTime(freshness)}</div> : null}
      </div>

      <form className={styles.filters} onSubmit={(event) => { event.preventDefault(); setSelectedSignal(null); setRecordPlan(null); setRecordsStatus("idle"); setFamilyStates(emptyFamilyState()); setAppliedQuery({ ...query }); }}>
        <div className={styles.field}><label htmlFor="indicator-from">Desde</label><input id="indicator-from" type="date" value={query.from ?? ""} onChange={(event) => setQuery((current) => ({ ...current, from: event.target.value || undefined }))} /></div>
        <div className={styles.field}><label htmlFor="indicator-to">Hasta</label><input id="indicator-to" type="date" value={query.to ?? ""} onChange={(event) => setQuery((current) => ({ ...current, to: event.target.value || undefined }))} /></div>
        <div className={styles.field}><label htmlFor="indicator-zone">Zona operativa</label><select id="indicator-zone" value={query.zoneId ?? ""} onChange={(event) => setQuery((current) => ({ ...current, zoneId: event.target.value || undefined }))}><option value="">Todas las zonas</option>{zoneOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></div>
        <div className={styles.field}><label htmlFor="indicator-service-type">Tipo de servicio</label><select id="indicator-service-type" value={query.serviceTypeId ?? ""} onChange={(event) => setQuery((current) => ({ ...current, serviceTypeId: event.target.value || undefined }))}><option value="">Todos los tipos</option>{serviceTypeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></div>
        <Button className={styles.filterAction} type="submit" disabled={dashboardStatus === "loading"}><RefreshCw data-icon="inline-start" aria-hidden />{dashboardStatus === "loading" ? "Actualizando…" : "Actualizar"}</Button>
      </form>

      <div className={styles.summaryHeading}><h2>Resumen del período</h2><span>{appliedQuery.from && appliedQuery.to ? `${formatDate(appliedQuery.from)} – ${formatDate(appliedQuery.to)}` : "Últimos 30 días"}</span></div>
      <FamilySelectorBand states={familyStates} selectedFamily={selectedFamily} onSelect={selectFamily} onRetry={retryFamily} />
      {isNarrow ? <Tabs defaultValue="summary" className={styles.mobileTabs}>
        <TabsList aria-label="Secciones del tablero" className={styles.tabList}>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="trend">Tendencia</TabsTrigger>
          <TabsTrigger value="territory">Territorio</TabsTrigger>
          <TabsTrigger value="records">Registros</TabsTrigger>
        </TabsList>
        <TabsContent value="summary"><section className={styles.mobileSummary} aria-labelledby="mobile-summary-title"><h2 id="mobile-summary-title">Resumen de {familyMeta[selectedFamily].label}</h2>{selectedData ? <p><strong>{selectedData.primary.label}:</strong> {metricText(selectedData.primary)}</p> : <p>{selectedFamilyState.status === "loading" ? "Cargando resumen…" : selectedFamilyState.status === "error" ? "No se pudo cargar el resumen." : "No hay resultados para este período."}</p>}</section></TabsContent>
        <TabsContent value="trend">{selectedModuleContent("trend", trendBreakdowns, trendStatus)}</TabsContent>
        <TabsContent value="territory">{selectedModuleContent("territory", territoryBreakdowns, territoryStatus)}</TabsContent>
        <TabsContent value="records">{recordsView}</TabsContent>
      </Tabs> : selectedData ? <>
        <IndicatorDetail data={selectedData} viewMode={viewMode} selection={selectedSignal} onViewModeChange={setViewMode} onSelect={selectSignal} trendBreakdowns={trendBreakdowns} territoryBreakdowns={territoryBreakdowns} trendStatus={trendStatus} territoryStatus={territoryStatus} onRetry={() => retryFamily(selectedFamily)} />
        {recordsView}
      </> : <div className={styles.desktopModules}>
        {selectedModuleContent("trend", trendBreakdowns, trendStatus)}
        {selectedModuleContent("territory", territoryBreakdowns, territoryStatus)}
        {recordsView}
      </div>}
    </section>
  );
}

function metricText(metric: { value: number; unit: string }) {
  return `${formatNumber(metric.value, metric.unit)} ${metric.unit}`;
}

function pointText(point: IndicatorPoint) {
  const value = metricText(point);
  const details = point.details?.map((detail) => `${formatNumber(detail.value, detail.unit)} ${detail.label.toLowerCase()}`).join(" · ");
  return details ? `${value} · ${details}` : value;
}

function detailContext(data: IndicatorData) {
  if (data.family === "coverage") {
    return <p className={styles.detailContext}><strong>Unidad de análisis:</strong> servicio + zona. Los objetivos programados representan la meta del período; los servicios cancelados no se incluyen en el cálculo de incumplimiento.</p>;
  }
  if (data.family === "compliance") {
    return <p className={styles.detailContext}>El estado <strong>en fecha</strong> compara el último <code>ZoneResult.recordedAt</code> con <code>Service.scheduledDate</code>. Las zonas sin atención se ordenan con el motivo registrado.</p>;
  }
  if (data.family === "incidents") {
    return <p className={styles.detailContext}>Los contenedores y arbolado son instantáneas actuales; los reportes consideran el período y la resolución media usa solo reportes cerrados.</p>;
  }
  if (data.family === "waste") {
    return <p className={styles.detailContext}>Los volúmenes se informan en kilogramos y metros cúbicos por tipo y destino. El desvío expresa el porcentaje del período que no fue enviado al relleno sanitario.</p>;
  }
  return null;
}

function IndicatorModuleContent({ breakdowns, viewMode, selection, onSelect }: { breakdowns: IndicatorBreakdown[]; viewMode: ViewMode; selection: SelectedSignal | null; onSelect: (breakdownId: string, pointId: string) => void }) {
  return <div className={styles.moduleContent}>{breakdowns.map((breakdown) => <BreakdownView key={breakdown.id} breakdown={breakdown} viewMode={viewMode} selectedId={selection?.breakdownId === breakdown.id ? selection.pointId : undefined} onSelect={(pointId) => onSelect(breakdown.id, pointId)} />)}</div>;
}

function IndicatorDetail({ data: rawData, viewMode: requestedViewMode, selection, onViewModeChange, onSelect, trendBreakdowns, territoryBreakdowns, trendStatus, territoryStatus, onRetry }: { data: IndicatorData; viewMode: ViewMode; selection: SelectedSignal | null; onViewModeChange: (mode: ViewMode) => void; onSelect: (breakdownId: string, pointId: string) => void; trendBreakdowns: IndicatorBreakdown[]; territoryBreakdowns: IndicatorBreakdown[]; trendStatus: LoadStatus; territoryStatus: LoadStatus; onRetry: () => void }) {
  const data = rawData;
  const meta = familyMeta[data.family];
  const hasSummaryMetrics = data.family === "coverage" || data.family === "compliance";
  return <section className={styles.detail} aria-labelledby="indicator-detail-title">
    <div className={styles.detailHeader}>
      <div><h2 id="indicator-detail-title">{meta.label}</h2><p>{formatDate(data.period.from)} – {formatDate(data.period.to)} · {data.primary.label}: <strong>{metricText(data.primary)}</strong></p></div>
      <div className={styles.viewActions}>
        <div className={styles.viewToggle} aria-label="Vista del detalle"><button type="button" aria-pressed={requestedViewMode === "bars"} onClick={() => onViewModeChange("bars")}>Barras</button><button type="button" aria-pressed={requestedViewMode === "table"} onClick={() => onViewModeChange("table")}>Tabla</button></div>
        <Button className={styles.dataTableAction} type="button" variant="outline" size="lg" onClick={() => onViewModeChange("table")}>Ver tabla de datos</Button>
      </div>
    </div>
    {hasSummaryMetrics ? <div className={styles.summaryMetrics} aria-label={`Resumen exacto de ${meta.label}`}>{data.summaryMetrics.map((metric) => <div className={styles.summaryMetric} key={metric.label}><strong>{metricText(metric)}</strong><span>{metric.label}</span></div>)}</div> : null}
    {detailContext(data)}
    <div className={styles.detailModules} role={requestedViewMode === "table" ? "region" : undefined} aria-label={requestedViewMode === "table" ? `Tabla de datos de ${meta.label}` : undefined}>
      <ModuleState label="Tendencia" status={trendStatus} onRetry={onRetry}><IndicatorModuleContent breakdowns={trendBreakdowns} viewMode={requestedViewMode} selection={selection} onSelect={onSelect} /></ModuleState>
      <ModuleState label="Detalle territorial" status={territoryStatus} onRetry={onRetry}><IndicatorModuleContent breakdowns={territoryBreakdowns} viewMode={requestedViewMode} selection={selection} onSelect={onSelect} /></ModuleState>
    </div>
  </section>;
}

function filterSummary(query: IndicatorQuery) {
  const filters = [
    query.zoneId ? `Zona: ${zoneLabel(query.zoneId)}` : null,
    query.serviceTypeId ? `Tipo de servicio: ${serviceTypeLabel(query.serviceTypeId)}` : null,
  ].filter((filter): filter is string => Boolean(filter));
  return filters.length > 0 ? filters.join(" · ") : "sin filtros territoriales adicionales";
}

function AccessibleRecords({ family, period: requestedPeriod, appliedQuery, plan, selection, breakdown, point, records, status, familyStatus = "ready", onClear }: { family: FamilyKey; period?: { from: string; to: string }; appliedQuery: IndicatorQuery; plan: RecordPlan | null; selection: SelectedSignal | null; breakdown?: IndicatorBreakdown; point?: IndicatorPoint; records: TraceRecord[]; status: "idle" | "loading" | "ready" | "error"; familyStatus?: LoadStatus; onClear: () => void }) {
  const period = requestedPeriod ?? defaultIndicatorQuery();
  const meta = familyMeta[family];
  const hasSelection = Boolean(selection && breakdown && point);
  return <section className={styles.records} aria-labelledby="indicator-records-title">
    {familyStatus === "loading" && !plan ? <p className={styles.recordsMessage} role="status">Cargando registros relacionados…</p> : null}
    {familyStatus === "error" && !plan ? <p className={styles.recordsMessage} role="alert">No se pudieron cargar los registros relacionados porque la familia seleccionada no está disponible.</p> : null}
    <div className={styles.recordsHeader}>
      <div><h2 id="indicator-records-title">Registros accesibles</h2><p>Consulta los registros que explican la señal sin habilitar su gestión desde el tablero.</p></div>
      {plan?.resource ? <Link className={styles.recordsLink} href={plan.href}>{plan.linkLabel}</Link> : null}
    </div>
    <p className={styles.recordsMeta}><strong>Familia:</strong> {meta.label} · <strong>Período:</strong> {formatDate(period.from)} – {formatDate(period.to)} · <strong>Filtros:</strong> {filterSummary(appliedQuery)}</p>
    <div className={styles.recordsContext} aria-live="polite">
      {plan?.resource === null && hasSelection ? <p>{plan.reason}</p> : hasSelection ? <p><strong>Filtro activo:</strong> {meta.label} · {breakdown?.title} · {point?.label} · {pointText(point!)}</p> : plan?.resource ? <p><strong>Sin filtro de señal.</strong> Se muestran todos los {plan.title.toLowerCase()} accesibles en el período.</p> : <p>Seleccione una señal compatible para consultar sus registros accesibles.</p>}
      {hasSelection ? <Button type="button" variant="outline" size="sm" onClick={onClear}>Quitar filtro de señal</Button> : null}
    </div>
    {plan?.resource ? status === "loading" ? <p className={styles.recordsMessage} role="status">Cargando registros accesibles…</p> : status === "error" ? <p className={styles.recordsMessage} role="alert">No se pudieron cargar los registros accesibles.</p> : <TraceRecordsTable plan={plan} records={records} /> : <p className={styles.recordsMessage} role="status">{hasSelection ? "No hay una relación de registros disponible para esta señal." : "Esta familia no tiene una vista de registros accesibles para la selección actual."}</p>}
  </section>;
}

function TraceRecordsTable({ plan, records }: { plan: TracePlan; records: TraceRecord[] }) {
  return <div className={styles.recordsTableWrap}><table className={styles.recordsTable}><caption>Registros accesibles de {plan.title}</caption><thead><tr><th scope="col">Identificador</th><th scope="col">Registro</th><th scope="col">Zona operativa</th><th scope="col">Estado</th></tr></thead><tbody>{records.length > 0 ? records.map((record) => <tr key={record.id}><td className={styles.value}><strong>{record.id}</strong></td><td><span>{record.title}</span><span className={styles.note}>{record.detail}</span></td><td>{record.zone}</td><td>{record.status}</td></tr>) : <tr><td colSpan={4}>No hay registros accesibles para este filtro.</td></tr>}</tbody></table></div>;
}

function BreakdownView({ breakdown, viewMode, selectedId: controlledSelectedId, onSelect }: { breakdown: IndicatorBreakdown; viewMode: ViewMode; selectedId?: string; onSelect: (pointId: string) => void }) {
  const [localSelectedId, setLocalSelectedId] = useState(controlledSelectedId);
  const selectedId = controlledSelectedId ?? localSelectedId;
  const selected = controlledSelectedId ? breakdown.points.find((point) => point.id === selectedId) : undefined;
  const setSelectedId = (pointId: string) => { setLocalSelectedId(pointId); onSelect(pointId); };
  return <div className={styles.breakdown}><div className={styles.breakdownHeader}><h3>{breakdown.title}</h3><p>{breakdown.description}</p>{selected ? <p aria-live="polite"><strong>Seleccionado:</strong> {selected.label} · {pointText(selected)}{selected.note ? ` · ${selected.note}` : ""}</p> : null}</div>{viewMode === "bars" ? <BarView points={breakdown.points} selectedId={selected?.id} onSelect={setSelectedId} title={breakdown.title} /> : <TableView points={breakdown.points} selectedId={selected?.id} onSelect={setSelectedId} title={breakdown.title} />}</div>;
}

function BarView({ points, selectedId, onSelect, title }: { points: IndicatorPoint[]; selectedId?: string; onSelect: (id: string) => void; title: string }) {
  const data = points.map((point) => ({ ...point, valueLabel: metricText(point) }));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [hoveredId, setHoveredId] = useState<string>();
  const [pinnedId, setPinnedId] = useState<string>();
  const activeId = pinnedId ?? hoveredId;
  const activePoint = points.find((point) => point.id === activeId);

  const dismissDetail = useCallback(() => {
    const trigger = activeId ? triggerRefs.current[activeId] : undefined;
    if (pinnedId && selectedId === pinnedId) onSelect(pinnedId);
    setPinnedId(undefined);
    setHoveredId(undefined);
    trigger?.focus();
  }, [activeId, onSelect, pinnedId, selectedId]);

  useEffect(() => {
    if (!activeId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissDetail();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node) && pinnedId) {
        event.preventDefault();
        dismissDetail();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [activeId, dismissDetail, pinnedId]);

  const pointFromEntry = (entry: unknown) => (entry as { activePayload?: Array<{ payload?: IndicatorPoint }> })?.activePayload?.[0]?.payload;
  const previewPoint = (entry: unknown) => {
    const point = pointFromEntry(entry);
    if (point?.id && !pinnedId) setHoveredId(point.id);
  };
  const pinPoint = (id: string) => {
    setPinnedId(id);
    setHoveredId(undefined);
    onSelect(id);
  };

  return <div className={styles.chartView} ref={rootRef}>
    <ChartContainer className={styles.chart} config={chartConfig} initialDimension={{ width: 480, height: Math.max(220, points.length * 56 + 40) }}><BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 8, right: 24, top: 12, bottom: 8 }} onMouseMove={previewPoint} onMouseLeave={() => { if (!pinnedId) setHoveredId(undefined); }} onClick={(entry) => { const point = pointFromEntry(entry); if (point?.id) pinPoint(point.id); }}><CartesianGrid horizontal={false} stroke="var(--color-border)" /><XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(value) => formatNumber(Number(value), points[0]?.unit ?? "")} /><YAxis type="category" dataKey="label" tickLine={false} axisLine={false} tickMargin={8} width={104} /><ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => <span>{formatNumber(Number(value), points[0]?.unit ?? "")} {points[0]?.unit}</span>} />} /><Bar dataKey="value" radius={[0, 4, 4, 0]} fill="var(--color-action)" isAnimationActive={false}>{points.map((point) => <Cell key={point.id} fill={point.tone === "success" ? "var(--color-success)" : point.tone === "warning" ? "var(--color-warning)" : "var(--color-action)"} />)}</Bar></BarChart></ChartContainer>
    <div className={styles.chartDetails} role="list" aria-label={`Valores exactos de ${title.toLowerCase()}`}>
      {points.map((point) => <div key={point.id} role="listitem"><button ref={(element) => { triggerRefs.current[point.id] = element; }} className={styles.chartDetailButton} type="button" aria-pressed={selectedId === point.id} onFocus={() => { if (!pinnedId) setHoveredId(point.id); }} onMouseEnter={() => { if (!pinnedId) setHoveredId(point.id); }} onMouseLeave={() => { if (!pinnedId) setHoveredId(undefined); }} onClick={() => pinPoint(point.id)}><span>{point.label}</span><span>{pointText(point)}</span></button></div>)}
    </div>
    {activePoint ? <div className={styles.chartPinnedDetail} role="status" aria-label={`${pinnedId ? "Detalle fijado" : "Detalle"} de ${activePoint.label}`}><strong>{activePoint.label}</strong><span>{pointText(activePoint)}{activePoint.note ? ` · ${activePoint.note}` : ""}</span>{pinnedId ? <button type="button" onClick={dismissDetail}>Cerrar detalle</button> : null}</div> : null}
  </div>;
}

function TableView({ points, selectedId, onSelect, title }: { points: IndicatorPoint[]; selectedId?: string; onSelect: (id: string) => void; title: string }) {
  const detailLabels = points.find((point) => point.details?.length)?.details?.map((detail) => detail.label) ?? [];
  const valueHeading = tableValueHeading(points[0]?.unit);
  return <div className={styles.tableWrap}><table className={styles.table}><caption>Valores exactos de {title.toLowerCase()}</caption><thead><tr><th scope="col">Categoría</th>{detailLabels.map((label) => <th key={label} scope="col">{label}</th>)}<th scope="col">{valueHeading}</th></tr></thead><tbody>{points.map((point) => <tr key={point.id}><td><button type="button" className={styles.rowButton} data-selected={selectedId === point.id} aria-pressed={selectedId === point.id} onClick={() => onSelect(point.id)}>{point.label}{point.note ? <span className={styles.note}>{point.note}</span> : null}</button></td>{detailLabels.map((label) => { const detail = point.details?.find((item) => item.label === label); return <td key={label} className={styles.value}>{detail ? metricText(detail) : "—"}</td>; })}<td className={styles.value}>{metricText(point)}</td></tr>)}</tbody></table></div>;
}

function tableValueHeading(unit?: string) {
  const labels: Record<string, string> = { "%": "Porcentaje", "kg": "Kilogramos", "h": "Horas", "incidentes": "Incidentes", "árboles": "Árboles", "reportes": "Reportes", "objetivos": "Objetivos", "servicios": "Servicios" };
  return labels[unit ?? ""] ?? "Valor";
}
