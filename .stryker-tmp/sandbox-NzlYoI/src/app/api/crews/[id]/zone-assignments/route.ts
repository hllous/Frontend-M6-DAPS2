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
import { authorize, backendMode, errorResponse, forwardResponse, mapSessionError, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { addCrewZoneAssignmentFixture, crewFixtures, listCrewZoneAssignmentFixtures, overlapsCrewZoneAssignment } from "@/lib/crew-fixtures";
import { createCrewZoneAssignmentInputSchema } from "@/lib/crew-zone-assignments";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
type Context = {
  params: Promise<{
    id: string;
  }>;
};
const OVERLAP_MESSAGE = stryMutAct_9fa48("949") ? "" : (stryCov_9fa48("949"), "El período indicado se superpone con otra reubicación de esta cuadrilla. Ajuste las fechas.");
function mapError(error: unknown, path: string, fallback: string) {
  if (stryMutAct_9fa48("950")) {
    {}
  } else {
    stryCov_9fa48("950");
    if (stryMutAct_9fa48("952") ? false : stryMutAct_9fa48("951") ? true : (stryCov_9fa48("951", "952"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("953") ? "" : (stryCov_9fa48("953"), "La sesión no está activa."), path);
    if (stryMutAct_9fa48("955") ? false : stryMutAct_9fa48("954") ? true : (stryCov_9fa48("954", "955"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
    if (stryMutAct_9fa48("957") ? false : stryMutAct_9fa48("956") ? true : (stryCov_9fa48("956", "957"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, fallback);
  }
}
export async function GET(request: Request, routeContext: Context) {
  if (stryMutAct_9fa48("958")) {
    {}
  } else {
    stryCov_9fa48("958");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("959")) {
        {}
      } else {
        stryCov_9fa48("959");
        const {
          id
        } = await routeContext.params;
        const session = getRequiredSession(request);
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("962") ? scenario.actor.kind === "FIELD" || scenario.actor.crewId !== id : stryMutAct_9fa48("961") ? false : stryMutAct_9fa48("960") ? true : (stryCov_9fa48("960", "961", "962"), (stryMutAct_9fa48("964") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("963") ? true : (stryCov_9fa48("963", "964"), scenario.actor.kind === (stryMutAct_9fa48("965") ? "" : (stryCov_9fa48("965"), "FIELD")))) && (stryMutAct_9fa48("967") ? scenario.actor.crewId === id : stryMutAct_9fa48("966") ? true : (stryCov_9fa48("966", "967"), scenario.actor.crewId !== id)))) throw new ForbiddenSessionError(stryMutAct_9fa48("969") ? "" : (stryCov_9fa48("969"), "Solo puede consultar su propia cuadrilla."));
        if (stryMutAct_9fa48("971") ? false : stryMutAct_9fa48("970") ? true : (stryCov_9fa48("970", "971"), backendMode(session))) return forwardResponse(await fetchBackend(request, stryMutAct_9fa48("972") ? `` : (stryCov_9fa48("972"), `/crews/${pathId(id)}/zone-assignments`)));
        if (stryMutAct_9fa48("975") ? false : stryMutAct_9fa48("974") ? true : stryMutAct_9fa48("973") ? crewFixtures.some(item => item.id === id) : (stryCov_9fa48("973", "974", "975"), !(stryMutAct_9fa48("976") ? crewFixtures.every(item => item.id === id) : (stryCov_9fa48("976"), crewFixtures.some(stryMutAct_9fa48("977") ? () => undefined : (stryCov_9fa48("977"), item => stryMutAct_9fa48("980") ? item.id !== id : stryMutAct_9fa48("979") ? false : stryMutAct_9fa48("978") ? true : (stryCov_9fa48("978", "979", "980"), item.id === id))))))) return errorResponse(404, stryMutAct_9fa48("981") ? `` : (stryCov_9fa48("981"), `La cuadrilla ${id} no existe.`), path);
        return NextResponse.json(stryMutAct_9fa48("982") ? {} : (stryCov_9fa48("982"), {
          data: listCrewZoneAssignmentFixtures(id)
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("983")) {
        {}
      } else {
        stryCov_9fa48("983");
        return mapError(error, path, stryMutAct_9fa48("984") ? "" : (stryCov_9fa48("984"), "No se pudo cargar el historial de reubicaciones."));
      }
    }
  }
}
export async function POST(request: Request, routeContext: Context) {
  if (stryMutAct_9fa48("985")) {
    {}
  } else {
    stryCov_9fa48("985");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("986")) {
        {}
      } else {
        stryCov_9fa48("986");
        const {
          id
        } = await routeContext.params;
        const {
          session
        } = authorize(request, stryMutAct_9fa48("987") ? {} : (stryCov_9fa48("987"), {
          office: stryMutAct_9fa48("988") ? false : (stryCov_9fa48("988"), true),
          officeMessage: stryMutAct_9fa48("989") ? "" : (stryCov_9fa48("989"), "Solo Operaciones puede reubicar cuadrillas."),
          capability: stryMutAct_9fa48("990") ? "" : (stryCov_9fa48("990"), "service:assign"),
          capabilityMessage: stryMutAct_9fa48("991") ? "" : (stryCov_9fa48("991"), "Solo Operaciones puede reubicar cuadrillas."),
          throwOnError: stryMutAct_9fa48("992") ? false : (stryCov_9fa48("992"), true)
        }));
        const parsed = await parseJsonBody(request, createCrewZoneAssignmentInputSchema, path);
        if (stryMutAct_9fa48("994") ? false : stryMutAct_9fa48("993") ? true : (stryCov_9fa48("993", "994"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("996") ? false : stryMutAct_9fa48("995") ? true : (stryCov_9fa48("995", "996"), backendMode(session))) {
          if (stryMutAct_9fa48("997")) {
            {}
          } else {
            stryCov_9fa48("997");
            const response = await fetchBackend(request, stryMutAct_9fa48("998") ? `` : (stryCov_9fa48("998"), `/crews/${pathId(id)}/zone-assignments`), stryMutAct_9fa48("999") ? "" : (stryCov_9fa48("999"), "service:assign"), stryMutAct_9fa48("1000") ? {} : (stryCov_9fa48("1000"), {
              method: stryMutAct_9fa48("1001") ? "" : (stryCov_9fa48("1001"), "POST"),
              headers: stryMutAct_9fa48("1002") ? {} : (stryCov_9fa48("1002"), {
                "content-type": stryMutAct_9fa48("1003") ? "" : (stryCov_9fa48("1003"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            if (stryMutAct_9fa48("1006") ? response.status !== 409 : stryMutAct_9fa48("1005") ? false : stryMutAct_9fa48("1004") ? true : (stryCov_9fa48("1004", "1005", "1006"), response.status === 409)) {
              if (stryMutAct_9fa48("1007")) {
                {}
              } else {
                stryCov_9fa48("1007");
                void (stryMutAct_9fa48("1008") ? response.body.cancel().catch(() => undefined) : (stryCov_9fa48("1008"), response.body?.cancel().catch(() => undefined)));
                return errorResponse(409, OVERLAP_MESSAGE, path);
              }
            }
            return forwardResponse(response);
          }
        }
        if (stryMutAct_9fa48("1011") ? false : stryMutAct_9fa48("1010") ? true : stryMutAct_9fa48("1009") ? crewFixtures.some(item => item.id === id) : (stryCov_9fa48("1009", "1010", "1011"), !(stryMutAct_9fa48("1012") ? crewFixtures.every(item => item.id === id) : (stryCov_9fa48("1012"), crewFixtures.some(stryMutAct_9fa48("1013") ? () => undefined : (stryCov_9fa48("1013"), item => stryMutAct_9fa48("1016") ? item.id !== id : stryMutAct_9fa48("1015") ? false : stryMutAct_9fa48("1014") ? true : (stryCov_9fa48("1014", "1015", "1016"), item.id === id))))))) return errorResponse(404, stryMutAct_9fa48("1017") ? `` : (stryCov_9fa48("1017"), `La cuadrilla ${id} no existe.`), path);
        if (stryMutAct_9fa48("1019") ? false : stryMutAct_9fa48("1018") ? true : (stryCov_9fa48("1018", "1019"), overlapsCrewZoneAssignment(id, parsed.data.validFrom, parsed.data.validTo))) return errorResponse(409, OVERLAP_MESSAGE, path);
        const move = stryMutAct_9fa48("1020") ? {} : (stryCov_9fa48("1020"), {
          id: stryMutAct_9fa48("1021") ? `` : (stryCov_9fa48("1021"), `move-${crypto.randomUUID()}`),
          crewId: id,
          zoneId: parsed.data.zoneId,
          validFrom: parsed.data.validFrom,
          validTo: stryMutAct_9fa48("1022") ? parsed.data.validTo && null : (stryCov_9fa48("1022"), parsed.data.validTo ?? null),
          reason: parsed.data.reason,
          createdBy: stryMutAct_9fa48("1023") ? "" : (stryCov_9fa48("1023"), "3"),
          createdAt: new Date().toISOString()
        });
        if (stryMutAct_9fa48("1024")) {
          ;
        } else {
          stryCov_9fa48("1024");
          addCrewZoneAssignmentFixture(move);
        }
        return NextResponse.json(move, stryMutAct_9fa48("1025") ? {} : (stryCov_9fa48("1025"), {
          status: 201
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("1026")) {
        {}
      } else {
        stryCov_9fa48("1026");
        return mapError(error, path, stryMutAct_9fa48("1027") ? "" : (stryCov_9fa48("1027"), "No se pudo reubicar la cuadrilla."));
      }
    }
  }
}