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
export const SESSION_MUTATION_HEADERS = {
  "content-type": "application/json",
  "x-requested-with": "XMLHttpRequest"
} as const;
export type SessionMutationRejection = {
  status: 403 | 415;
  message: string;
};
export function getSessionMutationRejection(request: Request): SessionMutationRejection | undefined {
  if (stryMutAct_9fa48("15554")) {
    {}
  } else {
    stryCov_9fa48("15554");
    const contentType = stryMutAct_9fa48("15558") ? request.headers.get("content-type").split(";", 1)[0]?.trim().toLowerCase() : stryMutAct_9fa48("15557") ? request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() : stryMutAct_9fa48("15556") ? request.headers.get("content-type")?.split(";", 1)[0].toLowerCase() : stryMutAct_9fa48("15555") ? request.headers.get("content-type")?.split(";", 1)[0]?.trim().toUpperCase() : (stryCov_9fa48("15555", "15556", "15557", "15558"), request.headers.get(stryMutAct_9fa48("15559") ? "" : (stryCov_9fa48("15559"), "content-type"))?.split(stryMutAct_9fa48("15560") ? "" : (stryCov_9fa48("15560"), ";"), 1)[0]?.trim().toLowerCase());
    if (stryMutAct_9fa48("15563") ? contentType === "application/json" : stryMutAct_9fa48("15562") ? false : stryMutAct_9fa48("15561") ? true : (stryCov_9fa48("15561", "15562", "15563"), contentType !== (stryMutAct_9fa48("15564") ? "" : (stryCov_9fa48("15564"), "application/json")))) {
      if (stryMutAct_9fa48("15565")) {
        {}
      } else {
        stryCov_9fa48("15565");
        return stryMutAct_9fa48("15566") ? {} : (stryCov_9fa48("15566"), {
          status: 415,
          message: stryMutAct_9fa48("15567") ? "" : (stryCov_9fa48("15567"), "Se requiere una solicitud JSON.")
        });
      }
    }
    if (stryMutAct_9fa48("15570") ? request.headers.get("x-requested-with")?.toLowerCase() === "xmlhttprequest" : stryMutAct_9fa48("15569") ? false : stryMutAct_9fa48("15568") ? true : (stryCov_9fa48("15568", "15569", "15570"), (stryMutAct_9fa48("15572") ? request.headers.get("x-requested-with").toLowerCase() : stryMutAct_9fa48("15571") ? request.headers.get("x-requested-with")?.toUpperCase() : (stryCov_9fa48("15571", "15572"), request.headers.get(stryMutAct_9fa48("15573") ? "" : (stryCov_9fa48("15573"), "x-requested-with"))?.toLowerCase())) !== (stryMutAct_9fa48("15574") ? "" : (stryCov_9fa48("15574"), "xmlhttprequest")))) {
      if (stryMutAct_9fa48("15575")) {
        {}
      } else {
        stryCov_9fa48("15575");
        return stryMutAct_9fa48("15576") ? {} : (stryCov_9fa48("15576"), {
          status: 403,
          message: stryMutAct_9fa48("15577") ? "" : (stryCov_9fa48("15577"), "Solicitud no permitida.")
        });
      }
    }
  }
}