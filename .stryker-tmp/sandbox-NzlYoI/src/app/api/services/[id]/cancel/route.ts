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
import { cancelServiceInputSchema, STATUS_LABEL } from "@/lib/services";
import { getRequiredSession } from "@/lib/session";
const CANCELLABLE_STATUSES = new Set(stryMutAct_9fa48("4771") ? [] : (stryCov_9fa48("4771"), [stryMutAct_9fa48("4772") ? "" : (stryCov_9fa48("4772"), "SCHEDULED"), stryMutAct_9fa48("4773") ? "" : (stryCov_9fa48("4773"), "RESCHEDULED"), stryMutAct_9fa48("4774") ? "" : (stryCov_9fa48("4774"), "SUSPENDED")]));
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("4775")) {
    {}
  } else {
    stryCov_9fa48("4775");
    const params = await context.params;
    const serviceId = params.id;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("4776")) {
        {}
      } else {
        stryCov_9fa48("4776");
        const session = getRequiredSession(request);

        // Permission check: cancellation is an Office decision, not a Field action.
        authorize(session, stryMutAct_9fa48("4778") ? {} : (stryCov_9fa48("4778"), {
          office: stryMutAct_9fa48("4779") ? false : (stryCov_9fa48("4779"), true),
          officeMessage: stryMutAct_9fa48("4780") ? "" : (stryCov_9fa48("4780"), "Solo Oficina puede cancelar un servicio."),
          capability: stryMutAct_9fa48("4781") ? "" : (stryCov_9fa48("4781"), "service:cancel"),
          throwOnError: stryMutAct_9fa48("4782") ? false : (stryCov_9fa48("4782"), true)
        }));
        const parsed = await parseJsonBody(request, cancelServiceInputSchema, path);
        if (stryMutAct_9fa48("4784") ? false : stryMutAct_9fa48("4783") ? true : (stryCov_9fa48("4783", "4784"), parsed instanceof Response)) return parsed;
        const input = parsed.data;
        if (stryMutAct_9fa48("4786") ? false : stryMutAct_9fa48("4785") ? true : (stryCov_9fa48("4785", "4786"), backendMode(session))) {
          if (stryMutAct_9fa48("4787")) {
            {}
          } else {
            stryCov_9fa48("4787");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("4788") ? `` : (stryCov_9fa48("4788"), `/services/${pathId(serviceId)}/cancel`), undefined, stryMutAct_9fa48("4789") ? {} : (stryCov_9fa48("4789"), {
              method: stryMutAct_9fa48("4790") ? "" : (stryCov_9fa48("4790"), "POST"),
              headers: stryMutAct_9fa48("4791") ? {} : (stryCov_9fa48("4791"), {
                "content-type": stryMutAct_9fa48("4792") ? "" : (stryCov_9fa48("4792"), "application/json")
              }),
              body: JSON.stringify(input)
            }));
            return forwardResponse(backendResponse);
          }
        }
        const service = findServiceFixture(serviceId, path);
        if (stryMutAct_9fa48("4794") ? false : stryMutAct_9fa48("4793") ? true : (stryCov_9fa48("4793", "4794"), service instanceof Response)) return service;
        if (stryMutAct_9fa48("4797") ? false : stryMutAct_9fa48("4796") ? true : stryMutAct_9fa48("4795") ? CANCELLABLE_STATUSES.has(service.status) : (stryCov_9fa48("4795", "4796", "4797"), !CANCELLABLE_STATUSES.has(service.status))) {
          if (stryMutAct_9fa48("4798")) {
            {}
          } else {
            stryCov_9fa48("4798");
            const message = (stryMutAct_9fa48("4801") ? service.status !== "IN_PROGRESS" : stryMutAct_9fa48("4800") ? false : stryMutAct_9fa48("4799") ? true : (stryCov_9fa48("4799", "4800", "4801"), service.status === (stryMutAct_9fa48("4802") ? "" : (stryCov_9fa48("4802"), "IN_PROGRESS")))) ? stryMutAct_9fa48("4803") ? `` : (stryCov_9fa48("4803"), `No se puede cancelar un servicio en curso directamente; debe suspenderse primero.`) : stryMutAct_9fa48("4804") ? `` : (stryCov_9fa48("4804"), `Solo se pueden cancelar servicios programados, a reprogramar o suspendidos (estado actual: ${STATUS_LABEL[service.status]}).`);
            return errorResponse(409, message, path);
          }
        }

        // zoneIds/routeId/scheduledDate are left untouched: cancellation never invents a replacement date.
        const updated = updateServiceFixture(service.id, stryMutAct_9fa48("4805") ? {} : (stryCov_9fa48("4805"), {
          status: stryMutAct_9fa48("4806") ? "" : (stryCov_9fa48("4806"), "CANCELLED"),
          statusReason: input.reason,
          statusNote: null,
          history: stryMutAct_9fa48("4807") ? [] : (stryCov_9fa48("4807"), [...service.history, serviceHistoryEntry(stryMutAct_9fa48("4808") ? "" : (stryCov_9fa48("4808"), "Cancelado"))])
        }));
        return NextResponse.json(updated, stryMutAct_9fa48("4809") ? {} : (stryCov_9fa48("4809"), {
          status: 200
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("4810")) {
        {}
      } else {
        stryCov_9fa48("4810");
        return handleRouteError(error, path, stryMutAct_9fa48("4811") ? "" : (stryCov_9fa48("4811"), "No se pudo cancelar el servicio."));
      }
    }
  }
}