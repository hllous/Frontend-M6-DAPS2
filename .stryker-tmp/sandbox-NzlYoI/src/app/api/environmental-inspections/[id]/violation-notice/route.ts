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
import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse, FORBIDDEN_CODES } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { addViolationNoticeFixture, createViolationNoticeFixture, getEnvironmentalInspectionFixture, getEnvironmentalReportFixture, getViolationNoticeFixture, transitionEnvironmentalReportFixture } from "@/lib/environmental-report-fixtures";
import { issueViolationNoticeInputSchema } from "@/lib/environmental-reports";
import { establishmentDirectoryAdapter } from "@/lib/establishment-directory";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
type NoticeContext = {
  params: Promise<{
    id: string;
  }>;
};
export async function GET(request: Request, context: NoticeContext) {
  if (stryMutAct_9fa48("1423")) {
    {}
  } else {
    stryCov_9fa48("1423");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("1424")) {
        {}
      } else {
        stryCov_9fa48("1424");
        const session = getRequiredSession(request);
        // Backend: el acta la leen Ambiental, Admin, Inspector y Auditor; la capacidad ya lo expresa.
        authorize(session, stryMutAct_9fa48("1426") ? {} : (stryCov_9fa48("1426"), {
          capability: stryMutAct_9fa48("1427") ? "" : (stryCov_9fa48("1427"), "violationNotice:view"),
          throwOnError: stryMutAct_9fa48("1428") ? false : (stryCov_9fa48("1428"), true)
        }));
        if (stryMutAct_9fa48("1430") ? false : stryMutAct_9fa48("1429") ? true : (stryCov_9fa48("1429", "1430"), backendMode(session))) {
          if (stryMutAct_9fa48("1431")) {
            {}
          } else {
            stryCov_9fa48("1431");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("1432") ? `` : (stryCov_9fa48("1432"), `/environmental-inspections/${pathId(id)}/violation-notice`), stryMutAct_9fa48("1433") ? "" : (stryCov_9fa48("1433"), "violationNotice:view"));
            return forwardResponse(backendResponse);
          }
        }
        const notice = getViolationNoticeFixture(id);
        return notice ? NextResponse.json(notice) : errorResponse(404, stryMutAct_9fa48("1434") ? "" : (stryCov_9fa48("1434"), "La inspección no tiene un acta emitida."), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("1435")) {
        {}
      } else {
        stryCov_9fa48("1435");
        if (stryMutAct_9fa48("1437") ? false : stryMutAct_9fa48("1436") ? true : (stryCov_9fa48("1436", "1437"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("1438") ? "" : (stryCov_9fa48("1438"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("1440") ? false : stryMutAct_9fa48("1439") ? true : (stryCov_9fa48("1439", "1440"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        if (stryMutAct_9fa48("1442") ? false : stryMutAct_9fa48("1441") ? true : (stryCov_9fa48("1441", "1442"), error instanceof ForbiddenSessionError)) return errorResponse(403, stryMutAct_9fa48("1443") ? "" : (stryCov_9fa48("1443"), "La sesión no tiene permiso para consultar actas."), path, FORBIDDEN_CODES.roleRequired);
        return mapSessionError(error, path, stryMutAct_9fa48("1444") ? "" : (stryCov_9fa48("1444"), "No se pudo consultar el acta de infracción."));
      }
    }
  }
}
export async function POST(request: Request, context: NoticeContext) {
  if (stryMutAct_9fa48("1445")) {
    {}
  } else {
    stryCov_9fa48("1445");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("1446")) {
        {}
      } else {
        stryCov_9fa48("1446");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("1448") ? {} : (stryCov_9fa48("1448"), {
          capability: stryMutAct_9fa48("1449") ? "" : (stryCov_9fa48("1449"), "violationNotice:issue"),
          throwOnError: stryMutAct_9fa48("1450") ? false : (stryCov_9fa48("1450"), true)
        }));
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("1453") ? scenario.actor.kind === "OFFICE" : stryMutAct_9fa48("1452") ? false : stryMutAct_9fa48("1451") ? true : (stryCov_9fa48("1451", "1452", "1453"), scenario.actor.kind !== (stryMutAct_9fa48("1454") ? "" : (stryCov_9fa48("1454"), "OFFICE")))) return errorResponse(403, stryMutAct_9fa48("1455") ? "" : (stryCov_9fa48("1455"), "Solo Oficina puede emitir actas de infracción."), path);
        const body = await request.json().catch(() => undefined);
        const parsedInput = issueViolationNoticeInputSchema.safeParse(body);
        if (stryMutAct_9fa48("1458") ? false : stryMutAct_9fa48("1457") ? true : stryMutAct_9fa48("1456") ? parsedInput.success : (stryCov_9fa48("1456", "1457", "1458"), !parsedInput.success)) return errorResponse(400, parsedInput.error.issues.map(stryMutAct_9fa48("1459") ? () => undefined : (stryCov_9fa48("1459"), issue => issue.message)).join(stryMutAct_9fa48("1460") ? "" : (stryCov_9fa48("1460"), " ")), path);
        if (stryMutAct_9fa48("1462") ? false : stryMutAct_9fa48("1461") ? true : (stryCov_9fa48("1461", "1462"), backendMode(session))) {
          if (stryMutAct_9fa48("1463")) {
            {}
          } else {
            stryCov_9fa48("1463");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("1464") ? `` : (stryCov_9fa48("1464"), `/environmental-inspections/${pathId(id)}/violation-notice`), stryMutAct_9fa48("1465") ? "" : (stryCov_9fa48("1465"), "violationNotice:issue"), stryMutAct_9fa48("1466") ? {} : (stryCov_9fa48("1466"), {
              method: stryMutAct_9fa48("1467") ? "" : (stryCov_9fa48("1467"), "POST"),
              headers: stryMutAct_9fa48("1468") ? {} : (stryCov_9fa48("1468"), {
                "content-type": stryMutAct_9fa48("1469") ? "" : (stryCov_9fa48("1469"), "application/json")
              }),
              body: JSON.stringify(parsedInput.data)
            }));
            return forwardResponse(backendResponse);
          }
        }
        const inspection = getEnvironmentalInspectionFixture(id);
        if (stryMutAct_9fa48("1472") ? false : stryMutAct_9fa48("1471") ? true : stryMutAct_9fa48("1470") ? inspection : (stryCov_9fa48("1470", "1471", "1472"), !inspection)) return errorResponse(404, stryMutAct_9fa48("1473") ? "" : (stryCov_9fa48("1473"), "Inspección no encontrada."), path);
        if (stryMutAct_9fa48("1476") ? inspection.outcome === "VIOLATION_FOUND" : stryMutAct_9fa48("1475") ? false : stryMutAct_9fa48("1474") ? true : (stryCov_9fa48("1474", "1475", "1476"), inspection.outcome !== (stryMutAct_9fa48("1477") ? "" : (stryCov_9fa48("1477"), "VIOLATION_FOUND")))) return errorResponse(409, stryMutAct_9fa48("1478") ? "" : (stryCov_9fa48("1478"), "Solo se puede emitir un acta sobre una inspección completada con infracción constatada."), path);
        if (stryMutAct_9fa48("1481") ? false : stryMutAct_9fa48("1480") ? true : stryMutAct_9fa48("1479") ? inspection.attachments?.length ?? 0 : (stryCov_9fa48("1479", "1480", "1481"), !(stryMutAct_9fa48("1482") ? inspection.attachments?.length && 0 : (stryCov_9fa48("1482"), (stryMutAct_9fa48("1483") ? inspection.attachments.length : (stryCov_9fa48("1483"), inspection.attachments?.length)) ?? 0)))) return errorResponse(400, stryMutAct_9fa48("1484") ? "" : (stryCov_9fa48("1484"), "Debe adjuntar al menos una evidencia a la inspección antes de emitir el acta."), path);
        if (stryMutAct_9fa48("1486") ? false : stryMutAct_9fa48("1485") ? true : (stryCov_9fa48("1485", "1486"), getViolationNoticeFixture(id))) return errorResponse(409, stryMutAct_9fa48("1487") ? "" : (stryCov_9fa48("1487"), "La inspección ya tiene un acta emitida. Las correcciones requieren una nueva inspección."), path);
        if (stryMutAct_9fa48("1490") ? false : stryMutAct_9fa48("1489") ? true : stryMutAct_9fa48("1488") ? getEnvironmentalReportFixture(inspection.reportId) : (stryCov_9fa48("1488", "1489", "1490"), !getEnvironmentalReportFixture(inspection.reportId))) return errorResponse(404, stryMutAct_9fa48("1491") ? "" : (stryCov_9fa48("1491"), "Expediente ambiental no encontrado."), path);
        if (stryMutAct_9fa48("1493") ? false : stryMutAct_9fa48("1492") ? true : (stryCov_9fa48("1492", "1493"), parsedInput.data.establishmentId)) {
          if (stryMutAct_9fa48("1494")) {
            {}
          } else {
            stryCov_9fa48("1494");
            const establishment = await establishmentDirectoryAdapter.resolve(stryMutAct_9fa48("1495") ? {} : (stryCov_9fa48("1495"), {
              query: parsedInput.data.establishmentId
            }));
            if (stryMutAct_9fa48("1498") ? !establishment && establishment.id !== parsedInput.data.establishmentId : stryMutAct_9fa48("1497") ? false : stryMutAct_9fa48("1496") ? true : (stryCov_9fa48("1496", "1497", "1498"), (stryMutAct_9fa48("1499") ? establishment : (stryCov_9fa48("1499"), !establishment)) || (stryMutAct_9fa48("1501") ? establishment.id === parsedInput.data.establishmentId : stryMutAct_9fa48("1500") ? false : (stryCov_9fa48("1500", "1501"), establishment.id !== parsedInput.data.establishmentId)))) {
              if (stryMutAct_9fa48("1502")) {
                {}
              } else {
                stryCov_9fa48("1502");
                return errorResponse(400, stryMutAct_9fa48("1503") ? "" : (stryCov_9fa48("1503"), "El establecimiento indicado no existe en el directorio local."), path);
              }
            }
          }
        }
        const notice = createViolationNoticeFixture(id, parsedInput.data);
        if (stryMutAct_9fa48("1504")) {
          ;
        } else {
          stryCov_9fa48("1504");
          addViolationNoticeFixture(notice);
        }
        transitionEnvironmentalReportFixture(inspection.reportId, notice.establishmentId ? stryMutAct_9fa48("1506") ? "" : (stryCov_9fa48("1506"), "NOTICE_ISSUED") : stryMutAct_9fa48("1507") ? "" : (stryCov_9fa48("1507"), "CLOSED"));
        return NextResponse.json(notice, stryMutAct_9fa48("1508") ? {} : (stryCov_9fa48("1508"), {
          status: 201
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("1509")) {
        {}
      } else {
        stryCov_9fa48("1509");
        if (stryMutAct_9fa48("1511") ? false : stryMutAct_9fa48("1510") ? true : (stryCov_9fa48("1510", "1511"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("1512") ? "" : (stryCov_9fa48("1512"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("1514") ? false : stryMutAct_9fa48("1513") ? true : (stryCov_9fa48("1513", "1514"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        if (stryMutAct_9fa48("1516") ? false : stryMutAct_9fa48("1515") ? true : (stryCov_9fa48("1515", "1516"), error instanceof ForbiddenSessionError)) return errorResponse(403, stryMutAct_9fa48("1517") ? "" : (stryCov_9fa48("1517"), "La sesión no tiene permiso para emitir actas."), path, FORBIDDEN_CODES.roleRequired);
        return mapSessionError(error, path, stryMutAct_9fa48("1518") ? "" : (stryCov_9fa48("1518"), "No se pudo emitir el acta de infracción."));
      }
    }
  }
}