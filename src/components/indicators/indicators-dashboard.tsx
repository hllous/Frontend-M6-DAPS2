"use client";

import { Activity, CheckCheck, Clock3, Database, RefreshCw, Recycle, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { defaultIndicatorQuery, indicatorsAdapter, type IndicatorBreakdown, type IndicatorData, type IndicatorPoint, type IndicatorQuery } from "@/lib/indicators";
import type { OperationalScenario } from "@/lib/scenarios";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import styles from "./indicators-dashboard.module.css";

type FamilyKey = IndicatorData["family"];
type ViewMode = "bars" | "table";

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

function formatNumber(value: number, unit: string) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: unit === "%" || unit === "h" ? 1 : 0 }).format(value);
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

  if (!canView) {
    return <section className={styles.empty} aria-labelledby="indicator-forbidden-title"><div><h2 id="indicator-forbidden-title">Indicadores no disponibles</h2><p>Su sesión no tiene la capacidad necesaria para consultar indicadores operativos.</p></div></section>;
  }

  return (
    <section className={styles.dashboard} aria-labelledby="indicator-dashboard-title">
      <div className={styles.heading}>
        <div><h1 id="indicator-dashboard-title">Indicadores operativos</h1><p>Una lectura común de cobertura, cumplimiento, incidencias y residuos para coordinar la operación municipal.</p></div>
        {freshness ? <div className={styles.freshness}><Database size={16} aria-hidden /> Actualizado {formatDateTime(freshness)}</div> : null}
      </div>

      <form className={styles.filters} onSubmit={(event) => { event.preventDefault(); setStatus("loading"); setAppliedQuery({ ...query }); }}>
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
          {familyOrder.map((family) => { const item = data[family]; const meta = familyMeta[family]; const Icon = meta.icon; return <button key={family} type="button" className={styles.summaryCard} aria-pressed={selectedFamily === family} onClick={() => setSelectedFamily(family)}><span className={styles.summaryCardHeader}><span>{meta.label}</span><span className={styles.summaryIcon}><Icon size={17} aria-hidden /></span></span><span className={styles.summaryValue}>{item ? familySummary(item) : "—"}</span><span className={styles.summaryLabel}>{item?.primary.label ?? meta.description}</span><span className={styles.summaryHint}>{selectedFamily === family ? "Detalle seleccionado" : "Ver detalle"}</span></button>; })}
        </div>
        {selectedData ? <IndicatorDetail data={selectedData} viewMode={viewMode} onViewModeChange={setViewMode} /> : null}
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
    return <p className={styles.detailContext}><strong>Unidad de análisis:</strong> servicio + zona. Los servicios cancelados no se incluyen en el cálculo de incumplimiento.</p>;
  }
  if (data.family === "compliance") {
    return <p className={styles.detailContext}>El estado <strong>en fecha</strong> compara el último <code>ZoneResult.recordedAt</code> con <code>Service.scheduledDate</code>. Las zonas sin atención se ordenan con el motivo registrado.</p>;
  }
  return null;
}

function IndicatorDetail({ data, viewMode, onViewModeChange }: { data: IndicatorData; viewMode: ViewMode; onViewModeChange: (mode: ViewMode) => void }) {
  const meta = familyMeta[data.family];
  const hasSummaryMetrics = data.family === "coverage" || data.family === "compliance";
  return <section className={styles.detail} aria-labelledby="indicator-detail-title">
    <div className={styles.detailHeader}>
      <div><h2 id="indicator-detail-title">{meta.label}</h2><p>{formatDate(data.period.from)} – {formatDate(data.period.to)} · {data.primary.label}: <strong>{metricText(data.primary)}</strong></p></div>
      <div className={styles.viewActions}>
        <div className={styles.viewToggle} aria-label="Vista del detalle"><button type="button" aria-pressed={viewMode === "bars"} onClick={() => onViewModeChange("bars")}>Barras</button><button type="button" aria-pressed={viewMode === "table"} onClick={() => onViewModeChange("table")}>Tabla</button></div>
        <button className={styles.dataTableAction} type="button" onClick={() => onViewModeChange("table")}>Ver tabla de datos</button>
      </div>
    </div>
    {hasSummaryMetrics ? <div className={styles.summaryMetrics} aria-label={`Resumen exacto de ${meta.label}`}>{data.summaryMetrics.map((metric) => <div className={styles.summaryMetric} key={metric.label}><strong>{metricText(metric)}</strong><span>{metric.label}</span></div>)}</div> : null}
    {detailContext(data)}
    <div className={styles.detailBody} role={viewMode === "table" ? "region" : undefined} aria-label={viewMode === "table" ? `Tabla de datos de ${meta.label}` : undefined}>{data.breakdowns.map((breakdown) => <BreakdownView key={breakdown.id} breakdown={breakdown} viewMode={viewMode} />)}</div>
  </section>;
}

