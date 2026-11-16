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
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { updateTreeFixture } from "@/lib/tree-fixtures";
import { addTreeSurveyFixture, createTreeSurveyFixture, filterTreeSurveyFixtures, paginateTreeSurveyFixtures } from "@/lib/tree-survey-fixtures";
import { treeHealthStatusSchema, treeSurveyCreateInputSchema, riskLevelSchema, type TreeSurveyQuery } from "@/lib/tree-surveys";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { pageParam, pageSizeParam } from "@/lib/input-limits";
async function treeId(context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("6116")) {
    {}
  } else {
    stryCov_9fa48("6116");
    return (await context.params).id;
  }
}
function queryFromUrl(url: URL): TreeSurveyQuery {
  if (stryMutAct_9fa48("6117")) {
    {}
  } else {
    stryCov_9fa48("6117");
    return stryMutAct_9fa48("6118") ? {} : (stryCov_9fa48("6118"), {
      healthStatus: treeHealthStatusSchema.safeParse(url.searchParams.get(stryMutAct_9fa48("6119") ? "" : (stryCov_9fa48("6119"), "healthStatus"))).data,
      riskLevel: riskLevelSchema.safeParse(url.searchParams.get(stryMutAct_9fa48("6120") ? "" : (stryCov_9fa48("6120"), "riskLevel"))).data,
      page: pageParam(url.searchParams),
      pageSize: pageSizeParam(url.searchParams)
    });
  }
}
function queryString(query: TreeSurveyQuery) {
  if (stryMutAct_9fa48("6121")) {
    {}
  } else {
    stryCov_9fa48("6121");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("6124") ? query.healthStatus === undefined : stryMutAct_9fa48("6123") ? false : stryMutAct_9fa48("6122") ? true : (stryCov_9fa48("6122", "6123", "6124"), query.healthStatus !== undefined)) params.set(stryMutAct_9fa48("6126") ? "" : (stryCov_9fa48("6126"), "healthStatus"), String(query.healthStatus));
    if (stryMutAct_9fa48("6129") ? query.riskLevel === undefined : stryMutAct_9fa48("6128") ? false : stryMutAct_9fa48("6127") ? true : (stryCov_9fa48("6127", "6128", "6129"), query.riskLevel !== undefined)) params.set(stryMutAct_9fa48("6131") ? "" : (stryCov_9fa48("6131"), "riskLevel"), String(query.riskLevel));
    if (stryMutAct_9fa48("6134") ? query.page === undefined : stryMutAct_9fa48("6133") ? false : stryMutAct_9fa48("6132") ? true : (stryCov_9fa48("6132", "6133", "6134"), query.page !== undefined)) params.set(stryMutAct_9fa48("6136") ? "" : (stryCov_9fa48("6136"), "page"), String(query.page));
    if (stryMutAct_9fa48("6139") ? query.pageSize === undefined : stryMutAct_9fa48("6138") ? false : stryMutAct_9fa48("6137") ? true : (stryCov_9fa48("6137", "6138", "6139"), query.pageSize !== undefined)) params.set(stryMutAct_9fa48("6141") ? "" : (stryCov_9fa48("6141"), "pageSize"), String(query.pageSize));
    const value = params.toString();
    return value ? stryMutAct_9fa48("6142") ? `` : (stryCov_9fa48("6142"), `?${value}`) : stryMutAct_9fa48("6143") ? "Stryker was here!" : (stryCov_9fa48("6143"), "");
  }
}
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("6144")) {
    {}
  } else {
    stryCov_9fa48("6144");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("6145")) {
        {}
      } else {
        stryCov_9fa48("6145");
        const session = getRequiredSession(request);
        const id = await treeId(context);
        const query = queryFromUrl(new URL(request.url));
        if (stryMutAct_9fa48("6147") ? false : stryMutAct_9fa48("6146") ? true : (stryCov_9fa48("6146", "6147"), backendMode(session))) {
          if (stryMutAct_9fa48("6148")) {
            {}
          } else {
            stryCov_9fa48("6148");
            const response = await fetchBackend(request, stryMutAct_9fa48("6149") ? `` : (stryCov_9fa48("6149"), `/trees/${pathId(id)}/surveys${queryString(query)}`));
            return forwardResponse(response);
          }
        }
        return NextResponse.json(paginateTreeSurveyFixtures(filterTreeSurveyFixtures(id, query), query.page, query.pageSize));
      }
    } catch (error) {
      if (stryMutAct_9fa48("6150")) {
        {}
      } else {
        stryCov_9fa48("6150");
        if (stryMutAct_9fa48("6152") ? false : stryMutAct_9fa48("6151") ? true : (stryCov_9fa48("6151", "6152"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("6153") ? "" : (stryCov_9fa48("6153"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("6155") ? false : stryMutAct_9fa48("6154") ? true : (stryCov_9fa48("6154", "6155"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("6156") ? "" : (stryCov_9fa48("6156"), "No se pudo cargar el historial de relevamientos."));
      }
    }
  }
}
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("6157")) {
    {}
  } else {
    stryCov_9fa48("6157");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("6158")) {
        {}
      } else {
        stryCov_9fa48("6158");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("6160") ? {} : (stryCov_9fa48("6160"), {
          capability: stryMutAct_9fa48("6161") ? "" : (stryCov_9fa48("6161"), "tree:survey"),
          throwOnError: stryMutAct_9fa48("6162") ? false : (stryCov_9fa48("6162"), true)
        }));
        const id = await treeId(context);
        const body = await request.json().catch(() => undefined);
        const parsed = treeSurveyCreateInputSchema.safeParse(body);
        if (stryMutAct_9fa48("6165") ? false : stryMutAct_9fa48("6164") ? true : stryMutAct_9fa48("6163") ? parsed.success : (stryCov_9fa48("6163", "6164", "6165"), !parsed.success)) return errorResponse(400, parsed.error.issues.map(stryMutAct_9fa48("6166") ? () => undefined : (stryCov_9fa48("6166"), issue => issue.message)).join(stryMutAct_9fa48("6167") ? "" : (stryCov_9fa48("6167"), " ")), path);
        if (stryMutAct_9fa48("6169") ? false : stryMutAct_9fa48("6168") ? true : (stryCov_9fa48("6168", "6169"), backendMode(session))) {
          if (stryMutAct_9fa48("6170")) {
            {}
          } else {
            stryCov_9fa48("6170");
            const response = await fetchBackend(request, stryMutAct_9fa48("6171") ? `` : (stryCov_9fa48("6171"), `/trees/${pathId(id)}/surveys`), stryMutAct_9fa48("6172") ? "" : (stryCov_9fa48("6172"), "tree:survey"), stryMutAct_9fa48("6173") ? {} : (stryCov_9fa48("6173"), {
              method: stryMutAct_9fa48("6174") ? "" : (stryCov_9fa48("6174"), "POST"),
              headers: stryMutAct_9fa48("6175") ? {} : (stryCov_9fa48("6175"), {
                "content-type": stryMutAct_9fa48("6176") ? "" : (stryCov_9fa48("6176"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(response);
          }
        }
        if (stryMutAct_9fa48("6179") ? false : stryMutAct_9fa48("6178") ? true : stryMutAct_9fa48("6177") ? session.scenarioId : (stryCov_9fa48("6177", "6178", "6179"), !session.scenarioId)) throw new ForbiddenSessionError(stryMutAct_9fa48("6181") ? "" : (stryCov_9fa48("6181"), "La sesión no tiene un escenario operativo asignado."));
        const created = createTreeSurveyFixture(id, parsed.data, session.scenarioId);
        if (stryMutAct_9fa48("6182")) {
          ;
        } else {
          stryCov_9fa48("6182");
          addTreeSurveyFixture(created);
        }
        updateTreeFixture(id, stryMutAct_9fa48("6184") ? {} : (stryCov_9fa48("6184"), {
          lastSurvey: stryMutAct_9fa48("6185") ? {} : (stryCov_9fa48("6185"), {
            surveyedAt: created.surveyedAt,
            healthStatus: created.healthStatus,
            riskLevel: created.riskLevel,
            riskType: created.riskType,
            suggestedIntervention: created.suggestedIntervention
          })
        }));
        return NextResponse.json(created, stryMutAct_9fa48("6186") ? {} : (stryCov_9fa48("6186"), {
          status: 201
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("6187")) {
        {}
      } else {
        stryCov_9fa48("6187");
        if (stryMutAct_9fa48("6189") ? false : stryMutAct_9fa48("6188") ? true : (stryCov_9fa48("6188", "6189"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("6190") ? "" : (stryCov_9fa48("6190"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("6192") ? false : stryMutAct_9fa48("6191") ? true : (stryCov_9fa48("6191", "6192"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("6194") ? false : stryMutAct_9fa48("6193") ? true : (stryCov_9fa48("6193", "6194"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("6195") ? "" : (stryCov_9fa48("6195"), "No se pudo registrar el relevamiento."));
      }
    }
  }
}