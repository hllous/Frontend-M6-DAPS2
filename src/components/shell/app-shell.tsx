"use client";

import {
  BarChart3,
  BriefcaseBusiness,
  ChevronLeft,
  CircleHelp,
  ClipboardList,
  Clock3,
  GitPullRequest,
  Leaf,
  Map,
  PackageSearch,
  Play,
  ShieldAlert,
  Settings2,
  Sprout,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createContext, useContext, useEffect, useState, type ComponentType, type ReactNode } from "react";

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
import { FieldWorkPanel } from "@/components/services/field-work-panel";
import { ServicesWorkspace } from "@/components/services/services-workspace";
import { ReferralsWorkspace } from "@/components/referrals/referrals-workspace";
import { CatalogLanding } from "@/components/catalog/catalog-landing";
import { ZonesPanel } from "./zones-panel";
import { IndicatorsDashboard } from "@/components/indicators/indicators-dashboard";
import { EnvironmentalReportsWorkspace } from "@/components/environmental-reports/environmental-reports-workspace";
import { treeInterventionsAdapter, type TreeIntervention } from "@/lib/tree-interventions";

const MapaOperativo = dynamic(
  () => import("@/components/map/mapa-operativo").then((module) => module.MapaOperativo),
  { ssr: false },
);

type Destination = "work" | "services" | "referrals" | "inventory" | "environment" | "map" | "catalog" | "dashboards";
type LogoutAction = (formData: FormData) => void | Promise<void>;

type ShellNavigationContextValue = {
  destination: Destination;
  selectDestination: (next: Destination) => void;
};

const ShellNavigationContext = createContext<ShellNavigationContextValue | null>(null);

export function useShellNavigation() {
  const context = useContext(ShellNavigationContext);
  if (!context) throw new Error("useShellNavigation must be used inside AppShell");
  return context;
}

type NavigationItem = {
  id: Destination;
  label: string;
  capability?: Capability;
  actorKinds?: OperationalScenario["actor"]["kind"][];
  icon: ComponentType<{ "aria-hidden"?: boolean }>;
};

const navigation: NavigationItem[] = [
  { id: "work", label: "Mi trabajo", icon: ClipboardList },
  { id: "services", label: "Servicios", capability: "service:view", icon: BriefcaseBusiness },
  { id: "referrals", label: "Derivaciones", actorKinds: ["OFFICE", "FIELD"], icon: GitPullRequest },
  { id: "inventory", label: "Inventario", capability: "inventory:view", icon: PackageSearch },
  { id: "environment", label: "Control Ambiental", capability: "environmentalReport:view", icon: Leaf },
  { id: "map", label: "Mapa", capability: "map:view", icon: Map },
  { id: "catalog", label: "Catálogo", capability: "catalog:view", icon: Settings2 },
  { id: "dashboards", label: "Tableros", capability: "indicator:view", icon: BarChart3 },
];

const mobileDestinations: Destination[] = ["work", "services", "map"];

function isAllowed(item: NavigationItem, scenario: OperationalScenario) {
  const capabilityAllowed = !item.capability || scenario.capabilities.includes(item.capability);
  const actorAllowed = !item.actorKinds || item.actorKinds.includes(scenario.actor.kind);
  return capabilityAllowed && actorAllowed;
}

function actorLabel(scenario: OperationalScenario) {
  if (scenario.actor.kind === "OFFICE") return "Oficina";
  return scenario.actor.fieldRole === "CREW_LEADER"
    ? "Responsable de cuadrilla"
    : "Integrante de cuadrilla";
}

