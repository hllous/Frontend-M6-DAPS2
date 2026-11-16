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
import { backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getTreeSurveyFixture } from "@/lib/tree-survey-fixtures";
import { getRequiredSession, InvalidSessionError, AuthUnavailableError } from "@/lib/session";
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
    surveyId: string;
  }>;
}) {
  if (stryMutAct_9fa48("6196")) {
    {}
  } else {
    stryCov_9fa48("6196");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("6197")) {
        {}
      } else {
        stryCov_9fa48("6197");
        const session = getRequiredSession(request);
        const {
          id,
          surveyId
        } = await context.params;
        if (stryMutAct_9fa48("6199") ? false : stryMutAct_9fa48("6198") ? true : (stryCov_9fa48("6198", "6199"), backendMode(session))) {
          if (stryMutAct_9fa48("6200")) {
            {}
          } else {
            stryCov_9fa48("6200");
            const response = await fetchBackend(request, stryMutAct_9fa48("6201") ? `` : (stryCov_9fa48("6201"), `/trees/${pathId(id)}/surveys/${pathId(surveyId)}`));
            return forwardResponse(response);
          }
        }
        const survey = getTreeSurveyFixture(id, surveyId);
        return survey ? NextResponse.json(survey) : errorResponse(404, stryMutAct_9fa48("6202") ? "" : (stryCov_9fa48("6202"), "Relevamiento no encontrado."), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("6203")) {
        {}
      } else {
        stryCov_9fa48("6203");
        if (stryMutAct_9fa48("6205") ? false : stryMutAct_9fa48("6204") ? true : (stryCov_9fa48("6204", "6205"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("6206") ? "" : (stryCov_9fa48("6206"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("6208") ? false : stryMutAct_9fa48("6207") ? true : (stryCov_9fa48("6207", "6208"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("6209") ? "" : (stryCov_9fa48("6209"), "No se pudo cargar el detalle del relevamiento."));
      }
    }
  }
}