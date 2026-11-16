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
import { backendMode, mapSessionError } from "@/lib/bff-route";
import { fetchMe, sealRolesIfChanged } from "@/lib/me";
import { getScenario } from "@/lib/scenarios";
import { getRequiredSession } from "@/lib/session";

/** Quién soy y qué roles de M6 tengo ahora (GET /me del backend; en mock, el fixture del escenario). */
export async function GET(request: Request) {
  if (stryMutAct_9fa48("3079")) {
    {}
  } else {
    stryCov_9fa48("3079");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("3080")) {
        {}
      } else {
        stryCov_9fa48("3080");
        const session = getRequiredSession(request);
        if (stryMutAct_9fa48("3083") ? false : stryMutAct_9fa48("3082") ? true : stryMutAct_9fa48("3081") ? backendMode(session) : (stryCov_9fa48("3081", "3082", "3083"), !backendMode(session))) {
          if (stryMutAct_9fa48("3084")) {
            {}
          } else {
            stryCov_9fa48("3084");
            return NextResponse.json(stryMutAct_9fa48("3085") ? {} : (stryCov_9fa48("3085"), {
              userId: getScenario(session).actor.userId,
              subType: stryMutAct_9fa48("3086") ? "" : (stryCov_9fa48("3086"), "EMPLEADO"),
              m1Role: stryMutAct_9fa48("3087") ? "" : (stryCov_9fa48("3087"), "MOCK"),
              roles: session.roles,
              crews: (stryMutAct_9fa48("3090") ? getScenario(session).actor.crewId || getScenario(session).actor.crewName : stryMutAct_9fa48("3089") ? false : stryMutAct_9fa48("3088") ? true : (stryCov_9fa48("3088", "3089", "3090"), getScenario(session).actor.crewId && getScenario(session).actor.crewName)) ? stryMutAct_9fa48("3091") ? [] : (stryCov_9fa48("3091"), [stryMutAct_9fa48("3092") ? {} : (stryCov_9fa48("3092"), {
                id: getScenario(session).actor.crewId,
                name: getScenario(session).actor.crewName,
                role: (stryMutAct_9fa48("3095") ? getScenario(session).actor.fieldRole !== "CREW_MEMBER" : stryMutAct_9fa48("3094") ? false : stryMutAct_9fa48("3093") ? true : (stryCov_9fa48("3093", "3094", "3095"), getScenario(session).actor.fieldRole === (stryMutAct_9fa48("3096") ? "" : (stryCov_9fa48("3096"), "CREW_MEMBER")))) ? stryMutAct_9fa48("3097") ? "" : (stryCov_9fa48("3097"), "MEMBER") : stryMutAct_9fa48("3098") ? "" : (stryCov_9fa48("3098"), "LEADER")
              })]) : stryMutAct_9fa48("3099") ? ["Stryker was here"] : (stryCov_9fa48("3099"), []),
              isAssignedInspector: session.roles.includes(stryMutAct_9fa48("3100") ? "" : (stryCov_9fa48("3100"), "M6_CAMPO_INSPECTOR"))
            }));
          }
        }
        const me = await fetchMe(request);
        const response = NextResponse.json(me);
        if (stryMutAct_9fa48("3101")) {
          ;
        } else {
          stryCov_9fa48("3101");
          sealRolesIfChanged(response, request, me.roles);
        }
        return response;
      }
    } catch (error) {
      if (stryMutAct_9fa48("3102")) {
        {}
      } else {
        stryCov_9fa48("3102");
        return mapSessionError(error, path, stryMutAct_9fa48("3103") ? "" : (stryCov_9fa48("3103"), "No se pudo consultar la identidad."));
      }
    }
  }
}