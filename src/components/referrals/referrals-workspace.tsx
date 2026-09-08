"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Clock3,
  Construction,
  ExternalLink,
  History,
  Loader2,
  RefreshCw,
  Route,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { referralsAdapter, isReferralVisibleToScenario, referralFromRepairRequest, referralFromStreetClosureRequest, type Referral } from "@/lib/referrals";
import { getReferralAnomalies, type ReferralAnomaly } from "@/lib/referral-anomalies";
import { repairRequestsAdapter } from "@/lib/repair-requests";
import type { OperationalScenario } from "@/lib/scenarios";
import { servicesAdapter, type Service } from "@/lib/services";
import { streetClosureRequestsAdapter } from "@/lib/street-closure-requests";

type SourceServiceState = {
  sources: Map<string, Service>;
  sourceErrors: Map<string, string>;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | ({ status: "ready"; referrals: Referral[] } & SourceServiceState);

const referralKindLabel: Record<Referral["kind"], string> = {
  REPAIR_REQUEST: "M3 · Reparaciones",
  STREET_CLOSURE_REQUEST: "M7 · Cortes de calle",
};

const referralKindDescription: Record<Referral["kind"], string> = {
  REPAIR_REQUEST: "Daño de infraestructura referido a M3",
  STREET_CLOSURE_REQUEST: "Corte solicitado para un Servicio",
};

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
      externalHelp: string;
    }
  | {
      kind: "STREET_CLOSURE_REQUEST";
      transition: "approve" | "reject" | "end";
      buttonLabel: string;
      targetLabel: string;
      description: string;
      externalLabel?: string;
      externalHelp?: string;
    };

