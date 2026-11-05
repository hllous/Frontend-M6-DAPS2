"use client";

import { memo, useCallback, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CartesianGrid, LabelList, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatArgentinaCalendarDate } from "@/lib/argentina-date";
import { defaultIndicatorTarget, hasNumericThreshold, type CoverageIndicator } from "@/lib/indicators";

import { formatIndicatorNumber } from "./number-format";
import { sectionTitleClass } from "./section-title";
import styles from "./coverage-trend.module.css";

type CoverageSeries = NonNullable<CoverageIndicator["series"]>;
type TrendPoint = {
  id: string;
  /** Rótulo completo: rango de fechas argentinas o mes. */
  label: string;
  tick: string;
  scheduled: number;
  served: number;
  upcoming: number | null;
  /** null = ningún objetivo programado en el período: se dibuja como hueco. */
  pct: number | null;
  /** Posición del marcador enfocable; los huecos van sobre el eje. */
  anchorY: number;
  valueLabel: string;
};
type DotProps = { cx?: number; cy?: number; index?: number };

const chartConfig = { pct: { label: "Cobertura", color: "var(--color-trend-line)" } } satisfies ChartConfig;
const monthLong = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" });
const monthShort = new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: "UTC" });
const HIT_SIZE = 28;

const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
export function toTrendPoints(series: CoverageSeries, bucket: "week" | "month"): TrendPoint[] {
  const monthly = bucket === "month";
  const lastValueIndex = series.findLastIndex((entry) => entry.scheduled !== 0);
  return series.map((entry, index) => {
    const pct = entry.scheduled === 0 ? null : entry.coveragePct;
    return {
      id: entry.from,
      label: monthly ? monthLong.format(asDate(entry.from)) : `${formatArgentinaCalendarDate(entry.from)} – ${formatArgentinaCalendarDate(entry.to)}`,
      tick: monthly ? monthShort.format(asDate(entry.from)).replace(".", "") : formatArgentinaCalendarDate(entry.from).slice(0, 5),
      scheduled: entry.scheduled,
      served: entry.served,
      upcoming: entry.upcoming ?? null,
      pct,
      anchorY: pct ?? 0,
      valueLabel: index === lastValueIndex && pct !== null ? `${formatIndicatorNumber(pct, { maximumFractionDigits: 1 })} %` : "",
    };
  });
}

function valueText(point: TrendPoint) {
  return point.pct === null ? "sin datos" : `${formatIndicatorNumber(point.pct, { maximumFractionDigits: 1 })} %`;
}

function extraText(point: TrendPoint) {
  const parts = [point.pct === null ? "sin objetivos programados" : `${formatIndicatorNumber(point.served)} de ${formatIndicatorNumber(point.scheduled)} objetivos atendidos`];
  if (point.upcoming === null) parts.push("programado a futuro: sin dato");
  else if (point.upcoming > 0) parts.push(`${formatIndicatorNumber(point.upcoming)} programados a futuro`);
  return parts.join(" · ");
}

function targetOf(data: CoverageIndicator) {
  const target = data.targets === undefined ? defaultIndicatorTarget("coverage") : data.targets?.coveragePct;
  if (!hasNumericThreshold(target)) return null;
  const comparator = target.direction === "min" ? "≥ " : "≤ ";
  return { value: target.value, label: `Meta de cobertura ${comparator}${formatIndicatorNumber(target.value, { maximumFractionDigits: 1 })} %` };
}

/** Piso del eje: deja un margen de 10 puntos bajo el menor valor o la meta, en múltiplos de 10. Sin valores, el eje arranca en 0. */
export function axisFloor(points: Pick<TrendPoint, "pct">[], target?: number) {
  const values = [...points.flatMap((point) => (point.pct === null ? [] : [point.pct])), ...(target === undefined ? [] : [target])];
  if (values.length === 0) return 0;
  return Math.max(0, Math.floor((Math.min(...values) - 10) / 10) * 10);
}

