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
import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/bff-backend";
import { addTreeInterventionFixture, createTreeInterventionFixture, filterTreeInterventionFixtures, paginateTreeInterventionFixtures } from "@/lib/tree-intervention-fixtures";
import { treeInterventionCreateInputSchema, treeInterventionPrioritySchema, treeInterventionStatusSchema, treeInterventionTypeSchema, type TreeInterventionQuery } from "@/lib/tree-interventions";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { pageParam, pageSizeParam } from "@/lib/input-limits";
function queryFromUrl(url: URL): TreeInterventionQuery {
  if (stryMutAct_9fa48("5813")) {
    {}
  } else {
    stryCov_9fa48("5813");
    return stryMutAct_9fa48("5814") ? {} : (stryCov_9fa48("5814"), {
      interventionType: treeInterventionTypeSchema.safeParse(url.searchParams.get(stryMutAct_9fa48("5815") ? "" : (stryCov_9fa48("5815"), "interventionType"))).data,
      status: treeInterventionStatusSchema.safeParse(url.searchParams.get(stryMutAct_9fa48("5816") ? "" : (stryCov_9fa48("5816"), "status"))).data,
      priority: treeInterventionPrioritySchema.safeParse(url.searchParams.get(stryMutAct_9fa48("5817") ? "" : (stryCov_9fa48("5817"), "priority"))).data,
      page: pageParam(url.searchParams),
      pageSize: pageSizeParam(url.searchParams)
    });
  }
}
function queryString(query: TreeInterventionQuery) {
  if (stryMutAct_9fa48("5818")) {
    {}
  } else {
    stryCov_9fa48("5818");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("5821") ? query.interventionType === undefined : stryMutAct_9fa48("5820") ? false : stryMutAct_9fa48("5819") ? true : (stryCov_9fa48("5819", "5820", "5821"), query.interventionType !== undefined)) params.set(stryMutAct_9fa48("5823") ? "" : (stryCov_9fa48("5823"), "interventionType"), String(query.interventionType));
    if (stryMutAct_9fa48("5826") ? query.status === undefined : stryMutAct_9fa48("5825") ? false : stryMutAct_9fa48("5824") ? true : (stryCov_9fa48("5824", "5825", "5826"), query.status !== undefined)) params.set(stryMutAct_9fa48("5828") ? "" : (stryCov_9fa48("5828"), "status"), String(query.status));
    if (stryMutAct_9fa48("5831") ? query.priority === undefined : stryMutAct_9fa48("5830") ? false : stryMutAct_9fa48("5829") ? true : (stryCov_9fa48("5829", "5830", "5831"), query.priority !== undefined)) params.set(stryMutAct_9fa48("5833") ? "" : (stryCov_9fa48("5833"), "priority"), query.priority);
    if (stryMutAct_9fa48("5836") ? query.page === undefined : stryMutAct_9fa48("5835") ? false : stryMutAct_9fa48("5834") ? true : (stryCov_9fa48("5834", "5835", "5836"), query.page !== undefined)) params.set(stryMutAct_9fa48("5838") ? "" : (stryCov_9fa48("5838"), "page"), String(query.page));
    if (stryMutAct_9fa48("5841") ? query.pageSize === undefined : stryMutAct_9fa48("5840") ? false : stryMutAct_9fa48("5839") ? true : (stryCov_9fa48("5839", "5840", "5841"), query.pageSize !== undefined)) params.set(stryMutAct_9fa48("5843") ? "" : (stryCov_9fa48("5843"), "pageSize"), String(query.pageSize));
    const value = params.toString();
    return value ? stryMutAct_9fa48("5844") ? `` : (stryCov_9fa48("5844"), `?${value}`) : stryMutAct_9fa48("5845") ? "Stryker was here!" : (stryCov_9fa48("5845"), "");
  }
}
export async function GET(request: Request) {
  if (stryMutAct_9fa48("5846")) {
    {}
  } else {
    stryCov_9fa48("5846");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("5847")) {
        {}
      } else {
        stryCov_9fa48("5847");
        const session = getRequiredSession(request);
        const query = queryFromUrl(new URL(request.url));
        if (stryMutAct_9fa48("5849") ? false : stryMutAct_9fa48("5848") ? true : (stryCov_9fa48("5848", "5849"), backendMode(session))) {
          if (stryMutAct_9fa48("5850")) {
            {}
          } else {
            stryCov_9fa48("5850");
            const response = await fetchBackend(request, stryMutAct_9fa48("5851") ? `` : (stryCov_9fa48("5851"), `/tree-interventions${queryString(query)}`));
            return forwardResponse(response);
          }
        }
        return NextResponse.json(paginateTreeInterventionFixtures(filterTreeInterventionFixtures(query), query.page, query.pageSize));
      }
    } catch (error) {
      if (stryMutAct_9fa48("5852")) {
        {}
      } else {
        stryCov_9fa48("5852");
        if (stryMutAct_9fa48("5854") ? false : stryMutAct_9fa48("5853") ? true : (stryCov_9fa48("5853", "5854"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("5855") ? "" : (stryCov_9fa48("5855"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("5857") ? false : stryMutAct_9fa48("5856") ? true : (stryCov_9fa48("5856", "5857"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("5858") ? "" : (stryCov_9fa48("5858"), "No se pudieron cargar las intervenciones de arbolado."));
      }
    }
  }
}
export async function POST(request: Request) {
  if (stryMutAct_9fa48("5859")) {
    {}
  } else {
    stryCov_9fa48("5859");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("5860")) {
        {}
      } else {
        stryCov_9fa48("5860");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("5862") ? {} : (stryCov_9fa48("5862"), {
          capability: stryMutAct_9fa48("5863") ? "" : (stryCov_9fa48("5863"), "treeIntervention:request"),
          throwOnError: stryMutAct_9fa48("5864") ? false : (stryCov_9fa48("5864"), true)
        }));
        const parsed = treeInterventionCreateInputSchema.safeParse(await request.json().catch(() => undefined));
        if (stryMutAct_9fa48("5867") ? false : stryMutAct_9fa48("5866") ? true : stryMutAct_9fa48("5865") ? parsed.success : (stryCov_9fa48("5865", "5866", "5867"), !parsed.success)) return errorResponse(400, parsed.error.issues.map(stryMutAct_9fa48("5868") ? () => undefined : (stryCov_9fa48("5868"), issue => issue.message)).join(stryMutAct_9fa48("5869") ? "" : (stryCov_9fa48("5869"), " ")), path);
        if (stryMutAct_9fa48("5871") ? false : stryMutAct_9fa48("5870") ? true : (stryCov_9fa48("5870", "5871"), backendMode(session))) {
          if (stryMutAct_9fa48("5872")) {
            {}
          } else {
            stryCov_9fa48("5872");
            const response = await fetchBackend(request, stryMutAct_9fa48("5873") ? "" : (stryCov_9fa48("5873"), "/tree-interventions"), stryMutAct_9fa48("5874") ? "" : (stryCov_9fa48("5874"), "treeIntervention:request"), stryMutAct_9fa48("5875") ? {} : (stryCov_9fa48("5875"), {
              method: stryMutAct_9fa48("5876") ? "" : (stryCov_9fa48("5876"), "POST"),
              headers: stryMutAct_9fa48("5877") ? {} : (stryCov_9fa48("5877"), {
                "content-type": stryMutAct_9fa48("5878") ? "" : (stryCov_9fa48("5878"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(response);
          }
        }
        const created = createTreeInterventionFixture(parsed.data);
        if (stryMutAct_9fa48("5879")) {
          ;
        } else {
          stryCov_9fa48("5879");
          addTreeInterventionFixture(created);
        }
        return NextResponse.json(created, stryMutAct_9fa48("5880") ? {} : (stryCov_9fa48("5880"), {
          status: 201
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("5881")) {
        {}
      } else {
        stryCov_9fa48("5881");
        if (stryMutAct_9fa48("5883") ? false : stryMutAct_9fa48("5882") ? true : (stryCov_9fa48("5882", "5883"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("5884") ? "" : (stryCov_9fa48("5884"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("5886") ? false : stryMutAct_9fa48("5885") ? true : (stryCov_9fa48("5885", "5886"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("5888") ? false : stryMutAct_9fa48("5887") ? true : (stryCov_9fa48("5887", "5888"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("5889") ? "" : (stryCov_9fa48("5889"), "No se pudo crear la intervención de arbolado."));
      }
    }
  }
}