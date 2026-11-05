"use client";

import { useState } from "react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { IndicatorPoint } from "@/lib/indicators";
import { buildAttentionSignals, type SignalFamilyState } from "./attention-signals";
import { BreakdownBarChart } from "./breakdown-bar-chart";
import { formatIndicatorNumber } from "./number-format";

type States = Record<"coverage" | "compliance" | "incidents" | "waste", SignalFamilyState>;
type Problem = { id: string; label: string; noun: string; empty: string; points: IndicatorPoint[] };

export function ZonePanel({ states, onRetry, ignoredFilters }: { states: States; onRetry: (family: "coverage" | "incidents") => void; ignoredFilters: boolean }) {
  const [choice, setChoice] = useState("coverage");
  const [view, setView] = useState("bars");
  const signals = buildAttentionSignals(states, {});
  const coverage = states.coverage.status === "ready" ? states.coverage.data : undefined;
  const incidents = states.incidents.status === "ready" ? states.incidents.data : undefined;
  const choices: Problem[] = [];
  if (coverage?.family === "coverage") {
    const signal = signals.find((item) => item.id === "not-serviced");
    const worse = signal?.value !== undefined && signal.previous !== null && signal.value > signal.previous;
    const zones = coverage.breakdowns.find((item) => item.id === "zones")?.points ?? [];
    const points = zones.map((point) => ({ id: point.id, label: point.label, value: point.details?.find((detail) => detail.label === "No atendidos")?.value ?? 0, unit: "objetivos" }));
    const max = Math.max(0, ...points.map((point) => point.value));
    choices.push({ id: "coverage", label: "Objetivos sin atención por zona", noun: "objetivos sin atención", empty: "No hay objetivos sin atención en ninguna zona.", points: points.map((point) => ({ ...point, tone: worse && max > 0 && point.value === max ? "danger" : undefined })) });
  }
  if (incidents?.family === "incidents") {
    const signal = signals.find((item) => item.id === "overflow");
    const worse = signal?.value !== undefined && signal.previous !== null && signal.value > signal.previous;
    const points = incidents.containers.byZone.map((zone) => ({ id: zone.zoneId, label: zone.name, value: zone.overflowed, unit: "contenedores" }));
    const max = Math.max(0, ...points.map((point) => point.value));
    choices.push({ id: "incidents", label: "Contenedores desbordados ahora, por zona", noun: "contenedores desbordados ahora", empty: "No hay contenedores desbordados en ninguna zona.", points: points.map((point) => ({ ...point, tone: worse && max > 0 && point.value === max ? "danger" : undefined })) });
  }
  const available = choices.filter((item) => item.points.length > 0);
  const active = available.find((item) => item.id === choice) ?? available[0];
  const sorted = [...(active?.points ?? [])].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "es-AR"));
  const total = sorted.reduce((sum, point) => sum + point.value, 0);
  const loading = states.coverage.status === "loading" || states.incidents.status === "loading";
  const num = (value: number) => formatIndicatorNumber(value);
  return <section role="region" aria-label="¿Dónde se concentra?" className="flex min-w-0 flex-col gap-3">
    <h2 className="text-lg font-semibold">¿Dónde se concentra?</h2>
    {(["coverage", "incidents"] as const).map((family) => states[family].status === "error" ? <Alert variant="danger" key={family}><AlertTitle>No se pudo cargar {family === "coverage" ? "los objetivos" : "los contenedores"} por zona.</AlertTitle><Button variant="outline" onClick={() => onRetry(family)}>Reintentar</Button></Alert> : null)}
    {available.length ? <>
      <ToggleGroup variant="outline" aria-label="Problema" value={[active!.id]} onValueChange={(values) => { if (values[0]) setChoice(values[0]); }} className="w-full flex-wrap">
        {available.map((item) => <ToggleGroupItem key={item.id} value={item.id} className="h-auto min-h-10 max-w-full whitespace-normal text-left [@media(max-width:760px)]:min-h-12">{item.label}</ToggleGroupItem>)}
      </ToggleGroup>
      <ToggleGroup variant="outline" aria-label="Vista de zonas" value={[view]} onValueChange={(values) => { if (values[0]) setView(values[0]); }}>
        <ToggleGroupItem value="bars" className="h-10 min-w-20 [@media(max-width:760px)]:h-12">Gráfico</ToggleGroupItem><ToggleGroupItem value="table" className="h-10 min-w-20 [@media(max-width:760px)]:h-12">Tabla</ToggleGroupItem>
      </ToggleGroup>
      {active!.id === "incidents" && ignoredFilters ? <p>Los filtros de zona y tipo de servicio no se aplican a los contenedores.</p> : null}
      {total === 0 ? <p>{active!.empty}</p> : <>
        <p>{sorted[0]!.label} tiene {num(sorted[0]!.value)} de los {num(total)} {active!.noun}.</p>
        {view === "table" ? <Table><TableCaption>{active!.label}</TableCaption><TableHeader><TableRow><TableHead>Zona</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader><TableBody>{sorted.map((point) => <TableRow key={point.id}><TableHead scope="row">{point.label}{point.tone === "danger" ? " · Prioritario" : ""}</TableHead><TableCell className="text-right">{num(point.value)}</TableCell></TableRow>)}</TableBody></Table> : <BreakdownBarChart key={active!.id} points={sorted} title={active!.label} onSelect={() => {}} formatValue={(point) => num(point.value)} formatDetail={(point) => `${num(point.value)} ${active!.noun}`} />}
      </>}
    </> : <p>{loading ? "Cargando datos por zona…" : "No hay datos por zona para el período."}</p>}
  </section>;
}
