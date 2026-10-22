"use client";
import { errorMessage as getErrorMessage } from "@/lib/error-message";

import {
  ArrowLeft,
  ArrowUpRight,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Clock3,
  Construction,
  ExternalLink,
  RefreshCw,
  Route,
  ShieldAlert,
  ShieldCheck,
  TimerOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { LoadingRegion } from "@/components/ui/loading-region";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemActions, ItemGroup } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { referralsAdapter, referralFromRepairRequest, referralFromStreetClosureRequest, type Referral } from "@/lib/referrals";
import { getReferralAnomalies, type ReferralAnomaly } from "@/lib/referral-anomalies";
import {
  RepairRequestRequestError,
  repairRequestsAdapter,
} from "@/lib/repair-requests";
import type { OperationalScenario } from "@/lib/scenarios";
import { servicesAdapter, type Service } from "@/lib/services";
import {
  StreetClosureRequestError,
  streetClosureRequestsAdapter,
} from "@/lib/street-closure-requests";

type SourceServiceState = {
  sources: Map<string, Service>;
  sourceErrors: Map<string, string>;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | ({ status: "ready"; referrals: Referral[]; invalid: number } & SourceServiceState);

const destinationLabel: Record<Referral["destination"], string> = {
  M3: "Obras Públicas",
  M7: "Tránsito",
};

const referralKindLabel: Record<Referral["kind"], string> = {
  REPAIR_REQUEST: "Obras Públicas · Reparación",
  STREET_CLOSURE_REQUEST: "Tránsito · Corte de calle",
};

function isInspectionSourcedRepair(referral: Referral): boolean {
  return referral.kind === "REPAIR_REQUEST" && referral.request.detectedInType === "INSPECTION";
}

function sourceKindLabel(referral: Referral): string {
  if (referral.kind === "STREET_CLOSURE_REQUEST" && referral.sourceType === "TREE_INTERVENTION") {
    return "Intervención";
  }
  if (isInspectionSourcedRepair(referral)) return "Inspección";
  return "Servicio";
}

function sourceLinkLabel(referral: Referral): string {
  if (referral.kind === "STREET_CLOSURE_REQUEST" && referral.sourceType === "TREE_INTERVENTION") {
    return "Ver intervención";
  }
  if (isInspectionSourcedRepair(referral)) return "Ver inspección";
  return "Ver servicio";
}

const repairStatusLabel: Record<"REQUESTED" | "IN_PROGRESS" | "CLOSED", string> = {
  REQUESTED: "Pendiente",
  IN_PROGRESS: "En curso",
  CLOSED: "Cerrada",
};

const closureStatusLabel = {
  REQUESTED: "Solicitada",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  ENDED: "Finalizada",
  EXPIRED: "Vencido",
} as const;

const repairDamageLabel: Record<string, string> = {
  BROKEN_PAVEMENT: "Pavimento roto",
  BROKEN_SIDEWALK: "Vereda hundida o rota",
  BROKEN_STREETLIGHT: "Luminaria caída o dañada",
  BLOCKED_DRAIN: "Sumidero obstruido",
  DAMAGED_STRUCTURE: "Estructura dañada",
};

const severityLabel: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

type RecoveryAction =
  | {
      kind: "REPAIR_REQUEST";
      transition: "start" | "close";
      buttonLabel: string;
      targetLabel: string;
      description: string;
      externalLabel: string;
    }
  | {
      kind: "STREET_CLOSURE_REQUEST";
      transition: "approve" | "reject" | "end";
      buttonLabel: string;
      targetLabel: string;
      description: string;
      externalLabel?: string;
    };

function recoveryActionsFor(referral: Referral): RecoveryAction[] {
  if (referral.kind === "REPAIR_REQUEST") {
    if (referral.status === "REQUESTED") {
      return [{
        kind: "REPAIR_REQUEST",
        transition: "start",
        buttonLabel: "Registrar inicio",
        targetLabel: "En curso",
        description: "Obras Públicas ya asignó la orden.",
        externalLabel: "Nº de orden de trabajo",
      }];
    }
    if (referral.status === "IN_PROGRESS") {
      return [{
        kind: "REPAIR_REQUEST",
        transition: "close",
        buttonLabel: "Registrar cierre",
        targetLabel: "Cerrada",
        description: "Obras Públicas ya terminó la reparación.",
        externalLabel: "Nº de orden de trabajo",
      }];
    }
    return [];
  }

  if (referral.status === "REQUESTED") {
    return [
      {
        kind: "STREET_CLOSURE_REQUEST",
        transition: "approve",
        buttonLabel: "Registrar aprobación",
        targetLabel: "Aprobada",
        description: "Tránsito ya aprobó el corte.",
        externalLabel: "Nº de corte",
      },
      {
        kind: "STREET_CLOSURE_REQUEST",
        transition: "reject",
        buttonLabel: "Registrar rechazo",
        targetLabel: "Rechazada",
        description: "Tránsito rechazó el corte.",
      },
    ];
  }
  if (referral.status === "APPROVED" || referral.status === "EXPIRED") {
    return [{
      kind: "STREET_CLOSURE_REQUEST",
      transition: "end",
      buttonLabel: "Registrar finalización",
      targetLabel: "Finalizada",
      description: "El corte terminó.",
    }];
  }
  return [];
}

function statusLabel(referral: Referral): string {
  return referral.kind === "REPAIR_REQUEST"
    ? repairStatusLabel[referral.status]
    : closureStatusLabel[referral.status];
}

function formatDate(value: string): string {
  const calendarDay = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(calendarDay);
  if (match && new Date(`${calendarDay}T00:00:00Z`).toISOString().slice(0, 10) === calendarDay) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

// Una hora sin zona (`2026-09-05T08:00`) es hora argentina (UTC-3, sin horario de verano), no la de la máquina.
const ZONELESS_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

function formatDateTime(value: string): string {
  const date = new Date(ZONELESS_DATE_TIME.test(value) ? `${value}-03:00` : value);
  if (Number.isNaN(date.valueOf())) return value;
  const timeZone = "America/Argentina/Buenos_Aires";
  const dateLabel = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone,
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(date);
  return `${dateLabel} ${timeLabel}`;
}

export function ReferralsWorkspace({ scenario }: { scenario: OperationalScenario }) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("detail");
  });

  const fetchReferrals = useCallback(async () => {
    const page = await referralsAdapter.list();
    const referrals = page.referrals;
    // Inspection-sourced repairs stash the inspection id in sourceServiceId (see referrals.ts) —
    // it isn't a real Service id, so fetching it as one would 404 and misreport as unavailable.
    const sourceIds = [...new Set(referrals
      .filter((referral) => referral.sourceServiceId && !isInspectionSourcedRepair(referral))
      .map((referral) => referral.sourceServiceId as string))];
    const sourceResults = await Promise.all(sourceIds.map(async (sourceId) => {
      try {
        return { kind: "success" as const, sourceId, service: await servicesAdapter.get(sourceId) };
      } catch (error: unknown) {
        return {
          kind: "error" as const,
          sourceId,
          error: getErrorMessage(error, "No se pudo cargar el servicio."),
        };
      }
    }));

    const sources = new Map<string, Service>();
    const sourceErrors = new Map<string, string>();
    for (const result of sourceResults) {
      if (result.kind === "error") sourceErrors.set(result.sourceId, result.error);
      else if (result.service) sources.set(result.sourceId, result.service);
    }

    return { referrals, invalid: page.invalid, sources, sourceErrors } satisfies SourceServiceState & { referrals: Referral[]; invalid: number };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    void fetchReferrals()
      .then((result) => {
        if (isCurrent) setLoadState({ status: "ready", ...result });
      })
      .catch((error: unknown) => {
        if (isCurrent) setLoadState({
          status: "error",
          message: getErrorMessage(error, "Intente nuevamente."),
        });
      });
    return () => {
      isCurrent = false;
    };
  }, [fetchReferrals]);

  const loadReferrals = () => {
    setLoadState({ status: "loading" });
    void fetchReferrals()
      .then((result) => setLoadState({ status: "ready", ...result }))
      .catch((error: unknown) => setLoadState({
        status: "error",
        message: getErrorMessage(error, "Intente nuevamente."),
      }));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set("detail", selectedId);
    else url.searchParams.delete("detail");
    window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`.replace(/\?$/, ""));
  }, [selectedId]);

  const selectedReferral = useMemo(() => {
    if (loadState.status !== "ready" || !selectedId) return null;
    return loadState.referrals.find((referral) => referral.id === selectedId) ?? null;
  }, [loadState, selectedId]);

  const anomalies = useMemo(
    () => loadState.status === "ready"
      ? getReferralAnomalies(loadState.referrals, loadState.sources)
      : new Map<string, ReferralAnomaly>(),
    [loadState],
  );

  const handleReferralRecovered = useCallback((updatedReferral: Referral) => {
    setLoadState((current) => current.status === "ready"
      ? {
          ...current,
          referrals: current.referrals.map((referral) => referral.id === updatedReferral.id ? updatedReferral : referral),
        }
      : current);
  }, []);

  if (selectedReferral) {
    return (
      <ReferralDetail
        referral={selectedReferral}
        anomaly={anomalies.get(selectedReferral.id) ?? { isStale: false, duplicateReferralIds: [], sourceChanges: [] }}
        sourceUnavailable={loadState.status === "ready" && selectedReferral.sourceServiceId ? loadState.sourceErrors.get(selectedReferral.sourceServiceId) : undefined}
        onBack={() => setSelectedId(null)}
        canRecover={scenario.actor.kind === "OFFICE"}
        onRecovered={handleReferralRecovered}
      />
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-[var(--color-canvas)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-end justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)] sm:text-[28px]">Derivaciones</h1>
          {loadState.status === "ready" ? (
            <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--color-text-secondary)]">
              {loadState.referrals.length} {loadState.referrals.length === 1 ? "derivación" : "derivaciones"}
            </span>
          ) : loadState.status === "loading" ? (
            <span aria-hidden="true" className="shrink-0">
              <Skeleton data-skeleton="referral-count" className="h-4 w-16" />
            </span>
          ) : null}
        </div>
      </header>

      <LoadingRegion label="Derivaciones" isLoading={loadState.status === "loading"} className="flex flex-1 flex-col">
      {loadState.status === "loading" && <LoadingState />}
      {loadState.status === "error" && (
        <div className="flex flex-1 items-center justify-center p-6">
          <Alert variant="destructive" className="w-full max-w-md p-6 text-center">
            <CircleAlert className="mx-auto h-8 w-8 text-[var(--color-danger)]" aria-hidden />
            <AlertTitle className="mt-3 text-lg font-bold text-[var(--color-text)]">No se pudieron cargar las derivaciones</AlertTitle>
            <AlertDescription className="mt-1 text-sm text-[var(--color-text-secondary)]">{loadState.message}</AlertDescription>
            <Button className="mt-5 gap-2" onClick={loadReferrals}>
              <RefreshCw className="h-4 w-4" aria-hidden />
              Reintentar carga
            </Button>
          </Alert>
        </div>
      )}
      {loadState.status === "ready" && loadState.invalid > 0 && (
        <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 lg:px-8">
          <Alert role="status" aria-label="Derivaciones sin mostrar" className="rounded-xl border-[var(--color-warning-line)] bg-[var(--color-surface)] p-3">
            <ShieldAlert aria-hidden />
            <AlertDescription className="text-[var(--color-text)]">
              No se pudieron mostrar {loadState.invalid} {loadState.invalid === 1 ? "derivación" : "derivaciones"}. Si el problema continúa, avise a soporte.
            </AlertDescription>
          </Alert>
        </div>
      )}
      {loadState.status === "ready" && loadState.referrals.length === 0 && <EmptyState />}
      {loadState.status === "ready" && loadState.referrals.length > 0 && (
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 sm:p-6 lg:p-8">
          <ReferralReconciliationSummary referrals={loadState.referrals} anomalies={anomalies} />
          <section className="w-full" aria-label="Lista de derivaciones">
            <ItemGroup className="grid min-w-0 grid-cols-1 gap-3" aria-label="Derivaciones">
              {loadState.referrals.map((referral) => (
                <ReferralRow
                  key={`${referral.kind}-${referral.id}`}
                  referral={referral}
                  anomaly={anomalies.get(referral.id)}
                  sourceUnavailable={Boolean(referral.sourceServiceId && loadState.sourceErrors.has(referral.sourceServiceId))}
                  onOpen={() => setSelectedId(referral.id)}
                />
              ))}
            </ItemGroup>
          </section>
        </div>
      )}
      </LoadingRegion>
    </div>
  );
}

function ReferralReconciliationSummary({
  referrals,
  anomalies,
}: {
  referrals: Referral[];
  anomalies: ReadonlyMap<string, ReferralAnomaly>;
}) {
  const staleCount = referrals.filter((referral) => anomalies.get(referral.id)?.isStale).length;
  const duplicateCount = referrals.filter((referral) => (anomalies.get(referral.id)?.duplicateReferralIds.length ?? 0) > 0).length;
  const sourceChangeCount = referrals.filter((referral) => (anomalies.get(referral.id)?.sourceChanges.length ?? 0) > 0).length;
  const total = staleCount + duplicateCount + sourceChangeCount;
  if (total === 0) return null;

  const parts = [
    staleCount > 0 && `${staleCount} ${staleCount === 1 ? "vencida" : "vencidas"}`,
    duplicateCount > 0 && `${duplicateCount} ${duplicateCount === 1 ? "posible duplicada" : "posibles duplicadas"}`,
    sourceChangeCount > 0 && `${sourceChangeCount} con cambios`,
  ].filter(Boolean);

  return (
    <section
      aria-label="Alertas"
      className="rounded-2xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/55 p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-warning-fill)] text-[var(--color-warning)]">
          <CircleAlert className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[var(--color-text)]">{total} para revisar</h2>
          <p className="mt-1 text-xs font-semibold text-[var(--color-warning)]">{parts.join(" · ")}</p>
        </div>
      </div>
    </section>
  );
}

function AnomalyBadges({
  anomaly,
  sourceUnavailable,
}: {
  anomaly?: ReferralAnomaly;
  sourceUnavailable: boolean;
}) {
  if (!anomaly && !sourceUnavailable) return null;

  return (
    <span className="flex flex-wrap gap-1.5" aria-label="Alertas">
      {anomaly?.isStale && (
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] px-2 py-1 text-xs font-semibold text-[var(--color-warning)]">
          <CircleAlert className="h-3.5 w-3.5" aria-hidden />
          Vencida
        </span>
      )}
      {anomaly && anomaly.duplicateReferralIds.length > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] px-2 py-1 text-xs font-semibold text-[var(--color-warning)]">
          <CircleAlert className="h-3.5 w-3.5" aria-hidden />
          Posible duplicada
        </span>
      )}
      {anomaly && anomaly.sourceChanges.length > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-info-line)] bg-[var(--color-info-fill)] px-2 py-1 text-xs font-semibold text-[var(--color-info)]">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Cambió el servicio
        </span>
      )}
      {sourceUnavailable && (
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] px-2 py-1 text-xs font-semibold text-[var(--color-warning)]">
          <CircleAlert className="h-3.5 w-3.5" aria-hidden />
          Sin verificar
        </span>
      )}
    </span>
  );
}

function ReferralRow({
  referral,
  anomaly,
  sourceUnavailable = false,
  onOpen,
}: {
  referral: Referral;
  anomaly?: ReferralAnomaly;
  sourceUnavailable?: boolean;
  onOpen: () => void;
}) {
  return (
    <Item
      variant="interactive"
      className="min-h-12 w-full items-start gap-3 p-4 text-left sm:items-center"
      render={(
        <Button
          type="button"
          variant="ghost"
          className="h-auto min-h-12 min-w-0 w-full items-start justify-start whitespace-normal text-left sm:items-center"
          onClick={onOpen}
          aria-label={`${referral.id}, ${referralKindLabel[referral.kind]}, ${statusLabel(referral)}`}
        />
      )}
    >
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-info-fill)] text-[var(--color-action)] sm:mt-0">
          {referral.kind === "REPAIR_REQUEST" ? <Construction className="h-4 w-4" aria-hidden /> : <Route className="h-4 w-4" aria-hidden />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-2 block">
            <AnomalyBadges anomaly={anomaly} sourceUnavailable={sourceUnavailable} />
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-bold tabular-nums text-[var(--color-text)]">{referral.id}</span>
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{referralKindLabel[referral.kind]}</span>
          </span>
          <span className="mt-1 block truncate text-xs text-[var(--color-text-secondary)]">{sourceKindLabel(referral)}: {referral.sourceId} · {referral.sourceLabel}</span>
        </span>
        <ItemActions className="w-full basis-full justify-end sm:ml-auto sm:w-auto sm:basis-auto">
          <Badge variant="status" className="min-h-7 shrink-0 gap-1.5 px-2.5 py-1 text-xs font-semibold" role="status" aria-label={`Estado: ${statusLabel(referral)}`}>
            <ReferralStatusIcon referral={referral} className="h-3.5 w-3.5" />
            {statusLabel(referral)}
          </Badge>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" aria-hidden />
        </ItemActions>
    </Item>
  );
}

function ReferralDetail({
  referral,
  anomaly,
  sourceUnavailable,
  onBack,
  canRecover,
  onRecovered,
}: {
  referral: Referral;
  anomaly: ReferralAnomaly;
  sourceUnavailable?: string;
  onBack: () => void;
  canRecover: boolean;
  onRecovered: (updatedReferral: Referral) => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [referral.id]);

  return (
    <div className="flex min-h-full flex-col bg-[var(--color-surface)]" role="region" aria-label={`Detalle de ${referral.id}`}>
      <header className="border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver a derivaciones
          </Button>
          <span className="text-xs font-semibold tabular-nums text-[var(--color-text-secondary)]">{referral.id}</span>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 space-y-5 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--color-action)]">{referralKindLabel[referral.kind]}</p>
            <h1 ref={headingRef} tabIndex={-1} className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-text)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] sm:text-[28px]">Detalle de {referral.id}</h1>
            <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div className="flex gap-1.5"><dt className="text-[var(--color-text-secondary)]">Creada</dt><dd className="text-[var(--color-text)]">{formatDateTime(referral.createdAt)}</dd></div>
              <div className="flex gap-1.5"><dt className="text-[var(--color-text-secondary)]">Actualizada</dt><dd className="text-[var(--color-text)]">{formatDateTime(referral.updatedAt)}</dd></div>
            </dl>
          </div>
          <StatusBadge referral={referral} />
        </div>

        <ReferralAlerts
          referral={referral}
          anomaly={anomaly}
          sourceUnavailable={sourceUnavailable}
        />

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-4 sm:p-5" aria-labelledby="referral-source-title">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-info-fill)] text-[var(--color-action)]">
              <ExternalLink className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 id="referral-source-title" className="text-sm font-bold text-[var(--color-text)]">{sourceKindLabel(referral)}</h2>
              <p className="mt-1 text-sm text-[var(--color-text)]">{referral.sourceId} · {referral.sourceLabel}</p>
              <a className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-action)] underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]" href={referral.sourceHref}>
                {sourceLinkLabel(referral)}
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        </section>

        {referral.kind === "REPAIR_REQUEST" ? <RepairDetail referral={referral} /> : <ClosureDetail referral={referral} />}

        {canRecover && <ReferralRecoveryPanel referral={referral} onRecovered={onRecovered} />}
      </div>
    </div>
  );
}

function ReferralAlerts({
  referral,
  anomaly,
  sourceUnavailable,
}: {
  referral: Referral;
  anomaly: ReferralAnomaly;
  sourceUnavailable?: string;
}) {
  const hasWarnings = anomaly.isStale || anomaly.duplicateReferralIds.length > 0 || anomaly.sourceChanges.length > 0 || Boolean(sourceUnavailable);
  if (!hasWarnings) return null;

  return (
    <section
      className="flex flex-col gap-2 rounded-2xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/45 p-4"
      aria-label="Alertas"
    >
      {anomaly.isStale && (
        <p className="flex items-center gap-2 text-sm text-[var(--color-text)]">
          <CircleAlert className="h-4 w-4 shrink-0 text-[var(--color-warning)]" aria-hidden />
          <span><strong className="text-[var(--color-warning)]">Vencida:</strong> {destinationLabel[referral.destination]} no respondió a tiempo.</span>
        </p>
      )}
      {anomaly.duplicateReferralIds.length > 0 && (
        <p className="flex items-center gap-2 text-sm text-[var(--color-text)]">
          <CircleAlert className="h-4 w-4 shrink-0 text-[var(--color-warning)]" aria-hidden />
          <span><strong className="text-[var(--color-warning)]">Posible duplicada</strong> de <span className="font-semibold tabular-nums">{anomaly.duplicateReferralIds.join(", ")}</span>.</span>
        </p>
      )}
      {anomaly.sourceChanges.length > 0 && (
        <div className="text-sm text-[var(--color-text)]">
          <p className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 shrink-0 text-[var(--color-info)]" aria-hidden />
            <strong className="text-[var(--color-info)]">El servicio cambió desde que se derivó.</strong>
          </p>
          <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
            {anomaly.sourceChanges.map((change) => (
              <div key={change.field}>
                <dt className="font-semibold text-[var(--color-text-secondary)]">{change.field}</dt>
                <dd className="mt-0.5 text-[var(--color-text)]">Antes: {change.recordedValue} · Ahora: {change.currentValue}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {sourceUnavailable && (
        <p className="flex items-center gap-2 text-sm text-[var(--color-text)]">
          <CircleAlert className="h-4 w-4 shrink-0 text-[var(--color-warning)]" aria-hidden />
          <span><strong className="text-[var(--color-warning)]">Sin verificar:</strong> {sourceUnavailable}</span>
        </p>
      )}
    </section>
  );
}

function ReferralRecoveryPanel({
  referral,
  onRecovered,
}: {
  referral: Referral;
  onRecovered: (updatedReferral: Referral) => void;
}) {
  const actions = recoveryActionsFor(referral);
  const [activeAction, setActiveAction] = useState<RecoveryAction | null>(null);

  if (actions.length === 0 && !activeAction) return null;

  return (
    <section
      className="rounded-2xl border border-[var(--color-border)] p-4 sm:p-5"
      aria-labelledby="referral-recovery-title"
    >
      <h2 id="referral-recovery-title" className="text-sm font-bold text-[var(--color-text)]">Registrar respuesta</h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Confirme solo lo que {destinationLabel[referral.destination]} ya informó.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={`${action.kind}-${action.transition}`}
            type="button"
            variant="outline"
            className="border-[var(--color-border-strong)] bg-[var(--color-surface)] font-semibold text-[var(--color-action)] hover:bg-[var(--color-surface)]"
            onClick={() => setActiveAction(action)}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {action.buttonLabel}
          </Button>
        ))}
      </div>

      {activeAction && (
        <ReferralRecoveryDialog
          key={`${referral.id}-${activeAction.transition}`}
          open
          referral={referral}
          action={activeAction}
          onOpenChange={(open) => {
            if (!open) setActiveAction(null);
          }}
          onRecovered={(updatedReferral) => {
            onRecovered(updatedReferral);
            setActiveAction(null);
          }}
          onReferralRefreshed={onRecovered}
        />
      )}
    </section>
  );
}

function ReferralRecoveryDialog({
  open,
  referral,
  action,
  onOpenChange,
  onRecovered,
  onReferralRefreshed,
}: {
  open: boolean;
  referral: Referral;
  action: RecoveryAction;
  onOpenChange: (open: boolean) => void;
  onRecovered: (updatedReferral: Referral) => void;
  onReferralRefreshed: (updatedReferral: Referral) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-[var(--color-border)] bg-[var(--color-surface)]">
        <ReferralRecoveryForm
          referral={referral}
          action={action}
          onOpenChange={onOpenChange}
          onRecovered={onRecovered}
          onReferralRefreshed={onReferralRefreshed}
        />
      </DialogContent>
    </Dialog>
  );
}

function ReferralRecoveryForm({
  referral,
  action,
  onOpenChange,
  onRecovered,
  onReferralRefreshed,
}: {
  referral: Referral;
  action: RecoveryAction;
  onOpenChange: (open: boolean) => void;
  onRecovered: (updatedReferral: Referral) => void;
  onReferralRefreshed: (updatedReferral: Referral) => void;
}) {
  const formId = useMemo(() => `referral-recovery-${referral.id}-${action.transition}`, [referral.id, action.transition]);
  const [externalId, setExternalId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedExternalId = externalId.trim();
    if (action.externalLabel && !trimmedExternalId) {
      setErrorMessage(`Indique el ${action.externalLabel.replace(/^Nº/, "nº")}.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      let updatedReferral: Referral;
      if (action.kind === "REPAIR_REQUEST") {
        const updated = action.transition === "start"
          ? await repairRequestsAdapter.start(referral.id, { workOrderId: trimmedExternalId })
          : await repairRequestsAdapter.close(referral.id, { workOrderId: trimmedExternalId });
        updatedReferral = referralFromRepairRequest(updated);
      } else if (action.transition === "approve") {
        const updated = await streetClosureRequestsAdapter.approve(referral.id, { closureId: trimmedExternalId });
        updatedReferral = referralFromStreetClosureRequest(updated);
      } else if (action.transition === "reject") {
        const updated = await streetClosureRequestsAdapter.reject(referral.id);
        updatedReferral = referralFromStreetClosureRequest(updated);
      } else {
        const updated = await streetClosureRequestsAdapter.end(referral.id);
        updatedReferral = referralFromStreetClosureRequest(updated);
      }
      onRecovered(updatedReferral);
      onOpenChange(false);
    } catch (cause) {
      const isConflict =
        (cause instanceof RepairRequestRequestError || cause instanceof StreetClosureRequestError) &&
        cause.status === 409;

      if (isConflict) {
        try {
          const refreshedReferral = action.kind === "REPAIR_REQUEST"
            ? referralFromRepairRequest(await repairRequestsAdapter.get(referral.id))
            : referralFromStreetClosureRequest(await streetClosureRequestsAdapter.get(referral.id));
          onReferralRefreshed(refreshedReferral);
        } catch {
          // Keep the backend conflict message visible if the refresh is unavailable.
        }
      }

      setErrorMessage(getErrorMessage(cause, "No se pudo registrar. Intente nuevamente."));
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentStatus = statusLabel(referral);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{action.buttonLabel}</DialogTitle>
        <DialogDescription>{action.description}</DialogDescription>
      </DialogHeader>

      <form id={formId} noValidate onSubmit={handleSubmit} className="space-y-4 py-2">
        {errorMessage && !action.externalLabel ? (
          <Alert id={`${formId}-external-id-error`} variant="destructive" className="rounded-xl p-3 text-xs">
            <CircleAlert aria-hidden />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3 text-sm">
          <dl className="grid gap-2 sm:grid-cols-2">
            <DataField label="Derivación" value={referral.id} />
            <DataField label="Estado" value={currentStatus} />
            <DataField label="Pasará a" value={action.targetLabel} />
            <DataField label="Destino" value={destinationLabel[referral.destination]} />
          </dl>
        </div>

        {action.externalLabel && (
          <Field className="gap-1.5">
            <FieldLabel htmlFor={`${formId}-external-id`} className="text-sm font-semibold text-[var(--color-text)]">
              {action.externalLabel} <span className="text-[var(--color-danger)]" aria-hidden>*</span>
            </FieldLabel>
            <Input
              id={`${formId}-external-id`}
              value={externalId}
              onChange={(event) => {
                setExternalId(event.target.value);
                setErrorMessage(null);
              }}
              required
              aria-invalid={Boolean(errorMessage)}
              aria-describedby={errorMessage ? `${formId}-external-id-error` : undefined}
              placeholder={referral.destination === "M3" ? "Ej. OT-2048" : "Ej. C-882"}
              className="bg-[var(--color-surface)] text-sm"
            />
            {errorMessage ? <FieldError id={`${formId}-external-id-error`}>{errorMessage}</FieldError> : null}
          </Field>
        )}

      </form>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
          Volver
        </Button>
        <Button type="submit" form={formId} disabled={isSubmitting} className="font-semibold">
          {isSubmitting ? (
            <>
              <Spinner className="h-4 w-4" aria-hidden />
              <span>Registrando…</span>
            </>
          ) : (
            <span>Confirmar</span>
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

function RepairDetail({ referral }: { referral: Extract<Referral, { kind: "REPAIR_REQUEST" }> }) {
  const request = referral.request;
  return (
    <section className="rounded-2xl border border-[var(--color-border)] p-4 sm:p-5" aria-labelledby="repair-data-title">
      <h2 id="repair-data-title" className="text-sm font-bold uppercase tracking-wide text-[var(--color-text)]">Reparación</h2>
      <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <DataField label="Tipo de daño" value={repairDamageLabel[request.damageType] ?? request.damageType} />
        <DataField label="Severidad" value={severityLabel[request.severity] ?? request.severity} />
        <DataField label="Riesgo" value={request.publicSafetyRisk ? "Sí" : "No"} />
        <DataField label="Ubicación" value={request.address} />
        {request.workOrderId && <DataField label="Nº de orden de trabajo" value={request.workOrderId} />}
      </dl>
    </section>
  );
}

function ClosureDetail({ referral }: { referral: Extract<Referral, { kind: "STREET_CLOSURE_REQUEST" }> }) {
  const request = referral.request;
  return (
    <section className="rounded-2xl border border-[var(--color-border)] p-4 sm:p-5" aria-labelledby="closure-data-title">
      <h2 id="closure-data-title" className="text-sm font-bold uppercase tracking-wide text-[var(--color-text)]">Corte de calle</h2>
      <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <DataField label="Tipo" value={request.closureType === "TOTAL" ? "Total" : "Parcial"} />
        <DataField label="Motivo" value={request.reason} />
        <DataField label="Inicio" value={formatDateTime(request.requestedFrom)} />
        <DataField label="Fin" value={formatDateTime(request.requestedTo)} />
        {request.closureId && <DataField label="Nº de corte" value={request.closureId} />}
      </dl>
      <div className="mt-5 border-t border-[var(--color-border)] pt-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">Tramos afectados</h3>
        <ItemGroup className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          {request.affectedSections.map((section, index) => (
            <Item key={`${section.streetName}-${index}`} variant="muted" className="block rounded-xl p-3 text-[var(--color-text)]">
              <span className="font-semibold">{section.streetName}</span>
              <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">Entre {section.fromCross} y {section.toCross}</span>
            </Item>
          ))}
        </ItemGroup>
      </div>
    </section>
  );
}

function StatusBadge({ referral }: { referral: Referral }) {
  return (
    <Badge variant="status" className="min-h-8 gap-2 px-3 py-1.5 text-sm font-semibold" role="status" aria-label={`Estado: ${statusLabel(referral)}`}>
      <ReferralStatusIcon referral={referral} className="h-4 w-4" />
      {statusLabel(referral)}
    </Badge>
  );
}

function ReferralStatusIcon({ referral, className }: { referral: Referral; className: string }) {
  if (referral.status === "CLOSED" || referral.status === "ENDED" || referral.status === "APPROVED") {
    return <CircleCheck className={className} aria-hidden />;
  }
  if (referral.status === "REJECTED") return <CircleAlert className={className} aria-hidden />;
  if (referral.status === "EXPIRED") return <TimerOff className={className} aria-hidden />;
  if (referral.status === "IN_PROGRESS") return <Clock3 className={className} aria-hidden />;
  return <CircleDashed className={className} aria-hidden />;
}

function DataField({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold text-[var(--color-text-secondary)]">{label}</dt><dd className="mt-1 text-[var(--color-text)]">{value}</dd></div>;
}

function LoadingState() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 sm:p-6 lg:p-8">
      <section aria-hidden="true" data-skeleton="referral-reconciliation-banner" className="flex items-start gap-3 rounded-2xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/55 p-4">
        <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-5 w-60 max-w-full" />
          <div className="mt-1 flex flex-col">
            <Skeleton data-skeleton="referral-reconciliation-detail" className="h-5 w-full" />
            <Skeleton data-skeleton="referral-reconciliation-detail" className="h-5 w-3/4 max-w-full sm:hidden" />
          </div>
          <div className="mt-1 flex flex-col">
            <Skeleton data-skeleton="referral-reconciliation-detail" className="h-4 w-full" />
            <Skeleton data-skeleton="referral-reconciliation-detail" className="h-4 w-4/5 max-w-full sm:hidden" />
            <Skeleton data-skeleton="referral-reconciliation-detail" className="h-4 w-1/2 max-w-full sm:hidden" />
          </div>
          <Skeleton data-skeleton="referral-reconciliation-detail" className="mt-2 h-4 w-1/4 max-w-full" />
        </div>
      </section>
      <ItemGroup aria-hidden="true" data-skeleton="referral-records" className="grid min-w-0 grid-cols-1 gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Item key={index} variant="interactive" data-skeleton="referral-record" className="min-h-12 w-full items-start gap-3 p-4 text-left sm:items-center">
            <span data-skeleton="referral-record-icon" className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:mt-0">
              <Skeleton className="h-9 w-9 rounded-xl" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="mb-2 block"><Skeleton className="h-[26px] w-32 max-w-full rounded-full" /></span>
              <span data-skeleton="referral-record-title" className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Skeleton className="h-5 w-24 max-w-full" />
                <Skeleton className="h-4 w-32 max-w-full" />
              </span>
              <Skeleton data-skeleton="referral-record-detail" className="mt-1 block h-5 w-72 max-w-full" />
              <Skeleton data-skeleton="referral-record-detail" className="mt-1 block h-4 w-56 max-w-full" />
            </span>
            <ItemActions className="w-full basis-full justify-end sm:ml-auto sm:w-auto sm:basis-auto">
              <Skeleton data-skeleton="referral-record-status" className="h-7 w-24 rounded-full" />
              <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </div>
  );
}

function EmptyState() {
  return (
    <Empty className="flex-1 border-0 bg-[var(--color-canvas)]">
      <EmptyHeader>
        <EmptyTitle>Sin derivaciones</EmptyTitle>
      </EmptyHeader>
      <ShieldAlert className="h-8 w-8 text-[var(--color-text-secondary)]" aria-hidden />
    </Empty>
  );
}
