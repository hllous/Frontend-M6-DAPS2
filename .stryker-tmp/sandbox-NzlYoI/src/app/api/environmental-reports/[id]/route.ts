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
import { getEnvironmentalReportFixture } from "@/lib/environmental-report-fixtures";
import { environmentalReportSchema } from "@/lib/environmental-reports";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("1935")) {
    {}
  } else {
    stryCov_9fa48("1935");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("1936")) {
        {}
      } else {
        stryCov_9fa48("1936");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("1938") ? {} : (stryCov_9fa48("1938"), {
          capability: stryMutAct_9fa48("1939") ? "" : (stryCov_9fa48("1939"), "environmentalReport:view"),
          throwOnError: stryMutAct_9fa48("1940") ? false : (stryCov_9fa48("1940"), true)
        }));
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("1942") ? false : stryMutAct_9fa48("1941") ? true : (stryCov_9fa48("1941", "1942"), backendMode(session))) {
          if (stryMutAct_9fa48("1943")) {
            {}
          } else {
            stryCov_9fa48("1943");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("1944") ? `` : (stryCov_9fa48("1944"), `/environmental-reports/${pathId(id)}`), stryMutAct_9fa48("1945") ? "" : (stryCov_9fa48("1945"), "environmentalReport:view"));
            if (stryMutAct_9fa48("1948") ? scenario.actor.kind === "FIELD" || backendResponse.ok : stryMutAct_9fa48("1947") ? false : stryMutAct_9fa48("1946") ? true : (stryCov_9fa48("1946", "1947", "1948"), (stryMutAct_9fa48("1950") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("1949") ? true : (stryCov_9fa48("1949", "1950"), scenario.actor.kind === (stryMutAct_9fa48("1951") ? "" : (stryCov_9fa48("1951"), "FIELD")))) && backendResponse.ok)) {
              if (stryMutAct_9fa48("1952")) {
                {}
              } else {
                stryCov_9fa48("1952");
                let payload: unknown;
                try {
                  if (stryMutAct_9fa48("1953")) {
                    {}
                  } else {
                    stryCov_9fa48("1953");
                    payload = await backendResponse.json();
                  }
                } catch {
                  if (stryMutAct_9fa48("1954")) {
                    {}
                  } else {
                    stryCov_9fa48("1954");
                    return errorResponse(502, stryMutAct_9fa48("1955") ? "" : (stryCov_9fa48("1955"), "La respuesta del expediente ambiental no contiene JSON válido."), path);
                  }
                }
                const raw = (stryMutAct_9fa48("1958") ? payload && typeof payload === "object" && "data" in payload || !("id" in payload) : stryMutAct_9fa48("1957") ? false : stryMutAct_9fa48("1956") ? true : (stryCov_9fa48("1956", "1957", "1958"), (stryMutAct_9fa48("1960") ? payload && typeof payload === "object" || "data" in payload : stryMutAct_9fa48("1959") ? true : (stryCov_9fa48("1959", "1960"), (stryMutAct_9fa48("1962") ? payload || typeof payload === "object" : stryMutAct_9fa48("1961") ? true : (stryCov_9fa48("1961", "1962"), payload && (stryMutAct_9fa48("1964") ? typeof payload !== "object" : stryMutAct_9fa48("1963") ? true : (stryCov_9fa48("1963", "1964"), typeof payload === (stryMutAct_9fa48("1965") ? "" : (stryCov_9fa48("1965"), "object")))))) && (stryMutAct_9fa48("1966") ? "" : (stryCov_9fa48("1966"), "data")) in payload)) && (stryMutAct_9fa48("1967") ? "id" in payload : (stryCov_9fa48("1967"), !((stryMutAct_9fa48("1968") ? "" : (stryCov_9fa48("1968"), "id")) in payload))))) ? (payload as {
                  data: unknown;
                }).data : payload;
                const parsed = environmentalReportSchema.safeParse(raw);
                if (stryMutAct_9fa48("1971") ? false : stryMutAct_9fa48("1970") ? true : stryMutAct_9fa48("1969") ? parsed.success : (stryCov_9fa48("1969", "1970", "1971"), !parsed.success)) return errorResponse(502, stryMutAct_9fa48("1972") ? "" : (stryCov_9fa48("1972"), "No se pudo obtener información válida del expediente ambiental. Reintente en unos segundos."), path);
                if (stryMutAct_9fa48("1975") ? !session.crew?.id && parsed.data.assignedCrewId !== session.crew.id : stryMutAct_9fa48("1974") ? false : stryMutAct_9fa48("1973") ? true : (stryCov_9fa48("1973", "1974", "1975"), (stryMutAct_9fa48("1976") ? session.crew?.id : (stryCov_9fa48("1976"), !(stryMutAct_9fa48("1977") ? session.crew.id : (stryCov_9fa48("1977"), session.crew?.id)))) || (stryMutAct_9fa48("1979") ? parsed.data.assignedCrewId === session.crew.id : stryMutAct_9fa48("1978") ? false : (stryCov_9fa48("1978", "1979"), parsed.data.assignedCrewId !== session.crew.id)))) {
                  if (stryMutAct_9fa48("1980")) {
                    {}
                  } else {
                    stryCov_9fa48("1980");
                    return errorResponse(404, stryMutAct_9fa48("1981") ? "" : (stryCov_9fa48("1981"), "Expediente ambiental no encontrado."), path);
                  }
                }
                return NextResponse.json(parsed.data);
              }
            }
            return forwardResponse(backendResponse);
          }
        }
        const report = getEnvironmentalReportFixture(id);
        if (stryMutAct_9fa48("1984") ? false : stryMutAct_9fa48("1983") ? true : stryMutAct_9fa48("1982") ? report : (stryCov_9fa48("1982", "1983", "1984"), !report)) return errorResponse(404, stryMutAct_9fa48("1985") ? "" : (stryCov_9fa48("1985"), "Expediente ambiental no encontrado."), path);
        if (stryMutAct_9fa48("1988") ? scenario.actor.kind === "FIELD" || report.assignedCrewId !== scenario.actor.crewId : stryMutAct_9fa48("1987") ? false : stryMutAct_9fa48("1986") ? true : (stryCov_9fa48("1986", "1987", "1988"), (stryMutAct_9fa48("1990") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("1989") ? true : (stryCov_9fa48("1989", "1990"), scenario.actor.kind === (stryMutAct_9fa48("1991") ? "" : (stryCov_9fa48("1991"), "FIELD")))) && (stryMutAct_9fa48("1993") ? report.assignedCrewId === scenario.actor.crewId : stryMutAct_9fa48("1992") ? true : (stryCov_9fa48("1992", "1993"), report.assignedCrewId !== scenario.actor.crewId)))) return errorResponse(404, stryMutAct_9fa48("1994") ? "" : (stryCov_9fa48("1994"), "Expediente ambiental no encontrado."), path);
        return NextResponse.json(report);
      }
    } catch (error) {
      if (stryMutAct_9fa48("1995")) {
        {}
      } else {
        stryCov_9fa48("1995");
        if (stryMutAct_9fa48("1997") ? false : stryMutAct_9fa48("1996") ? true : (stryCov_9fa48("1996", "1997"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("1998") ? "" : (stryCov_9fa48("1998"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("2000") ? false : stryMutAct_9fa48("1999") ? true : (stryCov_9fa48("1999", "2000"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        if (stryMutAct_9fa48("2002") ? false : stryMutAct_9fa48("2001") ? true : (stryCov_9fa48("2001", "2002"), error instanceof ForbiddenSessionError)) return errorResponse(403, stryMutAct_9fa48("2003") ? "" : (stryCov_9fa48("2003"), "La sesión no tiene acceso al control ambiental."), path, FORBIDDEN_CODES.roleRequired);
        return mapSessionError(error, path, stryMutAct_9fa48("2004") ? "" : (stryCov_9fa48("2004"), "No se pudo cargar el expediente ambiental."));
      }
    }
  }
}