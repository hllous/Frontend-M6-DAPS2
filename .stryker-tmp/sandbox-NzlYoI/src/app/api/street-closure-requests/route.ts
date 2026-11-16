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
import { backendMode, backendQuery, errorResponse, mapSessionError, forwardResponse, requireCrewScope, FORBIDDEN_CODES, handleRouteError, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { withArgentinaOffset } from "@/lib/argentina-date";
import { fetchBackend } from "@/lib/bff-backend";
import { addStreetClosureRequestFixture, createStreetClosureRequestFixture, filterStreetClosureRequestFixtures, paginateStreetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";
import { type CreateStreetClosureRequestInput, createStreetClosureRequestInputSchema, streetClosureRequestQuerySchema } from "@/lib/street-closure-requests";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { serviceFixtures } from "@/lib/services-fixtures";
import { getTreeInterventionFixture } from "@/lib/tree-intervention-fixtures";
import { pageParam, pageSizeParam } from "@/lib/input-limits";
async function requireReadAccess(request: Request, path: string, sourceId?: string) {
  if (stryMutAct_9fa48("5668")) {
    {}
  } else {
    stryCov_9fa48("5668");
    const session = getRequiredSession(request);
    const scenario = getScenario(session);
    if (stryMutAct_9fa48("5671") ? scenario.actor.kind !== "OFFICE" : stryMutAct_9fa48("5670") ? false : stryMutAct_9fa48("5669") ? true : (stryCov_9fa48("5669", "5670", "5671"), scenario.actor.kind === (stryMutAct_9fa48("5672") ? "" : (stryCov_9fa48("5672"), "OFFICE")))) return stryMutAct_9fa48("5673") ? {} : (stryCov_9fa48("5673"), {
      session,
      scenario
    });

    // Field may read only the dependency context for a Service assigned to its crew.
    // Backend remains authoritative for this scope when the BFF is forwarding.
    if (stryMutAct_9fa48("5676") ? sourceId || backendMode(session) : stryMutAct_9fa48("5675") ? false : stryMutAct_9fa48("5674") ? true : (stryCov_9fa48("5674", "5675", "5676"), sourceId && backendMode(session))) {
      if (stryMutAct_9fa48("5677")) {
        {}
      } else {
        stryCov_9fa48("5677");
        const scopedService = await requireCrewScope(request, session, stryMutAct_9fa48("5678") ? {} : (stryCov_9fa48("5678"), {
          serviceId: sourceId
        }));
        if (stryMutAct_9fa48("5680") ? false : stryMutAct_9fa48("5679") ? true : (stryCov_9fa48("5679", "5680"), scopedService instanceof Response)) return stryMutAct_9fa48("5681") ? {} : (stryCov_9fa48("5681"), {
          response: scopedService
        });
        return stryMutAct_9fa48("5682") ? {} : (stryCov_9fa48("5682"), {
          session,
          scenario
        });
      }
    }
    const service = sourceId ? serviceFixtures.find(stryMutAct_9fa48("5683") ? () => undefined : (stryCov_9fa48("5683"), candidate => stryMutAct_9fa48("5686") ? candidate.id !== sourceId : stryMutAct_9fa48("5685") ? false : stryMutAct_9fa48("5684") ? true : (stryCov_9fa48("5684", "5685", "5686"), candidate.id === sourceId))) : undefined;
    if (stryMutAct_9fa48("5689") ? (!sourceId || !service) && service.crewId !== scenario.actor.crewId : stryMutAct_9fa48("5688") ? false : stryMutAct_9fa48("5687") ? true : (stryCov_9fa48("5687", "5688", "5689"), (stryMutAct_9fa48("5691") ? !sourceId && !service : stryMutAct_9fa48("5690") ? false : (stryCov_9fa48("5690", "5691"), (stryMutAct_9fa48("5692") ? sourceId : (stryCov_9fa48("5692"), !sourceId)) || (stryMutAct_9fa48("5693") ? service : (stryCov_9fa48("5693"), !service)))) || (stryMutAct_9fa48("5695") ? service.crewId === scenario.actor.crewId : stryMutAct_9fa48("5694") ? false : (stryCov_9fa48("5694", "5695"), service.crewId !== scenario.actor.crewId)))) {
      if (stryMutAct_9fa48("5696")) {
        {}
      } else {
        stryCov_9fa48("5696");
        return stryMutAct_9fa48("5697") ? {} : (stryCov_9fa48("5697"), {
          response: errorResponse(403, stryMutAct_9fa48("5698") ? "" : (stryCov_9fa48("5698"), "Solo Oficina puede consultar solicitudes de corte de calle."), path)
        });
      }
    }
    return stryMutAct_9fa48("5699") ? {} : (stryCov_9fa48("5699"), {
      session,
      scenario
    });
  }
}
export async function GET(request: Request) {
  if (stryMutAct_9fa48("5700")) {
    {}
  } else {
    stryCov_9fa48("5700");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("5701")) {
        {}
      } else {
        stryCov_9fa48("5701");
        const sourceId = stryMutAct_9fa48("5702") ? new URL(request.url).searchParams.get("sourceId") && undefined : (stryCov_9fa48("5702"), new URL(request.url).searchParams.get(stryMutAct_9fa48("5703") ? "" : (stryCov_9fa48("5703"), "sourceId")) ?? undefined);
        const access = await requireReadAccess(request, path, sourceId);
        if (stryMutAct_9fa48("5705") ? false : stryMutAct_9fa48("5704") ? true : (stryCov_9fa48("5704", "5705"), access.response)) return access.response;
        const queryResult = streetClosureRequestQuerySchema.safeParse(stryMutAct_9fa48("5706") ? {} : (stryCov_9fa48("5706"), {
          status: stryMutAct_9fa48("5707") ? new URL(request.url).searchParams.get("status") && undefined : (stryCov_9fa48("5707"), new URL(request.url).searchParams.get(stryMutAct_9fa48("5708") ? "" : (stryCov_9fa48("5708"), "status")) ?? undefined),
          sourceId: stryMutAct_9fa48("5709") ? new URL(request.url).searchParams.get("sourceId") && undefined : (stryCov_9fa48("5709"), new URL(request.url).searchParams.get(stryMutAct_9fa48("5710") ? "" : (stryCov_9fa48("5710"), "sourceId")) ?? undefined),
          page: pageParam(new URL(request.url).searchParams),
          pageSize: pageSizeParam(new URL(request.url).searchParams)
        }));
        if (stryMutAct_9fa48("5713") ? false : stryMutAct_9fa48("5712") ? true : stryMutAct_9fa48("5711") ? queryResult.success : (stryCov_9fa48("5711", "5712", "5713"), !queryResult.success)) {
          if (stryMutAct_9fa48("5714")) {
            {}
          } else {
            stryCov_9fa48("5714");
            return errorResponse(400, stryMutAct_9fa48("5715") ? "" : (stryCov_9fa48("5715"), "Los filtros de solicitudes de corte de calle son inválidos."), path);
          }
        }
        if (stryMutAct_9fa48("5718") ? access.session || backendMode(access.session) : stryMutAct_9fa48("5717") ? false : stryMutAct_9fa48("5716") ? true : (stryCov_9fa48("5716", "5717", "5718"), access.session && backendMode(access.session))) {
          if (stryMutAct_9fa48("5719")) {
            {}
          } else {
            stryCov_9fa48("5719");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("5720") ? `` : (stryCov_9fa48("5720"), `/street-closure-requests${backendQuery(queryResult.data, stryMutAct_9fa48("5721") ? [] : (stryCov_9fa48("5721"), [stryMutAct_9fa48("5722") ? "" : (stryCov_9fa48("5722"), "status"), stryMutAct_9fa48("5723") ? "" : (stryCov_9fa48("5723"), "sourceId"), stryMutAct_9fa48("5724") ? "" : (stryCov_9fa48("5724"), "page"), stryMutAct_9fa48("5725") ? "" : (stryCov_9fa48("5725"), "pageSize")]))}`));
            return forwardResponse(backendResponse);
          }
        }
        return NextResponse.json(paginateStreetClosureRequestFixtures(filterStreetClosureRequestFixtures(queryResult.data), queryResult.data.page, queryResult.data.pageSize));
      }
    } catch (error) {
      if (stryMutAct_9fa48("5726")) {
        {}
      } else {
        stryCov_9fa48("5726");
        if (stryMutAct_9fa48("5728") ? false : stryMutAct_9fa48("5727") ? true : (stryCov_9fa48("5727", "5728"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("5729") ? "" : (stryCov_9fa48("5729"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("5731") ? false : stryMutAct_9fa48("5730") ? true : (stryCov_9fa48("5730", "5731"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("5732") ? "" : (stryCov_9fa48("5732"), "No se pudieron cargar las solicitudes de corte de calle."));
      }
    }
  }
}

// Backend's CreateStreetClosureRequestDto is strict (forbidNonWhitelisted): it names the
// collection `sections` and has no `sourceModule`, so send exactly its wire shape.
// The form sends a zoneless local window; Backend parses it with `new Date` on a UTC server,
// so it gets the Argentina offset here (#917).
function toBackendCreateBody({
  affectedSections,
  sourceModule: _sourceModule,
  requestedFrom,
  requestedTo,
  ...rest
}: CreateStreetClosureRequestInput) {
  if (stryMutAct_9fa48("5733")) {
    {}
  } else {
    stryCov_9fa48("5733");
    return stryMutAct_9fa48("5734") ? {} : (stryCov_9fa48("5734"), {
      ...rest,
      requestedFrom: withArgentinaOffset(requestedFrom),
      requestedTo: withArgentinaOffset(requestedTo),
      sections: affectedSections
    });
  }
}
export async function POST(request: Request) {
  if (stryMutAct_9fa48("5735")) {
    {}
  } else {
    stryCov_9fa48("5735");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("5736")) {
        {}
      } else {
        stryCov_9fa48("5736");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("5739") ? false : stryMutAct_9fa48("5738") ? true : stryMutAct_9fa48("5737") ? scenario.capabilities.includes("streetClosureRequest:create") : (stryCov_9fa48("5737", "5738", "5739"), !scenario.capabilities.includes(stryMutAct_9fa48("5740") ? "" : (stryCov_9fa48("5740"), "streetClosureRequest:create")))) {
          if (stryMutAct_9fa48("5741")) {
            {}
          } else {
            stryCov_9fa48("5741");
            return errorResponse(403, stryMutAct_9fa48("5742") ? "" : (stryCov_9fa48("5742"), "Su rol no permite crear solicitudes de corte de calle."), path, FORBIDDEN_CODES.roleRequired);
          }
        }
        const parsed = await parseJsonBody(request, createStreetClosureRequestInputSchema, path);
        if (stryMutAct_9fa48("5744") ? false : stryMutAct_9fa48("5743") ? true : (stryCov_9fa48("5743", "5744"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("5747") ? session || backendMode(session) : stryMutAct_9fa48("5746") ? false : stryMutAct_9fa48("5745") ? true : (stryCov_9fa48("5745", "5746", "5747"), session && backendMode(session))) {
          if (stryMutAct_9fa48("5748")) {
            {}
          } else {
            stryCov_9fa48("5748");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("5749") ? "" : (stryCov_9fa48("5749"), "/street-closure-requests"), undefined, stryMutAct_9fa48("5750") ? {} : (stryCov_9fa48("5750"), {
              method: stryMutAct_9fa48("5751") ? "" : (stryCov_9fa48("5751"), "POST"),
              headers: stryMutAct_9fa48("5752") ? {} : (stryCov_9fa48("5752"), {
                "content-type": stryMutAct_9fa48("5753") ? "" : (stryCov_9fa48("5753"), "application/json")
              }),
              body: JSON.stringify(toBackendCreateBody(parsed.data))
            }));
            return forwardResponse(backendResponse);
          }
        }
        const source = (stryMutAct_9fa48("5756") ? parsed.data.sourceType !== "SERVICE" : stryMutAct_9fa48("5755") ? false : stryMutAct_9fa48("5754") ? true : (stryCov_9fa48("5754", "5755", "5756"), parsed.data.sourceType === (stryMutAct_9fa48("5757") ? "" : (stryCov_9fa48("5757"), "SERVICE")))) ? serviceFixtures.find(stryMutAct_9fa48("5758") ? () => undefined : (stryCov_9fa48("5758"), candidate => stryMutAct_9fa48("5761") ? candidate.id !== parsed.data.sourceId : stryMutAct_9fa48("5760") ? false : stryMutAct_9fa48("5759") ? true : (stryCov_9fa48("5759", "5760", "5761"), candidate.id === parsed.data.sourceId))) : getTreeInterventionFixture(parsed.data.sourceId);
        if (stryMutAct_9fa48("5764") ? false : stryMutAct_9fa48("5763") ? true : stryMutAct_9fa48("5762") ? source : (stryCov_9fa48("5762", "5763", "5764"), !source)) {
          if (stryMutAct_9fa48("5765")) {
            {}
          } else {
            stryCov_9fa48("5765");
            return errorResponse(404, (stryMutAct_9fa48("5768") ? parsed.data.sourceType !== "SERVICE" : stryMutAct_9fa48("5767") ? false : stryMutAct_9fa48("5766") ? true : (stryCov_9fa48("5766", "5767", "5768"), parsed.data.sourceType === (stryMutAct_9fa48("5769") ? "" : (stryCov_9fa48("5769"), "SERVICE")))) ? stryMutAct_9fa48("5770") ? `` : (stryCov_9fa48("5770"), `Servicio ${parsed.data.sourceId} no encontrado.`) : stryMutAct_9fa48("5771") ? `` : (stryCov_9fa48("5771"), `Intervención de arbolado ${parsed.data.sourceId} no encontrada.`), path);
          }
        }
        if (stryMutAct_9fa48("5774") ? parsed.data.sourceType === "TREE_INTERVENTION" || source.status !== "AUTHORIZED" : stryMutAct_9fa48("5773") ? false : stryMutAct_9fa48("5772") ? true : (stryCov_9fa48("5772", "5773", "5774"), (stryMutAct_9fa48("5776") ? parsed.data.sourceType !== "TREE_INTERVENTION" : stryMutAct_9fa48("5775") ? true : (stryCov_9fa48("5775", "5776"), parsed.data.sourceType === (stryMutAct_9fa48("5777") ? "" : (stryCov_9fa48("5777"), "TREE_INTERVENTION")))) && (stryMutAct_9fa48("5779") ? source.status === "AUTHORIZED" : stryMutAct_9fa48("5778") ? true : (stryCov_9fa48("5778", "5779"), source.status !== (stryMutAct_9fa48("5780") ? "" : (stryCov_9fa48("5780"), "AUTHORIZED")))))) {
          if (stryMutAct_9fa48("5781")) {
            {}
          } else {
            stryCov_9fa48("5781");
            return errorResponse(409, stryMutAct_9fa48("5782") ? "" : (stryCov_9fa48("5782"), "Solo se puede solicitar un corte de calle desde una intervención de arbolado autorizada."), path);
          }
        }
        const created = createStreetClosureRequestFixture(parsed.data, source);
        if (stryMutAct_9fa48("5783")) {
          ;
        } else {
          stryCov_9fa48("5783");
          addStreetClosureRequestFixture(created);
        }
        return NextResponse.json(created, stryMutAct_9fa48("5784") ? {} : (stryCov_9fa48("5784"), {
          status: 201
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("5785")) {
        {}
      } else {
        stryCov_9fa48("5785");
        return handleRouteError(error, path, stryMutAct_9fa48("5786") ? "" : (stryCov_9fa48("5786"), "No se pudo crear la solicitud de corte de calle."));
      }
    }
  }
}