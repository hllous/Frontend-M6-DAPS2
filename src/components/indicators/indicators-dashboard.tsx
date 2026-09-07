"use client";

import Link from "next/link";
import { Activity, CheckCheck, Clock3, Database, RefreshCw, Recycle, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { CONTAINER_STATUS_LABELS, containersAdapter, type Container } from "@/lib/containers";
import { defaultIndicatorQuery, indicatorsAdapter, type IndicatorBreakdown, type IndicatorData, type IndicatorPoint, type IndicatorQuery } from "@/lib/indicators";
import { STATUS_LABEL, servicesAdapter, type Service } from "@/lib/services";
import type { OperationalScenario } from "@/lib/scenarios";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import styles from "./indicators-dashboard.module.css";

type FamilyKey = IndicatorData["family"];
type ViewMode = "bars" | "table";
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

export function IndicatorsDashboard({ scenario }: { scenario: OperationalScenario }) {
  const canView = scenario.capabilities.includes("indicator:view");
  const [query, setQuery] = useState<IndicatorQuery>(() => defaultIndicatorQuery());
  const [appliedQuery, setAppliedQuery] = useState<IndicatorQuery>(() => defaultIndicatorQuery());
  const [data, setData] = useState<Partial<Record<FamilyKey, IndicatorData>>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("loading");
  const [selectedFamily, setSelectedFamily] = useState<FamilyKey>("coverage");
  const [viewMode, setViewMode] = useState<ViewMode>("bars");
  const [reload, setReload] = useState(0);
  const [selectedSignal, setSelectedSignal] = useState<SelectedSignal | null>(null);
  const [recordPlan, setRecordPlan] = useState<RecordPlan | null>(null);
  const [records, setRecords] = useState<TraceRecord[]>([]);
  const [recordsStatus, setRecordsStatus] = useState<"idle" | "loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!canView) return;
    let current = true;
    Promise.all([
      indicatorsAdapter.getCoverage(appliedQuery),
      indicatorsAdapter.getCompliance(appliedQuery),
      indicatorsAdapter.getIncidents(appliedQuery),
      indicatorsAdapter.getWaste(appliedQuery),
    ]).then(([coverage, compliance, incidents, waste]) => {
      if (!current) return;
      setData({ coverage, compliance, incidents, waste });
      setStatus("ready");
    }).catch(() => {
      if (current) setStatus("error");
    });
    return () => { current = false; };
  }, [appliedQuery, canView, reload]);

  const freshness = useMemo(() => {
    const values = familyOrder.map((family) => data[family]?.freshness.updatedAt).filter((value): value is string => Boolean(value));
    return values.sort().at(-1);
  }, [data]);
  const selectedData = data[selectedFamily];
  const selectedPeriodFrom = selectedData?.period.from;
  const selectedPeriodTo = selectedData?.period.to;
  const defaultRecordsPlan = useMemo(
    () => selectedPeriodFrom && selectedPeriodTo ? defaultTracePlan(selectedFamily, { from: selectedPeriodFrom, to: selectedPeriodTo }, appliedQuery.zoneId) : null,
    [appliedQuery.zoneId, selectedFamily, selectedPeriodFrom, selectedPeriodTo],
  );
  const activeRecordPlan = recordPlan ?? defaultRecordsPlan;

  useEffect(() => {
    const plan = activeRecordPlan;
    if (!plan || plan.resource === null) return;

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

  const clearSignal = () => {
    setSelectedSignal(null);
    setRecordsStatus("loading");
    setRecordPlan((current) => current?.resource ? { ...current, zoneId: undefined } : null);
  };

  const selectFamily = (family: FamilyKey) => {
    setSelectedFamily(family);
    setSelectedSignal(null);
    setRecordPlan(null);
    setRecordsStatus("loading");
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

  if (!canView) {
    return <section className={styles.empty} aria-labelledby="indicator-forbidden-title"><div><h2 id="indicator-forbidden-title">Indicadores no disponibles</h2><p>Su sesión no tiene la capacidad necesaria para consultar indicadores operativos.</p></div></section>;
  }

  return (
    <section className={styles.dashboard} aria-labelledby="indicator-dashboard-title">
      <div className={styles.heading}>
        <div><h1 id="indicator-dashboard-title">Indicadores operativos</h1><p>Una lectura común de cobertura, cumplimiento, incidencias y residuos para coordinar la operación municipal.</p></div>
        {freshness ? <div className={styles.freshness}><Database size={16} aria-hidden /> Actualizado {formatDateTime(freshness)}</div> : null}
      </div>

      <form className={styles.filters} onSubmit={(event) => { event.preventDefault(); setSelectedSignal(null); setRecordPlan(null); setStatus("loading"); setAppliedQuery({ ...query }); }}>
        <div className={styles.field}><label htmlFor="indicator-from">Desde</label><input id="indicator-from" type="date" value={query.from ?? ""} onChange={(event) => setQuery((current) => ({ ...current, from: event.target.value || undefined }))} /></div>
        <div className={styles.field}><label htmlFor="indicator-to">Hasta</label><input id="indicator-to" type="date" value={query.to ?? ""} onChange={(event) => setQuery((current) => ({ ...current, to: event.target.value || undefined }))} /></div>
        <div className={styles.field}><label htmlFor="indicator-zone">Zona operativa</label><select id="indicator-zone" value={query.zoneId ?? ""} onChange={(event) => setQuery((current) => ({ ...current, zoneId: event.target.value || undefined }))}><option value="">Todas las zonas</option>{zoneOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></div>
        <div className={styles.field}><label htmlFor="indicator-service-type">Tipo de servicio</label><select id="indicator-service-type" value={query.serviceTypeId ?? ""} onChange={(event) => setQuery((current) => ({ ...current, serviceTypeId: event.target.value || undefined }))}><option value="">Todos los tipos</option>{serviceTypeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></div>
        <Button className={styles.filterAction} type="submit" disabled={status === "loading"}><RefreshCw data-icon="inline-start" aria-hidden />{status === "loading" ? "Actualizando…" : "Actualizar"}</Button>
      </form>

      <div className={styles.summaryHeading}><h2>Resumen del período</h2><span>{appliedQuery.from && appliedQuery.to ? `${formatDate(appliedQuery.from)} – ${formatDate(appliedQuery.to)}` : "Últimos 30 días"}</span></div>
      {status === "loading" && !selectedData ? <div className={styles.skeletonBand} aria-label="Cargando indicadores"><div className={styles.skeleton} /><div className={styles.skeleton} /><div className={styles.skeleton} /><div className={styles.skeleton} /></div> : null}
      {status === "error" ? <div className={styles.error} role="alert"><div><h2>No se pudieron cargar los indicadores</h2><p>Verifique la conexión y vuelva a intentarlo. Los filtros elegidos se conservarán.</p><Button className="mt-4" variant="outline" onClick={() => { setStatus("loading"); setReload((current) => current + 1); }}>Reintentar</Button></div></div> : null}
      {status === "ready" ? <>
        <div className={styles.summaryBand} aria-label="Familias de indicadores">
          {familyOrder.map((family) => { const item = data[family]; const meta = familyMeta[family]; const Icon = meta.icon; return <button key={family} type="button" className={styles.summaryCard} aria-pressed={selectedFamily === family} onClick={() => selectFamily(family)}><span className={styles.summaryCardHeader}><span>{meta.label}</span><span className={styles.summaryIcon}><Icon size={17} aria-hidden /></span></span><span className={styles.summaryValue}>{item ? familySummary(item) : "—"}</span><span className={styles.summaryLabel}>{item?.primary.label ?? meta.description}</span><span className={styles.summaryHint}>{selectedFamily === family ? "Detalle seleccionado" : "Ver detalle"}</span></button>; })}
        </div>
        {selectedData ? <>
          <IndicatorDetail data={selectedData} viewMode={viewMode} selection={selectedSignal} onViewModeChange={setViewMode} onSelect={selectSignal} />
          <AccessibleRecords family={selectedFamily} period={selectedData.period} appliedQuery={appliedQuery} plan={activeRecordPlan} selection={selectedSignal} breakdown={selectedBreakdown} point={selectedPoint} records={records} status={recordsStatus} onClear={clearSignal} />
        </> : null}
      </> : null}
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

function IndicatorDetail({ data, viewMode, selection, onViewModeChange, onSelect }: { data: IndicatorData; viewMode: ViewMode; selection: SelectedSignal | null; onViewModeChange: (mode: ViewMode) => void; onSelect: (breakdownId: string, pointId: string) => void }) {
  const meta = familyMeta[data.family];
  const hasSummaryMetrics = data.family === "coverage" || data.family === "compliance";
  return <section className={styles.detail} aria-labelledby="indicator-detail-title">
    <div className={styles.detailHeader}>
      <div><h2 id="indicator-detail-title">{meta.label}</h2><p>{formatDate(data.period.from)} – {formatDate(data.period.to)} · {data.primary.label}: <strong>{metricText(data.primary)}</strong></p></div>
      <div className={styles.viewActions}>
        <div className={styles.viewToggle} aria-label="Vista del detalle"><button type="button" aria-pressed={viewMode === "bars"} onClick={() => onViewModeChange("bars")}>Barras</button><button type="button" aria-pressed={viewMode === "table"} onClick={() => onViewModeChange("table")}>Tabla</button></div>
        <Button className={styles.dataTableAction} type="button" variant="outline" size="lg" onClick={() => onViewModeChange("table")}>Ver tabla de datos</Button>
      </div>
    </div>
    {hasSummaryMetrics ? <div className={styles.summaryMetrics} aria-label={`Resumen exacto de ${meta.label}`}>{data.summaryMetrics.map((metric) => <div className={styles.summaryMetric} key={metric.label}><strong>{metricText(metric)}</strong><span>{metric.label}</span></div>)}</div> : null}
    {detailContext(data)}
    <div className={styles.detailBody} role={viewMode === "table" ? "region" : undefined} aria-label={viewMode === "table" ? `Tabla de datos de ${meta.label}` : undefined}>{data.breakdowns.map((breakdown) => <BreakdownView key={breakdown.id} breakdown={breakdown} viewMode={viewMode} selectedId={selection?.breakdownId === breakdown.id ? selection.pointId : undefined} onSelect={(pointId) => onSelect(breakdown.id, pointId)} />)}</div>
  </section>;
}

function filterSummary(query: IndicatorQuery) {
  const filters = [
    query.zoneId ? `Zona: ${zoneLabel(query.zoneId)}` : null,
    query.serviceTypeId ? `Tipo de servicio: ${serviceTypeLabel(query.serviceTypeId)}` : null,
  ].filter((filter): filter is string => Boolean(filter));
  return filters.length > 0 ? filters.join(" · ") : "sin filtros territoriales adicionales";
}

function AccessibleRecords({ family, period, appliedQuery, plan, selection, breakdown, point, records, status, onClear }: { family: FamilyKey; period: { from: string; to: string }; appliedQuery: IndicatorQuery; plan: RecordPlan | null; selection: SelectedSignal | null; breakdown?: IndicatorBreakdown; point?: IndicatorPoint; records: TraceRecord[]; status: "idle" | "loading" | "ready" | "error"; onClear: () => void }) {
  const meta = familyMeta[family];
  const hasSelection = Boolean(selection && breakdown && point);
  return <section className={styles.records} aria-labelledby="indicator-records-title">
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
  return <div className={styles.chartView}>
    <ChartContainer className={styles.chart} config={chartConfig} initialDimension={{ width: 480, height: Math.max(220, points.length * 56 + 40) }}><BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 8, right: 24, top: 12, bottom: 8 }} onClick={(entry) => { const point = (entry as { activePayload?: Array<{ payload?: IndicatorPoint }> })?.activePayload?.[0]?.payload; if (point?.id) onSelect(point.id); }}><CartesianGrid horizontal={false} stroke="var(--color-border)" /><XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(value) => formatNumber(Number(value), points[0]?.unit ?? "")} /><YAxis type="category" dataKey="label" tickLine={false} axisLine={false} tickMargin={8} width={104} /><ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => <span>{formatNumber(Number(value), points[0]?.unit ?? "")} {points[0]?.unit}</span>} />} /><Bar dataKey="value" radius={[0, 4, 4, 0]} fill="var(--color-action)" isAnimationActive={false}>{points.map((point) => <Cell key={point.id} fill={point.tone === "success" ? "var(--color-success)" : point.tone === "warning" ? "var(--color-warning)" : "var(--color-action)"} />)}</Bar></BarChart></ChartContainer>
    <div className={styles.chartDetails} role="list" aria-label={`Valores exactos de ${title.toLowerCase()}`}>
      {points.map((point) => <div key={point.id} role="listitem"><button className={styles.chartDetailButton} type="button" aria-pressed={selectedId === point.id} onClick={() => onSelect(point.id)}><span>{point.label}</span><span>{pointText(point)}</span></button></div>)}
    </div>
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