function recoveryActionsFor(referral: Referral): RecoveryAction[] {
  if (referral.kind === "REPAIR_REQUEST") {
    if (referral.status === "REQUESTED") {
      return [{
        kind: "REPAIR_REQUEST",
        transition: "start",
        buttonLabel: "Registrar inicio de reparación",
        targetLabel: "En curso",
        description: "Confirme que M3 ya asignó la orden de trabajo y registre su identificador.",
        externalLabel: "Identificador externo de M3 (workOrderId)",
        externalHelp: "Debe coincidir con la orden de trabajo que M3 ya informó.",
      }];
    }
    if (referral.status === "IN_PROGRESS") {
      return [{
        kind: "REPAIR_REQUEST",
        transition: "close",
        buttonLabel: "Registrar cierre de reparación",
        targetLabel: "Cerrada",
        description: "Confirme que M3 ya informó la finalización de la orden de trabajo.",
        externalLabel: "Identificador externo de M3 (workOrderId)",
        externalHelp: "Vuelva a indicar el identificador de la orden confirmada por M3.",
      }];
    }
    return [];
  }

  if (referral.status === "REQUESTED") {
    return [
      {
        kind: "STREET_CLOSURE_REQUEST",
        transition: "approve",
        buttonLabel: "Registrar aprobación de M7",
        targetLabel: "Aprobada",
        description: "Confirme que M7 ya aprobó el corte y registre el identificador de cierre.",
        externalLabel: "Identificador externo de M7 (closureId)",
        externalHelp: "Debe coincidir con el identificador de cierre que M7 ya informó.",
      },
      {
        kind: "STREET_CLOSURE_REQUEST",
        transition: "reject",
        buttonLabel: "Registrar rechazo de M7",
        targetLabel: "Rechazada",
        description: "Confirme que M7 ya rechazó el corte. Luego Oficina deberá decidir si reprograma o cancela el Servicio.",
      },
    ];
  }
  if (referral.status === "APPROVED") {
    return [{
      kind: "STREET_CLOSURE_REQUEST",
      transition: "end",
      buttonLabel: "Registrar finalización de M7",
      targetLabel: "Finalizada",
      description: "Confirme que M7 ya informó que el corte terminó y que puede liberarse esta dependencia.",
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
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function ReferralsWorkspace({ scenario }: { scenario: OperationalScenario }) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("detail");
  });

  const fetchReferrals = useCallback(async () => {
    const page = await referralsAdapter.list();
    const referrals = page.referrals.filter((referral) => isReferralVisibleToScenario(referral, scenario));
    const sourceIds = [...new Set(referrals
      .filter((referral) => referral.kind === "STREET_CLOSURE_REQUEST" || referral.request.detectedInType === "SERVICE")
      .map((referral) => referral.sourceServiceId))];
    const sourceResults = await Promise.all(sourceIds.map(async (sourceId) => {
      try {
        return { kind: "success" as const, sourceId, service: await servicesAdapter.get(sourceId) };
      } catch (error: unknown) {
        return {
          kind: "error" as const,
          sourceId,
          error: error instanceof Error ? error.message : "No se pudo verificar el Servicio de origen.",
        };
      }
    }));

    const sources = new Map<string, Service>();
    const sourceErrors = new Map<string, string>();
    for (const result of sourceResults) {
      if (result.kind === "error") sourceErrors.set(result.sourceId, result.error);
      else if (result.service) sources.set(result.sourceId, result.service);
    }

    return { referrals, sources, sourceErrors } satisfies SourceServiceState & { referrals: Referral[] };
  }, [scenario]);

  useEffect(() => {
    let isCurrent = true;
    void fetchReferrals()
      .then((result) => {
        if (isCurrent) setLoadState({ status: "ready", ...result });
      })
      .catch((error: unknown) => {
        if (isCurrent) setLoadState({
          status: "error",
          message: error instanceof Error ? error.message : "Intente nuevamente en unos instantes.",
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
        message: error instanceof Error ? error.message : "Intente nuevamente en unos instantes.",
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
        sourceUnavailable={loadState.status === "ready" ? loadState.sourceErrors.get(selectedReferral.sourceServiceId) : undefined}
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
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)] sm:text-[28px]">Derivaciones externas</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
              {scenario.actor.kind === "OFFICE"
                ? "Seguimiento de solicitudes referidas a M3 y M7 desde Servicios."
                : "Solicitudes vinculadas exclusivamente a sus Servicios asignados."}
            </p>
          </div>
          {loadState.status === "ready" && (
            <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--color-text-secondary)]">
              {loadState.referrals.length} {loadState.referrals.length === 1 ? "registro" : "registros"}
            </span>
          )}
        </div>
      </header>

      {loadState.status === "loading" && <LoadingState />}
      {loadState.status === "error" && (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-danger-line)] bg-[var(--color-surface)] p-6 text-center" role="alert">
            <CircleAlert className="mx-auto h-8 w-8 text-[var(--color-danger)]" aria-hidden />
            <h2 className="mt-3 text-lg font-bold text-[var(--color-text)]">No se pudieron cargar las derivaciones</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{loadState.message}</p>
            <Button className="mt-5 min-h-10 gap-2" onClick={loadReferrals}>
              <RefreshCw className="h-4 w-4" aria-hidden />
              Reintentar carga
            </Button>
          </div>
        </div>
      )}
      {loadState.status === "ready" && loadState.referrals.length === 0 && <EmptyState />}
      {loadState.status === "ready" && loadState.referrals.length > 0 && (
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 sm:p-6 lg:p-8">
          <ReferralReconciliationSummary referrals={loadState.referrals} anomalies={anomalies} />
          <section className="w-full" aria-label="Lista de derivaciones" aria-describedby="referrals-scope-note">
            <p id="referrals-scope-note" className="sr-only">
              Seleccione una derivación para consultar su detalle. La información del Servicio se consulta mediante el enlace a su módulo de origen.
            </p>
            <ul className="grid gap-3" role="list">
              {loadState.referrals.map((referral) => (
                <ReferralRow
                  key={`${referral.kind}-${referral.id}`}
                  referral={referral}
                  anomaly={anomalies.get(referral.id)}
                  sourceUnavailable={loadState.sourceErrors.has(referral.sourceServiceId)}
                  onOpen={() => setSelectedId(referral.id)}
                />
              ))}
            </ul>
          </section>
        </div>
      )}
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

  return (
    <section
      aria-label="Resumen de conciliación"
      className={total > 0
        ? "rounded-2xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/55 p-4"
        : "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"}
    >
      <div className="flex items-start gap-3">
        <span className={total > 0
          ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-warning-fill)] text-[var(--color-warning)]"
          : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-info-fill)] text-[var(--color-action)]"}
        >
          {total > 0 ? <CircleAlert className="h-4 w-4" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[var(--color-text)]">
            {total > 0 ? "Revisión de conciliación requerida" : "Seguimiento de conciliación"}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {total > 0
              ? `${total} ${total === 1 ? "advertencia requiere" : "advertencias requieren"} revisión explícita de Oficina.`
              : "Las respuestas externas se mantienen visibles hasta que M3 o M7 confirme una decisión."}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            M6 no cambia estados, fusiona duplicados, reintenta envíos ni modifica el Servicio automáticamente.
          </p>
          {total > 0 && (
            <p className="mt-2 text-xs font-semibold text-[var(--color-warning)]">
              {staleCount > 0 && `${staleCount} fuera de plazo`}
              {staleCount > 0 && (duplicateCount > 0 || sourceChangeCount > 0) ? " · " : ""}
              {duplicateCount > 0 && `${duplicateCount} posible${duplicateCount === 1 ? " duplicado" : "s duplicados"}`}
              {duplicateCount > 0 && sourceChangeCount > 0 ? " · " : ""}
              {sourceChangeCount > 0 && `${sourceChangeCount} con cambios de origen`}
            </p>
          )}
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
    <span className="flex flex-wrap gap-1.5" aria-label="Alertas de conciliación">
      {anomaly?.isStale && (
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] px-2 py-1 text-xs font-semibold text-[var(--color-warning)]">
          <CircleAlert className="h-3.5 w-3.5" aria-hidden />
          Derivación externa vencida
        </span>
      )}
      {anomaly && anomaly.duplicateReferralIds.length > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] px-2 py-1 text-xs font-semibold text-[var(--color-warning)]">
          <CircleAlert className="h-3.5 w-3.5" aria-hidden />
          Candidata a duplicada
        </span>
      )}
      {anomaly && anomaly.sourceChanges.length > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-info-line)] bg-[var(--color-info-fill)] px-2 py-1 text-xs font-semibold text-[var(--color-info)]">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Origen actualizado
        </span>
      )}
      {sourceUnavailable && (
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] px-2 py-1 text-xs font-semibold text-[var(--color-warning)]">
          <CircleAlert className="h-3.5 w-3.5" aria-hidden />
          Origen sin verificar
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
  const isEnvironmentalSource = referral.kind === "REPAIR_REQUEST" && referral.request.detectedInType === "INSPECTION";
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-12 w-full items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-subtle)] focus-visible:ring-3 focus-visible:ring-[var(--color-focus)] sm:items-center"
        aria-label={`${referral.id}, ${referralKindLabel[referral.kind]}, ${statusLabel(referral)}`}
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
          <span className="mt-1 block truncate text-sm text-[var(--color-text)]">{referralKindDescription[referral.kind]}</span>
           <span className="mt-1 block truncate text-xs text-[var(--color-text-secondary)]">{isEnvironmentalSource ? "Inspección de origen" : "Servicio de origen"}: {referral.sourceServiceId} · {referral.sourceLabel}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text)]" role="status" aria-label={`Estado: ${statusLabel(referral)}`}>
          <ReferralStatusIcon referral={referral} className="h-3.5 w-3.5" />
          {statusLabel(referral)}
        </span>
        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[var(--color-text-secondary)] sm:mt-0" aria-hidden />
      </button>
    </li>
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
  const isEnvironmentalSource = referral.kind === "REPAIR_REQUEST" && referral.request.detectedInType === "INSPECTION";
  return (
    <div className="flex min-h-full flex-col bg-[var(--color-surface)]" role="region" aria-label={`Detalle de ${referral.id}`}>
      <header className="border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={onBack} className="min-h-10 gap-1.5 sm:min-h-8">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver a derivaciones
          </Button>
          <span className="text-xs font-semibold tabular-nums text-[var(--color-text-secondary)]">{referral.id}</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--color-action)]">{referralKindLabel[referral.kind]}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-text)] sm:text-[28px]">Detalle de {referral.id}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Registro M6 · destino externo: {referral.destination}</p>
          </div>
          <StatusBadge referral={referral} />
        </div>

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-4 sm:p-5" aria-labelledby="referral-source-title">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-info-fill)] text-[var(--color-action)]">
              <ExternalLink className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
               <h2 id="referral-source-title" className="text-sm font-bold text-[var(--color-text)]">{isEnvironmentalSource ? "Inspección de origen" : "Servicio de origen"}</h2>
               <p className="mt-1 text-sm text-[var(--color-text)]">{referral.sourceServiceId} · {referral.sourceLabel}</p>
               <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{isEnvironmentalSource ? "La información de la inspección se consulta en su expediente ambiental." : "La información del Servicio se consulta en su módulo de origen."}</p>
               <a className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-action)] underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]" href={referral.sourceHref}>
                 {isEnvironmentalSource ? "Ver inspección fuente" : "Ver Servicio de origen"}
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        </section>

        <ReferralReconciliationPanel
          referral={referral}
          anomaly={anomaly}
          sourceUnavailable={sourceUnavailable}
        />

        {canRecover && <ReferralRecoveryPanel referral={referral} onRecovered={onRecovered} />}

        {referral.kind === "REPAIR_REQUEST" ? <RepairDetail referral={referral} /> : <ClosureDetail referral={referral} />}

        <section className="rounded-2xl border border-[var(--color-border)] p-4 sm:p-5" aria-labelledby="referral-history-title">
          <h2 id="referral-history-title" className="text-sm font-bold uppercase tracking-wide text-[var(--color-text)]">Registro temporal</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <DateField label="Creado" value={referral.createdAt} />
            <DateField label="Última actualización" value={referral.updatedAt} />
          </dl>
        </section>
      </main>
    </div>
  );
}

