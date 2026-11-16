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
import { authorize, backendMode, errorResponse, FORBIDDEN_CODES } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getEnvironmentalInspectionFixture } from "@/lib/environmental-report-fixtures";
import { environmentalInspectionSchema } from "@/lib/environmental-reports";
import { serviceFixtures } from "@/lib/services-fixtures";
import { getScenario } from "@/lib/scenarios";
import { withInspectionAttachments } from "../_attachments";
import { AuthUnavailableError, BackendUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
function projectFieldInspection(inspection: Record<string, unknown>) {
  if (stryMutAct_9fa48("1330")) {
    {}
  } else {
    stryCov_9fa48("1330");
    const projected = stryMutAct_9fa48("1331") ? {} : (stryCov_9fa48("1331"), {
      ...inspection
    });
    delete projected.inspectorId;
    delete projected.reporterSnapshot;
    delete projected.violationNotice;
    return projected;
  }
}
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("1332")) {
    {}
  } else {
    stryCov_9fa48("1332");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("1333")) {
        {}
      } else {
        stryCov_9fa48("1333");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("1335") ? {} : (stryCov_9fa48("1335"), {
          capability: stryMutAct_9fa48("1336") ? "" : (stryCov_9fa48("1336"), "environmentalInspection:view"),
          throwOnError: stryMutAct_9fa48("1337") ? false : (stryCov_9fa48("1337"), true)
        }));
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("1339") ? false : stryMutAct_9fa48("1338") ? true : (stryCov_9fa48("1338", "1339"), backendMode(session))) {
          if (stryMutAct_9fa48("1340")) {
            {}
          } else {
            stryCov_9fa48("1340");
            const backendResponse = await fetchBackend(request, (stryMutAct_9fa48("1341") ? "" : (stryCov_9fa48("1341"), "/environmental-inspections/")) + pathId(id), stryMutAct_9fa48("1342") ? "" : (stryCov_9fa48("1342"), "environmentalInspection:view"));
            if (stryMutAct_9fa48("1345") ? false : stryMutAct_9fa48("1344") ? true : stryMutAct_9fa48("1343") ? backendResponse.ok : (stryCov_9fa48("1343", "1344", "1345"), !backendResponse.ok)) return withInspectionAttachments(request, backendResponse);
            let payload: unknown;
            try {
              if (stryMutAct_9fa48("1346")) {
                {}
              } else {
                stryCov_9fa48("1346");
                payload = await backendResponse.json();
              }
            } catch {
              if (stryMutAct_9fa48("1347")) {
                {}
              } else {
                stryCov_9fa48("1347");
                return errorResponse(502, stryMutAct_9fa48("1348") ? "" : (stryCov_9fa48("1348"), "No se pudo obtener la inspección. Reintente en unos segundos."), path);
              }
            }
            const parsed = environmentalInspectionSchema.safeParse(payload);
            if (stryMutAct_9fa48("1351") ? false : stryMutAct_9fa48("1350") ? true : stryMutAct_9fa48("1349") ? parsed.success : (stryCov_9fa48("1349", "1350", "1351"), !parsed.success)) return errorResponse(502, stryMutAct_9fa48("1352") ? "" : (stryCov_9fa48("1352"), "No se pudo obtener la inspección. Reintente en unos segundos."), path);
            let inspection: Record<string, unknown> = parsed.data;
            if (stryMutAct_9fa48("1355") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("1354") ? false : stryMutAct_9fa48("1353") ? true : (stryCov_9fa48("1353", "1354", "1355"), scenario.actor.kind === (stryMutAct_9fa48("1356") ? "" : (stryCov_9fa48("1356"), "FIELD")))) {
              if (stryMutAct_9fa48("1357")) {
                {}
              } else {
                stryCov_9fa48("1357");
                if (stryMutAct_9fa48("1360") ? !parsed.data.serviceId && !session.crew?.id : stryMutAct_9fa48("1359") ? false : stryMutAct_9fa48("1358") ? true : (stryCov_9fa48("1358", "1359", "1360"), (stryMutAct_9fa48("1361") ? parsed.data.serviceId : (stryCov_9fa48("1361"), !parsed.data.serviceId)) || (stryMutAct_9fa48("1362") ? session.crew?.id : (stryCov_9fa48("1362"), !(stryMutAct_9fa48("1363") ? session.crew.id : (stryCov_9fa48("1363"), session.crew?.id)))))) return errorResponse(404, stryMutAct_9fa48("1364") ? "" : (stryCov_9fa48("1364"), "Inspección no encontrada."), path);
                const serviceResponse = await fetchBackend(request, stryMutAct_9fa48("1365") ? `` : (stryCov_9fa48("1365"), `/services/${pathId(parsed.data.serviceId)}`));
                if (stryMutAct_9fa48("1368") ? false : stryMutAct_9fa48("1367") ? true : stryMutAct_9fa48("1366") ? serviceResponse.ok : (stryCov_9fa48("1366", "1367", "1368"), !serviceResponse.ok)) return withInspectionAttachments(request, serviceResponse);
                const service: unknown = await serviceResponse.json();
                if (stryMutAct_9fa48("1371") ? (!service || typeof service !== "object" || !("crewId" in service)) && service.crewId !== session.crew.id : stryMutAct_9fa48("1370") ? false : stryMutAct_9fa48("1369") ? true : (stryCov_9fa48("1369", "1370", "1371"), (stryMutAct_9fa48("1373") ? (!service || typeof service !== "object") && !("crewId" in service) : stryMutAct_9fa48("1372") ? false : (stryCov_9fa48("1372", "1373"), (stryMutAct_9fa48("1375") ? !service && typeof service !== "object" : stryMutAct_9fa48("1374") ? false : (stryCov_9fa48("1374", "1375"), (stryMutAct_9fa48("1376") ? service : (stryCov_9fa48("1376"), !service)) || (stryMutAct_9fa48("1378") ? typeof service === "object" : stryMutAct_9fa48("1377") ? false : (stryCov_9fa48("1377", "1378"), typeof service !== (stryMutAct_9fa48("1379") ? "" : (stryCov_9fa48("1379"), "object")))))) || (stryMutAct_9fa48("1380") ? "crewId" in service : (stryCov_9fa48("1380"), !((stryMutAct_9fa48("1381") ? "" : (stryCov_9fa48("1381"), "crewId")) in service))))) || (stryMutAct_9fa48("1383") ? service.crewId === session.crew.id : stryMutAct_9fa48("1382") ? false : (stryCov_9fa48("1382", "1383"), service.crewId !== session.crew.id)))) {
                  if (stryMutAct_9fa48("1384")) {
                    {}
                  } else {
                    stryCov_9fa48("1384");
                    return errorResponse(404, stryMutAct_9fa48("1385") ? "" : (stryCov_9fa48("1385"), "Inspección no encontrada."), path);
                  }
                }
                inspection = projectFieldInspection(inspection);
              }
            }
            return withInspectionAttachments(request, new Response(JSON.stringify(inspection), stryMutAct_9fa48("1386") ? {} : (stryCov_9fa48("1386"), {
              status: backendResponse.status,
              headers: stryMutAct_9fa48("1387") ? {} : (stryCov_9fa48("1387"), {
                "content-type": stryMutAct_9fa48("1388") ? backendResponse.headers.get("content-type") && "application/json" : (stryCov_9fa48("1388"), backendResponse.headers.get(stryMutAct_9fa48("1389") ? "" : (stryCov_9fa48("1389"), "content-type")) ?? (stryMutAct_9fa48("1390") ? "" : (stryCov_9fa48("1390"), "application/json")))
              })
            })));
          }
        }
        const inspection = getEnvironmentalInspectionFixture(id);
        if (stryMutAct_9fa48("1393") ? false : stryMutAct_9fa48("1392") ? true : stryMutAct_9fa48("1391") ? inspection : (stryCov_9fa48("1391", "1392", "1393"), !inspection)) return errorResponse(404, stryMutAct_9fa48("1394") ? "" : (stryCov_9fa48("1394"), "Inspección no encontrada."), path);
        if (stryMutAct_9fa48("1397") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("1396") ? false : stryMutAct_9fa48("1395") ? true : (stryCov_9fa48("1395", "1396", "1397"), scenario.actor.kind === (stryMutAct_9fa48("1398") ? "" : (stryCov_9fa48("1398"), "FIELD")))) {
          if (stryMutAct_9fa48("1399")) {
            {}
          } else {
            stryCov_9fa48("1399");
            const service = inspection.serviceId ? serviceFixtures.find(stryMutAct_9fa48("1400") ? () => undefined : (stryCov_9fa48("1400"), candidate => stryMutAct_9fa48("1403") ? candidate.id !== inspection.serviceId : stryMutAct_9fa48("1402") ? false : stryMutAct_9fa48("1401") ? true : (stryCov_9fa48("1401", "1402", "1403"), candidate.id === inspection.serviceId))) : null;
            if (stryMutAct_9fa48("1406") ? !service && service.crewId !== scenario.actor.crewId : stryMutAct_9fa48("1405") ? false : stryMutAct_9fa48("1404") ? true : (stryCov_9fa48("1404", "1405", "1406"), (stryMutAct_9fa48("1407") ? service : (stryCov_9fa48("1407"), !service)) || (stryMutAct_9fa48("1409") ? service.crewId === scenario.actor.crewId : stryMutAct_9fa48("1408") ? false : (stryCov_9fa48("1408", "1409"), service.crewId !== scenario.actor.crewId)))) return errorResponse(404, stryMutAct_9fa48("1410") ? "" : (stryCov_9fa48("1410"), "Inspección no encontrada."), path);
            return NextResponse.json(projectFieldInspection(inspection));
          }
        }
        return NextResponse.json(inspection);
      }
    } catch (error) {
      if (stryMutAct_9fa48("1411")) {
        {}
      } else {
        stryCov_9fa48("1411");
        if (stryMutAct_9fa48("1413") ? false : stryMutAct_9fa48("1412") ? true : (stryCov_9fa48("1412", "1413"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("1414") ? "" : (stryCov_9fa48("1414"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("1416") ? false : stryMutAct_9fa48("1415") ? true : (stryCov_9fa48("1415", "1416"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        if (stryMutAct_9fa48("1418") ? false : stryMutAct_9fa48("1417") ? true : (stryCov_9fa48("1417", "1418"), error instanceof BackendUnavailableError)) return errorResponse(503, error.message, path);
        if (stryMutAct_9fa48("1420") ? false : stryMutAct_9fa48("1419") ? true : (stryCov_9fa48("1419", "1420"), error instanceof ForbiddenSessionError)) return errorResponse(403, stryMutAct_9fa48("1421") ? "" : (stryCov_9fa48("1421"), "La sesión no tiene permiso para consultar inspecciones."), path, FORBIDDEN_CODES.roleRequired);
        return errorResponse(500, stryMutAct_9fa48("1422") ? "" : (stryCov_9fa48("1422"), "No se pudo cargar la inspección."), path);
      }
    }
  }
}