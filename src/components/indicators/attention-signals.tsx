"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Equal } from "lucide-react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingRegion } from "@/components/ui/loading-region";
import { Skeleton } from "@/components/ui/skeleton";
import type { IndicatorData } from "@/lib/indicators";
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
  const periodo = servicesPeriodParam(period);

  return [
    coverage
      ? {
        id: "not-serviced", family: "coverage", label: "Servicios sin realizar",
        value: coverage.totals.notServiced,
        previous: coverage.previous?.totals.notServiced ?? null,
        context: withTarget(`Cobertura ${plainNumber(coverage.totals.coveragePct, 1)} %`, coverage.targets?.coveragePct?.value),
        href: `/app?destination=services&status=PARTIALLY_COMPLETED&status=CANCELLED&status=SUSPENDED&periodo=${periodo}`,
        linkLabel: "Ver lista de servicios sin realizar",
      }
      : { id: "not-serviced", family: "coverage", label: "Servicios sin realizar" },
    compliance
      ? {
        id: "late", family: "compliance", label: "Servicios fuera de horario",
        value: compliance.finished.late,
        previous: compliance.previous?.totals.finished.late ?? null,
        context: withTarget(`A tiempo ${plainNumber(compliance.finished.onTimePct, 1)} %`, compliance.targets?.compliancePct?.value),
        href: `/app?destination=services&late=true&periodo=${periodo}`,
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

function SignalCard({ signal, status, onRetry }: { signal: AttentionSignal; status: LoadStatus; onRetry: () => void }) {
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
  const change = signal.previous === null ? null : signal.value - signal.previous;
  const worse = change !== null && change > 0;
  const comparison = change === null ? "Sin período anterior para comparar."
    : `${changeText(change).replace("que antes", "que el período anterior")}${change === 0 ? "" : worse ? ", empeora" : ", mejora"}.`;
  return (
    <Card size="sm" className="h-full" role="group" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <CardHeader>
        <CardTitle id={titleId}>{signal.label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="text-4xl font-semibold tabular-nums tracking-tight" aria-hidden="true">{plainNumber(signal.value)}</p>
        <Trend change={change} />
        <CardDescription aria-hidden="true">{signal.context}</CardDescription>
        <span className="sr-only" id={descriptionId}>{`${plainNumber(signal.value)}. ${comparison} ${signal.context}.`}</span>
        <Button render={<Link href={signal.href} aria-label={signal.linkLabel} />} nativeButton={false} role="link" variant="outline" size="sm" className="mt-2 min-h-11 self-start sm:min-h-0">
          Ver lista<ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function AttentionSignals({ states, period, onRetry }: { states: Record<FamilyKey, SignalFamilyState>; period: Period; onRetry: (family: FamilyKey) => void }) {
  const signals = buildAttentionSignals(states, period);
  const loading = signals.some((signal) => states[signal.family].status === "loading");
  return (
    <LoadingRegion label="Requiere atención" isLoading={loading}>
      <h2 className="mb-3 text-lg font-semibold">Requiere atención</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {signals.map((signal) => (
          <li key={signal.id}><SignalCard signal={signal} status={states[signal.family].status} onRetry={() => onRetry(signal.family)} /></li>
        ))}
      </ul>
    </LoadingRegion>
  );
}
