"use client";

import { Clock3, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { ListItemsSkeleton } from "@/components/ui/loading-skeletons";
import { LoadingRegion } from "@/components/ui/loading-region";
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
import { PrototypeSwitcher, useVariant, VariantA, VariantB, VariantC } from "./office-work-variants.prototype";

const MAX_ITEMS = 5;
const FETCH_SIZE = 100;
const UPCOMING_DAYS = 7;
const PENDING_REPORT_STATUSES: EnvironmentalReportStatus[] = ["RECEIVED", "UNDER_REVIEW"];

export type WorkItem = {
  id: string;
  href: string;
  title: string;
  detail: string;
  /** Día o instante ISO desde el que espera; ordena el grupo, el más antiguo primero. */
  waitingSince?: string;
  status?: PendingTreeStatus;
};

type WorkLoad = { items: WorkItem[]; total: number };

export type WorkGroupDefinition = {
  id: string;
  title: string;
  description?: string;
  errorMessage: string;
  seeAllHref: string;
  seeAllLabel: string;
  isVisibleTo: (capabilities: readonly Capability[]) => boolean;
  load: (capabilities: readonly Capability[], today: string) => Promise<WorkLoad>;
};

export type GroupState = { status: "loading" } | { status: "ready"; load: WorkLoad } | { status: "error" };

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
  const variant = useVariant();
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
      ) : (
        (() => {
          const views = visibleGroups.map((group) => ({ group, state: states[group.id] ?? ({ status: "loading" } as const) }));
          const Variant = { A: VariantA, B: VariantB, C: VariantC }[variant];
          return <Variant groups={views} onRetry={retryGroup} />;
        })()
      )}
      <PrototypeSwitcher current={variant} />
    </section>
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
  const headingId = `work-group-${group.id}`;

  if (state.status === "ready" && state.load.total === 0) return null;

  return (
    <LoadingRegion label={group.title} isLoading={state.status === "loading"} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={headingId} className="text-base font-semibold">{group.title}</h2>
        {state.status === "ready" ? <Badge variant="secondary">{state.load.total}</Badge> : null}
        {group.description ? <p className="text-sm text-muted-foreground">{group.description}</p> : null}
      </div>
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
          <ItemGroup aria-label={`${group.title}: ${state.load.total} ${state.load.total === 1 ? "pendiente" : "pendientes"}`}>
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
    </LoadingRegion>
  );
}

function WorkItemRow({ item }: { item: WorkItem }) {
  const StatusIcon = item.status === "REQUESTED" ? Clock3 : ShieldAlert;

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>
          <Link href={item.href} className="hover:underline focus-visible:underline">{item.title}</Link>
        </ItemTitle>
        <ItemDescription>{item.detail}</ItemDescription>
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
