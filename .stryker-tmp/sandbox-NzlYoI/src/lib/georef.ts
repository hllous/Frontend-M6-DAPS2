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
import { z } from "zod";

// Permanent validation of the consumed official Georef fields (ADR 0003).
export const georefResponseSchema = z.object(stryMutAct_9fa48("9236") ? {} : (stryCov_9fa48("9236"), {
  direcciones: z.array(z.object(stryMutAct_9fa48("9237") ? {} : (stryCov_9fa48("9237"), {
    nomenclatura: stryMutAct_9fa48("9239") ? z.string().min(1) : stryMutAct_9fa48("9238") ? z.string().trim().max(1) : (stryCov_9fa48("9238", "9239"), z.string().trim().min(1)),
    provincia: z.object(stryMutAct_9fa48("9240") ? {} : (stryCov_9fa48("9240"), {
      id: z.literal(stryMutAct_9fa48("9241") ? "" : (stryCov_9fa48("9241"), "02"))
    })),
    ubicacion: z.object(stryMutAct_9fa48("9242") ? {} : (stryCov_9fa48("9242"), {
      lat: stryMutAct_9fa48("9244") ? z.number().max(-90).max(90) : stryMutAct_9fa48("9243") ? z.number().min(-90).min(90) : (stryCov_9fa48("9243", "9244"), z.number().min(stryMutAct_9fa48("9245") ? +90 : (stryCov_9fa48("9245"), -90)).max(90)),
      lon: stryMutAct_9fa48("9247") ? z.number().max(-180).max(180) : stryMutAct_9fa48("9246") ? z.number().min(-180).min(180) : (stryCov_9fa48("9246", "9247"), z.number().min(stryMutAct_9fa48("9248") ? +180 : (stryCov_9fa48("9248"), -180)).max(180))
    }))
  })))
}));