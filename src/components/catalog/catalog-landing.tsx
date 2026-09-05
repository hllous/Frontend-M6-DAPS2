"use client";

import Link from "next/link";

import { ArrowRight, Boxes, MapPin, Truck, UsersRound } from "lucide-react";

import type { OperationalScenario } from "@/lib/scenarios";
import { Button } from "@/components/ui/button";

export function CatalogLanding({ scenario }: { scenario: OperationalScenario }) {
  return (
    <section aria-labelledby="catalog-title" className="flex max-w-4xl flex-col gap-6">
      <div><p className="text-sm font-medium text-muted-foreground">Configuración</p><h1 id="catalog-title" className="text-2xl font-semibold tracking-tight">Catálogo</h1><p className="mt-1 text-sm text-muted-foreground">Recursos que sostienen la planificación y la ejecución de servicios.</p></div>
      <ul className="grid gap-3 md:grid-cols-2">
        <li className="rounded-xl border border-border bg-card p-5 shadow-sm"><Boxes className="mb-4" aria-hidden="true" /><h2 className="font-semibold">Tipos de servicio</h2><p className="mt-1 text-sm text-muted-foreground">Categorías, modo de ejecución y necesidad de vehículo.</p><Button nativeButton={false} render={<Link href="/app/catalog/service-types" />} className="mt-4">Abrir catálogo <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button></li>
        <li className="rounded-xl border border-border bg-card p-5 shadow-sm"><MapPin className="mb-4" aria-hidden="true" /><h2 className="font-semibold">Sitios de disposición</h2><p className="mt-1 text-sm text-muted-foreground">Destinos de los residuos registrados en los servicios.</p><Button nativeButton={false} render={<Link href="/app/catalog/disposal-sites" />} className="mt-4">Abrir catálogo <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button></li>
        <li className="rounded-xl border border-border bg-card p-5 shadow-sm"><Truck className="mb-4" aria-hidden="true" /><h2 className="font-semibold">Vehículos</h2><p className="mt-1 text-sm text-muted-foreground">Recursos móviles disponibles para asignar a los servicios.</p><Button render={<Link href="/app/catalog/vehicles" />} className="mt-4">Abrir catálogo <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button></li>
        <li className="rounded-xl border border-border bg-card p-5 shadow-sm"><UsersRound className="mb-4" aria-hidden="true" /><h2 className="font-semibold">Cuadrillas</h2><p className="mt-1 text-sm text-muted-foreground">Equipos operativos y sus turnos de trabajo.</p><Button render={<Link href="/app/catalog/crews" />} className="mt-4">Abrir catálogo <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button></li>
      </ul>
      {scenario.actor.kind !== "OFFICE" ? <p className="text-sm text-muted-foreground">Tu sesión tiene acceso de consulta a los catálogos disponibles.</p> : null}
    </section>
  );
}
