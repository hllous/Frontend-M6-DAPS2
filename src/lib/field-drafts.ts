import { NetworkFailureError } from "./authenticated-fetch";
import { servicesAdapter, type Service } from "./services";

/**
 * Per ADR-0001: field execution actions (start, suspend/resume, ZoneResult,
 * Evidence capture) never queue for background sync. A draft composed
 * offline is kept on-device only, and manual resubmission re-checks the
 * Service against what the draft was originally composed against before
 * applying it. Evidence-upload retry is idempotent and exempt from this —
 * it keeps its existing automatic-retry-on-click behavior from ticket 5.
 */
export type FieldDraftActionType = "start" | "suspend" | "resume" | "zoneResult" | "repairRequest" | "streetClosureRequest" | "inspectionCompletion";

export type FieldDraftServiceSnapshot = Pick<
  Service,
  | "updatedAt"
  | "status"
  | "statusReason"
  | "crewId"
  | "crewName"
  | "vehicleId"
  | "vehiclePlate"
  | "scheduledDate"
  | "windowFrom"
  | "windowTo"
>;

export interface FieldDraft<TPayload = unknown> {
  serviceId: string;
  actionType: FieldDraftActionType;
  /** Disambiguates drafts within the same (serviceId, actionType) — e.g. a zoneId for ZoneResult drafts. */
  scope?: string;
  payload: TPayload;
  composedAgainst: FieldDraftServiceSnapshot;
  savedAt: string;
}

const STORAGE_PREFIX = "m6:field-draft:";

function draftKey(serviceId: string, actionType: FieldDraftActionType, scope?: string): string {
  return `${STORAGE_PREFIX}${serviceId}:${actionType}${scope ? `:${scope}` : ""}`;
}

export function snapshotService(service: Service): FieldDraftServiceSnapshot {
  return {
    updatedAt: service.updatedAt,
    status: service.status,
    statusReason: service.statusReason,
    crewId: service.crewId,
    crewName: service.crewName,
    vehicleId: service.vehicleId,
    vehiclePlate: service.vehiclePlate,
    scheduledDate: service.scheduledDate,
    windowFrom: service.windowFrom,
    windowTo: service.windowTo,
  };
}

export function saveFieldDraft<TPayload>(draft: FieldDraft<TPayload>): void {
  try {
    localStorage.setItem(
      draftKey(draft.serviceId, draft.actionType, draft.scope),
      JSON.stringify(draft),
    );
  } catch {
    // Best-effort: if storage is unavailable, the draft simply isn't retained on-device.
  }
}

export function getFieldDraft<TPayload>(
  serviceId: string,
  actionType: FieldDraftActionType,
  scope?: string,
): FieldDraft<TPayload> | null {
  try {
    const raw = localStorage.getItem(draftKey(serviceId, actionType, scope));
    if (!raw) return null;
    return JSON.parse(raw) as FieldDraft<TPayload>;
  } catch {
    return null;
  }
}

export function clearFieldDraft(
  serviceId: string,
  actionType: FieldDraftActionType,
  scope?: string,
): void {
  try {
    localStorage.removeItem(draftKey(serviceId, actionType, scope));
  } catch {
    // ignore
  }
}

/** True when the Service changed server-side since the draft was composed. */
export function hasServiceDrifted(
  composedAgainst: FieldDraftServiceSnapshot,
  current: Service,
): boolean {
  return composedAgainst.updatedAt !== current.updatedAt;
}

export type FieldActionOutcome<TPayload, TResult = Service> =
  | { kind: "success"; result: TResult }
  | { kind: "draft-saved"; draft: FieldDraft<TPayload> }
  | { kind: "error"; message: string };

/**
 * First attempt at a field action. On a real network failure the input is
 * preserved as a local draft (never auto-resubmitted); any other failure
 * (validation, a Backend rejection) is surfaced as a normal error instead.
 * TResult is whatever `submit` resolves to (a Service for start/suspend/resume,
 * a ZoneResult for recording zone execution results).
 */
export async function submitFieldAction<TPayload, TResult = Service>({
  service,
  actionType,
  scope,
  payload,
  submit,
}: {
  service: Service;
  actionType: FieldDraftActionType;
  scope?: string;
  payload: TPayload;
  submit: (payload: TPayload) => Promise<TResult>;
}): Promise<FieldActionOutcome<TPayload, TResult>> {
  try {
    const result = await submit(payload);
    clearFieldDraft(service.id, actionType, scope);
    return { kind: "success", result };
  } catch (cause) {
    if (cause instanceof NetworkFailureError) {
      const draft: FieldDraft<TPayload> = {
        serviceId: service.id,
        actionType,
        scope,
        payload,
        composedAgainst: snapshotService(service),
        savedAt: new Date().toISOString(),
      };
      saveFieldDraft(draft);
      return { kind: "draft-saved", draft };
    }
    const message = cause instanceof Error ? cause.message : "Ocurrió un error inesperado.";
    return { kind: "error", message };
  }
}

export type FieldActionResubmitOutcome<TResult = Service> =
  | { kind: "success"; result: TResult }
  | { kind: "conflict"; current: Service; composedAgainst: FieldDraftServiceSnapshot }
  | { kind: "still-offline" }
  | { kind: "error"; message: string };

/**
 * Manual resubmission of a local draft: fetches the Service's current state
 * first and compares it against what the draft was composed against. A
 * mismatch never applies the draft — it is surfaced as an explicit conflict
 * for the Crew Leader to resolve.
 */
export async function resubmitFieldAction<TPayload, TResult = Service>({
  serviceId,
  actionType,
  scope,
  composedAgainst,
  payload,
  submit,
}: {
  serviceId: string;
  actionType: FieldDraftActionType;
  scope?: string;
  composedAgainst: FieldDraftServiceSnapshot;
  payload: TPayload;
  submit: (payload: TPayload) => Promise<TResult>;
}): Promise<FieldActionResubmitOutcome<TResult>> {
  let current: Service;
  try {
    current = await servicesAdapter.get(serviceId);
  } catch (cause) {
    if (cause instanceof NetworkFailureError) return { kind: "still-offline" };
    return {
      kind: "error",
      message: cause instanceof Error ? cause.message : "Ocurrió un error inesperado.",
    };
  }

  if (hasServiceDrifted(composedAgainst, current)) {
    return { kind: "conflict", current, composedAgainst };
  }

  try {
    const result = await submit(payload);
    clearFieldDraft(serviceId, actionType, scope);
    return { kind: "success", result };
  } catch (cause) {
    if (cause instanceof NetworkFailureError) {
      // Still offline: keep the (possibly edited) draft pending, anchor unchanged.
      saveFieldDraft({
        serviceId,
        actionType,
        scope,
        payload,
        composedAgainst,
        savedAt: new Date().toISOString(),
      });
      return { kind: "still-offline" };
    }
    return {
      kind: "error",
      message: cause instanceof Error ? cause.message : "Ocurrió un error inesperado.",
    };
  }
}

/** Convenience wrapper: resubmits a stored draft verbatim (payload + anchor as saved). */
export async function retryFieldDraft<TPayload, TResult = Service>({
  draft,
  submit,
}: {
  draft: FieldDraft<TPayload>;
  submit: (payload: TPayload) => Promise<TResult>;
}): Promise<FieldActionResubmitOutcome<TResult>> {
  return resubmitFieldAction({
    serviceId: draft.serviceId,
    actionType: draft.actionType,
    scope: draft.scope,
    composedAgainst: draft.composedAgainst,
    payload: draft.payload,
    submit,
  });
}
