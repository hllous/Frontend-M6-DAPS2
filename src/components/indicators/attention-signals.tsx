"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ChartLine, Equal, List } from "lucide-react";
import { Line, LineChart, YAxis } from "recharts";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LoadingRegion } from "@/components/ui/loading-region";
import { Skeleton } from "@/components/ui/skeleton";
import { coverageBucket, type IndicatorData } from "@/lib/indicators";
import { formatArgentinaCalendarDate } from "@/lib/argentina-date";
import { cn } from "@/lib/utils";

import { formatIndicatorNumber } from "./number-format";

type FamilyKey = IndicatorData["family"];
type LoadStatus = "loading" | "ready" | "empty" | "error";
export type SignalFamilyState = { status: LoadStatus; data?: IndicatorData };
type Period = { from?: string; to?: string };

type LoadedSignal = {
  id: string;
  family: FamilyKey;
  label: string;
  value: number;
  /** Valor del período anterior; `null` si el backend no lo mandó. */
  previous: number | null;
  /** Frase en lenguaje llano con la meta o el contexto del número. */
  context: string;
  href: string;
  linkLabel: string;
};
type PendingSignal = { id: string; family: FamilyKey; label: string; value?: undefined };
export type AttentionSignal = LoadedSignal | PendingSignal;

const plainNumber = (value: number, digits: 0 | 1 = 0) => formatIndicatorNumber(value, { maximumFractionDigits: digits });

/** Semana, mes o «todo» según el largo del período aplicado: lo que entiende la lista de Servicios. */
function servicesPeriodParam(period: Period) {
  if (!period.from || !period.to) return "mes";
  const days = Math.round((Date.parse(`${period.to}T00:00:00Z`) - Date.parse(`${period.from}T00:00:00Z`)) / 86400000) + 1;
  return days <= 7 ? "semana" : days <= 31 ? "mes" : "todo";
}

function withTarget(text: string, target: number | null | undefined) {
  return typeof target === "number" ? `${text} · meta ${plainNumber(target)} %` : text;
}

export function buildAttentionSignals(states: Record<FamilyKey, SignalFamilyState>, period: Period): AttentionSignal[] {
  const coverage = states.coverage.data?.family === "coverage" ? states.coverage.data : undefined;
  const compliance = states.compliance.data?.family === "compliance" ? states.compliance.data : undefined;
  const incidents = states.incidents.data?.family === "incidents" ? states.incidents.data : undefined;
  const periodo = period.from && period.to ? `from=${period.from}&to=${period.to}` : `periodo=${servicesPeriodParam(period)}`;

  return [
    coverage
      ? {
        id: "not-serviced", family: "coverage", label: "Servicios sin realizar",
        value: coverage.totals.notServiced,
        previous: coverage.previous?.totals.notServiced ?? null,
        context: withTarget(`Cobertura ${plainNumber(coverage.totals.coveragePct, 1)} %`, coverage.targets?.coveragePct?.value),
        href: `/app?destination=services&status=PARTIALLY_COMPLETED&status=CANCELLED&status=SUSPENDED&${periodo}`,
        linkLabel: "Ver lista de servicios sin realizar",
      }
      : { id: "not-serviced", family: "coverage", label: "Servicios sin realizar" },
    compliance
      ? {
        id: "late", family: "compliance", label: "Servicios fuera de horario",
        value: compliance.finished.late,
        previous: compliance.previous?.totals.finished.late ?? null,
        context: withTarget(`A tiempo ${plainNumber(compliance.finished.onTimePct, 1)} %`, compliance.targets?.compliancePct?.value),
        href: `/app?destination=services&late=true&${periodo}`,
        linkLabel: "Ver lista de servicios fuera de horario",
      }
      : { id: "late", family: "compliance", label: "Servicios fuera de horario" },
    incidents
      ? (() => {
        const history = incidents.containers.history;
        const full = incidents.containers.byStatus.find((item) => item.status === "OVERFLOWED")?.count ?? 0;
        return {
          id: "overflow", family: "incidents", label: "Contenedores desbordados",
          value: history?.overflowIncidents ?? full,
          previous: history ? incidents.previous?.totals.containers?.overflowIncidents ?? null : null,
          context: `Desbordes del período · hoy ${full === 1 ? "hay 1 lleno" : `hay ${plainNumber(full)} llenos`}`,
          href: "/app/catalog/containers?status=OVERFLOWED",
          linkLabel: "Ver lista de contenedores desbordados",
        } satisfies LoadedSignal;
      })()
      : { id: "overflow", family: "incidents", label: "Contenedores desbordados" },
  ];
}

function changeText(change: number) {
  return change === 0 ? "Igual que antes" : `${plainNumber(Math.abs(change))} ${change > 0 ? "más" : "menos"} que antes`;
}

function Trend({ change }: { change: number | null }) {
  if (change === null) return <span className="text-xs text-muted-foreground">Sin período anterior</span>;
  const Icon = change === 0 ? Equal : change > 0 ? ArrowUpRight : ArrowDownRight;
  const text = changeText(change);
  return (
    <span className="inline-flex items-center gap-1 text-xs" aria-hidden="true">
      <Icon className="size-4" />
      <span className={cn(change > 0 ? "font-medium text-destructive" : "text-muted-foreground")}>{text}</span>
    </span>
  );
}

