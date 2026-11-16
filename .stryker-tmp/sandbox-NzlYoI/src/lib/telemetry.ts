// @ts-nocheck
// Closed event/field set (ADR-0006): no call site can attach a JWT, PII, an address, form content, Evidence, or a user identifier.
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
export type TelemetryEvent = {
  name: "auth_session_expired";
  status: 401;
} | {
  name: "auth_forbidden";
  status: 403;
} | {
  name: "auth_login_failed";
  status: 400 | 401 | 403 | 413 | 415 | 429 | 500 | 502 | 503 | 504;
} | {
  name: "auth_logout_broadcast";
} | {
  name: "request_malformed_response";
  resource: "zones" | "routes" | "scenario" | "services" | "service-frequencies" | "vehicles" | "crews" | "green-spaces" | "green-points" | "trees" | "tree-surveys" | "tree-interventions" | "containers" | "street-closure-requests" | "repair-requests" | "environmental-reports" | "indicators" | "service-types" | "disposal-sites" | "neighborhoods" | "communes";
} | {
  name: "request_network_failure";
  resource: "zones" | "routes" | "scenario" | "services" | "service-frequencies" | "vehicles" | "crews" | "green-spaces" | "green-points" | "trees" | "tree-surveys" | "tree-interventions" | "containers" | "street-closure-requests" | "repair-requests" | "environmental-reports" | "indicators" | "neighborhoods" | "communes";
};
const ALLOWED_FIELDS = new Set(stryMutAct_9fa48("16370") ? [] : (stryCov_9fa48("16370"), [stryMutAct_9fa48("16371") ? "" : (stryCov_9fa48("16371"), "name"), stryMutAct_9fa48("16372") ? "" : (stryCov_9fa48("16372"), "status"), stryMutAct_9fa48("16373") ? "" : (stryCov_9fa48("16373"), "resource")]));
export function recordTelemetryEvent(event: TelemetryEvent): void {
  if (stryMutAct_9fa48("16374")) {
    {}
  } else {
    stryCov_9fa48("16374");
    const safeEvent = Object.fromEntries(stryMutAct_9fa48("16375") ? Object.entries(event) : (stryCov_9fa48("16375"), Object.entries(event).filter(stryMutAct_9fa48("16376") ? () => undefined : (stryCov_9fa48("16376"), ([field]) => ALLOWED_FIELDS.has(field)))));
    // No observability pipeline destination exists yet (#15); this is the one emission point every call site goes through.
    console.info(stryMutAct_9fa48("16378") ? "" : (stryCov_9fa48("16378"), "[m6-telemetry]"), safeEvent);
  }
}