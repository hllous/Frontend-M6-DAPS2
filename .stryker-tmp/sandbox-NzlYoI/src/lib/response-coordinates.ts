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
type ResponseCoordinates = {
  lat: number | null;
  lng: number | null;
};

// Out-of-range or non-finite values and the exact (0, 0) pair (a cleared
// coordinate stored as zero, see #410) become "no coordinate" at the adapter
// boundary, so the map never plots them or fits its viewport to them.
export const responseCoordinatesSchema = z.object(stryMutAct_9fa48("13245") ? {} : (stryCov_9fa48("13245"), {
  lat: stryMutAct_9fa48("13247") ? z.number().finite().max(-90).max(90).nullable().catch(null) : stryMutAct_9fa48("13246") ? z.number().finite().min(-90).min(90).nullable().catch(null) : (stryCov_9fa48("13246", "13247"), z.number().finite().min(stryMutAct_9fa48("13248") ? +90 : (stryCov_9fa48("13248"), -90)).max(90).nullable().catch(null)),
  lng: stryMutAct_9fa48("13250") ? z.number().finite().max(-180).max(180).nullable().catch(null) : stryMutAct_9fa48("13249") ? z.number().finite().min(-180).min(180).nullable().catch(null) : (stryCov_9fa48("13249", "13250"), z.number().finite().min(stryMutAct_9fa48("13251") ? +180 : (stryCov_9fa48("13251"), -180)).max(180).nullable().catch(null))
})).transform(stryMutAct_9fa48("13252") ? () => undefined : (stryCov_9fa48("13252"), ({
  lat,
  lng
}): ResponseCoordinates => (stryMutAct_9fa48("13255") ? (lat === null || lng === null) && lat === 0 && lng === 0 : stryMutAct_9fa48("13254") ? false : stryMutAct_9fa48("13253") ? true : (stryCov_9fa48("13253", "13254", "13255"), (stryMutAct_9fa48("13257") ? lat === null && lng === null : stryMutAct_9fa48("13256") ? false : (stryCov_9fa48("13256", "13257"), (stryMutAct_9fa48("13259") ? lat !== null : stryMutAct_9fa48("13258") ? false : (stryCov_9fa48("13258", "13259"), lat === null)) || (stryMutAct_9fa48("13261") ? lng !== null : stryMutAct_9fa48("13260") ? false : (stryCov_9fa48("13260", "13261"), lng === null)))) || (stryMutAct_9fa48("13263") ? lat === 0 || lng === 0 : stryMutAct_9fa48("13262") ? false : (stryCov_9fa48("13262", "13263"), (stryMutAct_9fa48("13265") ? lat !== 0 : stryMutAct_9fa48("13264") ? true : (stryCov_9fa48("13264", "13265"), lat === 0)) && (stryMutAct_9fa48("13267") ? lng !== 0 : stryMutAct_9fa48("13266") ? true : (stryCov_9fa48("13266", "13267"), lng === 0)))))) ? stryMutAct_9fa48("13268") ? {} : (stryCov_9fa48("13268"), {
  lat: null,
  lng: null
}) : stryMutAct_9fa48("13269") ? {} : (stryCov_9fa48("13269"), {
  lat,
  lng
})));
export function withResponseCoordinates<T extends z.ZodRawShape>(fields: T) {
  if (stryMutAct_9fa48("13270")) {
    {}
  } else {
    stryCov_9fa48("13270");
    return z.object(stryMutAct_9fa48("13271") ? {} : (stryCov_9fa48("13271"), {
      ...fields,
      lat: z.unknown(),
      lng: z.unknown()
    })).transform(stryMutAct_9fa48("13272") ? () => undefined : (stryCov_9fa48("13272"), entity => stryMutAct_9fa48("13273") ? {} : (stryCov_9fa48("13273"), {
      ...entity,
      ...responseCoordinatesSchema.parse(entity)
    })));
  }
}