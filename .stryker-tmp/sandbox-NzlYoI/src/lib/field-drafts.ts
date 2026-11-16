// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { NetworkFailureError } from "./authenticated-fetch";
import { registerSessionLogoutCleanup } from "./session-client";
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
export type FieldDraftServiceSnapshot = Pick<Service, "updatedAt" | "status" | "statusReason" | "crewId" | "crewName" | "vehicleId" | "vehiclePlate" | "scheduledDate" | "windowFrom" | "windowTo">;
export interface FieldDraft<TPayload = unknown> {
  serviceId: string;
  actionType: FieldDraftActionType;
  /** Disambiguates drafts within the same (serviceId, actionType) — e.g. a zoneId for ZoneResult drafts. */
  scope?: string;
  payload: TPayload;
  composedAgainst: FieldDraftServiceSnapshot;
  savedAt: string;
}
const STORAGE_PREFIX = stryMutAct_9fa48("9085") ? "" : (stryCov_9fa48("9085"), "m6:field-draft:");
const ACTOR_STORAGE_PREFIX = stryMutAct_9fa48("9086") ? `` : (stryCov_9fa48("9086"), `${STORAGE_PREFIX}v2:`);
let draftOwner: string | undefined;
const ownerListeners = new Set<() => void>();
const DRAFT_UNSAVED_MESSAGE = stryMutAct_9fa48("9087") ? "" : (stryCov_9fa48("9087"), "No se pudo guardar el borrador en este dispositivo. No cierre esta pantalla: sus datos siguen en el formulario.");
export function getFieldDraftOwner(): string | undefined {
  if (stryMutAct_9fa48("9088")) {
    {}
  } else {
    stryCov_9fa48("9088");
    return draftOwner;
  }
}
export function subscribeFieldDraftOwner(listener: () => void): () => void {
  if (stryMutAct_9fa48("9089")) {
    {}
  } else {
    stryCov_9fa48("9089");
    if (stryMutAct_9fa48("9090")) {
      ;
    } else {
      stryCov_9fa48("9090");
      ownerListeners.add(listener);
    }
    return () => {
      if (stryMutAct_9fa48("9091")) {
        {}
      } else {
        stryCov_9fa48("9091");
        if (stryMutAct_9fa48("9092")) {
          ;
        } else {
          stryCov_9fa48("9092");
          ownerListeners.delete(listener);
        }
      }
    };
  }
}

