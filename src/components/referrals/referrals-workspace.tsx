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
  RefreshCw,
  Route,
  ShieldAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { referralsAdapter, isReferralVisibleToScenario, type Referral } from "@/lib/referrals";
import type { OperationalScenario } from "@/lib/scenarios";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; referrals: Referral[] };

const referralKindLabel: Record<Referral["kind"], string> = {
  REPAIR_REQUEST: "M3 · Reparaciones",
  STREET_CLOSURE_REQUEST: "M7 · Cortes de calle",
};

const referralKindDescription: Record<Referral["kind"], string> = {
  REPAIR_REQUEST: "Daño detectado en un Servicio",
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
    return page.referrals.filter((referral) => isReferralVisibleToScenario(referral, scenario));
  }, [scenario]);

  useEffect(() => {
    let isCurrent = true;
    void fetchReferrals()
      .then((referrals) => {
        if (isCurrent) setLoadState({ status: "ready", referrals });
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
      .then((referrals) => setLoadState({ status: "ready", referrals }))
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

  if (selectedReferral) {
    return <ReferralDetail referral={selectedReferral} onBack={() => setSelectedId(null)} />;
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
        <div className="mx-auto flex w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
          <section className="w-full" aria-label="Lista de derivaciones" aria-describedby="referrals-scope-note">
            <p id="referrals-scope-note" className="sr-only">
              Seleccione una derivación para consultar su detalle. La información del Servicio se consulta mediante el enlace a su módulo de origen.
            </p>
            <ul className="grid gap-3" role="list">
              {loadState.referrals.map((referral) => (
                <ReferralRow key={`${referral.kind}-${referral.id}`} referral={referral} onOpen={() => setSelectedId(referral.id)} />
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

function ReferralRow({ referral, onOpen }: { referral: Referral; onOpen: () => void }) {
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
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-bold tabular-nums text-[var(--color-text)]">{referral.id}</span>
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{referralKindLabel[referral.kind]}</span>
          </span>
          <span className="mt-1 block truncate text-sm text-[var(--color-text)]">{referralKindDescription[referral.kind]}</span>
          <span className="mt-1 block truncate text-xs text-[var(--color-text-secondary)]">Servicio de origen: {referral.sourceServiceId} · {referral.sourceLabel}</span>
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

function ReferralDetail({ referral, onBack }: { referral: Referral; onBack: () => void }) {
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
              <h2 id="referral-source-title" className="text-sm font-bold text-[var(--color-text)]">Servicio de origen</h2>
              <p className="mt-1 text-sm text-[var(--color-text)]">{referral.sourceServiceId} · {referral.sourceLabel}</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">La información del Servicio se consulta en su módulo de origen.</p>
              <a className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-action)] underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]" href={referral.sourceHref}>
                Ver Servicio de origen
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        </section>

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
