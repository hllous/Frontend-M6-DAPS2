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
import { NextResponse } from "next/server";
import { authorize, backendMode, errorResponse, forwardResponse, mapSessionError, FORBIDDEN_CODES, parseJsonBody } from "@/lib/bff-route";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getEnvironmentalReportFixture, updateEnvironmentalReportFixture } from "@/lib/environmental-report-fixtures";
import { requestInformationInputSchema } from "@/lib/environmental-reports";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
const CAPABILITY = stryMutAct_9fa48("1886") ? "" : (stryCov_9fa48("1886"), "environmentalReport:review");
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("1887")) {
    {}
  } else {
    stryCov_9fa48("1887");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("1888")) {
        {}
      } else {
        stryCov_9fa48("1888");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("1890") ? {} : (stryCov_9fa48("1890"), {
          capability: CAPABILITY,
          throwOnError: stryMutAct_9fa48("1891") ? false : (stryCov_9fa48("1891"), true)
        }));
        if (stryMutAct_9fa48("1894") ? getScenario(session).actor.kind === "OFFICE" : stryMutAct_9fa48("1893") ? false : stryMutAct_9fa48("1892") ? true : (stryCov_9fa48("1892", "1893", "1894"), getScenario(session).actor.kind !== (stryMutAct_9fa48("1895") ? "" : (stryCov_9fa48("1895"), "OFFICE")))) return errorResponse(403, stryMutAct_9fa48("1896") ? "" : (stryCov_9fa48("1896"), "Solo Oficina puede pedir información al vecino."), path);
        const parsed = await parseJsonBody(request, requestInformationInputSchema, path);
        if (stryMutAct_9fa48("1898") ? false : stryMutAct_9fa48("1897") ? true : (stryCov_9fa48("1897", "1898"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("1900") ? false : stryMutAct_9fa48("1899") ? true : (stryCov_9fa48("1899", "1900"), backendMode(session))) {
          if (stryMutAct_9fa48("1901")) {
            {}
          } else {
            stryCov_9fa48("1901");
            return forwardResponse(await fetchBackend(request, stryMutAct_9fa48("1902") ? `` : (stryCov_9fa48("1902"), `/environmental-reports/${pathId(id)}/request-information`), CAPABILITY, stryMutAct_9fa48("1903") ? {} : (stryCov_9fa48("1903"), {
              method: stryMutAct_9fa48("1904") ? "" : (stryCov_9fa48("1904"), "POST"),
              headers: stryMutAct_9fa48("1905") ? {} : (stryCov_9fa48("1905"), {
                "content-type": stryMutAct_9fa48("1906") ? "" : (stryCov_9fa48("1906"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            })));
          }
        }
        const current = getEnvironmentalReportFixture(id);
        if (stryMutAct_9fa48("1909") ? false : stryMutAct_9fa48("1908") ? true : stryMutAct_9fa48("1907") ? current : (stryCov_9fa48("1907", "1908", "1909"), !current)) return errorResponse(404, stryMutAct_9fa48("1910") ? "" : (stryCov_9fa48("1910"), "Expediente ambiental no encontrado."), path);
        if (stryMutAct_9fa48("1913") ? current.status !== "UNDER_REVIEW" && !current.ticketId : stryMutAct_9fa48("1912") ? false : stryMutAct_9fa48("1911") ? true : (stryCov_9fa48("1911", "1912", "1913"), (stryMutAct_9fa48("1915") ? current.status === "UNDER_REVIEW" : stryMutAct_9fa48("1914") ? false : (stryCov_9fa48("1914", "1915"), current.status !== (stryMutAct_9fa48("1916") ? "" : (stryCov_9fa48("1916"), "UNDER_REVIEW")))) || (stryMutAct_9fa48("1917") ? current.ticketId : (stryCov_9fa48("1917"), !current.ticketId)))) return errorResponse(409, stryMutAct_9fa48("1918") ? "" : (stryCov_9fa48("1918"), "Solo se puede pedir información en un expediente en revisión con reclamo ciudadano."), path);
        if (stryMutAct_9fa48("1920") ? false : stryMutAct_9fa48("1919") ? true : (stryCov_9fa48("1919", "1920"), current.informationRequestPending)) return errorResponse(409, stryMutAct_9fa48("1921") ? "" : (stryCov_9fa48("1921"), "Ya hay una solicitud de información pendiente."), path);
        return NextResponse.json(updateEnvironmentalReportFixture(id, stryMutAct_9fa48("1922") ? {} : (stryCov_9fa48("1922"), {
          informationRequestPending: stryMutAct_9fa48("1923") ? false : (stryCov_9fa48("1923"), true),
          informationRequestedAt: new Date().toISOString(),
          informationRequestMessage: parsed.data.message,
          informationRequestRequiredBy: parsed.data.requiredBy ? stryMutAct_9fa48("1924") ? `` : (stryCov_9fa48("1924"), `${parsed.data.requiredBy}T23:59:59-03:00`) : null
        })));
      }
    } catch (error) {
      if (stryMutAct_9fa48("1925")) {
        {}
      } else {
        stryCov_9fa48("1925");
        if (stryMutAct_9fa48("1927") ? false : stryMutAct_9fa48("1926") ? true : (stryCov_9fa48("1926", "1927"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("1928") ? "" : (stryCov_9fa48("1928"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("1930") ? false : stryMutAct_9fa48("1929") ? true : (stryCov_9fa48("1929", "1930"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        if (stryMutAct_9fa48("1932") ? false : stryMutAct_9fa48("1931") ? true : (stryCov_9fa48("1931", "1932"), error instanceof ForbiddenSessionError)) return errorResponse(403, stryMutAct_9fa48("1933") ? "" : (stryCov_9fa48("1933"), "La sesión no tiene permiso para pedir información."), path, FORBIDDEN_CODES.roleRequired);
        return mapSessionError(error, path, stryMutAct_9fa48("1934") ? "" : (stryCov_9fa48("1934"), "No se pudo pedir la información al vecino."));
      }
    }
  }
}