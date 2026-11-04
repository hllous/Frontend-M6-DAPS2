"use client";
// PROTOTIPO DESCARTABLE (#849). Variante A: lista de señales ordenada por urgencia.
// Inspiración: bandeja "requiere atención" de Stripe + orden por prioridad de Sentry + paneles simples de Linear.
import Link from "next/link";
import { ArrowRightIcon, TableIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ZONE_DETAIL, type Signal } from "./prototype-data";
import { CoverageChart, LateChart, Trend } from "./shared";

export function VariantA({ signals }: { signals: Signal[] }) {
  const attention = signals.filter((signal) => signal.direction === "worse").length;
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="proto-a-signals" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="proto-a-signals" className="text-lg font-semibold">Requiere atención</h2>
          <span className="text-sm text-muted-foreground">{attention} de {signals.length} empeoran</span>
        </div>
        <ol className="flex flex-col divide-y rounded-xl border bg-card">
          {signals.map((signal) => (
            <li key={signal.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 p-4 sm:grid-cols-[5.5rem_1fr_auto] sm:gap-x-6">
              <p className={cn("text-4xl font-semibold tabular-nums tracking-tight max-sm:col-start-1 max-sm:row-start-2", signal.direction === "worse" && "text-destructive")}>{signal.value}</p>
              <div className="flex min-w-0 flex-col gap-0.5 max-sm:col-span-2 max-sm:row-start-1">
                <h3 className="font-medium">{signal.label}</h3>
                <p className="text-sm text-muted-foreground">{signal.meaning}</p>
                {signal.goal ? <p className="text-sm text-muted-foreground">{signal.goal}</p> : null}
              </div>
              <div className="flex flex-col items-end gap-2 max-sm:col-start-2 max-sm:row-start-2">
                <Trend signal={signal} />
                <Link href={signal.href} className={buttonVariants({ variant: signal.direction === "worse" ? "default" : "outline", size: "sm" })} aria-label={signal.linkLabel}>
                  Ver lista<ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="proto-a-trends" className="flex flex-col gap-3">
        <h2 id="proto-a-trends" className="text-lg font-semibold">Cómo viene el período</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card size="sm">
            <CardHeader><CardTitle>Cobertura por semana</CardTitle><CardDescription>Porcentaje de servicios hechos. Sube, pero sigue lejos de la meta.</CardDescription></CardHeader>
            <CardContent><CoverageChart /></CardContent>
          </Card>
          <Card size="sm">
            <CardHeader><CardTitle>Servicios fuera de horario</CardTitle><CardDescription>Por semana. Crece desde hace ocho semanas.</CardDescription></CardHeader>
            <CardContent><LateChart /></CardContent>
          </Card>
        </div>
      </section>

      <Sheet>
        <SheetTrigger render={<Button variant="outline" className="self-start" />}>
          <TableIcon data-icon="inline-start" aria-hidden="true" />Ver detalle por zona
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>Detalle por zona</SheetTitle><SheetDescription>Los mismos números como tabla, para leerlos con precisión.</SheetDescription></SheetHeader>
          <div className="px-4">
            <Table>
              <TableHeader><TableRow><TableHead>Zona</TableHead><TableHead className="text-right">Cobertura</TableHead><TableHead className="text-right">Sin realizar</TableHead><TableHead className="text-right">Desbordados</TableHead></TableRow></TableHeader>
              <TableBody>
                {ZONE_DETAIL.map((zone) => (
                  <TableRow key={zone.name}><TableCell>{zone.name}</TableCell><TableCell className="text-right tabular-nums">{zone.coverage} %</TableCell><TableCell className="text-right tabular-nums">{zone.notServiced}</TableCell><TableCell className="text-right tabular-nums">{zone.overflowed}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