type TrendPlotProps = {
  points: TrendPoint[];
  target?: number;
  registerTrigger: (index: number, element: HTMLButtonElement | null) => void;
  onFocusPoint: (index: number) => void;
  onHoverPoint: (index: number) => void;
};

// Memoizado: enfocar o pasar el mouse no puede remontar los botones, o se perdería el foco.
const TrendPlot = memo(function TrendPlot({ points, target, registerTrigger, onFocusPoint }: TrendPlotProps) {
  const floor = axisFloor(points, target);
  const ticks = floor === 0 ? [0, 25, 50, 75, 100] : Array.from({ length: (100 - floor) / 10 + 1 }, (_, index) => floor + index * 10);
  return <ChartContainer config={chartConfig} className={styles.plot} style={{ aspectRatio: "auto" }} initialDimension={{ width: 720, height: 260 }}>
    <LineChart data={points} margin={{ top: 12, right: 32, bottom: 4, left: 0 }}>
      <CartesianGrid vertical={false} stroke="var(--color-border)" />
      <XAxis dataKey="tick" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }} />
      <YAxis domain={[floor, 100]} ticks={ticks} tickFormatter={(value: number) => `${value} %`} tickLine={false} axisLine={false} width={44} tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }} />
      {target === undefined ? null : <ReferenceLine y={target} stroke="var(--color-trend-target)" strokeWidth={2} strokeDasharray="6 4" ifOverflow="extendDomain" />}
      <Line dataKey="pct" type="linear" stroke="var(--color-trend-line)" strokeWidth={2} connectNulls={false} isAnimationActive={false} dot={{ r: 4, fill: "var(--color-trend-line)", stroke: "var(--color-surface)", strokeWidth: 2 }} activeDot={false}><LabelList dataKey="valueLabel" position="top" fill="var(--color-text-secondary)" /></Line>
      <Line dataKey="anchorY" stroke="none" legendType="none" isAnimationActive={false} activeDot={false} dot={({ cx = 0, cy = 0, index = 0 }: DotProps) => {
        const point = points[index];
        if (!point) return <g key={`dot-${index}`} />;
        return <g key={point.id}>
          {point.pct === null ? <circle cx={cx} cy={cy} r={5} className={styles.gapMarker} aria-hidden="true" /> : null}
          <foreignObject x={cx - HIT_SIZE / 2} y={cy - HIT_SIZE / 2} width={HIT_SIZE} height={HIT_SIZE}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              ref={(element) => registerTrigger(index, element)}
              className={styles.hit}
              tabIndex={index === 0 ? 0 : -1}
              aria-label={`${point.label}: ${valueText(point)}, ${extraText(point)}`}
              onFocus={() => onFocusPoint(index)}
              
            />
          </foreignObject>
        </g>;
      }} />
    </LineChart>
  </ChartContainer>;
});

