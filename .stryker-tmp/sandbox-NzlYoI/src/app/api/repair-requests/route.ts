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
import { backendMode, errorResponse, mapSessionError, forwardResponse, FORBIDDEN_CODES, handleRouteError, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getEnvironmentalInspectionFixture } from "@/lib/environmental-report-fixtures";
import { serviceFixtures } from "@/lib/services-fixtures";
import { addRepairRequestFixture, createRepairRequestFixture, filterRepairRequestFixtures, paginateRepairRequestFixtures } from "@/lib/repair-request-fixtures";
import { createRepairRequestInputSchema, repairDamageTypeSchema, repairRequestStatusSchema, repairSeveritySchema, type RepairRequestQuery } from "@/lib/repair-requests";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { pageParam, pageSizeParam } from "@/lib/input-limits";
function sessionAndScenario(request: Request) {
  if (stryMutAct_9fa48("3464")) {
    {}
  } else {
    stryCov_9fa48("3464");
    const session = getRequiredSession(request);
    const scenario = getScenario(session);
    return stryMutAct_9fa48("3465") ? {} : (stryCov_9fa48("3465"), {
      session,
      scenario
    });
  }
}
function fieldCanAccessService(scenario: ReturnType<typeof getScenario>, serviceId: string) {
  if (stryMutAct_9fa48("3466")) {
    {}
  } else {
    stryCov_9fa48("3466");
    return stryMutAct_9fa48("3469") ? scenario.actor.kind === "FIELD" && Boolean(scenario.actor.crewId) || serviceFixtures.some(service => service.id === serviceId && service.crewId === scenario.actor.crewId) : stryMutAct_9fa48("3468") ? false : stryMutAct_9fa48("3467") ? true : (stryCov_9fa48("3467", "3468", "3469"), (stryMutAct_9fa48("3471") ? scenario.actor.kind === "FIELD" || Boolean(scenario.actor.crewId) : stryMutAct_9fa48("3470") ? true : (stryCov_9fa48("3470", "3471"), (stryMutAct_9fa48("3473") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("3472") ? true : (stryCov_9fa48("3472", "3473"), scenario.actor.kind === (stryMutAct_9fa48("3474") ? "" : (stryCov_9fa48("3474"), "FIELD")))) && Boolean(scenario.actor.crewId))) && (stryMutAct_9fa48("3475") ? serviceFixtures.every(service => service.id === serviceId && service.crewId === scenario.actor.crewId) : (stryCov_9fa48("3475"), serviceFixtures.some(stryMutAct_9fa48("3476") ? () => undefined : (stryCov_9fa48("3476"), service => stryMutAct_9fa48("3479") ? service.id === serviceId || service.crewId === scenario.actor.crewId : stryMutAct_9fa48("3478") ? false : stryMutAct_9fa48("3477") ? true : (stryCov_9fa48("3477", "3478", "3479"), (stryMutAct_9fa48("3481") ? service.id !== serviceId : stryMutAct_9fa48("3480") ? true : (stryCov_9fa48("3480", "3481"), service.id === serviceId)) && (stryMutAct_9fa48("3483") ? service.crewId !== scenario.actor.crewId : stryMutAct_9fa48("3482") ? true : (stryCov_9fa48("3482", "3483"), service.crewId === scenario.actor.crewId))))))));
  }
}
function fieldCanAccessInspection(scenario: ReturnType<typeof getScenario>, inspectionId: string) {
  if (stryMutAct_9fa48("3484")) {
    {}
  } else {
    stryCov_9fa48("3484");
    const inspection = getEnvironmentalInspectionFixture(inspectionId);
    return Boolean(stryMutAct_9fa48("3487") ? inspection?.serviceId && scenario.actor.kind === "FIELD" && scenario.actor.crewId || serviceFixtures.some(service => service.id === inspection.serviceId && service.crewId === scenario.actor.crewId) : stryMutAct_9fa48("3486") ? false : stryMutAct_9fa48("3485") ? true : (stryCov_9fa48("3485", "3486", "3487"), (stryMutAct_9fa48("3489") ? inspection?.serviceId && scenario.actor.kind === "FIELD" || scenario.actor.crewId : stryMutAct_9fa48("3488") ? true : (stryCov_9fa48("3488", "3489"), (stryMutAct_9fa48("3491") ? inspection?.serviceId || scenario.actor.kind === "FIELD" : stryMutAct_9fa48("3490") ? true : (stryCov_9fa48("3490", "3491"), (stryMutAct_9fa48("3492") ? inspection.serviceId : (stryCov_9fa48("3492"), inspection?.serviceId)) && (stryMutAct_9fa48("3494") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("3493") ? true : (stryCov_9fa48("3493", "3494"), scenario.actor.kind === (stryMutAct_9fa48("3495") ? "" : (stryCov_9fa48("3495"), "FIELD")))))) && scenario.actor.crewId)) && (stryMutAct_9fa48("3496") ? serviceFixtures.every(service => service.id === inspection.serviceId && service.crewId === scenario.actor.crewId) : (stryCov_9fa48("3496"), serviceFixtures.some(stryMutAct_9fa48("3497") ? () => undefined : (stryCov_9fa48("3497"), service => stryMutAct_9fa48("3500") ? service.id === inspection.serviceId || service.crewId === scenario.actor.crewId : stryMutAct_9fa48("3499") ? false : stryMutAct_9fa48("3498") ? true : (stryCov_9fa48("3498", "3499", "3500"), (stryMutAct_9fa48("3502") ? service.id !== inspection.serviceId : stryMutAct_9fa48("3501") ? true : (stryCov_9fa48("3501", "3502"), service.id === inspection.serviceId)) && (stryMutAct_9fa48("3504") ? service.crewId !== scenario.actor.crewId : stryMutAct_9fa48("3503") ? true : (stryCov_9fa48("3503", "3504"), service.crewId === scenario.actor.crewId)))))))));
  }
}
function fieldCanAccessSource(scenario: ReturnType<typeof getScenario>, sourceId: string) {
  if (stryMutAct_9fa48("3505")) {
    {}
  } else {
    stryCov_9fa48("3505");
    return stryMutAct_9fa48("3508") ? fieldCanAccessService(scenario, sourceId) && fieldCanAccessInspection(scenario, sourceId) : stryMutAct_9fa48("3507") ? false : stryMutAct_9fa48("3506") ? true : (stryCov_9fa48("3506", "3507", "3508"), fieldCanAccessService(scenario, sourceId) || fieldCanAccessInspection(scenario, sourceId));
  }
}
function queryFromUrl(url: URL): RepairRequestQuery {
  if (stryMutAct_9fa48("3509")) {
    {}
  } else {
    stryCov_9fa48("3509");
    return stryMutAct_9fa48("3510") ? {} : (stryCov_9fa48("3510"), {
      status: repairRequestStatusSchema.safeParse(url.searchParams.get(stryMutAct_9fa48("3511") ? "" : (stryCov_9fa48("3511"), "status"))).data,
      damageType: repairDamageTypeSchema.safeParse(url.searchParams.get(stryMutAct_9fa48("3512") ? "" : (stryCov_9fa48("3512"), "damageType"))).data,
      severity: repairSeveritySchema.safeParse(url.searchParams.get(stryMutAct_9fa48("3513") ? "" : (stryCov_9fa48("3513"), "severity"))).data,
      detectedInId: stryMutAct_9fa48("3514") ? url.searchParams.get("detectedInId") && undefined : (stryCov_9fa48("3514"), url.searchParams.get(stryMutAct_9fa48("3515") ? "" : (stryCov_9fa48("3515"), "detectedInId")) ?? undefined),
      page: pageParam(url.searchParams),
      pageSize: pageSizeParam(url.searchParams)
    });
  }
}
export async function GET(request: Request) {
  if (stryMutAct_9fa48("3516")) {
    {}
  } else {
    stryCov_9fa48("3516");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("3517")) {
        {}
      } else {
        stryCov_9fa48("3517");
        const {
          session,
          scenario
        } = sessionAndScenario(request);
        const query = queryFromUrl(new URL(request.url));
        const useBackend = backendMode(session);
        if (stryMutAct_9fa48("3520") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("3519") ? false : stryMutAct_9fa48("3518") ? true : (stryCov_9fa48("3518", "3519", "3520"), scenario.actor.kind === (stryMutAct_9fa48("3521") ? "" : (stryCov_9fa48("3521"), "FIELD")))) {
          if (stryMutAct_9fa48("3522")) {
            {}
          } else {
            stryCov_9fa48("3522");
            if (stryMutAct_9fa48("3525") ? false : stryMutAct_9fa48("3524") ? true : stryMutAct_9fa48("3523") ? query.detectedInId : (stryCov_9fa48("3523", "3524", "3525"), !query.detectedInId)) {
              if (stryMutAct_9fa48("3526")) {
                {}
              } else {
                stryCov_9fa48("3526");
                return errorResponse(403, stryMutAct_9fa48("3527") ? "" : (stryCov_9fa48("3527"), "Solo puede consultar derivaciones de su cuadrilla."), path);
              }
            }
            if (stryMutAct_9fa48("3529") ? false : stryMutAct_9fa48("3528") ? true : (stryCov_9fa48("3528", "3529"), useBackend)) {
              if (stryMutAct_9fa48("3530")) {
                {}
              } else {
                stryCov_9fa48("3530");
                if (stryMutAct_9fa48("3533") ? false : stryMutAct_9fa48("3532") ? true : stryMutAct_9fa48("3531") ? session.crew?.id : (stryCov_9fa48("3531", "3532", "3533"), !(stryMutAct_9fa48("3534") ? session.crew.id : (stryCov_9fa48("3534"), session.crew?.id)))) {
                  if (stryMutAct_9fa48("3535")) {
                    {}
                  } else {
                    stryCov_9fa48("3535");
                    return errorResponse(403, stryMutAct_9fa48("3536") ? "" : (stryCov_9fa48("3536"), "Solo puede consultar derivaciones de su cuadrilla."), path);
                  }
                }
                const serviceResponse = await fetchBackend(request, stryMutAct_9fa48("3537") ? `` : (stryCov_9fa48("3537"), `/services/${pathId(query.detectedInId)}`));
                if (stryMutAct_9fa48("3540") ? false : stryMutAct_9fa48("3539") ? true : stryMutAct_9fa48("3538") ? serviceResponse.ok : (stryCov_9fa48("3538", "3539", "3540"), !serviceResponse.ok)) {
                  if (stryMutAct_9fa48("3541")) {
                    {}
                  } else {
                    stryCov_9fa48("3541");
                    return forwardResponse(serviceResponse);
                  }
                }
                const service = await serviceResponse.json();
                if (stryMutAct_9fa48("3544") ? service?.crewId === session.crew.id : stryMutAct_9fa48("3543") ? false : stryMutAct_9fa48("3542") ? true : (stryCov_9fa48("3542", "3543", "3544"), (stryMutAct_9fa48("3545") ? service.crewId : (stryCov_9fa48("3545"), service?.crewId)) !== session.crew.id)) {
                  if (stryMutAct_9fa48("3546")) {
                    {}
                  } else {
                    stryCov_9fa48("3546");
                    return errorResponse(403, stryMutAct_9fa48("3547") ? "" : (stryCov_9fa48("3547"), "Solo puede consultar derivaciones de su cuadrilla."), path);
                  }
                }
              }
            } else if (stryMutAct_9fa48("3550") ? false : stryMutAct_9fa48("3549") ? true : stryMutAct_9fa48("3548") ? fieldCanAccessSource(scenario, query.detectedInId) : (stryCov_9fa48("3548", "3549", "3550"), !fieldCanAccessSource(scenario, query.detectedInId))) {
              if (stryMutAct_9fa48("3551")) {
                {}
              } else {
                stryCov_9fa48("3551");
                return errorResponse(403, stryMutAct_9fa48("3552") ? "" : (stryCov_9fa48("3552"), "Solo puede consultar derivaciones de su cuadrilla."), path);
              }
            }
          }
        } else if (stryMutAct_9fa48("3555") ? scenario.actor.kind === "OFFICE" : stryMutAct_9fa48("3554") ? false : stryMutAct_9fa48("3553") ? true : (stryCov_9fa48("3553", "3554", "3555"), scenario.actor.kind !== (stryMutAct_9fa48("3556") ? "" : (stryCov_9fa48("3556"), "OFFICE")))) {
          if (stryMutAct_9fa48("3557")) {
            {}
          } else {
            stryCov_9fa48("3557");
            return errorResponse(403, stryMutAct_9fa48("3558") ? "" : (stryCov_9fa48("3558"), "Solo Oficina o Campo puede consultar derivaciones."), path);
          }
        }
        if (stryMutAct_9fa48("3560") ? false : stryMutAct_9fa48("3559") ? true : (stryCov_9fa48("3559", "3560"), useBackend)) {
          if (stryMutAct_9fa48("3561")) {
            {}
          } else {
            stryCov_9fa48("3561");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("3562") ? `` : (stryCov_9fa48("3562"), `/repair-requests${new URL(request.url).search}`));
            return forwardResponse(backendResponse);
          }
        }
        return NextResponse.json(paginateRepairRequestFixtures(filterRepairRequestFixtures(query), query.page, query.pageSize));
      }
    } catch (error) {
      if (stryMutAct_9fa48("3563")) {
        {}
      } else {
        stryCov_9fa48("3563");
        if (stryMutAct_9fa48("3565") ? false : stryMutAct_9fa48("3564") ? true : (stryCov_9fa48("3564", "3565"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("3566") ? "" : (stryCov_9fa48("3566"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("3568") ? false : stryMutAct_9fa48("3567") ? true : (stryCov_9fa48("3567", "3568"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("3569") ? "" : (stryCov_9fa48("3569"), "No se pudieron cargar las derivaciones."));
      }
    }
  }
}
export async function POST(request: Request) {
  if (stryMutAct_9fa48("3570")) {
    {}
  } else {
    stryCov_9fa48("3570");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("3571")) {
        {}
      } else {
        stryCov_9fa48("3571");
        const {
          session,
          scenario
        } = sessionAndScenario(request);
        if (stryMutAct_9fa48("3574") ? false : stryMutAct_9fa48("3573") ? true : stryMutAct_9fa48("3572") ? scenario.capabilities.includes("repairRequest:create") : (stryCov_9fa48("3572", "3573", "3574"), !scenario.capabilities.includes(stryMutAct_9fa48("3575") ? "" : (stryCov_9fa48("3575"), "repairRequest:create")))) {
          if (stryMutAct_9fa48("3576")) {
            {}
          } else {
            stryCov_9fa48("3576");
            return errorResponse(403, stryMutAct_9fa48("3577") ? "" : (stryCov_9fa48("3577"), "Su rol no permite crear derivaciones."), path, FORBIDDEN_CODES.roleRequired);
          }
        }
        const parsed = await parseJsonBody(request, createRepairRequestInputSchema, path);
        if (stryMutAct_9fa48("3579") ? false : stryMutAct_9fa48("3578") ? true : (stryCov_9fa48("3578", "3579"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("3581") ? false : stryMutAct_9fa48("3580") ? true : (stryCov_9fa48("3580", "3581"), backendMode(session))) {
          if (stryMutAct_9fa48("3582")) {
            {}
          } else {
            stryCov_9fa48("3582");
            const sourcePath = (stryMutAct_9fa48("3585") ? parsed.data.detectedInType !== "SERVICE" : stryMutAct_9fa48("3584") ? false : stryMutAct_9fa48("3583") ? true : (stryCov_9fa48("3583", "3584", "3585"), parsed.data.detectedInType === (stryMutAct_9fa48("3586") ? "" : (stryCov_9fa48("3586"), "SERVICE")))) ? stryMutAct_9fa48("3587") ? "" : (stryCov_9fa48("3587"), "/services") : stryMutAct_9fa48("3588") ? "" : (stryCov_9fa48("3588"), "/environmental-inspections");
            const sourceResponse = await fetchBackend(request, stryMutAct_9fa48("3589") ? `` : (stryCov_9fa48("3589"), `${sourcePath}/${pathId(parsed.data.detectedInId)}`));
            if (stryMutAct_9fa48("3592") ? sourceResponse.status !== 404 : stryMutAct_9fa48("3591") ? false : stryMutAct_9fa48("3590") ? true : (stryCov_9fa48("3590", "3591", "3592"), sourceResponse.status === 404)) {
              if (stryMutAct_9fa48("3593")) {
                {}
              } else {
                stryCov_9fa48("3593");
                return errorResponse(404, (stryMutAct_9fa48("3596") ? parsed.data.detectedInType !== "SERVICE" : stryMutAct_9fa48("3595") ? false : stryMutAct_9fa48("3594") ? true : (stryCov_9fa48("3594", "3595", "3596"), parsed.data.detectedInType === (stryMutAct_9fa48("3597") ? "" : (stryCov_9fa48("3597"), "SERVICE")))) ? stryMutAct_9fa48("3598") ? `` : (stryCov_9fa48("3598"), `Servicio ${parsed.data.detectedInId} no encontrado.`) : stryMutAct_9fa48("3599") ? `` : (stryCov_9fa48("3599"), `Inspección ${parsed.data.detectedInId} no encontrada.`), path);
              }
            }
            if (stryMutAct_9fa48("3602") ? false : stryMutAct_9fa48("3601") ? true : stryMutAct_9fa48("3600") ? sourceResponse.ok : (stryCov_9fa48("3600", "3601", "3602"), !sourceResponse.ok)) {
              if (stryMutAct_9fa48("3603")) {
                {}
              } else {
                stryCov_9fa48("3603");
                return forwardResponse(sourceResponse);
              }
            }
            const sourceSchema = (stryMutAct_9fa48("3606") ? parsed.data.detectedInType !== "SERVICE" : stryMutAct_9fa48("3605") ? false : stryMutAct_9fa48("3604") ? true : (stryCov_9fa48("3604", "3605", "3606"), parsed.data.detectedInType === (stryMutAct_9fa48("3607") ? "" : (stryCov_9fa48("3607"), "SERVICE")))) ? z.object(stryMutAct_9fa48("3608") ? {} : (stryCov_9fa48("3608"), {
              crewId: z.string().nullable().optional()
            })).passthrough() : z.object(stryMutAct_9fa48("3609") ? {} : (stryCov_9fa48("3609"), {
              serviceId: z.string()
            })).passthrough();
            const source = sourceSchema.parse(await sourceResponse.json());
            if (stryMutAct_9fa48("3612") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("3611") ? false : stryMutAct_9fa48("3610") ? true : (stryCov_9fa48("3610", "3611", "3612"), scenario.actor.kind === (stryMutAct_9fa48("3613") ? "" : (stryCov_9fa48("3613"), "FIELD")))) {
              if (stryMutAct_9fa48("3614")) {
                {}
              } else {
                stryCov_9fa48("3614");
                if (stryMutAct_9fa48("3617") ? false : stryMutAct_9fa48("3616") ? true : stryMutAct_9fa48("3615") ? session.crew?.id : (stryCov_9fa48("3615", "3616", "3617"), !(stryMutAct_9fa48("3618") ? session.crew.id : (stryCov_9fa48("3618"), session.crew?.id)))) {
                  if (stryMutAct_9fa48("3619")) {
                    {}
                  } else {
                    stryCov_9fa48("3619");
                    return errorResponse(403, stryMutAct_9fa48("3620") ? "" : (stryCov_9fa48("3620"), "Solo puede crear derivaciones desde trabajo de su cuadrilla."), path);
                  }
                }
                let service = source;
                if (stryMutAct_9fa48("3623") ? parsed.data.detectedInType !== "INSPECTION" : stryMutAct_9fa48("3622") ? false : stryMutAct_9fa48("3621") ? true : (stryCov_9fa48("3621", "3622", "3623"), parsed.data.detectedInType === (stryMutAct_9fa48("3624") ? "" : (stryCov_9fa48("3624"), "INSPECTION")))) {
                  if (stryMutAct_9fa48("3625")) {
                    {}
                  } else {
                    stryCov_9fa48("3625");
                    const serviceResponse = await fetchBackend(request, stryMutAct_9fa48("3626") ? `` : (stryCov_9fa48("3626"), `/services/${pathId(source.serviceId as string)}`));
                    if (stryMutAct_9fa48("3629") ? false : stryMutAct_9fa48("3628") ? true : stryMutAct_9fa48("3627") ? serviceResponse.ok : (stryCov_9fa48("3627", "3628", "3629"), !serviceResponse.ok)) {
                      if (stryMutAct_9fa48("3630")) {
                        {}
                      } else {
                        stryCov_9fa48("3630");
                        return forwardResponse(serviceResponse);
                      }
                    }
                    service = z.object(stryMutAct_9fa48("3631") ? {} : (stryCov_9fa48("3631"), {
                      crewId: z.string().nullable().optional()
                    })).passthrough().parse(await serviceResponse.json());
                  }
                }
                if (stryMutAct_9fa48("3634") ? service.crewId === session.crew.id : stryMutAct_9fa48("3633") ? false : stryMutAct_9fa48("3632") ? true : (stryCov_9fa48("3632", "3633", "3634"), service.crewId !== session.crew.id)) {
                  if (stryMutAct_9fa48("3635")) {
                    {}
                  } else {
                    stryCov_9fa48("3635");
                    return errorResponse(403, stryMutAct_9fa48("3636") ? "" : (stryCov_9fa48("3636"), "Solo puede crear derivaciones desde trabajo de su cuadrilla."), path);
                  }
                }
              }
            }
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("3637") ? "" : (stryCov_9fa48("3637"), "/repair-requests"), undefined, stryMutAct_9fa48("3638") ? {} : (stryCov_9fa48("3638"), {
              method: stryMutAct_9fa48("3639") ? "" : (stryCov_9fa48("3639"), "POST"),
              headers: stryMutAct_9fa48("3640") ? {} : (stryCov_9fa48("3640"), {
                "content-type": stryMutAct_9fa48("3641") ? "" : (stryCov_9fa48("3641"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(backendResponse);
          }
        }
        if (stryMutAct_9fa48("3644") ? parsed.data.detectedInType === "SERVICE" || !serviceFixtures.some(service => service.id === parsed.data.detectedInId) : stryMutAct_9fa48("3643") ? false : stryMutAct_9fa48("3642") ? true : (stryCov_9fa48("3642", "3643", "3644"), (stryMutAct_9fa48("3646") ? parsed.data.detectedInType !== "SERVICE" : stryMutAct_9fa48("3645") ? true : (stryCov_9fa48("3645", "3646"), parsed.data.detectedInType === (stryMutAct_9fa48("3647") ? "" : (stryCov_9fa48("3647"), "SERVICE")))) && (stryMutAct_9fa48("3648") ? serviceFixtures.some(service => service.id === parsed.data.detectedInId) : (stryCov_9fa48("3648"), !(stryMutAct_9fa48("3649") ? serviceFixtures.every(service => service.id === parsed.data.detectedInId) : (stryCov_9fa48("3649"), serviceFixtures.some(stryMutAct_9fa48("3650") ? () => undefined : (stryCov_9fa48("3650"), service => stryMutAct_9fa48("3653") ? service.id !== parsed.data.detectedInId : stryMutAct_9fa48("3652") ? false : stryMutAct_9fa48("3651") ? true : (stryCov_9fa48("3651", "3652", "3653"), service.id === parsed.data.detectedInId))))))))) {
          if (stryMutAct_9fa48("3654")) {
            {}
          } else {
            stryCov_9fa48("3654");
            return errorResponse(404, stryMutAct_9fa48("3655") ? `` : (stryCov_9fa48("3655"), `Servicio ${parsed.data.detectedInId} no encontrado.`), path);
          }
        }
        if (stryMutAct_9fa48("3658") ? parsed.data.detectedInType === "INSPECTION" || !getEnvironmentalInspectionFixture(parsed.data.detectedInId) : stryMutAct_9fa48("3657") ? false : stryMutAct_9fa48("3656") ? true : (stryCov_9fa48("3656", "3657", "3658"), (stryMutAct_9fa48("3660") ? parsed.data.detectedInType !== "INSPECTION" : stryMutAct_9fa48("3659") ? true : (stryCov_9fa48("3659", "3660"), parsed.data.detectedInType === (stryMutAct_9fa48("3661") ? "" : (stryCov_9fa48("3661"), "INSPECTION")))) && (stryMutAct_9fa48("3662") ? getEnvironmentalInspectionFixture(parsed.data.detectedInId) : (stryCov_9fa48("3662"), !getEnvironmentalInspectionFixture(parsed.data.detectedInId))))) {
          if (stryMutAct_9fa48("3663")) {
            {}
          } else {
            stryCov_9fa48("3663");
            return errorResponse(404, stryMutAct_9fa48("3664") ? `` : (stryCov_9fa48("3664"), `Inspección ${parsed.data.detectedInId} no encontrada.`), path);
          }
        }
        if (stryMutAct_9fa48("3667") ? scenario.actor.kind === "FIELD" || !fieldCanAccessSource(scenario, parsed.data.detectedInId) : stryMutAct_9fa48("3666") ? false : stryMutAct_9fa48("3665") ? true : (stryCov_9fa48("3665", "3666", "3667"), (stryMutAct_9fa48("3669") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("3668") ? true : (stryCov_9fa48("3668", "3669"), scenario.actor.kind === (stryMutAct_9fa48("3670") ? "" : (stryCov_9fa48("3670"), "FIELD")))) && (stryMutAct_9fa48("3671") ? fieldCanAccessSource(scenario, parsed.data.detectedInId) : (stryCov_9fa48("3671"), !fieldCanAccessSource(scenario, parsed.data.detectedInId))))) {
          if (stryMutAct_9fa48("3672")) {
            {}
          } else {
            stryCov_9fa48("3672");
            return errorResponse(403, stryMutAct_9fa48("3673") ? "" : (stryCov_9fa48("3673"), "Solo puede crear derivaciones desde trabajo de su cuadrilla."), path);
          }
        }
        const service = (stryMutAct_9fa48("3676") ? parsed.data.detectedInType !== "SERVICE" : stryMutAct_9fa48("3675") ? false : stryMutAct_9fa48("3674") ? true : (stryCov_9fa48("3674", "3675", "3676"), parsed.data.detectedInType === (stryMutAct_9fa48("3677") ? "" : (stryCov_9fa48("3677"), "SERVICE")))) ? serviceFixtures.find(stryMutAct_9fa48("3678") ? () => undefined : (stryCov_9fa48("3678"), candidate => stryMutAct_9fa48("3681") ? candidate.id !== parsed.data.detectedInId : stryMutAct_9fa48("3680") ? false : stryMutAct_9fa48("3679") ? true : (stryCov_9fa48("3679", "3680", "3681"), candidate.id === parsed.data.detectedInId))) : undefined;
        const created = createRepairRequestFixture(parsed.data, service);
        if (stryMutAct_9fa48("3682")) {
          ;
        } else {
          stryCov_9fa48("3682");
          addRepairRequestFixture(created);
        }
        return NextResponse.json(created, stryMutAct_9fa48("3683") ? {} : (stryCov_9fa48("3683"), {
          status: 201
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("3684")) {
        {}
      } else {
        stryCov_9fa48("3684");
        return handleRouteError(error, path, stryMutAct_9fa48("3685") ? "" : (stryCov_9fa48("3685"), "No se pudo crear la derivación."));
      }
    }
  }
}