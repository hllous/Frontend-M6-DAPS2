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
export const AUTH_COOKIE_NAME = stryMutAct_9fa48("15542") ? "" : (stryCov_9fa48("15542"), "m6_session");

/** Marca liviana, sin datos: "esta persona ya ingresó". Permite avisar "tu sesión terminó" cuando la cookie de sesión venció y el navegador la borró. */
export const SESSION_MARKER_COOKIE_NAME = stryMutAct_9fa48("15543") ? "" : (stryCov_9fa48("15543"), "m6_signed_in");

/** Un build desplegado (producción/preview) con `M6_AUTH_MODE` distinto de `real-m1`, o sin definir, no debe atender pedidos. */
export function isDeployedAuthModeMisconfigured(environment: {
  NODE_ENV?: string;
  M6_AUTH_MODE?: string;
} = process.env): boolean {
  if (stryMutAct_9fa48("15544")) {
    {}
  } else {
    stryCov_9fa48("15544");
    return stryMutAct_9fa48("15547") ? environment.NODE_ENV === "production" || environment.M6_AUTH_MODE !== "real-m1" : stryMutAct_9fa48("15546") ? false : stryMutAct_9fa48("15545") ? true : (stryCov_9fa48("15545", "15546", "15547"), (stryMutAct_9fa48("15549") ? environment.NODE_ENV !== "production" : stryMutAct_9fa48("15548") ? true : (stryCov_9fa48("15548", "15549"), environment.NODE_ENV === (stryMutAct_9fa48("15550") ? "" : (stryCov_9fa48("15550"), "production")))) && (stryMutAct_9fa48("15552") ? environment.M6_AUTH_MODE === "real-m1" : stryMutAct_9fa48("15551") ? true : (stryCov_9fa48("15551", "15552"), environment.M6_AUTH_MODE !== (stryMutAct_9fa48("15553") ? "" : (stryCov_9fa48("15553"), "real-m1")))));
  }
}