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
import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { crewFixtures } from "@/lib/crew-fixtures";
import { updateCrewInputSchema } from "@/lib/crews";
import { m1IdentityAdapter } from "@/lib/m1-identity";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
type Context = {
  params: Promise<{
    id: string;
  }>;
};
async function context(request: Request, routeContext: Context) {
  if (stryMutAct_9fa48("823")) {
    {}
  } else {
    stryCov_9fa48("823");
    const {
      id
    } = await routeContext.params;
    const session = getRequiredSession(request);
    return stryMutAct_9fa48("824") ? {} : (stryCov_9fa48("824"), {
      id,
      path: new URL(request.url).pathname,
      session,
      scenario: getScenario(session)
    });
  }
}
function requireOfficeCapability(session: ReturnType<typeof getRequiredSession>) {
  if (stryMutAct_9fa48("825")) {
    {}
  } else {
    stryCov_9fa48("825");
    authorize(session, stryMutAct_9fa48("827") ? {} : (stryCov_9fa48("827"), {
      office: stryMutAct_9fa48("828") ? false : (stryCov_9fa48("828"), true),
      officeMessage: stryMutAct_9fa48("829") ? "" : (stryCov_9fa48("829"), "Solo Oficina puede administrar cuadrillas."),
      capability: stryMutAct_9fa48("830") ? "" : (stryCov_9fa48("830"), "crew:manage"),
      throwOnError: stryMutAct_9fa48("831") ? false : (stryCov_9fa48("831"), true)
    }));
  }
}
export async function GET(request: Request, routeContext: Context) {
  if (stryMutAct_9fa48("832")) {
    {}
  } else {
    stryCov_9fa48("832");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("833")) {
        {}
      } else {
        stryCov_9fa48("833");
        const {
          id,
          session,
          scenario
        } = await context(request, routeContext);
        if (stryMutAct_9fa48("836") ? scenario.actor.kind === "FIELD" || scenario.actor.crewId !== id : stryMutAct_9fa48("835") ? false : stryMutAct_9fa48("834") ? true : (stryCov_9fa48("834", "835", "836"), (stryMutAct_9fa48("838") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("837") ? true : (stryCov_9fa48("837", "838"), scenario.actor.kind === (stryMutAct_9fa48("839") ? "" : (stryCov_9fa48("839"), "FIELD")))) && (stryMutAct_9fa48("841") ? scenario.actor.crewId === id : stryMutAct_9fa48("840") ? true : (stryCov_9fa48("840", "841"), scenario.actor.crewId !== id)))) throw new ForbiddenSessionError(stryMutAct_9fa48("843") ? "" : (stryCov_9fa48("843"), "Solo puede consultar su propia cuadrilla."));
        if (stryMutAct_9fa48("845") ? false : stryMutAct_9fa48("844") ? true : (stryCov_9fa48("844", "845"), backendMode(session))) return forwardResponse(await fetchBackend(request, stryMutAct_9fa48("846") ? `` : (stryCov_9fa48("846"), `/crews/${pathId(id)}`)));
        const crew = crewFixtures.find(stryMutAct_9fa48("847") ? () => undefined : (stryCov_9fa48("847"), item => stryMutAct_9fa48("850") ? item.id !== id : stryMutAct_9fa48("849") ? false : stryMutAct_9fa48("848") ? true : (stryCov_9fa48("848", "849", "850"), item.id === id)));
        return crew ? NextResponse.json(crew) : errorResponse(404, stryMutAct_9fa48("851") ? `` : (stryCov_9fa48("851"), `La cuadrilla ${id} no existe.`), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("852")) {
        {}
      } else {
        stryCov_9fa48("852");
        if (stryMutAct_9fa48("854") ? false : stryMutAct_9fa48("853") ? true : (stryCov_9fa48("853", "854"), error instanceof InvalidSessionError)) {
          if (stryMutAct_9fa48("855")) {
            {}
          } else {
            stryCov_9fa48("855");
            recordTelemetryEvent(stryMutAct_9fa48("857") ? {} : (stryCov_9fa48("857"), {
              name: stryMutAct_9fa48("858") ? "" : (stryCov_9fa48("858"), "auth_session_expired"),
              status: 401
            }));
            return errorResponse(401, stryMutAct_9fa48("859") ? "" : (stryCov_9fa48("859"), "La sesión no está activa."), path);
          }
        }
        if (stryMutAct_9fa48("861") ? false : stryMutAct_9fa48("860") ? true : (stryCov_9fa48("860", "861"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("863") ? false : stryMutAct_9fa48("862") ? true : (stryCov_9fa48("862", "863"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("864") ? "" : (stryCov_9fa48("864"), "No se pudo cargar la cuadrilla."));
      }
    }
  }
}
export async function PATCH(request: Request, routeContext: Context) {
  if (stryMutAct_9fa48("865")) {
    {}
  } else {
    stryCov_9fa48("865");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("866")) {
        {}
      } else {
        stryCov_9fa48("866");
        const {
          id,
          session
        } = await context(request, routeContext);
        if (stryMutAct_9fa48("867")) {
          ;
        } else {
          stryCov_9fa48("867");
          requireOfficeCapability(session);
        }
        const parsed = await parseJsonBody(request, updateCrewInputSchema, path);
        if (stryMutAct_9fa48("869") ? false : stryMutAct_9fa48("868") ? true : (stryCov_9fa48("868", "869"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("871") ? false : stryMutAct_9fa48("870") ? true : (stryCov_9fa48("870", "871"), backendMode(session))) return forwardResponse(await fetchBackend(request, stryMutAct_9fa48("872") ? `` : (stryCov_9fa48("872"), `/crews/${pathId(id)}`), stryMutAct_9fa48("873") ? "" : (stryCov_9fa48("873"), "crew:manage"), stryMutAct_9fa48("874") ? {} : (stryCov_9fa48("874"), {
          method: stryMutAct_9fa48("875") ? "" : (stryCov_9fa48("875"), "PATCH"),
          headers: stryMutAct_9fa48("876") ? {} : (stryCov_9fa48("876"), {
            "content-type": stryMutAct_9fa48("877") ? "" : (stryCov_9fa48("877"), "application/json")
          }),
          body: JSON.stringify(parsed.data)
        })));
        const crew = crewFixtures.find(stryMutAct_9fa48("878") ? () => undefined : (stryCov_9fa48("878"), item => stryMutAct_9fa48("881") ? item.id !== id : stryMutAct_9fa48("880") ? false : stryMutAct_9fa48("879") ? true : (stryCov_9fa48("879", "880", "881"), item.id === id)));
        if (stryMutAct_9fa48("884") ? false : stryMutAct_9fa48("883") ? true : stryMutAct_9fa48("882") ? crew : (stryCov_9fa48("882", "883", "884"), !crew)) return errorResponse(404, stryMutAct_9fa48("885") ? `` : (stryCov_9fa48("885"), `La cuadrilla ${id} no existe.`), path);
        const [users, organizations] = await Promise.all(stryMutAct_9fa48("886") ? [] : (stryCov_9fa48("886"), [m1IdentityAdapter.listUsers(), m1IdentityAdapter.listOrganizations()]));
        if (stryMutAct_9fa48("889") ? crew.leaderUserId === parsed.data.leaderUserId : stryMutAct_9fa48("888") ? false : stryMutAct_9fa48("887") ? true : (stryCov_9fa48("887", "888", "889"), crew.leaderUserId !== parsed.data.leaderUserId)) crew.leaderName = stryMutAct_9fa48("890") ? users.find(user => user.id === parsed.data.leaderUserId)?.displayName && null : (stryCov_9fa48("890"), (stryMutAct_9fa48("891") ? users.find(user => user.id === parsed.data.leaderUserId).displayName : (stryCov_9fa48("891"), users.find(stryMutAct_9fa48("892") ? () => undefined : (stryCov_9fa48("892"), user => stryMutAct_9fa48("895") ? user.id !== parsed.data.leaderUserId : stryMutAct_9fa48("894") ? false : stryMutAct_9fa48("893") ? true : (stryCov_9fa48("893", "894", "895"), user.id === parsed.data.leaderUserId)))?.displayName)) ?? null);
        if (stryMutAct_9fa48("898") ? crew.organizationId === parsed.data.organizationId : stryMutAct_9fa48("897") ? false : stryMutAct_9fa48("896") ? true : (stryCov_9fa48("896", "897", "898"), crew.organizationId !== parsed.data.organizationId)) crew.organizationName = stryMutAct_9fa48("899") ? organizations.find(organization => organization.id === parsed.data.organizationId)?.displayName && null : (stryCov_9fa48("899"), (stryMutAct_9fa48("900") ? organizations.find(organization => organization.id === parsed.data.organizationId).displayName : (stryCov_9fa48("900"), organizations.find(stryMutAct_9fa48("901") ? () => undefined : (stryCov_9fa48("901"), organization => stryMutAct_9fa48("904") ? organization.id !== parsed.data.organizationId : stryMutAct_9fa48("903") ? false : stryMutAct_9fa48("902") ? true : (stryCov_9fa48("902", "903", "904"), organization.id === parsed.data.organizationId)))?.displayName)) ?? null);
        const {
          homeZoneId,
          ...rest
        } = parsed.data;
        if (stryMutAct_9fa48("905")) {
          ;
        } else {
          stryCov_9fa48("905");
          Object.assign(crew, rest);
        }
        if (stryMutAct_9fa48("908") ? homeZoneId === undefined : stryMutAct_9fa48("907") ? false : stryMutAct_9fa48("906") ? true : (stryCov_9fa48("906", "907", "908"), homeZoneId !== undefined)) {
          if (stryMutAct_9fa48("909")) {
            {}
          } else {
            stryCov_9fa48("909");
            if (stryMutAct_9fa48("912") ? crew.effectiveZoneId !== crew.homeZoneId : stryMutAct_9fa48("911") ? false : stryMutAct_9fa48("910") ? true : (stryCov_9fa48("910", "911", "912"), crew.effectiveZoneId === crew.homeZoneId)) crew.effectiveZoneId = homeZoneId;
            crew.homeZoneId = homeZoneId;
          }
        }
        return NextResponse.json(crew);
      }
    } catch (error) {
      if (stryMutAct_9fa48("913")) {
        {}
      } else {
        stryCov_9fa48("913");
        if (stryMutAct_9fa48("915") ? false : stryMutAct_9fa48("914") ? true : (stryCov_9fa48("914", "915"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("916") ? "" : (stryCov_9fa48("916"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("918") ? false : stryMutAct_9fa48("917") ? true : (stryCov_9fa48("917", "918"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("920") ? false : stryMutAct_9fa48("919") ? true : (stryCov_9fa48("919", "920"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("921") ? "" : (stryCov_9fa48("921"), "No se pudo actualizar la cuadrilla."));
      }
    }
  }
}
export async function DELETE(request: Request, routeContext: Context) {
  if (stryMutAct_9fa48("922")) {
    {}
  } else {
    stryCov_9fa48("922");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("923")) {
        {}
      } else {
        stryCov_9fa48("923");
        const {
          id,
          session
        } = await context(request, routeContext);
        if (stryMutAct_9fa48("924")) {
          ;
        } else {
          stryCov_9fa48("924");
          requireOfficeCapability(session);
        }
        if (stryMutAct_9fa48("926") ? false : stryMutAct_9fa48("925") ? true : (stryCov_9fa48("925", "926"), backendMode(session))) return forwardResponse(await fetchBackend(request, stryMutAct_9fa48("927") ? `` : (stryCov_9fa48("927"), `/crews/${pathId(id)}`), stryMutAct_9fa48("928") ? "" : (stryCov_9fa48("928"), "crew:manage"), stryMutAct_9fa48("929") ? {} : (stryCov_9fa48("929"), {
          method: stryMutAct_9fa48("930") ? "" : (stryCov_9fa48("930"), "DELETE")
        })));
        const crew = crewFixtures.find(stryMutAct_9fa48("931") ? () => undefined : (stryCov_9fa48("931"), item => stryMutAct_9fa48("934") ? item.id !== id : stryMutAct_9fa48("933") ? false : stryMutAct_9fa48("932") ? true : (stryCov_9fa48("932", "933", "934"), item.id === id)));
        if (stryMutAct_9fa48("937") ? false : stryMutAct_9fa48("936") ? true : stryMutAct_9fa48("935") ? crew : (stryCov_9fa48("935", "936", "937"), !crew)) return errorResponse(404, stryMutAct_9fa48("938") ? `` : (stryCov_9fa48("938"), `La cuadrilla ${id} no existe.`), path);
        crew.active = stryMutAct_9fa48("939") ? true : (stryCov_9fa48("939"), false);
        return NextResponse.json(crew);
      }
    } catch (error) {
      if (stryMutAct_9fa48("940")) {
        {}
      } else {
        stryCov_9fa48("940");
        if (stryMutAct_9fa48("942") ? false : stryMutAct_9fa48("941") ? true : (stryCov_9fa48("941", "942"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("943") ? "" : (stryCov_9fa48("943"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("945") ? false : stryMutAct_9fa48("944") ? true : (stryCov_9fa48("944", "945"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("947") ? false : stryMutAct_9fa48("946") ? true : (stryCov_9fa48("946", "947"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("948") ? "" : (stryCov_9fa48("948"), "No se pudo dar de baja la cuadrilla."));
      }
    }
  }
}