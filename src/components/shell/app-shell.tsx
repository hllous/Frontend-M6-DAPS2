"use client";

import { OverlayMotionPreference } from "./overlay-motion";

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
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
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
import { cn } from "@/lib/utils";
import type { Capability, OperationalScenario } from "@/lib/scenarios";

import styles from "./app-shell.module.css";
import { LoadingRegion } from "@/components/ui/loading-region";
import { Skeleton } from "@/components/ui/skeleton";
import { ListItemsSkeleton } from "@/components/ui/loading-skeletons";
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

// Una sola URL por pantalla: cada destino vive en /app?destination=<id>. Las rutas
// /app/dashboard y /app/catalog quedan como alias que redirigen aca.
const destinationHref = (id: Destination) => `/app?destination=${id}`;

const mobileDestinations: Destination[] = ["work", "services", "map"];
const tabletNavigationQuery = "(min-width: 761px) and (max-width: 1023px)";

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

function useTabletNavigation() {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const media = window.matchMedia(tabletNavigationQuery);
    const update = () => setIsTablet(media.matches);
    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  return isTablet;
}

export function AppShell({
  scenario,
  logoutAction,
  routeContent,
  contentReady = true,
}: {
  scenario?: OperationalScenario;
  logoutAction?: LogoutAction;
  routeContent?: ReactNode;
  contentReady?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedDestination = searchParams.get("destination") as Destination | null;
  const destination = pathname.startsWith("/app/catalog")
    ? "catalog"
    : requestedDestination && navigation.some((item) => item.id === requestedDestination)
      ? requestedDestination
      : "work";
  const mainRef = useRef<HTMLElement>(null);
  const previousDestination = useRef(destination);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isTablet = useTabletNavigation();
  const navigationIsIconOnly = isCollapsed || isTablet;
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const availableItems = scenario ? navigation.filter((item) => isAllowed(item, scenario)) : [];

  useEffect(() => {
    if (previousDestination.current !== destination) mainRef.current?.focus();
    previousDestination.current = destination;
  }, [destination]);

  return (
    <div className={cn(
      styles.shell,
      isCollapsed && styles.collapsed,
      destination === "services" && styles.servicesShell,
    )}>
      <OverlayMotionPreference />
      <a className={styles.skipLink} href="#contenido-principal">
        Saltar al contenido principal
      </a>
      <aside className={styles.sidebar} aria-label="Navegación principal">
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true"><Sprout /></span>
          <span className={styles.brandText}>Ambiente<br />y Servicios</span>
        </div>
        <nav className={styles.moduleNav} aria-label="Módulos">
          <LoadingRegion label="Navegación" isLoading={!scenario} className="flex flex-col gap-1.5">
            {!scenario ? navigation.map((item) => (
              <Button key={item.id} variant="sidebar" className={styles.navigationButton} disabled aria-hidden="true">
                <Skeleton className="size-4 shrink-0" />
                {!navigationIsIconOnly ? <Skeleton className="h-5 w-28" /> : null}
              </Button>
            )) : null}
            {availableItems.map((item) => (
              <NavigationLink
                key={item.id}
                item={item}
                selected={destination === item.id}
                showTooltip={navigationIsIconOnly}
              />
            ))}
          </LoadingRegion>
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
        <LoadingRegion label="Actor" isLoading={!scenario}>
          {scenario ? (
            <>
              <p className={styles.contextLabel}>{actorLabel(scenario)}</p>
              <p className={styles.actorName}>{scenario.actor.name}</p>
            </>
          ) : (
            <div className="flex h-10 flex-col justify-center gap-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-36" />
            </div>
          )}
        </LoadingRegion>
        <div className={styles.topbarActions}>
          <Badge variant="status" className={styles.sessionState} aria-label="Estado de sesión">
            <span className="size-2.5 rounded-full bg-[var(--color-success)]" aria-hidden="true" />
            Sesión operativa
          </Badge>
          {logoutAction ? (
            <form action={logoutAction}>
              <Button type="submit" variant="outline">Cerrar sesión</Button>
            </form>
          ) : null}
        </div>
      </header>

      <main
        ref={mainRef}
        className={cn(styles.main, destination === "services" && styles.servicesMain)}
        id="contenido-principal"
        tabIndex={-1}
      >
        {!scenario || !contentReady ? (
          <LoadingRegion label="Contenido"><ListItemsSkeleton /></LoadingRegion>
        ) : pathname.startsWith("/app/") ? (
          routeContent
        ) : destination === "work" ? (
          <WorkPanel scenario={scenario} />
        ) : destination === "services" ? (
          <ServicesWorkspace scenario={scenario} />
        ) : destination === "referrals" ? (
          <ReferralsWorkspace scenario={scenario} />
        ) : destination === "catalog" ? (
          <div className="flex flex-col gap-8">
            <CatalogLanding scenario={scenario} />
            <ZonesPanel />
          </div>
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
        {!scenario ? (
          <LoadingRegion label="Navegación móvil" className="col-span-4 grid grid-cols-4 gap-1">
            {[...mobileDestinations, "more"].map((id) => (
              <Button key={id} variant="ghost" className={styles.mobileNavigationButton} disabled aria-hidden="true">
                <Skeleton className="size-4" />
                <Skeleton className="h-4 w-12" />
              </Button>
            ))}
          </LoadingRegion>
        ) : null}
        {availableItems.filter((item) => mobileDestinations.includes(item.id)).map((item) => (
          <NavigationLink
            key={item.id}
            item={item}
            selected={destination === item.id}
            compact
          />
        ))}
        {scenario ? <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
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
                  nativeButton={false}
                  role="link"
                  render={
                    <Link
                      href={destinationHref(item.id)}
                      aria-current={destination === item.id ? "page" : undefined}
                      onClick={() => setIsMoreOpen(false)}
                    />
                  }
                >
                  <item.icon data-icon="inline-start" aria-hidden />
                  {item.label}
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet> : null}
      </nav>
      <p className="sr-only" aria-live="polite">
        {navigation.find((item) => item.id === destination)?.label} seleccionado
      </p>
    </div>
  );
}

function NavigationLink({
  item,
  selected,
  compact = false,
  showTooltip = false,
}: {
  item: NavigationItem;
  selected: boolean;
  compact?: boolean;
  showTooltip?: boolean;
}) {
  const link = (
    <Button
      variant={compact ? (selected ? "default" : "ghost") : "sidebar"}
      className={compact ? styles.mobileNavigationButton : styles.navigationButton}
      nativeButton={false}
      role="link"
      render={<Link href={destinationHref(item.id)} aria-current={selected ? "page" : undefined} aria-label={item.label} />}
    >
      <item.icon data-icon="inline-start" aria-hidden />
      <span>{item.label}</span>
    </Button>
  );

  return compact || !showTooltip ? link : (
    <Tooltip>
      <TooltipTrigger render={link} />
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
      <ItemGroup>
        {scenario.work.items.map((item, index) => (
          <Item key={item} variant="outline">
            <ItemMedia className="w-6 text-xs text-muted-foreground tabular-nums">{String(index + 1).padStart(2, "0")}</ItemMedia>
            <ItemContent>
              <ItemTitle>{item}</ItemTitle>
            </ItemContent>
            <ItemActions className="max-sm:basis-full max-sm:pl-[calc(1.5rem+0.625rem)]">
              {mayExecuteService && index === 0 ? (
                <Button className="max-sm:w-full" onClick={() => undefined}>
                  <Play data-icon="inline-start" aria-hidden />
                  Iniciar servicio
                </Button>
              ) : (
                <Badge variant="info">Requiere revisión</Badge>
              )}
            </ItemActions>
          </Item>
        ))}
        {queue.status === "ready"
          ? queue.interventions.map((intervention, index) => (
              <TreeInterventionWorkItem
                key={intervention.id}
                intervention={intervention}
                index={scenario.work.items.length + index + 1}
              />
            ))
          : null}
      </ItemGroup>
      {queue.status === "loading" ? (
        <Item variant="muted" aria-live="polite">
          <ItemMedia><Spinner aria-hidden role="presentation" /></ItemMedia>
          <ItemContent>
            <ItemDescription>Cargando decisiones de arbolado…</ItemDescription>
          </ItemContent>
        </Item>
      ) : null}
      {queue.status === "error" ? (
        <Alert variant="danger">
          <AlertDescription>{queue.message}</AlertDescription>
        </Alert>
      ) : null}
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
    <Item variant="outline">
      <ItemMedia className="w-6 text-xs text-muted-foreground tabular-nums">{String(index).padStart(2, "0")}</ItemMedia>
      <ItemContent>
        <ItemTitle>
          <Link href="/app/catalog/tree-interventions" className="hover:underline focus-visible:underline">
            {treeInterventionLabels[intervention.interventionType]} · {intervention.address}
          </Link>
        </ItemTitle>
        <ItemDescription>Intervención de arbolado</ItemDescription>
      </ItemContent>
      <ItemActions className="max-sm:basis-full max-sm:pl-[calc(1.5rem+0.625rem)]">
        <Badge variant={intervention.status === "PENDING_AUTHORIZATION" ? "warning" : "info"}>
          <StatusIcon data-icon="inline-start" aria-hidden />
          {treeInterventionStatusLabels[intervention.status]}
        </Badge>
      </ItemActions>
    </Item>
  );
}

function FoundationPlaceholder({ item, actor }: { item: NavigationItem; actor: string }) {
  const Icon = item.icon;

  return (
    <Empty className="min-h-[420px] border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon"><Icon aria-hidden /></EmptyMedia>
        <EmptyTitle>{item.label}</EmptyTitle>
        <EmptyDescription>
          Este destino estará disponible como flujo operativo en una próxima entrega. Su navegación ya se adapta al alcance de {actor.toLowerCase()}.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
