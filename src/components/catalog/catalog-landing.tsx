"use client";

import Link from "next/link";
import { ArrowRight, Boxes, CalendarClock, MapPin, Recycle, Route as RouteIcon, Trash2, Truck, Trees, UsersRound } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { OperationalScenario } from "@/lib/scenarios";

const configurationCards = [
  {
    href: "/app/catalog/service-types",
    title: "Tipos de servicio",
    icon: Boxes,
    tone: "bg-[var(--color-info-fill)] text-[var(--color-info)]",
  },
  {
    href: "/app/catalog/disposal-sites",
    title: "Sitios de disposición",
    icon: MapPin,
    tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  },
  {
    href: "/app/catalog/zones",
    title: "Zonas operativas",
    icon: MapPin,
    tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
  {
    href: "/app/catalog/routes",
    title: "Recorridos",
    icon: RouteIcon,
    tone: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  },
  {
    href: "/app/catalog/service-frequencies",
    title: "Frecuencias de servicio",
    icon: CalendarClock,
    tone: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400",
  },
  {
    href: "/app/catalog/vehicles",
    title: "Vehículos",
    icon: Truck,
    tone: "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
  },
  {
    href: "/app/catalog/crews",
    title: "Cuadrillas",
    icon: UsersRound,
    tone: "bg-pink-50 text-pink-700 dark:bg-pink-950/50 dark:text-pink-400",
  },
];

const inventoryCards = [
  {
    href: "/app/catalog/green-spaces",
    title: "Espacios verdes",
    icon: Trees,
    tone: "bg-lime-50 text-lime-700 dark:bg-lime-950/50 dark:text-lime-400",
  },
  {
    href: "/app/catalog/containers",
    title: "Contenedores",
    icon: Trash2,
    tone: "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400",
  },
  {
    href: "/app/catalog/green-points",
    title: "Puntos verdes",
    icon: Recycle,
    tone: "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400",
  },
  {
    href: "/app/catalog/trees",
    title: "Árboles",
    icon: Trees,
    tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
];

type Card = (typeof configurationCards)[number];

function LandingGrid({ id, title, cards, scenario }: { id: string; title: string; cards: Card[]; scenario: OperationalScenario }) {
  return (
    <section aria-labelledby={id} className="flex w-full flex-col gap-6">
      <div>
        <h1 id={id} className="text-[28px] leading-[34px] max-[760px]:text-[26px] max-[760px]:leading-[32px] font-bold tracking-tight">
          {title}
        </h1>
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        {cards.map(({ href, title: cardTitle, icon: Icon, tone }) => (
          <li key={href} className="rounded-xl border border-border bg-card p-5">
            <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="font-semibold text-foreground">{cardTitle}</p>
            <Link
              href={href}
              className={buttonVariants({ size: "sm", className: "mt-4 gap-1.5" })}
            >
              Abrir <span className="sr-only">{cardTitle}</span> <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>

      {scenario.actor.kind !== "OFFICE" && (
        <p className="text-sm text-muted-foreground">
          Solo consulta
        </p>
      )}
    </section>
  );
}

/** Catálogo de datos maestros y bienes urbanos. */
export function CatalogLanding({ scenario }: { scenario: OperationalScenario }) {
  return <LandingGrid id="catalog-title" title="Catálogo" cards={[...configurationCards, ...inventoryCards]} scenario={scenario} />;
}