function BreakdownView({ breakdown, viewMode }: { breakdown: IndicatorBreakdown; viewMode: ViewMode }) {
  const [selectedId, setSelectedId] = useState(breakdown.points[0]?.id);
  const selected = breakdown.points.find((point) => point.id === selectedId) ?? breakdown.points[0];
  return <div className={styles.breakdown}><div className={styles.breakdownHeader}><h3>{breakdown.title}</h3><p>{breakdown.description}</p>{selected ? <p aria-live="polite"><strong>Seleccionado:</strong> {selected.label} · {pointText(selected)}{selected.note ? ` · ${selected.note}` : ""}</p> : null}</div>{viewMode === "bars" ? <BarView points={breakdown.points} selectedId={selected?.id} onSelect={setSelectedId} title={breakdown.title} /> : <TableView points={breakdown.points} selectedId={selected?.id} onSelect={setSelectedId} title={breakdown.title} />}</div>;
}

function BarView({ points, selectedId, onSelect, title }: { points: IndicatorPoint[]; selectedId?: string; onSelect: (id: string) => void; title: string }) {
  const data = points.map((point) => ({ ...point, valueLabel: metricText(point) }));
  return <div className={styles.chartView}>
    <ChartContainer className={styles.chart} config={chartConfig} initialDimension={{ width: 480, height: Math.max(220, points.length * 56 + 40) }}><BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 8, right: 24, top: 12, bottom: 8 }} onClick={(entry) => { const point = (entry as { activePayload?: Array<{ payload?: IndicatorPoint }> })?.activePayload?.[0]?.payload; if (point?.id) onSelect(point.id); }}><CartesianGrid horizontal={false} stroke="var(--color-border)" /><XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(value) => formatNumber(Number(value), points[0]?.unit ?? "")} /><YAxis type="category" dataKey="label" tickLine={false} axisLine={false} tickMargin={8} width={104} /><ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => <span>{formatNumber(Number(value), points[0]?.unit ?? "")} {points[0]?.unit}</span>} />} /><Bar dataKey="value" radius={[0, 4, 4, 0]} fill="var(--color-action)" isAnimationActive={false} /></BarChart></ChartContainer>
    <div className={styles.chartDetails} role="list" aria-label={`Valores exactos de ${title.toLowerCase()}`}>
      {points.map((point) => <div key={point.id} role="listitem"><button className={styles.chartDetailButton} type="button" aria-pressed={selectedId === point.id} onClick={() => onSelect(point.id)}><span>{point.label}</span><span>{pointText(point)}</span></button></div>)}
    </div>
  </div>;
}

function TableView({ points, selectedId, onSelect, title }: { points: IndicatorPoint[]; selectedId?: string; onSelect: (id: string) => void; title: string }) {
  const detailLabels = points.find((point) => point.details?.length)?.details?.map((detail) => detail.label) ?? [];
  return <div className={styles.tableWrap}><table className={styles.table}><caption>Valores exactos de {title.toLowerCase()}</caption><thead><tr><th scope="col">Categoría</th>{detailLabels.map((label) => <th key={label} scope="col">{label}</th>)}<th scope="col">{detailLabels.length ? "Cobertura" : "Valor"}</th></tr></thead><tbody>{points.map((point) => <tr key={point.id}><td><button type="button" className={styles.rowButton} data-selected={selectedId === point.id} aria-pressed={selectedId === point.id} onClick={() => onSelect(point.id)}>{point.label}{point.note ? <span className={styles.note}>{point.note}</span> : null}</button></td>{detailLabels.map((label) => { const detail = point.details?.find((item) => item.label === label); return <td key={label} className={styles.value}>{detail ? metricText(detail) : "—"}</td>; })}<td className={styles.value}>{metricText(point)}</td></tr>)}</tbody></table></div>;
}
