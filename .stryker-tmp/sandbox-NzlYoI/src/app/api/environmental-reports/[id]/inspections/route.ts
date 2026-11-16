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
import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse, FORBIDDEN_CODES, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { addEnvironmentalInspectionFixture, createEnvironmentalInspectionFixture, getEnvironmentalReportFixture, listEnvironmentalInspectionFixtures, updateEnvironmentalInspectionFixture, transitionEnvironmentalReportFixture } from "@/lib/environmental-report-fixtures";
import { environmentalInspectionScheduleInputSchema, type EnvironmentalInspection } from "@/lib/environmental-reports";
import { withInspectionAttachments } from "@/app/api/environmental-inspections/_attachments";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("1785")) {
    {}
  } else {
    stryCov_9fa48("1785");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("1786")) {
        {}
      } else {
        stryCov_9fa48("1786");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("1788") ? {} : (stryCov_9fa48("1788"), {
          capability: stryMutAct_9fa48("1789") ? "" : (stryCov_9fa48("1789"), "environmentalInspection:view"),
          throwOnError: stryMutAct_9fa48("1790") ? false : (stryCov_9fa48("1790"), true)
        }));
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("1793") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("1792") ? false : stryMutAct_9fa48("1791") ? true : (stryCov_9fa48("1791", "1792", "1793"), scenario.actor.kind === (stryMutAct_9fa48("1794") ? "" : (stryCov_9fa48("1794"), "FIELD")))) return errorResponse(404, stryMutAct_9fa48("1795") ? "" : (stryCov_9fa48("1795"), "Historia de inspecciones no encontrada."), path);
        if (stryMutAct_9fa48("1797") ? false : stryMutAct_9fa48("1796") ? true : (stryCov_9fa48("1796", "1797"), backendMode(session))) {
          if (stryMutAct_9fa48("1798")) {
            {}
          } else {
            stryCov_9fa48("1798");
            return withInspectionAttachments(request, await fetchBackend(request, (stryMutAct_9fa48("1799") ? "" : (stryCov_9fa48("1799"), "/environmental-reports/")) + pathId(id) + (stryMutAct_9fa48("1800") ? "" : (stryCov_9fa48("1800"), "/inspections")), stryMutAct_9fa48("1801") ? "" : (stryCov_9fa48("1801"), "environmentalInspection:view")));
          }
        }
        if (stryMutAct_9fa48("1804") ? false : stryMutAct_9fa48("1803") ? true : stryMutAct_9fa48("1802") ? getEnvironmentalReportFixture(id) : (stryCov_9fa48("1802", "1803", "1804"), !getEnvironmentalReportFixture(id))) return errorResponse(404, stryMutAct_9fa48("1805") ? "" : (stryCov_9fa48("1805"), "Expediente ambiental no encontrado."), path);
        return NextResponse.json(listEnvironmentalInspectionFixtures(id));
      }
    } catch (error) {
      if (stryMutAct_9fa48("1806")) {
        {}
      } else {
        stryCov_9fa48("1806");
        if (stryMutAct_9fa48("1808") ? false : stryMutAct_9fa48("1807") ? true : (stryCov_9fa48("1807", "1808"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("1809") ? "" : (stryCov_9fa48("1809"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("1811") ? false : stryMutAct_9fa48("1810") ? true : (stryCov_9fa48("1810", "1811"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        if (stryMutAct_9fa48("1813") ? false : stryMutAct_9fa48("1812") ? true : (stryCov_9fa48("1812", "1813"), error instanceof ForbiddenSessionError)) return errorResponse(403, stryMutAct_9fa48("1814") ? "" : (stryCov_9fa48("1814"), "La sesión no tiene permiso para consultar inspecciones."), path, FORBIDDEN_CODES.roleRequired);
        return mapSessionError(error, path, stryMutAct_9fa48("1815") ? "" : (stryCov_9fa48("1815"), "No se pudo cargar la historia de inspecciones."));
      }
    }
  }
}
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("1816")) {
    {}
  } else {
    stryCov_9fa48("1816");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("1817")) {
        {}
      } else {
        stryCov_9fa48("1817");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("1819") ? {} : (stryCov_9fa48("1819"), {
          capability: stryMutAct_9fa48("1820") ? "" : (stryCov_9fa48("1820"), "environmentalInspection:schedule"),
          throwOnError: stryMutAct_9fa48("1821") ? false : (stryCov_9fa48("1821"), true)
        }));
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("1824") ? scenario.actor.kind === "OFFICE" : stryMutAct_9fa48("1823") ? false : stryMutAct_9fa48("1822") ? true : (stryCov_9fa48("1822", "1823", "1824"), scenario.actor.kind !== (stryMutAct_9fa48("1825") ? "" : (stryCov_9fa48("1825"), "OFFICE")))) return errorResponse(403, stryMutAct_9fa48("1826") ? "" : (stryCov_9fa48("1826"), "Solo Oficina puede programar inspecciones."), path);
        const parsed = await parseJsonBody(request, environmentalInspectionScheduleInputSchema, path);
        if (stryMutAct_9fa48("1828") ? false : stryMutAct_9fa48("1827") ? true : (stryCov_9fa48("1827", "1828"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("1830") ? false : stryMutAct_9fa48("1829") ? true : (stryCov_9fa48("1829", "1830"), backendMode(session))) {
          if (stryMutAct_9fa48("1831")) {
            {}
          } else {
            stryCov_9fa48("1831");
            // El backend solo acepta serviceId/inspectorId al programar (CreateInspectionDto
            // con forbidNonWhitelisted): la fecha, la ventana, el checklist y la zona van al
            // Service, no a la inspección.
            const response = await fetchBackend(request, (stryMutAct_9fa48("1832") ? "" : (stryCov_9fa48("1832"), "/environmental-reports/")) + pathId(id) + (stryMutAct_9fa48("1833") ? "" : (stryCov_9fa48("1833"), "/inspections")), stryMutAct_9fa48("1834") ? "" : (stryCov_9fa48("1834"), "environmentalInspection:schedule"), stryMutAct_9fa48("1835") ? {} : (stryCov_9fa48("1835"), {
              method: stryMutAct_9fa48("1836") ? "" : (stryCov_9fa48("1836"), "POST"),
              headers: stryMutAct_9fa48("1837") ? {} : (stryCov_9fa48("1837"), {
                "content-type": stryMutAct_9fa48("1838") ? "" : (stryCov_9fa48("1838"), "application/json")
              }),
              body: JSON.stringify(stryMutAct_9fa48("1839") ? {} : (stryCov_9fa48("1839"), {
                inspectorId: parsed.data.inspectorId
              }))
            }));
            return forwardResponse(response);
          }
        }
        const report = getEnvironmentalReportFixture(id);
        if (stryMutAct_9fa48("1842") ? false : stryMutAct_9fa48("1841") ? true : stryMutAct_9fa48("1840") ? report : (stryCov_9fa48("1840", "1841", "1842"), !report)) return errorResponse(404, stryMutAct_9fa48("1843") ? "" : (stryCov_9fa48("1843"), "Expediente ambiental no encontrado."), path);
        const existing = listEnvironmentalInspectionFixtures(id);
        const active = existing.find(stryMutAct_9fa48("1844") ? () => undefined : (stryCov_9fa48("1844"), inspection => stryMutAct_9fa48("1845") ? inspection.outcome : (stryCov_9fa48("1845"), !inspection.outcome)));
        if (stryMutAct_9fa48("1848") ? active || report.status === "INSPECTION_SCHEDULED" : stryMutAct_9fa48("1847") ? false : stryMutAct_9fa48("1846") ? true : (stryCov_9fa48("1846", "1847", "1848"), active && (stryMutAct_9fa48("1850") ? report.status !== "INSPECTION_SCHEDULED" : stryMutAct_9fa48("1849") ? true : (stryCov_9fa48("1849", "1850"), report.status === (stryMutAct_9fa48("1851") ? "" : (stryCov_9fa48("1851"), "INSPECTION_SCHEDULED")))))) return NextResponse.json(updateEnvironmentalInspectionFixture(active.id, parsed.data as Partial<EnvironmentalInspection>));
        const isReinspection = stryMutAct_9fa48("1854") ? report.status === "INSPECTED" || existing.some(inspection => inspection.outcome === "INCONCLUSIVE") : stryMutAct_9fa48("1853") ? false : stryMutAct_9fa48("1852") ? true : (stryCov_9fa48("1852", "1853", "1854"), (stryMutAct_9fa48("1856") ? report.status !== "INSPECTED" : stryMutAct_9fa48("1855") ? true : (stryCov_9fa48("1855", "1856"), report.status === (stryMutAct_9fa48("1857") ? "" : (stryCov_9fa48("1857"), "INSPECTED")))) && (stryMutAct_9fa48("1858") ? existing.every(inspection => inspection.outcome === "INCONCLUSIVE") : (stryCov_9fa48("1858"), existing.some(stryMutAct_9fa48("1859") ? () => undefined : (stryCov_9fa48("1859"), inspection => stryMutAct_9fa48("1862") ? inspection.outcome !== "INCONCLUSIVE" : stryMutAct_9fa48("1861") ? false : stryMutAct_9fa48("1860") ? true : (stryCov_9fa48("1860", "1861", "1862"), inspection.outcome === (stryMutAct_9fa48("1863") ? "" : (stryCov_9fa48("1863"), "INCONCLUSIVE"))))))));
        if (stryMutAct_9fa48("1866") ? report.status !== "UNDER_REVIEW" || !isReinspection : stryMutAct_9fa48("1865") ? false : stryMutAct_9fa48("1864") ? true : (stryCov_9fa48("1864", "1865", "1866"), (stryMutAct_9fa48("1868") ? report.status === "UNDER_REVIEW" : stryMutAct_9fa48("1867") ? true : (stryCov_9fa48("1867", "1868"), report.status !== (stryMutAct_9fa48("1869") ? "" : (stryCov_9fa48("1869"), "UNDER_REVIEW")))) && (stryMutAct_9fa48("1870") ? isReinspection : (stryCov_9fa48("1870"), !isReinspection)))) return errorResponse(409, stryMutAct_9fa48("1871") ? "" : (stryCov_9fa48("1871"), "El expediente no está habilitado para programar una inspección."), path);
        const inspection = createEnvironmentalInspectionFixture(id, parsed.data);
        if (stryMutAct_9fa48("1872")) {
          ;
        } else {
          stryCov_9fa48("1872");
          addEnvironmentalInspectionFixture(inspection);
        }
        transitionEnvironmentalReportFixture(id, stryMutAct_9fa48("1874") ? "" : (stryCov_9fa48("1874"), "INSPECTION_SCHEDULED"));
        return NextResponse.json(inspection, stryMutAct_9fa48("1875") ? {} : (stryCov_9fa48("1875"), {
          status: 201
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("1876")) {
        {}
      } else {
        stryCov_9fa48("1876");
        if (stryMutAct_9fa48("1878") ? false : stryMutAct_9fa48("1877") ? true : (stryCov_9fa48("1877", "1878"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("1879") ? "" : (stryCov_9fa48("1879"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("1881") ? false : stryMutAct_9fa48("1880") ? true : (stryCov_9fa48("1880", "1881"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        if (stryMutAct_9fa48("1883") ? false : stryMutAct_9fa48("1882") ? true : (stryCov_9fa48("1882", "1883"), error instanceof ForbiddenSessionError)) return errorResponse(403, stryMutAct_9fa48("1884") ? "" : (stryCov_9fa48("1884"), "La sesión no tiene permiso para programar inspecciones."), path, FORBIDDEN_CODES.roleRequired);
        return mapSessionError(error, path, stryMutAct_9fa48("1885") ? "" : (stryCov_9fa48("1885"), "No se pudo programar la inspección."));
      }
    }
  }
}