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
import { fetchMe, sessionFromMe } from "@/lib/me";
import { AUTH_COOKIE_NAME, InvalidSessionError, getSessionFromRequest, publicSession, sealSession, sessionCookieOptions, sessionCookieRemovalOptions } from "@/lib/session";
export async function GET(request: Request) {
  if (stryMutAct_9fa48("5638")) {
    {}
  } else {
    stryCov_9fa48("5638");
    const now = Date.now();
    const session = getSessionFromRequest(request, undefined, now);
    if (stryMutAct_9fa48("5641") ? false : stryMutAct_9fa48("5640") ? true : stryMutAct_9fa48("5639") ? session : (stryCov_9fa48("5639", "5640", "5641"), !session)) {
      if (stryMutAct_9fa48("5642")) {
        {}
      } else {
        stryCov_9fa48("5642");
        const response = NextResponse.json(stryMutAct_9fa48("5643") ? {} : (stryCov_9fa48("5643"), {
          message: stryMutAct_9fa48("5644") ? "" : (stryCov_9fa48("5644"), "La sesión no está activa.")
        }), stryMutAct_9fa48("5645") ? {} : (stryCov_9fa48("5645"), {
          status: 401
        }));
        response.cookies.set(AUTH_COOKIE_NAME, stryMutAct_9fa48("5647") ? "Stryker was here!" : (stryCov_9fa48("5647"), ""), sessionCookieRemovalOptions(request));
        return response;
      }
    }

    // En modo backend el pulso de actividad también releé los roles de M6: un cambio de asignación rige sin volver a ingresar.
    let refreshed = session;
    if (stryMutAct_9fa48("5650") ? session.mode === "mock" : stryMutAct_9fa48("5649") ? false : stryMutAct_9fa48("5648") ? true : (stryCov_9fa48("5648", "5649", "5650"), session.mode !== (stryMutAct_9fa48("5651") ? "" : (stryCov_9fa48("5651"), "mock")))) {
      if (stryMutAct_9fa48("5652")) {
        {}
      } else {
        stryCov_9fa48("5652");
        try {
          if (stryMutAct_9fa48("5653")) {
            {}
          } else {
            stryCov_9fa48("5653");
            refreshed = sessionFromMe(session, await fetchMe(request));
          }
        } catch (error) {
          if (stryMutAct_9fa48("5654")) {
            {}
          } else {
            stryCov_9fa48("5654");
            if (stryMutAct_9fa48("5656") ? false : stryMutAct_9fa48("5655") ? true : (stryCov_9fa48("5655", "5656"), error instanceof InvalidSessionError)) {
              if (stryMutAct_9fa48("5657")) {
                {}
              } else {
                stryCov_9fa48("5657");
                const rejected = NextResponse.json(stryMutAct_9fa48("5658") ? {} : (stryCov_9fa48("5658"), {
                  message: stryMutAct_9fa48("5659") ? "" : (stryCov_9fa48("5659"), "La sesión no está activa.")
                }), stryMutAct_9fa48("5660") ? {} : (stryCov_9fa48("5660"), {
                  status: 401
                }));
                rejected.cookies.set(AUTH_COOKIE_NAME, stryMutAct_9fa48("5662") ? "Stryker was here!" : (stryCov_9fa48("5662"), ""), sessionCookieRemovalOptions(request));
                return rejected;
              }
            }
            // Indisponibilidad o ciudadano: se conservan los roles de la cookie; el backend sigue siendo la autoridad.
          }
        }
      }
    }

    // fetchMe pudo renovar los tokens contra M1: la cookie resellada lleva el material nuevo.
    const current = stryMutAct_9fa48("5663") ? getSessionFromRequest(request, undefined, now) && session : (stryCov_9fa48("5663"), getSessionFromRequest(request, undefined, now) ?? session);
    const activeSession = stryMutAct_9fa48("5664") ? {} : (stryCov_9fa48("5664"), {
      ...current,
      scenarioId: refreshed.scenarioId,
      lastActivityAt: now,
      roles: refreshed.roles,
      crew: refreshed.crew,
      fieldRole: refreshed.fieldRole
    });
    const response = NextResponse.json(stryMutAct_9fa48("5665") ? {} : (stryCov_9fa48("5665"), {
      session: publicSession(activeSession)
    }));
    response.cookies.set(stryMutAct_9fa48("5667") ? {} : (stryCov_9fa48("5667"), {
      name: AUTH_COOKIE_NAME,
      value: sealSession(activeSession),
      ...sessionCookieOptions(activeSession, request)
    }));
    return response;
  }
}