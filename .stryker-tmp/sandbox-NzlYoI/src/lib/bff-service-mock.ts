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
import type { NextResponse } from "next/server";
import { errorResponse } from "./bff-route";
import { serviceFixtures } from "./services-fixtures";
import type { Service } from "./services";

/** Servicio del modo mock por id, o el 404 de Problem Details que usan los Route Handlers de `/services/[id]`. */
export function findServiceFixture(serviceId: string, path: string): Service | NextResponse {
  if (stryMutAct_9fa48("7406")) {
    {}
  } else {
    stryCov_9fa48("7406");
    const service = serviceFixtures.find(stryMutAct_9fa48("7407") ? () => undefined : (stryCov_9fa48("7407"), candidate => stryMutAct_9fa48("7410") ? candidate.id !== serviceId : stryMutAct_9fa48("7409") ? false : stryMutAct_9fa48("7408") ? true : (stryCov_9fa48("7408", "7409", "7410"), candidate.id === serviceId)));
    return stryMutAct_9fa48("7411") ? service && errorResponse(404, `Servicio ${serviceId} no encontrado.`, path) : (stryCov_9fa48("7411"), service ?? errorResponse(404, stryMutAct_9fa48("7412") ? `` : (stryCov_9fa48("7412"), `Servicio ${serviceId} no encontrado.`), path));
  }
}

/** Entrada de historial de estado (`yyyy-mm-dd hh:mm`, hecha) que los handlers mock agregan al cambiar un Servicio. */
export function serviceHistoryEntry(label: string): Service["history"][number] {
  if (stryMutAct_9fa48("7413")) {
    {}
  } else {
    stryCov_9fa48("7413");
    return stryMutAct_9fa48("7414") ? {} : (stryCov_9fa48("7414"), {
      label,
      at: stryMutAct_9fa48("7415") ? new Date().toISOString().replace("T", " ") : (stryCov_9fa48("7415"), new Date().toISOString().slice(0, 16).replace(stryMutAct_9fa48("7416") ? "" : (stryCov_9fa48("7416"), "T"), stryMutAct_9fa48("7417") ? "" : (stryCov_9fa48("7417"), " "))),
      done: stryMutAct_9fa48("7418") ? false : (stryCov_9fa48("7418"), true)
    });
  }
}