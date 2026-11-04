"use client";
// PROTOTIPO DESCARTABLE (#849). Variante B: cuadrícula de señales + panel "dónde se concentra".
// Inspiración: tarjetas iguales del resumen de Vercel + volumen por zona de Calgary 311 y mapa 311 de Washington DC.
import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { Signal } from "./prototype-data";
import { CoverageChart, Sparkline, Trend } from "./shared";

const SHORT: Record<string, string> = {
  "not-serviced": "Sin realizar",
  late: "Fuera de horario",
  overflow: "Desbordados",
  "overdue-reports": "Denuncias",
  "risk-trees": "Árboles",
};

function Territory({ signal }: { signal: Signal }) {
  const [asTable, setAsTable] = useState(false);
  const data = [...signal.zones].sort((a, b) => b.value - a.value);
  const max = data[0]?.value ?? 0;
  const config = { value: { label: signal.label, color: "var(--chart-3)" } } satisfies ChartConfig;
  const total = data.reduce((sum, zone) => sum + zone.value, 0);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {total === 0 ? "No hay casos en ninguna zona." : <><strong className="font-medium text-foreground">{data[0].name}</strong> concentra {Math.round((max / total) * 100)} % de «{signal.label.toLowerCase()}».</>}
      </p>
      {asTable ? (
        <Table>
          <TableHeader><TableRow><TableHead>Zona</TableHead><TableHead className="text-right">{signal.label}</TableHead></TableRow></TableHeader>
          <TableBody>{data.map((zone) => <TableRow key={zone.name}><TableCell>{zone.name}</TableCell><TableCell className="text-right tabular-nums">{zone.value}</TableCell></TableRow>)}</TableBody>
        </Table>
      ) : (
        <ChartContainer config={config} className="h-48 w-full" role="img" aria-label={`${signal.label} por zona: ${data.map((zone) => `${zone.name} ${zone.value}`).join(", ")}.`}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
            <CartesianGrid horizontal={false} />
            <YAxis dataKey="name" type="category" width={64} tickLine={false} axisLine={false} />
            <XAxis type="number" hide allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="value" radius={4} barSize={22}>
              {data.map((zone) => <Cell key={zone.name} fill={zone.value === max && max > 0 && signal.direction === "worse" ? "var(--destructive)" : "var(--color-value)"} />)}
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
      <ToggleGroup variant="outline" size="sm" value={[asTable ? "table" : "chart"]} onValueChange={(values) => { if (values[0]) setAsTable(values[0] === "table"); }} aria-label="Cómo ver los datos" className="self-start">
        <ToggleGroupItem value="chart">Gráfico</ToggleGroupItem>
        <ToggleGroupItem value="table">Tabla</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export function VariantB({ signals }: { signals: Signal[] }) {
  const [selectedId, setSelectedId] = useState(signals[0]?.id);
  const selected = signals.find((signal) => signal.id === selectedId) ?? signals[0];
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="proto-b-signals" className="flex flex-col gap-3">
        <h2 id="proto-b-signals" className="text-lg font-semibold">Requiere atención</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {signals.map((signal, index) => (
            <li key={signal.id} className={index < 2 ? "xl:col-span-3" : "xl:col-span-2"}>
              <Card size="sm" className={cn("h-full", signal.direction === "worse" && "ring-1 ring-destructive/40")}>
                <CardHeader>
                  <CardTitle>{signal.label}</CardTitle>
                  <CardAction><Trend signal={signal} className="text-xs" /></CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  <p className={cn("text-4xl font-semibold tabular-nums tracking-tight", signal.direction === "worse" && "text-destructive")}>{signal.value}</p>
                  <Sparkline values={signal.weekly} worse={signal.direction === "worse"} />
                  <CardDescription>{signal.goal ?? signal.meaning}</CardDescription>
                  <Link href={signal.href} className={buttonVariants({ variant: "outline", size: "sm" }) + " mt-2 self-start"} aria-label={signal.linkLabel}>Ver lista<ArrowRightIcon data-icon="inline-end" aria-hidden="true" /></Link>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="proto-b-where" className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle id="proto-b-where">¿Dónde se concentra?</CardTitle>
            <CardDescription>Elegí un problema para ver las zonas más afectadas.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ToggleGroup variant="outline" size="sm" spacing={1} value={[selected.id]} onValueChange={(values) => { if (values[0]) setSelectedId(values[0]); }} aria-label="Problema" className="flex-wrap">
              {signals.map((signal) => <ToggleGroupItem key={signal.id} value={signal.id}>{SHORT[signal.id]}</ToggleGroupItem>)}
            </ToggleGroup>
            <Territory key={selected.id} signal={selected} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Cobertura por semana</CardTitle><CardDescription>Porcentaje de servicios hechos frente a la meta.</CardDescription></CardHeader>
          <CardContent><CoverageChart className="h-64" /></CardContent>
        </Card>
      </section>
    </div>
  );
}
