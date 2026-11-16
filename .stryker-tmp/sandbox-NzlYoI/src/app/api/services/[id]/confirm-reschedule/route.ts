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
import { findServiceFixture, serviceHistoryEntry } from "@/lib/bff-service-mock";
import { authorize, backendMode, errorResponse, forwardResponse, handleRouteError, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { updateServiceFixture } from "@/lib/services-fixtures";
import { confirmRescheduleInputSchema, STATUS_LABEL, toConfirmRescheduleBackendInput } from "@/lib/services";
import { getRequiredSession } from "@/lib/session";
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("4993")) {
    {}
  } else {
    stryCov_9fa48("4993");
    const params = await context.params;
    const serviceId = params.id;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("4994")) {
        {}
      } else {
        stryCov_9fa48("4994");
        const session = getRequiredSession(request);

        // Permission check: reprogramming is an Office decision, not a Field action.
        authorize(session, stryMutAct_9fa48("4996") ? {} : (stryCov_9fa48("4996"), {
          office: stryMutAct_9fa48("4997") ? false : (stryCov_9fa48("4997"), true),
          officeMessage: stryMutAct_9fa48("4998") ? "" : (stryCov_9fa48("4998"), "Solo Oficina puede confirmar la nueva fecha de un servicio."),
          capability: stryMutAct_9fa48("4999") ? "" : (stryCov_9fa48("4999"), "service:reschedule"),
          throwOnError: stryMutAct_9fa48("5000") ? false : (stryCov_9fa48("5000"), true)
        }));
        const parsed = await parseJsonBody(request, confirmRescheduleInputSchema, path);
        if (stryMutAct_9fa48("5002") ? false : stryMutAct_9fa48("5001") ? true : (stryCov_9fa48("5001", "5002"), parsed instanceof Response)) return parsed;
        const input = parsed.data;
        if (stryMutAct_9fa48("5004") ? false : stryMutAct_9fa48("5003") ? true : (stryCov_9fa48("5003", "5004"), backendMode(session))) {
          if (stryMutAct_9fa48("5005")) {
            {}
          } else {
            stryCov_9fa48("5005");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("5006") ? `` : (stryCov_9fa48("5006"), `/services/${pathId(serviceId)}/confirm-reschedule`), undefined, stryMutAct_9fa48("5007") ? {} : (stryCov_9fa48("5007"), {
              method: stryMutAct_9fa48("5008") ? "" : (stryCov_9fa48("5008"), "POST"),
              headers: stryMutAct_9fa48("5009") ? {} : (stryCov_9fa48("5009"), {
                "content-type": stryMutAct_9fa48("5010") ? "" : (stryCov_9fa48("5010"), "application/json")
              }),
              body: JSON.stringify(toConfirmRescheduleBackendInput(input))
            }));
            return forwardResponse(backendResponse);
          }
        }
        const service = findServiceFixture(serviceId, path);
        if (stryMutAct_9fa48("5012") ? false : stryMutAct_9fa48("5011") ? true : (stryCov_9fa48("5011", "5012"), service instanceof Response)) return service;
        if (stryMutAct_9fa48("5015") ? service.status === "RESCHEDULED" : stryMutAct_9fa48("5014") ? false : stryMutAct_9fa48("5013") ? true : (stryCov_9fa48("5013", "5014", "5015"), service.status !== (stryMutAct_9fa48("5016") ? "" : (stryCov_9fa48("5016"), "RESCHEDULED")))) {
          if (stryMutAct_9fa48("5017")) {
            {}
          } else {
            stryCov_9fa48("5017");
            return errorResponse(409, stryMutAct_9fa48("5018") ? `` : (stryCov_9fa48("5018"), `Solo se puede confirmar la nueva fecha de servicios a reprogramar (estado actual: ${STATUS_LABEL[service.status]}).`), path);
          }
        }

        // zoneIds/routeId are an immutable snapshot: this transition never touches them,
        // only the date/window that RESCHEDULED left pending.
        const updated = updateServiceFixture(service.id, stryMutAct_9fa48("5019") ? {} : (stryCov_9fa48("5019"), {
          status: stryMutAct_9fa48("5020") ? "" : (stryCov_9fa48("5020"), "SCHEDULED"),
          statusReason: null,
          scheduledDate: input.scheduledDate,
          windowFrom: input.timeWindow.start,
          windowTo: input.timeWindow.end,
          history: stryMutAct_9fa48("5021") ? [] : (stryCov_9fa48("5021"), [...service.history, serviceHistoryEntry(stryMutAct_9fa48("5022") ? "" : (stryCov_9fa48("5022"), "Programado"))])
        }));
        return NextResponse.json(updated, stryMutAct_9fa48("5023") ? {} : (stryCov_9fa48("5023"), {
          status: 200
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("5024")) {
        {}
      } else {
        stryCov_9fa48("5024");
        return handleRouteError(error, path, stryMutAct_9fa48("5025") ? "" : (stryCov_9fa48("5025"), "No se pudo confirmar la reprogramación del servicio."));
      }
    }
  }
}