export function AppShell({
  scenario,
  logoutAction,
  catalogContent,
  catalogNavigation,
  initialDestination = "work",
}: {
  scenario: OperationalScenario;
  logoutAction?: LogoutAction;
  catalogContent?: ReactNode;
  catalogNavigation?: ReactNode;
  initialDestination?: Destination;
}) {
  const [destination, setDestination] = useState<Destination>(() => {
    if (typeof window !== "undefined") {
      const urlDest = new URLSearchParams(window.location.search).get("destination") as Destination | null;
      if (urlDest && navigation.some((item) => item.id === urlDest)) {
        return urlDest;
      }
    }
    return initialDestination;
  });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const availableItems = navigation.filter((item) => isAllowed(item, scenario));

  const selectDestination = (next: Destination) => {
    setDestination(next);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("destination", next);
      window.history.replaceState(null, "", url.toString());
    }
  };

  return (
    <ShellNavigationContext.Provider value={{ destination, selectDestination }}>
      <div
        className={`${styles.shell} ${isCollapsed ? styles.collapsed : ""}`}
        data-sidebar-collapsed={isCollapsed ? "true" : "false"}
      >
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
            item.id === "catalog" && catalogNavigation ? (
              <div key={item.id} className={styles.catalogNavigationSlot}>
                {catalogNavigation}
              </div>
            ) : (
              <NavigationButton
                key={item.id}
                item={item}
                selected={destination === item.id}
                onSelect={selectDestination}
              />
            )
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
        <div className={styles.topbarActions}>
          <div className={styles.sessionState} aria-label="Estado de sesión">
            <span aria-hidden="true" />
            Sesión operativa
          </div>
          {logoutAction ? (
            <form action={logoutAction}>
              <Button type="submit" variant="outline">Cerrar sesión</Button>
            </form>
          ) : null}
        </div>
      </header>

      <main className={styles.main} id="contenido-principal" tabIndex={-1}>
        {destination === "work" ? (
          <WorkPanel scenario={scenario} />
        ) : destination === "services" ? (
          <ServicesWorkspace scenario={scenario} />
        ) : destination === "referrals" ? (
          <ReferralsWorkspace scenario={scenario} />
        ) : destination === "catalog" ? (
          catalogContent ?? (
            <div className="flex flex-col gap-8">
              <CatalogLanding scenario={scenario} />
              <ZonesPanel />
            </div>
          )
        ) : destination === "dashboards" ? (
          <IndicatorsDashboard scenario={scenario} />
        ) : destination === "environment" ? (
          <EnvironmentalReportsWorkspace scenario={scenario} />
        ) : destination === "map" ? (
          <MapaOperativo scenario={scenario} />
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
    </ShellNavigationContext.Provider>
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
  if (scenario.actor.kind === "FIELD") {
    return <FieldWorkPanel scenario={scenario} />;
  }

  return <OfficeWorkPanel scenario={scenario} />;
}

const treeInterventionLabels = {
  FORMATION_PRUNING: "Poda de formación",
  SAFETY_PRUNING: "Poda de seguridad",
  REMOVAL: "Extracción",
  PLANTING: "Plantación",
  TREATMENT: "Tratamiento",
} satisfies Record<TreeIntervention["interventionType"], string>;

type PendingTreeIntervention = TreeIntervention & { status: "REQUESTED" | "PENDING_AUTHORIZATION" };

const treeInterventionStatusLabels = {
  REQUESTED: "Solicitada",
  PENDING_AUTHORIZATION: "Pendiente de autorización",
} satisfies Record<Extract<TreeIntervention["status"], "REQUESTED" | "PENDING_AUTHORIZATION">, string>;

function OfficeWorkPanel({ scenario }: { scenario: OperationalScenario }) {
  const mayExecuteService = scenario.capabilities.includes("service:execute");
  const [queue, setQueue] = useState<
    | { status: "loading" }
    | { status: "ready"; interventions: PendingTreeIntervention[] }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let isCurrent = true;

    void treeInterventionsAdapter
      .list({ pageSize: 100 })
      .then((page) => {
        if (!isCurrent) return;
        setQueue({
          status: "ready",
          interventions: page.interventions.filter(
            (item): item is PendingTreeIntervention =>
              item.status === "REQUESTED" || item.status === "PENDING_AUTHORIZATION",
          ),
        });
      })
      .catch(() => {
        if (!isCurrent) return;
        setQueue({
          status: "error",
          message: "No se pudo cargar la cola de autorizaciones. Intente nuevamente más tarde.",
        });
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <section aria-labelledby="work-title" className={styles.workPanel}>
      <div className={styles.pageHeading}>
        <p>Priorice y coordine</p>
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
                Requiere revisión
              </span>
            )}
          </li>
        ))}
        {queue.status === "loading" ? (
          <li className={styles.workQueueMessage} aria-live="polite">
            <span>Cargando decisiones de arbolado…</span>
          </li>
        ) : null}
        {queue.status === "error" ? (
          <li className={styles.workQueueMessage} role="alert">
            <span>{queue.message}</span>
          </li>
        ) : null}
        {queue.status === "ready"
          ? queue.interventions.map((intervention, index) => (
              <TreeInterventionWorkItem
                key={intervention.id}
                intervention={intervention}
                index={scenario.work.items.length + index + 1}
              />
            ))
          : null}
      </ol>
    </section>
  );
}

function TreeInterventionWorkItem({
  intervention,
  index,
}: {
  intervention: PendingTreeIntervention;
  index: number;
}) {
  const StatusIcon = intervention.status === "REQUESTED" ? Clock3 : ShieldAlert;

  return (
    <li>
      <div>
        <span className={styles.workIndex}>{String(index).padStart(2, "0")}</span>
        <div className={styles.workInterventionCopy}>
          <p>
            <Link href="/app/catalog/tree-interventions">
              {treeInterventionLabels[intervention.interventionType]} · {intervention.address}
            </Link>
          </p>
          <span className={styles.workInterventionHint}>Intervención de arbolado</span>
        </div>
      </div>
      <span className={`${styles.workState} ${intervention.status === "PENDING_AUTHORIZATION" ? styles.workStatePending : ""}`}>
        <StatusIcon aria-hidden />
        {treeInterventionStatusLabels[intervention.status]}
      </span>
    </li>
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
