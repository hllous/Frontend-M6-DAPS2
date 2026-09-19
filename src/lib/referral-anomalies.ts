import type { Referral } from "./referrals";
import type { Service } from "./services";

/**
 * Frontend hypothesis until M3/M7 publish an expected-response SLA.
 * Keep this in one place so the warning can be tuned without changing the UI.
 */
export const REFERRAL_STALE_AFTER_HOURS = 72;
export const REFERRAL_STALE_AFTER_MS = REFERRAL_STALE_AFTER_HOURS * 60 * 60 * 1000;

export type ReferralSourceChange = {
  field: string;
  recordedValue: string;
  currentValue: string;
};

export type ReferralAnomaly = {
  isStale: boolean;
  duplicateReferralIds: string[];
  sourceChanges: ReferralSourceChange[];
};

const terminalStatuses = new Set(["CLOSED", "REJECTED", "ENDED"]);

export function isReferralOpen(referral: Referral): boolean {
  return !terminalStatuses.has(referral.status);
}

export function isReferralStale(referral: Referral, now = new Date()): boolean {
  if (!isReferralOpen(referral)) return false;
  const lastActivity = Date.parse(referral.updatedAt || referral.createdAt);
  if (Number.isNaN(lastActivity)) return false;
  return now.getTime() - lastActivity > REFERRAL_STALE_AFTER_MS;
}

function duplicateIdsFor(referral: Referral, referrals: Referral[]): string[] {
  if (!isReferralOpen(referral)) return [];
  return referrals
    .filter((candidate) =>
      candidate.kind === referral.kind &&
      candidate.sourceId === referral.sourceId &&
      isReferralOpen(candidate),
    )
    .map((candidate) => candidate.id)
    .filter((id) => id !== referral.id);
}

function valueOrDash(value: string | null | undefined): string {
  return value || "—";
}

function sourceChangesFor(referral: Referral, service: Service | null | undefined): ReferralSourceChange[] {
  if (!service || referral.sourceType === "TREE_INTERVENTION") return [];

  if (referral.kind === "REPAIR_REQUEST") {
    return referral.sourceLabel === service.title
      ? []
      : [{ field: "Nombre del Servicio", recordedValue: referral.sourceLabel, currentValue: service.title }];
  }

  const recorded = referral.request.sourceContext;
  if (recorded.sourceType !== "SERVICE") return [];
  const comparisons: Array<[string, string, string]> = [
    ["Nombre del Servicio", recorded.title, service.title],
    ["Modalidad", recorded.mode, service.mode],
    ["Tipo de Servicio", recorded.serviceTypeName, service.serviceTypeName],
    ["Fecha programada", recorded.scheduledDate, service.scheduledDate],
    ["Inicio de ventana", valueOrDash(recorded.windowFrom), valueOrDash(service.windowFrom)],
    ["Fin de ventana", valueOrDash(recorded.windowTo), valueOrDash(service.windowTo)],
  ];

  return comparisons
    .filter(([, recordedValue, currentValue]) => recordedValue !== currentValue)
    .map(([field, recordedValue, currentValue]) => ({ field, recordedValue, currentValue }));
}

export function getReferralAnomaly(
  referral: Referral,
  referrals: Referral[],
  sourceService: Service | null | undefined,
  now = new Date(),
): ReferralAnomaly {
  return {
    isStale: isReferralStale(referral, now),
    duplicateReferralIds: duplicateIdsFor(referral, referrals),
    sourceChanges: sourceChangesFor(referral, sourceService),
  };
}

export function getReferralAnomalies(
  referrals: Referral[],
  sourceServices: ReadonlyMap<string, Service>,
  now = new Date(),
): Map<string, ReferralAnomaly> {
  return new Map(
    referrals.map((referral) => [
      referral.id,
      getReferralAnomaly(
        referral,
        referrals,
        referral.sourceServiceId ? sourceServices.get(referral.sourceServiceId) : undefined,
        now,
      ),
    ]),
  );
}
