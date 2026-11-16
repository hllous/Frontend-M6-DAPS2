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
import { findServiceFixture } from "@/lib/bff-service-mock";
import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse, requireCrewScope, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { addZoneResultFixture, getZoneResultsByServiceId } from "@/lib/services-fixtures";
import { recordZoneResultInputSchema, type ZoneResult } from "@/lib/services";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { randomInt } from "@/lib/random-id";
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("5263")) {
    {}
  } else {
    stryCov_9fa48("5263");
    const params = await context.params;
    const serviceId = params.id;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("5264")) {
        {}
      } else {
        stryCov_9fa48("5264");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("5266") ? false : stryMutAct_9fa48("5265") ? true : (stryCov_9fa48("5265", "5266"), backendMode(session))) {
          if (stryMutAct_9fa48("5267")) {
            {}
          } else {
            stryCov_9fa48("5267");
            const scopedService = await requireCrewScope(request, session, stryMutAct_9fa48("5268") ? {} : (stryCov_9fa48("5268"), {
              serviceId
            }));
            if (stryMutAct_9fa48("5270") ? false : stryMutAct_9fa48("5269") ? true : (stryCov_9fa48("5269", "5270"), scopedService instanceof Response)) return scopedService;
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("5271") ? `` : (stryCov_9fa48("5271"), `/services/${pathId(serviceId)}/zone-results`));
            return forwardResponse(backendResponse);
          }
        }
        const service = findServiceFixture(serviceId, path);
        if (stryMutAct_9fa48("5273") ? false : stryMutAct_9fa48("5272") ? true : (stryCov_9fa48("5272", "5273"), service instanceof Response)) return service;
        if (stryMutAct_9fa48("5276") ? scenario.actor.kind === "FIELD" || scenario.actor.crewId : stryMutAct_9fa48("5275") ? false : stryMutAct_9fa48("5274") ? true : (stryCov_9fa48("5274", "5275", "5276"), (stryMutAct_9fa48("5278") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("5277") ? true : (stryCov_9fa48("5277", "5278"), scenario.actor.kind === (stryMutAct_9fa48("5279") ? "" : (stryCov_9fa48("5279"), "FIELD")))) && scenario.actor.crewId)) {
          if (stryMutAct_9fa48("5280")) {
            {}
          } else {
            stryCov_9fa48("5280");
            if (stryMutAct_9fa48("5283") ? service.crewId === scenario.actor.crewId : stryMutAct_9fa48("5282") ? false : stryMutAct_9fa48("5281") ? true : (stryCov_9fa48("5281", "5282", "5283"), service.crewId !== scenario.actor.crewId)) {
              if (stryMutAct_9fa48("5284")) {
                {}
              } else {
                stryCov_9fa48("5284");
                return errorResponse(403, stryMutAct_9fa48("5285") ? "" : (stryCov_9fa48("5285"), "No tiene permisos para ver los resultados de otra cuadrilla."), path);
              }
            }
          }
        }
        const results = getZoneResultsByServiceId(serviceId);
        return NextResponse.json(results);
      }
    } catch (caught: unknown) {
      if (stryMutAct_9fa48("5286")) {
        {}
      } else {
        stryCov_9fa48("5286");
        if (stryMutAct_9fa48("5289") ? caught instanceof AuthUnavailableError && caught instanceof InvalidSessionError : stryMutAct_9fa48("5288") ? false : stryMutAct_9fa48("5287") ? true : (stryCov_9fa48("5287", "5288", "5289"), caught instanceof AuthUnavailableError || caught instanceof InvalidSessionError)) {
          if (stryMutAct_9fa48("5290")) {
            {}
          } else {
            stryCov_9fa48("5290");
            recordTelemetryEvent(stryMutAct_9fa48("5292") ? {} : (stryCov_9fa48("5292"), {
              name: stryMutAct_9fa48("5293") ? "" : (stryCov_9fa48("5293"), "auth_session_expired"),
              status: 401
            }));
            return errorResponse(401, stryMutAct_9fa48("5294") ? "" : (stryCov_9fa48("5294"), "La sesión no está activa o es inválida."), path);
          }
        }
        return mapSessionError(caught, path, stryMutAct_9fa48("5295") ? "" : (stryCov_9fa48("5295"), "Error interno del servidor."));
      }
    }
  }
}
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("5296")) {
    {}
  } else {
    stryCov_9fa48("5296");
    const params = await context.params;
    const serviceId = params.id;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("5297")) {
        {}
      } else {
        stryCov_9fa48("5297");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);
        authorize(session, stryMutAct_9fa48("5299") ? {} : (stryCov_9fa48("5299"), {
          capability: stryMutAct_9fa48("5300") ? "" : (stryCov_9fa48("5300"), "service:execute"),
          capabilityMessage: stryMutAct_9fa48("5301") ? "" : (stryCov_9fa48("5301"), "No tiene permisos para registrar resultados de zona. Solo la persona responsable de la cuadrilla puede hacerlo."),
          throwOnError: stryMutAct_9fa48("5302") ? false : (stryCov_9fa48("5302"), true)
        }));
        const parsed = await parseJsonBody(request, recordZoneResultInputSchema, path);
        if (stryMutAct_9fa48("5304") ? false : stryMutAct_9fa48("5303") ? true : (stryCov_9fa48("5303", "5304"), parsed instanceof Response)) return parsed;
        const input = parsed.data;
        if (stryMutAct_9fa48("5306") ? false : stryMutAct_9fa48("5305") ? true : (stryCov_9fa48("5305", "5306"), backendMode(session))) {
          if (stryMutAct_9fa48("5307")) {
            {}
          } else {
            stryCov_9fa48("5307");
            const scopedService = await requireCrewScope(request, session, stryMutAct_9fa48("5308") ? {} : (stryCov_9fa48("5308"), {
              serviceId
            }));
            if (stryMutAct_9fa48("5310") ? false : stryMutAct_9fa48("5309") ? true : (stryCov_9fa48("5309", "5310"), scopedService instanceof Response)) return scopedService;
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("5311") ? `` : (stryCov_9fa48("5311"), `/services/${pathId(serviceId)}/zone-results`), undefined, stryMutAct_9fa48("5312") ? {} : (stryCov_9fa48("5312"), {
              method: stryMutAct_9fa48("5313") ? "" : (stryCov_9fa48("5313"), "POST"),
              headers: stryMutAct_9fa48("5314") ? {} : (stryCov_9fa48("5314"), {
                "content-type": stryMutAct_9fa48("5315") ? "" : (stryCov_9fa48("5315"), "application/json")
              }),
              body: JSON.stringify(input)
            }));
            return forwardResponse(backendResponse);
          }
        }
        const service = findServiceFixture(serviceId, path);
        if (stryMutAct_9fa48("5317") ? false : stryMutAct_9fa48("5316") ? true : (stryCov_9fa48("5316", "5317"), service instanceof Response)) return service;
        if (stryMutAct_9fa48("5320") ? scenario.actor.kind === "FIELD" || scenario.actor.crewId : stryMutAct_9fa48("5319") ? false : stryMutAct_9fa48("5318") ? true : (stryCov_9fa48("5318", "5319", "5320"), (stryMutAct_9fa48("5322") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("5321") ? true : (stryCov_9fa48("5321", "5322"), scenario.actor.kind === (stryMutAct_9fa48("5323") ? "" : (stryCov_9fa48("5323"), "FIELD")))) && scenario.actor.crewId)) {
          if (stryMutAct_9fa48("5324")) {
            {}
          } else {
            stryCov_9fa48("5324");
            if (stryMutAct_9fa48("5327") ? service.crewId === scenario.actor.crewId : stryMutAct_9fa48("5326") ? false : stryMutAct_9fa48("5325") ? true : (stryCov_9fa48("5325", "5326", "5327"), service.crewId !== scenario.actor.crewId)) {
              if (stryMutAct_9fa48("5328")) {
                {}
              } else {
                stryCov_9fa48("5328");
                return errorResponse(403, stryMutAct_9fa48("5329") ? "" : (stryCov_9fa48("5329"), "No tiene permisos para registrar resultados en servicios de otra cuadrilla."), path);
              }
            }
          }
        }
        if (stryMutAct_9fa48("5332") ? service.status === "IN_PROGRESS" : stryMutAct_9fa48("5331") ? false : stryMutAct_9fa48("5330") ? true : (stryCov_9fa48("5330", "5331", "5332"), service.status !== (stryMutAct_9fa48("5333") ? "" : (stryCov_9fa48("5333"), "IN_PROGRESS")))) {
          if (stryMutAct_9fa48("5334")) {
            {}
          } else {
            stryCov_9fa48("5334");
            return errorResponse(409, stryMutAct_9fa48("5335") ? `` : (stryCov_9fa48("5335"), `Solo se pueden registrar resultados en servicios en curso (IN_PROGRESS) (estado actual: ${service.status}).`), path);
          }
        }
        if (stryMutAct_9fa48("5338") ? false : stryMutAct_9fa48("5337") ? true : stryMutAct_9fa48("5336") ? service.zoneIds.includes(input.zoneId) : (stryCov_9fa48("5336", "5337", "5338"), !service.zoneIds.includes(input.zoneId))) {
          if (stryMutAct_9fa48("5339")) {
            {}
          } else {
            stryCov_9fa48("5339");
            return errorResponse(400, stryMutAct_9fa48("5340") ? `` : (stryCov_9fa48("5340"), `La zona ${input.zoneId} no pertenece al alcance delimitado de este servicio.`), path);
          }
        }
        const existingResults = getZoneResultsByServiceId(serviceId);
        if (stryMutAct_9fa48("5343") ? existingResults.every(r => r.zoneId === input.zoneId) : stryMutAct_9fa48("5342") ? false : stryMutAct_9fa48("5341") ? true : (stryCov_9fa48("5341", "5342", "5343"), existingResults.some(stryMutAct_9fa48("5344") ? () => undefined : (stryCov_9fa48("5344"), r => stryMutAct_9fa48("5347") ? r.zoneId !== input.zoneId : stryMutAct_9fa48("5346") ? false : stryMutAct_9fa48("5345") ? true : (stryCov_9fa48("5345", "5346", "5347"), r.zoneId === input.zoneId))))) {
          if (stryMutAct_9fa48("5348")) {
            {}
          } else {
            stryCov_9fa48("5348");
            return errorResponse(409, stryMutAct_9fa48("5349") ? `` : (stryCov_9fa48("5349"), `El resultado para la zona ${input.zoneId} ya fue registrado previamente.`), path);
          }
        }
        const newResult: ZoneResult = stryMutAct_9fa48("5350") ? {} : (stryCov_9fa48("5350"), {
          id: stryMutAct_9fa48("5351") ? `` : (stryCov_9fa48("5351"), `ZR-${serviceId}-${randomInt(100, 999)}`),
          serviceId,
          zoneId: input.zoneId,
          status: input.status,
          reason: (stryMutAct_9fa48("5354") ? input.status !== "SERVICED" : stryMutAct_9fa48("5353") ? false : stryMutAct_9fa48("5352") ? true : (stryCov_9fa48("5352", "5353", "5354"), input.status === (stryMutAct_9fa48("5355") ? "" : (stryCov_9fa48("5355"), "SERVICED")))) ? null : stryMutAct_9fa48("5356") ? input.reason && null : (stryCov_9fa48("5356"), input.reason ?? null),
          notes: stryMutAct_9fa48("5357") ? input.notes && null : (stryCov_9fa48("5357"), input.notes ?? null),
          proposedDate: stryMutAct_9fa48("5358") ? input.proposedDate && null : (stryCov_9fa48("5358"), input.proposedDate ?? null),
          attachments: stryMutAct_9fa48("5359") ? ["Stryker was here"] : (stryCov_9fa48("5359"), []),
          recordedAt: stryMutAct_9fa48("5360") ? new Date().toISOString().replace("T", " ") : (stryCov_9fa48("5360"), new Date().toISOString().slice(0, 16).replace(stryMutAct_9fa48("5361") ? "" : (stryCov_9fa48("5361"), "T"), stryMutAct_9fa48("5362") ? "" : (stryCov_9fa48("5362"), " ")))
        });
        if (stryMutAct_9fa48("5363")) {
          ;
        } else {
          stryCov_9fa48("5363");
          addZoneResultFixture(newResult);
        }
        return NextResponse.json(newResult, stryMutAct_9fa48("5364") ? {} : (stryCov_9fa48("5364"), {
          status: 201
        }));
      }
    } catch (caught: unknown) {
      if (stryMutAct_9fa48("5365")) {
        {}
      } else {
        stryCov_9fa48("5365");
        if (stryMutAct_9fa48("5368") ? caught instanceof AuthUnavailableError && caught instanceof InvalidSessionError : stryMutAct_9fa48("5367") ? false : stryMutAct_9fa48("5366") ? true : (stryCov_9fa48("5366", "5367", "5368"), caught instanceof AuthUnavailableError || caught instanceof InvalidSessionError)) {
          if (stryMutAct_9fa48("5369")) {
            {}
          } else {
            stryCov_9fa48("5369");
            recordTelemetryEvent(stryMutAct_9fa48("5371") ? {} : (stryCov_9fa48("5371"), {
              name: stryMutAct_9fa48("5372") ? "" : (stryCov_9fa48("5372"), "auth_session_expired"),
              status: 401
            }));
            return errorResponse(401, stryMutAct_9fa48("5373") ? "" : (stryCov_9fa48("5373"), "La sesión no está activa o es inválida."), path);
          }
        }
        return mapSessionError(caught, path, stryMutAct_9fa48("5374") ? "" : (stryCov_9fa48("5374"), "Error interno del servidor."));
      }
    }
  }
}