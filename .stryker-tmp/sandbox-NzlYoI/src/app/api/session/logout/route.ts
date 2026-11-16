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
import { getSessionMutationRejection } from "@/lib/session-request";
import { AUTH_COOKIE_NAME, SESSION_MARKER_COOKIE_NAME, sessionCookieRemovalOptions } from "@/lib/session";
export async function POST(request: Request) {
  if (stryMutAct_9fa48("5622")) {
    {}
  } else {
    stryCov_9fa48("5622");
    const rejection = getSessionMutationRejection(request);
    if (stryMutAct_9fa48("5624") ? false : stryMutAct_9fa48("5623") ? true : (stryCov_9fa48("5623", "5624"), rejection)) return NextResponse.json(stryMutAct_9fa48("5625") ? {} : (stryCov_9fa48("5625"), {
      message: rejection.message
    }), stryMutAct_9fa48("5626") ? {} : (stryCov_9fa48("5626"), {
      status: rejection.status
    }));
    try {
      if (stryMutAct_9fa48("5627")) {
        {}
      } else {
        stryCov_9fa48("5627");
        await request.json();
      }
    } catch {
      if (stryMutAct_9fa48("5628")) {
        {}
      } else {
        stryCov_9fa48("5628");
        return NextResponse.json(stryMutAct_9fa48("5629") ? {} : (stryCov_9fa48("5629"), {
          message: stryMutAct_9fa48("5630") ? "" : (stryCov_9fa48("5630"), "La solicitud JSON no es válida.")
        }), stryMutAct_9fa48("5631") ? {} : (stryCov_9fa48("5631"), {
          status: 400
        }));
      }
    }
    const response = NextResponse.json(stryMutAct_9fa48("5632") ? {} : (stryCov_9fa48("5632"), {
      ok: stryMutAct_9fa48("5633") ? false : (stryCov_9fa48("5633"), true)
    }));
    response.cookies.set(AUTH_COOKIE_NAME, stryMutAct_9fa48("5635") ? "Stryker was here!" : (stryCov_9fa48("5635"), ""), sessionCookieRemovalOptions(request));
    response.cookies.set(SESSION_MARKER_COOKIE_NAME, stryMutAct_9fa48("5637") ? "Stryker was here!" : (stryCov_9fa48("5637"), ""), sessionCookieRemovalOptions(request));
    return response;
  }
}