/** Marca solo el último valor del minigráfico: es el número que muestra la tarjeta. */
function endDot(series: { value: number | null }[]) {
  const last = series.reduce((found, point, index) => (point.value === null ? found : index), -1);
  return ({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) =>
    index === last && cx !== undefined && cy !== undefined
      ? <circle key={index} cx={cx} cy={cy} r={3} fill="var(--color-value)" />
      : <g key={index} />;
}

function SignalCard({ signal, status, onRetry, onDetail, series, bucket }: { signal: AttentionSignal; status: LoadStatus; onRetry: () => void; onDetail: (trigger: HTMLElement) => void; series: { from: string; value: number | null }[]; bucket: "week" | "month" }) {
  const titleId = `signal-${signal.id}-title`;
  const descriptionId = `signal-${signal.id}-description`;
  if (signal.value === undefined) {
    return (
      <Card size="sm" className="h-full" role="group" aria-labelledby={titleId}>
        <CardHeader><CardTitle id={titleId}>{signal.label}</CardTitle></CardHeader>
        <CardContent>
          {status === "error" ? <Alert variant="danger"><AlertTitle>No se pudo cargar.</AlertTitle><Button type="button" variant="outline" size="sm" onClick={onRetry}>Reintentar {signal.label}</Button></Alert>
            : status === "empty" ? <CardDescription>Sin datos en el período.</CardDescription>
              : <Skeleton aria-hidden className="h-10 w-24" />}
        </CardContent>
      </Card>
    );
  }
  const hasSeries = series.some((point) => point.value !== null);
  const change = signal.previous === null ? null : signal.value - signal.previous;
  const worse = change !== null && change > 0;
  const comparison = change === null ? "Sin período anterior para comparar."
    : `${changeText(change).replace("que antes", "que el período anterior")}${change === 0 ? "" : worse ? ", empeora" : ", mejora"}.`;
  return (
    <Card size="sm" className="h-full gap-2" role="group" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <CardHeader>
        <CardTitle id={titleId}>{signal.label}</CardTitle>
        <CardAction className="flex gap-1">
          <Tooltip>
            <TooltipTrigger render={<Button render={<Link href={signal.href} aria-label={signal.linkLabel} />} nativeButton={false} role="link" variant="outline" size="icon" />}>
              <List aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>Ver lista</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<Button type="button" data-detail-trigger={`signal-${signal.id}`} variant="outline" size="icon" aria-label={`Ver detalle de ${signal.label}`} onClick={(event) => onDetail(event.currentTarget)} />}>
              <ChartLine aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>Ver detalle</TooltipContent>
          </Tooltip>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {status === "error" ? <Alert variant="danger"><AlertTitle>No se pudo actualizar. Los datos pueden estar desactualizados.</AlertTitle><Button type="button" variant="outline" size="sm" onClick={onRetry}>Reintentar {signal.label}</Button></Alert> : null}
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <p className="text-3xl leading-none font-semibold tabular-nums tracking-tight" aria-hidden="true">{plainNumber(signal.value)}</p>
            <Trend change={change} />
          </div>
          {hasSeries ? <div aria-hidden="true" className="w-28 shrink-0"><ChartContainer config={{ value: { label: signal.label, color: worse ? "var(--destructive)" : "var(--primary)" } }} className="h-10 w-full" style={{ aspectRatio: "auto" }}>
            <LineChart data={series} margin={{ top: 4, right: 6, bottom: 4, left: 4 }}><YAxis hide domain={["dataMin - 1", "dataMax + 1"]} /><Line dataKey="value" stroke="var(--color-value)" strokeWidth={2} dot={endDot(series)} isAnimationActive={false} connectNulls /></LineChart>
          </ChartContainer></div> : <p className="text-xs text-muted-foreground">Sin datos en el período.</p>}
        </div>
        <CardDescription aria-hidden="true" className="text-xs">{signal.context}</CardDescription>
        {hasSeries ? <div className="sr-only">
          <p>Evolución por {bucket === "month" ? "mes" : "semana"}</p>
          <Table><TableCaption>Valores de {signal.label} por {bucket === "month" ? "mes" : "semana"}</TableCaption><TableHeader><TableRow><TableHead>Desde</TableHead><TableHead>Cantidad</TableHead></TableRow></TableHeader><TableBody>{series.map((point) => <TableRow key={point.from}><TableCell>{formatArgentinaCalendarDate(point.from)}</TableCell><TableCell>{point.value === null ? "Sin datos" : plainNumber(point.value)}</TableCell></TableRow>)}</TableBody></Table>
        </div> : null}
        <span className="sr-only" id={descriptionId}>{`${plainNumber(signal.value)}. ${comparison} ${signal.context}.`}</span>
      </CardContent>
    </Card>
  );
}

export function AttentionSignals({ states, period, onRetry, onDetail }: { states: Record<FamilyKey, SignalFamilyState>; period: Period; onRetry: (family: FamilyKey) => void; onDetail: (family: FamilyKey, trigger: HTMLElement) => void }) {
  const signals = buildAttentionSignals(states, period);
  const bucket = coverageBucket(period);
  const seriesFor = (family: FamilyKey) => {
    const data = states[family].data;
    if (data?.family === "coverage") return (data.series ?? []).map((point) => ({ from: point.from, value: point.notServiced }));
    if (data?.family === "compliance") return (data.series ?? []).map((point) => ({ from: point.from, value: point.finished.late }));
    if (data?.family === "incidents") return (data.series ?? []).map((point) => ({ from: point.from, value: point.containers?.overflowIncidents ?? null }));
    return [];
  };
  const loading = signals.some((signal) => states[signal.family].status === "loading");
  return (
    <LoadingRegion label="Requiere atención" isLoading={loading}>
      <h2 className="mb-3 text-lg font-semibold">Requiere atención</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {signals.map((signal) => (
          <li key={signal.id}><SignalCard signal={signal} status={states[signal.family].status} series={seriesFor(signal.family)} bucket={bucket} onRetry={() => onRetry(signal.family)} onDetail={(trigger) => onDetail(signal.family, trigger)} /></li>
        ))}
      </ul>
    </LoadingRegion>
  );
}
