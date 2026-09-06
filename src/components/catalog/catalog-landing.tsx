"use client";

import Link from "next/link";
import { ArrowRight, Boxes, MapPin } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { OperationalScenario } from "@/lib/scenarios";

export function CatalogLanding({ scenario }: { scenario: OperationalScenario }) {
  return (
    <section aria-labelledby="catalog-title" className="flex max-w-4xl flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Configuración</p>
        <h1 id="catalog-title" className="text-2xl font-semibold tracking-tight">Catálogo</h1>
        <p className="mt-1 text-sm text-muted-foreground">Recursos que sostienen la planificación y la ejecución de servicios.</p>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        <li className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <Boxes className="mb-4" aria-hidden="true" />
          <h2 className="font-semibold">Tipos de servicio</h2>
          <p className="mt-1 text-sm text-muted-foreground">Categorías, modo de ejecución y necesidad de vehículo.</p>
          <Link href="/app/catalog/service-types" className={buttonVariants({ className: "mt-4" })}>Abrir catálogo <ArrowRight data-icon="inline-end" aria-hidden="true" /></Link>
        </li>
        <li className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <MapPin className="mb-4" aria-hidden="true" />
          <h2 className="font-semibold">Sitios de disposición</h2>
          <p className="mt-1 text-sm text-muted-foreground">Destinos de los residuos registrados en los servicios.</p>
          <Link href="/app/catalog/disposal-sites" className={buttonVariants({ className: "mt-4" })}>Abrir catálogo <ArrowRight data-icon="inline-end" aria-hidden="true" /></Link>
        </li>
      </ul>
      {scenario.actor.kind !== "OFFICE" ? <p className="text-sm text-muted-foreground">Tu sesión tiene acceso de consulta a los catálogos disponibles.</p> : null}
    </section>
  );
}
