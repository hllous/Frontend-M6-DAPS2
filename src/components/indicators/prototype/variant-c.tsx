"use client";
// PROTOTIPO DESCARTABLE (#849). Variante C: informe de hoy, en una sola columna.
// Inspiración: tableros de plazos 311 de Cambridge y Toronto (primero lo que vence, con la meta al lado) + tarjetas de Linear.
import Link from "next/link";
import { ArrowRightIcon, CheckCircle2Icon, ChevronDownIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { PERIODS, type PeriodId, type Signal } from "./prototype-data";
import { CoverageChart, LateChart, Trend } from "./shared";

function Briefing({ signal, defaultOpen }: { signal: Signal; defaultOpen?: boolean }) {
  const worst = [...signal.zones].sort((a, b) => b.value - a.value);
  return (
    <Collapsible defaultOpen={defaultOpen} className="rounded-xl border bg-card">
      <div className="flex items-start gap-3 p-4">
        <p className={cn("min-w-14 text-3xl font-semibold tabular-nums tracking-tight", signal.direction === "worse" && "text-destructive")}>{signal.value}</p>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="font-medium">{signal.label}</h3>
          <Trend signal={signal} />
        </div>
        <CollapsibleTrigger render={<Button variant="ghost" size="icon" className="group/brief shrink-0" aria-label={`Ver más sobre ${signal.label.toLowerCase()}`} />}>
          <ChevronDownIcon aria-hidden="true" className="transition-transform group-aria-expanded/brief:rotate-180" />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="flex flex-col gap-3 border-t p-4 text-sm">
          <p className="text-muted-foreground">{signal.meaning}{signal.goal ? ` ${signal.goal}.` : ""}</p>
          {worst[0]?.value > 0 ? <p>Más casos en <strong>{worst[0].name}</strong> ({worst[0].value})
            {worst[1]?.value > 0 ? <> y <strong>{worst[1].name}</strong> ({worst[1].value})</> : null}.</p> : null}
          <Link href={signal.href} className={buttonVariants({ variant: "default", size: "sm" }) + " self-start"} aria-label={signal.linkLabel}>Ver lista<ArrowRightIcon data-icon="inline-end" aria-hidden="true" /></Link>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function VariantC({ signals, period }: { signals: Signal[]; period: PeriodId }) {
  const todo = signals.filter((signal) => signal.direction === "worse");
  const fine = signals.filter((signal) => signal.direction !== "worse");
  const periodLong = PERIODS.find((item) => item.id === period)?.long ?? "";
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <section aria-labelledby="proto-c-head" className="flex flex-col gap-3">
        <h2 id="proto-c-head" className="text-2xl font-semibold tracking-tight text-balance">
          {todo.length === 0 ? "Todo en orden " + periodLong : `${todo.length} ${todo.length === 1 ? "cosa requiere" : "cosas requieren"} atención ${periodLong}`}
        </h2>
        <div className="flex flex-col gap-2">
          {todo.map((signal, index) => <Briefing key={signal.id} signal={signal} defaultOpen={index === 0} />)}
        </div>
      </section>

      {fine.length > 0 ? (
        <section aria-labelledby="proto-c-fine" className="flex flex-col gap-2">
          <Alert>
            <CheckCircle2Icon aria-hidden="true" />
            <AlertTitle id="proto-c-fine">Sin cambios preocupantes</AlertTitle>
            <AlertDescription>No empeoran respecto del período anterior.</AlertDescription>
          </Alert>
          {fine.map((signal) => <Briefing key={signal.id} signal={signal} />)}
        </section>
      ) : null}

      <section aria-labelledby="proto-c-trends" className="flex flex-col gap-3">
        <h2 id="proto-c-trends" className="text-lg font-semibold">Evolución</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card size="sm"><CardHeader><CardTitle>Cobertura por semana</CardTitle><CardDescription>Meta: 95 %</CardDescription></CardHeader><CardContent><CoverageChart className="h-36" /></CardContent></Card>
          <Card size="sm"><CardHeader><CardTitle>Fuera de horario por semana</CardTitle><CardDescription>Cantidad de servicios</CardDescription></CardHeader><CardContent><LateChart className="h-36" /></CardContent></Card>
        </div>
      </section>
    </div>
  );
}
