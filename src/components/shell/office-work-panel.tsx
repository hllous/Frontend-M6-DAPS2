"use client";

import { CalendarClock, Clock3, Leaf, ShieldAlert, Trash2, Trees, UsersRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { ListItemsSkeleton } from "@/components/ui/loading-skeletons";
import { LoadingRegion } from "@/components/ui/loading-region";
import { cn } from "@/lib/utils";
import { argentinaDay, formatArgentinaCalendarDate, todayInArgentina } from "@/lib/argentina-date";
import { containersAdapter, CONTAINER_TYPE_LABELS } from "@/lib/containers";
import { reportLabel } from "@/lib/display-ids";
import {
  environmentalReportsAdapter,
  ENVIRONMENTAL_REPORT_TYPE_LABELS,
  type EnvironmentalReportStatus,
} from "@/lib/environmental-reports";
import type { Capability, OperationalScenario } from "@/lib/scenarios";
import { servicesAdapter } from "@/lib/services";
import { treeInterventionsAdapter, type TreeIntervention } from "@/lib/tree-interventions";

import styles from "./app-shell.module.css";

const MAX_ITEMS = 5;
const FETCH_SIZE = 100;
const UPCOMING_DAYS = 7;
const PENDING_REPORT_STATUSES: EnvironmentalReportStatus[] = ["RECEIVED", "UNDER_REVIEW"];

type WorkItem = {
  id: string;
  href: string;
  title: string;
  detail: string;
  /** Día o instante ISO desde el que espera; ordena el grupo, el más antiguo primero. */
  waitingSince?: string;
  status?: PendingTreeStatus;
};

type WorkLoad = { items: WorkItem[]; total: number };

/** Qué significa el color del grupo: info = espera una decisión, warning = la agenda está en riesgo, danger = problema en la calle. */
type WorkTone = "info" | "warning" | "danger";

type WorkGroupDefinition = {
  id: string;
  title: string;
  /** El mismo ícono que usa la app para ese dominio (Control Ambiental, cuadrillas, calendario, arbolado, contenedores). */
  icon: LucideIcon;
  tone: WorkTone;
  description?: string;
  errorMessage: string;
  seeAllHref: string;
  seeAllLabel: string;
  isVisibleTo: (capabilities: readonly Capability[]) => boolean;
  load: (capabilities: readonly Capability[], today: string) => Promise<WorkLoad>;
};

type GroupState = { status: "loading" } | { status: "ready"; load: WorkLoad } | { status: "error" };

type PendingTreeStatus = "REQUESTED" | "PENDING_AUTHORIZATION";

const treeInterventionLabels = {
  FORMATION_PRUNING: "Poda de formación",
  SAFETY_PRUNING: "Poda de seguridad",
  REMOVAL: "Extracción",
  PLANTING: "Plantación",
  TREATMENT: "Tratamiento",
} satisfies Record<TreeIntervention["interventionType"], string>;

const treeInterventionStatusLabels = {
  REQUESTED: "Solicitada",
  PENDING_AUTHORIZATION: "Pendiente de autorización",
} satisfies Record<PendingTreeStatus, string>;

function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** «hoy», «hace 1 día», «hace 12 días»; vacío si la fecha es futura. */
function waitingLabel(since: string, today: string) {
  const days = daysBetween(since, today);
  if (days < 0) return "";
  if (days === 0) return "hoy";
  return `hace ${days} ${days === 1 ? "día" : "días"}`;
}

function oldestFirst(items: WorkItem[]) {
  return [...items].sort((a, b) => {
    if (!a.waitingSince || !b.waitingSince) return Number(!a.waitingSince) - Number(!b.waitingSince);
    return a.waitingSince.localeCompare(b.waitingSince);
  });
}

function toLoad(items: WorkItem[], total: number): WorkLoad {
  return { items: oldestFirst(items).slice(0, MAX_ITEMS), total };
}

const workGroups: WorkGroupDefinition[] = [
  {
    id: "reports",
    icon: Leaf,
    tone: "info",
    title: "Expedientes por clasificar",
    errorMessage: "No se pudieron cargar los expedientes por clasificar.",
    seeAllHref: `/app?destination=environment&${PENDING_REPORT_STATUSES.map((status) => `status=${status}`).join("&")}`,
    seeAllLabel: "Ver todos los expedientes por clasificar",
    isVisibleTo: (capabilities) => capabilities.includes("environmentalReport:review"),
    async load(_capabilities, today) {
      const page = await environmentalReportsAdapter.list({ status: PENDING_REPORT_STATUSES, pageSize: FETCH_SIZE });
      return toLoad(
        page.environmentalReports.map((report) => {
          const since = argentinaDay(report.createdAt) ?? undefined;
          return {
            id: report.id,
            href: `/app?destination=environment&detail=${encodeURIComponent(report.id)}`,
            title: `${reportLabel(report)} · ${ENVIRONMENTAL_REPORT_TYPE_LABELS[report.reportType]}${report.address ? ` · ${report.address}` : ""}`,
            detail: since
              ? `Ingresó el ${formatArgentinaCalendarDate(since)} · ${waitingLabel(since, today)}`
              : "Sin fecha de ingreso",
            waitingSince: report.createdAt,
          };
        }),
        page.total,
      );
    },
  },
  {
    id: "services-without-crew",
    icon: UsersRound,
    tone: "warning",
    title: "Servicios sin cuadrilla",
    description: `Programados en los próximos ${UPCOMING_DAYS} días. El total cuenta solo los servicios cargados sin cuadrilla.`,
    errorMessage: "No se pudieron cargar los servicios sin cuadrilla.",
    seeAllHref: "/app?destination=services&status=SCHEDULED",
    seeAllLabel: "Ver todos los servicios sin cuadrilla",
    isVisibleTo: (capabilities) => capabilities.includes("service:assign"),
    async load(_capabilities, today) {
      const page = await servicesAdapter.list({
        status: "SCHEDULED",
        scheduledFrom: today,
        scheduledTo: addDays(today, UPCOMING_DAYS),
        pageSize: FETCH_SIZE,
      });
      // El backend no filtra por «sin cuadrilla»: se filtra la página y el total es el de lo filtrado.
      const withoutCrew = page.services.filter((service) => !service.crewId);
      return toLoad(
        withoutCrew.map((service) => ({
          id: service.id,
          href: `/app?destination=services&action=assign&serviceId=${encodeURIComponent(service.id)}`,
          title: service.title,
          detail: `Programado el ${formatArgentinaCalendarDate(service.scheduledDate)}`,
          waitingSince: service.scheduledDate,
        })),
        withoutCrew.length,
      );
    },
  },
  {
    id: "services-to-reschedule",
    icon: CalendarClock,
    tone: "warning",
    title: "Servicios por reprogramar",
    errorMessage: "No se pudieron cargar los servicios por reprogramar.",
    seeAllHref: "/app?destination=services&status=RESCHEDULED",
    seeAllLabel: "Ver todos los servicios por reprogramar",
    isVisibleTo: (capabilities) => capabilities.includes("service:reschedule"),
    async load(_capabilities, today) {
      const page = await servicesAdapter.list({ status: "RESCHEDULED", pageSize: FETCH_SIZE });
      return toLoad(
        page.services.map((service) => {
          const waiting = waitingLabel(service.scheduledDate, today);
          return {
            id: service.id,
            href: `/app?destination=services&detail=${encodeURIComponent(service.id)}`,
            title: service.title,
            detail: `Fecha original ${formatArgentinaCalendarDate(service.scheduledDate)}${waiting ? ` · ${waiting}` : ""}`,
            waitingSince: service.scheduledDate,
          };
        }),
        page.total,
      );
    },
  },
  {
    id: "tree-interventions",
    icon: Trees,
    tone: "info",
    title: "Intervenciones de arbolado",
    errorMessage: "No se pudieron cargar las intervenciones de arbolado.",
    seeAllHref: "/app/catalog/tree-interventions",
    seeAllLabel: "Ver todas las intervenciones de arbolado",
    isVisibleTo: (capabilities) =>
      capabilities.includes("treeIntervention:request") || capabilities.includes("treeIntervention:authorize"),
    async load(capabilities, today) {
      const statuses: PendingTreeStatus[] = [
        ...(capabilities.includes("treeIntervention:request") ? (["REQUESTED"] as const) : []),
        ...(capabilities.includes("treeIntervention:authorize") ? (["PENDING_AUTHORIZATION"] as const) : []),
      ];
      const pages = await Promise.all(
        statuses.map((status) => treeInterventionsAdapter.list({ status, pageSize: FETCH_SIZE })),
      );
      const items = pages.flatMap((page, index) =>
        page.interventions.map((intervention): WorkItem => {
          const since = intervention.createdAt ? argentinaDay(intervention.createdAt) ?? undefined : undefined;
          return {
            id: intervention.id,
            href: "/app/catalog/tree-interventions",
            title: `${treeInterventionLabels[intervention.interventionType]} · ${intervention.address ?? "sin dirección"}`,
            detail: since
              ? `Solicitada el ${formatArgentinaCalendarDate(since)} · ${waitingLabel(since, today)}`
              : "Intervención de arbolado",
            waitingSince: intervention.createdAt,
            status: statuses[index],
          };
        }),
      );
      return toLoad(items, pages.reduce((sum, page) => sum + page.total, 0));
    },
  },
  {
    id: "containers",
    icon: Trash2,
    tone: "danger",
    title: "Contenedores desbordados",
    errorMessage: "No se pudieron cargar los contenedores desbordados.",
    seeAllHref: "/app/catalog/containers",
    seeAllLabel: "Ver todos los contenedores desbordados",
    isVisibleTo: (capabilities) => capabilities.includes("container:manage"),
    async load() {
      const page = await containersAdapter.list({ status: "OVERFLOWED", pageSize: FETCH_SIZE });
      return toLoad(
        page.containers.map((container) => ({
          id: container.id,
          href: `/app/catalog/containers?detail=${encodeURIComponent(container.id)}`,
          title: `${container.code} · ${CONTAINER_TYPE_LABELS[container.containerType]}`,
          detail: container.address ?? "Sin dirección",
        })),
        page.total,
      );
    },
  },
];

export function OfficeWorkPanel({ scenario }: { scenario: OperationalScenario }) {
  const visibleGroups = workGroups.filter((group) => group.isVisibleTo(scenario.capabilities));
  const [states, setStates] = useState<Record<string, GroupState>>({});
  const isCurrent = useRef(true);

  const fetchGroup = useCallback(
    (group: WorkGroupDefinition) => {
      void group
        .load(scenario.capabilities, todayInArgentina())
        .then((load) => ({ status: "ready", load }) as const)
        .catch(() => ({ status: "error" }) as const)
        .then((next) => {
          if (isCurrent.current) setStates((current) => ({ ...current, [group.id]: next }));
        });
    },
    [scenario.capabilities],
  );

  const retryGroup = useCallback(
    (group: WorkGroupDefinition) => {
      setStates((current) => ({ ...current, [group.id]: { status: "loading" } }));
      fetchGroup(group);
    },
    [fetchGroup],
  );

  useEffect(() => {
    isCurrent.current = true;
    for (const group of workGroups) if (group.isVisibleTo(scenario.capabilities)) fetchGroup(group);
    return () => {
      isCurrent.current = false;
    };
  }, [fetchGroup, scenario.capabilities]);

  const allEmpty =
    visibleGroups.length > 0 &&
    visibleGroups.every((group) => {
      const state = states[group.id];
      return state?.status === "ready" && state.load.total === 0;
    });
  const stateOf = (group: WorkGroupDefinition): GroupState => states[group.id] ?? { status: "loading" };

  return (
    <section aria-labelledby="work-title" className={styles.workPanel}>
      <div className={styles.pageHeading}>
        <h1 id="work-title">{scenario.work.title}</h1>
      </div>
      {visibleGroups.length === 0 ? (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            Su perfil es de solo lectura: no tiene tareas para resolver acá.
            {scenario.capabilities.includes("indicator:view") ? (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                role="link"
                render={<Link href="/app?destination=dashboards" />}
              >
                Ir a Tableros
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      {allEmpty ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No tenés tareas pendientes</EmptyTitle>
            <EmptyDescription>Cuando haya algo que resolver, va a aparecer en esta pantalla.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : visibleGroups.length > 0 ? (
        <>
          <ul aria-label="Pendientes por grupo" className="grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-3 xl:grid-cols-5">
            {visibleGroups.map((group) => (
              <WorkTile key={group.id} group={group} state={stateOf(group)} />
            ))}
          </ul>
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {visibleGroups.map((group) => (
              <WorkGroup key={group.id} group={group} state={stateOf(group)} onRetry={retryGroup} />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

const toneClasses: Record<WorkTone, { chip: string; count: string }> = {
  info: { chip: "bg-[var(--color-info-fill)] text-[var(--color-info)]", count: "text-[var(--color-info)]" },
  warning: { chip: "bg-[var(--color-warning-fill)] text-[var(--color-warning)]", count: "text-[var(--color-warning)]" },
  danger: { chip: "bg-[var(--color-danger-fill)] text-[var(--color-danger)]", count: "text-[var(--color-danger)]" },
};

function pendingLabel(total: number) {
  return `${total} ${total === 1 ? "pendiente" : "pendientes"}`;
}

function focusGroup(event: MouseEvent<HTMLAnchorElement>, groupId: string) {
  const heading = document.getElementById(`work-group-${groupId}`);
  if (!heading) return;
  event.preventDefault();
  heading.focus();
}

function WorkTile({ group, state }: { group: WorkGroupDefinition; state: GroupState }) {
  const Icon = group.icon;
  const total = state.status === "ready" ? state.load.total : null;
  const hasItems = state.status !== "ready" || state.load.total > 0;
  const tone = state.status === "error" ? toneClasses.danger : toneClasses[group.tone];
  const body = (
    <>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-5",
          hasItems ? tone.chip : "bg-muted text-muted-foreground",
        )}
      >
        <Icon aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={cn("text-3xl leading-none font-semibold tabular-nums", hasItems ? tone.count : "text-muted-foreground")}>
          {total ?? "–"}
        </span>
        <span className="mt-1 text-sm text-muted-foreground">{group.title}</span>
      </span>
    </>
  );
  const shape = "flex w-full items-center gap-3 rounded-xl p-3 ring-1 ring-foreground/10";

  return (
    <li className="flex">
      {hasItems ? (
        <a
          href={`#work-group-${group.id}`}
          aria-label={total === null ? group.title : `${group.title}: ${pendingLabel(total)}`}
          onClick={(event) => focusGroup(event, group.id)}
          className={cn(shape, "bg-card hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:outline-ring")}
        >
          {body}
        </a>
      ) : (
        <div className={shape}>{body}</div>
      )}
    </li>
  );
}

function WorkGroup({
  group,
  state,
  onRetry,
}: {
  group: WorkGroupDefinition;
  state: GroupState;
  onRetry: (group: WorkGroupDefinition) => void;
}) {
  const Icon = group.icon;

  if (state.status === "ready" && state.load.total === 0) return null;

  return (
    <LoadingRegion label={group.title} isLoading={state.status === "loading"} className="min-w-0">
      <Card size="sm">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Icon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
            <h2 id={`work-group-${group.id}`} tabIndex={-1} className="scroll-mt-4 font-heading text-base font-semibold outline-none focus-visible:underline">
              {group.title}
            </h2>
            {state.status === "ready" ? <Badge variant="secondary">{state.load.total}</Badge> : null}
          </div>
          {group.description ? <p className="text-sm text-muted-foreground">{group.description}</p> : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {state.status === "loading" ? <ListItemsSkeleton itemCount={3} /> : null}
          {state.status === "error" ? (
            <Alert variant="danger">
              <AlertDescription className="flex flex-wrap items-center gap-3">
                {group.errorMessage} Intente nuevamente.
                <Button variant="outline" size="sm" onClick={() => onRetry(group)}>Reintentar</Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {state.status === "ready" ? (
            <>
              <ItemGroup aria-label={`${group.title}: ${pendingLabel(state.load.total)}`}>
                {state.load.items.map((item) => (
                  <WorkItemRow key={item.id} item={item} />
                ))}
              </ItemGroup>
              <Link
                href={group.seeAllHref}
                aria-label={group.seeAllLabel}
                className="self-start text-sm font-medium underline-offset-4 hover:underline focus-visible:underline"
              >
                Ver todos
              </Link>
            </>
          ) : null}
        </CardContent>
      </Card>
    </LoadingRegion>
  );
}

const STALE_AFTER_DAYS = 7;

function WorkItemRow({ item }: { item: WorkItem }) {
  const StatusIcon = item.status === "REQUESTED" ? Clock3 : ShieldAlert;
  const since = item.waitingSince ? argentinaDay(item.waitingSince) : null;
  const isStale = since !== null && daysBetween(since, todayInArgentina()) >= STALE_AFTER_DAYS;

  return (
    <Item variant="outline" size="sm">
      <ItemContent>
        <ItemTitle>
          <Link href={item.href} className="hover:underline focus-visible:underline">{item.title}</Link>
        </ItemTitle>
        <ItemDescription className={cn(isStale && "font-medium text-[var(--color-warning)]")}>{item.detail}</ItemDescription>
      </ItemContent>
      {item.status ? (
        <ItemActions className="max-sm:basis-full">
          <Badge variant={item.status === "PENDING_AUTHORIZATION" ? "warning" : "info"}>
            <StatusIcon data-icon="inline-start" aria-hidden />
            {treeInterventionStatusLabels[item.status]}
          </Badge>
        </ItemActions>
      ) : null}
    </Item>
  );
}
