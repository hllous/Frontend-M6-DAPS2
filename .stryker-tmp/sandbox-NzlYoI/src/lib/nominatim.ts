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

// Fallback geocoder for streets that Georef has no numbered addresses for (e.g. Av. 9 de Julio).
export const NOMINATIM_SEARCH_URL = stryMutAct_9fa48("11824") ? "" : (stryCov_9fa48("11824"), "https://nominatim.openstreetmap.org/search");
export const NOMINATIM_USER_AGENT = stryMutAct_9fa48("11825") ? "" : (stryCov_9fa48("11825"), "m6-ambiente-frontend/0.1 (address search fallback)");
const CABA_NAME = stryMutAct_9fa48("11826") ? "" : (stryCov_9fa48("11826"), "Ciudad Autónoma de Buenos Aires");
export const nominatimResponseSchema = z.array(z.object(stryMutAct_9fa48("11827") ? {} : (stryCov_9fa48("11827"), {
  display_name: stryMutAct_9fa48("11829") ? z.string().min(1) : stryMutAct_9fa48("11828") ? z.string().trim().max(1) : (stryCov_9fa48("11828", "11829"), z.string().trim().min(1)),
  lat: stryMutAct_9fa48("11831") ? z.coerce.number().max(-90).max(90) : stryMutAct_9fa48("11830") ? z.coerce.number().min(-90).min(90) : (stryCov_9fa48("11830", "11831"), z.coerce.number().min(stryMutAct_9fa48("11832") ? +90 : (stryCov_9fa48("11832"), -90)).max(90)),
  lon: stryMutAct_9fa48("11834") ? z.coerce.number().max(-180).max(180) : stryMutAct_9fa48("11833") ? z.coerce.number().min(-180).min(180) : (stryCov_9fa48("11833", "11834"), z.coerce.number().min(stryMutAct_9fa48("11835") ? +180 : (stryCov_9fa48("11835"), -180)).max(180))
})));

/** Keep CABA results only, and one per neighbourhood: segments of the same street repeat the label. */
export function nominatimLabels(items: z.infer<typeof nominatimResponseSchema>) {
  if (stryMutAct_9fa48("11836")) {
    {}
  } else {
    stryCov_9fa48("11836");
    const seen = new Set<string>();
    return stryMutAct_9fa48("11837") ? items.flatMap(item => {
      const label = item.display_name.split(", ").slice(0, 3).join(", ");
      if (seen.has(label)) return [];
      seen.add(label);
      return [{
        label,
        lat: item.lat,
        lon: item.lon
      }];
    }) : (stryCov_9fa48("11837"), items.filter(stryMutAct_9fa48("11838") ? () => undefined : (stryCov_9fa48("11838"), item => item.display_name.includes(CABA_NAME))).flatMap(item => {
      if (stryMutAct_9fa48("11839")) {
        {}
      } else {
        stryCov_9fa48("11839");
        const label = stryMutAct_9fa48("11840") ? item.display_name.split(", ").join(", ") : (stryCov_9fa48("11840"), item.display_name.split(stryMutAct_9fa48("11841") ? "" : (stryCov_9fa48("11841"), ", ")).slice(0, 3).join(stryMutAct_9fa48("11842") ? "" : (stryCov_9fa48("11842"), ", ")));
        if (stryMutAct_9fa48("11844") ? false : stryMutAct_9fa48("11843") ? true : (stryCov_9fa48("11843", "11844"), seen.has(label))) return stryMutAct_9fa48("11845") ? ["Stryker was here"] : (stryCov_9fa48("11845"), []);
        if (stryMutAct_9fa48("11846")) {
          ;
        } else {
          stryCov_9fa48("11846");
          seen.add(label);
        }
        return stryMutAct_9fa48("11847") ? [] : (stryCov_9fa48("11847"), [stryMutAct_9fa48("11848") ? {} : (stryCov_9fa48("11848"), {
          label,
          lat: item.lat,
          lon: item.lon
        })]);
      }
    }));
  }
}