"use client";

import Link from "next/link";
import { ArrowRight, Boxes, CalendarClock, MapPin, Route as RouteIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { OperationalScenario } from "@/lib/scenarios";

const catalogCards = [
  {
    href: "/app/catalog/zones",
    title: "Zonas operativas",
    description: "Áreas operativas municipales para asignación de cuadrillas y coberturas.",
    icon: MapPin,
    tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
  {
    href: "/app/catalog/routes",
    title: "Recorridos",
    description: "Trazados y secuencias de paradas para servicios de recolección y barrido.",
    icon: RouteIcon,
    tone: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  },
  {
    href: "/app/catalog/service-types",
    title: "Tipos de servicio",
    description: "Categorías, modo de ejecución y necesidad de vehículo.",
    icon: Boxes,
    tone: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400",
  },
  {
    href: "/app/catalog/disposal-sites",
    title: "Sitios de disposición",
    description: "Destinos de los residuos registrados en los servicios.",
    icon: MapPin,
    tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  },
  {
    href: "/app/catalog/service-frequencies",
    title: "Frecuencias de servicio",
    description: "Reglas de recorrido por días, turnos y ventanas de vigencia.",
    icon: CalendarClock,
    tone: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400",
  },
];

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
        {catalogCards.map(({ href, title, description, icon: Icon, tone }) => (
          <li key={href} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            <Button
              nativeButton={false}
              render={<Link href={href} />}
              className="mt-4 gap-1.5"
              size="sm"
            >
              Abrir catálogo <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>

      {scenario.actor.kind !== "OFFICE" && (
        <p className="text-sm text-muted-foreground">
          Su sesión tiene acceso de consulta a los catálogos disponibles.
        </p>
      )}
    </section>
  );
}
