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
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  if (stryMutAct_9fa48("17005")) {
    {}
  } else {
    stryCov_9fa48("17005");
    return twMerge(clsx(inputs));
  }
}

/** Comparador explícito por unidades de código UTF-16 (el orden por defecto de `sort()`). */
export function compareStrings(a: string, b: string): number {
  if (stryMutAct_9fa48("17006")) {
    {}
  } else {
    stryCov_9fa48("17006");
    if (stryMutAct_9fa48("17010") ? a >= b : stryMutAct_9fa48("17009") ? a <= b : stryMutAct_9fa48("17008") ? false : stryMutAct_9fa48("17007") ? true : (stryCov_9fa48("17007", "17008", "17009", "17010"), a < b)) return stryMutAct_9fa48("17011") ? +1 : (stryCov_9fa48("17011"), -1);
    return (stryMutAct_9fa48("17015") ? a <= b : stryMutAct_9fa48("17014") ? a >= b : stryMutAct_9fa48("17013") ? false : stryMutAct_9fa48("17012") ? true : (stryCov_9fa48("17012", "17013", "17014", "17015"), a > b)) ? 1 : 0;
  }
}

/**
 * Normaliza texto para comparaciones de búsqueda: minúsculas y sin tildes/diacríticos,
 * para que "recoleccion" encuentre "Recolección".
 */
export function normalizeForSearch(value: string): string {
  if (stryMutAct_9fa48("17016")) {
    {}
  } else {
    stryCov_9fa48("17016");
    return stryMutAct_9fa48("17017") ? value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase() : (stryCov_9fa48("17017"), value.normalize(stryMutAct_9fa48("17018") ? "" : (stryCov_9fa48("17018"), "NFD")).replace(stryMutAct_9fa48("17019") ? /\P{Diacritic}/gu : (stryCov_9fa48("17019"), /\p{Diacritic}/gu), stryMutAct_9fa48("17020") ? "Stryker was here!" : (stryCov_9fa48("17020"), "")).toLowerCase());
  }
}