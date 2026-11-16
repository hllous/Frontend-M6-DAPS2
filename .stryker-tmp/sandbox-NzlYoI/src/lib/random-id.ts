/**
 * Identificadores y enteros aleatorios basados en Web Crypto (navegador y Node),
 * en lugar de `Math.random()`, que no es criptográficamente seguro (Sonar S2245).
 */
// @ts-nocheck


/** UUID v4. Usa `crypto.randomUUID()` y cae a `getRandomValues` fuera de contextos seguros. */function stryNS_9fa48() {
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
export function randomUuid(): string {
  if (stryMutAct_9fa48("12596")) {
    {}
  } else {
    stryCov_9fa48("12596");
    if (stryMutAct_9fa48("12599") ? typeof crypto.randomUUID !== "function" : stryMutAct_9fa48("12598") ? false : stryMutAct_9fa48("12597") ? true : (stryCov_9fa48("12597", "12598", "12599"), typeof crypto.randomUUID === (stryMutAct_9fa48("12600") ? "" : (stryCov_9fa48("12600"), "function")))) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = bytes[6] & 0x0f | 0x40;
    bytes[8] = bytes[8] & 0x3f | 0x80;
    const hex = Array.from(bytes, stryMutAct_9fa48("12601") ? () => undefined : (stryCov_9fa48("12601"), b => b.toString(16).padStart(2, stryMutAct_9fa48("12602") ? "" : (stryCov_9fa48("12602"), "0")))).join(stryMutAct_9fa48("12603") ? "Stryker was here!" : (stryCov_9fa48("12603"), ""));
    return stryMutAct_9fa48("12604") ? `` : (stryCov_9fa48("12604"), `${stryMutAct_9fa48("12605") ? hex : (stryCov_9fa48("12605"), hex.slice(0, 8))}-${stryMutAct_9fa48("12606") ? hex : (stryCov_9fa48("12606"), hex.slice(8, 12))}-${stryMutAct_9fa48("12607") ? hex : (stryCov_9fa48("12607"), hex.slice(12, 16))}-${stryMutAct_9fa48("12608") ? hex : (stryCov_9fa48("12608"), hex.slice(16, 20))}-${stryMutAct_9fa48("12609") ? hex : (stryCov_9fa48("12609"), hex.slice(20))}`);
  }
}

/** Entero uniforme en [min, max] (ambos inclusive), sin sesgo de módulo. */
export function randomInt(min: number, max: number): number {
  if (stryMutAct_9fa48("12610")) {
    {}
  } else {
    stryCov_9fa48("12610");
    const range = stryMutAct_9fa48("12611") ? max - min - 1 : (stryCov_9fa48("12611"), (stryMutAct_9fa48("12612") ? max + min : (stryCov_9fa48("12612"), max - min)) + 1);
    const limit = stryMutAct_9fa48("12613") ? Math.floor(0x1_0000_0000 / range) / range : (stryCov_9fa48("12613"), Math.floor(stryMutAct_9fa48("12614") ? 0x1_0000_0000 * range : (stryCov_9fa48("12614"), 0x1_0000_0000 / range)) * range);
    const buffer = new Uint32Array(1);
    do {
      if (stryMutAct_9fa48("12615")) {
        {}
      } else {
        stryCov_9fa48("12615");
        if (stryMutAct_9fa48("12616")) {
          ;
        } else {
          stryCov_9fa48("12616");
          crypto.getRandomValues(buffer);
        }
      }
    } while (stryMutAct_9fa48("12619") ? buffer[0] < limit : stryMutAct_9fa48("12618") ? buffer[0] > limit : stryMutAct_9fa48("12617") ? false : (stryCov_9fa48("12617", "12618", "12619"), buffer[0] >= limit));
    return stryMutAct_9fa48("12620") ? min - buffer[0] % range : (stryCov_9fa48("12620"), min + (stryMutAct_9fa48("12621") ? buffer[0] * range : (stryCov_9fa48("12621"), buffer[0] % range)));
  }
}