function ReferralReconciliationPanel({
  referral,
  anomaly,
  sourceUnavailable,
}: {
  referral: Referral;
  anomaly: ReferralAnomaly;
  sourceUnavailable?: string;
}) {
  const hasWarnings = anomaly.isStale || anomaly.duplicateReferralIds.length > 0 || anomaly.sourceChanges.length > 0 || Boolean(sourceUnavailable);

  return (
    <section
      className={hasWarnings
        ? "rounded-2xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/45 p-4 sm:p-5"
        : "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5"}
      aria-labelledby="referral-reconciliation-title"
    >
      <div className="flex items-start gap-3">
        <span className={hasWarnings
          ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-warning-fill)] text-[var(--color-warning)]"
          : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-info-fill)] text-[var(--color-action)]"}
        >
          {hasWarnings ? <CircleAlert className="h-4 w-4" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="referral-reconciliation-title" className="text-sm font-bold text-[var(--color-text)]">
            {hasWarnings ? "Alertas de conciliación" : "Seguimiento de conciliación"}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text)]">
            {hasWarnings
              ? "Revise estas señales con la respuesta de M3 o M7 antes de decidir el próximo paso."
              : "Las respuestas externas tardías, fuera de orden o sin correlación permanecen visibles para revisión explícita."}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {anomaly.isStale && (
          <div className="rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-surface)] p-3">
            <h3 className="text-sm font-bold text-[var(--color-warning)]">Derivación externa vencida</h3>
            <p className="mt-1 text-sm text-[var(--color-text)]">
              La derivación continúa como <strong>{statusLabel(referral)}</strong>, pero no recibió una actualización externa dentro del plazo esperado.
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">No se crea un estado nuevo, no se reintenta el envío y no se modifica el Servicio automáticamente.</p>
          </div>
        )}

        {anomaly.duplicateReferralIds.length > 0 && (
          <div className="rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-surface)] p-3">
            <h3 className="text-sm font-bold text-[var(--color-warning)]">Candidata a derivación duplicada</h3>
            <p className="mt-1 text-sm text-[var(--color-text)]">
              Hay otra derivación abierta del mismo tipo para el Servicio {referral.sourceServiceId}.
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Registros relacionados: <span className="font-semibold tabular-nums">{anomaly.duplicateReferralIds.join(", ")}</span>. La coincidencia requiere revisión humana; M6 no fusiona ni reintenta por un error ambiguo.
            </p>
          </div>
        )}

        {anomaly.sourceChanges.length > 0 && (
          <div className="rounded-xl border border-[var(--color-info-line)] bg-[var(--color-info-fill)]/60 p-3">
            <h3 className="text-sm font-bold text-[var(--color-info)]">El Servicio de origen cambió</h3>
            <p className="mt-1 text-sm text-[var(--color-text)]">La derivación conserva el contexto original. Compare antes de resolver la conciliación.</p>
            <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
              {anomaly.sourceChanges.map((change) => (
                <div key={change.field}>
                  <dt className="font-semibold text-[var(--color-text-secondary)]">{change.field}</dt>
                  <dd className="mt-0.5 text-[var(--color-text)]">Antes: {change.recordedValue} · Ahora: {change.currentValue}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">El cambio no reabre, sobrescribe ni cancela esta derivación automáticamente.</p>
          </div>
        )}

        {sourceUnavailable && (
          <div role="alert" className="rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-surface)] p-3">
            <h3 className="text-sm font-bold text-[var(--color-warning)]">Servicio de origen sin verificar</h3>
            <p className="mt-1 text-sm text-[var(--color-text)]">No se pudo consultar el estado actual del Servicio. No se asume que haya cambiado.</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{sourceUnavailable}</p>
          </div>
        )}

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3 text-xs text-[var(--color-text-secondary)]">
          <p className="font-semibold text-[var(--color-text)]">Límite de seguridad</p>
          <p className="mt-1">Este registro tiene identificador M6 y, por eso, permanece en seguimiento como derivación creada. Si un envío falló antes de crear un registro, es un envío sin enviar y no una derivación pendiente.</p>
          <p className="mt-1">M6 solo registra una decisión externa ya confirmada mediante recuperación manual; no inventa respuestas de M3/M7 ni modifica el Servicio por su cuenta.</p>
        </div>
      </div>
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

  if (actions.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/45 p-4 sm:p-5"
      aria-labelledby="referral-recovery-title"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-warning-fill)] text-[var(--color-warning)]">
          <History className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="referral-recovery-title" className="text-sm font-bold text-[var(--color-text)]">Recuperación manual</h2>
          <p className="mt-1 text-sm text-[var(--color-text)]">
            Esta acción es excepcional: úsela solo después de verificar la respuesta de {referral.destination} fuera de M6.
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            No cambia una decisión externa ni reemplaza la reconciliación automática por eventos.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={`${action.kind}-${action.transition}`}
            type="button"
            variant="outline"
            className="min-h-10 border-[var(--color-border-strong)] bg-[var(--color-surface)] font-semibold text-[var(--color-action)] hover:bg-[var(--color-surface)]"
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
}: {
  open: boolean;
  referral: Referral;
  action: RecoveryAction;
  onOpenChange: (open: boolean) => void;
  onRecovered: (updatedReferral: Referral) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-[var(--color-border)] bg-[var(--color-surface)]">
        <ReferralRecoveryForm
          referral={referral}
          action={action}
          onOpenChange={onOpenChange}
          onRecovered={onRecovered}
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
}: {
  referral: Referral;
  action: RecoveryAction;
  onOpenChange: (open: boolean) => void;
  onRecovered: (updatedReferral: Referral) => void;
}) {
  const formId = useMemo(() => `referral-recovery-${referral.id}-${action.transition}`, [referral.id, action.transition]);
  const [externalId, setExternalId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedExternalId = externalId.trim();
    if (action.externalLabel && !trimmedExternalId) {
      setErrorMessage(`Debe indicar el ${action.externalLabel.toLowerCase()}.`);
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
      setErrorMessage(cause instanceof Error ? cause.message : "No se pudo registrar la recuperación manual.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentStatus = statusLabel(referral);

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-warning)]">
          <History className="h-4 w-4" aria-hidden />
          <span>Revisión excepcional · {referral.destination}</span>
        </div>
        <DialogTitle>{action.buttonLabel}</DialogTitle>
        <DialogDescription>{action.description} Esta acción solo registra un hecho externo ya confirmado.</DialogDescription>
      </DialogHeader>

      <form id={formId} noValidate onSubmit={handleSubmit} className="space-y-4 py-2">
        {errorMessage && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)] p-3 text-xs text-[var(--color-danger)]">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3 text-sm">
          <dl className="grid gap-2 sm:grid-cols-2">
            <DataField label="Derivación" value={referral.id} />
            <DataField label="Estado actual" value={currentStatus} />
            <DataField label="Nuevo estado" value={action.targetLabel} />
            <DataField label="Destino externo" value={referral.destination} />
          </dl>
        </div>

        {action.externalLabel && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${formId}-external-id`} className="text-sm font-semibold text-[var(--color-text)]">
              {action.externalLabel} <span className="text-[var(--color-danger)]" aria-hidden>*</span>
            </label>
            <input
              id={`${formId}-external-id`}
              value={externalId}
              onChange={(event) => {
                setExternalId(event.target.value);
                setErrorMessage(null);
              }}
              required
              aria-invalid={Boolean(errorMessage)}
              placeholder={referral.destination === "M3" ? "Ej. M3-OT-2048" : "Ej. M7-C-882"}
              className="min-h-10 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
            />
            <span className="text-xs leading-4 text-[var(--color-text-secondary)]">{action.externalHelp}</span>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] p-3 text-xs text-[var(--color-warning)]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>Verifique el identificador y la respuesta de {referral.destination} antes de confirmar. M6 no puede crear esa decisión.</span>
        </div>
      </form>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
          Volver
        </Button>
        <Button type="submit" form={formId} disabled={isSubmitting} className="min-h-10 font-semibold">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span>Registrando…</span>
            </>
          ) : (
            <span>Confirmar recuperación</span>
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
      <h2 id="repair-data-title" className="text-sm font-bold uppercase tracking-wide text-[var(--color-text)]">Datos de la solicitud de reparación</h2>
      <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <DataField label="Tipo de daño" value={repairDamageLabel[request.damageType] ?? request.damageType} />
        <DataField label="Severidad" value={severityLabel[request.severity] ?? request.severity} />
        <DataField label="Riesgo para la seguridad pública" value={request.publicSafetyRisk ? "Sí" : "No"} />
        <DataField label="Ubicación" value={request.address} />
        <DataField label="Identificador externo de M3" value={request.workOrderId ?? "M3 todavía no informó un identificador"} />
      </dl>
    </section>
  );
}

function ClosureDetail({ referral }: { referral: Extract<Referral, { kind: "STREET_CLOSURE_REQUEST" }> }) {
  const request = referral.request;
  return (
    <section className="rounded-2xl border border-[var(--color-border)] p-4 sm:p-5" aria-labelledby="closure-data-title">
      <h2 id="closure-data-title" className="text-sm font-bold uppercase tracking-wide text-[var(--color-text)]">Datos de la solicitud de corte</h2>
      <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <DataField label="Tipo de corte" value={request.closureType === "TOTAL" ? "Total" : "Parcial"} />
        <DataField label="Motivo" value={request.reason} />
        <DataField label="Inicio solicitado" value={formatDate(request.requestedFrom)} />
        <DataField label="Fin solicitado" value={formatDate(request.requestedTo)} />
        <DataField label="Identificador externo de M7" value={request.closureId ?? "M7 todavía no informó un identificador"} />
      </dl>
      <div className="mt-5 border-t border-[var(--color-border)] pt-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">Tramos afectados</h3>
        <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          {request.affectedSections.map((section, index) => (
            <li key={`${section.streetName}-${index}`} className="rounded-xl bg-[var(--color-surface-subtle)] p-3 text-[var(--color-text)]">
              <span className="font-semibold">{section.streetName}</span>
              <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">Entre {section.fromCross} y {section.toCross}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function StatusBadge({ referral }: { referral: Referral }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text)]" role="status" aria-label={`Estado: ${statusLabel(referral)}`}>
      <ReferralStatusIcon referral={referral} className="h-4 w-4" />
      {statusLabel(referral)}
    </div>
  );
}

function ReferralStatusIcon({ referral, className }: { referral: Referral; className: string }) {
  if (referral.status === "CLOSED" || referral.status === "ENDED" || referral.status === "APPROVED") {
    return <CircleCheck className={className} aria-hidden />;
  }
  if (referral.status === "REJECTED") return <CircleAlert className={className} aria-hidden />;
  if (referral.status === "IN_PROGRESS") return <Clock3 className={className} aria-hidden />;
  return <CircleDashed className={className} aria-hidden />;
}

function DataField({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold text-[var(--color-text-secondary)]">{label}</dt><dd className="mt-1 text-[var(--color-text)]">{value}</dd></div>;
}

function DateField({ label, value }: { label: string; value: string }) {
  return <DataField label={label} value={formatDate(value)} />;
}

function LoadingState() {
  return (
    <div className="flex flex-1 items-center justify-center p-6" role="status" aria-label="Cargando derivaciones">
      <div className="w-full max-w-2xl space-y-3">
        <div className="h-20 animate-pulse rounded-2xl bg-[var(--color-surface-subtle)]" />
        <div className="h-20 animate-pulse rounded-2xl bg-[var(--color-surface-subtle)]" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Empty className="flex-1 border-0 bg-[var(--color-canvas)]">
      <EmptyHeader>
        <EmptyTitle>No hay derivaciones para esta sesión</EmptyTitle>
        <EmptyDescription>No se encontraron solicitudes de reparación o cortes de calle en el alcance disponible.</EmptyDescription>
      </EmptyHeader>
      <ShieldAlert className="h-8 w-8 text-[var(--color-text-secondary)]" aria-hidden />
    </Empty>
  );
}