/** Set from the public session before any Field component reads storage. */
export function setFieldDraftOwner(actorId: string | undefined): void {
  if (stryMutAct_9fa48("9093")) {
    {}
  } else {
    stryCov_9fa48("9093");
    try {
      if (stryMutAct_9fa48("9094")) {
        {}
      } else {
        stryCov_9fa48("9094");
        // Old unscoped drafts have no trustworthy owner. Never migrate their contents.
        for (let index = stryMutAct_9fa48("9095") ? localStorage.length + 1 : (stryCov_9fa48("9095"), localStorage.length - 1); stryMutAct_9fa48("9098") ? index < 0 : stryMutAct_9fa48("9097") ? index > 0 : stryMutAct_9fa48("9096") ? false : (stryCov_9fa48("9096", "9097", "9098"), index >= 0); stryMutAct_9fa48("9099") ? index++ : (stryCov_9fa48("9099"), index--)) {
          if (stryMutAct_9fa48("9100")) {
            {}
          } else {
            stryCov_9fa48("9100");
            const key = localStorage.key(index);
            if (stryMutAct_9fa48("9103") ? key?.startsWith(STORAGE_PREFIX) || !key.startsWith(ACTOR_STORAGE_PREFIX) : stryMutAct_9fa48("9102") ? false : stryMutAct_9fa48("9101") ? true : (stryCov_9fa48("9101", "9102", "9103"), (stryMutAct_9fa48("9105") ? key.startsWith(STORAGE_PREFIX) : stryMutAct_9fa48("9104") ? key?.endsWith(STORAGE_PREFIX) : (stryCov_9fa48("9104", "9105"), key?.startsWith(STORAGE_PREFIX))) && (stryMutAct_9fa48("9106") ? key.startsWith(ACTOR_STORAGE_PREFIX) : (stryCov_9fa48("9106"), !(stryMutAct_9fa48("9107") ? key.endsWith(ACTOR_STORAGE_PREFIX) : (stryCov_9fa48("9107"), key.startsWith(ACTOR_STORAGE_PREFIX))))))) if (stryMutAct_9fa48("9108")) {
              ;
            } else {
              stryCov_9fa48("9108");
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch {
      // Storage may be unavailable; reads/writes still fail closed below.
    }
    if (stryMutAct_9fa48("9111") ? draftOwner !== actorId : stryMutAct_9fa48("9110") ? false : stryMutAct_9fa48("9109") ? true : (stryCov_9fa48("9109", "9110", "9111"), draftOwner === actorId)) return;
    draftOwner = actorId;
    ownerListeners.forEach(stryMutAct_9fa48("9113") ? () => undefined : (stryCov_9fa48("9113"), listener => listener()));
  }
}
export function clearAllFieldDrafts(): void {
  if (stryMutAct_9fa48("9114")) {
    {}
  } else {
    stryCov_9fa48("9114");
    if (stryMutAct_9fa48("9115")) {
      ;
    } else {
      stryCov_9fa48("9115");
      setFieldDraftOwner(undefined);
    }
    try {
      if (stryMutAct_9fa48("9116")) {
        {}
      } else {
        stryCov_9fa48("9116");
        for (let index = stryMutAct_9fa48("9117") ? localStorage.length + 1 : (stryCov_9fa48("9117"), localStorage.length - 1); stryMutAct_9fa48("9120") ? index < 0 : stryMutAct_9fa48("9119") ? index > 0 : stryMutAct_9fa48("9118") ? false : (stryCov_9fa48("9118", "9119", "9120"), index >= 0); stryMutAct_9fa48("9121") ? index++ : (stryCov_9fa48("9121"), index--)) {
          if (stryMutAct_9fa48("9122")) {
            {}
          } else {
            stryCov_9fa48("9122");
            const key = localStorage.key(index);
            if (stryMutAct_9fa48("9126") ? key.startsWith(STORAGE_PREFIX) : stryMutAct_9fa48("9125") ? key?.endsWith(STORAGE_PREFIX) : stryMutAct_9fa48("9124") ? false : stryMutAct_9fa48("9123") ? true : (stryCov_9fa48("9123", "9124", "9125", "9126"), key?.startsWith(STORAGE_PREFIX))) if (stryMutAct_9fa48("9127")) {
              ;
            } else {
              stryCov_9fa48("9127");
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch {
      // Logout still proceeds when storage is unavailable.
    }
  }
}
function draftKey(serviceId: string, actionType: FieldDraftActionType, scope?: string): string {
  if (stryMutAct_9fa48("9128")) {
    {}
  } else {
    stryCov_9fa48("9128");
    return stryMutAct_9fa48("9129") ? `` : (stryCov_9fa48("9129"), `${ACTOR_STORAGE_PREFIX}${encodeURIComponent(draftOwner!)}:${serviceId}:${actionType}${scope ? stryMutAct_9fa48("9130") ? `` : (stryCov_9fa48("9130"), `:${scope}`) : stryMutAct_9fa48("9131") ? "Stryker was here!" : (stryCov_9fa48("9131"), "")}`);
  }
}
export function snapshotService(service: Service): FieldDraftServiceSnapshot {
  if (stryMutAct_9fa48("9132")) {
    {}
  } else {
    stryCov_9fa48("9132");
    return stryMutAct_9fa48("9133") ? {} : (stryCov_9fa48("9133"), {
      updatedAt: service.updatedAt,
      status: service.status,
      statusReason: service.statusReason,
      crewId: service.crewId,
      crewName: service.crewName,
      vehicleId: service.vehicleId,
      vehiclePlate: service.vehiclePlate,
      scheduledDate: service.scheduledDate,
      windowFrom: service.windowFrom,
      windowTo: service.windowTo
    });
  }
}
export function saveFieldDraft<TPayload>(draft: FieldDraft<TPayload>): boolean {
  if (stryMutAct_9fa48("9134")) {
    {}
  } else {
    stryCov_9fa48("9134");
    if (stryMutAct_9fa48("9137") ? false : stryMutAct_9fa48("9136") ? true : stryMutAct_9fa48("9135") ? draftOwner : (stryCov_9fa48("9135", "9136", "9137"), !draftOwner)) return stryMutAct_9fa48("9138") ? true : (stryCov_9fa48("9138"), false);
    try {
      if (stryMutAct_9fa48("9139")) {
        {}
      } else {
        stryCov_9fa48("9139");
        if (stryMutAct_9fa48("9140")) {
          ;
        } else {
          stryCov_9fa48("9140");
          localStorage.setItem(draftKey(draft.serviceId, draft.actionType, draft.scope), JSON.stringify(draft));
        }
        return stryMutAct_9fa48("9141") ? false : (stryCov_9fa48("9141"), true);
      }
    } catch {
      if (stryMutAct_9fa48("9142")) {
        {}
      } else {
        stryCov_9fa48("9142");
        // Best-effort: if storage is unavailable, the draft simply isn't retained on-device.
        return stryMutAct_9fa48("9143") ? true : (stryCov_9fa48("9143"), false);
      }
    }
  }
}
export function getFieldDraft<TPayload>(serviceId: string, actionType: FieldDraftActionType, scope?: string): FieldDraft<TPayload> | null {
  if (stryMutAct_9fa48("9144")) {
    {}
  } else {
    stryCov_9fa48("9144");
    if (stryMutAct_9fa48("9147") ? false : stryMutAct_9fa48("9146") ? true : stryMutAct_9fa48("9145") ? draftOwner : (stryCov_9fa48("9145", "9146", "9147"), !draftOwner)) return null;
    try {
      if (stryMutAct_9fa48("9148")) {
        {}
      } else {
        stryCov_9fa48("9148");
        const raw = localStorage.getItem(draftKey(serviceId, actionType, scope));
        if (stryMutAct_9fa48("9151") ? false : stryMutAct_9fa48("9150") ? true : stryMutAct_9fa48("9149") ? raw : (stryCov_9fa48("9149", "9150", "9151"), !raw)) return null;
        return JSON.parse(raw) as FieldDraft<TPayload>;
      }
    } catch {
      if (stryMutAct_9fa48("9152")) {
        {}
      } else {
        stryCov_9fa48("9152");
        return null;
      }
    }
  }
}
export function clearFieldDraft(serviceId: string, actionType: FieldDraftActionType, scope?: string): void {
  if (stryMutAct_9fa48("9153")) {
    {}
  } else {
    stryCov_9fa48("9153");
    if (stryMutAct_9fa48("9156") ? false : stryMutAct_9fa48("9155") ? true : stryMutAct_9fa48("9154") ? draftOwner : (stryCov_9fa48("9154", "9155", "9156"), !draftOwner)) return;
    try {
      if (stryMutAct_9fa48("9157")) {
        {}
      } else {
        stryCov_9fa48("9157");
        if (stryMutAct_9fa48("9158")) {
          ;
        } else {
          stryCov_9fa48("9158");
          localStorage.removeItem(draftKey(serviceId, actionType, scope));
        }
      }
    } catch {
      // ignore
    }
  }
}

// The session client is also imported by service adapters, so register cleanup
// here instead of making that shared module import this services-dependent module.
if (stryMutAct_9fa48("9159")) {
  ;
} else {
  stryCov_9fa48("9159");
  registerSessionLogoutCleanup(clearAllFieldDrafts);
}
/** True when the Service changed server-side since the draft was composed. */
export function hasServiceDrifted(composedAgainst: FieldDraftServiceSnapshot, current: Service): boolean {
  if (stryMutAct_9fa48("9160")) {
    {}
  } else {
    stryCov_9fa48("9160");
    return stryMutAct_9fa48("9163") ? composedAgainst.updatedAt === current.updatedAt : stryMutAct_9fa48("9162") ? false : stryMutAct_9fa48("9161") ? true : (stryCov_9fa48("9161", "9162", "9163"), composedAgainst.updatedAt !== current.updatedAt);
  }
}
export type FieldActionOutcome<TPayload, TResult = Service> = {
  kind: "success";
  result: TResult;
} | {
  kind: "draft-saved";
  draft: FieldDraft<TPayload>;
} | {
  kind: "error";
  message: string;
  draftUnsaved?: true;
};

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
  submit
}: {
  service: Service;
  actionType: FieldDraftActionType;
  scope?: string;
  payload: TPayload;
  submit: (payload: TPayload) => Promise<TResult>;
}): Promise<FieldActionOutcome<TPayload, TResult>> {
  if (stryMutAct_9fa48("9164")) {
    {}
  } else {
    stryCov_9fa48("9164");
    try {
      if (stryMutAct_9fa48("9165")) {
        {}
      } else {
        stryCov_9fa48("9165");
        const result = await submit(payload);
        if (stryMutAct_9fa48("9166")) {
          ;
        } else {
          stryCov_9fa48("9166");
          clearFieldDraft(service.id, actionType, scope);
        }
        return stryMutAct_9fa48("9167") ? {} : (stryCov_9fa48("9167"), {
          kind: stryMutAct_9fa48("9168") ? "" : (stryCov_9fa48("9168"), "success"),
          result
        });
      }
    } catch (cause) {
      if (stryMutAct_9fa48("9169")) {
        {}
      } else {
        stryCov_9fa48("9169");
        if (stryMutAct_9fa48("9171") ? false : stryMutAct_9fa48("9170") ? true : (stryCov_9fa48("9170", "9171"), cause instanceof NetworkFailureError)) {
          if (stryMutAct_9fa48("9172")) {
            {}
          } else {
            stryCov_9fa48("9172");
            const draft: FieldDraft<TPayload> = stryMutAct_9fa48("9173") ? {} : (stryCov_9fa48("9173"), {
              serviceId: service.id,
              actionType,
              scope,
              payload,
              composedAgainst: snapshotService(service),
              savedAt: new Date().toISOString()
            });
            if (stryMutAct_9fa48("9176") ? false : stryMutAct_9fa48("9175") ? true : stryMutAct_9fa48("9174") ? saveFieldDraft(draft) : (stryCov_9fa48("9174", "9175", "9176"), !saveFieldDraft(draft))) {
              if (stryMutAct_9fa48("9177")) {
                {}
              } else {
                stryCov_9fa48("9177");
                return stryMutAct_9fa48("9178") ? {} : (stryCov_9fa48("9178"), {
                  kind: stryMutAct_9fa48("9179") ? "" : (stryCov_9fa48("9179"), "error"),
                  message: DRAFT_UNSAVED_MESSAGE,
                  draftUnsaved: stryMutAct_9fa48("9180") ? false : (stryCov_9fa48("9180"), true)
                });
              }
            }
            return stryMutAct_9fa48("9181") ? {} : (stryCov_9fa48("9181"), {
              kind: stryMutAct_9fa48("9182") ? "" : (stryCov_9fa48("9182"), "draft-saved"),
              draft
            });
          }
        }
        const message = cause instanceof Error ? cause.message : stryMutAct_9fa48("9183") ? "" : (stryCov_9fa48("9183"), "Ocurrió un error inesperado.");
        return stryMutAct_9fa48("9184") ? {} : (stryCov_9fa48("9184"), {
          kind: stryMutAct_9fa48("9185") ? "" : (stryCov_9fa48("9185"), "error"),
          message
        });
      }
    }
  }
}
export type FieldActionResubmitOutcome<TResult = Service> = {
  kind: "success";
  result: TResult;
} | {
  kind: "conflict";
  current: Service;
  composedAgainst: FieldDraftServiceSnapshot;
} | {
  kind: "still-offline";
} | {
  kind: "error";
  message: string;
  draftUnsaved?: true;
};

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
  submit
}: {
  serviceId: string;
  actionType: FieldDraftActionType;
  scope?: string;
  composedAgainst: FieldDraftServiceSnapshot;
  payload: TPayload;
  submit: (payload: TPayload) => Promise<TResult>;
}): Promise<FieldActionResubmitOutcome<TResult>> {
  if (stryMutAct_9fa48("9186")) {
    {}
  } else {
    stryCov_9fa48("9186");
    let current: Service;
    try {
      if (stryMutAct_9fa48("9187")) {
        {}
      } else {
        stryCov_9fa48("9187");
        current = await servicesAdapter.get(serviceId);
      }
    } catch (cause) {
      if (stryMutAct_9fa48("9188")) {
        {}
      } else {
        stryCov_9fa48("9188");
        if (stryMutAct_9fa48("9190") ? false : stryMutAct_9fa48("9189") ? true : (stryCov_9fa48("9189", "9190"), cause instanceof NetworkFailureError)) return stryMutAct_9fa48("9191") ? {} : (stryCov_9fa48("9191"), {
          kind: stryMutAct_9fa48("9192") ? "" : (stryCov_9fa48("9192"), "still-offline")
        });
        return stryMutAct_9fa48("9193") ? {} : (stryCov_9fa48("9193"), {
          kind: stryMutAct_9fa48("9194") ? "" : (stryCov_9fa48("9194"), "error"),
          message: cause instanceof Error ? cause.message : stryMutAct_9fa48("9195") ? "" : (stryCov_9fa48("9195"), "Ocurrió un error inesperado.")
        });
      }
    }
    if (stryMutAct_9fa48("9197") ? false : stryMutAct_9fa48("9196") ? true : (stryCov_9fa48("9196", "9197"), hasServiceDrifted(composedAgainst, current))) {
      if (stryMutAct_9fa48("9198")) {
        {}
      } else {
        stryCov_9fa48("9198");
        return stryMutAct_9fa48("9199") ? {} : (stryCov_9fa48("9199"), {
          kind: stryMutAct_9fa48("9200") ? "" : (stryCov_9fa48("9200"), "conflict"),
          current,
          composedAgainst
        });
      }
    }
    try {
      if (stryMutAct_9fa48("9201")) {
        {}
      } else {
        stryCov_9fa48("9201");
        const result = await submit(payload);
        if (stryMutAct_9fa48("9202")) {
          ;
        } else {
          stryCov_9fa48("9202");
          clearFieldDraft(serviceId, actionType, scope);
        }
        return stryMutAct_9fa48("9203") ? {} : (stryCov_9fa48("9203"), {
          kind: stryMutAct_9fa48("9204") ? "" : (stryCov_9fa48("9204"), "success"),
          result
        });
      }
    } catch (cause) {
      if (stryMutAct_9fa48("9205")) {
        {}
      } else {
        stryCov_9fa48("9205");
        if (stryMutAct_9fa48("9207") ? false : stryMutAct_9fa48("9206") ? true : (stryCov_9fa48("9206", "9207"), cause instanceof NetworkFailureError)) {
          if (stryMutAct_9fa48("9208")) {
            {}
          } else {
            stryCov_9fa48("9208");
            // Still offline: keep the (possibly edited) draft pending, anchor unchanged.
            const saved = saveFieldDraft(stryMutAct_9fa48("9209") ? {} : (stryCov_9fa48("9209"), {
              serviceId,
              actionType,
              scope,
              payload,
              composedAgainst,
              savedAt: new Date().toISOString()
            }));
            if (stryMutAct_9fa48("9212") ? false : stryMutAct_9fa48("9211") ? true : stryMutAct_9fa48("9210") ? saved : (stryCov_9fa48("9210", "9211", "9212"), !saved)) {
              if (stryMutAct_9fa48("9213")) {
                {}
              } else {
                stryCov_9fa48("9213");
                return stryMutAct_9fa48("9214") ? {} : (stryCov_9fa48("9214"), {
                  kind: stryMutAct_9fa48("9215") ? "" : (stryCov_9fa48("9215"), "error"),
                  message: DRAFT_UNSAVED_MESSAGE,
                  draftUnsaved: stryMutAct_9fa48("9216") ? false : (stryCov_9fa48("9216"), true)
                });
              }
            }
            return stryMutAct_9fa48("9217") ? {} : (stryCov_9fa48("9217"), {
              kind: stryMutAct_9fa48("9218") ? "" : (stryCov_9fa48("9218"), "still-offline")
            });
          }
        }
        return stryMutAct_9fa48("9219") ? {} : (stryCov_9fa48("9219"), {
          kind: stryMutAct_9fa48("9220") ? "" : (stryCov_9fa48("9220"), "error"),
          message: cause instanceof Error ? cause.message : stryMutAct_9fa48("9221") ? "" : (stryCov_9fa48("9221"), "Ocurrió un error inesperado.")
        });
      }
    }
  }
}

/** Convenience wrapper: resubmits a stored draft verbatim (payload + anchor as saved). */
export async function retryFieldDraft<TPayload, TResult = Service>({
  draft,
  submit
}: {
  draft: FieldDraft<TPayload>;
  submit: (payload: TPayload) => Promise<TResult>;
}): Promise<FieldActionResubmitOutcome<TResult>> {
  if (stryMutAct_9fa48("9222")) {
    {}
  } else {
    stryCov_9fa48("9222");
    return resubmitFieldAction(stryMutAct_9fa48("9223") ? {} : (stryCov_9fa48("9223"), {
      serviceId: draft.serviceId,
      actionType: draft.actionType,
      scope: draft.scope,
      composedAgainst: draft.composedAgainst,
      payload: draft.payload,
      submit
    }));
  }
}