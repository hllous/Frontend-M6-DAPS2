"use client";

import {
  BarChart3,
  BriefcaseBusiness,
  ChevronLeft,
  CircleHelp,
  ClipboardList,
  Leaf,
  Map,
  PackageSearch,
  Play,
  Settings2,
  Sprout,
} from "lucide-react";
import { useState, type ComponentType } from "react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Capability, OperationalScenario } from "@/lib/scenarios";

import styles from "./app-shell.module.css";

type Destination = "work" | "services" | "inventory" | "environment" | "map" | "catalog" | "dashboards";

type NavigationItem = {
  id: Destination;
  label: string;
  capability?: Capability;
  icon: ComponentType<{ "aria-hidden"?: boolean }>;
};

const navigation: NavigationItem[] = [
  { id: "work", label: "Mi trabajo", icon: ClipboardList },
  { id: "services", label: "Servicios", capability: "service:view", icon: BriefcaseBusiness },
  { id: "inventory", label: "Inventario", capability: "inventory:view", icon: PackageSearch },
  { id: "environment", label: "Control Ambiental", capability: "environmentalReport:view", icon: Leaf },
  { id: "map", label: "Mapa", capability: "map:view", icon: Map },
  { id: "catalog", label: "Catálogo", capability: "catalog:view", icon: Settings2 },
  { id: "dashboards", label: "Tableros", capability: "indicator:view", icon: BarChart3 },
];

const mobileDestinations: Destination[] = ["work", "services", "map"];

function isAllowed(item: NavigationItem, scenario: OperationalScenario) {
  return !item.capability || scenario.capabilities.includes(item.capability);
}

function actorLabel(scenario: OperationalScenario) {
  if (scenario.actor.kind === "OFFICE") return "Oficina";
  return scenario.actor.fieldRole === "CREW_LEADER"
    ? "Responsable de cuadrilla"
    : "Integrante de cuadrilla";
}

export function AppShell({ scenario }: { scenario: OperationalScenario }) {
  const [destination, setDestination] = useState<Destination>("work");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const availableItems = navigation.filter((item) => isAllowed(item, scenario));

  const selectDestination = (next: Destination) => {
    setDestination(next);
  };

  return (
    <div className={`${styles.shell} ${isCollapsed ? styles.collapsed : ""}`}>
      <a className={styles.skipLink} href="#contenido-principal">
        Saltar al contenido principal
      </a>
      <aside className={styles.sidebar} aria-label="Navegación principal">
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true"><Sprout /></span>
          <span className={styles.brandText}>Ambiente<br />y Servicios</span>
        </div>
        <nav className={styles.moduleNav} aria-label="Módulos">
          {availableItems.map((item) => (
            <NavigationButton
              key={item.id}
              item={item}
              selected={destination === item.id}
              onSelect={selectDestination}
            />
          ))}
        </nav>
        <Button
          className={styles.collapseButton}
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed((collapsed) => !collapsed)}
          aria-label={isCollapsed ? "Expandir navegación" : "Contraer navegación"}
        >
          <ChevronLeft aria-hidden />
        </Button>
      </aside>

      <header className={styles.topbar}>
        <div>
          <p className={styles.contextLabel}>{actorLabel(scenario)}</p>
          <p className={styles.actorName}>{scenario.actor.name}</p>
        </div>
        <div className={styles.sessionState} aria-label="Estado de sesión">
          <span aria-hidden="true" />
          Sesión operativa
        </div>
      </header>

      <main className={styles.main} id="contenido-principal" tabIndex={-1}>
        {destination === "work" ? (
          <WorkPanel scenario={scenario} />
        ) : (
          <FoundationPlaceholder
            item={navigation.find((item) => item.id === destination)!}
            actor={actorLabel(scenario)}
          />
        )}
      </main>

      <nav className={styles.mobileNav} aria-label="Navegación móvil">
        {availableItems.filter((item) => mobileDestinations.includes(item.id)).map((item) => (
          <NavigationButton
            key={item.id}
            item={item}
            selected={destination === item.id}
            onSelect={selectDestination}
            compact
          />
        ))}
        <Sheet>
          <SheetTrigger
            render={
              <Button className={styles.mobileNavigationButton} variant="ghost" aria-label="Más módulos" />
            }
          >
            <CircleHelp aria-hidden />
            <span>Más</span>
          </SheetTrigger>
          <SheetContent side="bottom" className={styles.moreSheet}>
            <SheetHeader>
              <SheetTitle>Más módulos</SheetTitle>
              <SheetDescription>Seleccione un módulo disponible para su sesión.</SheetDescription>
            </SheetHeader>
            <div className={styles.sheetNavigation}>
              {availableItems.map((item) => (
                <Button
                  key={item.id}
                  variant={destination === item.id ? "default" : "outline"}
                  className={styles.sheetNavigationButton}
                  onClick={() => selectDestination(item.id)}
                >
                  <item.icon data-icon="inline-start" aria-hidden />
                  {item.label}
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
      <p className="sr-only" aria-live="polite">
        {navigation.find((item) => item.id === destination)?.label} seleccionado
      </p>
    </div>
  );
}

function NavigationButton({
  item,
  selected,
  onSelect,
  compact = false,
}: {
  item: NavigationItem;
  selected: boolean;
  onSelect: (destination: Destination) => void;
  compact?: boolean;
}) {
  const button = (
    <Button
      variant={selected ? "default" : "ghost"}
      className={compact ? styles.mobileNavigationButton : styles.navigationButton}
      onClick={() => onSelect(item.id)}
      aria-current={selected ? "page" : undefined}
    >
      <item.icon data-icon="inline-start" aria-hidden />
      <span>{item.label}</span>
    </Button>
  );

  return compact ? button : (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function WorkPanel({ scenario }: { scenario: OperationalScenario }) {
  const mayExecuteService = scenario.capabilities.includes("service:execute");

  return (
    <section aria-labelledby="work-title" className={styles.workPanel}>
      <div className={styles.pageHeading}>
        <p>{scenario.actor.kind === "OFFICE" ? "Priorice y coordine" : "Turno en curso"}</p>
        <h1 id="work-title">{scenario.work.title}</h1>
        <span>{scenario.work.summary}</span>
      </div>
      <ol className={styles.workList}>
        {scenario.work.items.map((item, index) => (
          <li key={item}>
            <div>
              <span className={styles.workIndex}>{String(index + 1).padStart(2, "0")}</span>
              <p>{item}</p>
            </div>
            {mayExecuteService && index === 0 ? (
              <Button onClick={() => undefined}>
                <Play data-icon="inline-start" aria-hidden />
                Iniciar servicio
              </Button>
            ) : (
              <span className={styles.workState}>
                {scenario.actor.kind === "OFFICE" ? "Requiere revisión" : "Solo consulta"}
              </span>
            )}
          </li>
        ))}
      </ol>
      {scenario.actor.kind === "FIELD" && !mayExecuteService ? (
        <p className={styles.permissionNote}>
          La persona responsable de la cuadrilla registra los cambios de estado del servicio.
        </p>
      ) : null}
    </section>
  );
}

function FoundationPlaceholder({ item, actor }: { item: NavigationItem; actor: string }) {
  const Icon = item.icon;

  return (
    <Empty className={styles.placeholder}>
      <EmptyHeader>
        <span className={styles.placeholderIcon} aria-hidden><Icon /></span>
        <EmptyTitle>{item.label}</EmptyTitle>
        <EmptyDescription>
          Este destino estará disponible como flujo operativo en una próxima entrega. Su navegación ya se adapta al alcance de {actor.toLowerCase()}.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
