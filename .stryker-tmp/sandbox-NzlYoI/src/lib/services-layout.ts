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
const MOBILE_BREAKPOINT_TOKEN = stryMutAct_9fa48("14254") ? "" : (stryCov_9fa48("14254"), "--services-mobile-breakpoint");
const MOBILE_BREAKPOINT_FALLBACK = 760;
export function servicesMobileBreakpoint() {
  if (stryMutAct_9fa48("14255")) {
    {}
  } else {
    stryCov_9fa48("14255");
    if (stryMutAct_9fa48("14258") ? typeof window === "undefined" && typeof document === "undefined" : stryMutAct_9fa48("14257") ? false : stryMutAct_9fa48("14256") ? true : (stryCov_9fa48("14256", "14257", "14258"), (stryMutAct_9fa48("14260") ? typeof window !== "undefined" : stryMutAct_9fa48("14259") ? false : (stryCov_9fa48("14259", "14260"), typeof window === (stryMutAct_9fa48("14261") ? "" : (stryCov_9fa48("14261"), "undefined")))) || (stryMutAct_9fa48("14263") ? typeof document !== "undefined" : stryMutAct_9fa48("14262") ? false : (stryCov_9fa48("14262", "14263"), typeof document === (stryMutAct_9fa48("14264") ? "" : (stryCov_9fa48("14264"), "undefined")))))) {
      if (stryMutAct_9fa48("14265")) {
        {}
      } else {
        stryCov_9fa48("14265");
        return MOBILE_BREAKPOINT_FALLBACK;
      }
    }
    const value = Number.parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue(MOBILE_BREAKPOINT_TOKEN));
    return Number.isFinite(value) ? value : MOBILE_BREAKPOINT_FALLBACK;
  }
}