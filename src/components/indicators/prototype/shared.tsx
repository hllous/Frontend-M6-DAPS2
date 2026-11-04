"use client";
// PROTOTIPO DESCARTABLE (#849).
import { ArrowDownRightIcon, ArrowUpRightIcon, ChevronDownIcon, EqualIcon, SlidersHorizontalIcon } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { COVERAGE_GOAL, COVERAGE_TREND, LATE_TREND, PERIODS, WEEK_LABELS, type PeriodId, type Signal } from "./prototype-data";

/** Tendencia: icono + texto, nunca solo color. Solo lo que empeora se marca. */
export function Trend({ signal, className }: { signal: Signal; className?: string }) {
  const { direction, change } = signal;
  const Icon = direction === "same" ? EqualIcon : change > 0 ? ArrowUpRightIcon : ArrowDownRightIcon;
  const text = direction === "same" ? "Igual que antes" : `${Math.abs(change)} ${change > 0 ? "más" : "menos"} que antes`;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", direction === "worse" ? "font-medium text-destructive" : "text-muted-foreground", className)}>
      <Icon className="size-4" aria-hidden="true" />
      <span>{text}</span>
      <span className="sr-only">{direction === "worse" ? ", empeora" : direction === "better" ? ", mejora" : ""}</span>
    </span>
  );
}

export function PeriodPicker({ period, onChange }: { period: PeriodId; onChange: (period: PeriodId) => void }) {
  return (
    <ToggleGroup variant="outline" value={[period]} onValueChange={(values) => { if (values[0]) onChange(values[0] as PeriodId); }} aria-label="Período">
      {PERIODS.map((item) => (
        <ToggleGroupItem key={item.id} value={item.id} className="min-w-20 aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary">{item.label}</ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function MoreFilters() {
  return (
    <Collapsible className="w-full">
      <CollapsibleTrigger render={<Button variant="ghost" size="sm" className="group/filters" />}>
        <SlidersHorizontalIcon data-icon="inline-start" aria-hidden="true" />
        Más filtros
        <ChevronDownIcon data-icon="inline-end" aria-hidden="true" className="transition-transform group-aria-expanded/filters:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <FieldGroup className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="proto-zone">Zona operativa</FieldLabel>
            <NativeSelect id="proto-zone"><NativeSelectOption>Todas</NativeSelectOption><NativeSelectOption>Centro</NativeSelectOption><NativeSelectOption>Costera</NativeSelectOption><NativeSelectOption>Norte</NativeSelectOption><NativeSelectOption>Oeste</NativeSelectOption></NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="proto-service">Tipo de servicio</FieldLabel>
            <NativeSelect id="proto-service"><NativeSelectOption>Todos</NativeSelectOption><NativeSelectOption>Recolección domiciliaria</NativeSelectOption><NativeSelectOption>Barrido de calles</NativeSelectOption><NativeSelectOption>Espacios verdes</NativeSelectOption></NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="proto-range">Fechas exactas</FieldLabel>
            <NativeSelect id="proto-range"><NativeSelectOption>Según el período elegido</NativeSelectOption><NativeSelectOption>Elegir desde y hasta…</NativeSelectOption></NativeSelect>
          </Field>
        </FieldGroup>
      </CollapsibleContent>
    </Collapsible>
  );
}

const coverageConfig = { value: { label: "Cobertura (%)", color: "var(--chart-3)" } } satisfies ChartConfig;
const countConfig = { value: { label: "Servicios", color: "var(--chart-3)" } } satisfies ChartConfig;

export function CoverageChart({ className }: { className?: string }) {
  return (
    <ChartContainer config={coverageConfig} className={cn("h-44 w-full", className)} role="img" aria-label={`Cobertura por semana: de 78,4 % a 82,2 %. Meta ${COVERAGE_GOAL} %.`}>
      <LineChart data={COVERAGE_TREND} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="week" tickLine={false} axisLine={false} />
        <YAxis domain={[70, 100]} ticks={[70, 80, 90, 100]} width={32} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ReferenceLine y={COVERAGE_GOAL} strokeDasharray="4 4" label={{ value: `Meta ${COVERAGE_GOAL} %`, position: "insideBottomRight", fontSize: 11 }} />
        <Line dataKey="value" type="monotone" stroke="var(--color-value)" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ChartContainer>
  );
}

export function LateChart({ className }: { className?: string }) {
  return (
    <ChartContainer config={countConfig} className={cn("h-44 w-full", className)} role="img" aria-label="Servicios fuera de horario por semana, de 4 a 7.">
      <BarChart data={LATE_TREND} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="week" tickLine={false} axisLine={false} />
        <YAxis width={24} tickLine={false} axisLine={false} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function Sparkline({ values, worse }: { values: number[]; worse: boolean }) {
  const data = values.map((value, index) => ({ week: WEEK_LABELS[index], value }));
  const config = { value: { label: "Por semana", color: worse ? "var(--destructive)" : "var(--chart-3)" } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="h-10 w-full" aria-hidden="true">
      <AreaChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
        <Area dataKey="value" type="monotone" stroke="var(--color-value)" fill="var(--color-value)" fillOpacity={0.12} strokeWidth={1.5} isAnimationActive={false} />
      </AreaChart>
    </ChartContainer>
  );
}
