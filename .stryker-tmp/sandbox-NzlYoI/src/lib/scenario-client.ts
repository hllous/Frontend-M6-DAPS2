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
import { meSchema, type M6Role } from "./m6-roles";
import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import type { OperationalScenario, ScenarioId } from "./scenarios";
import { recordTelemetryEvent } from "./telemetry";
export class ScenarioRequestError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    if (stryMutAct_9fa48("13651")) {
      {}
    } else {
      stryCov_9fa48("13651");
      super(message);
      this.name = stryMutAct_9fa48("13652") ? "" : (stryCov_9fa48("13652"), "ScenarioRequestError");
      this.status = status;
    }
  }
}
export async function loadScenario(id: ScenarioId): Promise<OperationalScenario> {
  if (stryMutAct_9fa48("13653")) {
    {}
  } else {
    stryCov_9fa48("13653");
    let response: Response;
    try {
      if (stryMutAct_9fa48("13654")) {
        {}
      } else {
        stryCov_9fa48("13654");
        response = await authenticatedFetch(stryMutAct_9fa48("13655") ? `` : (stryCov_9fa48("13655"), `/api/mock/scenarios/${id}`));
      }
    } catch (cause) {
      if (stryMutAct_9fa48("13656")) {
        {}
      } else {
        stryCov_9fa48("13656");
        if (stryMutAct_9fa48("13658") ? false : stryMutAct_9fa48("13657") ? true : (stryCov_9fa48("13657", "13658"), cause instanceof NetworkFailureError)) {
          if (stryMutAct_9fa48("13659")) {
            {}
          } else {
            stryCov_9fa48("13659");
            recordTelemetryEvent(stryMutAct_9fa48("13661") ? {} : (stryCov_9fa48("13661"), {
              name: stryMutAct_9fa48("13662") ? "" : (stryCov_9fa48("13662"), "request_network_failure"),
              resource: stryMutAct_9fa48("13663") ? "" : (stryCov_9fa48("13663"), "scenario")
            }));
          }
        }
        throw cause;
      }
    }
    if (stryMutAct_9fa48("13666") ? false : stryMutAct_9fa48("13665") ? true : stryMutAct_9fa48("13664") ? response.ok : (stryCov_9fa48("13664", "13665", "13666"), !response.ok)) {
      if (stryMutAct_9fa48("13667")) {
        {}
      } else {
        stryCov_9fa48("13667");
        const body = (await response.json().catch(() => undefined)) as {
          message?: string;
        } | undefined;
        throw new ScenarioRequestError(response.status, stryMutAct_9fa48("13669") ? body?.message && "Scenario request failed" : (stryCov_9fa48("13669"), (stryMutAct_9fa48("13670") ? body.message : (stryCov_9fa48("13670"), body?.message)) ?? (stryMutAct_9fa48("13671") ? "" : (stryCov_9fa48("13671"), "Scenario request failed"))));
      }
    }
    return response.json() as Promise<OperationalScenario>;
  }
}

/** Releé los roles de M6 (GET /me vía el BFF); la UI recalcula capacidades sin recargar. */
export async function loadRoles(): Promise<M6Role[]> {
  if (stryMutAct_9fa48("13672")) {
    {}
  } else {
    stryCov_9fa48("13672");
    const response = await authenticatedFetch(stryMutAct_9fa48("13673") ? "" : (stryCov_9fa48("13673"), "/api/me"));
    if (stryMutAct_9fa48("13676") ? false : stryMutAct_9fa48("13675") ? true : stryMutAct_9fa48("13674") ? response.ok : (stryCov_9fa48("13674", "13675", "13676"), !response.ok)) {
      if (stryMutAct_9fa48("13677")) {
        {}
      } else {
        stryCov_9fa48("13677");
        const body = (await response.json().catch(() => undefined)) as {
          message?: string;
        } | undefined;
        throw new ScenarioRequestError(response.status, stryMutAct_9fa48("13679") ? body?.message && "Roles request failed" : (stryCov_9fa48("13679"), (stryMutAct_9fa48("13680") ? body.message : (stryCov_9fa48("13680"), body?.message)) ?? (stryMutAct_9fa48("13681") ? "" : (stryCov_9fa48("13681"), "Roles request failed"))));
      }
    }
    return meSchema.parse(await response.json()).roles;
  }
}