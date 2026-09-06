"use client";

import Link from "next/link";
import { ArrowRight, MapPin, Route as RouteIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { OperationalScenario } from "@/lib/scenarios";

export function CatalogLanding({ scenario }: { scenario: OperationalScenario }) {
  return (
    <section aria-labelledby="catalog-title" className="flex max-w-4xl flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Configuración</p>
        <h1 id="catalog-title" className="text-2xl font-semibold tracking-tight">
          Catálogo
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recursos que sostienen la planificación y la ejecución de servicios.
        </p>
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        <li className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 mb-4">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="font-semibold text-foreground">Zonas operativas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Áreas operativas municipales para asignación de cuadrillas y coberturas.
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/app/catalog/zones" />}
            className="mt-4 gap-1.5"
            size="sm"
          >
            Abrir catálogo <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </li>

        <li className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 mb-4">
            <RouteIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="font-semibold text-foreground">Recorridos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Trazados y secuencias de paradas para servicios de recolección y barrido.
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/app/catalog/routes" />}
            className="mt-4 gap-1.5"
            size="sm"
          >
            Abrir catálogo <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </li>
      </ul>

      {scenario.actor.kind !== "OFFICE" && (
        <p className="text-sm text-muted-foreground">
          Su sesión tiene acceso de consulta a los catálogos disponibles.
        </p>
      )}
    </section>
  );
}