export function CoverageTrend({ data, viewMode, overview = false, toggle }: { data: CoverageIndicator; viewMode: "bars" | "table"; overview?: boolean; toggle?: ReactNode }) {
  const bucket = data.seriesBucket ?? "week";
  const points = useMemo(() => (data.series?.length ? toTrendPoints(data.series, bucket) : []), [bucket, data.series]);
  const target = targetOf(data);
  const [hovered, setHovered] = useState<number>();
  const [focused, setFocused] = useState<number>();
  const triggers = useRef<Array<HTMLButtonElement | null>>([]);
  const active = hovered ?? focused;
  const activePoint = active === undefined ? undefined : points[active];

  const registerTrigger = useCallback((index: number, element: HTMLButtonElement | null) => { triggers.current[index] = element; }, []);
  const focusPoint = useCallback((index: number) => {
    setFocused(index);
    setHovered(undefined);
    // Foco itinerante: sólo el último punto enfocado entra en el orden de tabulación.
    triggers.current.forEach((trigger, position) => trigger?.setAttribute("tabindex", position === index ? "0" : "-1"));
  }, []);

  const move = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const current = triggers.current.findIndex((trigger) => trigger === document.activeElement);
    if (current < 0) return;
    const next = event.key === "ArrowRight" || event.key === "ArrowDown" ? Math.min(current + 1, points.length - 1)
      : event.key === "ArrowLeft" || event.key === "ArrowUp" ? Math.max(current - 1, 0)
        : event.key === "Home" ? 0 : event.key === "End" ? points.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    triggers.current[next]?.focus();
  }, [points.length]);

  // Sin `series` no hay sección; con un rechazo del backend, la sección explica por qué.
  if (!overview && !data.seriesError && points.length === 0) return null;

  const title = overview ? `Cobertura por ${bucket === "month" ? "mes" : "semana"}` : "Tendencia";
  const section = <section className={overview ? `${styles.trend} ${styles.inCard}` : styles.trend} role="region" aria-label={title}>
    <div className={styles.header}><h2 className={sectionTitleClass}>{title}</h2>{toggle}</div>
    {data.seriesError ? <Alert variant="danger" role="alert"><AlertDescription>{data.seriesError}</AlertDescription></Alert>
      : points.length === 0 ? <p>Sin datos en el período.</p>
      : viewMode === "table" ? <TrendTable points={points} />
        : <>
          <ul className={styles.legend} aria-label="Referencias del gráfico">
            <li><span className={styles.lineSwatch} aria-hidden />Cobertura</li>
            {target ? <li><span className={styles.targetSwatch} aria-hidden />{target.label}</li> : null}
            <li><span className={styles.gapSwatch} aria-hidden />Sin datos</li>
          </ul>
          <div role="group" aria-label="Cobertura por período" className={styles.chart} onKeyDown={move} onMouseLeave={() => setHovered(undefined)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(undefined); }}>
            <TrendPlot points={points} target={target?.value} registerTrigger={registerTrigger} onFocusPoint={focusPoint} onHoverPoint={setHovered} />
          </div>
          {/* Región de estado siempre montada: anuncia el valor al enfocar y hace de tooltip sin mouse. */}
          <Alert role="status" variant="info" className="sr-only">
            {activePoint ? <AlertDescription><strong>{activePoint.label}</strong><span>{capitalize(valueText(activePoint))} · {extraText(activePoint)}</span></AlertDescription> : null}
          </Alert>
        </>}
  </section>;
  return overview ? <Card className="h-full min-w-0"><CardContent>{section}</CardContent></Card> : section;
}

function TrendTable({ points }: { points: TrendPoint[] }) {
  return <div className={styles.tableWrap}><Table>
    <TableCaption className="sr-only">Cobertura por período</TableCaption>
    <TableHeader><TableRow>
      <TableHead>Período</TableHead>
      <TableHead className="text-right">Programados</TableHead>
      <TableHead className="text-right">Atendidos</TableHead>
      <TableHead className="text-right">Programado a futuro</TableHead>
      <TableHead className="text-right">Cobertura</TableHead>
    </TableRow></TableHeader>
    <TableBody>{points.map((point) => <TableRow key={point.id}>
      <TableHead scope="row" className="font-medium whitespace-normal">{point.label}</TableHead>
      <TableCell className="text-right tabular-nums">{formatIndicatorNumber(point.scheduled)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatIndicatorNumber(point.served)}</TableCell>
      <TableCell className="text-right tabular-nums">{point.upcoming === null ? "Sin dato" : formatIndicatorNumber(point.upcoming)}</TableCell>
      <TableCell className="text-right tabular-nums">{point.pct === null ? "Sin datos" : `${formatIndicatorNumber(point.pct, { maximumFractionDigits: 1 })} %`}</TableCell>
    </TableRow>)}</TableBody>
  </Table></div>;
}
