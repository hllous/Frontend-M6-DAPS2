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
import { serviceTypeUpdateInputSchema } from "@/lib/service-types";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { serviceTypeFixtures, updateServiceTypeFixture } from "@/lib/service-type-fixtures";
async function targetId(context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("4439")) {
    {}
  } else {
    stryCov_9fa48("4439");
    return (await context.params).id;
  }
}
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("4440")) {
    {}
  } else {
    stryCov_9fa48("4440");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("4441")) {
        {}
      } else {
        stryCov_9fa48("4441");
        const session = getRequiredSession(request);
        const id = await targetId(context);
        if (stryMutAct_9fa48("4443") ? false : stryMutAct_9fa48("4442") ? true : (stryCov_9fa48("4442", "4443"), backendMode(session))) {
          if (stryMutAct_9fa48("4444")) {
            {}
          } else {
            stryCov_9fa48("4444");
            const response = await fetchBackend(request, stryMutAct_9fa48("4445") ? `` : (stryCov_9fa48("4445"), `/service-types/${pathId(id)}`));
            return forwardResponse(response);
          }
        }
        const item = serviceTypeFixtures.find(stryMutAct_9fa48("4446") ? () => undefined : (stryCov_9fa48("4446"), candidate => stryMutAct_9fa48("4449") ? candidate.id !== id : stryMutAct_9fa48("4448") ? false : stryMutAct_9fa48("4447") ? true : (stryCov_9fa48("4447", "4448", "4449"), candidate.id === id)));
        return item ? NextResponse.json(item) : errorResponse(404, stryMutAct_9fa48("4450") ? `` : (stryCov_9fa48("4450"), `Tipo de servicio ${id} no encontrado.`), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("4451")) {
        {}
      } else {
        stryCov_9fa48("4451");
        if (stryMutAct_9fa48("4453") ? false : stryMutAct_9fa48("4452") ? true : (stryCov_9fa48("4452", "4453"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("4454") ? "" : (stryCov_9fa48("4454"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("4456") ? false : stryMutAct_9fa48("4455") ? true : (stryCov_9fa48("4455", "4456"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("4457") ? "" : (stryCov_9fa48("4457"), "No se pudo cargar el tipo de servicio."));
      }
    }
  }
}
export async function PATCH(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("4458")) {
    {}
  } else {
    stryCov_9fa48("4458");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("4459")) {
        {}
      } else {
        stryCov_9fa48("4459");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("4462") ? scenario.actor.kind === "OFFICE" : stryMutAct_9fa48("4461") ? false : stryMutAct_9fa48("4460") ? true : (stryCov_9fa48("4460", "4461", "4462"), scenario.actor.kind !== (stryMutAct_9fa48("4463") ? "" : (stryCov_9fa48("4463"), "OFFICE")))) throw new ForbiddenSessionError(stryMutAct_9fa48("4465") ? "" : (stryCov_9fa48("4465"), "Solo Oficina puede administrar tipos de servicio."));
        authorize(session, stryMutAct_9fa48("4467") ? {} : (stryCov_9fa48("4467"), {
          capability: stryMutAct_9fa48("4468") ? "" : (stryCov_9fa48("4468"), "serviceType:manage"),
          throwOnError: stryMutAct_9fa48("4469") ? false : (stryCov_9fa48("4469"), true)
        }));
        const id = await targetId(context);
        const parsed = await parseJsonBody(request, serviceTypeUpdateInputSchema, path);
        if (stryMutAct_9fa48("4471") ? false : stryMutAct_9fa48("4470") ? true : (stryCov_9fa48("4470", "4471"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("4473") ? false : stryMutAct_9fa48("4472") ? true : (stryCov_9fa48("4472", "4473"), backendMode(session))) {
          if (stryMutAct_9fa48("4474")) {
            {}
          } else {
            stryCov_9fa48("4474");
            const response = await fetchBackend(request, stryMutAct_9fa48("4475") ? `` : (stryCov_9fa48("4475"), `/service-types/${pathId(id)}`), stryMutAct_9fa48("4476") ? "" : (stryCov_9fa48("4476"), "serviceType:manage"), stryMutAct_9fa48("4477") ? {} : (stryCov_9fa48("4477"), {
              method: stryMutAct_9fa48("4478") ? "" : (stryCov_9fa48("4478"), "PATCH"),
              headers: stryMutAct_9fa48("4479") ? {} : (stryCov_9fa48("4479"), {
                "content-type": stryMutAct_9fa48("4480") ? "" : (stryCov_9fa48("4480"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(response);
          }
        }
        const updated = updateServiceTypeFixture(id, parsed.data);
        return updated ? NextResponse.json(updated) : errorResponse(404, stryMutAct_9fa48("4481") ? `` : (stryCov_9fa48("4481"), `Tipo de servicio ${id} no encontrado.`), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("4482")) {
        {}
      } else {
        stryCov_9fa48("4482");
        if (stryMutAct_9fa48("4484") ? false : stryMutAct_9fa48("4483") ? true : (stryCov_9fa48("4483", "4484"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("4485") ? "" : (stryCov_9fa48("4485"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("4487") ? false : stryMutAct_9fa48("4486") ? true : (stryCov_9fa48("4486", "4487"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("4489") ? false : stryMutAct_9fa48("4488") ? true : (stryCov_9fa48("4488", "4489"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("4490") ? "" : (stryCov_9fa48("4490"), "No se pudo actualizar el tipo de servicio."));
      }
    }
  }
}
export async function DELETE(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("4491")) {
    {}
  } else {
    stryCov_9fa48("4491");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("4492")) {
        {}
      } else {
        stryCov_9fa48("4492");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("4495") ? scenario.actor.kind === "OFFICE" : stryMutAct_9fa48("4494") ? false : stryMutAct_9fa48("4493") ? true : (stryCov_9fa48("4493", "4494", "4495"), scenario.actor.kind !== (stryMutAct_9fa48("4496") ? "" : (stryCov_9fa48("4496"), "OFFICE")))) throw new ForbiddenSessionError(stryMutAct_9fa48("4498") ? "" : (stryCov_9fa48("4498"), "Solo Oficina puede dar de baja un tipo de servicio."));
        authorize(session, stryMutAct_9fa48("4500") ? {} : (stryCov_9fa48("4500"), {
          capability: stryMutAct_9fa48("4501") ? "" : (stryCov_9fa48("4501"), "serviceType:manage"),
          throwOnError: stryMutAct_9fa48("4502") ? false : (stryCov_9fa48("4502"), true)
        }));
        const id = await targetId(context);
        if (stryMutAct_9fa48("4504") ? false : stryMutAct_9fa48("4503") ? true : (stryCov_9fa48("4503", "4504"), backendMode(session))) {
          if (stryMutAct_9fa48("4505")) {
            {}
          } else {
            stryCov_9fa48("4505");
            const response = await fetchBackend(request, stryMutAct_9fa48("4506") ? `` : (stryCov_9fa48("4506"), `/service-types/${pathId(id)}`), stryMutAct_9fa48("4507") ? "" : (stryCov_9fa48("4507"), "serviceType:manage"), stryMutAct_9fa48("4508") ? {} : (stryCov_9fa48("4508"), {
              method: stryMutAct_9fa48("4509") ? "" : (stryCov_9fa48("4509"), "DELETE")
            }));
            return forwardResponse(response);
          }
        }
        const updated = updateServiceTypeFixture(id, stryMutAct_9fa48("4510") ? {} : (stryCov_9fa48("4510"), {
          active: stryMutAct_9fa48("4511") ? true : (stryCov_9fa48("4511"), false)
        }));
        return updated ? NextResponse.json(updated) : errorResponse(404, stryMutAct_9fa48("4512") ? `` : (stryCov_9fa48("4512"), `Tipo de servicio ${id} no encontrado.`), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("4513")) {
        {}
      } else {
        stryCov_9fa48("4513");
        if (stryMutAct_9fa48("4515") ? false : stryMutAct_9fa48("4514") ? true : (stryCov_9fa48("4514", "4515"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("4516") ? "" : (stryCov_9fa48("4516"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("4518") ? false : stryMutAct_9fa48("4517") ? true : (stryCov_9fa48("4517", "4518"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("4520") ? false : stryMutAct_9fa48("4519") ? true : (stryCov_9fa48("4519", "4520"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("4521") ? "" : (stryCov_9fa48("4521"), "No se pudo dar de baja el tipo de servicio."));
      }
    }
  }
}